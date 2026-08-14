import { randomBytes } from "node:crypto";
import { pool } from "@/lib/db/pool";
import { hashPassword } from "@/lib/auth/password";
import { createVerificationToken } from "@/lib/db/queries/verification-tokens";
import type { DeliveryAgentRow } from "@/types/db";

// Delivery-agent login lifecycle: inviting an existing delivery_agents
// contact record to a real account, and activating that account once the
// agent sets their own password. Contact-record CRUD (name/phone/status)
// lives in lib/db/queries/agents.ts — this file owns the user_id link.

export async function getDeliveryAgentById(
  id: string,
): Promise<DeliveryAgentRow | null> {
  const { rows } = await pool.query<DeliveryAgentRow>(
    "SELECT * FROM delivery_agents WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Links a delivery_agents contact record to a login (creating the users
 * row on first invite) and stores a fresh invite token for it. If the
 * record is already linked (e.g. resending an invite that hasn't been
 * accepted yet), reuses the existing user rather than creating a
 * duplicate one.
 */
export async function createAgentInvite(
  agentId: string,
  token: string,
  expiresAt: Date,
): Promise<{ userId: string; identifier: string }> {
  const agent = await getDeliveryAgentById(agentId);
  if (!agent) throw new Error("Agent not found");

  let userId = agent.user_id;
  if (!userId) {
    // Unguessable placeholder — nobody can sign in with it, since the real
    // password is only ever set via the invite-token flow below.
    const placeholderHash = await hashPassword(randomBytes(32).toString("hex"));
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO users (role, phone, password_hash, status)
       VALUES ('agent', $1, $2, 'pending')
       RETURNING id`,
      [agent.phone, placeholderHash],
    );
    userId = rows[0].id;
    await pool.query(
      "UPDATE delivery_agents SET user_id = $1 WHERE id = $2",
      [userId, agentId],
    );
  }

  await createVerificationToken({
    userId,
    token,
    purpose: "agent_invite",
    expiresAt,
  });

  return { userId, identifier: agent.phone };
}

export async function activateAgentAccount(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await pool.query(
    "UPDATE users SET password_hash = $1, status = 'active' WHERE id = $2",
    [passwordHash, userId],
  );
}
