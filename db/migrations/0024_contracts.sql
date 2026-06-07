-- Fase 4/5 — Contrato padrão por projeto aprovado (§6.5). Aceite eletrônico das
-- duas partes (timestamp + hash de IP). Escrita via Drizzle/serviço + checagem na
-- action; RLS de leitura só para os participantes (ou admin).

CREATE TYPE public.contract_status AS ENUM ('DRAFT', 'SIGNED', 'CANCELLED');
--> statement-breakpoint

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  carpenter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.contract_status NOT NULL DEFAULT 'DRAFT',
  value_cents bigint NOT NULL,
  terms jsonb NOT NULL,
  accepted_by_client_at timestamptz,
  client_ip_hash text,
  accepted_by_carpenter_at timestamptz,
  carpenter_ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX contracts_quote_idx ON public.contracts (quote_id);
--> statement-breakpoint
CREATE INDEX contracts_project_idx ON public.contracts (project_id);
--> statement-breakpoint

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Leitura: só as partes do contrato (ou admin).
CREATE POLICY "contracts_participants_read" ON public.contracts
  FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR carpenter_id = auth.uid() OR public.is_admin());
