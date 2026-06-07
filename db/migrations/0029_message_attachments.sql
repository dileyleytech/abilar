-- Anexos (fotos) por mensagem do chat (§7.8). Paths no bucket project-photos sob
-- chat/{conversationId}/... ; assinatura curta no servidor (igual evidências).
ALTER TABLE public.messages
  ADD COLUMN attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
