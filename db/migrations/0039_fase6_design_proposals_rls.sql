-- Fase 6 (§8.6) — RLS de design_proposals. Acesso via Drizzle (serviço) + checagem
-- na action; RLS é o guard secundário. Autor = marceneiro; cliente = dono do projeto.

ALTER TABLE public.design_proposals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Leitura: o marceneiro autor, o cliente dono do projeto, ou admin.
CREATE POLICY "design_proposals_read" ON public.design_proposals
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR carpenter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = design_proposals.project_id AND p.client_id = auth.uid()
    )
  );
--> statement-breakpoint

-- Criação pelo marceneiro autor.
CREATE POLICY "design_proposals_carpenter_insert" ON public.design_proposals
  FOR INSERT TO authenticated
  WITH CHECK (carpenter_id = auth.uid() OR public.is_admin());
--> statement-breakpoint

-- Edição pelo marceneiro autor (ex.: regerar prévia).
CREATE POLICY "design_proposals_carpenter_update" ON public.design_proposals
  FOR UPDATE TO authenticated
  USING (carpenter_id = auth.uid() OR public.is_admin())
  WITH CHECK (carpenter_id = auth.uid() OR public.is_admin());
--> statement-breakpoint

-- Decisão (aprovar/recusar) pelo cliente dono do projeto.
CREATE POLICY "design_proposals_client_decide" ON public.design_proposals
  FOR UPDATE TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = design_proposals.project_id AND p.client_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = design_proposals.project_id AND p.client_id = auth.uid()
    )
  );
