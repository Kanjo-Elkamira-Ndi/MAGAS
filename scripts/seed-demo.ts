import { pool } from "@/lib/db/pool";
import { hashPassword } from "@/lib/auth/password";
import type { UserRole } from "@/types/db";

// ---------------------------------------------------------------------------
// Demo data for every user role so each dashboard can be inspected after
// login. Idempotent: safe to re-run. Existing demo orders are replaced on
// every run; non-demo data is untouched.
//
// Credentials (all passwords end in -Magas-2026!):
//   Admin:    admin@magas.test    / Admin-Magas-2026!
//   Customer: customer@magas.test / Customer-Magas-2026!
//   Retailer: retailer@magas.test / Retailer-Magas-2026!
//   Agent:    agent@magas.test    / Agent-Magas-2026!
// ---------------------------------------------------------------------------

const PASSWORD_SUFFIX = "-Magas-2026!";

// Illustrative Douala-area points so live delivery tracking has something
// real to render without waiting on a live checkout flow (which doesn't
// exist yet — orders are only ever created here). Agent starts partway
// between the retailer and the customer, as if already en route.
const DEMO_COORDS = {
  retailer: { lat: 4.0483, lng: 9.7043 },
  customer: { lat: 4.0511, lng: 9.699 },
  agent: { lat: 4.0498, lng: 9.702 },
};

const DEMO = {
  admin: { email: "admin@magas.test", password: `Admin${PASSWORD_SUFFIX}` },
  customer: {
    email: "customer@magas.test",
    password: `Customer${PASSWORD_SUFFIX}`,
    fullName: "Aline Ngo Bassa",
    phone: "+237 690 11 22 33",
  },
  retailer: {
    email: "retailer@magas.test",
    password: `Retailer${PASSWORD_SUFFIX}`,
    businessName: "Étoile du Gaz",
    location: "Akwa, Douala",
  },
  agent: {
    email: "agent@magas.test",
    password: `Agent${PASSWORD_SUFFIX}`,
    name: "Boris Kamga",
    phone: "+237 699 44 55 66",
  },
};

async function upsertUser(role: UserRole, email: string, password: string) {
  const hash = await hashPassword(password);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO users (role, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET
       role = EXCLUDED.role,
       password_hash = EXCLUDED.password_hash,
       status = 'active'
     RETURNING id`,
    [role, email, hash],
  );
  return rows[0].id;
}

async function ensureCustomer(userId: string, fullName: string, phone: string) {
  await pool.query(
    `INSERT INTO customers (user_id, full_name)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name`,
    [userId, fullName],
  );
  await pool.query(
    `UPDATE users SET phone = COALESCE(users.phone, $2) WHERE id = $1`,
    [userId, phone],
  );

  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM addresses WHERE customer_id = $1 ORDER BY created_at LIMIT 1`,
    [userId],
  );
  if (!rows[0]) {
    const address = await pool.query<{ id: string }>(
      `INSERT INTO addresses (customer_id, label, line1, city, notes, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        "Home",
        "Rue Berthe, près de la pharmacie",
        "Douala",
        "3rd floor",
        DEMO_COORDS.customer.lat,
        DEMO_COORDS.customer.lng,
      ],
    );
    await pool.query(
      `UPDATE customers SET default_address_id = $1 WHERE user_id = $2`,
      [address.rows[0].id, userId],
    );
  }
  return userId;
}

async function ensureRetailer(
  userId: string,
  businessName: string,
  location: string,
  approvedById: string,
) {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO retailers (user_id, business_name, location, latitude, longitude, status, approved_by)
     VALUES ($1, $2, $3, $4, $5, 'approved', $6)
     ON CONFLICT (user_id) DO UPDATE SET
       business_name = EXCLUDED.business_name,
       location = EXCLUDED.location,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       status = 'approved',
       approved_by = EXCLUDED.approved_by
     RETURNING id`,
    [
      userId,
      businessName,
      location,
      DEMO_COORDS.retailer.lat,
      DEMO_COORDS.retailer.lng,
      approvedById,
    ],
  );
  return rows[0].id;
}

async function ensureProducts(retailerId: string) {
  const { rows } = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::int AS n FROM products WHERE retailer_id = $1`,
    [retailerId],
  );
  if (Number(rows[0].n) > 0) return;

  const catalog = [
    { brand: "GAZ Cameroon", size: "6 kg", price: 4500 },
    { brand: "GAZ Cameroon", size: "12.5 kg", price: 7500 },
    { brand: "GAZ Total", size: "25 kg", price: 12000 },
  ];
  for (const p of catalog) {
    await pool.query(
      `INSERT INTO products (retailer_id, brand, cylinder_size, price)
       VALUES ($1, $2, $3, $4)`,
      [retailerId, p.brand, p.size, p.price],
    );
  }
}

async function ensureAgent(userId: string, name: string, phone: string) {
  // Seeded with a position already reported (as if en route) so the live
  // tracking map has something to show without waiting on the agent to
  // grant browser geolocation permission first.
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO delivery_agents (user_id, name, phone, latitude, longitude, location_updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       name = EXCLUDED.name,
       phone = EXCLUDED.phone,
       status = 'active',
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       location_updated_at = now()
     RETURNING id`,
    [userId, name, phone, DEMO_COORDS.agent.lat, DEMO_COORDS.agent.lng],
  );
  return rows[0].id;
}

