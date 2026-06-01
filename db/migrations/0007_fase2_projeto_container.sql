-- Projeto vira container com NOME. Categoria/workType saem do projeto e
-- workType passa a ser por móvel (modules.work_type).
-- Backfill: títulos nulos de pedidos antigos (antes de SET NOT NULL).
UPDATE "projects" SET "title" = 'Meu pedido' WHERE "title" IS NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "work_type" "work_type";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "work_type";
