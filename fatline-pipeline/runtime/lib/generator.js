// Generator abstraction. The orchestrator is generator-agnostic: in dry-run it
// uses MockGenerator (deterministic, offline); --live uses LiveGenerator wired
// to the model (Anthropic) + api.produsa.app endpoints + Manifest signal extractors.
import { FOOTER, resolveCurrency } from './rules.js';
import { ModelClient } from './modelClient.js';
import { ProdusaClient } from './produsaClient.js';
import { loadAgents, systemPromptFor } from './agents.js';
import { deriveSignals, scanStubs, scanDeadControls, hasFooter } from './signals.js';

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

// Real generator: model reasoning (FatBot SKILL prompts) + api.produsa.app build
// endpoints + Manifest signal extraction. Production (paid) build is gated behind
// allowProduction. NOTE: a few produsa response field names below are best-effort
// against the studio's api.js contract — adjust to the live schema as confirmed.
export class LiveGenerator {
  constructor({ apiBase = 'https://api.produsa.app', model = 'claude-opus-4-7', token, anthropicKey, allowProduction = false, pollIntervalMs, pollTimeoutMs, log = () => {} } = {}) {
    this.allowProduction = allowProduction;
    this.log = log;
    this.model = new ModelClient({ apiKey: anthropicKey, model });
    this.api = new ProdusaClient({ apiBase, token, pollIntervalMs, pollTimeoutMs });
    this.agents = loadAgents();
    this.projectId = null;
  }

  _sys(stage, jm) { return systemPromptFor(stage, this.agents, jm); }
  _pid(jm) { return this.projectId || jm?.discovery?._projectId; }

  async discovery({ idea, surface, phone }) {
    const created = await this.api.createProject({ name: idea.slice(0, 60), description: idea });
    this.projectId = created.project?.id || created.id || created.projectId;
    this.log(`    created project ${this.projectId}`);

    // Drive the backend's conversational discovery (this persists discovery_answers,
    // which build/instant requires — Rule #72 is enforced server-side). The model
    // (discovery-director SKILL) answers each adaptive question grounded in the idea.
    const sys = this._sys('discovery', { discovery: {} });
    let resp = await this.api.discoveryChat(this.projectId, idea);
    let asked = 0;
    const max = 6; // Rule #72b
    while (!resp.isComplete && resp.question && asked < max) {
      asked++;
      this.log(`    discovery Q${asked}: ${String(resp.question).slice(0, 70)}…`);
      const ans = await this.model.text({
        system: sys,
        user: `Idea: ${idea}\nDiscovery question: ${resp.question}\nAnswer concisely (1-2 sentences) as the founder. Plain text only, no preamble.`,
      });
      resp = await this.api.discoveryChat(this.projectId, ans.trim());
    }

    const proj = await this.api.getProject(this.projectId).then((r) => r.project || r);
    const m = proj.metadata || {};
    const cls = resp.classification || {};
    const currency = { symbol: m.currency_symbol || '₹', code: m.currency_code || 'INR' };
    const da = resp.discoveryAnswers || m.discovery_answers || {};

    // Synthesize the structured discovery fields (and the explicit negative fence
    // Rule #72 wants) from the completed conversation.
    let synth = {};
    try {
      synth = await this.model.json({
        system: sys,
        user: `Idea: ${idea}\nClassification: ${JSON.stringify(cls)}\nDiscovery answers: ${JSON.stringify(da)}\n`
          + `Return ONLY JSON: target_users, primary_outcome, core_loop, platform, success_criteria (array), `
          + `negative_constraints (array, >=2 explicit anti-goals), risk_flags (array).`,
      });
    } catch { /* keep going with backend answers */ }

    return {
      app_type: cls.app_type || m.app_type || 'webapp',
      target_users: synth.target_users || '',
      primary_outcome: synth.primary_outcome || '',
      core_loop: synth.core_loop || '',
      platform: synth.platform || 'responsive web',
      success_criteria: synth.success_criteria || [],
      negative_constraints: synth.negative_constraints?.length ? synth.negative_constraints : ['no generic template feel'],
      risk_flags: synth.risk_flags || [],
      discovery_answers: da,
      questions_asked: asked,
      sufficient: !!resp.isComplete || Object.keys(da).length > 0,
      market_snapshot: { currency, classification: cls },
      _currency: currency,
      _projectId: this.projectId,
    };
  }

  async concept({ jm }) {
    const user = `Discovery: ${JSON.stringify(jm.discovery)}\nCurrency: ${jm.currency.code}.\n`
      + `Return ONLY JSON: project_name, synopsis, build_type, pages (5-6 strings), feature_tiers {must:[],later:[]}, `
      + `style_tokens (object), negative_fence (array >=1), mock_data_schema (object), acceptance_criteria (array of TESTABLE strings).`;
    return this.model.json({ system: this._sys('concept', jm), user });
  }

