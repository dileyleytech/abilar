CREATE TYPE "public"."photo_kind" AS ENUM('ORIGINAL_ROOM', 'GENERATED', 'REFERENCE', 'ARCHITECT_PDF');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('DRAFT', 'OPEN_FOR_QUOTES', 'IN_NEGOTIATION', 'HIRED', 'EXECUTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('AI_GENERATED', 'ARCHITECT_PROJECT');--> statement-breakpoint
CREATE TYPE "public"."work_type" AS ENUM('NEW_INSTALL', 'REPLACE_EXISTING');--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"label" text,
	"width_mm" integer NOT NULL,
	"height_mm" integer NOT NULL,
	"depth_mm" integer NOT NULL,
	"material" text,
	"finish" text,
	"hardware" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" "photo_kind" NOT NULL,
	"path" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text,
	"category" "category" NOT NULL,
	"status" "project_status" DEFAULT 'DRAFT' NOT NULL,
	"work_type" "work_type" NOT NULL,
	"source_type" "source_type" DEFAULT 'AI_GENERATED' NOT NULL,
	"architect_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_photos" ADD CONSTRAINT "project_photos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_profiles_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_architect_id_profiles_id_fk" FOREIGN KEY ("architect_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "modules_project_idx" ON "modules" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_photos_project_idx" ON "project_photos" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "projects_status_created_idx" ON "projects" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "projects_client_idx" ON "projects" USING btree ("client_id");