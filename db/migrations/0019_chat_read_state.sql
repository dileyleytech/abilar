-- Estado de leitura do chat: até quando cada participante leu a conversa.
-- Usado para contar mensagens não lidas (badge na caixa de conversas).
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS client_last_read_at timestamptz,
  ADD COLUMN IF NOT EXISTS carpenter_last_read_at timestamptz;
