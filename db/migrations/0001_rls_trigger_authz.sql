-- Fase 1 — RLS, trigger de signup e autorização (defesa em profundidade).
-- A role é fonte de verdade em public.profiles (NÃO confiar em user_metadata p/ authz).

-- 1) profiles.id referencia auth.users(id) (Supabase Auth é o dono do usuário).
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_id_auth_users_fk"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

-- 2) is_admin(): lê o papel da tabela profiles (não do JWT, que é manipulável).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'ADMIN'
  );
$$;
--> statement-breakpoint

-- 3) handle_new_user(): cria o profile no signup. Clampa o papel — ADMIN NUNCA
--    via cadastro (anti escalonamento de privilégio).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested text := coalesce(new.raw_user_meta_data->>'role', 'CLIENT');
  safe_role public.role;
BEGIN
  IF requested IN ('CLIENT','CARPENTER','ARCHITECT') THEN
    safe_role := requested::public.role;
  ELSE
    safe_role := 'CLIENT';
  END IF;

  INSERT INTO public.profiles (id, role, name, phone, email)
  VALUES (new.id, safe_role, new.raw_user_meta_data->>'name', new.phone, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--> statement-breakpoint

-- 4) lock_profile_role(): impede o usuário de mudar o próprio papel (só admin pode).
CREATE OR REPLACE FUNCTION public.lock_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    NEW.role := OLD.role; -- ignora a tentativa de troca de papel
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS profiles_lock_role ON public.profiles;
--> statement-breakpoint
CREATE TRIGGER profiles_lock_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_profile_role();
--> statement-breakpoint

-- 5) Habilita RLS em todas as tabelas.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.carpenter_profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.architect_profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- 6) Policies (role authenticated). O dono lê/escreve o seu; admin tudo.
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
--> statement-breakpoint
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
--> statement-breakpoint
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());
--> statement-breakpoint
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated USING (public.is_admin());
--> statement-breakpoint

CREATE POLICY "carpenter_profiles_owner_all" ON public.carpenter_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
--> statement-breakpoint

CREATE POLICY "architect_profiles_owner_all" ON public.architect_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
--> statement-breakpoint

CREATE POLICY "addresses_owner_all" ON public.addresses
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
