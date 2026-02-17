# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MC3 Conveyor Console — a Next.js 15 (App Router) web application and TypeScript calculation engine for conveyor application design. Supports multiple conveyor types (belt, magnetic) via a product registry architecture. Built on React 19, Supabase (auth + Postgres), and Tailwind CSS.

## Common Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (or `npm run dev:stable` for macOS file watcher issues) |
| Build | `npm run build` |
| Test | `npm test` |
| Single test file | `npx jest path/to/file.test.ts` |
| Test watch mode | `npm run test:watch` |
| Test with coverage | `npm run test:coverage` (80% threshold enforced) |
| Lint | `npm run lint` |
| Type check | `npm run type-check` |
| Format | `npm run format` |

Tests run via Jest with ts-jest. Test roots are `src/` only — test files use `*.test.ts` pattern. There are no tests in `app/`.

## Architecture

### Multi-Product System

The codebase supports multiple conveyor product types through a registry pattern:

- **Product modules** (`src/products/{product}_v1/index.ts`) implement the `ProductModule` interface from `src/products/types.ts` — providing `calculate()`, `validate()`, `buildOutputsV2()`, schemas, and UI config.
- **Product registry** (`src/products/registry.ts`) — `registerProduct()` / `getProduct()` for dispatch.
- **Calculation engine** (`src/lib/calculator/engine.ts`) — orchestrates: normalize inputs → merge parameters → validate → dispatch to product → return results with metadata. Pure function, no side effects.
- **Fail-closed card gating** — each UI card declares `requiresOutputKeys`. `canRenderCard()` blocks cards whose required keys don't exist in the product's `outputsSchema`, preventing cross-product bleed.

Current products: `belt_conveyor_v1`, `magnetic_conveyor_v1`.

### Model Layer (`src/models/`)

Each model has: `schema.ts` (types), `formulas.ts` (pure calculations), `rules.ts` or `validation.ts` (error/warning/info rules), and test fixtures. Calculations must maintain **Excel parity** — formulas match the reference Excel workbooks exactly.

### Validation Three-Tier Severity

- **Errors**: block operation (`success: false`), but outputs are still returned for partial results
- **Warnings**: allowed, flagged to user
- **Info**: informational only

### App Layer (`app/`)

- `app/api/` — Next.js route handlers (configurations, applications, quotes, catalogs, auth, admin)
- `app/console/` — protected routes (belt, magnetic calculators; quotes; admin panel)
- `app/components/` — React components, flat structure with subdirectories for `magnetic/`, `outputs/`, `outputs_v2/`, `configurator/`
- `app/hooks/` — app-level hooks (`useSaveState`, `useBeltCatalog`, `useCurrentUserRole`)

### Auth (Fail-Closed)

`middleware.ts` protects all routes by default. Only `/login`, `/signup`, `/reset-password`, `/forgot-password`, and `/api/auth/*` are public. Dev bypass: set `AUTH_BYPASS_DEV=true` with `NODE_ENV=development`.

### Data Layer

Supabase for auth and Postgres. Clients in `src/lib/supabase/` (browser, server, middleware) and `src/lib/database/`. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Key Conventions

- **TypeScript strict mode** with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`
- **Tailwind** with MC3 brand colors: `mc3-navy`, `mc3-blue`, `mc3-gold`, `mc3-ink`, `mc3-mist`, `mc3-line`, plus `primary-50` through `primary-900`
- **Pure functions** for all calculation code — no side effects, no database calls in formulas
- **Units in variable names** (e.g., `belt_width_in`, `belt_speed_fpm`, `part_weight_lbs`)
- Adding a new product type: follow `docs/ADDING_NEW_PRODUCTS.md` — create product module, register it, create output components, wire to calculator app

## Logging

- Use the structured logger (`src/lib/logger`) for all logging — never `console.log`/`warn`/`error`
- Log start/complete/fail ONLY on orchestrator-level operations:
  - Calculation orchestrators (belt, magnetic, future products)
  - Drive selection / gearmotor selection
  - Supabase mutations (insert, update, delete — not reads)
  - API route entry points
- Do NOT add start/complete/fail logging to: utility functions, helpers, React hooks, map/filter operations, or simple Supabase select queries
- Use dot-notation message names: `'calculation.started'`, `'supabase.mutation.completed'`, `'drive.selection.failed'`
- Always include relevant entity IDs (`jobId`, `configId`, `productFamily`)
- Every `.catch()` must log the error with full context before handling
- Never write `.catch(() => {})`, `.catch(() => null)`, or `.catch(() => ({}))`
- Log duration (`Date.now() - startTime`) on every completed and failed entry
- Do not log full document content, passwords, tokens, or Supabase service keys
- Always include an `errorCode` from `src/lib/logger/error-codes.ts` on error and warn entries
- Never invent ad-hoc error strings — use or add a constant in `error-codes.ts`

## Error Handling

- Never write `.catch(() => {})`, `.catch(() => null)`, or `.catch(() => ({}))`
- Every catch block must: 1) log the error with context, 2) either re-throw or return an explicit error result
- Never return an empty object or default that could be mistaken for success
- In calculation engines and drive selection: always re-throw — wrong data is worse than no data
- If using a fallback, log a warning explaining what failed and why the fallback is safe
- Prefer `try/catch` over `.catch()` for readability
- Use `OperationResult<T>` from `src/lib/logger/operation-result.ts` as the return type for significant operations
- Use `operationSuccess()` and `operationFailure()` helpers — never construct the shape manually

## Input Validation

- Every API route validates request body with a Zod schema before any processing
- Zod schemas live in `src/lib/schemas/` — one file per domain entity
- TypeScript types derived from schemas (`z.infer<>`) — don't create duplicate interfaces
- Use `.safeParse()` at API boundaries, `.parse()` at startup/config validation
- When validation fails, log specific errors with context, return 400
- Calculation engine configs must be validated before any math runs

## Testing Requirements

- Every new module gets tests before it's considered complete
- Boundary tests (bad input, missing fields, wrong types) outnumber happy-path tests
- Calculation tests must validate against real job data (PTC, NUCAP, Nova Steel reference jobs)
- Error handling tests verify: error is logged, error is surfaced (not swallowed), downstream side effects don't occur
- Use `expectNoSideEffects()` from `src/lib/test-utils/` to verify no mutations after error paths
- Run `npm run check` after every phase — zero regressions tolerated

## Banned Patterns — Never Write These

- `.catch(() => {})` — silent error swallowing
- `.catch(() => null)` — silent failure
- `.catch(() => ({}))` — fake success
- `console.log`/`warn`/`error` — use structured logger
- `try { ... } catch { }` — empty catch block
