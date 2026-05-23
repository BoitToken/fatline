// REST client for api.produsa.app — the endpoints the studio already uses
// (src/lib/api.js). Auth via Bearer token (env). Includes a poll-until helper
// for the async build flow (build:instant_ready / production fires over socket;
// here we poll project status, which is socket-independent).
export class ProdusaClient {
  constructor({ apiBase = 'https://api.produsa.app', token = '', pollIntervalMs = 5000, pollTimeoutMs = 1200000 } = {}) {
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
      // Prototype-first (Rule #73): enter at 'new', not 'research'.
      body: { name, stage: 'new', description, type, metadata: { original_idea: description, app_type: type } },
    });
  }

  getProject(id) { return this.req(`/api/projects/${id}`); }
  discoveryQuestions(id) { return this.req(`/api/projects/${id}/discovery/questions`, { method: 'POST' }); }
  discoveryChat(id, message) { return this.req(`/api/projects/${id}/discovery/chat`, { method: 'POST', body: { message } }); }
  buildInstant(id) { return this.req(`/api/projects/${id}/build/instant`, { method: 'POST' }); }
  buildProduction(id) { return this.req(`/api/projects/${id}/build/production`, { method: 'POST', body: { production_requested: true } }); }
  retryDeploy(id) { return this.req(`/api/projects/${id}/build/retry-deploy`, { method: 'POST' }); }

  // Poll project status until predicate(project) is true (or timeout).
  async pollUntil(id, predicate, log = () => {}) {
    const deadline = Date.now() + this.pollTimeoutMs;
    let last = '';
    while (Date.now() < deadline) {
      const p = await this.getProject(id).catch((e) => ({ _err: e.message }));
      const stage = p.stage || p.project?.stage || p._err || '?';
      if (stage !== last) { log(`    status: ${stage}`); last = stage; }
      if (!p._err && predicate(p.project || p)) return p.project || p;
      await new Promise((r) => setTimeout(r, this.pollIntervalMs));
    }
    throw new Error(`pollUntil timeout for project ${id} (last status: ${last})`);
  }
}
