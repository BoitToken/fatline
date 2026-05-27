// Gate + rule unit tests (node:test, zero dependency). Proves each guard catches
// the failure mode it exists for. Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../lib/gates.js';
import { resolveCurrency, FOOTER } from '../lib/rules.js';

test('#72 discovery: insufficient → pause with build:discovery_required', () => {
  const r = g.gateDiscovery({ surface: 'cli', discovery: { sufficient: false } });
  assert.equal(r.pass, false);
  assert.equal(r.signal, 'build:discovery_required');
});

test('#72 discovery: missing negative constraint → fail', () => {
  const r = g.gateDiscovery({ surface: 'cli', discovery: { sufficient: true, app_type: 'webapp', negative_constraints: [] } });
  assert.equal(r.pass, false);
});

test('#72b WA: >6 questions → fail', () => {
  const r = g.gateDiscovery({ surface: 'whatsapp', discovery: { sufficient: true, app_type: 'webapp', questions_asked: 8, negative_constraints: ['x'] } });
  assert.equal(r.pass, false);
});

test('#72 discovery: sufficient → pass', () => {
  const r = g.gateDiscovery({ surface: 'cli', discovery: { sufficient: true, app_type: 'webapp', questions_asked: 5, negative_constraints: ['x'] } });
  assert.equal(r.pass, true);
});

test('#74b promotion: no explicit approval → block (no auto-promote)', () => {
  assert.equal(g.gatePromotion({ production: { requested: true } }, { explicitApproval: false }).pass, false);
});

test('#73/#74b promotion: explicit + requested → pass', () => {
  assert.equal(g.gatePromotion({ production: { requested: true } }, { explicitApproval: true }).pass, true);
});

test('R5 credits: shortfall → 402', () => {
  const r = g.gateCredits(100, 500);
  assert.equal(r.pass, false);
  assert.equal(r.code, 402);
});

test('R5 credits: enough (with 10% margin) → pass', () => {
  assert.equal(g.gateCredits(1000, 500).pass, true);
});

test('#75 bundler: real source + stub manifest → fatal', () => {
  const r = g.gateBundler({ realIndexLen: 215000, manifestHtml: 'Component rendered in manifest build' });
  assert.equal(r.pass, false);
  assert.equal(r.fatal, true);
});

test('#75 bundler: real source bundled → pass', () => {
  assert.equal(g.gateBundler({ realIndexLen: 200000, manifestHtml: 'x'.repeat(200000) }).pass, true);
});

test('#76 delivery: built but no link → link_gen_failed', () => {
  assert.equal(g.gateDelivery({ buildOk: true, linkGenerated: false, delivered: false }).outcome, 'link_gen_failed');
});

test('#76 delivery: built + link but not delivered → delivery_failed', () => {
  assert.equal(g.gateDelivery({ buildOk: true, linkGenerated: true, delivered: false }).outcome, 'delivery_failed');
});

test('#76 delivery: all ok → delivered', () => {
  assert.equal(g.gateDelivery({ buildOk: true, linkGenerated: true, delivered: true }).pass, true);
});

test('#74 currency: +91 → INR, +1 → USD, EU → EUR, unknown → INR', () => {
  assert.equal(resolveCurrency({ phone: '+91 99999' }).code, 'INR');
  assert.equal(resolveCurrency({ phone: '+1 415 555' }).code, 'USD');
  assert.equal(resolveCurrency({ phone: '+49 30 1234' }).code, 'EUR');
  assert.equal(resolveCurrency({ phone: '' }).code, 'INR'); // default
});

test('R10 footer constant is exact', () => {
  assert.equal(FOOTER, 'Powered by Claude + OpenClaw + Actual Intelligence');
});
