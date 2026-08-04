# Code Standards — MAGAS

## Language & tooling

- TypeScript everywhere, `strict: true` in `tsconfig.json` — no `any` unless
  justified with a comment explaining why
- ESLint + Prettier enforced; do not hand-format against Prettier's output
- Path aliases: `@/lib/*`, `@/components/*`, `@/types/*` (configure in
  `tsconfig.json`, keep imports absolute, not `../../../`)

## Database access

- **No ORM.** All queries are raw SQL via the `pg` driver, always
  parameterized (`$1`, `$2`, ...) — never string-concatenate user input into
  a query
- One `pg.Pool` singleton in `lib/db/pool.ts`, imported everywhere else —
  never instantiate a new `Pool` per request
- Query functions live in `lib/db/queries/<entity>.ts`, are plain async
  functions, and return typed rows matching `types/db.ts`
- Multi-step writes that must be atomic (e.g. create order + order_items)
  use an explicit transaction: `BEGIN` / `COMMIT` / `ROLLBACK` via a client
  checked out from the pool — never assume implicit atomicity across
  separate `pool.query()` calls

## Validation

- Every route handler and Server Action validates its input with a Zod
  schema before doing anything else
- Validation errors return a consistent `{ success: false, error: { code, message } }` shape — never leak raw Postgres error text to the client

## Auth & authorization

- Every protected route/page checks the session server-side — never trust a
  client-supplied role, ID, or ownership claim
- Retailer- and customer-scoped queries always filter by the session's
  `retailer_id`/`customer_id` in the `WHERE` clause — never fetch by
  client-supplied ID alone and then "check" ownership after the fact in
  application code, since that pattern is easy to get wrong; scope it in SQL

## Naming conventions

- Files: `kebab-case.ts` / `kebab-case.tsx`
- React components: `PascalCase`
- Functions/variables: `camelCase`
- DB tables/columns: `snake_case` (see `database-schema.md`)
- Zod schemas: `camelCase` ending in `Schema` (e.g. `placeOrderSchema`)
- API response codes: `SCREAMING_SNAKE_CASE` strings (e.g.
  `ORDER_NOT_FOUND`, `RETAILER_NOT_APPROVED`)

## Components

- Prefer Server Components by default; add `"use client"` only when a
  component genuinely needs interactivity, browser APIs, or hooks
- Keep client islands small — wrap only the interactive part, not the whole
  page
- Use shadcn/ui primitives from `components/ui/` rather than hand-rolling
  buttons/inputs/dialogs
- No inline styles; Tailwind utility classes only, following `ui-context.md`

## Error handling

- Route handlers wrap DB calls in try/catch, log server-side, and return the
  standard error shape — never let a raw stack trace reach the client
- Distinguish expected business errors (e.g. "order already cancelled") from
  unexpected ones (DB connection failure) — expected errors get specific
  error codes; unexpected ones get a generic `INTERNAL_ERROR` and get logged
  with more detail server-side

## Commits & PRs

- Conventional commits style: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- One logical change per commit; migrations committed separately from the
  feature code that depends on them
- Any change touching `(agent)/` or `api/agent/` must call this out
  explicitly in the PR description, since that surface is intentionally
  dormant

## What to avoid

- No ORM packages (`prisma`, `drizzle-orm`, `typeorm`, etc.) in
  `package.json` — raw `pg` only
- No third-party auth packages beyond `next-auth` itself — no Clerk, no
  Better Auth, no Auth0
- No real payment provider SDKs (`momo-api`, Orange Money SDKs) added to
  `package.json` during MVP — simulated payments only, per `workflows.md`
- No `localStorage`/`sessionStorage` reliance for anything security-relevant
  — sessions are server-side
