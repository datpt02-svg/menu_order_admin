export function getDbConnectionString() {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim();
  }

  const host = process.env.DB_HOST?.trim() || "localhost";
  const port = process.env.DB_PORT?.trim() || "5432";
  const database = process.env.POSTGRES_DB?.trim() || "samcamping_admin";
  const user = process.env.POSTGRES_USER?.trim() || "postgres";
  const password = process.env.POSTGRES_PASSWORD?.trim() || "postgres";

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export function getPublicApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "";
}

export function getAllowedCorsOrigins() {
  const configured = process.env.CORS_ALLOWED_ORIGINS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured?.length) return configured;

  return ["http://localhost:3000", "http://127.0.0.1:3000"];
}
