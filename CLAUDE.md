# Claude Code Guidelines for MC3 Conveyor Console

This document provides comprehensive guidance for AI assistants working on this codebase.

---

## Project Overview

**MC3 Conveyor Console** is an enterprise web application for configuring and calculating specifications for industrial conveyor systems. It combines complex engineering calculations with multi-product support, user management, and quotation/sales order integration.

**Core Purpose:** Belt conveyor and magnetic conveyor configuration calculator with Excel parity requirements.

**Author:** MC3 Manufacturing Inc.
**License:** Proprietary

---

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 15.1.3 |
| UI | React | 19.0.0 |
| Language | TypeScript | 5.3.3 |
| Styling | Tailwind CSS | 3.4.1 |
| Database | Supabase (PostgreSQL) | 2.39.3 |
| Auth | Supabase Auth | via @supabase/ssr |
| Testing | Jest + ts-jest | 29.7.0 |
| Linting | ESLint | 8.56.0 |
| Formatting | Prettier | 3.1.1 |

---

## Project Structure

```
MC3-Conveyor-Console/
├── app/                           # Next.js App Router
│   ├── api/                       # API routes (backend endpoints)
│   │   ├── auth/                  # Authentication endpoints
│   │   ├── sales-orders/          # Sales order management
│   │   ├── configurations/        # Configuration save/load/search
│   │   ├── belts/, cleats/, v-guides/  # Catalog endpoints
│   │   └── admin/                 # Admin API routes
│   ├── components/                # React components
│   │   ├── outputs/               # Output display components
│   │   ├── magnetic/              # Magnetic conveyor UI
│   │   └── configurator/          # Multi-product configurator
│   ├── console/                   # Main application pages
│   │   ├── belt/                  # Belt conveyor config
│   │   ├── magnetic/              # Magnetic conveyor config
│   │   ├── sales-orders/          # Sales order pages
│   │   ├── quotes/                # Quote management
│   │   └── admin/                 # Admin catalog management
│   ├── login/, signup/            # Auth pages
│   └── layout.tsx                 # Root layout
│
├── src/                           # Shared source code
│   ├── models/                    # Calculation models
│   │   ├── sliderbed_v1/          # Original sliderbed calculator
│   │   │   ├── schema.ts          # Type definitions
│   │   │   ├── formulas.ts        # Calculation functions
│   │   │   ├── rules.ts           # Validation rules
│   │   │   └── __tests__/         # Test suite
│   │   ├── belt_conveyor_v1/      # Belt conveyor model
│   │   └── magnetic_conveyor_v1/  # Magnetic conveyor model
│   │
│   ├── lib/                       # Utility libraries
│   │   ├── calculator/            # Calculation engine
│   │   ├── database/              # Database utilities
│   │   ├── supabase/              # Supabase client configs
│   │   ├── auth/                  # Auth utilities (RBAC)
│   │   ├── gearmotor/             # Gearmotor selection
│   │   ├── validation/            # Input validation
│   │   ├── tracking/              # Belt tracking recommendation
│   │   ├── telemetry/             # Observability
│   │   ├── recipes/               # Configuration recipes
│   │   └── [catalogs]             # belt-catalog.ts, pulley-models.ts, etc.
│   │
│   ├── products/                  # Product modules (registry pattern)
│   │   ├── registry.ts            # Central product registry
│   │   ├── belt_conveyor_v1/      # Belt product definition
│   │   └── magnetic_conveyor_v1/  # Magnetic product definition
│   │
│   ├── hooks/                     # Custom React hooks
│   └── tests/fixtures/            # Test fixtures & golden files
│
├── supabase/                      # Database configuration
│   ├── schema.sql                 # Main schema
│   ├── migrations/                # 68+ sequential migrations
│   └── functions/                 # Edge functions
│
├── docs/                          # Documentation
├── fixtures/                      # Test fixtures
├── scripts/                       # Development scripts
└── .claude/commands/              # Claude CLI custom commands
```

---

## Development Commands

```bash
# Development
npm run dev              # Standard Next.js dev server
npm run dev:stable       # Polling watchers (macOS fix)
npm run dev:wsl          # WSL-specific (bind 0.0.0.0)
npm run dev:clean        # Clear .next cache and start
npm run dev:reset        # Kill ports, clear cache, restart

# Testing
npm test                 # Run Jest tests
npm test:watch           # Watch mode
npm test:coverage        # Coverage report (80% threshold)
npm run recipes:test     # Recipe-specific tests
npm run recipes:drift    # Recipe drift detection

# Code Quality
npm run lint             # ESLint check
npm run format           # Prettier format
npm run type-check       # TypeScript validation (no emit)

# Build
npm run build            # Production build
npm start                # Start production server
```

---

## Key Coding Conventions

### 1. TypeScript Strictness

- **Strict mode enabled** - All TypeScript strict checks active
- `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` enforced
- All model inputs/outputs have explicit types in `schema.ts`

