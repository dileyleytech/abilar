-- Perf — Custom Access Token Hook: injeta o papel do app (user_role) e o nome
-- (user_name) no JWT a cada emissão de token. Assim o servidor lê o papel via
-- supabase.auth.getClaims() (verificação LOCAL, sem ida à rede) em vez de consultar
-- public.profiles a cada request/render. session.ts mantém fallback à query enquanto
-- o hook não estiver ativo para uma sessão (migra sozinho ao renovar o token).
--
-- O papel continua sendo fonte de verdade em public.profiles; o JWT é só um cache
-- assinado pelo Supabase. RLS e is_admin() seguem lendo da tabela (não do JWT).
--
-- ⚠️ PASSO MANUAL no painel do Supabase, após aplicar esta migration:
--   1. Authentication → Hooks → "Custom Access Token" → habilitar e apontar para
--      a função public.custom_access_token_hook.
--   2. Authentication → JWT/Signing Keys → migrar para chave ASSIMÉTRICA (ECC/RSA).
--      Sem isso, getClaims() cai no caminho legado (HS256) e ainda chama o Auth pela
--      rede — o ganho de latência só aparece com chave assimétrica (verificação local).

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  v_role public.role;
  v_name text;
BEGIN
  SELECT p.role, p.name INTO v_role, v_name
  FROM public.profiles p
  WHERE p.id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF v_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role::text));
  END IF;
  IF v_name IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_name}', to_jsonb(v_name));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
--> statement-breakpoint

-- O hook roda como supabase_auth_admin (schema auth). Acesso mínimo necessário.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
--> statement-breakpoint
-- O hook não deve ser executável por usuários comuns.
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
--> statement-breakpoint
GRANT SELECT ON public.profiles TO supabase_auth_admin;
--> statement-breakpoint

-- RLS: permite o auth admin LER os profiles de dentro do hook (não bypassa RLS).
CREATE POLICY "profiles_auth_admin_read" ON public.profiles
  FOR SELECT TO supabase_auth_admin
  USING (true);
