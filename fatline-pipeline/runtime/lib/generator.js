// Generator abstraction. The orchestrator is generator-agnostic: in dry-run it
// uses MockGenerator (deterministic, offline); in production you wire
// LiveGenerator to the model + api.produsa.app endpoints.
import { FOOTER, resolveCurrency } from './rules.js';

// Deterministic, offline stand-in for the LLM + build workers. Produces
// realistic-shaped artifacts and intentionally exercises every gate, including
// a first-pass verification defect so the bounded repair loop runs.
export class MockGenerator {
  constructor(opts = {}) { this.opts = opts; this._protoPass = 0; }

  async discovery({ idea, surface, phone }) {
    const appType = /shop|store|sell|cart|commerce/i.test(idea) ? 'ecommerce'
      : /crm|leads|pipeline|sales/i.test(idea) ? 'crm'
      : /landing|waitlist/i.test(idea) ? 'landing' : 'webapp';
    const currency = resolveCurrency({ phone, briefText: idea });
    return {
      app_type: appType,
      target_users: 'early-adopter SMB owners in India',
      primary_outcome: 'complete the core action in the first session',
      core_loop: 'open → act → see result → return',
      platform: 'responsive web',
      success_criteria: ['first-run success < 60s', 'no dead-end states'],
      negative_constraints: ['no generic AI-SaaS purple-gradient tropes', 'do not collect PII before value is shown'],
      risk_flags: [],
      discovery_answers: {
        'who is it for': 'SMB owners',
        'first successful session': 'they finish the core action and see a real result',
        'must not become': 'a cluttered enterprise dashboard',
      },
      questions_asked: surface === 'whatsapp' ? 5 : 6,
      sufficient: true,
      market_snapshot: { competitors: ['Comp A', 'Comp B', 'Comp C'], sizing: { tam: '₹X', sam: '₹Y', som: '₹Z' }, currency },
      _currency: currency,
    };
  }

  async concept({ jm }) {
    const c = jm.currency;
    return {
      project_name: 'Acme Quickstart',
      synopsis: `A ${jm.discovery.app_type} that gets ${jm.discovery.target_users} to value fast.`,
      build_type: jm.discovery.app_type,
      pages: ['Dashboard', 'Core Action', 'List', 'Detail', 'Settings'],
      feature_tiers: { must: ['core loop', 'list+detail'], later: ['team', 'billing'] },
      style_tokens: { theme: 'Dark Luxury', bg: '#050505', accent: '#F59E0B', heading: 'Space Grotesk', body: 'Inter' },
      negative_fence: jm.discovery.negative_constraints.concat(['no dropdowns for <4 options', 'no empty ₹0.00 cells']),
      mock_data_schema: { records: 12, image_field: true, currency: c },
      acceptance_criteria: ['renders 390/768/1440', 'core loop navigable', 'no ₹0.00 placeholders', `footer "${FOOTER}" present`],
    };
  }

  async prototype({ jm }) {
    const pages = jm.concept.pages;
    // Realistic shell: the bundler did the right thing — real source is bundled,
    // so the manifest HTML is comparable in size to the index (passes #75 guard).
    const realContent = pages.map((p) => `<section data-page="${p}">${'x'.repeat(40_000)}</section>`).join('\n');
    const manifestHtml = `<html><body>${realContent}<footer>${FOOTER}</footer></body></html>`;
    return {
      pages,
      index_html_len: manifestHtml.length,
      manifest_html_len: manifestHtml.length, // real source bundled (not a stub)
      has_footer: manifestHtml.includes(FOOTER),
      verification_targets: pages.map((p) => `route:/${p.toLowerCase().replace(/\s+/g, '-')}`),
      delivered_links: { proto: 'https://proto.example.produsa.dev/abc', studio: 'https://produsa.dev/studio/abc' },
      _manifestHtml: manifestHtml,
    };
  }

