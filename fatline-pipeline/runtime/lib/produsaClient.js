// REST client for api.produsa.app — the endpoints the studio already uses
// (src/lib/api.js). Auth via Bearer token (env). Includes a poll-until helper
// for the async build flow (build:instant_ready / production fires over socket;
// here we poll project status, which is socket-independent).
export class ProdusaClient {
  constructor({ apiBase = 'https://api.produsa.app', token = '', pollIntervalMs = 6000, pollTimeoutMs = 900000 } = {}) {
    Object.assign(this, { apiBase, token, pollIntervalMs, pollTimeoutMs });
  }

  async req(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${this.apiBase}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text().catch(() => '');
    let json = {};
    try { json = text ? JSON.parse(text) : {}; } catch { /* non-json */ }
    if (!res.ok) throw new Error(`produsa ${method} ${path} → ${res.status}: ${(json.error || text || '').toString().slice(0, 200)}`);
    return json;
  }

  health() { return this.req('/api/health'); }

  createProject({ name, description, type = 'webapp' }) {
    return this.req('/api/projects', {
      method: 'POST',
      // NOTE: the deployed V2 API validates stage and ONLY accepts 'research' at
      // create (verified 2026-05-23; 'new'/'discovery'/etc. → 400). Prototype-first
      // (#73) is achieved by immediately calling build/instant, not the create stage.
      body: { name, stage: 'research', description, type, metadata: { original_idea: description, app_type: type } },
    });
  }

  getProject(id) { return this.req(`/api/projects/${id}`); }
  discoveryQuestions(id) { return this.req(`/api/projects/${id}/discovery/questions`, { method: 'POST' }); }
  discoveryChat(id, message) { return this.req(`/api/projects/${id}/discovery/chat`, { method: 'POST', body: { message } }); }
  buildInstant(id) { return this.req(`/api/projects/${id}/build/instant`, { method: 'POST' }); }
  buildProduction(id) { return this.req(`/api/projects/${id}/build/production`, { method: 'POST', body: { production_requested: true } }); }
  retryDeploy(id) { return this.req(`/api/projects/${id}/build/retry-deploy`, { method: 'POST' }); }

  // Poll project status until predicate(project) is true (or timeout).
  // failStages short-circuit (e.g. build re-blocked to 'discovery', or 'failed').
  // stallMs: if build_events stop advancing for this long, bail (stuck build).
  async pollUntil(id, predicate, log = () => {}, { failStages = ['discovery', 'failed', 'error'], stallMs = 240000 } = {}) {
    const deadline = Date.now() + this.pollTimeoutMs;
    let last = '', lastEventTs = 0, lastProgressAt = Date.now(), started = false;
    while (Date.now() < deadline) {
      const p = await this.getProject(id).catch((e) => ({ _err: e.message }));
      const proj = p.project || p;
      const stage = proj.stage || p._err || '?';
      if (stage !== last) { log(`    status: ${stage}`); last = stage; if (started && failStages.includes(stage)) throw new Error(`build re-blocked → stage '${stage}' for project ${id}`); }
      if (!started && /building|prototyp|instant/i.test(stage)) started = true;
      const ev = (proj.metadata?.build_events || []);
      const ts = ev.length ? ev[ev.length - 1].ts : 0;
      if (ts > lastEventTs) { lastEventTs = ts; lastProgressAt = Date.now(); const lbl = ev[ev.length - 1]?.payload?.label; if (lbl) log(`      · ${lbl}`); }
      if (!p._err && predicate(proj)) return proj;
      if (started && Date.now() - lastProgressAt > stallMs) throw new Error(`build STALLED for project ${id} (no build_events for ${Math.round(stallMs / 1000)}s; last stage '${stage}')`);
      await new Promise((r) => setTimeout(r, this.pollIntervalMs));
    }
    throw new Error(`pollUntil timeout for project ${id} (last status: ${last})`);
  }
}
