-- Fase 6 (§8.6) — propostas de design do marceneiro (EDIT/SUGGESTION).
DO $$ BEGIN
  CREATE TYPE "public"."design_proposal_type" AS ENUM('EDIT', 'SUGGESTION');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."design_proposal_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'APPLIED');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "design_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"carpenter_id" uuid NOT NULL,
	"type" "design_proposal_type" NOT NULL,
	"status" "design_proposal_status" DEFAULT 'PENDING' NOT NULL,
	"note" text,
	"state" jsonb NOT NULL,
	"preview_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "design_proposals" ADD CONSTRAINT "design_proposals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_proposals" ADD CONSTRAINT "design_proposals_carpenter_id_profiles_id_fk" FOREIGN KEY ("carpenter_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "design_proposals_project_idx" ON "design_proposals" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "design_proposals_carpenter_idx" ON "design_proposals" USING btree ("carpenter_id");
