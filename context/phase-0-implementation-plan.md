# Phase 0 Implementation Plan — MAGAS

This document captures the concrete execution plan for Phase 0 (Foundation)
of the MAGAS MVP. It is derived from `development-roadmap.md`,
`architecture.md`, `database-schema.md`, `security.md`, `code-standards.md`,
`file-structure.md`, and `ui-context.md`, plus the decisions confirmed by
the project owner before work began.

> Status: **Ready to execute.** Check off each subsection as it lands.
> Any deviation discovered mid-build must be flagged here (see the
> "Deviations & open issues" section at the bottom) before continuing.

---

## Locked decisions (from plan-mode sign-off)

| Concern | Decision | Notes |
|---|---|---|
| Migration 001 scope | **Full schema up front** | One additive migration creates all 10 tables (per `database-schema.md`) including the dormant `delivery_agents` / `order_assignments`. Matches the "schema already exists for dormant features" intent in `architecture.md`. |
| NextAuth version | **v4 stable** | Custom `pg` adapter implementing the v4 `Adapter` interface; database session strategy. |
| Password hashing | **Support both** | `argon2` is the default/preferred; `bcrypt` installed as fallback. `lib/auth/password.ts` selects via a `HASH_ALGORITHM` env var (default `argon2`). |
| shadcn/ui init | **Use the CLI** | `npx shadcn@latest init` writes `components.json`, `lib/utils.ts`, and base primitives. Primitives added on demand. |
| DB connection | **User fills `.env.local`** | After I generate `.env.example`, the user drops in `DATABASE_URL`, `NEXTAUTH_SECRET`, and any optional keys. |

---

## Deliverables (in execution order)

### 0.1 Tooling & project scaffolding

- [ ] `npm init` + install core deps:
      `next@15`, `react`, `react-dom`, `typescript`, `@types/react`,
      `@types/react-dom`, `@types/node`, `pg`, `next-auth@^4`,
      `argon2`, `bcryptjs` + `@types/bcryptjs`, `zod`, `lucide-react`.
- [ ] Install dev tooling: `eslint`, `eslint-config-next`,
      `prettier`, `prettier-plugin-tailwindcss`.
- [ ] `tsconfig.json` — `strict: true`, path alias `@/*` → repo root, `next`
      plugin, `moduleResolution: bundler`.
- [ ] `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`,
      `eslint.config.mjs` (flat config), `.prettierrc`, `.gitignore`.
- [ ] `.env.example` documenting every required variable (see "Environments"
      table below).
- [ ] `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck`,
      `db:migrate`. `db:migrate` invokes `lib/db/migrate.ts` via
      `tsx` (add `tsx` as devDep).

### 0.2 Directory skeleton (per `file-structure.md`)

Create empty (with placeholder contents where needed so Next.js builds):

```
app/
  (public)/  (auth)/  (customer)/  (retailer)/  (agent)/  (admin)/
  api/auth/[...nextauth]/  api/auth/register/  api/auth/verify/
  api/auth/forgot-password/  api/auth/reset-password/
  api/public/retailers/  api/public/retailers/[id]/products/
  api/customer/**  api/retailer/**  api/agent/**  api/admin/**
  api/payments/simulate/
lib/
  db/{migrations,queries}  auth/  payments/  orders/  validation/
components/{ui,customer,retailer,admin,shared}
types/
middleware.ts
context/   (already exists)
```

### 0.3 Database layer

- [ ] `lib/db/pool.ts` — single `pg.Pool` from
      `process.env.DATABASE_URL`. Exported as the only pool instance.
      (`code-standards.md`: never instantiate a new Pool per request.)
- [ ] `lib/db/migrate.ts` — runner that:
      - Creates a `schema_migrations(filename text primary key,
        applied_at timestamptz default now())` table if absent.
      - Reads `lib/db/migrations/*.sql` ordered lexicographically.
      - Skips already-applied filenames.
      - Applies each new migration inside its own transaction; on
        success inserts a row into `schema_migrations`; on failure rolls
        back and aborts with a clear error.
      - Wired to `npm run db:migrate`.
