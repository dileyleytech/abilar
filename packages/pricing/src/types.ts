import type { Cents } from '@abilar/shared';

/** Taxa efetiva da adquirente por nº de parcelas (custo real do parcelamento). */
export interface InstallmentRow {
  mdrPct: number;
}

/** Overrides temporários de promoção (zera/reduz taxas, diluição). */
export type PromoOverrides = Partial<
  Pick<
    PricingConfig,
    | 'clientCommissionPct'
    | 'carpenterCommissionPct'
    | 'architectCommissionPct'
    | 'dilutionMinCarpenterSharePct'
    | 'dilutionPlatformMarginPct'
    | 'carpenterInstallmentDiscountPct'
  >
>;

/** Configuração financeira (§5.1). NUNCA hardcode taxa/percentual — vem daqui. */
export interface PricingConfig {
  clientCommissionPct: number; // tc — % sobre V
  carpenterCommissionPct: number; // tm — % sobre V
  architectCommissionPct: number; // a  — % sobre V (0 se não houver arquiteto)
  /** mdr por nº de parcelas (n -> { mdrPct }). */
  installmentTable: Record<number, InstallmentRow>;
  dilutionMinCarpenterSharePct: number; // mínimo de s que o marceneiro absorve
  dilutionPlatformMarginPct: number; // mp — margem da plataforma na diluição
  /** Desconto (em pontos) na comissão tm do marceneiro nas vendas PARCELADAS
   *  (cartão n>1) — incentivo para ele aceitar parcelamento. Default 0. */
  carpenterInstallmentDiscountPct?: number;
  pixFixedFeeCents?: number; // custoFixoPix (default 0)
  promo?: PromoOverrides | null;
}

export type PaymentMethod = 'PIX' | 'BOLETO' | 'CARD';

export interface QuotePricingInput {
  baseValueCents: Cents; // V
  config: PricingConfig;
  installments: number; // 1 = à vista. No cartão: N que o marceneiro aceita SUBSIDIAR (teto).
  method: PaymentMethod;
  carpenterDilutionSharePct: number; // s, escolhido pelo marceneiro
  carpenterCostCents?: Cents; // proteção de margem (nunca pagar abaixo do custo)
  /** Nº de parcelas que o CLIENTE realmente usa (máx do sistema). O cliente sempre
   *  pode parcelar até aqui; o marceneiro só subsidia a taxa até `installments`.
   *  Omitido = igual a `installments` (comportamento antigo, faixa única). */
  clientInstallments?: number;
}

export interface QuotePricingResult {
  displayedAmountCents: Cents;
  carpenterPayoutCents: Cents;
  architectPayoutCents: Cents;
  gatewayFeeCents: Cents;
  platformNetCents: Cents;
  installmentDeltaCents: number; // pode ser 0 (à vista)
  valid: boolean;
  warnings: string[];
}
