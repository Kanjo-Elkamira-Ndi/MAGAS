import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
} from "next-auth/adapters";
import { pool } from "@/lib/db/pool";
import {
  createSession,
  deleteSession,
  deleteSessionsByUser,
  getSession,
} from "@/lib/db/queries/sessions";

// NextAuth v4 Adapter over raw `pg`, using the `users` and `sessions`
// tables defined in migration 001. Credentials-only — no OAuth `accounts`
// table is needed, so the account methods throw if NextAuth ever calls
// them (it will not when only the Credentials provider is configured).

function rowToUser(row: {
  id: string;
  email: string | null;
}): AdapterUser {
  return {
    id: row.id,
    email: row.email,
    // NextAuth AdapterUser requires these; we don't populate them with
    // real values for the Credentials flow, where the user is created
    // in the authorize() callback instead.
    emailVerified: null,
    name: null,
    image: null,
  } as AdapterUser;
}

export const pgAdapter: Adapter = {
  async createUser(user: AdapterUser) {
    const { rows } = await pool.query(
      `INSERT INTO users (role, email, password_hash, status)
       VALUES ('customer', $1, '', 'active')
       RETURNING id, email`,
      [user.email ?? ""],
    );
    return rowToUser({ id: rows[0].id, email: rows[0].email });
  },

  async getUser(id) {
    const { rows } = await pool.query(
      "SELECT id, email FROM users WHERE id = $1",
      [id],
    );
    if (rows.length === 0) return null;
    return rowToUser(rows[0]);
  },

  async getUserByEmail(email) {
    const { rows } = await pool.query(
      "SELECT id, email FROM users WHERE email = $1",
      [email],
    );
    if (rows.length === 0) return null;
    return rowToUser(rows[0]);
  },

  async getUserByAccount() {
    // Credentials provider does not populate an accounts table.
    return null;
  },

  async updateUser(user) {
    await pool.query(
      "UPDATE users SET email = COALESCE($1, email) WHERE id = $2",
      [user.email ?? null, user.id],
    );
    const { rows } = await pool.query(
      "SELECT id, email FROM users WHERE id = $1",
      [user.id],
    );
    return rowToUser(rows[0]);
  },

  async deleteUser(id) {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    return;
  },

  async linkAccount(_account: AdapterAccount) {
    // No-op for Credentials-only. If OAuth is ever added, this will need
    // an `accounts` table (and a corresponding migration + database-schema.md
    // update — flagged in context/phase-0-implementation-plan.md).
    return;
  },

  async unlinkAccount() {
    return;
  },

  async createSession(session: {
    sessionToken: string;
    userId: string;
    expires: Date;
  }): Promise<AdapterSession> {
    const row = await createSession(
      session.sessionToken,
      session.userId,
      session.expires,
    );
    return {
      sessionToken: row.session_token,
      userId: row.user_id,
      expires: row.expires,
    };
  },

  async getSessionAndUser(sessionToken) {
    const session = await getSession(sessionToken);
    if (!session) return null;
    const { rows } = await pool.query(
      "SELECT id, email FROM users WHERE id = $1",
      [session.user_id],
    );
    if (rows.length === 0) return null;
    return {
      session: {
        sessionToken: session.session_token,
        userId: session.user_id,
        expires: session.expires,
      },
      user: rowToUser(rows[0]),
    };
  },

  async updateSession(session) {
    // We do not extend sliding sessions at present — NextAuth will only
    // call this when session.updateAge triggers. Treat as a no-op.
    const existing = await getSession(session.sessionToken);
    return existing
      ? {
          sessionToken: existing.session_token,
          userId: existing.user_id,
          expires: existing.expires,
        }
      : null;
  },

  async deleteSession(sessionToken) {
    await deleteSession(sessionToken);
  },

  async createVerificationToken(token) {
    const { rows } = await pool.query(
      `INSERT INTO verification_tokens (user_id, token, purpose, expires_at)
       VALUES ($1, $2, 'email_verify', $3)
       RETURNING id, token, expires_at`,
      [token.identifier, token.token, token.expires],
    );
    return {
      identifier: String(token.identifier),
      token: rows[0].token,
      expires: rows[0].expires_at,
    };
  },

  async useVerificationToken({ token }) {
    const { rows } = await pool.query(
      `SELECT * FROM verification_tokens
       WHERE token = $1 AND used_at IS NULL AND expires_at > now()`,
      [token],
    );
    if (rows.length === 0) return null;
    await pool.query(
      "UPDATE verification_tokens SET used_at = now() WHERE id = $1",
      [rows[0].id],
    );
    return {
      identifier: String(rows[0].user_id),
      token: rows[0].token,
      expires: rows[0].expires_at,
    };
  },
};

// Re-export session helpers used by admin actions (force-revoke).
export { deleteSessionsByUser };
