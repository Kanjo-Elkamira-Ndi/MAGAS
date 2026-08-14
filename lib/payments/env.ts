// Lazy env-var lookup for payment provider credentials — checked inside
// the functions that need them, not at module import time. Unlike
// lib/db/pool.ts's import-time throw on DATABASE_URL, the whole app (COD
// orders, every other page) must keep working with zero payment provider
// keys configured; only an actual momo/orange charge attempt should fail
// if a key is missing, the same way the Google Maps key degrades the map
// card instead of crashing the app.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill in your payment provider keys.`,
    );
  }
  return value;
}
