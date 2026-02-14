# Vibe Coding Protocol — Evaluation Against MC3 Conveyor Console

**Date**: 2026-02-14
**Codebase**: MC3 Conveyor Console (Next.js 15, React 19, TypeScript, Supabase, Tailwind, Jest)

---

## 1. `.claude/settings.json` (Hooks)

### Current State
- **No `.claude/settings.json`** exists (only `settings.local.json` with permission allowlists)
- Existing `.claude/` contains two commands: `restart.md` and `ship.md`
- No hooks of any kind are configured

### Gap Analysis
The protocol provides two hooks:

**PostToolUse hook** (scans every file write for vulnerabilities):
- Checks for `dangerouslySetInnerHTML`, `$queryRawUnsafe`, `sql.raw()`, `eval()`, `exec()`, hardcoded secrets
- Ran all patterns against current codebase: **zero real matches**
- The `exec()` pattern would NOT false-positive — this codebase doesn't shell out
- The `password|secret|api_key` pattern WOULD false-positive on:
  - `src/lib/telemetry/scrub.ts` (the secret-scrubbing utility itself references these terms)
  - `app/signup/page.tsx` (standard password form fields)
  - Any file touching Supabase `SUPABASE_SERVICE_ROLE_KEY` references (type definitions, env loading)

**PreToolUse hook** (blocks `--no-verify`):
- Prevents Claude from skipping pre-commit hooks
- Only useful if pre-commit hooks exist (we have none currently)

### False Positive Risk
- **Medium** — the secret detection pattern is overly broad for a Supabase project. The word "key" appears everywhere in this codebase as product registry keys, catalog keys, and object property keys (10 false positives found in scan). Would need filtering for `process\.env`, `productKey`, `calcKey`, `modelKey`.

### Recommendation: **ADAPT**
- The PostToolUse security scan is low-cost and catches real risks if they're ever introduced
- Remove `exec()` from the pattern — too generic and we have no shell execution patterns
- Add exclusions for known false positives (`scrub.ts`, form fields, registry keys)
- Skip the PreToolUse `--no-verify` blocker until we have pre-commit hooks to protect
- The hook should be in `settings.json` (shared/committed), not `settings.local.json` (personal)

---

## 2. `CLAUDE.md`

### Current State
Our CLAUDE.md (70 lines) covers:
- Project overview with stack
- Common commands table (dev, build, test, lint, type-check, format, single test)
- Multi-product architecture (registry, engine, fail-closed gating)
- Model layer (schema, formulas, rules, Excel parity)
- Validation three-tier severity
- App layer structure
- Auth model (fail-closed middleware)
- Data layer (Supabase)
- Key conventions (strict TS, Tailwind colors, pure functions, units in names)

### Gap Analysis
The protocol's CLAUDE.md adds:
1. **Security-by-default rules (OWASP Top 10)** — parameterized queries, XSS prevention, auth checks, CORS, etc.
2. **"Definition of Done" checklist** — test, lint, security check before commit
3. **Planning requirements** — plans in `docs/plans/` for >3 file changes, ADRs in `docs/decisions/`
4. **Git discipline** — small commits, descriptive messages, no `--no-verify`
5. **Skills references** — pointers to `.claude/skills/` files
6. **Generic file structure** — template, not project-specific

### What's Redundant
- The protocol's file structure section is a generic template; ours is already project-specific and better
- The protocol's "Project Stack" is a fill-in-the-blank; ours already specifies Next.js 15 / React 19 / Supabase / etc.
- The protocol's key commands section duplicates ours (and ours includes single-test and coverage)
- Claude Code already has OWASP awareness built into its system prompt — repeating it in CLAUDE.md is belt-and-suspenders

### What's Valuable
- **Planning-first rule** for multi-file changes is useful — we already do this informally but codifying it prevents drift
- A concise "before committing" checklist could help (test, type-check, lint)
- Pointing to `docs/ADDING_NEW_PRODUCTS.md` for new product work is already in our CLAUDE.md

