-- Prazos da obra da plataforma (§7.7) — o marceneiro define previsão de início
-- e término na obra contratada.
ALTER TABLE public.projects
  ADD COLUMN planned_start_date date,
  ADD COLUMN planned_end_date date;
