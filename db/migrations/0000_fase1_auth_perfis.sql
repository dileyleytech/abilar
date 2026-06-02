CREATE TYPE "public"."category" AS ENUM('GUARDA_ROUPA', 'COZINHA', 'PAINEL_TV', 'ESTANTE', 'HOME_OFFICE', 'BANHEIRO', 'LAVANDERIA', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."person_type" AS ENUM('MEI', 'PJ', 'PF');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('CLIENT', 'CARPENTER', 'ARCHITECT', 'ADMIN');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text,
	"cep" text NOT NULL,
	"street" text,
	"number" text,
	"complement" text,
	"district" text,
	"city" text,
	"state" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "architect_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cau" text,
	"commission_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"asaas_wallet_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carpenter_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"person_type" "person_type" NOT NULL,
	"name" text NOT NULL,
	"company_name" text,
	"cnpj_or_cpf" text NOT NULL,
	"logo_url" text,
	"use_default_logo" boolean DEFAULT true NOT NULL,
	"bio" text,
	"service_city" text NOT NULL,
	"service_cep" text NOT NULL,
	"service_radius_km" integer DEFAULT 20 NOT NULL,
	"categories" "category"[] DEFAULT '{}' NOT NULL,
	"kyc_status" "kyc_status" DEFAULT 'PENDING' NOT NULL,
	"rating" numeric(2, 1),
	"asaas_wallet_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "role" DEFAULT 'CLIENT' NOT NULL,
	"name" text,
	"phone" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "architect_profiles" ADD CONSTRAINT "architect_profiles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpenter_profiles" ADD CONSTRAINT "carpenter_profiles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_id_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "carpenter_profiles_service_city_idx" ON "carpenter_profiles" USING btree ("service_city");