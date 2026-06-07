-- SEED DE DEV — usuário ADMIN padrão. Idempotente.
--
-- ⚠️ NÃO está na pasta de migrations de propósito: não deve rodar em produção
-- automaticamente (senha padrão é só para desenvolvimento/teste). Rode à mão:
--     pnpm db:seed:admin
--
-- Credenciais padrão (DEV) — login por e-mail + senha na tela /entrar:
--     e-mail: admin@abilar.com.br
--     senha:  Abilar@2026
--
-- Em produção, troque a senha pelo painel do Supabase (Auth → Users).

DO $$
DECLARE
  v_email text := 'admin@abilar.com.br';
  v_pass  text := 'Abilar@2026';
  v_id    uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = v_email;

  IF v_id IS NULL THEN
    -- Cria o usuário de auth do zero (banco novo).
    v_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_pass, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
    );
    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_id::text, v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email), 'email',
      now(), now(), now()
    );
  ELSE
    -- Já existe: garante a senha padrão e o e-mail confirmado.
    UPDATE auth.users
       SET encrypted_password = extensions.crypt(v_pass, extensions.gen_salt('bf')),
           email_confirmed_at  = COALESCE(email_confirmed_at, now())
     WHERE id = v_id;
  END IF;

  -- Garante o perfil com papel ADMIN.
  INSERT INTO public.profiles (id, name, role)
       VALUES (v_id, 'Admin Abilar', 'ADMIN')
  ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

  RAISE NOTICE 'Admin pronto: % (senha padrão de DEV definida)', v_email;
END $$;
