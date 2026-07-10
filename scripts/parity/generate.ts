/**
 * Belt golden parity corpus generator.
 *
 * Runs every case through the REAL engine (runCalculation, productKey belt_conveyor_v1),
 * captures outputs + rule firings verbatim, normalizes to canonical v2 nomenclature
 * (decision brief §2), assigns stable rule IDs (§5), and writes a deterministic corpus.
 *
 * Guards (per Phase 0 approval):
 *  - success cases must be NaN/Infinity-free -> STOP (never launder through JSON).
 *  - failure cases freeze success:false + rule firings; numerics are non-authoritative
 *    (non-finite values kept visible as sentinels, not laundered to null).
 *  - engine-throw configs recorded as a distinct outcome ("throws").
 *  - any rule firing with no stable id in the catalog -> STOP (completeness gap).
 *
 * Run: npx ts-node -O '{"module":"commonjs"}' scripts/parity/generate.ts [outDir] [isoDate]
 *   (kept as a direct command, not an npm script, so nothing outside scripts/parity/ is touched)
 * Two consecutive runs produce byte-identical corpus-v1.json / name-map.json / rule-ids.json.
 * Only manifest.json carries the volatile generated_at + head SHA.
 */
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

import { runCalculation } from '../../src/lib/calculator/engine';
import { MODEL_KEY, MODEL_VERSION_ID, MODEL_SEMVER } from '../../src/lib/model-identity';
import {
  PRODUCT_KEY,
  CANONICAL_PRODUCT,
  CORPUS_VERSION,
  GENERATOR_VERSION,
  NAME_MAP,
  RULE_CATALOG,
  canonicalBedType,
  classifyRule,
} from './core';
import { buildCases } from './cases';

const OUT_DIR = process.argv[2] || '/Users/abraham/dev/Conveyor-Console/parity';
const FIXED_DATE = process.argv[3]; // optional ISO date to make manifest reproducible

// ---- deterministic serialization helpers ----------------------------------
function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.keys(o)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortDeep(o[k]);
        return acc;
      }, {} as Record<string, unknown>);
  }
  return v;
}
const stable = (v: unknown) => JSON.stringify(sortDeep(v), null, 2) + '\n';

// ---- non-finite handling --------------------------------------------------
interface NonFinite { path: string; value: string }
function findNonFinite(obj: unknown, base = ''): NonFinite[] {
  const hits: NonFinite[] = [];
  const walk = (v: unknown, p: string) => {
    if (typeof v === 'number' && !Number.isFinite(v)) {
      hits.push({ path: p, value: Number.isNaN(v) ? 'NaN' : v > 0 ? 'Infinity' : '-Infinity' });
    } else if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, `${p}[${i}]`));
    } else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k);
    }
  };
  walk(obj, base);
  return hits;
}
/** Replace non-finite numbers with a visible sentinel (for non-authoritative failure outputs). */
function sanitizeNonFinite(v: unknown): unknown {
  if (typeof v === 'number' && !Number.isFinite(v)) {
    return { __nonfinite__: Number.isNaN(v) ? 'NaN' : v > 0 ? 'Infinity' : '-Infinity' };
  }
  if (Array.isArray(v)) return v.map(sanitizeNonFinite);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sanitizeNonFinite(x)]));
  }
  return v;
}

// ---- name normalization ---------------------------------------------------
function canonicalInputs(inputs: Record<string, unknown>): Record<string, unknown> {
  const out = { ...inputs };
  if ('bed_type' in out) out.bed_type = canonicalBedType(out.bed_type);
  // strip undefined so absent-vs-null is unambiguous in the frozen record
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}
function canonicalOutputs(outputs: Record<string, unknown>): Record<string, unknown> {
  const out = { ...outputs };
  if ('bed_type_used' in out) out.bed_type_used = canonicalBedType(out.bed_type_used);
  return out;
}

interface RuleFiring { id: string; field: string; severity: string; message: string }
const unclassified: Array<{ caseId: string; field: string; severity: string; message: string }> = [];

function classifyFirings(caseId: string, list: Array<{ field: string; severity: string; message: string }>): RuleFiring[] {
  const firings: RuleFiring[] = [];
  for (const f of list) {
    const id = classifyRule(f.field, f.severity, f.message);
    if (id === null) unclassified.push({ caseId, ...f });
    firings.push({ id: id ?? '__UNCLASSIFIED__', field: f.field, severity: f.severity, message: f.message });
  }
  // deterministic order
  return firings.sort((a, b) =>
    a.severity < b.severity ? -1 : a.severity > b.severity ? 1 :
    a.field < b.field ? -1 : a.field > b.field ? 1 :
    a.id < b.id ? -1 : a.id > b.id ? 1 :
    a.message < b.message ? -1 : a.message > b.message ? 1 : 0
  );
}

