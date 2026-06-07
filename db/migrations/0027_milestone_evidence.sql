-- Foto de evidência por marco da obra (§6.4): o marceneiro anexa ao concluir.
ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS evidence_url text;
