import { pool } from "@/lib/db/pool";
import type { AddressRow } from "@/types/db";

export async function getAddressesByCustomer(
  customerId: string,
): Promise<AddressRow[]> {
  const { rows } = await pool.query<AddressRow>(
    `SELECT a.*
     FROM addresses a
     WHERE a.customer_id = $1
     ORDER BY a.created_at ASC`,
    [customerId],
  );
  return rows;
}

export async function addAddress(
  customerId: string,
  input: {
    label?: string;
    line1: string;
    city: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
  },
): Promise<AddressRow> {
  const { rows } = await pool.query<AddressRow>(
    `INSERT INTO addresses (customer_id, label, line1, city, notes, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      customerId,
      input.label ?? null,
      input.line1,
      input.city,
      input.notes ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
    ],
  );
  return rows[0];
}

export async function setDefaultAddress(
  customerId: string,
  addressId: string,
): Promise<void> {
  await pool.query(
    `UPDATE customers SET default_address_id = $1 WHERE user_id = $2`,
    [addressId, customerId],
  );
}

export async function deleteAddress(
  customerId: string,
  addressId: string,
): Promise<void> {
  await pool.query(
    `DELETE FROM addresses WHERE id = $1 AND customer_id = $2`,
    [addressId, customerId],
  );
}
