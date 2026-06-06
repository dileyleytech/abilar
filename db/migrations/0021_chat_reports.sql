-- Fase 4.4b — Moderação do chat (exigência das lojas, §7.8): denúncia de
-- conversa/mensagem. Bloquear/encerrar conversa é só UPDATE em conversations.status
-- (via Drizzle/serviço + checagem na action), não precisa de policy nova.

CREATE TYPE public.report_reason AS ENUM ('CONTACT_OUTSIDE', 'HARASSMENT', 'SCAM', 'SPAM', 'OTHER');
--> statement-breakpoint
CREATE TYPE public.report_status AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED', 'ACTIONED');
--> statement-breakpoint

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason public.report_reason NOT NULL,
  detail text,
  status public.report_status NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX reports_status_idx ON public.reports (status, created_at);
--> statement-breakpoint
CREATE INDEX reports_conversation_idx ON public.reports (conversation_id);
--> statement-breakpoint

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Denunciar: só como você mesmo e numa conversa que você participa.
CREATE POLICY "reports_insert_participant" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = reports.conversation_id
        AND (c.client_id = auth.uid() OR c.carpenter_id = auth.uid())
    )
  );
--> statement-breakpoint

-- Ler: o autor da denúncia ou um admin (fila de moderação).
CREATE POLICY "reports_read_own_or_admin" ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin());
--> statement-breakpoint

-- Só admin muda o status (triagem).
CREATE POLICY "reports_admin_update" ON public.reports
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
