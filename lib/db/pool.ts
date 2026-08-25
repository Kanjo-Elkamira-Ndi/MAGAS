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
    // Managed Postgres providers with a free-tier auto-suspend (Neon
    // included) can take several seconds to wake a cold compute on the
    // first connection after a period of inactivity — 5s was tight
    // enough to occasionally lose that race and surface as an opaque
    // AggregateError with no message. 15s tolerates a cold start without
    // meaningfully slowing down the common case (an already-warm
    // connection resolves in milliseconds regardless of this ceiling).
    connectionTimeoutMillis: 15_000,
  });

if (process.env.NODE_ENV !== "production") {
  global.__magasPgPool = pool;
}

export type DbPool = typeof pool;
