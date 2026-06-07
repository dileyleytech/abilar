-- Fase 6 — Marcos da obra (§6.4): etapas de execução, criadas ao assinar o
-- contrato. Escrita via Drizzle/serviço + checagem na action; RLS de leitura só
-- para as partes (cliente/marceneiro) ou admin.

CREATE TYPE public.milestone_status AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'APPROVED');
--> statement-breakpoint

CREATE TABLE public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  carpenter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ord integer NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  event text NOT NULL,
  pct integer NOT NULL,
  amount_cents bigint NOT NULL,
  status public.milestone_status NOT NULL DEFAULT 'PENDING',
  done_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX project_milestones_project_idx ON public.project_milestones (project_id, ord);
--> statement-breakpoint

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "milestones_participants_read" ON public.project_milestones
  FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR carpenter_id = auth.uid() OR public.is_admin());
