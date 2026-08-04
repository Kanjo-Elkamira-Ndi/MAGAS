import argon2 from "argon2";
import bcrypt from "bcryptjs";

type Schema = "argon2" | "bcrypt";

const SCHEME_ARGON = "$argon2";
const SCHEME_BCRYPT = "$bcrypt$";
const BCRYPT_ROUNDS = 12;

function configuredScheme(): Schema {
  const raw = (process.env.HASH_ALGORITHM ?? "argon2").toLowerCase();
  if (raw === "bcrypt") return "bcrypt";
  return "argon2";
}

export async function hashPassword(plain: string): Promise<string> {
  const scheme = configuredScheme();
  if (scheme === "bcrypt") {
    const hash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
    return `${SCHEME_BCRYPT}${hash}`;
  }
  const hash = await argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  // argon2's encoded hash already begins with $argon2 — store as-is.
  return hash;
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  try {
    if (stored.startsWith(SCHEME_BCRYPT)) {
      return bcrypt.compare(plain, stored.slice(SCHEME_BCRYPT.length));
    }
    if (stored.startsWith(SCHEME_ARGON)) {
      return argon2.verify(stored, plain);
    }
    // Legacy / unknown scheme — return false so callers reject safely.
    return false;
  } catch {
    return false;
  }
}
