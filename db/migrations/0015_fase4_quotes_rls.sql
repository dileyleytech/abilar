-- Fase 4.3 — RLS dos orçamentos (quotes).
-- Marceneiro escreve/lê os seus; cliente lê os do seu próprio pedido; admin tudo.

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Marceneiro: dono do orçamento (carpenter_id = ele).
CREATE POLICY "quotes_carpenter_all" ON public.quotes
  FOR ALL TO authenticated
  USING (carpenter_id = auth.uid() OR public.is_admin())
  WITH CHECK (carpenter_id = auth.uid() OR public.is_admin());
--> statement-breakpoint

-- Cliente: lê os orçamentos recebidos nos seus pedidos.
CREATE POLICY "quotes_client_read" ON public.quotes
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = quotes.project_id AND p.client_id = auth.uid()
    )
  );
