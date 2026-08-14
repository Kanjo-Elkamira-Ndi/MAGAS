# Database Schema — MAGAS

PostgreSQL, raw SQL migrations, accessed via `pg` (no ORM). All tables use
`uuid` primary keys unless noted. Timestamps are `timestamptz`.

## Conventions

- Table names: `snake_case`, plural (`orders`, `order_items`)
- Every table has `created_at timestamptz default now()`; mutable tables also
  have `updated_at timestamptz default now()` maintained by an update trigger
  or explicit `SET` on write
- Foreign keys named `<referenced_table_singular>_id`
- Enums implemented as Postgres `CHECK` constraints or native `enum` types —
  pick one convention per table and be consistent (native enums preferred for
  fixed small sets like `role`, `order_status`)
- Money stored as `integer` (smallest currency unit, XAF has no minor unit —
  store as whole XAF) — never `float`

## Core tables

### `users`
```sql
id             uuid primary key default gen_random_uuid()
role           user_role not null   -- enum: 'customer' | 'retailer' | 'agent' | 'admin'
email          text unique
phone          text unique
password_hash  text not null
status         text not null default 'active'  -- 'active' | 'suspended' | 'banned' | 'pending'
  -- 'pending' = an agent invited to log in who hasn't set a password yet
created_at     timestamptz default now()
updated_at     timestamptz default now()
```
> `role = 'agent'` exists in the enum for schema completeness but no
> registration flow currently creates such a user — see `security.md`.

### `customers`
```sql
user_id        uuid primary key references users(id) on delete cascade
full_name      text not null
default_address_id uuid references addresses(id)
```

### `addresses`
```sql
id          uuid primary key default gen_random_uuid()
customer_id uuid references customers(user_id) on delete cascade
label       text          -- 'Home', 'Office', etc.
line1       text not null
city        text not null
notes       text
latitude    double precision  -- captured via Google Places Autocomplete, nullable
longitude   double precision
created_at  timestamptz default now()
```

### `retailers`
```sql
id            uuid primary key default gen_random_uuid()
user_id       uuid unique references users(id) on delete cascade
business_name text not null
location      text not null
latitude      double precision  -- captured via Google Places Autocomplete, nullable
longitude     double precision
status        text not null default 'pending'  -- 'pending' | 'approved' | 'suspended'
approved_by   uuid references users(id)
created_at    timestamptz default now()
```

### `products`
```sql
id           uuid primary key default gen_random_uuid()
retailer_id  uuid references retailers(id) on delete cascade
brand        text not null
cylinder_size text not null   -- e.g. '6kg', '12.5kg'
price        integer not null   -- XAF, whole units
availability boolean not null default true
created_at   timestamptz default now()
updated_at   timestamptz default now()
```

### `orders`
```sql
id               uuid primary key default gen_random_uuid()
customer_id      uuid references customers(user_id)
retailer_id      uuid references retailers(id)
status           order_status not null default 'placed'
  -- enum: 'placed' | 'confirmed' | 'assigned' | 'out_for_delivery'
  --       | 'delivered' | 'cancelled' | 'failed'
payment_method   text not null   -- 'cod' | 'momo' | 'orange'
delivery_address text not null  -- denormalized snapshot at order time
delivery_latitude  double precision  -- destination pin for live tracking, nullable
delivery_longitude double precision
total_amount     integer not null
created_at       timestamptz default now()
updated_at       timestamptz default now()
```

### `order_items`
```sql
id             uuid primary key default gen_random_uuid()
order_id       uuid references orders(id) on delete cascade
product_id     uuid references products(id)
quantity       integer not null check (quantity > 0)
price_at_order integer not null   -- snapshot, product price may change later
```

### `payments`
```sql
id           uuid primary key default gen_random_uuid()
order_id     uuid references orders(id) on delete cascade
method       text not null           -- 'cod' | 'momo' | 'orange'
status       text not null default 'pending'  -- 'pending' | 'success' | 'failed'
provider_ref text                     -- simulated/fake ref in MVP
amount       integer not null
created_at   timestamptz default now()
updated_at   timestamptz default now()
```

## Delivery agent tables

### `delivery_agents`
```sql
id                  uuid primary key default gen_random_uuid()
user_id             uuid unique references users(id)  -- NULLABLE on purpose
name                text not null
phone               text not null
status              text not null default 'active'
latitude            double precision  -- current live position, nullable
longitude           double precision
location_updated_at timestamptz       -- last time the agent reported a position
created_at          timestamptz default now()
```
> `user_id` is nullable deliberately: admin can create an agent as a plain
> contact record without that agent having login access, then invite them
> to a real login later (`inviteAgentAction` in `lib/actions/dashboard.ts`)
> without a migration. `latitude`/`longitude` hold only the agent's current
> position (overwritten on each report), not a location history.

### `order_assignments`
```sql
id          uuid primary key default gen_random_uuid()
order_id    uuid references orders(id) on delete cascade
agent_id    uuid references delivery_agents(id)
assigned_at timestamptz default now()
status      text not null default 'assigned'  -- 'assigned' | 'delivered' | 'failed'
```
> Populated by admin assigning an order to an agent record. The assigned
> agent then sees and acts on the order themselves via the agent portal
> (`app/agent/*`, `lib/actions/agent.ts`).

## Auth-support tables

### `sessions` (only if NextAuth `strategy: "database"` is used)
```sql
id            uuid primary key default gen_random_uuid()
session_token text unique not null
user_id       uuid references users(id) on delete cascade
expires       timestamptz not null
```

### `verification_tokens`
```sql
id         uuid primary key default gen_random_uuid()
user_id    uuid references users(id) on delete cascade
token      text unique not null
purpose    text not null   -- 'email_verify' | 'phone_verify' | 'password_reset' | 'agent_invite'
expires_at timestamptz not null
used_at    timestamptz
created_at timestamptz default now()
```

## Relationships summary

```
users 1---1 customers / retailers (via user_id)
customers 1---N addresses
retailers 1---N products
customers 1---N orders
retailers 1---N orders
orders 1---N order_items
orders 1---N payments
orders 1---0/1 order_assignments
delivery_agents 1---N order_assignments
```

## Migration rules for opencode

- Every schema change ships as a numbered SQL migration file under
  `lib/db/migrations/`, never as an ad hoc `ALTER TABLE` run manually
- Never drop or rename a column in the same migration that adds its
  replacement — additive migrations first, backfill, then a follow-up
  migration to remove the old column
- Do not add ORM-style model files (no Prisma schema, no Drizzle schema) —
  query builders live in `lib/db/queries/<entity>.ts` as plain functions
  wrapping parameterized `pg` queries