### 2. Units in Variable Names

**Always include units in variable names:**
```typescript
// Good
conveyor_length_cc_in      // inches, center-to-center
belt_speed_fpm             // feet per minute
torque_drive_shaft_inlbf   // inch-pounds-force
part_weight_lbs            // pounds

// Bad
conveyor_length            // Missing unit
belt_speed                 // What unit?
torque                     // Ambiguous
```

### 3. Pure Functions for Calculations

All calculation functions must be:
- **Pure** - No side effects, no global state
- **Explicit dependencies** - All required parameters passed in
- **Documented** - Unit conversions and formulas commented

```typescript
/**
 * Calculate number of parts on belt
 * Formula: cc_length_in / (part_dimension_in + spacing_ft * 12)
 */
export function calculatePartsOnBelt(
  conveyorLengthCcIn: number,
  partLengthIn: number,
  partWidthIn: number,
  spacingFt: number,
  orientation: Orientation
): number {
  const spacingIn = spacingFt * 12; // Convert feet to inches
  // ...
}
```

### 4. Model Architecture Pattern

Each product model follows this structure:
```
model_name_v1/
├── schema.ts       # Type definitions (enums, interfaces)
├── formulas.ts     # Pure calculation functions
├── rules.ts        # Validation rules & warnings
├── geometry.ts     # Geometric calculations (if needed)
├── validation.ts   # Product-specific validation
└── __tests__/      # Test suite
```

### 5. Validation Rules Structure

```typescript
// Hard errors block calculation
{ severity: 'error', field: 'part_temperature', message: 'Do not use sliderbed for red hot parts' }

// Warnings allow calculation but alert user
{ severity: 'warning', field: 'conveyor_length_cc_in', message: 'Consider multi-section body' }

// Info messages are informational only
{ severity: 'info', field: 'oil_condition', message: 'Light oil present' }
```

