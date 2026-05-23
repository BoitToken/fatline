// Anthropic Messages API client — zero dependency (global fetch).
// Used to run the FatBot reasoning (discovery/concept/verify/repair) from the
// SKILL system prompts. Large, reused system prompts (rules + skill body) are
// prompt-cached via cache_control to cut cost/latency across stages.
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export class ModelClient {
  constructor({ apiKey, model = 'claude-opus-4-7', maxTokens = 8192 }) {
    if (!apiKey) throw new Error('ModelClient: ANTHROPIC_API_KEY required (R9)');
    Object.assign(this, { apiKey, model, maxTokens });
  }

  // Run the model and parse a JSON object out of the reply.
  // `system` may be a string or [{text, cache}] blocks; the big rule block is cached.
  async json({ system, user, maxTokens }) {
    const text = await this.text({ system, user, maxTokens });
    return extractJson(text);
  }

  async text({ system, user, maxTokens }) {
    const sys = Array.isArray(system) ? system : [{ text: system, cache: true }];
    const body = {
      model: this.model,
      max_tokens: maxTokens || this.maxTokens,
      system: sys.map((b) => ({
        type: 'text',
        text: b.text,
        ...(b.cache ? { cache_control: { type: 'ephemeral' } } : {}),
      })),
      messages: [{ role: 'user', content: user }],
    };
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`Anthropic ${res.status}: ${t.slice(0, 300)}`);
    }
    const data = await res.json();
    return (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  }
}

// Pull the first balanced JSON object/array out of a model reply. String-aware
// brace matching (handles ```json fences, prose around the JSON, and braces
// inside string values). On truncated/invalid JSON, errors with context.
export function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[{[]/);
  if (start === -1) throw new Error(`No JSON in model reply: ${text.slice(0, 200)}`);
  const open = candidate[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error(`Unbalanced/truncated JSON (depth ${depth}) in model reply of ${candidate.length} chars`);
  return JSON.parse(candidate.slice(start, end + 1));
}
