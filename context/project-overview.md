# Project Overview — MAGAS

## What this is

MAGAS is a web application that lets customers order household gas cylinders for
delivery from local gas retailers. It connects three sides of a marketplace —
customers, gas retailers, and delivery agents — under the oversight of a super
admin, plus a public marketing site for discovery and SEO.

## Actors

| Actor | Status in MVP | Summary |
|---|---|---|
| Public / Guest | Live | Unauthenticated visitor — marketing site, read-only retailer/product browsing |
| Customer | Live | Registers, browses retailers/products, places orders, tracks status, pays |
| Retailer | Live | Manages own products/inventory, accepts/rejects assigned orders |
| Delivery Agent | Live | Invite-only login (admin-linked, no self-registration); sees own assigned orders and updates delivery status |
| Super Admin | Live | Manages all accounts, assigns orders to retailers, manages delivery agent records and invites their logins, reconciles payments |

## Problem being solved

Ordering gas cylinders in most Cameroonian cities today happens by phone call
or in person, with no price transparency across retailers, no order tracking,
and no formal record of delivery. MAGAS digitizes this: customers compare
retailers and prices, place trackable orders, and pay via the methods they
already use daily (Cash on Delivery, MTN Mobile Money, Orange Money).

## MVP scope

**In scope:**
- Public marketing site (landing, how-it-works, FAQ, retailer/product browse)
- Customer registration/login, browsing, ordering, order tracking, profile
- Retailer dashboard: product/inventory CRUD, order accept/reject
- Super admin dashboard: user management, retailer approval, order assignment,
  delivery agent record management and login invites, payment reconciliation
- Delivery agent dashboard: login (via admin invite), assigned-order list,
  self-service delivery status updates
- Simulated payments (COD is real/manual; MoMo and Orange Money are simulated,
  not integrated with live provider APIs)
- Order status tracking through a shared state machine

**Explicitly out of scope for MVP:**
- Real MTN Mobile Money / Orange Money API integration (simulated only —
  see `workflows.md` for the swap-in contract)
- Live map-based delivery tracking
- Multi-retailer carts (one retailer per order)
- Native mobile apps (web only, responsive)

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Auth:** NextAuth (Credentials Provider, custom `authorize()` against raw `pg`)
- **Database:** PostgreSQL, raw `pg` driver — **no ORM** (no Prisma, no Drizzle)
- **Styling/UI:** Tailwind CSS + shadcn/ui
- **Validation:** Zod
- **Data fetching (client-side):** TanStack Query, used sparingly (e.g. live
  order tracking); most reads are Server Components
- **Payments:** Simulated in MVP; real MoMo/Orange Money deferred post-MVP

## Key stakeholders

- **Client:** commissioning the build, owns product/business decisions
- **Engineering:** DigiMark Consulting (Alchemy / Kanjo Elkamira Ndi)
- **Build tooling:** opencode (primary coding agent for this repo)

## How to use this context directory

Each file in `/context` covers one concern. When working on a task, opencode
should read:
- `project-overview.md` (this file) for orientation
- `architecture.md` for how the system fits together
- `database-schema.md` before touching any query or migration
- `api-reference.md` before adding/changing a route
- `code-standards.md` before writing any code
- `security.md` before touching auth, sessions, or role checks
- `ui-context.md` before building any page or component
- `workflows.md` before implementing a business process (ordering, payment, status transitions)
- `development-roadmap.md` to understand what phase we're in and what's next
- `file-structure.md` to know where new files belong
