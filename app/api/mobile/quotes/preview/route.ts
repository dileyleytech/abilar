import { quotePricing, maxClientInstallments } from '@abilar/pricing';
import { getActivePricingConfig } from '@/lib/pricing/config';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Preview dos cenários (à vista / parcelado) no SERVIDOR — a config de preço não
// vai ao app. Espelha lib/quotes/actions.ts:previewQuote.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth || auth.role !== 'CARPENTER') return json({ error: 'Apenas marceneiros.' }, 403);

  const b = (await req.json().catch(() => ({}))) as { baseValueCents?: number; maxInstallments?: number; dilutionSharePct?: number };
  const config = await getActivePricingConfig();
  if (!config) return json({ error: 'Configuração indisponível.' }, 503);

  const cents = Math.max(0, Math.round(Number(b.baseValueCents) || 0));
  if (cents <= 0) return json({ preview: null });
  const nCarp = Math.max(1, Math.round(Number(b.maxInstallments) || 1));
  const subsidizes = nCarp > 1;
  const s = subsidizes ? Math.min(100, Math.max(0, Number(b.dilutionSharePct) || 0)) : 0;
  const nClient = maxClientInstallments(config);

  const avista = quotePricing({ baseValueCents: cents, config, installments: 1, method: 'PIX', carpenterDilutionSharePct: s });
  const parc =
    nClient > 1
      ? quotePricing({ baseValueCents: cents, config, installments: subsidizes ? nCarp : 1, clientInstallments: nClient, method: 'CARD', carpenterDilutionSharePct: s })
      : null;

  return json({
    preview: {
      avista: { youGetCents: avista.carpenterPayoutCents, clientPaysCents: avista.displayedAmountCents },
      parcelado: parc
        ? { youGetCents: parc.carpenterPayoutCents, clientPaysCents: parc.displayedAmountCents, installmentCents: Math.round(parc.displayedAmountCents / nClient), n: nClient }
        : null,
      valid: (parc ?? avista).valid,
      warning: (parc ?? avista).warnings[0] ?? null,
    },
  });
}
