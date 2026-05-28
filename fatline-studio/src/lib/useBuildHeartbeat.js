// useBuildHeartbeat — synthetic build "heartbeat" for the instant-build studio.
//
// Real socket events (build:instant_step / build:instant_ready) are authoritative;
// this hook is the safety net that keeps the elapsed timer ticking, the progress
// bar crawling, the stage rows advancing and the connection pill honest even when
// zero events arrive. No UI, no CSS — A2/A3 render the values this produces.
//
// The pure logic lives in computeHeartbeatState() so it is testable under the
// Node built-in test runner without rendering React (see useBuildHeartbeat.test.js).
import { useState, useRef, useEffect } from 'react';

// Canonical stage timetable. DO NOT change keys — A2/A3 import and rely on them.
export const STAGE_TIMETABLE = [
  { key: 'research',     label: 'Research & brand',  ms: 12000 },
  { key: 'features',     label: 'Features & copy',   ms: 18000 },
  { key: 'architecture', label: 'Architecture',      ms: 10000 },
  { key: 'ux',           label: 'Design & visuals',  ms: 15000 },
  { key: 'building',     label: 'Building pages',    ms: 25000 },
  { key: 'audit',        label: 'Quality audit',     ms: 10000 },
  { key: 'saving',       label: 'Finalizing',        ms: 5000  },
];

// total budget: 95 seconds
export const TOTAL_BUDGET_MS = STAGE_TIMETABLE.reduce((s, x) => s + x.ms, 0);

// Cumulative start offset (ms) for each stage index. [0, 12000, 30000, ...].
const STAGE_STARTS = (() => {
  const out = [];
  let acc = 0;
  for (const s of STAGE_TIMETABLE) { out.push(acc); acc += s.ms; }
  return out;
})();

const PCT_CEILING = 90;        // reserve the last 10% for the real ready event
const GRACE_MS = 8000;         // socket-health grace window
const STUCK_GAP_MS = 120000;   // no events for >120s while building
const LONGER_THAN_USUAL_MS = TOTAL_BUDGET_MS + 30000;

// Coerce to a finite number, else fall back.
function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Index of a canonical stage key, or -1 if unknown.
function indexOfStageKey(key) {
  if (!key) return -1;
  for (let i = 0; i < STAGE_TIMETABLE.length; i++) {
    if (STAGE_TIMETABLE[i].key === key) return i;
  }
  return -1;
}

// Which stage index corresponds to a given elapsed time on the default timetable.
function stageIndexFromElapsed(elapsedMs) {
  if (elapsedMs >= TOTAL_BUDGET_MS) return STAGE_TIMETABLE.length - 1;
  for (let i = STAGE_TIMETABLE.length - 1; i >= 0; i--) {
    if (elapsedMs >= STAGE_STARTS[i]) return i;
  }
  return 0;
}

