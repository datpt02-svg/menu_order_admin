import { sql } from "drizzle-orm";

import { db } from "@/db/client";

export async function ensureMenuCatalogTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS menu_sections (
      id serial PRIMARY KEY,
      slug varchar(160) NOT NULL UNIQUE,
      title_i18n jsonb NOT NULL,
      description_i18n jsonb NOT NULL,
      visible boolean NOT NULL DEFAULT true,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS menu_items (
      id serial PRIMARY KEY,
      section_id integer NOT NULL REFERENCES menu_sections(id) ON DELETE CASCADE,
      slug varchar(160) NOT NULL UNIQUE,
      name_i18n jsonb NOT NULL,
      note_i18n jsonb NOT NULL,
      description_i18n jsonb NOT NULL,
      price_label varchar(120) NOT NULL,
      image_path text,
      visible boolean NOT NULL DEFAULT true,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
}
