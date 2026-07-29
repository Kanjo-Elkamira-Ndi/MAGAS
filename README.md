# MAGAS

MAGAS is a gas cylinder ordering and delivery platform for Cameroonian
customers, connecting them with local gas retailers. Customers browse
retailers and products, place orders, choose a payment method, and track
delivery progress. Retailers manage their own listings and orders. A super
admin oversees the whole marketplace. A delivery agent portal is planned
but not yet part of the MVP.

## Actors

- **Public** — marketing site, retailer/product browsing (no login)
- **Customer** — registers, orders, tracks delivery
- **Retailer** — manages products/inventory, accepts/rejects orders
- **Delivery Agent** — *scaffolded only, not yet live* (schema and stub
  routes exist for a future release)
- **Super Admin** — manages users, retailers, order assignment, delivery
  agent records, and payment reconciliation

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router) + TypeScript
- [NextAuth](https://next-auth.js.org/) (Credentials Provider, custom
  database-strategy adapter over raw `pg` — no ORM)
- PostgreSQL via raw `pg` (no Prisma/Drizzle)
- Tailwind CSS + shadcn/ui
- Zod for validation
- TanStack Query (used selectively, e.g. live order tracking)

## MVP notes

- Payments are **simulated** in this phase — Cash on Delivery is handled
  manually by admin reconciliation; MTN Mobile Money and Orange Money are
  simulated via a mock processor, not integrated with live provider APIs.
  See `context/workflows.md` for the swap-in plan.
- The delivery agent portal is **not implemented**. Database tables and
  stub API routes exist so it can be added later without a schema
  migration, but there is no agent login or dashboard yet. See
  `context/architecture.md` and `context/security.md`.

## Getting started

```bash
git clone <repo-url>
cd magas
npm install
cp .env.example .env.local   # fill in DB connection string, NEXTAUTH_SECRET, etc.
npm run db:migrate           # applies SQL migrations in lib/db/migrations
npm run dev
```

## Project documentation

Full context for contributors and AI coding agents lives in [`/context`](./context):

| File | Covers |
|---|---|
| [`project-overview.md`](./context/project-overview.md) | Actors, scope, MVP boundaries |
| [`architecture.md`](./context/architecture.md) | System structure, rendering strategy, auth architecture |
| [`database-schema.md`](./context/database-schema.md) | Tables, relationships, migration rules |
| [`api-reference.md`](./context/api-reference.md) | All API routes by actor |
| [`file-structure.md`](./context/file-structure.md) | Repo layout and where new files belong |
| [`code-standards.md`](./context/code-standards.md) | Conventions, DB access rules, error handling |
| [`security.md`](./context/security.md) | Auth, RBAC, session strategy, dormant-agent rules |
| [`ui-context.md`](./context/ui-context.md) | Design system, components, status badges |
| [`workflows.md`](./context/workflows.md) | Ordering, payment, and status-transition flows |
| [`development-roadmap.md`](./context/development-roadmap.md) | Build phases, what's deferred |

## Contributing

This repo is built primarily with [opencode](https://github.com/opencode)
as the coding agent. Any contributor (human or agent) should read the
relevant `/context` files before starting a task — see
`project-overview.md`'s "How to use this context directory" section.

## License

Proprietary — all rights reserved. Not licensed for reuse without
permission from the project owner.
