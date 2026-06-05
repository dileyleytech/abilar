-- Fase 4.2 — marceneiro lê pedidos OPEN_FOR_QUOTES (feed). Defesa em profundidade:
-- o feed roda via Drizzle/serviço, mas estas policies liberam supabase-js/Realtime.

CREATE OR REPLACE FUNCTION public.is_carpenter()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'CARPENTER'
  );
$$;
--> statement-breakpoint

-- Projetos abertos para orçamento: marceneiro pode LER (não escrever).
CREATE POLICY "projects_carpenter_read_open" ON public.projects
  FOR SELECT TO authenticated
  USING (status = 'OPEN_FOR_QUOTES' AND public.is_carpenter());
--> statement-breakpoint

CREATE POLICY "modules_carpenter_read_open" ON public.modules
  FOR SELECT TO authenticated
  USING (
    public.is_carpenter() AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = modules.project_id AND p.status = 'OPEN_FOR_QUOTES'
    )
  );
--> statement-breakpoint

CREATE POLICY "project_photos_carpenter_read_open" ON public.project_photos
  FOR SELECT TO authenticated
  USING (
    public.is_carpenter() AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_photos.project_id AND p.status = 'OPEN_FOR_QUOTES'
    )
  );
