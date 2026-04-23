CREATE TYPE "public"."deposit_review_status" AS ENUM('not_submitted', 'submitted', 'approved', 'rejected');

ALTER TABLE "bookings"
ADD COLUMN "deposit_slip_path" text,
ADD COLUMN "deposit_review_status" "deposit_review_status" DEFAULT 'not_submitted' NOT NULL,
ADD COLUMN "deposit_reviewed_at" timestamp,
ADD COLUMN "deposit_review_note" text;
