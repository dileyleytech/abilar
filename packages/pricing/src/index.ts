// @abilar/pricing — motor de cálculo financeiro PURO (sem I/O), 100% testado.
// Regra de ouro #7: regras financeiras só por configuração (PricingConfig).
// Regra de ouro #8: o servidor recalcula sempre; nunca confiar em valor do cliente.
export * from './allocate';

// TODO(Fase 3 — §5.4, CRÍTICO): implementar `quotePricing(input, config)` com
// PricingConfig (taxas/margem/diluição `s`), cobrindo o exemplo de §5.3 e bordas
// (promo zera taxa, margem negativa rejeitada, s no mín/máx, todos os n).
// Escrever os TESTES antes (TDD) — cobertura inegociável neste pacote.
