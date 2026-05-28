// Node built-in test runner: `node --test src/lib/useBuildHeartbeat.test.js`
// Tests the pure helper computeHeartbeatState — no React rendering required.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeHeartbeatState,
  TOTAL_BUDGET_MS,
  STAGE_TIMETABLE,
} from './useBuildHeartbeat.js';

describe('computeHeartbeatState', () => {
  // 1. Forward-only pct: a later, lower realPct must not drag pct down.
  test('forward-only pct never decreases', () => {
    const first = computeHeartbeatState({
      building: true, realPct: 30, startTs: 0, nowTs: 1000,
    });
    assert.ok(first.pct >= 30, `expected >=30, got ${first.pct}`);
    const second = computeHeartbeatState({
      building: true, realPct: 25, startTs: 0, nowTs: 1000, prevPct: first.pct,
    });
    assert.ok(second.pct >= 30, `expected >=30 after lower realPct, got ${second.pct}`);
    assert.ok(second.pct >= first.pct, 'pct must be monotonic forward');
  });

  // 2. Pct ceiling at 90 while building.
  test('simulated pct is capped at 90 while building (at full budget)', () => {
    const s = computeHeartbeatState({
      building: true, startTs: 0, nowTs: TOTAL_BUDGET_MS,
    });
    assert.ok(s.pct <= 90, `expected <=90, got ${s.pct}`);
  });

  // 3. Snap to 100 on previewReady regardless of elapsed.
  test('previewReady snaps pct to 100', () => {
    const s = computeHeartbeatState({
      building: false, previewReady: true, startTs: 0, nowTs: 1000,
    });
    assert.equal(s.pct, 100);
  });

  // 4. Stage selection from elapsed: 15s -> 3s into "features".
  test('stage derived from elapsed time', () => {
    const s = computeHeartbeatState({ building: true, startTs: 0, nowTs: 15000 });
    assert.equal(s.stageKey, 'features');
  });

  // 5. Real stage wins forward.
  test('real stage key jumps the stage forward', () => {
    const s = computeHeartbeatState({
      building: true, realStageKey: 'audit', startTs: 0, nowTs: 1000,
    });
    assert.equal(s.stageKey, 'audit');
    assert.equal(s.stageIndex, 5);
  });

  // 6. Real stage does not go backward.
  test('real stage key behind simulation is ignored', () => {
    // nowTs=60000 sits in the "building" stage (starts at 55000).
    const s = computeHeartbeatState({
      building: true, realStageKey: 'research', startTs: 0, nowTs: 60000,
    });
    assert.equal(s.stageKey, 'building');
  });

  // 7. Connection live within the grace window before any event.
  test('connection is live within the 8s grace period', () => {
    const s = computeHeartbeatState({
      building: true, lastEventTs: null, startTs: 0, nowTs: 5000,
    });
    assert.equal(s.connection, 'live');
  });

  // 8. Connection stale after an event gap past grace.
  test('connection is stale after >8s event gap while building', () => {
    const now = 100000;
    const s = computeHeartbeatState({
      building: true, lastEventTs: now - 10000, startTs: now - 10000, nowTs: now,
    });
    assert.equal(s.connection, 'stale');
  });

  // 9. Stuck flag.
  test('stuck flag trips after 120s with no events', () => {
    const now = 200000;
    const s = computeHeartbeatState({
      building: true,
      previewReady: false,
      lastEventTs: now - 130000, // secondsSinceEvent = 130
      startTs: now - 130000,     // elapsedMs = 130000
      nowTs: now,
    });
    assert.equal(s.secondsSinceEvent, 130);
    assert.equal(s.elapsedMs, 130000);
    assert.equal(s.stuck, true);
  });

  // 10. etaLabel longer-than-usual past budget + 30s.
  test('etaLabel reads "longer than usual" past budget+30s', () => {
    const s = computeHeartbeatState({
      building: true, startTs: 0, nowTs: TOTAL_BUDGET_MS + 35000,
    });
    assert.equal(s.etaLabel, 'longer than usual');
  });

  // 11. elapsedLabel formatting.
  test('elapsedLabel formats as M:SS with two-digit seconds', () => {
    const a = computeHeartbeatState({ building: true, startTs: 0, nowTs: 62000 });
    assert.equal(a.elapsedLabel, '1:02');
    const b = computeHeartbeatState({ building: true, startTs: 0, nowTs: 9000 });
    assert.equal(b.elapsedLabel, '0:09');
  });
});

describe('sanity', () => {
  test('STAGE_TIMETABLE has 7 stages and a 95s budget', () => {
    assert.equal(STAGE_TIMETABLE.length, 7);
    assert.equal(TOTAL_BUDGET_MS, 95000);
  });
});
