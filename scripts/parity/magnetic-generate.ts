/**
 * Magnetic golden parity corpus generator.
 *
 * Runs every case through the REAL magnetic model — formulas.calculate() —
 * captures outputs + rule firings verbatim, assigns stable rule IDs (the
 * in-engine ValidationCodes, Gate 1 ruling), and writes a deterministic corpus.
 *
 * CAPTURE ENTRY POINT: the model directly, NOT runCalculation — see
 * magnetic-core.ts header for the Gate 1 ruling and evidence. Contract:
 * outcome=success ⟺ outputs.errors is empty; rules = outputs.errors+warnings.
 * The embedded warnings/errors arrays are normalized OUT of the recorded
 * outputs object (they are the `rules` list in the shared corpus shape).
 *
 * Guards (belt conventions):
 *  - success cases must be NaN/Infinity-free -> STOP (never launder through JSON).
 *  - failure cases freeze success:false + rule firings; numerics non-authoritative
 *    (non-finite values kept visible as sentinels, not laundered to null).
 *  - model-throw configs recorded as a distinct outcome ("throws") — none are
 *    expected for magnetic; any appearing is a report-level flag.
 *  - any rule firing with no stable id in the catalog -> STOP (completeness gap).
 *
 * This script writes ONLY <outDir>/magnetic/{corpus-v1.json,manifest.json}.
 * The shared parity/rule-ids.json + name-map.json additions are hand-applied
 * in Conveyor-Console in the same versioned change (belt entries byte-untouched).
 *
 * Run: npx ts-node -O '{"module":"commonjs"}' scripts/parity/magnetic-generate.ts [outDir] [isoDate]
 * Two consecutive runs produce byte-identical corpus-v1.json.
 */
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

import { calculate } from '../../src/models/magnetic_conveyor_v1/formulas';
import { MODEL_SEMVER } from '../../src/lib/model-identity';
import {
  MODEL_KEY,
  MODEL_VERSION_ID,
  CANONICAL_PRODUCT,
  CORPUS_VERSION,
  GENERATOR_VERSION,
  MAGNETIC_RULE_CATALOG,
  classifyMagneticRule,
} from './magnetic-core';
import { buildCases } from './magnetic-cases';

const OUT_DIR = process.argv[2] || '/Users/abraham/dev/Conveyor-Console/parity';
const FIXED_DATE = process.argv[3]; // optional ISO date to make manifest reproducible

// ---- deterministic serialization helpers (belt-identical) ------------------
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

// ---- non-finite handling (belt-identical) -----------------------------------
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

// ---- normalization ----------------------------------------------------------
/** Strip undefined so absent-vs-null is unambiguous in the frozen record. */
function canonicalInputs(inputs: Record<string, unknown>): Record<string, unknown> {
  const out = { ...inputs };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}
/**
 * The magnetic model embeds warnings/errors inside its outputs object; the
 * corpus normalizes them into the shared `rules` shape, so they are removed
 * from the recorded outputs (all physics keys are already canonical).
 */
function canonicalOutputs(outputs: Record<string, unknown>): Record<string, unknown> {
  const out = { ...outputs };
  delete out.warnings;
  delete out.errors;
  return out;
}

interface RuleFiring { id: string; field: string; severity: string; message: string }
const unclassified: Array<{ caseId: string; field: string; severity: string; message: string }> = [];

function classifyFirings(caseId: string, list: Array<{ field: string; severity: string; message: string }>): RuleFiring[] {
  const firings: RuleFiring[] = [];
  for (const f of list) {
    const id = classifyMagneticRule(f.field, f.severity, f.message);
    if (id === null) unclassified.push({ caseId, ...f });
    firings.push({ id: id ?? '__UNCLASSIFIED__', field: f.field, severity: f.severity, message: f.message });
  }
  return firings.sort((a, b) =>
    a.severity < b.severity ? -1 : a.severity > b.severity ? 1 :
    a.field < b.field ? -1 : a.field > b.field ? 1 :
    a.id < b.id ? -1 : a.id > b.id ? 1 :
    a.message < b.message ? -1 : a.message > b.message ? 1 : 0
  );
}