async function productId(
  retailerId: string,
  size: string,
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM products WHERE retailer_id = $1 AND cylinder_size = $2 LIMIT 1`,
    [retailerId, size],
  );
  if (!rows[0]) throw new Error(`Product ${size} missing for retailer ${retailerId}`);
  return rows[0].id;
}

async function seedOrders(
  customerId: string,
  retailerId: string,
  agentId: string,
) {
  // Replace demo orders on every run so the set stays predictable.
  await pool.query(
    `DELETE FROM orders WHERE customer_id = $1 OR retailer_id = $2`,
    [customerId, retailerId],
  );

  const p125 = await productId(retailerId, "12.5 kg");
  const p6 = await productId(retailerId, "6 kg");
  const p25 = await productId(retailerId, "25 kg");

  const now = Date.now();
  const minutes = (m: number) => new Date(now - m * 60_000);

  // [status, payment_method, total, hoursAgo, items[], assignment?, payment?]
  const orders: Array<{
    status: Parameters<typeof insertOrder>[0]["status"];
    paymentMethod: string;
    total: number;
    at: Date;
    items: Array<{ productId: string; quantity: number; price: number }>;
    agentDelivered?: boolean;
    paymentSuccess?: boolean;
  }> = [
    {
      status: "placed",
      paymentMethod: "cod",
      total: 7500,
      at: minutes(10),
      items: [{ productId: p125, quantity: 1, price: 7500 }],
    },
    {
      status: "confirmed",
      paymentMethod: "momo",
      total: 9000,
      at: minutes(60),
      items: [{ productId: p6, quantity: 2, price: 4500 }],
    },
    {
      status: "assigned",
      paymentMethod: "orange",
      total: 7500,
      at: minutes(120),
      items: [{ productId: p125, quantity: 1, price: 7500 }],
    },
    {
      status: "out_for_delivery",
      paymentMethod: "cod",
      total: 7500,
      at: minutes(180),
      items: [{ productId: p125, quantity: 1, price: 7500 }],
      agentDelivered: false,
    },
    {
      status: "delivered",
      paymentMethod: "momo",
      total: 4500,
      at: minutes(60 * 24),
      items: [{ productId: p6, quantity: 1, price: 4500 }],
      agentDelivered: true,
      paymentSuccess: true,
    },
    {
      status: "delivered",
      paymentMethod: "orange",
      total: 7500,
      at: minutes(60 * 24 * 3),
      items: [{ productId: p125, quantity: 1, price: 7500 }],
      paymentSuccess: true,
    },
    {
      status: "cancelled",
      paymentMethod: "cod",
      total: 12000,
      at: minutes(60 * 24 * 5),
      items: [{ productId: p25, quantity: 1, price: 12000 }],
    },
  ];

  for (const o of orders) {
    const orderId = await insertOrder(
      {
        customerId,
        retailerId,
        status: o.status,
        paymentMethod: o.paymentMethod,
        deliveryAddress: "Rue Berthe, Akwa, Douala",
        deliveryLatitude: DEMO_COORDS.customer.lat,
        deliveryLongitude: DEMO_COORDS.customer.lng,
        total: o.total,
        at: o.at,
      },
      o.items,
    );
    if (o.agentDelivered !== undefined) {
      await pool.query(
        `INSERT INTO order_assignments (order_id, agent_id, status)
         VALUES ($1, $2, $3)`,
        [orderId, agentId, o.agentDelivered ? "delivered" : "assigned"],
      );
    }
    await pool.query(
      `INSERT INTO payments (order_id, method, status, amount, provider_ref)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        orderId,
        o.paymentMethod,
        o.paymentSuccess ? "success" : "pending",
        o.total,
        o.paymentSuccess ? `SEED-${orderId.slice(0, 8)}` : null,
      ],
    );
  }

  return orders.length;
}

