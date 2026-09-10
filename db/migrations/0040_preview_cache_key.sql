-- Cache de geração de prévia (§8.7): guarda a chave (imagem base + prompt) que
-- produziu a imagem. Se a mesma dupla voltar, reaproveitamos em vez de pagar
-- outra chamada ao Gemini. Nulo nas fotos que não são prévia gerada.
ALTER TABLE public.project_photos
  ADD COLUMN IF NOT EXISTS cache_key text;

CREATE INDEX IF NOT EXISTS project_photos_cache_idx
  ON public.project_photos (project_id, cache_key);
