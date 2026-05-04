DO $$ BEGIN
 CREATE TYPE "public"."waiter_status" AS ENUM('new', 'in_progress', 'done');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waiter_requests" (
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
CREATE TABLE IF NOT EXISTS "waiter_request_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"waiter_request_id" integer NOT NULL,
	"status" "waiter_status" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waiter_requests" ADD CONSTRAINT "waiter_requests_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waiter_requests" ADD CONSTRAINT "waiter_requests_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waiter_request_events" ADD CONSTRAINT "waiter_request_events_waiter_request_id_waiter_requests_id_fk" FOREIGN KEY ("waiter_request_id") REFERENCES "public"."waiter_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
