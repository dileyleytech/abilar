-- Logo do arquiteto parceiro (path no bucket project-photos sob architects/{userId}/...).
ALTER TABLE public.architect_profiles
  ADD COLUMN logo_path text;
