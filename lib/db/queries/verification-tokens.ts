import { pool } from "@/lib/db/pool";
import type { VerificationTokenRow, VerificationPurpose } from "@/types/db";

export async function createVerificationToken(params: {
  userId: string;
  token: string;
  purpose: VerificationPurpose;
  expiresAt: Date;
}): Promise<VerificationTokenRow> {
  const { userId, token, purpose, expiresAt } = params;
  const { rows } = await pool.query<VerificationTokenRow>(
    `INSERT INTO verification_tokens (user_id, token, purpose, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, token, purpose, expiresAt],
  );
  return rows[0];
}

export async function findValidVerificationToken(
  token: string,
  purpose?: VerificationPurpose,
): Promise<VerificationTokenRow | null> {
  const { rows } = await pool.query<VerificationTokenRow>(
    `SELECT * FROM verification_tokens
     WHERE token = $1
       AND used_at IS NULL
       AND expires_at > now()
       ${purpose ? "AND purpose = $2" : ""}`,
    purpose ? [token, purpose] : [token],
  );
  return rows[0] ?? null;
}

export async function markTokenUsed(tokenId: string): Promise<void> {
  await pool.query(
    "UPDATE verification_tokens SET used_at = now() WHERE id = $1",
    [tokenId],
  );
}
