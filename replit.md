# Gotecx POS

A Liberia-focused, browser-based point-of-sale and business management frontend for store owners, managers, and cashiers. Imported from `teamitechnetwork/Gotecx-POS`; this Replit version is frontend-only.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/gotecx-pos` — Gotecx POS web application
- `artifacts/api-server` — shared API starter; not used by the current frontend-only POS
- `lib/api-spec` and `lib/db` — workspace starters; no POS database schema is configured

## Architecture decisions

- POS demo data and account flows remain in the browser until the user requests backend work.
- No database is to be created or configured as part of the current frontend scope.
- Keep Liberia as the primary market, with LRD as the default and USD supported.
- Preserve the Gotecx green (#2ea827) and use Inter as the app font.

## Product

The app supports store operations including sales, inventory, purchasing, customers, staff, receipts, cash shifts, analytics, and support. Browser-local demo authentication and staff permissions are not production-secure or shared across devices.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Manager/cashier PINs and role restrictions implemented in the frontend are demo behavior only; enforce them on a server before production use.
- Do not provision or migrate a database unless the user explicitly asks to begin that later phase.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
