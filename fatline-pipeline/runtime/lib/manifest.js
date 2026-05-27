// The Production Manifest — the Definition of Done (#77–#88).
// productionManifest(signals) runs every checklist item; the app may go `live`
// ONLY when all pass. A failed item is a STOP routed to repair, not a warning.
// Canonical prose: fatline-pipeline/MANIFEST-FATLINE.md + FATBOT-RULES.md Part E.

const STUB_MARKERS = ['TODO', 'FIXME', 'not implemented', 'Lorem ipsum', 'lorem ipsum', 'example@', 'coming soon', 'Component rendered in manifest build'];
const PERF = { bundleFailKb: 400, p95FailMs: 500, lighthouseMin: 85 };

// Each check: (signals) => { id, name, pass, detail }
export const CHECKS = {
  '#77': (s) => {
    const c = s.controls || [];
    const dead = c.filter((x) => !x.wired);
    return mk('#77', 'No dead controls', c.length > 0 && dead.length === 0,
      dead.length ? `${dead.length} dead: ${dead.map((d) => d.id).join(', ')}` : `${c.length} controls wired`);
  },
  '#78': (s) => {
    const e = s.entities || [];
    const lost = e.filter((x) => !x.persisted);
    return mk('#78', 'Persistence round-trip', e.length > 0 && lost.length === 0,
      lost.length ? `not persisted: ${lost.map((x) => x.name).join(', ')}` : `${e.length} entities survive reload`);
  },
  '#79': (s) => {
    const a = s.acceptance || [];
    const failing = a.filter((x) => !x.test_passed);
    return mk('#79', 'Executable acceptance', a.length > 0 && failing.length === 0,
      failing.length ? `${failing.length}/${a.length} criteria lack a passing test` : `${a.length}/${a.length} acceptance tests green`);
  },
  '#80': (s) => {
    const env = s.env || {};
    const ref = new Set(env.referenced || []);
    const declared = new Set(env.declared || []);
    const provisioned = new Set(env.provisioned || []);
    const undeclared = [...ref].filter((k) => !declared.has(k));
    const unprovisioned = [...ref].filter((k) => !provisioned.has(k));
    const boots = env.fresh_boot === true && env.health_ok === true;
    const pass = undeclared.length === 0 && unprovisioned.length === 0 && boots;
    return mk('#80', 'Env & fresh-boot', pass,
      pass ? 'all env declared+provisioned; clean-DB boot + health ok'
        : `undeclared:[${undeclared}] unprovisioned:[${unprovisioned}] boot:${boots}`);
  },
  '#81': (s) => {
    const sm = s.smoke || {};
    const steps = sm.steps || [];
    const failed = steps.filter((x) => !x.pass);
    const pass = sm.target === 'live' && steps.length > 0 && failed.length === 0;
    return mk('#81', 'Live smoke', pass,
      sm.target !== 'live' ? `smoke ran against '${sm.target}', must be 'live'`
        : failed.length ? `failed steps: ${failed.map((x) => x.name).join(', ')}` : `core journey passes on live (${steps.length} steps)`);
  },
  '#82': (s) => {
    const a = s.auth || {};
    const need = ['signup', 'login', 'logout', 'session', 'protected_redirect', 'tenant_isolation'];
    const missing = need.filter((k) => !a[k]);
    return mk('#82', 'Auth & tenant isolation', missing.length === 0,
      missing.length ? `missing: ${missing.join(', ')}` : 'auth + per-user isolation verified', missing.includes('tenant_isolation') ? 'critical' : 'high');
  },
  '#83': (s) => {
    const x = s.security || {};
    const need = ['audit_clean', 'headers', 'sanitized', 'rate_limited', 'no_eval'];
    const missing = need.filter((k) => !x[k]);
    return mk('#83', 'Security gate', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : 'audit+headers+sanitization+rate-limit ok', 'high');
  },
  '#84': (s) => {
    const r = s.resilience || {};
    const need = ['error_boundary', 'errors_surfaced', 'has_404', 'has_500', 'no_unhandled'];
    const missing = need.filter((k) => !r[k]);
    return mk('#84', 'Resilience', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : 'error boundary + states + 404/500 ok');
  },
  '#85': (s) => {
    const i = s.integrations || [];
    const unproven = i.filter((x) => !x.proven);
    // vacuously true only if the contract declared no integrations
    return mk('#85', 'Integrations proven', unproven.length === 0,
      unproven.length ? `mocked/unproven: ${unproven.map((x) => x.name).join(', ')}` : (i.length ? `${i.length} integrations proven in test mode` : 'no integrations declared'));
  },
  '#86': (s) => {
    const o = s.observability || {};
    const need = ['health', 'logging', 'error_tracking', 'uptime'];
    const missing = need.filter((k) => !o[k]);
    return mk('#86', 'Observability', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : 'health+logging+error-tracking+uptime live');
  },
  '#87': (s) => {
    const p = s.perf || {};
    const fails = [];
    if (p.bundle_kb_gz > PERF.bundleFailKb) fails.push(`bundle ${p.bundle_kb_gz}KB>${PERF.bundleFailKb}`);
    if (p.api_p95_ms > PERF.p95FailMs) fails.push(`p95 ${p.api_p95_ms}ms>${PERF.p95FailMs}`);
    if (p.lighthouse < PERF.lighthouseMin) fails.push(`lighthouse ${p.lighthouse}<${PERF.lighthouseMin}`);
    return mk('#87', 'Performance budget', fails.length === 0, fails.length ? fails.join('; ') : 'within budget');
  },
  '#88': (s) => {
    const text = s.source_scan?.text ?? '';
    const hits = STUB_MARKERS.filter((m) => text.includes(m));
    return mk('#88', 'Stub/placeholder scan', hits.length === 0, hits.length ? `stub markers: ${hits.join(', ')}` : 'no stubs in shipped paths');
  },
};

function mk(id, name, pass, detail, severity = 'high') {
  return { id, name, pass: !!pass, detail, severity };
}

// Run the whole Manifest. Returns { pass, score, items, failed }.
export function productionManifest(signals = {}) {
  const items = Object.keys(CHECKS).map((id) => CHECKS[id](signals));
  const failed = items.filter((i) => !i.pass);
  return {
    pass: failed.length === 0,
    score: Math.round(((items.length - failed.length) / items.length) * 100),
    items,
    failed,
  };
}
