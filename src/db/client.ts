import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/samcamping_admin";

declare global {
  // eslint-disable-next-line no-var
  var __samCampingAdminPool: Pool | undefined;
}

const pool = global.__samCampingAdminPool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== "production") {
  global.__samCampingAdminPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