// ---- main -----------------------------------------------------------------
function main() {
  const cases = buildCases();
  const records: unknown[] = [];
  const nanViolations: Array<{ caseId: string; hits: NonFinite[] }> = [];
  const counts: Record<string, number> = { fixture: 0, grid: 0, edge: 0, failure: 0 };
  const outcomeCounts: Record<string, number> = { success: 0, error: 0, throws: 0 };

  for (const c of cases) {
    counts[c.category]++;
    const inputs = canonicalInputs(c.inputs as unknown as Record<string, unknown>);

    let expected: Record<string, unknown>;
    try {
      const r = runCalculation({ inputs: c.inputs, productKey: PRODUCT_KEY });
      const rawOutputs = (r.outputs ?? {}) as Record<string, unknown>;
      const firings = classifyFirings(c.id, [
        ...(r.errors ?? []).map((e) => ({ field: String((e as any).field), severity: 'error', message: String((e as any).message) })),
        ...(r.warnings ?? []).map((w) => ({ field: String((w as any).field), severity: String((w as any).severity ?? 'warning'), message: String((w as any).message) })),
      ]);

      if (r.success) {
        // success case: MUST be finite, or STOP (missing guard)
        const hits = findNonFinite(rawOutputs);
        if (hits.length) nanViolations.push({ caseId: c.id, hits });
        outcomeCounts.success++;
        expected = {
          outcome: 'success',
          success: true,
          outputs_authoritative: true,
          outputs: canonicalOutputs(rawOutputs),
          rules: firings,
        };
      } else {
        // failure case: numerics non-authoritative; keep non-finite visible as sentinel
        outcomeCounts.error++;
        expected = {
          outcome: 'error',
          success: false,
          outputs_authoritative: false,
          outputs: canonicalOutputs(sanitizeNonFinite(rawOutputs) as Record<string, unknown>),
          rules: firings,
        };
      }
    } catch (err) {
      outcomeCounts.throws++;
      expected = {
        outcome: 'throws',
        success: false,
        outputs_authoritative: false,
        outputs: null,
        rules: [],
        throw_message: err instanceof Error ? err.message : String(err),
      };
    }

    records.push({ id: c.id, category: c.category, description: c.description, product: CANONICAL_PRODUCT, inputs, expected });
  }

  // ---- STOP conditions -----------------------------------------------------
  if (nanViolations.length) {
    console.error('\nSTOP: %d success case(s) produced NaN/Infinity outputs (missing engine guard):', nanViolations.length);
    nanViolations.slice(0, 20).forEach((v) => console.error('  %s -> %s', v.caseId, v.hits.map((h) => `${h.path}=${h.value}`).join(', ')));
    process.exit(2);
  }
  if (unclassified.length) {
    console.error('\nSTOP: %d rule firing(s) have no stable id in the catalog (completeness gap):', unclassified.length);
    const uniq = new Map<string, { field: string; severity: string; message: string }>();
    unclassified.forEach((u) => uniq.set(`${u.severity}|${u.field}|${u.message}`, u));
    [...uniq.values()].slice(0, 40).forEach((u) => console.error('  [%s] %s :: %s', u.severity, u.field, u.message));
    process.exit(3);
  }

  // ---- write artifacts -----------------------------------------------------
  const beltDir = path.join(OUT_DIR, 'belt');
  fs.mkdirSync(beltDir, { recursive: true });

  const corpus = { corpus_version: CORPUS_VERSION, product: CANONICAL_PRODUCT, generator_version: GENERATOR_VERSION, case_count: records.length, cases: records };
  fs.writeFileSync(path.join(beltDir, 'corpus-v1.json'), stable(corpus));

  fs.writeFileSync(path.join(OUT_DIR, 'name-map.json'), stable(NAME_MAP));

  const ruleIds = {
    note: 'Stable rule IDs assigned by the parity harness (the engine has no stable rule IDs — decision brief §5). A firing is matched by field + severity + message pattern.',
    rules: RULE_CATALOG.map((r) => ({ id: r.id, field: r.field ?? '*', severity: r.severity, description: r.description })).sort((a, b) => (a.id < b.id ? -1 : 1)),
  };
  fs.writeFileSync(path.join(OUT_DIR, 'rule-ids.json'), stable(ruleIds));

  let headSha = 'unknown';
  try { headSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.join(__dirname, '../..') }).toString().trim(); } catch { /* noop */ }
  const manifest = {
    corpus_version: CORPUS_VERSION,
    product: CANONICAL_PRODUCT,
    generated_at: FIXED_DATE || new Date().toISOString(),
    source: { repo: 'new-conveyor-console', branch: 'parity/harness-and-belt-corpus', head_sha: headSha },
    model: { key: MODEL_KEY, version_id: MODEL_VERSION_ID, semver: MODEL_SEMVER },
    generator_version: GENERATOR_VERSION,
    tolerance_policy: 'Corpus records exact engine values. Comparison-time tolerance is the C# side\'s: exact for int/enum/bool/string; 1e-9 relative for floats. See parity/README.md.',
    case_counts: { ...counts, total: records.length },
    outcome_counts: outcomeCounts,
    products_status: { belt_conveyor: `FROZEN ${CORPUS_VERSION} @ ${headSha}`, magnetic_conveyor: 'PENDING (torque calc unfinished — 9 known-red magnetic tests)' },
    refs: { name_map: '../name-map.json', rule_ids: '../rule-ids.json' },
  };
  fs.writeFileSync(path.join(beltDir, 'manifest.json'), stable(manifest));

  console.log('Corpus written: %d cases (%s) -> %s', records.length, JSON.stringify(counts), beltDir);
  console.log('Outcomes: %s', JSON.stringify(outcomeCounts));
  console.log('Rule catalog: %d ids', RULE_CATALOG.length);
}

main();
