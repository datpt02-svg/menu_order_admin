import { defineConfig } from "drizzle-kit";

import { getDbConnectionString } from "./src/lib/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: getDbConnectionString(),
  },
});
