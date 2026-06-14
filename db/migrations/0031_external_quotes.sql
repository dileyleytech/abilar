-- Orçamentos avulsos do marceneiro (§4.3d / módulo de gestão gratuito). Para
-- clientes fora da plataforma: cálculo simples V = custo + margem (sem taxas da
-- plataforma). Dinheiro em centavos. RLS: só o dono (marceneiro).
CREATE TABLE public.external_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carpenter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  title text NOT NULL,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  margin_pct integer NOT NULL DEFAULT 0,
  subtotal_cost_cents bigint NOT NULL DEFAULT 0,
  value_cents bigint NOT NULL DEFAULT 0,
  status quote_status NOT NULL DEFAULT 'SENT',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX external_quotes_carpenter_idx ON public.external_quotes (carpenter_id, created_at);
--> statement-breakpoint
ALTER TABLE public.external_quotes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "external_quotes_owner_all" ON public.external_quotes
  FOR ALL TO authenticated
  USING (carpenter_id = auth.uid() OR public.is_admin())
  WITH CHECK (carpenter_id = auth.uid() OR public.is_admin());
