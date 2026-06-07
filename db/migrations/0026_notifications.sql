-- Notificações in-app (mudança de status de pedido/orçamento/obra). Escrita via
-- Drizzle/serviço; RLS de leitura/atualização só do próprio dono; Realtime ligado.

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at);
--> statement-breakpoint

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Só o dono lê as próprias notificações (vale no Realtime).
CREATE POLICY "notifications_owner_read" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
--> statement-breakpoint
-- Só o dono marca como lida.
CREATE POLICY "notifications_owner_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
--> statement-breakpoint

-- Realtime: o app assina INSERTs das próprias notificações (RLS acima vale).
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
