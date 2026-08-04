import { pool } from "@/lib/db/pool";
import type { SessionRow } from "@/types/db";

// Only the methods NextAuth's database adapter needs. The full session
// query surface gets developed in later phases.

export async function createSession(
  sessionToken: string,
  userId: string,
  expires: Date,
): Promise<SessionRow> {
  const { rows } = await pool.query<SessionRow>(
    `INSERT INTO sessions (session_token, user_id, expires)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [sessionToken, userId, expires],
  );
  return rows[0];
}

export async function getSession(
  sessionToken: string,
): Promise<SessionRow | null> {
  const { rows } = await pool.query<SessionRow>(
    `SELECT * FROM sessions
     WHERE session_token = $1 AND expires > now()`,
    [sessionToken],
  );
  return rows[0] ?? null;
}

export async function deleteSession(
  sessionToken: string,
): Promise<void> {
  await pool.query("DELETE FROM sessions WHERE session_token = $1", [
    sessionToken,
  ]);
}

export async function deleteSessionsByUser(userId: string): Promise<void> {
  await pool.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}
