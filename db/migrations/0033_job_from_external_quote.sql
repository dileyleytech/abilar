-- Ao aceitar um orçamento avulso, ele vira uma obra externa na agenda. O job
-- guarda a origem para não duplicar se aceito mais de uma vez.
ALTER TABLE public.carpenter_jobs
  ADD COLUMN source_external_quote_id uuid REFERENCES public.external_quotes(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX carpenter_jobs_source_idx ON public.carpenter_jobs (source_external_quote_id);
