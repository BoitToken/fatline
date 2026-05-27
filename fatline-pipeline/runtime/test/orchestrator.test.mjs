// Orchestrator build self-heal — the Fatline verify→repair mandate applied to a
// flaky build. A build that stalls then recovers must NOT crash; it must re-fire
// via repair and reach ready_to_build, with the work recorded. node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Orchestrator } from '../lib/orchestrator.js';

// Stub generator: prototype is incomplete for the first `stalls` attempts, then completes.
class FlakyGen {
  constructor(stalls) { this.stalls = stalls; this.attempts = 0; }
  async discovery() { return { app_type: 'webapp', negative_constraints: ['no x'], sufficient: true, questions_asked: 5, discovery_answers: { a: 1 }, _currency: { symbol: '₹', code: 'INR' } }; }
  async concept() { return { project_name: 'T', pages: ['Home', 'List'], negative_fence: ['no y'], acceptance_criteria: ['works'] }; }
  async prototype() {
    this.attempts++;
    const incomplete = this.attempts <= this.stalls;
    return {
      pages: incomplete ? ['Home'] : ['Home', 'List'],
      index_html_len: incomplete ? 0 : 185000,
      has_footer: true,
      delivered_links: { studio: 'https://produsa.app/studio/1', proto: 'https://x/preview' },
      _manifestHtml: incomplete ? '' : 'x'.repeat(185000),
      _indexHtml: incomplete ? '' : 'x'.repeat(185000),
      _incomplete: incomplete, _stalled: incomplete, pagesBuilt: incomplete ? 1 : 2,
    };
  }
  async verify() { return { phase: 'prototype', score: 97, decision: 'pass', defects: [] }; }
  async repair() { return { changed_targets: [], repair_log: [] }; }
}

test('build stalls twice then recovers → ready_to_build via repair re-fires', async () => {
  const orch = new Orchestrator({ generator: new FlakyGen(2), surface: 'cli', maxRepairCycles: 3 });
  const jm = await orch.runToPrototype('an idea');
  assert.equal(jm.stage, 'ready_to_build');
  assert.equal(jm.prototype._incomplete, false);
  // two re-fire repairs were recorded (work tracked, not lost)
  const refires = jm.repair_log.filter((r) => r.action === 're-fire build/instant');
  assert.equal(refires.length, 2);
  assert.ok(jm.verification.some((v) => v.defects?.some((d) => /stalled|incomplete/.test(d.symptom))));
});

test('build never recovers within budget → escalates (blocked), does not crash', async () => {
  const orch = new Orchestrator({ generator: new FlakyGen(99), surface: 'cli', maxRepairCycles: 3 });
  const jm = await orch.runToPrototype('an idea');
  assert.equal(jm.stage, 'blocked');
  assert.equal(jm.repair_log.filter((r) => r.action === 're-fire build/instant').length, 3);
  assert.ok(jm.decision_log.some((d) => /escalate/.test(d.note)));
});
