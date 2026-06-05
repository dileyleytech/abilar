-- Fase 4.4 — RLS do chat (só os participantes) + habilita Realtime nas mensagens.

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Conversa: só cliente ou marceneiro participantes (ou admin) leem.
CREATE POLICY "conversations_participants_read" ON public.conversations
  FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR carpenter_id = auth.uid() OR public.is_admin());
--> statement-breakpoint

-- Mensagens: leitura só por participantes da conversa.
CREATE POLICY "messages_participants_read" ON public.messages
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.client_id = auth.uid() OR c.carpenter_id = auth.uid())
    )
  );
--> statement-breakpoint

-- Mensagens: enviar só como você mesmo, e só em conversa ATIVA que você participa.
CREATE POLICY "messages_participants_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND c.status = 'ACTIVE'
        AND (c.client_id = auth.uid() OR c.carpenter_id = auth.uid())
    )
  );
--> statement-breakpoint

-- Realtime: o chat assina as INSERTs de mensagens (a RLS acima vale no Realtime).
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
