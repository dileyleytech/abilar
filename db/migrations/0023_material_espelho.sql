-- Catálogo: adiciona a categoria Espelho/Vidro (§7.6).
ALTER TYPE public.material_category ADD VALUE IF NOT EXISTS 'ESPELHO' AFTER 'CHAPA';
