-- Fase 7 — pipeline/agenda do marceneiro.
-- Capacidade (projetos em paralelo) + obras manuais (fora da plataforma) p/ a agenda.

ALTER TABLE public.carpenter_profiles
  ADD COLUMN max_parallel_projects integer NOT NULL DEFAULT 3;
--> statement-breakpoint

CREATE TABLE public.carpenter_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carpenter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  client_name text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | DONE
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX carpenter_jobs_owner_idx ON public.carpenter_jobs (carpenter_id, status, start_date);
--> statement-breakpoint
ALTER TABLE public.carpenter_jobs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "carpenter_jobs_owner_all" ON public.carpenter_jobs
  FOR ALL TO authenticated
  USING (carpenter_id = auth.uid() OR public.is_admin())
  WITH CHECK (carpenter_id = auth.uid() OR public.is_admin());