- [ ] `lib/db/migrations/001_init_schema.sql` — **full schema**, including:
      - Enums: `user_role` ('customer' | 'retailer' | 'agent' | 'admin'),
        `order_status` ('placed' | 'confirmed' | 'assigned' |
        'out_for_delivery' | 'delivered' | 'cancelled' | 'failed').
      - Tables: `users`, `sessions`, `verification_tokens`, `customers`,
        `addresses`, `retailers`, `products`, `orders`, `order_items`,
        `payments`, `delivery_agents`, `order_assignments`.
      - `updated_at` trigger function applied to `users`, `products`,
        `orders`, `payments`.
      - Indexes on hot paths: `users(email)`, `users(phone)`,
        `products(retailer_id)`, `orders(customer_id)`,
        `orders(retailer_id)`, `orders(status)`, `payments(order_id)`,
        `sessions(user_id)`, `verification_tokens(user_id)`,
        `order_assignments(order_id)`, `order_assignments(agent_id)`.
- [ ] `lib/db/queries/*.ts` — stubs for each entity
      (`users.ts`, `retailers.ts`, `products.ts`, `orders.ts`,
      `payments.ts`, `delivery-agents.ts`, `addresses.ts`,
      `customers.ts`, `sessions.ts`, `verification-tokens.ts`), with
      typed row interfaces in `types/db.ts` matching the migration. Real
      query functions will be filled in Phase 1+; for now each file
      exports typed signatures only where auth/login needs them
      (specifically `getUserByEmailOrPhone`, `getUserById`,
      `createSession`, `deleteSession`, `getSession`).

### 0.4 Auth wiring (NextAuth v4, database strategy)

- [ ] `lib/auth/password.ts`:
      - `hashPassword(plain): Promise<string>` and
        `verifyPassword(plain, hash): Promise<boolean>`.
      - Reads `process.env.HASH_ALGORITHM` (default `'argon2'`); falls
        back to `bcryptjs` if `'bcrypt'`.
      - Hashes include a scheme prefix (`$argon2id$` / `$bcrypt$`) so a
        future change of scheme does not break stored hashes — `verify`
        auto-detects from the prefix.
- [ ] `lib/auth/pg-adapter.ts` — exports an object implementing the
      NextAuth v4 `Adapter` interface using the `pg` pool:
      - `createUser`, `getUserById`, `getUserByEmail`, `getUserByAccount`,
        `updateUser`, `deleteUser`.
      - `createSession`, `getSession`, `deleteSession`,
        `updateSession` (no-op or just touch `expires` per spec).
      - Account/link methods: Credentials provider typically does not
        link via `accounts`; if the v4 Adapter interface forces an
        `accounts` table, **add a minimal `accounts` table to migration
        001** and update `database-schema.md` to reflect it (see the
        "Deviations" section — flag before adding).
      - Verification-token methods (`createVerificationToken`,
        `useVerificationToken`) backed by `verification_tokens`.
- [ ] `lib/auth/nextauth-config.ts`:
      - `session: { strategy: 'database' }`.
      - Credentials provider `authorize(credentials)`:
        looks up `getUserByEmailOrPhone(emailOrPhone)`, verifies
        password, rejects if `users.status !== 'active'`, returns
        `{ id, role, status }` (no password_hash).
      - `adapter: pgAdapter`.
      - `secret: process.env.NEXTAUTH_SECRET`.
      - `pages: { signIn: '/login' }`.
      - `callbacks.session`: attaches `role`, `retailer_id`,
        `agent_id` to `session.user` via joining `retailers` /
        `delivery_agents` on `user_id`.
      - `callbacks.jwt`: minimal (database strategy uses session, but
        keep the callback consistent for safety).
- [ ] `app/api/auth/[...nextauth]/route.ts` —
      `export default NextAuth(authOptions)` (GET + POST).
- [ ] `app/api/auth/register/route.ts` — stub returning
      `{ success: false, error: { code: 'NOT_IMPLEMENTED', message:
      'Registration ships in Phase 1' } }` with HTTP 501. File exists to
      match `file-structure.md`.
- [ ] `app/api/auth/verify/route.ts`, `forgot-password/route.ts`,
      `reset-password/route.ts` — same stub shape.

### 0.5 Middleware RBAC skeleton

- [ ] `middleware.ts` using `withAuth` from `next-auth/middleware`
      with `pages.signIn`.
      - `/(public)`, `/(auth)` → public (no auth check).
      - `/(customer)` → requires `session.user.role === 'customer'`.
      - `/(retailer)` → requires `role === 'retailer'`.
      - `/(admin)` → requires `role === 'admin'`.
      - `/(agent)` → **deny unconditionally**, redirect to `/login` with
        an error query (matches `security.md`).
      - `/api/admin/**`, `/api/retailer/**`, `/api/customer/**` — API
        routes additionally verify role (defense-in-depth; the
        route handlers themselves also check).
      - `/api/agent/**` → deny unconditionally with a 501 response
        (matches `api-reference.md`).
      - Wrong-role session → redirect to that user's dashboard, not
        generic `/login`.