### Would "Definition of Done" Help?
Marginally. Claude Code already runs tests/lint when asked. A brief "pre-commit checklist" (2-3 lines) would be better than a formal "Definition of Done" section.

### Would "Platform vs Product Layers" Be More Valuable?
**Yes, significantly.** The protocol's generic OWASP rules add little that Claude doesn't already know. A section explaining our Platform (engine, registry, fail-closed gating, Supabase RLS) vs Product (models, formulas, UI cards) boundary would prevent far more real mistakes — like putting database calls in formula functions or creating cards without `requiresOutputKeys`.

### Recommendation: **ADAPT**
- Add a brief pre-commit checklist (3 lines, not a full "Definition of Done")
- Add a "Platform vs Product" boundary section specific to MC3
- Skip the generic OWASP rules — Claude already knows them and they'd bloat the file
- Skip the `docs/plans/` and `docs/decisions/` conventions unless the team wants them

---

## 3. `eslint.config.mjs`

### Current State
- **No root ESLint config file** — relies on `next lint` which uses Next.js built-in ESLint config
- `@typescript-eslint/eslint-plugin` (v6) and `@typescript-eslint/parser` (v6) are installed
- `eslint-plugin-security` is **NOT** installed
- `npm run lint` runs `next lint` (not direct eslint)
- No `--max-warnings=0` configured
- No `no-floating-promises` or `no-misused-promises` rules

### Gap Analysis
The protocol's ESLint config adds:
1. **`eslint-plugin-security`** — detects unsafe regex, eval, timing attacks, object injection, etc.
2. **`@typescript-eslint/no-explicit-any`: error** — already enforced by tsconfig strict mode in practice
3. **`@typescript-eslint/strict-boolean-expressions`: warn** — catches truthy/falsy mistakes
4. **`no-eval`, `no-implied-eval`, `no-new-func`** — prevents dynamic code execution
5. **Flat config format** (eslint.config.mjs) — protocol uses ESLint 9 flat config; we're on ESLint 8

### False Positive Risk
- **`security/detect-object-injection`: HIGH noise** — warns on any `obj[variable]` pattern. In a calculation engine that uses dynamic property lookups extensively (product registry, input/output schemas, catalog lookups), this would fire constantly and be almost entirely false positives.
- **`security/detect-non-literal-fs-filename`: LOW relevance** — we don't do filesystem operations
- **`security/detect-possible-timing-attacks`: MEDIUM noise** — would flag any string comparison, including harmless `productKey === 'belt_conveyor_v1'`
- **`strict-boolean-expressions`** — would require significant refactoring of existing code that uses truthy checks

### What Would Catch Real Bugs
- **`no-floating-promises`** and **`no-misused-promises`** — these are the highest-value rules for a Next.js app with async API routes and hooks. A forgotten `await` in a Supabase call or API handler is a real risk.
- **`no-eval`** family — cheap to add, zero false positives in this codebase
- **`security/detect-unsafe-regex`** — relevant if we ever add user-facing search

### Recommendation: **ADAPT**
- **Do NOT** wholesale adopt the protocol's eslint.config.mjs — it would require ESLint 8→9 migration and generate massive noise from `detect-object-injection`
- **DO** add `@typescript-eslint/no-floating-promises` and `@typescript-eslint/no-misused-promises` — highest ROI rules for async Next.js code
- **Consider** adding `no-eval` family rules (cheap, zero noise)
- **Skip** `eslint-plugin-security` for now — most rules are irrelevant (no filesystem, no raw SQL, no user-controlled regex) and `detect-object-injection` would be extremely noisy
- **Skip** `--max-warnings=0` until existing warnings are cleaned up

---

## 4. `package.json` Scripts

### Current State
```
dev, dev:stable, dev:wsl, dev:clean, dev:reset
build, start, build:lib
test, test:watch, test:coverage
lint, format, type-check
example, recipes:test, recipes:drift
```

