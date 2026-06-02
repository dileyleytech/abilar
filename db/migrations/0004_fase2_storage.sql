-- Fase 2 — bucket privado de fotos/anexos de projeto no Supabase Storage.
-- Path = "<projectId>/<arquivo>". RLS: só o dono do projeto (ou admin) lê/escreve.
-- (Cloudflare R2 ainda não está ligado; Supabase Storage é alternativa aceitável §1.3.)

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-photos', 'project-photos', false)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

DROP POLICY IF EXISTS "project_photos_objects_rw" ON storage.objects;
--> statement-breakpoint

CREATE POLICY "project_photos_objects_rw" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'project-photos' AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id::text = (storage.foldername(name))[1] AND p.client_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    bucket_id = 'project-photos' AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id::text = (storage.foldername(name))[1] AND p.client_id = auth.uid()
      )
    )
  );
