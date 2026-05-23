// Pure signal-extractor tests — these run offline and prove the LiveGenerator's
// Manifest derivation actually detects the failure modes. node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanDeadControls, scanStubs, hasFooter, extractEnvRefs, diffEnv, resilienceMarkers, bundleKb, deriveSignals } from '../lib/signals.js';
import { FOOTER } from '../lib/rules.js';

test('#77 scanDeadControls flags href="#", noop onClick, coming-soon', () => {
  const html = `
    <a href="/orders">Orders</a>
    <a href="#">Dead</a>
    <button onclick="save()">Save</button>
    <button onClick={()=>{}}>Noop</button>
    <button>Coming soon</button>
    <form action="/submit"></form>
    <form></form>`;
  const c = scanDeadControls(html);
  const dead = c.filter((x) => !x.wired);
  assert.equal(c.length, 7);
  assert.equal(dead.length, 4); // href=#, noop button, coming-soon button, actionless form
});

test('#88 scanStubs finds markers, clean text → none', () => {
  assert.deepEqual(scanStubs('all good'), []);
  assert.ok(scanStubs('function x(){ /* TODO */ } Lorem ipsum').includes('TODO'));
});

test('R10 hasFooter exact match', () => {
  assert.equal(hasFooter(`<footer>${FOOTER}</footer>`), true);
  assert.equal(hasFooter('<footer>Powered by something else</footer>'), false);
});

test('#80 env refs + diff against .env.example', () => {
  const src = 'const a=process.env.DATABASE_URL; const b=import.meta.env.VITE_API; const c=process.env.RAZORPAY_KEY;';
  const refs = extractEnvRefs(src);
  assert.deepEqual(refs.sort(), ['DATABASE_URL', 'RAZORPAY_KEY', 'VITE_API']);
  const d = diffEnv(refs, 'DATABASE_URL=\nVITE_API=');
  assert.equal(d.ok, false);
  assert.deepEqual(d.undeclared, ['RAZORPAY_KEY']);
});

test('#84 resilience markers detected', () => {
  const r = resilienceMarkers('class B extends React.Component { componentDidCatch(){} } function NotFound(){} fetch().catch(e=>setError(e))');
  assert.equal(r.error_boundary, true);
  assert.equal(r.has_404, true);
  assert.equal(r.errors_surfaced, true);
});

test('#87 bundleKb estimates gzip from raw when only raw known', () => {
  assert.equal(bundleKb(320 * 1024, 100 * 1024), 100);
  assert.ok(bundleKb(320 * 1024) < 110); // ~raw/3.2
});

test('deriveSignals: clean artifact + backend signals → derivable signals present', () => {
  const s = deriveSignals({
    liveHtml: `<a href="/x">x</a><footer>${FOOTER}</footer>`,
    source: 'process.env.DATABASE_URL',
    envExample: 'DATABASE_URL=',
    bundleRawBytes: 200 * 1024,
    acceptance: [{ criterion: 'checkout', test_passed: true }],
    backendSignals: { smoke: { target: 'live', steps: [{ name: 's', pass: true }] }, fresh_boot: true, health_ok: true, provisioned: ['DATABASE_URL'] },
  });
  assert.equal(s._footer_ok, true);
  assert.deepEqual(s.env.referenced, ['DATABASE_URL']);
  assert.deepEqual(s.env.provisioned, ['DATABASE_URL']);
  assert.equal(s.smoke.target, 'live');
  assert.equal(s.controls.filter((c) => !c.wired).length, 0);
});

test('deriveSignals: missing backend signals → fail-safe (empty entities/auth) #B2', () => {
  const s = deriveSignals({ liveHtml: '<div>x</div>' });
  assert.deepEqual(s.entities, []);   // unknown → empty → #78 will fail
  assert.deepEqual(s.auth, {});       // unknown → #82 will fail
});