### 6. API Route Pattern

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Authorization guard (early return)
    const authResult = await requireSuperAdmin()
    if (authResult.response) return authResult.response
    const { user } = authResult

    // 2. Parse and validate input
    const body = await request.json()
    if (!body.requiredField) {
      return NextResponse.json({ error: 'Missing required field' }, { status: 400 })
    }

    // 3. Business logic
    const supabase = await createClient()
    const { data, error } = await supabase.from('table').insert(...)
    if (error) throw error

    // 4. Audit logging (non-blocking)
    await logAuditAction(user.id, targetId, 'ACTION_TYPE', { details })

    // 5. Success response
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('[Feature] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 7. Color Palette (Tailwind)

```typescript
// MC3 brand colors
mc3-navy: '#2E364E'    // Primary dark
mc3-blue: '#2B5D85'    // Primary blue
mc3-gold: '#F3D273'    // Accent gold
mc3-ink: '#181924'     // Text dark
mc3-mist: '#DFE6F3'    // Background light
mc3-line: '#D2DAE6'    // Borders
```

---

## Testing Requirements

### Coverage Threshold: 80%

All branches, functions, lines, and statements must maintain 80% coverage.

### Excel Parity Tests

Calculations must match Excel spreadsheet outputs exactly:

```typescript
export const EXCEL_CASE_1: TestFixture = {
  name: 'Excel Case 1 - Standard Configuration',
  inputs: { /* exact values from Excel */ },
  expected_outputs: {
    drive_shaft_rpm: 152.789,
    torque_drive_shaft_inlbf: 1234.56,
    // ... all outputs from Excel
  },
  tolerance: 0.005, // ±0.5%
}
```

### Golden Files

Golden files in `src/tests/fixtures/golden/` store expected outputs for regression testing.

---

## Database Patterns

### Supabase Client Types

```typescript
// Server-side (pages, API routes)
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Browser-side (client components)
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
const supabase = createBrowserSupabaseClient()

// Admin (bypasses RLS - use carefully)
import { supabaseAdmin } from '@/lib/supabase/client'
```

### Key Tables

| Table | Purpose |
|-------|---------|
| `applications` | Saved conveyor configurations |
| `calc_recipes` | Configuration recipes with inputs/outputs |
| `quotes` | Sales quotes |
| `sales_orders` | Sales orders |
| `belt_catalog` | Belt specifications |
| `pulley_models` | Pulley library |
| `cleats_catalog` | Cleat profiles |
| `v_guides` | V-guide profiles |
| `nord_gearmotors` | Gearmotor data |
| `user_profiles` | RBAC user data |
| `telemetry_events` | Error tracking |

### Migration Naming

Migrations follow the pattern: `YYYYMMDDHHMMSS_description.sql`

Example: `20260125200000_telemetry_events.sql`

---

## Authentication & Authorization

### Security Model: Fail-Closed

All routes are protected by default. Only explicit allowlist routes are public:
- `/login`, `/signup`, `/forgot-password`, `/reset-password`
- `/api/auth/*`

### RBAC Hierarchy

| Role | Level | Capabilities |
|------|-------|--------------|
| SUPER_ADMIN | Highest | Full access, user management |
| BELT_ADMIN | Middle | Admin tables, no user management |
| BELT_USER | Lowest | Read-only admin, use main features |

### Auth Guards

```typescript
// In API routes
const authResult = await requireAuth()        // Any authenticated user
const authResult = await requireBeltAdmin()   // BELT_ADMIN or higher
const authResult = await requireSuperAdmin()  // SUPER_ADMIN only

if (authResult.response) return authResult.response
const { user, role } = authResult
```

### Dev Bypass

Auth can be bypassed in development when BOTH conditions are true:
- `NODE_ENV === 'development'`
- `AUTH_BYPASS_DEV === 'true'`

---

## Important Architectural Decisions

### 1. Multi-Product Architecture
Single codebase supports multiple product types via product registry pattern. Use `canRenderCard()` for fail-closed gating.

### 2. Immutable Published Versions
Model versions are immutable after publishing. No updates allowed - create new version instead.

### 3. Excel Parity Requirement
All calculations must match Excel exactly. Test fixtures derived from Excel spreadsheets.

### 4. Calculation Audit Trail
Every calculation records full input/output snapshots in `calculation_runs` table.

### 5. Backward Compatibility
- `normalizeInputs()` handles legacy field names
- `belt_conveyor_v1` extends `sliderbed_v1` types
- Input migration patterns for schema evolution

### 6. Deactivation vs Deletion
Users are deactivated, never deleted. Preserves referential integrity and audit trail.

---

## Do's and Don'ts

### DO

- Include units in all variable names (`_in`, `_ft`, `_lbs`, `_fpm`, etc.)
- Write pure functions for calculations
- Add Excel parity tests for new formulas
- Use TypeScript strict types for all interfaces
- Follow existing model structure (`schema.ts`, `formulas.ts`, `rules.ts`)
- Validate inputs before calculation
- Use `requireAuth()` guards in API routes
- Log audit actions for admin operations
- Use existing Tailwind MC3 color palette
- Check for auth with `getUser()` not `getSession()` (server-side validation)

### DON'T

- Mutate published model versions
- Skip Excel parity validation
- Use global state in calculation functions
- Add features not in the spec (ask first)
- Delete users (deactivate instead)
- Bypass RLS without explicit need
- Use implicit unit conversions
- Forget to handle warnings vs errors in validation
- Force push to main branch
- Skip the auth middleware for new routes

---

## Custom Claude Commands

Located in `.claude/commands/`:

| Command | Description |
|---------|-------------|
| `/restart` | Kill port 3000 and restart dev server |
| `/ship` | Commit, merge to main, push, and clean up branch |

---

## Environment Variables

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://your-app.com

# Development only
AUTH_BYPASS_DEV=false  # Set to 'true' to bypass auth in dev
```

---

## Common Tasks

### Adding a New Formula

1. Add formula function to `formulas.ts`
2. Update output type in `schema.ts`
3. Add formula to master `calculate()` in dependency order
4. Write unit tests in `__tests__/`
5. Add Excel fixture validation

### Adding a New Product Type

1. Create new directory in `src/models/product_name_v1/`
2. Implement `schema.ts`, `formulas.ts`, `rules.ts`
3. Register in `src/products/registry.ts`
4. Add UI components in `app/components/`
5. Create page in `app/console/product_name/`

### Adding a Database Migration

1. Create file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Write SQL with appropriate RLS policies
3. Test locally before deploying

### Debugging Dev Server Issues

1. Try `npm run dev:stable` (polling watchers)
2. Try `npm run dev:reset` (nuclear option)
3. Check if port 3000 is in use: `npx kill-port 3000`
4. For WSL: use `npm run dev:wsl`

---

## Key Files Reference

| File | Purpose | Size |
|------|---------|------|
| `src/models/sliderbed_v1/schema.ts` | Core type definitions | 113KB |
| `src/models/sliderbed_v1/formulas.ts` | Calculation functions | 100KB |
| `src/models/sliderbed_v1/rules.ts` | Validation rules | 77KB |
| `app/components/BeltConveyorCalculatorApp.tsx` | Main app shell | 86KB |
| `app/components/DriveSelectorModal.tsx` | Drive selection UI | 63KB |
| `middleware.ts` | Auth gate (fail-closed) | - |
| `src/lib/auth/rbac.ts` | Role-based access control | - |

---

## Questions to Ask Before Changes

1. Does this maintain Excel parity?
2. Are units explicit in variable names?
3. Is the function pure (no side effects)?
4. Does this require a new model version?
5. Are validation rules (errors/warnings) appropriate?
6. Is auth/RBAC properly implemented?
7. Are there existing patterns to follow?
8. Does this need an audit trail?
