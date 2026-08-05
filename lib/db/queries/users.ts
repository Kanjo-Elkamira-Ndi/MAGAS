import { pool } from "@/lib/db/pool";
import type { UserRole, UserRow, UserStatus } from "@/types/db";

export type AdminUserListItem = {
  id: string;
  role: UserRole;
  email: string | null;
  phone: string | null;
  status: UserStatus;
  created_at: Date;
  display_name: string | null;
  orders: number;
};

export async function listUsers(): Promise<AdminUserListItem[]> {
  const { rows } = await pool.query<AdminUserListItem>(
    `SELECT u.id, u.role, u.email, u.phone, u.status, u.created_at,
            COALESCE(c.full_name, rt.business_name, da.name) AS display_name,
            (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.user_id)::int AS orders
     FROM users u
     LEFT JOIN customers c ON c.user_id = u.id
     LEFT JOIN retailers rt ON rt.user_id = u.id
     LEFT JOIN delivery_agents da ON da.user_id = u.id
     ORDER BY u.created_at DESC`,
  );
  return rows;
}

export async function updateUserStatus(
  id: string,
  status: UserStatus,
): Promise<void> {
  await pool.query("UPDATE users SET status = $1 WHERE id = $2", [status, id]);
}

export type CustomerProfile = {
  full_name: string;
  default_address_id: string | null;
  email: string | null;
  phone: string | null;
  created_at: Date;
};

export async function getCustomerProfile(
  customerId: string,
): Promise<CustomerProfile | null> {
  const { rows } = await pool.query<CustomerProfile>(
    `SELECT c.full_name, c.default_address_id,
            u.email, u.phone, c.created_at
     FROM customers c
     JOIN users u ON u.id = c.user_id
     WHERE c.user_id = $1`,
    [customerId],
  );
  return rows[0] ?? null;
}

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
