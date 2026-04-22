CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."table_status" AS ENUM('available', 'reserved', 'occupied', 'cleaning');--> statement-breakpoint
CREATE TYPE "public"."waiter_status" AS ENUM('new', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "booking_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"status" "booking_status" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"customer_name" varchar(160) NOT NULL,
	"customer_phone" varchar(40) NOT NULL,
	"booking_date" varchar(20) NOT NULL,
	"booking_time" varchar(20) NOT NULL,
	"guest_count" integer NOT NULL,
	"zone_id" integer,
	"table_id" integer,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "locale_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"namespace" varchar(120) NOT NULL,
	"key" varchar(255) NOT NULL,
	"description" text,
	"deprecated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "locale_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "locale_publish_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"locale" varchar(20) NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locale_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"locale_key_id" integer NOT NULL,
	"locale" varchar(20) NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"zone_id" integer,
	"code" varchar(20) NOT NULL,
	"seats" integer NOT NULL,
	"status" "table_status" DEFAULT 'available' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tables_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "waiter_request_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"waiter_request_id" integer NOT NULL,
	"status" "waiter_status" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waiter_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"table_id" integer,
	"zone_id" integer,
	"need" varchar(200) NOT NULL,
	"note" text,
	"status" "waiter_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waiter_requests_code_unique" UNIQUE("code")
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
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locale_translations" ADD CONSTRAINT "locale_translations_locale_key_id_locale_keys_id_fk" FOREIGN KEY ("locale_key_id") REFERENCES "public"."locale_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiter_request_events" ADD CONSTRAINT "waiter_request_events_waiter_request_id_waiter_requests_id_fk" FOREIGN KEY ("waiter_request_id") REFERENCES "public"."waiter_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiter_requests" ADD CONSTRAINT "waiter_requests_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiter_requests" ADD CONSTRAINT "waiter_requests_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;