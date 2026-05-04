DO $$ BEGIN
 CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."deposit_review_status" AS ENUM('not_submitted', 'submitted', 'approved', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."staff_role" AS ENUM('service', 'kitchen', 'cashier', 'manager', 'support');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."staff_status" AS ENUM('active', 'inactive');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."staff_assignment_status" AS ENUM('assigned', 'confirmed', 'absent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."staff_assignment_event_type" AS ENUM('created', 'moved', 'resized', 'reassigned', 'status_changed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookings" (
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
	"deposit_slip_path" text,
	"deposit_review_status" "deposit_review_status" DEFAULT 'not_submitted' NOT NULL,
	"deposit_reviewed_at" timestamp,
	"deposit_review_note" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "booking_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"status" "booking_status" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"phone" varchar(40) NOT NULL,
	"role" "staff_role" DEFAULT 'service' NOT NULL,
	"status" "staff_status" DEFAULT 'active' NOT NULL,
	"preferred_zone_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_members_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_date" varchar(20) NOT NULL,
	"start_time" varchar(20) NOT NULL,
	"end_time" varchar(20) NOT NULL,
	"label" varchar(120) NOT NULL,
	"zone_id" integer,
	"headcount_required" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_member_id" integer NOT NULL,
	"staff_shift_id" integer NOT NULL,
	"zone_id" integer,
	"assignment_role" "staff_role",
	"status" "staff_assignment_status" DEFAULT 'assigned' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shift_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(120) NOT NULL,
	"start_time" varchar(20) NOT NULL,
	"end_time" varchar(20) NOT NULL,
	"zone_id" integer,
	"headcount_required" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_assignment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_assignment_id" integer NOT NULL,
	"event_type" "staff_assignment_event_type" NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "locale_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"namespace" varchar(120) NOT NULL,
	"key" varchar(255) NOT NULL,
	"description" text,
	"deprecated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "locale_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "locale_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"locale_key_id" integer NOT NULL,
	"locale" varchar(20) NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "locale_publish_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"locale" varchar(20) NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_preferred_zone_id_zones_id_fk" FOREIGN KEY ("preferred_zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_staff_shift_id_staff_shifts_id_fk" FOREIGN KEY ("staff_shift_id") REFERENCES "public"."staff_shifts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_assignment_events" ADD CONSTRAINT "staff_assignment_events_staff_assignment_id_staff_assignments_id_fk" FOREIGN KEY ("staff_assignment_id") REFERENCES "public"."staff_assignments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "locale_translations" ADD CONSTRAINT "locale_translations_locale_key_id_locale_keys_id_fk" FOREIGN KEY ("locale_key_id") REFERENCES "public"."locale_keys"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
