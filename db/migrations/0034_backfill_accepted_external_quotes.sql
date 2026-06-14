-- Backfill: avulsos já ACEITOS que ainda não têm obra externa na agenda viram
-- carpenter_jobs (idempotente — só cria quando não existe vínculo).
INSERT INTO public.carpenter_jobs (carpenter_id, title, client_name, status, source_external_quote_id)
SELECT eq.carpenter_id, eq.title, eq.client_name, 'ACTIVE', eq.id
FROM public.external_quotes eq
WHERE eq.status = 'ACCEPTED'
  AND NOT EXISTS (
    SELECT 1 FROM public.carpenter_jobs cj WHERE cj.source_external_quote_id = eq.id
  );
