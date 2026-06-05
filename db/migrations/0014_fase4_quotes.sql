CREATE TYPE "public"."quote_status" AS ENUM('SENT', 'PRE_APPROVED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'PAID');--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"carpenter_id" uuid NOT NULL,
	"base_value_cents" bigint NOT NULL,
	"carpenter_cost_cents" bigint,
	"max_installments" integer DEFAULT 1 NOT NULL,
	"dilution_share_pct" numeric(6, 3) DEFAULT '100' NOT NULL,
	"note" text,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "quote_status" DEFAULT 'SENT' NOT NULL,
	"valid_until" timestamp with time zone,
	"pdf_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_carpenter_id_profiles_id_fk" FOREIGN KEY ("carpenter_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_project_carpenter_idx" ON "quotes" USING btree ("project_id","carpenter_id");--> statement-breakpoint
CREATE INDEX "quotes_project_idx" ON "quotes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "quotes_carpenter_status_idx" ON "quotes" USING btree ("carpenter_id","status");