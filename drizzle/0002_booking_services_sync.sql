ALTER TABLE "services"
ADD COLUMN "booking_enabled" boolean DEFAULT true NOT NULL,
ADD COLUMN "zone_slug" varchar(120),
ADD COLUMN "name_i18n" jsonb,
ADD COLUMN "description_i18n" jsonb,
ADD COLUMN "price_label_i18n" jsonb;

UPDATE "services"
SET
  "booking_enabled" = true,
  "name_i18n" = jsonb_build_object('vi', "name"),
  "description_i18n" = CASE WHEN "description" IS NULL THEN NULL ELSE jsonb_build_object('vi', "description") END,
  "price_label_i18n" = jsonb_build_object('vi', "price_label")
WHERE "name_i18n" IS NULL;