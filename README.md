# MAGAS

MAGAS is a gas cylinder ordering and delivery platform for Cameroonian
customers, connecting them with local gas retailers. Customers browse
retailers and products, place orders, choose a payment method, and track
delivery progress. Retailers manage their own listings and orders. Delivery
agents, invited by admin, see their assigned orders and update delivery
status themselves. A super admin oversees the whole marketplace.

## Actors

- **Public** — marketing site, retailer/product browsing (no login)
- **Customer** — registers, orders, tracks delivery
- **Retailer** — manages products/inventory, accepts/rejects orders
- **Delivery Agent** — invite-only login (admin links an existing contact
  record to a login); views and updates their own assigned deliveries
- **Super Admin** — manages users, retailers, order assignment, delivery
  agent records and login invites, and payment reconciliation

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router) + TypeScript
- [NextAuth](https://next-auth.js.org/) (Credentials Provider, custom
  database-strategy adapter over raw `pg` — no ORM)
- PostgreSQL via raw `pg` (no Prisma/Drizzle)
- Tailwind CSS + shadcn/ui
- Zod for validation
- Google Maps JavaScript API + Places API (`@react-google-maps/api`) for
  live delivery tracking; no data-fetching library — the one live/polling
  surface is a plain `setInterval` + Server Action

## MVP notes

- Payments are **simulated** in this phase — Cash on Delivery is handled
  manually by admin reconciliation; MTN Mobile Money and Orange Money are
  simulated via a mock processor, not integrated with live provider APIs.
  See `context/workflows.md` for the swap-in plan.
- The delivery agent portal is invite-only: there's no public
  self-registration for the `agent` role. Admin invites an existing
  `delivery_agents` contact from `/admin/agents`; the agent sets their own
  password via a one-time link. See `context/security.md`.
- Live delivery tracking requires a Google Cloud project with billing
  enabled and the Maps JavaScript API + Places API turned on — see
  `.env.example` for the two API keys it needs. Without a key configured,
  the map card degrades to an "unavailable" notice rather than breaking
  the page.

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
| [`security.md`](./context/security.md) | Auth, RBAC, session strategy, agent-invite rules |
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
