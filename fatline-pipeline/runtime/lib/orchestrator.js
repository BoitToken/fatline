// Fatline orchestrator — runs the 6-stage FatBot pipeline over the job-memory
// artifact, enforcing the gates from FATBOT-RULES.md. Generator-agnostic.
import { randomUUID } from 'node:crypto';
import { loadAgents, systemPromptFor } from './agents.js';
import { FOOTER, resolveCurrency } from './rules.js';
import * as gates from './gates.js';
import { productionManifest } from './manifest.js';

export class Orchestrator {
  constructor({ generator, surface = 'cli', phone = '', log = () => {}, maxRepairCycles = 3 }) {
    this.gen = generator;
    this.surface = surface;
    this.phone = phone;
    this.log = log;
    this.maxRepairCycles = maxRepairCycles;
    this.agents = loadAgents();
  }

  newJob(idea) {
    return {
      job_id: randomUUID().slice(0, 8),
      created_at: new Date().toISOString(),
      surface: this.surface,
      idea,
      stage: 'new',
      verification: [],
      repair_log: [],
      decision_log: [],
      completion_log: [],
    };
  }

  _complete(jm, agent, outcome, notes) {
    jm.completion_log.push({ agentId: agent, outcome, notes, at: new Date().toISOString() }); // Rule R6
  }
  _decide(jm, note) { jm.decision_log.push({ note, at: new Date().toISOString() }); }

  // Run the FREE path: discovery → concept → prototype → verify/repair → ready_to_build.
  async runToPrototype(idea) {
    const jm = this.newJob(idea);
    jm.timings = {};
    let _t = Date.now();
    const mark = (phase) => { const now = Date.now(); jm.timings[phase] = +((now - _t) / 1000).toFixed(1); this.log(`  ⏱ ${phase}: ${jm.timings[phase]}s`); _t = now; };

    // --- Discovery (FatScout) ---
    jm.stage = 'discovery';
    this.log(`[discovery] system prompt: ${systemPromptFor('discovery', this.agents, jm).length} chars`);
    jm.discovery = await this.gen.discovery({ idea, surface: this.surface, phone: this.phone });
    jm.currency = jm.discovery._currency || resolveCurrency({ phone: this.phone, briefText: idea }); // Rule #74
    delete jm.discovery._currency;
    const g72 = gates.gateDiscovery(jm);
    this.log(`  gate #72 → ${g72.pass ? 'PASS' : 'PAUSE'} (${g72.reason})`);
    if (!g72.pass) { jm.stage = 'blocked'; this._decide(jm, g72.signal || g72.reason); return jm; }
    this._complete(jm, 'fatline-discovery-director', 'success', 'discovery sufficient');
    mark('discovery');

    // --- Concept (FatArchitect) ---
    jm.stage = 'concept';
    jm.concept = await this.gen.concept({ jm });
    this._decide(jm, `concept: ${jm.concept.project_name} (${jm.concept.pages.length} pages)`);
    this._complete(jm, 'fatline-concept-architect', 'success', 'contract + fence + acceptance ready');
    mark('concept');

    // --- Prototype (FatProto) — free, fires automatically (Rule #73) ---
    jm.stage = 'prototype';
    jm.prototype = await this.gen.prototype({ jm });
    // R10 footer is a content rule — a missing footer is a verification defect
    // routed to FatJudge/repair, NOT a fatal crash (the generator may be a
    // black box that doesn't inject it; the verifier scores + routes it).
    if (!jm.prototype.has_footer) { this.log('  ⚠ R10: footer not detected — routing to verification'); this._decide(jm, 'R10 footer missing → verify/repair'); }
    const gB = gates.gateBundler({ realIndexLen: jm.prototype.index_html_len, manifestHtml: jm.prototype._manifestHtml || '' });
    this.log(`  gate #75 → ${gB.pass ? 'PASS' : 'FAIL'} (${gB.reason})`);
    if (gB.fatal) throw new Error(gB.reason);                                                       // Rule #75 hard error
    this._complete(jm, 'fatline-prototype-builder', 'success', `${jm.prototype.pages.length} pages`);
    mark('build');

    // --- Verify + bounded repair loop (FatJudge ⇄ Repair) ---
    await this._verifyRepairLoop(jm, 'prototype');
    mark('verify');

    // --- Delivery check (Rule #76) ---
    const links = jm.prototype.delivered_links || {};
    // For an instant prototype the deliverable is the preview/studio link
    // (no subdomain until production), so either link counts as "generated".
    const gD = gates.gateDelivery({ buildOk: true, linkGenerated: !!(links.proto || links.studio), delivered: !!(links.studio || links.proto) });
    this.log(`  gate #76 → ${gD.pass ? 'PASS' : 'FAIL'} (${gD.reason})`);
    if (!gD.pass) { jm.stage = 'repairing'; this._decide(jm, `#76 ${gD.outcome} → repair`); return jm; }

    jm.timings.total = +Object.values(jm.timings).reduce((a, b) => a + b, 0).toFixed(1);
    jm.stage = 'ready_to_build'; // explicit promotion required next (Rule #73/#74b)
    this._decide(jm, 'prototype verified + delivered; awaiting explicit build approval (#73)');
    return jm;
  }