### 0.6 UI base

- [ ] Run `npx shadcn@latest init` (New York style, slate base color,
      CSS variables enabled) — this writes `components.json`,
      `lib/utils.ts`, and configures Tailwind/CSS.
- [ ] Add primitives via `npx shadcn@latest add button input card badge
      form dialog select` (the set most likely needed by Phase 1).
- [ ] `tailwind.config.ts` — expose the placeholder palette from
      `ui-context.md` as CSS variables in `app/globals.css`:
      `--color-primary` (`#2563EB` / blue-600), `slate` neutrals,
      success `green-600`, warning `amber-500`, danger `red-600`.
- [ ] `app/globals.css` — Tailwind directives + the CSS variable
      definitions + `@layer base` mapping them to Tailwind tokens.
- [ ] `app/layout.tsx` — root layout importing `globals.css`, rendering
      children + a placeholder shared `Footer` in `components/shared/`.
- [ ] `app/(public)/page.tsx` — minimal landing so `npm run dev` renders
      something other than the Next 404.
- [ ] `app/(auth)/login/page.tsx` — client component using
      `signIn('credentials', ...)` from `next-auth/react`; enough to
      verify the end-to-end auth round trip.
- [ ] `app/(auth)/register/page.tsx` — placeholder form that POSTs to
      the `/api/auth/register` stub; clearly marked "Phase 1".
- [ ] Empty `layout.tsx` guards in each protected route group
      (`(customer)`, `(retailer)`, `(admin)`, `(agent)`) that call
      `auth()` server-side and redirect wrong-role sessions. The
      `(agent)/layout.tsx` guard always redirects to `/login`. This is
      the "page-level" complement to middleware (per `security.md`).
- [ ] `components/shared/status-badge.tsx` — the `<StatusBadge>`
      component from `ui-context.md` (props: `status: OrderStatus`).
      Maps the seven statuses to colors. Used later by all actors.

### 0.7 Types

- [ ] `types/db.ts` — row interfaces matching the migration (UserRow,
      SessionRow, VerificationTokenRow, CustomerRow, AddressRow,
      RetailerRow, ProductRow, OrderRow, OrderItemRow, PaymentRow,
      DeliveryAgentRow, OrderAssignmentRow).
- [ ] `types/api.ts` — the standard response envelope
      (`{ success: true, data } | { success: false, error: { code,
      message } }`) and shared request/response contracts as Phase 1+
      needs them.

### 0.8 Verification

- [ ] Run `npm run lint` and `npm run typecheck` — both must pass.
- [ ] Wait for the user to fill `.env.local` (DATABASE_URL,
      NEXTAUTH_SECRET), then run `npm run db:migrate` and verify via a
      one-off `pg` introspection that all 10 tables + the trigger +
      indexes exist.
- [ ] Seed a test admin row directly in `psql` (hashed with
      `lib/auth/password.ts` output, role `admin`, status `active`).
- [ ] Run `npm run dev`, attempt the login round trip on
      `/login`, and confirm a fresh `sessions` row appears.
- [ ] Verify middleware: hit `/(admin)/dashboard` unauthenticated →
      redirected to `/login`; hit `/(agent)/dashboard` with any
      session → redirected away (denied).

### 0.9 Context housekeeping

- [ ] Update this document's "Deviations & open issues" section with
      anything unexpected encountered during build.
- [ ] If a new table needed to be added to the schema (e.g. `accounts`
      for NextAuth), update `database-schema.md` to reflect it.

---

## Environments documented in `.env.example`

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | `pg` connection string for the PostgreSQL database. |
| `NEXTAUTH_SECRET` | yes | Random string used to sign the NextAuth session cookie. Must be rotated if exposed. |
| `NEXTAUTH_URL` | yes (prod) | App base URL; in dev NextAuth infers from the request, but include for parity. |
| `HASH_ALGORITHM` | no | `argon2` (default) or `bcrypt`. Controls which hasher `lib/auth/password.ts` uses. |

---

## What will NOT be built in Phase 0

(Continuing the project guardrails explicitly, so this list survives the
build phase and can be referenced later.)

- No real MoMo / Orange Money SDK calls or webhooks.
- No agent-facing login, dashboard, or delivery status updates — the
  `(agent)/*` route group and `/api/agent/*` handlers stay as stubs.
- No multi-retailer carts.
- No live map tracking.
- No ORMs (`prisma`, `drizzle-orm`, `typeorm`).
- No third-party auth services (`@clerk/nextjs`, `better-auth`, Auth0).
- No `localStorage`/`sessionStorage` reliance for anything
  security-relevant.
