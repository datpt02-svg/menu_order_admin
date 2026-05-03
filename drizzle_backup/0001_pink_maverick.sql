CREATE TYPE "public"."staff_assignment_event_type" AS ENUM('created', 'moved', 'resized', 'reassigned', 'status_changed');--> statement-breakpoint
CREATE TYPE "public"."staff_assignment_status" AS ENUM('assigned', 'confirmed', 'absent');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('service', 'kitchen', 'cashier', 'manager', 'support');--> statement-breakpoint
CREATE TYPE "public"."staff_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "staff_assignment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_assignment_id" integer NOT NULL,
	"event_type" "staff_assignment_event_type" NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_assignments" (
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
CREATE TABLE "staff_members" (
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
CREATE TABLE "staff_shifts" (
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
ALTER TABLE "staff_assignment_events" ADD CONSTRAINT "staff_assignment_events_staff_assignment_id_staff_assignments_id_fk" FOREIGN KEY ("staff_assignment_id") REFERENCES "public"."staff_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_staff_shift_id_staff_shifts_id_fk" FOREIGN KEY ("staff_shift_id") REFERENCES "public"."staff_shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_preferred_zone_id_zones_id_fk" FOREIGN KEY ("preferred_zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;