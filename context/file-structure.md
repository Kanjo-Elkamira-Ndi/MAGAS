# File Structure — MAGAS

```
magas/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                     # landing page
│   │   ├── how-it-works/page.tsx
│   │   ├── retailers/page.tsx           # public browse, read-only
│   │   ├── retailers/[id]/page.tsx
│   │   ├── faq/page.tsx
│   │   └── terms/page.tsx
│   │
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── (customer)/
│   │   ├── layout.tsx                    # session guard: role === 'customer'
│   │   ├── dashboard/page.tsx
│   │   ├── retailers/page.tsx
│   │   ├── retailers/[id]/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── orders/[id]/page.tsx
│   │   └── profile/page.tsx
│   │
│   ├── (retailer)/
│   │   ├── layout.tsx                    # session guard: role === 'retailer'
│   │   ├── dashboard/page.tsx
│   │   ├── products/page.tsx
│   │   ├── products/[id]/page.tsx
│   │   ├── orders/page.tsx
│   │   └── earnings/page.tsx
│   │
│   ├── (agent)/                          # SCAFFOLDED — not routed in nav
│   │   ├── layout.tsx                    # guard always denies for now
│   │   └── dashboard/page.tsx            # "coming soon" placeholder
│   │
│   ├── (admin)/
│   │   ├── layout.tsx                    # session guard: role === 'admin'
│   │   ├── dashboard/page.tsx
│   │   ├── users/page.tsx
│   │   ├── retailers/page.tsx
│   │   ├── products/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── agents/page.tsx               # manage delivery_agents records
│   │   └── payments/page.tsx
│   │
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── auth/register/route.ts
│       ├── auth/verify/route.ts
│       ├── auth/forgot-password/route.ts
│       ├── auth/reset-password/route.ts
│       ├── public/retailers/route.ts
│       ├── public/retailers/[id]/products/route.ts
│       ├── customer/**/route.ts
│       ├── retailer/**/route.ts
│       ├── agent/**/route.ts             # stub handlers only
│       ├── admin/**/route.ts
│       └── payments/simulate/route.ts
│
├── lib/
│   ├── db/
│   │   ├── pool.ts                       # pg.Pool singleton
│   │   ├── migrations/                   # numbered .sql files
│   │   └── queries/                      # one file per entity, plain functions
│   │       ├── users.ts
│   │       ├── retailers.ts
│   │       ├── products.ts
│   │       ├── orders.ts
│   │       ├── payments.ts
│   │       └── delivery-agents.ts
│   ├── auth/
│   │   ├── nextauth-config.ts            # authOptions, Credentials provider
│   │   ├── pg-adapter.ts                 # custom NextAuth adapter over pg
│   │   └── password.ts                   # hash/verify helpers
│   ├── payments/
│   │   ├── types.ts                      # shared PaymentResult contract
│   │   ├── simulate.ts                   # MVP implementation
│   │   ├── momo.ts                       # stub, post-MVP
│   │   └── orange.ts                     # stub, post-MVP
│   ├── orders/
│   │   └── status.ts                     # single source of truth: state machine
│   └── validation/
│       ├── customer.ts
│       ├── retailer.ts
│       ├── admin.ts
│       └── shared.ts
│
├── components/
│   ├── ui/                               # shadcn/ui primitives
│   ├── customer/
│   ├── retailer/
│   ├── admin/
│   └── shared/                           # cross-actor components (nav, footer, status badge)
│
├── types/
│   ├── db.ts                             # row types matching schema
│   └── api.ts                            # request/response contracts
│
├── middleware.ts
├── context/                              # this documentation set
├── .env.example
├── package.json
└── README.md
```

## Placement rules for opencode

- A new page always goes inside the actor's existing route group — never
  create a new top-level route group without updating `architecture.md`
- A new DB query function goes in `lib/db/queries/<entity>.ts` — do not
  write inline `pool.query(...)` calls inside route handlers or components
- A new Zod schema goes in `lib/validation/<actor>.ts`, named
  `<action><Entity>Schema` (e.g. `createOrderSchema`)
- Shared UI (used by 2+ actors) goes in `components/shared/`; actor-specific
  UI stays under `components/<actor>/`
- Anything touching `(agent)/` or `api/agent/` must remain a stub — flag
  before expanding
