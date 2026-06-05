-- Realtime na tabela de conversas: o marceneiro é avisado na hora que o cliente
-- libera o chat (cria a conversa), sem precisar recarregar. A RLS de
-- conversations (participantes) continua valendo no Realtime.
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
