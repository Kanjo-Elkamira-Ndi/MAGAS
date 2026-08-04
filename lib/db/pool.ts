import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in the connection string.",
  );
}

declare global {
  var __magasPgPool: Pool | undefined;
}

export const pool: Pool =
  global.__magasPgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== "production") {
  global.__magasPgPool = pool;
}

export type DbPool = typeof pool;
