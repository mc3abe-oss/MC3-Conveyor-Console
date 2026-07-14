/**
 * Magnetic corpus replay verifier — freeze gate.
 *
 * Loads the generated parity/magnetic/corpus-v1.json and replays every case
 * through the legacy magnetic model (formulas.calculate — the frozen capture
 * entry point), asserting 100% self-consistency BEFORE freeze is declared:
 *   - outcome + success flag match
 *   - success outputs match EXACTLY (strict deep equality, absent≠null)
 *   - rule firings match exactly (id + field + severity + message, in order)
 * Failure-case outputs are non-authoritative (belt convention) and are not
 * compared; their rules are.
 *
 * Run: npx ts-node -O '{"module":"commonjs"}' scripts/parity/magnetic-replay.ts [corpusPath]
 * Exit 0 = all cases self-consistent. Nonzero = report before freezing.
 */
import * as fs from 'fs';

import { calculate } from '../../src/models/magnetic_conveyor_v1/formulas';
import { MagneticInputs } from '../../src/models/magnetic_conveyor_v1/schema';
import { classifyMagneticRule } from './magnetic-core';

const CORPUS_PATH = process.argv[2] || '/Users/abraham/dev/Conveyor-Console/parity/magnetic/corpus-v1.json';

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
const canon = (v: unknown) => JSON.stringify(sortDeep(v));

interface CorpusCase {
  id: string;
  inputs: Record<string, unknown>;
  expected: {
    outcome: string;
    success: boolean;
    outputs_authoritative: boolean;
    outputs: Record<string, unknown> | null;
    rules: Array<{ id: string; field: string; severity: string; message: string }>;
  };
}

function replayOne(c: CorpusCase): string | null {
  const r = calculate(c.inputs as unknown as MagneticInputs);
  const success = r.errors.length === 0;
  const outcome = success ? 'success' : 'error';

  if (outcome !== c.expected.outcome) return `outcome ${outcome} != ${c.expected.outcome}`;
  if (success !== c.expected.success) return `success ${success} != ${c.expected.success}`;

  const firings = [
    ...r.errors.map((e) => ({ field: e.field, severity: 'error', message: e.message })),
    ...r.warnings.map((w) => ({ field: w.field, severity: w.severity ?? 'warning', message: w.message })),
  ]
    .map((f) => ({ id: classifyMagneticRule(f.field, f.severity, f.message) ?? '__UNCLASSIFIED__', ...f }))
    .sort((a, b) =>
      a.severity < b.severity ? -1 : a.severity > b.severity ? 1 :
      a.field < b.field ? -1 : a.field > b.field ? 1 :
      a.id < b.id ? -1 : a.id > b.id ? 1 :
      a.message < b.message ? -1 : a.message > b.message ? 1 : 0
    );
  if (canon(firings) !== canon(c.expected.rules)) return 'rule firings differ';

  if (success) {
    const outputs = { ...(r as unknown as Record<string, unknown>) };
    delete outputs.warnings;
    delete outputs.errors;
    if (canon(outputs) !== canon(c.expected.outputs)) {
      // pinpoint the first differing key for the report
      const exp = c.expected.outputs ?? {};
      for (const k of new Set([...Object.keys(outputs), ...Object.keys(exp)])) {
        if (canon(outputs[k]) !== canon(exp[k])) {
          return `output '${k}': ${canon(outputs[k])} != ${canon(exp[k])}`;
        }
      }
      return 'outputs differ (key set)';
    }
  }
  return null;
}

function main() {
  const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8')) as { case_count: number; cases: CorpusCase[] };
  let ok = 0;
  const failures: Array<{ id: string; reason: string }> = [];
  for (const c of corpus.cases) {
    const reason = replayOne(c);
    if (reason === null) ok++;
    else failures.push({ id: c.id, reason });
  }
  console.log('Replay: %d/%d self-consistent', ok, corpus.cases.length);
  if (failures.length) {
    failures.slice(0, 20).forEach((f) => console.error('  FAIL %s: %s', f.id, f.reason));
    process.exit(1);
  }
}

main();
