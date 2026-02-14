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
