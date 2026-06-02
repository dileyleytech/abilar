-- Fase 2 — RLS de projetos, módulos e fotos. Dono = cliente do projeto; admin tudo.
-- TODO(Fase 4): policy de leitura p/ marceneiro ver projects OPEN_FOR_QUOTES no seu raio/categoria.

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "projects_owner_all" ON public.projects
  FOR ALL TO authenticated
  USING (client_id = auth.uid() OR public.is_admin())
  WITH CHECK (client_id = auth.uid() OR public.is_admin());
--> statement-breakpoint

CREATE POLICY "modules_via_project" ON public.modules
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = modules.project_id AND p.client_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = modules.project_id AND p.client_id = auth.uid()
    )
  );
--> statement-breakpoint

CREATE POLICY "project_photos_via_project" ON public.project_photos
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_photos.project_id AND p.client_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_photos.project_id AND p.client_id = auth.uid()
    )
  );
