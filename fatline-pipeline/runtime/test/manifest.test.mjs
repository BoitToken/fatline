// Production Manifest (#77–#88) tests — proves each Definition-of-Done check
// passes on a complete build and fails on the gap it guards. node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECKS, productionManifest } from '../lib/manifest.js';

// A fully-built, manifest-passing signal set.
const GOOD = {
  controls: [{ id: 'home:cta', wired: true }],
  entities: [{ name: 'Order', persisted: true }],
  acceptance: [{ criterion: 'can checkout', test_passed: true }],
  env: { referenced: ['DATABASE_URL'], declared: ['DATABASE_URL'], provisioned: ['DATABASE_URL'], fresh_boot: true, health_ok: true },
  smoke: { target: 'live', steps: [{ name: 'signup', pass: true }] },
  auth: { signup: true, login: true, logout: true, session: true, protected_redirect: true, tenant_isolation: true },
  security: { audit_clean: true, headers: true, sanitized: true, rate_limited: true, no_eval: true },
  resilience: { error_boundary: true, errors_surfaced: true, has_404: true, has_500: true, no_unhandled: true },
  integrations: [{ name: 'Razorpay', proven: true }],
  observability: { health: true, logging: true, error_tracking: true, uptime: true },
  perf: { bundle_kb_gz: 210, api_p95_ms: 320, lighthouse: 92 },
  source_scan: { text: '<html>clean</html>' },
};

test('Manifest: complete build → PASS, score 100', () => {
  const r = productionManifest(GOOD);
  assert.equal(r.pass, true);
  assert.equal(r.score, 100);
});

test('#77 dead control → fail', () => {
  assert.equal(CHECKS['#77']({ controls: [{ id: 'x', wired: false }] }).pass, false);
});
test('#78 non-persisted entity → fail', () => {
  assert.equal(CHECKS['#78']({ entities: [{ name: 'Order', persisted: false }] }).pass, false);
});
test('#79 acceptance criterion without passing test → fail', () => {
  assert.equal(CHECKS['#79']({ acceptance: [{ criterion: 'x', test_passed: false }] }).pass, false);
});
test('#80 referenced env not provisioned → fail', () => {
  assert.equal(CHECKS['#80']({ env: { referenced: ['A'], declared: ['A'], provisioned: [], fresh_boot: true, health_ok: true } }).pass, false);
});
test('#81 smoke against staging (not live) → fail', () => {
  assert.equal(CHECKS['#81']({ smoke: { target: 'staging', steps: [{ name: 's', pass: true }] } }).pass, false);
});
test('#82 missing tenant isolation → fail (critical)', () => {
  const r = CHECKS['#82']({ auth: { signup: true, login: true, logout: true, session: true, protected_redirect: true, tenant_isolation: false } });
  assert.equal(r.pass, false);
  assert.equal(r.severity, 'critical');
});
test('#83 npm audit not clean → fail', () => {
  assert.equal(CHECKS['#83']({ security: { audit_clean: false, headers: true, sanitized: true, rate_limited: true, no_eval: true } }).pass, false);
});
test('#84 no error boundary → fail', () => {
  assert.equal(CHECKS['#84']({ resilience: { error_boundary: false, errors_surfaced: true, has_404: true, has_500: true, no_unhandled: true } }).pass, false);
});
test('#85 mocked integration → fail', () => {
  assert.equal(CHECKS['#85']({ integrations: [{ name: 'Stripe', proven: false }] }).pass, false);
});
test('#86 no uptime monitor → fail', () => {
  assert.equal(CHECKS['#86']({ observability: { health: true, logging: true, error_tracking: true, uptime: false } }).pass, false);
});
test('#87 over bundle budget → fail', () => {
  assert.equal(CHECKS['#87']({ perf: { bundle_kb_gz: 500, api_p95_ms: 100, lighthouse: 95 } }).pass, false);
});
test('#88 TODO in shipped source → fail', () => {
  assert.equal(CHECKS['#88']({ source_scan: { text: 'function pay(){ /* TODO */ }' } }).pass, false);
});

test('Manifest aggregate: one failure blocks live + names it', () => {
  const bad = { ...GOOD, integrations: [{ name: 'Stripe', proven: false }] };
  const r = productionManifest(bad);
  assert.equal(r.pass, false);
  assert.ok(r.failed.some((f) => f.id === '#85'));
  assert.ok(r.score < 100);
});
