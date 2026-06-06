-- Fase 4.3a — Catálogo de custo do marceneiro (§7.6). Custo em centavos (BIGINT).

CREATE TYPE public.material_category AS ENUM ('CHAPA', 'FERRAGEM', 'ACESSORIO', 'FITA_BORDA', 'SERVICO', 'FRETE', 'OUTRO');
--> statement-breakpoint
CREATE TYPE public.material_unit AS ENUM ('UN', 'M2', 'ML', 'H');
--> statement-breakpoint

CREATE TABLE public.carpenter_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carpenter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category public.material_category NOT NULL,
  unit public.material_unit NOT NULL,
  unit_cost_cents bigint NOT NULL,
  sku text,
  supplier text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX carpenter_materials_owner_idx ON public.carpenter_materials (carpenter_id, active, category);
--> statement-breakpoint

ALTER TABLE public.carpenter_materials ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- O marceneiro gerencia só o próprio catálogo (admin lê tudo).
CREATE POLICY "materials_owner_read" ON public.carpenter_materials
  FOR SELECT TO authenticated
  USING (carpenter_id = auth.uid() OR public.is_admin());
--> statement-breakpoint
CREATE POLICY "materials_owner_insert" ON public.carpenter_materials
  FOR INSERT TO authenticated
  WITH CHECK (carpenter_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "materials_owner_update" ON public.carpenter_materials
  FOR UPDATE TO authenticated
  USING (carpenter_id = auth.uid())
  WITH CHECK (carpenter_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "materials_owner_delete" ON public.carpenter_materials
  FOR DELETE TO authenticated
  USING (carpenter_id = auth.uid());
