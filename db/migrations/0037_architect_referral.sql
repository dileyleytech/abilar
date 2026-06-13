-- Código de indicação do arquiteto (link de compartilhamento → vínculo no pedido).
ALTER TABLE public.architect_profiles
  ADD COLUMN referral_code text;

-- Backfill: código curto e único derivado do user_id (existentes).
UPDATE public.architect_profiles
  SET referral_code = upper(substr(md5(user_id::text), 1, 6))
  WHERE referral_code IS NULL;

-- Único (NULLs permitidos no Postgres; novos códigos vêm da action).
CREATE UNIQUE INDEX IF NOT EXISTS architect_profiles_referral_code_idx
  ON public.architect_profiles (referral_code);
