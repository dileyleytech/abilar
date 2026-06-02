CREATE TYPE "public"."pricing_scope" AS ENUM('GLOBAL', 'PROMO');--> statement-breakpoint
CREATE TABLE "pricing_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"scope" "pricing_scope" DEFAULT 'GLOBAL' NOT NULL,
	"client_commission_pct" numeric(6, 3) NOT NULL,
	"carpenter_commission_pct" numeric(6, 3) NOT NULL,
	"architect_commission_pct" numeric(6, 3) DEFAULT '0' NOT NULL,
	"installment_table" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dilution_min_carpenter_share_pct" numeric(6, 3) DEFAULT '50' NOT NULL,
	"dilution_platform_margin_pct" numeric(6, 3) DEFAULT '1' NOT NULL,
	"pix_fixed_fee_cents" bigint DEFAULT 0 NOT NULL,
	"promo_rules" jsonb,
	"active_from" timestamp with time zone,
	"active_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pricing_config_key_idx" ON "pricing_config" USING btree ("key");