async function insertOrder(
  o: {
    customerId: string;
    retailerId: string;
    status: "placed" | "confirmed" | "assigned" | "out_for_delivery" | "delivered" | "cancelled";
    paymentMethod: string;
    deliveryAddress: string;
    deliveryLatitude: number;
    deliveryLongitude: number;
    total: number;
    at: Date;
  },
  items: Array<{ productId: string; quantity: number; price: number }>,
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO orders (customer_id, retailer_id, status, payment_method, delivery_address, delivery_latitude, delivery_longitude, total_amount, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
     RETURNING id`,
    [
      o.customerId,
      o.retailerId,
      o.status,
      o.paymentMethod,
      o.deliveryAddress,
      o.deliveryLatitude,
      o.deliveryLongitude,
      o.total,
      o.at,
    ],
  );
  const orderId = rows[0].id;
  for (const item of items) {
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity, price_at_order)
       VALUES ($1, $2, $3, $4)`,
      [orderId, item.productId, item.quantity, item.price],
    );
  }
  return orderId;
}

async function main() {
  const adminId = await upsertUser("admin", DEMO.admin.email, DEMO.admin.password);
  console.log(`Admin:    ${DEMO.admin.email} / ${DEMO.admin.password}`);

  const customerId = await upsertUser(
    "customer",
    DEMO.customer.email,
    DEMO.customer.password,
  );
  await ensureCustomer(customerId, DEMO.customer.fullName, DEMO.customer.phone);
  console.log(`Customer: ${DEMO.customer.email} / ${DEMO.customer.password}`);

  const retailerUserId = await upsertUser(
    "retailer",
    DEMO.retailer.email,
    DEMO.retailer.password,
  );
  const retailerId = await ensureRetailer(
    retailerUserId,
    DEMO.retailer.businessName,
    DEMO.retailer.location,
    adminId,
  );
  await ensureProducts(retailerId);
  console.log(`Retailer: ${DEMO.retailer.email} / ${DEMO.retailer.password}`);

  // Second approved retailer (no login account) so admin views have variety.
  const existing = await pool.query(
    `SELECT 1 FROM retailers WHERE business_name = 'Gaz Plus Bonabéri' LIMIT 1`,
  );
  if (!existing.rows[0]) {
    await pool.query(
      `INSERT INTO retailers (business_name, location, status, approved_by)
       VALUES ('Gaz Plus Bonabéri', 'Bonabéri, Douala', 'approved', $1)`,
      [adminId],
    );
  }

  const agentUserId = await upsertUser("agent", DEMO.agent.email, DEMO.agent.password);
  const agentId = await ensureAgent(agentUserId, DEMO.agent.name, DEMO.agent.phone);
  console.log(`Agent:    ${DEMO.agent.email} / ${DEMO.agent.password}`);

  const orderCount = await seedOrders(customerId, retailerId, agentId);
  console.log(`Seeded ${orderCount} demo orders across all statuses.`);
  console.log("Done.");
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
