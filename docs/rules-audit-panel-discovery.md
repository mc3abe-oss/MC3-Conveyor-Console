# Phase 3.0: Rules Audit Panel — Discovery

## 1. Existing Rules-Telemetry Infrastructure

### Files (6 files in `src/lib/rules-telemetry/`)

| File | Purpose | Lines |
|------|---------|-------|
| `index.ts` | Barrel export — types, store, emit, registry, hooks | ~40 |
| `types.ts` | `RuleEvent`, `RuleRegistryEntry`, `RuleEmitContext`, `RuleTelemetryState` | 114 |
| `store.ts` | Singleton session store, max 200 events, feature flag check | 159 |
| `emit.ts` | `emitRuleEvent()`, `wrapValidationResult()`, `createContext()` | 165 |
| `registry.ts` | Rule registry with 26 pre-registered rules, query functions | 270 |
| `useRuleTelemetry.ts` | React hooks: `useRuleTelemetry()`, `useRulesDebugEnabled()` | ~75 |

### Key Types

```typescript
interface RuleEvent {
  rule_id: string;           // Stable ID from source + message prefix
  severity: RuleSeverity;    // 'error' | 'warning' | 'info'
  message: string;           // User-facing message
  product_key: string;       // 'belt_conveyor_v1' | 'magnetic_conveyor_v1' | 'unknown'
  timestamp: number;
  inputs_present: string[];  // Available input keys at time of evaluation
  source_ref: string;        // 'src/models/sliderbed_v1/rules.ts:validate'
  field?: string;            // Optional field name
  event_id: string;          // Unique per-event (for dedup)
}

interface RuleRegistryEntry {
  rule_id: string;
  current_source_ref: string;
  default_severity: RuleSeverity;
  product_scope: 'belt' | 'magnetic' | 'all' | 'unknown';
  enabled: boolean;
  notes?: string;
  message_pattern?: string;
}
```

### How It Works

1. **Emit**: When validation rules fire, `wrapValidationResult(result, context)` iterates `result.errors` and `result.warnings`, calling `emitRuleEvent()` for each.
2. **Store**: Events are stored in a module-level singleton (max 200, newest first). Listeners notified via `subscribe()`.
3. **Registry**: Rules auto-register on first fire. 26 are pre-registered from code analysis.
4. **React**: `useRuleTelemetry()` uses `useSyncExternalStore` to subscribe to the store.

### Instrumentation Points (4 active sites)

| Location | Function | Product Key |
|----------|----------|-------------|
| `sliderbed_v1/rules.ts:1977` | `validate()` | Passed through |
| `sliderbed_v1/rules.ts:2007` | `validateForCommit()` | Passed through |
| `sliderbed_v1/rules.ts:2107` | `applyPciOutputRules()` | undefined |
| `sliderbed_v1/rules.ts:2164` | `applyHubConnectionRules()` | undefined |

Also instrumented in:
- `magnetic_conveyor_v1/validation.ts:373` — loops through validation messages
- `lib/validation/beltCompatibility.ts:250` — belt compatibility issues
- `sliderbed_v1/outputs_v2/warnings.ts:450` — post-calc output warnings

### Critical Limitation

**Only FIRED rules are captured.** The current system wraps the output arrays (errors/warnings) after they're built. Rules that evaluated but did NOT fire produce no telemetry event. This is the key gap Phase 3 needs to fill.

---

## 2. Existing UI Panels

### RulesDebugPanel (`app/components/RulesDebugPanel.tsx`, 243 lines)

**What it is:** Fixed-position floating overlay (bottom-right, 480px wide, z-50) showing "Rules Fired" for the current session.

**What it shows:**
- Header: "Rules Fired" + event count (X/200)
- Blue "Observability only" notice
- Filter tabs: All | Errors | Warnings | Info (with counts)
- Expandable event rows: rule_id, product_key, timestamp, message
- Expanded details: source file, field, inputs_present (capped at 20), event_id
- Footer: session ID, "Max 200 entries"