// Format ms as M:SS with always-two-digit seconds (e.g. 62000 -> "1:02").
function formatElapsed(elapsedMs) {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Pure heartbeat state computation. Never throws — bad inputs fall back to safe
 * defaults (Rule #55 / S3).
 *
 * @param {object} args
 * @param {boolean} args.building       build currently in flight
 * @param {boolean} args.previewReady   real prototype has landed (terminal-true)
 * @param {number|null} args.realPct    latest real pct from socket
 * @param {string|null} args.realStageKey latest real canonical stage key
 * @param {number|null} args.lastEventTs ms ts of last real socket event
 * @param {number|null} args.startTs     ms ts the build started
 * @param {number} args.nowTs            "now" in ms (hook passes Date.now())
 * @param {number} [args.prevPct]        previous pct, for forward-only carry
 * @param {number} [args.elapsedMs]      explicit elapsed override (else computed)
 */
export function computeHeartbeatState(args) {
  const a = args || {};
  const building = !!a.building;
  const previewReady = !!a.previewReady;
  const prevPct = num(a.prevPct, 0);

  const nowTs = num(a.nowTs, num(a.startTs, 0));
  const startTs = a.startTs == null ? null : num(a.startTs, null);

  // Raw wall-clock elapsed since startTs (or explicit override).
  let rawElapsed;
  if (Number.isFinite(a.elapsedMs)) {
    rawElapsed = Math.max(0, Number(a.elapsedMs));
  } else if (startTs != null) {
    rawElapsed = Math.max(0, nowTs - startTs);
  } else {
    rawElapsed = 0;
  }

  // --- Stage selection (real wins, forward-only) ---
  const simIndex = stageIndexFromElapsed(rawElapsed);
  const realIndex = indexOfStageKey(a.realStageKey);
  let stageIndex = simIndex;
  let effectiveElapsed = rawElapsed;
  if (realIndex > simIndex) {
    // Snap forward to the start of the real stage; never go backward.
    stageIndex = realIndex;
    effectiveElapsed = Math.max(rawElapsed, STAGE_STARTS[realIndex]);
  }
  const stageKey = STAGE_TIMETABLE[stageIndex].key;

  // --- Percent (eased, forward-only, ceiling 90 while building) ---
  let pct;
  if (previewReady) {
    pct = 100;
  } else {
    const t = Math.min(1, Math.max(0, effectiveElapsed / TOTAL_BUDGET_MS));
    const eased = 1 - Math.pow(1 - t, 2); // ease-out: hard early, taper late
    let candidate = eased * PCT_CEILING;
    const rp = num(a.realPct, NaN);
    if (Number.isFinite(rp) && rp > candidate) candidate = rp;
    pct = Math.min(candidate, PCT_CEILING);
  }
  // Forward-only: never decrease.
  pct = Math.max(pct, prevPct);
  if (!previewReady) pct = Math.min(pct, PCT_CEILING);
  pct = Math.round(pct * 10) / 10;

  // --- ETA ---
  let etaMs;
  let etaLabel;
  if (previewReady) {
    etaMs = null;
    etaLabel = '';
  } else {
    etaMs = Math.max(0, TOTAL_BUDGET_MS - effectiveElapsed);
    if (effectiveElapsed > LONGER_THAN_USUAL_MS) {
      etaLabel = 'longer than usual';
    } else {
      etaLabel = `~${Math.round(etaMs / 1000)}s left`;
    }
  }

  // --- Connection health ---
  const lastEventTs = a.lastEventTs == null ? null : num(a.lastEventTs, null);
  const sinceEventMs = lastEventTs != null ? Math.max(0, nowTs - lastEventTs) : null;
  const secondsSinceEvent = sinceEventMs != null
    ? Math.floor(sinceEventMs / 1000)
    : Math.floor(rawElapsed / 1000);

  let connection;
  if (!building && !previewReady) {
    connection = 'idle';
  } else if (building && rawElapsed <= GRACE_MS) {
    connection = 'live'; // grace period before any event arrives
  } else if (sinceEventMs != null && sinceEventMs <= GRACE_MS) {
    connection = 'live';
  } else if (building) {
    connection = 'stale';
  } else {
    connection = 'live'; // previewReady, just completed
  }

  // --- Stuck flag ---
  const stuck = building && !previewReady &&
    secondsSinceEvent > 120 && rawElapsed > STUCK_GAP_MS;

  return {
    pct,
    stageKey,
    stageIndex,
    elapsedMs: rawElapsed,
    etaMs,
    etaLabel,
    elapsedLabel: formatElapsed(rawElapsed),
    connection,
    secondsSinceEvent,
    stuck,
  };
}

// Safe fallback state when nothing has started / on error.
const IDLE_STATE = {
  pct: 0,
  stageKey: STAGE_TIMETABLE[0].key,
  stageIndex: 0,
  elapsedMs: 0,
  etaMs: TOTAL_BUDGET_MS,
  etaLabel: '',
  elapsedLabel: '0:00',
  connection: 'idle',
  secondsSinceEvent: 0,
  stuck: false,
};

/**
 * React hook wrapper. Thin layer over computeHeartbeatState() that supplies the
 * 1s ticker, forward-only pct memory and a frozen start timestamp.
 *
 * @param {object} opts see computeHeartbeatState args (minus nowTs/prevPct)
 * @returns {object} heartbeat state
 */
export function useBuildHeartbeat(opts) {
  const o = opts || {};
  const { building = false, previewReady = false } = o;

  // Force a re-render every second while building so the timer/bar advance.
  const [, setTick] = useState(0);
  // Frozen internal start ts used only when caller passes startTs=null.
  const internalStartRef = useRef(null);
  // Forward-only pct memory (survives re-renders).
  const prevPctRef = useRef(0);
  // Last good state, returned if a render ever throws.
  const lastStateRef = useRef(IDLE_STATE);

  // Freeze our own start on the first render where building is true.
  if (building && internalStartRef.current == null && o.startTs == null) {
    internalStartRef.current = Date.now();
  }
  // If a build finished/reset, release the frozen start so the next build is clean.
  if (!building && !previewReady) {
    internalStartRef.current = null;
    prevPctRef.current = 0;
  }

  useEffect(() => {
    if (!building) return undefined;
    const id = setInterval(() => setTick((n) => (n + 1) % 1000000), 1000);
    return () => clearInterval(id);
    // Re-arm if building toggles; cleanup also runs when previewReady flips the
    // caller to building=false on the next render.
  }, [building]);

  // Clear the ticker the instant preview becomes ready (belt-and-braces alongside
  // the building-dependency cleanup above).
  useEffect(() => {
    // no-op effect whose only job is to depend on previewReady; the interval is
    // owned by the [building] effect and is cleared when building goes false.
    return undefined;
  }, [previewReady]);

  let state;
  try {
    const startTs = o.startTs == null ? internalStartRef.current : o.startTs;
    state = computeHeartbeatState({
      building,
      previewReady,
      realPct: o.realPct ?? null,
      realStageKey: o.realStageKey ?? null,
      lastEventTs: o.lastEventTs ?? null,
      startTs: startTs ?? null,
      nowTs: Date.now(),
      prevPct: prevPctRef.current,
    });
    prevPctRef.current = state.pct;
    lastStateRef.current = state;
  } catch {
    // Rule #55: never throw out of the hook.
    state = lastStateRef.current;
  }
  return state;
}

export default useBuildHeartbeat;
