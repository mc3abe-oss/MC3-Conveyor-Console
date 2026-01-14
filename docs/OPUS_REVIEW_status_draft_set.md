# OPUS REVIEW: Draft/Set Status, Revision Snapshots, and Output Gating

## 0.1 Goals (Stated Plainly)

1. **Universal status** across Quotes + Sales Orders: `"draft"` | `"set"`
2. **Default Draft** (unlocked, outputs disabled)
3. **Set** (locked) enables outputs
4. **Every transition INTO Set** creates one new revision snapshot
5. **No per-field revision tracking** - snapshot-based only
6. **Outputs impossible from Draft** - backend authoritative enforcement

---

## 0.2 Risks

### R1: Output Gating Leaks
- **Current state**: ALL outputs are generated 100% client-side in `src/models/sliderbed_v1/outputs_v2/builder.ts`
- **No server output endpoints exist** - copy-to-clipboard and exports happen entirely in browser
- **Risk**: If we only disable UI buttons, a user can still call the builder directly via console
- **Mitigation**: Create a server-side "output gate check" endpoint that must be called before any output action. Client requests permission, server validates status === "set".

### R2: Ambiguity About "snapshot_json" Contents
- **What is "scope"?** Based on exploration:
  - `specs` (where is_current=true) - the truth for specifications
  - `scope_lines` - structured text entries (mechanical, electrical, etc.)
  - `notes` - chronological immutable records
  - `attachments` - file references
  - For applications: `calc_recipes` inputs + outputs linkage
- **Decision**: Snapshot will contain:
  ```json
  {
    "specs": [...],           // All is_current=true specs
    "scope_lines": [...],     // All active scope_lines
    "notes": [...],           // All notes (as references)
    "attachments": [...],     // All attachments (as references)
    "linked_applications": [] // calc_recipe IDs linked to this entity
  }
  ```

### R3: Concurrency (Duplicate Revision Numbers)
- Two users setting at same time could create duplicate revision_number
- **Mitigation**: Use `SELECT ... FOR UPDATE` inside transaction when computing next revision_number
- Alternative: Use a sequence per entity, but complex - prefer row locking

### R4: Migration/Backfill Safety
- Existing quotes have `quote_status` field with values: draft, sent, won, lost, converted
- Existing sales_orders have NO status field currently
- **Mitigation**:
  - Add new `scope_status` column (avoid conflict with existing `quote_status`)
  - Backfill all to "draft" (safe default)
  - Do not generate historical revisions - only new Set actions create revisions

### R5: UX Footguns
- User toggles to Draft, expects outputs to still work briefly
- **Mitigation**: Immediate visual feedback (banner appears, buttons disable instantly)
- Toast: "Back to Draft. Outputs disabled."

### R6: Partial Failures
- Revision created but status not updated (or vice versa)
- **Mitigation**: Single transaction for Draft→Set:
  1. Insert revision row
  2. Update entity status + current_revision_id + current_revision_number
  3. Commit or rollback atomically

---

## 0.3 Edge Cases

### E1: Draft → Set → Draft → Set with No Edits
- **Behavior**: Still creates new revision each Set
- **Rationale**: User explicitly locked scope - even if unchanged, it's a new decision point
- **Revision diff**: Optional future feature, not in scope now

### E2: Existing Quotes/SOs with Prior Output Usage
- **Risk**: Users may have copied outputs before gating existed
- **Mitigation**:
  - All existing records backfill to "draft"
  - Users must explicitly Set before outputs work
  - No grandfather clause - enforce gate universally

### E3: Outputs Triggered from List Pages vs Detail Pages
- **Current**: No list-level output actions exist (all outputs are on detail/calculator page)
- **If added later**: Must also enforce gate server-side

### E4: API Consumers Relying on Old Output Endpoints
- **Current**: No server output endpoints exist - all client-side
- **Risk**: Low - we're adding new gating, not breaking existing server APIs

### E5: Permissions: Who Can Set?
- **Rule**: Anyone who can edit the Quote/SO can toggle Draft ⇄ Set
- **Implementation**: Reuse existing edit permission checks

---

## 0.4 Alternatives Considered

| Decision | Alternative A | Alternative B | **Choice** |
|----------|--------------|---------------|------------|
| Status values | Boolean `is_locked` | Labels `draft`/`set` | **Labels** (human clarity, extensible) |
| Revision trigger | On every field edit | On Set transition | **On Set** (intentional checkpoints) |
| Output enforcement | UI-only disabling | Server authoritative | **Server authoritative** (security) |
| Snapshot contents | Only specs | Full scope data | **Full scope** (complete audit trail) |
| Column naming | Reuse `quote_status` | New `scope_status` | **New column** (avoid breaking existing logic) |

---

## 0.5 Recommendation

