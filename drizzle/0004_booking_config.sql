CREATE TABLE "booking_configs" (
  "id" serial PRIMARY KEY NOT NULL,
  "deposit_amount" integer NOT NULL,
  "bank_name" varchar(120) NOT NULL,
  "account_name" varchar(160) NOT NULL,
  "account_number" varchar(50) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "booking_configs" ("deposit_amount", "bank_name", "account_name", "account_number")
VALUES (100000, 'MB Bank', 'Trịnh Đình Vũ', '09680881');
