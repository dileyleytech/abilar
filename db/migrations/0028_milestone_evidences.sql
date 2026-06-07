-- Evidências por etapa (§6.4): comentário + várias fotos por registro. Substitui
-- o campo único evidence_url (que fica obsoleto). RLS de leitura só das partes.

CREATE TABLE public.milestone_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  carpenter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX milestone_evidences_milestone_idx ON public.milestone_evidences (milestone_id, created_at);
--> statement-breakpoint

ALTER TABLE public.milestone_evidences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "milestone_evidences_participants_read" ON public.milestone_evidences
  FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR carpenter_id = auth.uid() OR public.is_admin());
