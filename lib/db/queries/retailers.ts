import { pool } from "@/lib/db/pool";
import type { RetailerRow } from "@/types/db";

export async function getRetailerByUserId(
  _userId: string,
): Promise<RetailerRow | null> {
  throw new Error("getRetailerByUserId not implemented until Phase 1.");
}

export type RetailerListItem = {
  id: string;
  business_name: string;
  location: string;
  status: string;
  orders: string;
};

export async function getApprovedRetailers(): Promise<RetailerListItem[]> {
  const { rows } = await pool.query<RetailerListItem>(
    `SELECT rt.id, rt.business_name, rt.location, rt.status,
            (SELECT COUNT(*) FROM orders o WHERE o.retailer_id = rt.id)::int AS orders
     FROM retailers rt
     WHERE rt.status = 'approved'
     ORDER BY rt.created_at DESC`,
  );
  return rows;
}

export type RetailerAdminListItem = {
  id: string;
  user_id: string | null;
  business_name: string;
  location: string;
  status: string;
  approved_by: string | null;
  created_at: Date;
  owner_email: string | null;
  orders: number;
  products: number;
};

export async function getAllRetailers(): Promise<RetailerAdminListItem[]> {
  const { rows } = await pool.query<RetailerAdminListItem>(
    `SELECT rt.id, rt.user_id, rt.business_name, rt.location, rt.status,
            rt.approved_by, rt.created_at,
            u.email AS owner_email,
            (SELECT COUNT(*) FROM orders o WHERE o.retailer_id = rt.id)::int AS orders,
            (SELECT COUNT(*) FROM products p WHERE p.retailer_id = rt.id)::int AS products
     FROM retailers rt
     LEFT JOIN users u ON u.id = rt.user_id
     ORDER BY rt.created_at DESC`,
  );
  return rows;
}

export async function updateRetailerStatus(
  id: string,
  status: string,
  adminId?: string,
): Promise<void> {
  await pool.query(
    `UPDATE retailers
     SET status = $1,
         approved_by = CASE WHEN $1 = 'approved' THEN COALESCE($2, approved_by) ELSE approved_by END,
         updated_at = now()
     WHERE id = $3`,
    [status, adminId ?? null, id],
  );
}

export async function countPendingRetailers(): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::int AS n FROM retailers WHERE status = 'pending'`,
  );
  return Number(rows[0].n);
}

export type RetailerProfile = {
  id: string;
  business_name: string;
  location: string;
  status: string;
  owner_email: string | null;
  owner_phone: string | null;
  created_at: Date;
  products: number;
};

export async function getRetailerProfile(
  retailerId: string,
): Promise<RetailerProfile | null> {
  const { rows } = await pool.query<RetailerProfile>(
    `SELECT rt.id, rt.business_name, rt.location, rt.status,
            u.email AS owner_email, u.phone AS owner_phone,
            rt.created_at,
            (SELECT COUNT(*) FROM products p WHERE p.retailer_id = rt.id)::int AS products
     FROM retailers rt
     LEFT JOIN users u ON u.id = rt.user_id
     WHERE rt.id = $1`,
    [retailerId],
  );
  return rows[0] ?? null;
}
