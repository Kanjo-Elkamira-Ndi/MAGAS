import { pool } from "@/lib/db/pool";
import type { UserRow } from "@/types/db";

// Auth-relevant queries used by the NextAuth Credentials provider and the
// custom pg adapter. Other user queries get filled in later phases.

export async function getUserById(id: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    "SELECT * FROM users WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

export async function getUserBySessionToken(
  sessionToken: string,
): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT u.* FROM users u
     JOIN sessions s ON s.user_id = u.id
     WHERE s.session_token = $1 AND s.expires > now()`,
    [sessionToken],
  );
  return rows[0] ?? null;
}

export async function getUserByEmailOrPhone(
  identifier: string,
): Promise<UserRow | null> {
  // Accept either email or phone — customers may register with phone only.
  const { rows } = await pool.query<UserRow>(
    "SELECT * FROM users WHERE email = $1 OR phone = $1",
    [identifier],
  );
  return rows[0] ?? null;
}

export async function getUserByEmail(
  email: string,
): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [email],
  );
  return rows[0] ?? null;
}

export async function updateUserPassword(
  id: string,
  passwordHash: string,
): Promise<void> {
  await pool.query(
    "UPDATE users SET password_hash = $1 WHERE id = $2",
    [passwordHash, id],
  );
}
