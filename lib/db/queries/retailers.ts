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