  async prototype({ jm, rebuild = false }) {
    const id = this._pid(jm);
    this.log(`    build/instant ${rebuild ? 're-fired (repair)' : 'fired'} for ${id}; polling status…`);
    await this.api.buildInstant(id);
    // A stalled/timed-out build is NOT a crash — it's an incomplete artifact the
    // verify→repair loop owns (Fatline mandate). Catch the stall and report it.
    let p, stalled = false;
    try {
      p = await this.api.pollUntil(id, (pr) => /instant_prototype|prototype|ready|live/i.test(pr.stage || '') || pr.prototype_index_html, this.log);
    } catch (e) {
      stalled = true;
      this.log(`    ⚠ build did not complete: ${e.message}`);
      p = await this.api.getProject(id).then((r) => r.project || r).catch(() => ({}));
    }
    const indexHtml = p.prototype_index_html || '';
    const pages = (p.prototype_manifest?.pages || []).map((x) => x.name || x.id) || Object.keys(p.prototype_pages || {});
    const complete = indexHtml.length > 10_000; // real prototype saved
    return {
      pages,
      index_html_len: indexHtml.length,
      manifest_html_len: (p.manifest_html || indexHtml).length,
      has_footer: hasFooter(indexHtml),
      verification_targets: pages.map((pg) => `route:/${String(pg).toLowerCase()}`),
      delivered_links: { proto: p.metadata?.proto_url || p.proto_url, studio: p.metadata?.studio_url || `https://produsa.dev/studio/${id}` },
      _manifestHtml: p.manifest_html || indexHtml,
      _indexHtml: indexHtml,
      _incomplete: !complete,
      _stalled: stalled,
      pagesBuilt: pages.length,
    };
  }

  // Approximate the 4-channel check from the artifact (static + behavioral + visual).
  // Full runtime/visual channels need Playwright; this catches the high-frequency defects.
  async verify({ jm, phase }) {
    const html = phase === 'production' ? (jm.production?._liveHtml || '') : (jm.prototype?._indexHtml || '');
    const defects = [];
    const stubs = scanStubs(html);
    if (stubs.length) defects.push({ channel: 'static', severity: 'P2', symptom: `stub markers: ${stubs.join(', ')}`, target_file_or_component: 'bundle', recommended_owner: 'fatline-repair-engineer' });
    const dead = scanDeadControls(html).filter((c) => !c.wired);
    if (dead.length) defects.push({ channel: 'behavioral', severity: 'P2', symptom: `${dead.length} dead controls`, target_file_or_component: 'ui', recommended_owner: 'fatline-repair-engineer' });
    if (html && !hasFooter(html)) defects.push({ channel: 'visual', severity: 'P3', symptom: 'footer missing (R10)', target_file_or_component: 'footer', recommended_owner: 'fatline-prototype-builder' });
    // Weighted score (D4 rubric): P1 −40, P2 −6, P3 −3. Any P1 → fail outright.
    const weight = { P1: 40, P2: 6, P3: 3 };
    const score = Math.max(0, 100 - defects.reduce((s, d) => s + (weight[d.severity] || 6), 0));
    const hasP1 = defects.some((d) => d.severity === 'P1');
    const decision = hasP1 || score < 90 ? 'fail' : score >= 95 ? 'pass' : 'conditional';
    return { phase, score, decision, defects };
  }

  async repair({ jm, defects }) {
    const id = this._pid(jm);
    const deployClass = defects.some((d) => /bundle|deliver|stub/i.test(d.symptom || ''));
    if (deployClass) { this.log('    repair: retry-deploy (#75/#76 class)'); await this.api.retryDeploy(id).catch(() => {}); }
    return {
      changed_targets: defects.map((d) => d.target_file_or_component),
      repair_log: defects.map((d) => ({ defect: d.symptom, fix: deployClass ? 'retry-deploy/re-bundle' : 'patch proposed', cause: d.probable_cause || 'see defect' })),
    };
  }

  async produce({ jm }) {
    if (!this.allowProduction) {
      throw new Error('Production build is GATED. Re-run with --allow-production to fire the paid POST /build/production (R5). Refusing to auto-fire against prod.');
    }
    const id = this._pid(jm);
    await this.api.buildProduction(id);
    this.log(`    build/production fired for ${id}; polling…`);
    const p = await this.api.pollUntil(id, (pr) => /live|deployed/i.test(pr.stage || ''), this.log);
    const url = p.metadata?.live_url || p.live_url || p.deploy_url || '';
    const liveHtml = url ? await fetch(url).then((r) => r.text()).catch(() => '') : '';
    jm.production = jm.production || {}; jm.production._liveHtml = liveHtml;
    const smoke = { target: 'live', steps: [{ name: 'home reachable', pass: url ? (await fetch(url).then((r) => r.status === 200).catch(() => false)) : false }] };
    const manifest = deriveSignals({
      liveHtml,
      source: p.metadata?.source_sample || '',
      envExample: p.metadata?.env_example || '',
      bundleRawBytes: p.metadata?.bundle_bytes || 0,
      acceptance: (jm.concept?.acceptance_criteria || []).map((c) => ({ criterion: c, test_passed: !!p.metadata?.acceptance?.[c] })),
      backendSignals: { ...(p.metadata?.manifest_signals || {}), smoke },
    });
    return {
      plan: p.metadata?.production_plan || {},
      deployment: { url, six_step: p.metadata?.six_step || {} },
      delivered_links: { live: url },
      build_ok: true, link_generated: !!url, delivered: !!url,
      manifest,
    };
  }
}