  async verify({ jm, phase }) {
    this._protoPass += 1;
    // First prototype pass finds a defect (exercise repair); re-verify passes.
    if (phase === 'prototype' && this._protoPass === 1) {
      return {
        phase, score: 88, decision: 'fail',
        defects: [{
          channel: 'visual', severity: 'P2', symptom: 'Detail page shows ₹0.00 in price cell',
          probable_cause: 'mock record missing price', target_file_or_component: 'DetailPage',
          selector_or_route: 'route:/detail', viewport: 390, repro_steps: ['open /detail'],
          recommended_owner: 'fatline-repair-engineer',
        }],
      };
    }
    return { phase, score: 97, decision: 'pass', defects: [] };
  }

  async repair({ jm, defects }) {
    return {
      changed_targets: defects.map((d) => d.target_file_or_component),
      repair_log: defects.map((d) => ({ defect: d.symptom, fix: 'populated real price from mock schema', cause: d.probable_cause })),
    };
  }

  async produce({ jm }) {
    const pages = jm.concept?.pages || [];
    const criteria = jm.concept?.acceptance_criteria || [];
    // Manifest signals (#77–#88). MockGenerator models a fully-built app that
    // PASSES the Manifest; flip any field to see the gate stop the deploy.
    const manifest = {
      controls: pages.flatMap((p) => [{ id: `${p}:primary-cta`, wired: true }, { id: `${p}:nav`, wired: true }]), // #77
      entities: [{ name: 'Order', persisted: true }, { name: 'Customer', persisted: true }],                       // #78
      acceptance: criteria.map((c) => ({ criterion: c, test_passed: true })),                                      // #79
      env: { referenced: ['DATABASE_URL', 'RAZORPAY_KEY'], declared: ['DATABASE_URL', 'RAZORPAY_KEY'], provisioned: ['DATABASE_URL', 'RAZORPAY_KEY'], fresh_boot: true, health_ok: true }, // #80
      smoke: { target: 'live', steps: [{ name: 'signup', pass: true }, { name: 'core-action', pass: true }, { name: 'persist', pass: true }, { name: 'logout', pass: true }] }, // #81
      auth: { signup: true, login: true, logout: true, session: true, protected_redirect: true, tenant_isolation: true }, // #82
      security: { audit_clean: true, headers: true, sanitized: true, rate_limited: true, no_eval: true },          // #83
      resilience: { error_boundary: true, errors_surfaced: true, has_404: true, has_500: true, no_unhandled: true }, // #84
      integrations: [{ name: 'Razorpay', proven: true }, { name: 'SES email', proven: true }],                    // #85
      observability: { health: true, logging: true, error_tracking: true, uptime: true },                         // #86
      perf: { bundle_kb_gz: 210, api_p95_ms: 320, lighthouse: 92 },                                               // #87
      source_scan: { text: '<html>real source, no stubs</html>' },                                                // #88
    };
    return {
      plan: { architecture: 'node+postgres', auth: 'email+oauth', integrations: ['Razorpay (INR)', 'SES email'] },
      deployment: {
        url: 'https://acme-quickstart.produsa.dev',
        six_step: { dns: true, ssl: true, https200: true, content: true, service: true, nginx: true },
      },
      delivered_links: { live: 'https://acme-quickstart.produsa.dev' },
      build_ok: true, link_generated: true, delivered: true,
      manifest,
    };
  }
}

// Stub showing where a real implementation plugs in. Not used in dry-run.
export class LiveGenerator {
  constructor({ apiBase = 'https://api.produsa.app', model = 'anthropic/claude-opus-4-7', token } = {}) {
    Object.assign(this, { apiBase, model, token });
  }
  async discovery() { throw new Error('LiveGenerator: wire to model + POST /api/discovery/questions'); }
  async concept() { throw new Error('LiveGenerator: wire to model with the concept-architect system prompt'); }
  async prototype() { throw new Error('LiveGenerator: wire to POST /api/projects/:id/build/instant'); }
  async verify() { throw new Error('LiveGenerator: wire to the 4-channel verifier (playwright + static + runtime)'); }
  async repair() { throw new Error('LiveGenerator: wire to the repair worker'); }
  async produce() { throw new Error('LiveGenerator: wire to POST /api/projects/:id/build/production'); }
}
