// Anthropic Messages API client — zero dependency (global fetch).
// Used to run the FatBot reasoning (discovery/concept/verify/repair) from the
// SKILL system prompts. Large, reused system prompts (rules + skill body) are
// prompt-cached via cache_control to cut cost/latency across stages.
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export class ModelClient {
  constructor({ apiKey, model = 'claude-opus-4-7', maxTokens = 4096 }) {
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

// Pull the first JSON object/array out of a model reply (handles ```json fences).
export function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[{[]/);
  if (start === -1) throw new Error(`No JSON in model reply: ${text.slice(0, 200)}`);
  // Best-effort: try progressively shorter suffixes from the last closing brace.
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  const slice = candidate.slice(start, end + 1);
  return JSON.parse(slice);
}
