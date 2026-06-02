-- Fase 3 — RLS da pricing_config (só ADMIN via supabase-js; o servidor lê via
-- Drizzle/serviço) e seed da config GLOBAL com defaults provisórios.

ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "pricing_config_admin_all" ON public.pricing_config
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
--> statement-breakpoint

-- Seed da config GLOBAL. Valores PROVISÓRIOS — TODO: taxas reais (Asaas/negócio).
INSERT INTO public.pricing_config (
  key, scope, client_commission_pct, carpenter_commission_pct, architect_commission_pct,
  installment_table, dilution_min_carpenter_share_pct, dilution_platform_margin_pct, pix_fixed_fee_cents
) VALUES (
  'GLOBAL', 'GLOBAL', 8, 10, 0,
  '{"1":{"mdrPct":3.49},"2":{"mdrPct":4.49},"3":{"mdrPct":4.99},"4":{"mdrPct":5.49},"5":{"mdrPct":5.99},"6":{"mdrPct":6.49},"7":{"mdrPct":6.99},"8":{"mdrPct":7.49},"9":{"mdrPct":7.99},"10":{"mdrPct":8.49},"11":{"mdrPct":8.99},"12":{"mdrPct":9.49}}'::jsonb,
  50, 1, 0
)
ON CONFLICT (key) DO NOTHING;
