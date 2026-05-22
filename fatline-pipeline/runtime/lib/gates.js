// Quality gates as code — the enforcement points the audit found "specified but
// not implemented". Each returns { pass, code?, reason, signal? }.
// Rule references map to fatline-pipeline/FATBOT-RULES.md.

// Rule #72 — Discovery is Not Optional. Empty/insufficient discovery pauses the build.
export function gateDiscovery(jm) {
  const d = jm.discovery || {};
  if (!d.sufficient || !d.app_type) {
    return { pass: false, signal: 'build:discovery_required', reason: 'discovery_answers empty/insufficient (#72)' };
  }
  // #72b — at most 6 questions on conversational surfaces.
  if (jm.surface === 'whatsapp' && d.questions_asked > 6) {
    return { pass: false, reason: `WA discovery exceeded 6 questions (#72b): ${d.questions_asked}` };
  }
  // #72 — at least one explicit negative constraint.
  if (!(d.negative_constraints || []).length) {
    return { pass: false, reason: 'no explicit negative constraint (#72)' };
  }
  return { pass: true, reason: 'discovery sufficient (#72)' };
}

// Rules #73 / #74b — Production fires ONLY on explicit promotion. Anything else = pipeline bug.
export function gatePromotion(jm, { explicitApproval = false } = {}) {
  const requested = jm.production && jm.production.requested === true;
  if (explicitApproval && requested) {
    return { pass: true, reason: 'explicit promotion + production_requested=true (#73/#74b)' };
  }
  return {
    pass: false,
    reason: explicitApproval
      ? 'production_requested flag not set (#74b)'
      : 'no explicit build-live approval — refusing to auto-promote (#74b)',
  };
}

// Rule R5 — credit pre-check on the PAID production phase. 402 on shortfall.
export function gateCredits(balance, estimate) {
  const required = Math.ceil(estimate * 1.1); // ≥10% safety margin
  if (balance >= required) return { pass: true, reason: `credits ok (${balance} ≥ ${required})` };
  return { pass: false, code: 402, reason: `insufficient credits: balance ${balance} < required ${required}`, shortfall: required - balance };
}

// Rule #75 — bundler placeholder must NEVER ship when real source exists. Hard error.
const PLACEHOLDER_MARKERS = ['Component rendered in manifest build', 'Component rendered', 'Loading...', 'placeholder'];
export function gateBundler({ realIndexLen = 0, manifestHtml = '' }) {
  const looksPlaceholder = PLACEHOLDER_MARKERS.some((m) => manifestHtml.includes(m));
  const manifestLen = manifestHtml.length;
  // Real source big but manifest tiny/placeholder → the 2026-05-07 incident.
  if (realIndexLen > 50_000 && (manifestLen < 10_000 || looksPlaceholder)) {
    return { pass: false, fatal: true, reason: `#75 violation: real source ${realIndexLen}B but manifest ${manifestLen}B${looksPlaceholder ? ' (placeholder)' : ''} — re-bundle required` };
  }
  if (looksPlaceholder && realIndexLen > 0) {
    return { pass: false, fatal: true, reason: '#75 violation: placeholder markers present with real source' };
  }
  return { pass: true, reason: `bundle ok (${manifestLen}B)` };
}

// Rule #76 — Delivery is part of "done". Four-outcome classifier.
export function gateDelivery({ buildOk, linkGenerated, delivered }) {
  if (!buildOk) return { pass: false, outcome: 'build_failed', reason: 'build failed (#76)' };
  if (!linkGenerated) return { pass: false, outcome: 'link_gen_failed', reason: 'build ok but link generation failed (#76) → repair' };
  if (!delivered) return { pass: false, outcome: 'delivery_failed', reason: 'build ok but surface delivery failed (#76) → repair' };
  return { pass: true, outcome: 'delivered', reason: 'build + delivery ok (#76)' };
}