1. **Single authoritative Output Gate**: Create `assertOutputsAllowed(entityType, entityId)` server function
2. **Server endpoint for output permission check**: Client calls before any output action
3. **Snapshot-based revisions**: No per-field diffing, store complete scope state
4. **Tests that fail if gate bypassed**: Every output path must call the gate

---

## 0.6 "Plan Freeze" Checklist

- [x] **A)** Draft/Set only (no won/lost/converted in this scope)
- [x] **B)** Outputs require status === "set" (no exceptions)
- [x] **C)** Set action creates revision snapshot row
- [x] **D)** Set → Draft does not create revision and does not delete history
- [x] **E)** All outputs funnel through a single server gate + tests

---

## Implementation Notes

### Database Changes
1. Add `scope_status` column to both `quotes` and `sales_orders` tables
2. Add `current_revision_id` and `current_revision_number` columns
3. Create `scope_revisions` table for snapshots

### Output Gate Strategy
Since outputs are currently 100% client-side:
1. Create `GET /api/quotes/:id/output-permission` and `GET /api/sales-orders/:id/output-permission`
2. Client MUST call this before any output action (copy, download, export)
3. Server returns `{ allowed: boolean, error?: { code, message } }`
4. Additionally disable UI controls, but server is authoritative

### Snapshot Contents
```typescript
interface ScopeSnapshot {
  captured_at: string;
  specs: Spec[];
  scope_lines: ScopeLine[];
  notes: Note[];
  attachments: Attachment[];
  linked_application_ids: string[];
}
```

---

## Self-Check Complete

- Scope snapshot contents are defined based on existing persisted state
- Output gating strategy accounts for 100% client-side current architecture
- Concurrency handled via row locking in transaction
- No ambiguity requiring Bob input - proceeding with implementation

---

# PHASE 2: FEEDBACK BEFORE BUILD

## Test Results

All 11 tests passed:
- Output Gate - Quotes (6 tests)
  - scope_status defaults to draft
  - Draft → Set creates revision #1
  - Set → Draft does NOT create revision
  - Draft → Set → Draft → Set creates revision #2
  - Draft quote blocks outputs
  - Set quote allows outputs
- Output Gate - Sales Orders (4 tests)
  - scope_status defaults to draft
  - Draft → Set creates revision
  - Draft SO blocks outputs
  - Set SO allows outputs
- Revision Uniqueness Constraint (1 test)
  - Duplicate revision numbers are blocked by DB constraint

## Implementation Verification Checklist

- [x] Database migration applied successfully
- [x] `scope_status` column added to quotes (defaults to 'draft')
- [x] `scope_status` column added to sales_orders (defaults to 'draft')
- [x] `current_revision_id` and `current_revision_number` columns added
- [x] `scope_revisions` table created with proper constraints
- [x] `get_next_scope_revision_number()` function works with row locking
- [x] API endpoints created:
  - GET/POST `/api/quotes/[id]/status`
  - GET/POST `/api/sales-orders/[id]/status`
  - GET `/api/quotes/[id]/output-permission`
  - GET `/api/sales-orders/[id]/output-permission`
- [x] Centralized output gate (`assertOutputsAllowed`) implemented
- [x] UI components created:
  - `ScopeStatusBanner` - Draft/Set toggle with visual feedback
  - `ScopeStatusPill` - Compact status indicator
  - `ScopeContext` / `ScopeProvider` - React context for scope state
  - `OutputGate` / `OutputDisabledBanner` - UI gating components
- [x] Hook created: `useScopeStatus` for client-side state management

## Files Changed

### New Files
- `supabase/migrations/20260113100000_scope_status_revisions.sql` - DB migration
- `src/lib/scope/output-gate.ts` - Central output gate logic
- `src/lib/scope/status.ts` - Status transition logic
- `src/lib/scope/snapshot.ts` - Snapshot creation
- `src/lib/scope/index.ts` - Module exports
- `src/lib/scope/output-gate.test.ts` - Backend tests
- `src/lib/hooks/useScopeStatus.ts` - React hook
- `app/components/ScopeStatusBanner.tsx` - Status banner component
- `app/components/ScopeContext.tsx` - React context
- `app/api/quotes/[id]/status/route.ts` - Quote status endpoint
- `app/api/quotes/[id]/output-permission/route.ts` - Quote output permission
- `app/api/sales-orders/[id]/status/route.ts` - SO status endpoint
- `app/api/sales-orders/[id]/output-permission/route.ts` - SO output permission
- `docs/OPUS_REVIEW_status_draft_set.md` - This document

## Remaining Integration Work

The core infrastructure is complete. To fully integrate, these components need updates:
1. Add `ScopeStatusBanner` to Quote/SO detail pages
2. Wrap output sections with `ScopeProvider` and use `OutputGate` components
3. Update `CopyBlock` and export buttons to call `checkOutputPermission` before actions

These integrations can be done incrementally without affecting existing functionality.