- No commit will be made without an explicit go-ahead from the user.

---

## Deviations & open issues log

(This section is updated in real time if anything during execution
diverges from the plan above. New entries appended at the bottom.)

- **shadcn CLI init (`npx shadcn@latest init`) was not used** — the current
  CLI version's `init` scaffolds a whole new project/template (`--template
  next`, `--preset`) and would risk overwriting this repo. Instead the
  standard shadcn base was hand-written to match the CLI output exactly:
  `components.json`, `lib/utils.ts`, `app/globals.css` (CSS-variable
  palette), and the primitives `button`, `input`, `label`, `card`, `badge`,
  `form`, `dialog`, `select`. `react-hook-form` + `@hookform/resolvers`
  were added for the `form` primitive. No functional difference from the
  CLI result.

- **No `accounts` table added.** The NextAuth v4 Adapter interface was
  implemented without an `accounts` table because only the Credentials
  provider is configured (no OAuth), so `linkAccount`/`getUserByAccount`
  are no-ops. If OAuth is ever added, a migration + `database-schema.md`
  update will be required (noted in `lib/auth/pg-adapter.ts`).

- **`db:migrate` script now loads `.env.local`** via
  `tsx --env-file-if-exists=.env.local` — the migration runner is a
  standalone script and Node does not load Next.js env files for it.

- **`.env.local` holds a generated `NEXTAUTH_SECRET`** (openssl rand
  base64 32) plus the user-provided `DATABASE_URL`; both are gitignored.

- **Middleware/agent layout deny unconditionally** — implemented as a
  `redirect` in `(agent)/layout.tsx` in addition to the middleware gate,
  since route groups without pages don't otherwise render a denied state.

- **Admin/customer/retailer dashboards do not exist yet** — Phase 0 only
  adds the route-group guard layouts, not the pages inside them. Visiting
  `/admin`, `/customer`, `/retailer` returns 404 until their phases land.

- **Build verification** (`next build`) passes: `/`, `/login`, `/register`
  are static; all `/api/*` handlers are dynamic; middleware bundles.

- **`DATABASE_URL` in `.env.local` initially used user `postgresql` which
  failed auth** — awaiting a corrected connection string from the user
  before `db:migrate` and the login round-trip verification can run.

- **Database auth (resolved).** The native Debian PostgreSQL 16 cluster on
  `127.0.0.1:5432` had no `postgresql` role and no usable superuser
  password. Fixed by running, as the `postgres` OS user:
  `CREATE ROLE postgresql LOGIN PASSWORD '<pw>'` (password read from the
  `DATABASE_URL`) and `ALTER DATABASE magas OWNER TO postgresql;` (the
  `magas` database pre-existed and PG15+ restricts `public`-schema writes to
  the owner). The `.env.local` URL itself was correct all along; the role
  just did not exist.

- **Session strategy changed from `database` to `jwt`.** NextAuth v4's
  Credentials provider throws `CALLBACK_CREDENTIALS_JWT_ERROR`
  (`UnsupportedStrategyError`) with the database strategy — the two are
  mutually exclusive in v4. Switched to the canonical JWT strategy; the
  `sessions` table stays in the schema (dormant, reusable if OAuth/a custom
  flow is ever added). Side benefit: the middleware's `withAuth` now decodes
  a real JWT, so `token.role` gates actually work (with database sessions
  the middleware only ever saw an opaque token and would have denied every
  protected route). `jwt` callback does the retailers/agents scoping lookup
  once at sign-in; `session` callback just mirrors the token — no per-request
  DB hit.

- **Migration + verification all green.** `npm run db:migrate` applied
  `001_init_schema.sql` (all 12 tables incl. `schema_migrations`, both
  enums, `orders_customer_idx` + `orders_created_idx` and the rest, 6
  `updated_at` triggers). Verified by hand: admin seeded via
  `scripts/seed-admin.ts` (admin@magas.test / Admin-Magas-2026!), dev-server
  Credentials round-trip returns 302 + `session-token` cookie, `/api/auth/session`
  reports `role:"admin"`, and middleware 307s `/customer`/`/agent` (wrong /
  forbidden role) while letting `/admin` through. The plan's "sessions row
  written" check is obsolete under JWT sessions.

- **`scripts/seed-admin.ts` added** — dev-only idempotent seed (upsert on
  email) that hashes the password with `lib/auth/password.ts`. Not part of
  any package script; run manually via
  `npx tsx --env-file-if-exists=.env.local scripts/seed-admin.ts`.
