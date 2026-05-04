CREATE TABLE "booking_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"deposit_amount" integer NOT NULL,
	"bank_name" varchar(120) NOT NULL,
	"bank_code" varchar(40) DEFAULT 'mbbank' NOT NULL,
	"account_number" varchar(50) NOT NULL,
	"phone" varchar(40) DEFAULT '09680881' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title_i18n" jsonb NOT NULL,
	"description_i18n" jsonb NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "menu_sections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name_i18n" jsonb NOT NULL,
	"note_i18n" jsonb NOT NULL,
	"description_i18n" jsonb NOT NULL,
	"price_label" varchar(120) NOT NULL,
	"image_path" text,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "menu_items_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"category" varchar(120) NOT NULL,
	"description" text,
	"price_label" varchar(120) NOT NULL,
	"image_path" text,
	"visible" boolean DEFAULT true NOT NULL,
	"booking_enabled" boolean DEFAULT true NOT NULL,
	"zone_slug" varchar(120),
	"name_i18n" jsonb,
	"description_i18n" jsonb,
	"price_label_i18n" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "zones_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_section_id_menu_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."menu_sections"("id") ON DELETE cascade ON UPDATE no action;