### Gap Analysis
The protocol adds:
1. **`lint:fix`** — auto-fix lint issues (we only have `lint`)
2. **`security`** — runs `scripts/security-check.sh`
3. **`prepare`** — `husky` (for pre-commit hooks)
4. **`lint-staged`** config — format+lint only staged files
5. **Unified `check` or `validate`** — not present in either; would run type-check + lint + test in one command

### What's Missing That Would Help
- A **`check`** script combining `type-check && lint && test` — useful for pre-commit and CI
- A **`lint:fix`** script — we have `format` (prettier only) but no ESLint auto-fix

### Recommendation: **ADAPT**
- Add `"check": "npm run type-check && npm run lint && npm test"` — single command for full validation
- Add `"lint:fix": "next lint --fix"` — convenience script
- Skip `security` script and `prepare`/`lint-staged` for now (see sections 6 and 7)

---

## 5. CI Pipeline (`.github/workflows/`)

### Current State
- **No CI workflows exist** — no `.github/workflows/` directory
- Deployment appears to be via Vercel (auto-deploy from git)
- No automated quality gates on PRs

### Gap Analysis
The protocol provides a CI workflow that runs:
1. TypeScript check
2. ESLint
3. Tests
4. `npm audit --audit-level=high`
5. Custom security scan
6. (Optional) Semgrep SAST

### Current Risk
Without CI, the only quality gates are:
- Vercel build (catches build failures)
- Manual `npm test` / `npm run lint` (relies on discipline)
- Claude Code running checks when asked

npm audit currently shows **2 HIGH vulnerabilities** (`@isaacs/brace-expansion` and `next` — both fixable with `npm audit fix`).

### Would Semgrep Add Value?
Premature at this stage. The codebase is clean on all static patterns. Semgrep adds value when you have multiple contributors or a larger attack surface (user-uploaded content, payment processing, etc.). The MC3 console is an internal engineering tool with Supabase auth gating.

### Recommendation: **ADAPT**
- **ADOPT** a basic CI workflow (type-check + lint + test) — highest ROI item in the entire protocol
- **ADOPT** `npm audit --audit-level=high` in CI — catches dependency vulns automatically
- **SKIP** the security scan script in CI (see section 7 — too noisy)
- **SKIP** Semgrep — premature for a small team with an internal tool
- Adapt the workflow for Vercel deployment (the protocol assumes generic GitHub Actions)

---

## 6. Pre-commit Hooks (`.husky/`)

### Current State
- **Husky is NOT installed**
- No pre-commit hooks of any kind
- No `lint-staged` configuration
- No `.husky/` directory

### Gap Analysis
The protocol provides:
1. Husky pre-commit hook running `lint-staged` (format + lint staged files)
2. Security scan on staged `.ts/.tsx/.js/.jsx` files
3. Blocks commits containing `eval()`, raw SQL, or hardcoded secrets

### For a Small Team Using Claude Code CLI
Pre-commit hooks add friction to every commit. With Claude Code as the primary dev tool:
- Claude already runs lint/test when asked
- The `/ship` command handles the git workflow
- Hook failures during rapid iteration are frustrating
- **But**: hooks catch the one time someone forgets, which is when bugs ship

### Recommendation: **SKIP (for now)**
- The Claude Code workflow (CLAUDE.md instructions + `/ship` command) provides equivalent coverage
- A CI pipeline (section 5) is a better investment — same checks, no local friction
- Revisit if the team grows beyond 1-2 developers or if issues slip through

---

## 7. Security Check Script (`security-check.sh`)

### Current State
No equivalent exists in the project.

### Scan Results Against This Codebase

| Check | Result | False Positives |
|-------|--------|-----------------|
| SQL Injection | Clean | 0 |
| XSS | Clean | 0 |
| Hardcoded Secrets | Clean | 0 |
| Eval / Unsafe Code | Clean | 0 |
| CORS Wildcard | Clean | 0 |
| Sensitive Data in Logs | 10 matches | **10/10 are false positives** (all are "key" in product registry context) |
| npm audit | 2 HIGH vulns | 0 (real issues) |

