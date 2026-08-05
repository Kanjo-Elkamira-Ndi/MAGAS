import { pool } from "@/lib/db/pool";

export type ProductListItem = {
  id: string;
  retailer_id: string;
  brand: string;
  cylinder_size: string;
  price: number;
  availability: boolean;
  created_at: Date;
  retailer_name?: string;
  retailer_location?: string;
};

const PRODUCT_SELECT = `
  SELECT p.id, p.retailer_id, p.brand, p.cylinder_size, p.price,
         p.availability, p.created_at,
         rt.business_name AS retailer_name,
         rt.location AS retailer_location
  FROM products p
  JOIN retailers rt ON rt.id = p.retailer_id
`;

export async function getProductsByRetailer(
  retailerId: string,
): Promise<ProductListItem[]> {
  const { rows } = await pool.query<ProductListItem>(
    `${PRODUCT_SELECT} WHERE p.retailer_id = $1 ORDER BY p.created_at DESC`,
    [retailerId],
  );
  return rows;
}

// Customer-facing browse: only products from approved retailers, nearest
// (most recently approved) first.
export async function getBrowseProducts(): Promise<ProductListItem[]> {
  const { rows } = await pool.query<ProductListItem>(
    `${PRODUCT_SELECT}
     WHERE rt.status = 'approved'
     ORDER BY rt.created_at DESC, p.created_at DESC`,
  );
  return rows;
}

export async function getAllProducts(): Promise<ProductListItem[]> {
  const { rows } = await pool.query<ProductListItem>(
    `${PRODUCT_SELECT} ORDER BY rt.business_name ASC, p.cylinder_size ASC`,
  );
  return rows;
}

export async function getProductById(id: string): Promise<ProductListItem | null> {
  const { rows } = await pool.query<ProductListItem>(
    `${PRODUCT_SELECT} WHERE p.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function setProductAvailability(
  id: string,
  availability: boolean,
): Promise<void> {
  await pool.query(
    "UPDATE products SET availability = $1, updated_at = now() WHERE id = $2",
    [availability, id],
  );
}

export async function upsertProduct(input: {
  id?: string;
  retailerId: string;
  brand: string;
  cylinderSize: string;
  price: number;
  availability: boolean;
}): Promise<string> {
  if (input.id) {
    await pool.query(
      `UPDATE products
       SET brand = $1, cylinder_size = $2, price = $3, availability = $4, updated_at = now()
       WHERE id = $5 AND retailer_id = $6`,
      [
        input.brand,
        input.cylinderSize,
        input.price,
        input.availability,
        input.id,
        input.retailerId,
      ],
    );
    return input.id;
  }
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO products (retailer_id, brand, cylinder_size, price, availability)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      input.retailerId,
      input.brand,
      input.cylinderSize,
      input.price,
      input.availability,
    ],
  );
  return rows[0].id;
}

export async function deleteProduct(id: string, retailerId?: string): Promise<void> {
  await pool.query(
    "DELETE FROM products WHERE id = $1" +
      (retailerId ? " AND retailer_id = $2" : ""),
    retailerId ? [id, retailerId] : [id],
  );
}
