import { pool } from "@/lib/db/pool";
import type { AgentStatus } from "@/types/db";

export type DeliveryAgentListItem = {
  id: string;
  name: string;
  phone: string;
  status: AgentStatus;
  created_at: Date;
  active_assignments: number;
};

export async function listDeliveryAgents(): Promise<DeliveryAgentListItem[]> {
  const { rows } = await pool.query<DeliveryAgentListItem>(
    `SELECT da.id, da.name, da.phone, da.status, da.created_at,
            (SELECT COUNT(*) FROM order_assignments oa
              WHERE oa.agent_id = da.id AND oa.status = 'assigned')::int AS active_assignments
     FROM delivery_agents da
     ORDER BY da.created_at DESC`,
  );
  return rows;
}

export async function createDeliveryAgent(input: {
  name: string;
  phone: string;
  status: AgentStatus;
}): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO delivery_agents (name, phone, status)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [input.name, input.phone, input.status],
  );
  return rows[0].id;
}

export async function updateDeliveryAgent(
  id: string,
  input: { name: string; phone: string; status: AgentStatus },
): Promise<void> {
  await pool.query(
    `UPDATE delivery_agents SET name = $1, phone = $2, status = $3 WHERE id = $4`,
    [input.name, input.phone, input.status, id],
  );
}

export async function deleteDeliveryAgent(id: string): Promise<void> {
  await pool.query("DELETE FROM delivery_agents WHERE id = $1", [id]);
}
