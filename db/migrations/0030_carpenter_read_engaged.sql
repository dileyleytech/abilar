-- O marceneiro só lia projetos OPEN_FOR_QUOTES (feed). Assim, suas obras
-- (HIRED/EXECUTED) e negociações ficavam invisíveis no app (que lê via RLS).
-- Libera a LEITURA de projetos em que ele tem uma conversa (pré-aprovação em
-- diante: negociação + obra). Escrita continua barrada. Defesa em profundidade
-- (a web usa serviço; isto habilita supabase-js/Realtime no mobile).
CREATE POLICY "projects_carpenter_read_engaged" ON public.projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations cv
      WHERE cv.project_id = projects.id AND cv.carpenter_id = auth.uid()
    )
  );
