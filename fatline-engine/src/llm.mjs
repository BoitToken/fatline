// Anthropic wrapper for the Fatline engine.
// - Prompt caching on the (large, constant) system block.
// - Retry with backoff on 429/5xx/overloaded.
// - Hard timeout per call.
// - Robust JSON extraction for brief/audit stages.
import Anthropic from '@anthropic-ai/sdk';

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) console.warn('[llm] ANTHROPIC_API_KEY not set');

export const MODELS = {
  // generation workhorse
  sonnet: 'claude-sonnet-4-6',
  // creative high-leverage decisions / final polish
  opus: 'claude-opus-4-6',
  fast: 'claude-haiku-4-5-20251001',
};

const client = new Anthropic({ apiKey: KEY, maxRetries: 0 });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * chat({ system, user, model, maxTokens, temperature, cacheSystem })
 * `system` may be a string or array of content blocks. If cacheSystem and it's a
 * string, we wrap it as a single cached block.
 * Returns { text, usage }.
 */
export async function chat({
  system,
  user,
  messages,
  model = MODELS.sonnet,
  maxTokens = 8000,
  temperature = 0.7,
  cacheSystem = true,
  timeoutMs = 300000,
  label = 'llm',
  retries = 3,
} = {}) {
  let sys = system;
  if (typeof system === 'string') {
    sys = [{ type: 'text', text: system, ...(cacheSystem ? { cache_control: { type: 'ephemeral' } } : {}) }];
  }
  const msgs = messages || [{ role: 'user', content: user }];

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await client.messages.create(
        { model, max_tokens: maxTokens, temperature, system: sys, messages: msgs },
        { signal: ctrl.signal }
      );
      clearTimeout(timer);
      const text = (res.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');
      return { text, usage: res.usage, stop: res.stop_reason };
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      const status = e?.status;
      const transient = status === 429 || status === 500 || status === 503 || status === 529 || e?.name === 'AbortError';
      if (attempt < retries && transient) {
        const wait = Math.min(20000, 1500 * 2 ** attempt) + Math.random() * 800;
        console.warn(`[${label}] ${status || e.name} — retry ${attempt + 1}/${retries} in ${Math.round(wait)}ms`);
        await sleep(wait);
        continue;
      }
      break;
    }
  }
  throw new Error(`[${label}] LLM failed: ${lastErr?.status || ''} ${lastErr?.message || lastErr}`);
}

// Strip ```fences```, leading prose, and parse the first balanced JSON object/array.
export function extractJson(text) {
  if (!text) throw new Error('empty LLM response');
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const start = t.search(/[[{]/);
  if (start === -1) throw new Error('no JSON found in response');
  const open = t[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === open) depth++;
      else if (c === close) { depth--; if (depth === 0) { end = i + 1; break; } }
    }
  }
  const slice = end === -1 ? t.slice(start) : t.slice(start, end);
  try {
    return JSON.parse(slice);
  } catch {
    // last-ditch: trim trailing commas
    return JSON.parse(slice.replace(/,\s*([}\]])/g, '$1'));
  }
}

// Strip markdown fences / explanation from an HTML response.
export function sanitizeHtml(text) {
  if (!text) return '';
  let t = text.trim();
  const fence = t.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  else t = t.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '');
  // drop any leading prose before the first tag
  const lt = t.indexOf('<');
  if (lt > 0 && lt < 200) t = t.slice(lt);
  return t.trim();
}
