import { pool } from "@/lib/db/pool";
import { hashPassword } from "@/lib/auth/password";

const EMAIL = "admin@magas.test";
const PASSWORD = "Admin-Magas-2026!";

async function main() {
  const hash = await hashPassword(PASSWORD);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO users (role, email, password_hash)
     VALUES ('admin', $1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [EMAIL, hash],
  );
  console.log(`Seeded admin ${EMAIL} -> id ${rows[0].id}`);
  console.log(`Password: ${PASSWORD}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