  async _verifyRepairLoop(jm, phase) {
    for (let cycle = 1; cycle <= this.maxRepairCycles; cycle++) {
      jm.stage = 'verifying';
      const v = await this.gen.verify({ jm, phase });
      jm.verification.push(v);
      this.log(`  [verify ${phase} c${cycle}] score=${v.score} → ${v.decision}`);
      // Prototype phase is a free preview: 'conditional' (90–94, P2/P3 only) ships
      // with the defects noted (D4 rubric). Production stays strict (pass only).
      const acceptable = v.decision === 'pass' || (phase === 'prototype' && v.decision === 'conditional');
      if (acceptable) { this._complete(jm, 'fatline-verification-orchestrator', v.decision === 'pass' ? 'success' : 'partial', `score ${v.score} (${v.decision})`); return; }
      if (cycle === this.maxRepairCycles) {
        jm.stage = 'blocked';
        this._decide(jm, `#49 escalate: score <95 after ${cycle} cycles`);
        this._complete(jm, 'fatline-verification-orchestrator', 'failure', `escalated at ${v.score}`);
        return;
      }
      jm.stage = 'repairing';
      const r = await this.gen.repair({ jm, defects: v.defects });
      jm.repair_log.push(...(r.repair_log || []));
      this.log(`  [repair c${cycle}] fixed: ${(r.changed_targets || []).join(', ')}`);
      this._complete(jm, 'fatline-repair-engineer', 'success', `patched ${(r.changed_targets || []).length} targets`);
    }
  }

  // Run the PAID path after explicit promotion (Rule #73/#74b + R5 credits).
  async promoteToProduction(jm, { explicitApproval, approvedBy, balance, estimate }) {
    jm.production = jm.production || {};
    jm.production.requested = explicitApproval === true;        // set by the explicit CTA
    jm.production.approved_by = approvedBy;

    const gP = gates.gatePromotion(jm, { explicitApproval });
    this.log(`  gate #73/#74b → ${gP.pass ? 'PASS' : 'BLOCK'} (${gP.reason})`);
    if (!gP.pass) { jm.stage = 'ready_to_build'; this._decide(jm, gP.reason); return jm; }

    const gC = gates.gateCredits(balance, estimate);
    this.log(`  gate R5 → ${gC.pass ? 'PASS' : `HTTP ${gC.code}`} (${gC.reason})`);
    if (!gC.pass) { jm.stage = 'ready_to_build'; jm.decision_log.push({ note: gC.reason, code: gC.code }); return jm; }

    jm.stage = 'production';
    const out = await this.gen.produce({ jm });
    Object.assign(jm.production, { plan: out.plan, deployment: out.deployment, delivered_links: out.delivered_links });

    await this._verifyRepairLoop(jm, 'production');
    if (jm.stage === 'blocked') return jm;

    const gD = gates.gateDelivery({ buildOk: out.build_ok, linkGenerated: out.link_generated, delivered: out.delivered });
    this.log(`  gate #76 (prod) → ${gD.pass ? 'PASS' : 'FAIL'} (${gD.reason})`);
    if (!gD.pass) { jm.stage = 'repairing'; this._decide(jm, `#76 ${gD.outcome}`); return jm; }

    // Production Manifest — the Definition of Done (#77–#88). Must fully pass before live.
    const man = productionManifest(out.manifest || {});
    jm.production.manifest = { score: man.score, items: man.items };
    this.log(`  Manifest (#77–#88) → ${man.pass ? 'PASS' : 'FAIL'} (score ${man.score}, ${man.failed.length} failed)`);
    for (const f of man.failed) this.log(`     ✗ ${f.id} ${f.name}: ${f.detail}`);
    if (!man.pass) {
      jm.stage = 'repairing';
      this._decide(jm, `Manifest incomplete (${man.failed.map((f) => f.id).join(', ')}) → repair, not live`);
      this._complete(jm, 'fatline-verification-orchestrator', 'failure', `manifest score ${man.score}`);
      return jm;
    }

    jm.stage = 'live';
    this._decide(jm, `live at ${jm.production.deployment?.url} (manifest ${man.score}/100)`);
    return jm;
  }
}
