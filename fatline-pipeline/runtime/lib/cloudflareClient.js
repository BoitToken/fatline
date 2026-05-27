// Cloudflare API v4 client (zero dep) for the deploy path's DNS step.
// The supplied token is Zone/DNS-scoped for produsa.dev (verified 2026-05-23):
// it can read zones + manage DNS records (6-step deploy / D6 step 1), but NOT
// Pages/Workers — so app artifact deploy uses a different mechanism; this client
// owns the subdomain DNS records only.
const CF = 'https://api.cloudflare.com/client/v4';

export class CloudflareClient {
  constructor({ token, accountId } = {}) {
    if (!token) throw new Error('CloudflareClient: CF token required (R9, from env)');
    this.token = token;
    this.accountId = accountId;
  }

  async req(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${CF}${path}`, {
      method,
      headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.success) {
      const err = (data.errors || []).map((e) => `${e.code}:${e.message}`).join('; ') || res.status;
      const e = new Error(`cloudflare ${method} ${path} → ${err}`);
      e.cf = data.errors;
      throw e;
    }
    return data.result;
  }

  // Capability probe: what can this token actually do? (verify endpoint may 1000
  // if the token lacks "API Tokens: Read", yet still work for zones — so we probe.)
  async capabilities() {
    const cap = { accounts: false, zones: [], dns: false, pages: false };
    try { await this.req('/accounts'); cap.accounts = true; } catch {}
    try { cap.zones = (await this.req('/zones')).map((z) => ({ name: z.name, id: z.id })); } catch {}
    if (cap.zones.length) { try { await this.req(`/zones/${cap.zones[0].id}/dns_records?per_page=1`); cap.dns = true; } catch {} }
    if (this.accountId) { try { await this.req(`/accounts/${this.accountId}/pages/projects`); cap.pages = true; } catch {} }
    return cap;
  }

  zones() { return this.req('/zones'); }
  async findZone(name) { return (await this.req(`/zones?name=${encodeURIComponent(name)}`))[0]; }
  listDnsRecords(zoneId, name) { return this.req(`/zones/${zoneId}/dns_records${name ? `?name=${encodeURIComponent(name)}` : ''}`); }

  // Idempotent upsert of a subdomain record (CNAME/A) — the CF part of deploy.
  async upsertDnsRecord(zoneId, { type = 'CNAME', name, content, proxied = true, ttl = 1 }) {
    const existing = await this.listDnsRecords(zoneId, name);
    const body = { type, name, content, proxied, ttl };
    if (existing.length) return this.req(`/zones/${zoneId}/dns_records/${existing[0].id}`, { method: 'PUT', body });
    return this.req(`/zones/${zoneId}/dns_records`, { method: 'POST', body });
  }
}