**What it does NOT show:**
- Rules that passed (didn't fire)
- Rule categories or groupings
- Which rules were evaluated vs. which exist
- Total rule count or coverage

**Mounted in:** `app/layout.tsx` (root level, always available when flag enabled)

### DesignLogicPanel (`app/components/DesignLogicPanel.tsx`, 354 lines)

**Completely separate system.** Educational panel explaining conveyor physics (belt tensions, traction, pulley load, shaft stress). Has 11 sections with an SVG force diagram. Scroll-to-section capability. Not telemetry-related.

**Mounted in:** `BeltConveyorCalculatorApp.tsx` and `CalculationResults.tsx`

---

## 3. Feature Flag Usage

**Flag:** `NEXT_PUBLIC_RULES_DEBUG`

**Where checked:**
- `store.ts:isTelemetryEnabled()` — checks `process.env.NEXT_PUBLIC_RULES_DEBUG === 'true'` OR `localStorage.getItem('RULES_DEBUG') === 'true'`
- `store.ts:isEnabled()` — returns `state.enabled || isTelemetryEnabled()`
- `emit.ts:emitRuleEvent()` — early-returns if `!isEnabled()`
- `useRuleTelemetry.ts:useRulesDebugEnabled()` — hook for components
- `RulesDebugPanel.tsx` — returns null if `!isDebugEnabled`

**Runtime toggle:** `localStorage.setItem('RULES_DEBUG', 'true')` enables without rebuild.

**Current usage:** Gates the RulesDebugPanel visibility and all telemetry capture. Zero overhead when disabled.

---

## 4. Validation Output Shape

### From `sliderbed_v1/schema.ts`:

```typescript
interface ValidationError {
  field?: string;
  message: string;
  severity: 'error';
}

interface ValidationWarning {
  field?: string;
  message: string;
  severity: 'warning' | 'info';
}
```

### validate() returns:

```typescript
{ errors: ValidationError[], warnings: ValidationWarning[] }
```

### Flow:
```
validate(inputs, parameters, productKey)
  ├── validateInputs()         → ValidationError[]
  ├── validateParameters()     → ValidationError[]
  ├── applyApplicationRules()  → { errors, warnings }
  └── applyHeightWarnings()    → ValidationWarning[]
  → Merged into { errors: [...all], warnings: [...all] }
  → Wrapped with wrapValidationResult() for telemetry
  → Returned unchanged
```

### Post-calc output (different, richer shape):

```typescript
interface OutputMessageV2 {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  recommendation: string | null;
  impacts: OutputImpact[];
  related_component_ids: CanonicalComponentId[];
}
```

---

## 5. Recommended Instrumentation Approach

### The Gap

Currently 157 `.push({})` calls in `sliderbed_v1/rules.ts`. The telemetry system only captures the ones that fire (push into errors/warnings arrays). For a rules audit panel, we need to know about rules that **evaluated and passed** — "Incline check: 14° — no issue."

### Options Assessed

| Option | Description | Touch Points | Risk |
|--------|-------------|-------------|------|
| **(A) Add else-branches** | Add `else { audit.push({ fired: false, ... }) }` to every if-block | 157 if-blocks | High — massive diff, easy to introduce bugs |
| **(B) Wrap each rule in audit function** | `auditRule('incline_check', () => { if (...) push(...) })` | 157 call sites | Medium — still a big diff, changes control flow shape |
| **(C) Rule registry + post-hoc diff** | Register all rules statically. After validation, diff registered vs. fired to find passed rules | ~3 files | **Low — no changes to rule logic** |
| **(D) Extend existing telemetry** | Extend `wrapValidationResult` to also emit "pass" events for registered rules that didn't fire | ~2 files | **Lowest — builds on existing infra** |

### Recommendation: Option D (extend existing telemetry)

**Why:**
1. The telemetry system already captures fired rules via `wrapValidationResult()`.
2. The registry already has 26 pre-registered rules — we can expand this to all 157.
3. After `wrapValidationResult()` captures fired rules, we can compare against the full registry to emit "pass" entries for rules that didn't fire.
4. Zero changes to the actual rule logic in `sliderbed_v1/rules.ts`.
5. The existing `RulesDebugPanel` already consumes `useRuleTelemetry()` — we'd extend it or replace it with the new audit panel.

**Implementation sketch:**

1. **Expand the registry** to include all 157 rules from rules.ts (plus magnetic rules). Each entry gets a `rule_id`, `category`, `human_name`, `field`, `check_description` (what it checks in plain English).

2. **Add a new function** `buildAuditReport(firedEvents: RuleEvent[], allRules: RuleRegistryEntry[])` that:
   - Takes the fired events from the current validation run
   - Diffs against the full registry
   - Produces audit entries for both fired (with message) and passed (with description)

3. **Expose via hook** `useRulesAudit()` that returns the full audit with fired + passed entries, grouped by category.

4. **Build RulesAuditPanel** consuming `useRulesAudit()`.

**Key advantage:** Rule logic in `rules.ts` stays untouched. The registry is the single place we add human-readable descriptions.

### Alternative considered: Option C variant

Register rules statically in a separate file (`rule-definitions.ts`). Each definition includes the `rule_id` that `generateRuleId()` would produce for that rule. After validation, match fired events by `rule_id` to determine which fired and which passed.

This is essentially the same as Option D but more explicit about the matching. Could be combined.

---

## 6. Rule Count Post-Dedup

**157 `.push({})` calls** in `src/models/sliderbed_v1/rules.ts`.

Breakdown by function:
- `validateInputs()`: ~65 pushes (geometry, speed, parts, bulk, belt, shaft, overrides)
- `validateParameters()`: ~5 pushes (friction, safety factor, motor RPM, gravity)
- `applyApplicationRules()`: ~45 pushes (temperature, fluid, incline, finger-safe, side load, premium, etc.)
- `applyHeightWarnings()`: ~12 pushes (frame height, snub rollers, low profile)
- `validateTob()`: ~8 pushes (floor support, legs, casters)
- `applyPciOutputRules()`: ~10 pushes (tube stress, shaft deflection)
- `applyHubConnectionRules()`: ~12 pushes (hub connection type warnings)

Additional sources (not in rules.ts):
- `magnetic_conveyor_v1/validation.ts`: ~20-30 rules
- `lib/validation/beltCompatibility.ts`: ~10 rules
- `sliderbed_v1/outputs_v2/warnings.ts`: ~15 post-calc output warnings
- `app/components/useConfigureIssues.ts`: ~10 UI-only rules (not in model)

---

## 7. Existing Infrastructure We Can Reuse

| Component | Reuse For | Notes |
|-----------|----------|-------|
| `RuleEvent` type | Audit entry base | Add `fired: boolean` and `category` fields |
| `RuleRegistryEntry` type | Static rule definitions | Extend with `human_name`, `check_description`, `category` |
| `ruleRegistry` Map | Full rule inventory | Currently 26 entries → expand to all ~157 |
| `wrapValidationResult()` | Fired rule capture | Already works, no changes needed |
| `useRuleTelemetry()` hook | Base for `useRulesAudit()` | Extend or wrap |
| `RulesDebugPanel` component | Template for `RulesAuditPanel` | Same feature flag, same styling system |
| `NEXT_PUBLIC_RULES_DEBUG` flag | Gate the new panel | Reuse, don't create new flag |
| `SectionIssuesBanner` styling | Severity color palette | `bg-red-50`, `bg-yellow-50`, `bg-blue-50`, `bg-green-50` |
| `AccordionSection` pattern | Collapsible sections | Error/Warning/Info/Pass groupings |
| `OutputsV2Tabs` pattern | Tab system | If adding as a dedicated tab |
| `StatusLight` component | Summary indicator | Error/warning/pass counts |

---

## Summary

### What exists:
- Complete telemetry pipeline: types → emit → store → registry → hooks → UI panel
- 26 pre-registered rules in registry (of ~157 total)
- Feature flag (`NEXT_PUBLIC_RULES_DEBUG`) with env + localStorage override
- `RulesDebugPanel` floating overlay showing fired rules
- 4 active instrumentation points in rules.ts

### What's missing:
- **Passed rule tracking** — rules that evaluated but didn't fire are invisible
- **Full registry** — only 26 of ~157 rules are registered
- **Human-readable descriptions** — registry has message patterns but no plain-English check descriptions
- **Category grouping** — no categorization (geometry, safety, material, etc.)
- **Audit view** — `RulesDebugPanel` is an event log, not an audit showing coverage

### Recommended approach:
**Option D** — Extend existing telemetry infrastructure:
1. Expand registry to all rules with categories and descriptions
2. Add pass-tracking by diffing fired events against full registry
3. Build `RulesAuditPanel` component consuming the audit data
4. Gate behind existing `NEXT_PUBLIC_RULES_DEBUG` flag
5. Zero changes to rule logic in `rules.ts`