// ---- main -------------------------------------------------------------------
function main() {
  const cases = buildCases();
  const ids = new Set<string>();
  for (const c of cases) {
    if (ids.has(c.id)) { console.error('STOP: duplicate case id %s', c.id); process.exit(4); }
    ids.add(c.id);
  }

  const records: unknown[] = [];
  const nanViolations: Array<{ caseId: string; hits: NonFinite[] }> = [];
  const counts: Record<string, number> = { fixture: 0, grid: 0, edge: 0, failure: 0 };
  const outcomeCounts: Record<string, number> = { success: 0, error: 0, throws: 0 };

  for (const c of cases) {
    counts[c.category]++;
    const inputs = canonicalInputs(c.inputs as unknown as Record<string, unknown>);

    let expected: Record<string, unknown>;
    try {
      const r = calculate(c.inputs);
      const rawOutputs = canonicalOutputs(r as unknown as Record<string, unknown>);
      const firings = classifyFirings(c.id, [
        ...r.errors.map((e) => ({ field: e.field, severity: 'error', message: e.message })),
        ...r.warnings.map((w) => ({ field: w.field, severity: w.severity ?? 'warning', message: w.message })),
      ]);
      const success = r.errors.length === 0;

      if (success) {
        const hits = findNonFinite(rawOutputs);
        if (hits.length) nanViolations.push({ caseId: c.id, hits });
        outcomeCounts.success++;
        expected = {
          outcome: 'success',
          success: true,
          outputs_authoritative: true,
          outputs: rawOutputs,
          rules: firings,
        };
      } else {
        outcomeCounts.error++;
        expected = {
          outcome: 'error',
          success: false,
          outputs_authoritative: false,
          outputs: sanitizeNonFinite(rawOutputs),
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

  // ---- STOP conditions -------------------------------------------------------
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
  if (outcomeCounts.throws > 0) {
    console.error('\nSTOP: %d case(s) threw — magnetic has no expected throws path; report before freezing.', outcomeCounts.throws);
    process.exit(5);
  }

  // ---- write artifacts (parity/magnetic/ ONLY) --------------------------------
  const magDir = path.join(OUT_DIR, 'magnetic');
  fs.mkdirSync(magDir, { recursive: true });

  const corpus = { corpus_version: CORPUS_VERSION, product: CANONICAL_PRODUCT, generator_version: GENERATOR_VERSION, case_count: records.length, cases: records };
  fs.writeFileSync(path.join(magDir, 'corpus-v1.json'), stable(corpus));

  let headSha = 'unknown';
  try { headSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.join(__dirname, '../..') }).toString().trim(); } catch { /* noop */ }
  const manifest = {
    corpus_version: CORPUS_VERSION,
    product: CANONICAL_PRODUCT,
    generated_at: FIXED_DATE || new Date().toISOString(),
    source: { repo: 'new-conveyor-console', branch: 'parity/magnetic-corpus', head_sha: headSha },
    model: { key: MODEL_KEY, version_id: MODEL_VERSION_ID, app_semver: MODEL_SEMVER },
    capture_entry_point: 'src/models/magnetic_conveyor_v1/formulas.calculate() — direct model capture per Gate 1 ruling (2026-07-14); success ⟺ outputs.errors empty. See parity/magnetic/README.md.',
    generator_version: GENERATOR_VERSION,
    tolerance_policy: 'Corpus records exact engine values. Comparison-time tolerance is the C# side\'s: exact for int/enum/bool/string; 1e-9 relative for floats. See parity/README.md.',
    case_counts: { ...counts, total: records.length },
    outcome_counts: outcomeCounts,
    rule_catalog: { magnetic_rule_count: MAGNETIC_RULE_CATALOG.length, ids_are: 'in-engine ValidationCodes (validation.ts)', latent_excluded: ['MATERIAL_NON_MAGNETIC'] },
    refs: { name_map: '../name-map.json', rule_ids: '../rule-ids.json' },
  };
  fs.writeFileSync(path.join(magDir, 'manifest.json'), stable(manifest));

  console.log('Corpus written: %d cases (%s) -> %s', records.length, JSON.stringify(counts), magDir);
  console.log('Outcomes: %s', JSON.stringify(outcomeCounts));
  console.log('Rule catalog: %d ids', MAGNETIC_RULE_CATALOG.length);
}

main();
