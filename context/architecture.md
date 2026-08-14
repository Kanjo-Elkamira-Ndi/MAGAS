# Architecture — MAGAS

## Overview

A single Next.js 15 app, route-grouped by actor, backed by one shared
PostgreSQL database. No microservices, no separate admin deployment for MVP —
route-group boundaries are drawn so a future physical split (e.g. isolating
the admin panel) is a low-cost extraction, not a rewrite.

## Why one app instead of several

Public, customer, retailer, agent, and admin all share the same
core domain — users, products, orders, payments. Splitting into multiple
apps now would mean duplicating types, DB access, and business logic across
four codebases for no MVP benefit. Route groups plus middleware-based access
control give actor isolation without that duplication cost.

## High-level structure

```
magas/
├── app/
│   ├── (public)/                 # marketing site, no auth required
│   ├── (customer)/               # customer dashboard, protected
│   ├── (retailer)/               # retailer dashboard, protected
│   ├── (agent)/                  # agent dashboard, protected, invite-only signup
│   ├── (admin)/                  # super admin dashboard, protected
│   └── api/
│       ├── auth/[...nextauth]/   # NextAuth route handler
│       ├── customer/
│       ├── retailer/
│       ├── agent/                # unused on purpose — portal ships as Server Actions
│       ├── admin/
│       └── payments/simulate/    # simulated payment processor endpoint
├── lib/
│   ├── db/                       # pg pool, query helpers, migrations
│   ├── auth/                     # NextAuth config, callbacks, adapter glue
│   ├── payments/                 # simulated payment logic + provider stubs
│   ├── orders/                   # shared order status state machine
│   └── validation/                # zod schemas per actor
├── middleware.ts                 # route protection by role (NextAuth-aware)
└── types/
```

## Rendering strategy

- **Public marketing pages:** static / ISR (landing, how-it-works, FAQ, terms)
- **Read-heavy authenticated views** (browse retailers/products, order
  history): React Server Components, querying `pg` directly server-side
- **Mutations** (place order, update profile, accept/reject order): Server
  Actions or `app/api/**/route.ts` handlers, not client-side fetch-and-mutate
  unless a form needs progressive client interactivity
- **Live/real-time surfaces** (active order tracking): a small client
  component using TanStack Query (polling) or SSE — kept as the *exception*,
  not the default pattern

## Auth architecture (NextAuth)

See `security.md` for full detail. Summary:
- NextAuth Credentials Provider; `authorize()` runs a raw `pg` query against
  `users`, verifies password with argon2/bcrypt
- Session strategy: **database strategy** via a small custom NextAuth adapter
  implemented over raw `pg` (not an ORM adapter) — chosen over JWT so the
  super admin can force-revoke a session (ban a retailer, suspend a customer)
  instantly
- `role` (and `retailer_id`/`agent_id` where applicable) attached to the
  session via the `session`/`jwt` callbacks
- `middleware.ts` maps route-group prefixes to allowed roles

## Actor-by-actor architecture notes

**Public** — `(public)` route group, no session check anywhere. Reads from
the same `products`/`retailers` tables as authenticated views, just without
cart/order affordances.

**Customer** — `(customer)` route group. Server Components for
browse/order-history; Server Actions for placing orders and profile updates;
one client island for live order tracking.

**Retailer** — `(retailer)` route group. Every query scoped by the
authenticated session's `retailer_id`. This is the primary place to enforce
strict row-level authorization — a retailer must never be able to read or
mutate another retailer's products, inventory, or orders.

**Delivery Agent** — `(agent)` route group, gated to `role === 'agent'`.
Accounts are invite-only: there's no public agent registration, only an
admin-triggered invite that links a `delivery_agents` contact record to a
new `users` row (`lib/actions/dashboard.ts`, `lib/db/queries/delivery-agents.ts`).
Every query is scoped to the signed-in agent's own `delivery_agents.id`
(`session.user.agentId`) — an agent must never see or act on another
agent's assignments. `/api/agent/*` stays unconditionally denied in
`middleware.ts` and its route handler stays a 501 stub — the portal ships
entirely as Server Actions (`lib/actions/agent.ts`), like every other role.

**Super Admin** — `(admin)` route group, the heaviest surface: user
management across all roles, retailer approval, product/inventory oversight,
order-to-retailer assignment, order-to-agent assignment (against real
`delivery_agents` records), delivery agent login invites, and payment
reconciliation.

## Order status state machine

Lives in one place — `lib/orders/status.ts` — as the single source of truth
for valid transitions. Referenced by customer views, retailer actions, and
admin overrides, so no actor re-implements transition logic.

```
Placed → Confirmed (by retailer) → Assigned (to agent, admin-only)
       → Out for Delivery → Delivered (agent self-service, or admin override)
       (→ Cancelled / Failed at applicable branch points)
```

Payment status (`pending | success | failed`) is a **separate concern** from
order status — see `database-schema.md` and `workflows.md`. This decoupling
is deliberate: swapping simulated payments for real MoMo/Orange Money later
should not require touching the order state machine.

## Payments architecture (simulated for MVP)

- `/api/payments/simulate` mimics a provider callback: accepts
  `{ orderId, method, amount }`, introduces an artificial delay, writes a
  `payments` row, and updates `orders.status`
- Cash on Delivery is unaffected — a `payments` row is created at order
  placement with `status: 'pending'`, reconciled manually by admin on delivery
- `lib/payments/` exposes a stable `PaymentResult` contract
  (`{ status, providerRef }`) shared by `simulate.ts` and the not-yet-built
  `momo.ts` / `orange.ts`, so post-MVP integration only requires implementing
  those two files — no changes to order flow, UI, or admin reconciliation

## What NOT to build yet

- Do not implement real MoMo/Orange Money SDK calls or webhooks
- Do not implement multi-retailer carts
- Do not implement live map tracking

If a task seems to require any of the above, stop and flag it rather than
improvising a workaround.