### How Noisy Would It Be?
The "sensitive data in logs" check would **always fail** due to `console.log/warn` statements referencing product `key`, catalog `key`, etc. The pattern `console\.(log|info|debug|warn)\(.*\b(key)\b` matches domain terminology, not secrets.

To make it work for MC3, the pattern would need to exclude `productKey`, `calcKey`, `modelKey`, `catalogKey`, `formulas key`, etc. — which makes the pattern so specific it loses general value.

### Recommendation: **SKIP**
- The codebase is clean on all real patterns
- The one check that finds anything (sensitive data in logs) is 100% false positives
- npm audit is better placed in CI (section 5) than a manual script
- If ever needed, the PostToolUse hook (section 1) provides file-level scanning already

---

## 8. Skills Files

### Current State
- **No `.claude/skills/` directory exists**
- Two commands exist: `.claude/commands/restart.md` and `.claude/commands/ship.md`
- CLAUDE.md provides project-specific architectural context

### Gap Analysis

**`SKILL-security-review.md`**:
- OWASP Top 10 checklist with grep patterns
- Output format template for security review summaries
- **Overlap**: Claude Code already knows OWASP. The grep patterns are the same ones from `security-check.sh` that produce false positives here.
- **Value-add**: The structured output format (findings + passed checks + recommendations) is useful for formal reviews

**`SKILL-database-safety.md`**:
- Safe patterns for Prisma, Drizzle, Knex, MongoDB
- **Problem**: We don't use any of these ORMs. We use **Supabase client** (`supabase.from('table').select()`) which has its own patterns. The entire skill is irrelevant to our stack.
- **What we actually need**: Supabase RLS patterns, `supabase.rpc()` safety, service role key usage rules

**`SKILL-api-design.md`**:
- Endpoint template with Zod validation, NextAuth session, rate limiting
- **Problem**: We use **Supabase Auth** (not NextAuth), don't have **Zod** installed, and don't have **rate limiting** middleware. The template code wouldn't compile.
- **What we actually need**: Next.js App Router route handler patterns with Supabase auth, our existing validation approach

### MC3-Specific Skills That Would Be MORE Valuable

1. **Product Architecture Skill** — rules for adding new products: ProductModule interface, outputsSchema requirements, fail-closed card gating, registry registration
2. **Calculation Model Skill** — Excel parity requirements, pure function constraints, units-in-names convention, fixture-based testing patterns
3. **Supabase Patterns Skill** — browser vs server client usage, RLS considerations, service role key restrictions, migration conventions

### Recommendation: **SKIP the protocol skills, BUILD MC3-specific ones later**
- All three protocol skills reference tools/patterns we don't use (Prisma, NextAuth, Zod, rate limiting)
- They'd mislead Claude into suggesting wrong patterns for our stack
- If skills are ever built, they should encode MC3-specific knowledge (product architecture, Excel parity, Supabase client patterns)

---

## 9. `.gitignore`

### Current State
Our `.gitignore` covers: node_modules, coverage, .next, dist, build, .DS_Store, .pem, debug logs, .env/.env*.local, .vercel, tsbuildinfo, next-env.d.ts, .vscode, .idea, swap files

### Gap Analysis
The protocol's `.gitignore` adds:
1. **`*.key`** — private key files (we have `*.pem` but not `*.key`)
2. **`.env.production`** — we have `.env*.local` and `.env` but not explicit `.env.production`
3. **`CLAUDE.local.md`** — prevents personal Claude overrides from being committed
4. **`Thumbs.db`** — Windows thumbnail cache (we already have this)

### Recommendation: **ADOPT** (minor additions)
- Add `*.key` — cheap safety net
- Add `CLAUDE.local.md` — good practice if team members customize Claude behavior
- `.env.production` is already covered by our `.env` pattern, but explicit is clearer

---

## 10. `.env.example`

### Current State
- **No `.env.example` exists**
- Only `.env.local` (gitignored, contains real credentials)
- CLAUDE.md documents the three required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### Gap Analysis
The protocol's `.env.example` is generic (DATABASE_URL, NEXTAUTH_SECRET, etc.) — not applicable to our Supabase stack.

### Recommendation: **ADAPT**
- Create a `.env.example` with our actual Supabase vars (placeholder values)
- Include `AUTH_BYPASS_DEV=true` for development setup documentation
- Low priority — CLAUDE.md already documents the vars, and there's only one developer

---

## 11. `README.md` — "What This Does NOT Guarantee" Framing

### Current State
README.md focuses on the calculation engine specification, inputs/outputs, and Excel parity.

### Gap Analysis
The protocol's README includes a "What This Does NOT Guarantee" section that sets expectations:
- Not a replacement for professional security audits
- Not a substitute for threat modeling
- Not a guarantee against all vulnerabilities

### Recommendation: **SKIP**
- This framing is relevant for the protocol itself (a tool being distributed), not for a product codebase
- Our README is correctly focused on the engineering domain

---

## Final Summary

### Priority-Ordered Changes (Highest ROI First)

| # | Change | Component | Risk | Effort |
|---|--------|-----------|------|--------|
| 1 | **Add CI workflow** (type-check + lint + test + npm audit) | `.github/workflows/ci.yml` | None — additive, doesn't change existing code | Small |
| 2 | **Add `check` script** to package.json | `package.json` | None — new script only | Trivial |
| 3 | **Add `.env.example`** with Supabase vars | `.env.example` | None — new file | Trivial |
| 4 | **Add `*.key` and `CLAUDE.local.md` to .gitignore** | `.gitignore` | None — additive | Trivial |
| 5 | **Add PostToolUse security hook** (adapted for MC3) | `.claude/settings.json` | Low — hook is advisory, won't block workflow | Small |
| 6 | **Enhance CLAUDE.md** with pre-commit checklist + platform/product boundary | `CLAUDE.md` | None — documentation only | Small |
| 7 | **Add `no-floating-promises` ESLint rule** | ESLint config | Medium — may surface existing missing `await`s that need fixing | Medium |
| 8 | **Run `npm audit fix`** | Dependencies | Low — patch version bumps | Trivial |

### What to Skip Entirely

| Component | Reason |
|-----------|--------|
| Husky / pre-commit hooks | CI pipeline provides same checks without local friction; revisit if team grows |
| `security-check.sh` | 100% false positive rate on the one check that matches; codebase is clean |
| `eslint-plugin-security` | `detect-object-injection` would be extremely noisy; other rules are irrelevant to our stack |
| Protocol skills (all 3) | Reference wrong tools (Prisma, NextAuth, Zod); would mislead Claude |
| Protocol CLAUDE.md OWASP rules | Claude already knows OWASP; generic rules add bloat without project-specific value |
| Semgrep | Premature for small team with internal tool |
| `--max-warnings=0` | Would require cleaning up all existing warnings first |
| README "What This Does NOT Guarantee" | Framing is for the protocol distribution, not a product repo |

### Implementation Plan

If approved, changes would be applied in this order:

1. **`.gitignore`** — add `*.key`, `CLAUDE.local.md` (zero risk)
2. **`.env.example`** — create with Supabase placeholder vars (zero risk)
3. **`package.json`** — add `"check"` and `"lint:fix"` scripts (zero risk)
4. **`CLAUDE.md`** — add pre-commit checklist and platform/product boundary section (zero risk)
5. **`.claude/settings.json`** — create with adapted PostToolUse hook (low risk — test first)
6. **`.github/workflows/ci.yml`** — create CI pipeline (zero risk to existing code; test on a PR)
7. **`npm audit fix`** — fix 2 HIGH dependency vulns (low risk — verify build passes)
8. **ESLint `no-floating-promises`** — add rule, fix any surfaced issues (medium risk — may require code changes)

No changes break existing functionality. Items 1-6 are purely additive. Item 7 is a dependency patch. Item 8 may surface real bugs (missing `await` calls) that should be fixed regardless.
