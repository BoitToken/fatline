// Fatline prototype generator — orchestrates brief → pages → deterministic shell.
import { chat, extractJson, sanitizeHtml, MODELS } from './llm.mjs';
import { detectIndustry, getPalette, getFontPair, defaultFontKey, hexToRgb, HERO_ARCHETYPES } from './palette.mjs';
import { getPages, resolveType } from './pages.mjs';
import { buildImageKit } from './images.mjs';
import { briefSystem, briefUser, pageSystem, pageUser } from './prompts.mjs';
import { buildShell } from './shell.mjs';

const HEX = /^#[0-9a-fA-F]{6}$/;
function validPalette(p) {
  if (!p) return null;
  const keys = ['primary', 'accent', 'bg', 'card', 'text', 'muted'];
  const out = {};
  for (const k of keys) {
    if (!HEX.test(p[k] || '')) return null;
    out[k] = p[k];
  }
  return out;
}

const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
function mixHex(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a), [r2, g2, b2] = hexToRgb(b);
  return `#${toHex(r1 + (r2 - r1) * t)}${toHex(g1 + (g2 - g1) * t)}${toHex(b1 + (b2 - b1) * t)}`;
}
const pick = (v, allow, def) => (typeof v === 'string' && allow.includes(v) ? v : def);
const str = (v, def) => (typeof v === 'string' && v.trim() ? v.trim() : def);
const weights = (v, def) => (/^\d{3}(;\d{3})*$/.test(String(v || '')) ? v : def);

// Normalise the brief's artDirection into a complete, render-safe design system.
// Every field has a fallback (derived from the industry palette / font pair) so a
// partial or missing artDirection never breaks the deterministic shell.
function buildArt(raw, industry) {
  const ad = raw.artDirection || {};
  const base = getPalette(industry);
  const legacyPal = validPalette(raw.paletteOverride);
  const legacyFonts = getFontPair(raw.fontKey || defaultFontKey(industry));
  const t = ad.tokens || {};
  const h = (v, fb) => (HEX.test(v || '') ? v : fb);

  const primary = h(t.primary, legacyPal?.primary || base.primary);
  const accent = h(t.accent, legacyPal?.accent || base.accent);
  const bg = h(t.bg, legacyPal?.bg || base.bg);
  const card = h(t.card, legacyPal?.card || base.card);
  const text = h(t.text, legacyPal?.text || base.text);
  const inkMuted = h(t.inkMuted, legacyPal?.muted || base.muted);

  const tokens = {
    primary, accent, bg, card, text, inkMuted,
    bgElev: h(t.bgElev, mixHex(bg, card, 0.5)),
    line: h(t.line, mixHex(bg, text, 0.12)),
    inkDim: h(t.inkDim, mixHex(inkMuted, bg, 0.45)),
    ok: h(t.ok, '#4ade80'),
    warn: h(t.warn, '#fbbf24'),
    risk: h(t.risk, '#f87171'),
    contrast: h(t.contrast, text),
  };

  const adt = ad.type || {};
  const type = {
    display: str(adt.display, legacyFonts.display),
    body: str(adt.body, legacyFonts.body),
    mono: str(adt.mono, 'JetBrains Mono'),
    displayWeights: weights(adt.displayWeights, legacyFonts.displayWeights),
    bodyWeights: weights(adt.bodyWeights, legacyFonts.bodyWeights),
    headingStyle: pick(adt.headingStyle, ['normal', 'italic-accent'], 'normal'),
    scale: pick(adt.scale, ['compact', 'balanced', 'editorial-xl'], 'balanced'),
    letterSpacing: pick(adt.letterSpacing, ['tight', 'normal'], 'tight'),
  };

  return {
    concept: str(ad.concept, ''),
    rationale: str(ad.rationale, ''),
    mood: str(ad.mood, raw.voice || ''),
    tokens,
    type,
    motion: pick(ad.motion, ['subtle', 'lively', 'cinematic'], 'subtle'),
    texture: pick(ad.texture, ['none', 'grain', 'glow'], 'none'),
    layoutArchetype: pick(ad.layoutArchetype, HERO_ARCHETYPES, 'split-right'),
    signature: str(ad.signature, ''),
  };
}

function countImages(html) {
  return (html.match(/<img\b/gi) || []).length +
    (html.match(/background-image\s*:\s*url|bg-\[url|url\(['"]?https?:/gi) || []).length;
}

// Deterministic image-floor: V2 relies on the LLM to include enough imagery and
// is flaky on text-heavy briefs. We GUARANTEE >=3 real photos per content page by
// appending a tasteful showcase band when the LLM under-delivers.
function ensureImagery(html, kit, brief) {
  const MIN = 3;
  if (countImages(html) >= MIN) return html;
  const pool = [kit.hero, kit.feature, ...(kit.cards || [])].filter(Boolean);
  const picks = [pool[0], pool[1] || pool[0], pool[2] || pool[0]];
  const cells = picks
    .map(
      (u, i) =>
        `<div class="card" style="padding:0;overflow:hidden"><img src="${u}" alt="${(brief.name || 'showcase')} ${i + 1}" loading="lazy" style="width:100%;height:230px;object-fit:cover;display:block"></div>`
    )
    .join('');
  const band = `<section class="px-6 md:px-10 py-12"><div class="max-w-7xl mx-auto"><div class="grid grid-cols-1 md:grid-cols-3 gap-5 stagger">${cells}</div></div></section>`;
  return html + band;
}

export async function generatePrototype({
  idea,
  appType = 'webapp',
  currency = '₹ (INR)',
  model = MODELS.sonnet,
  briefModel = MODELS.opus, // art direction is the high-leverage creative call → Opus 4.6
  onEvent = () => {},
} = {}) {
  const t0 = Date.now();
  const type = resolveType(appType);
  const pages = getPages(type);
  const industry = detectIndustry(`${idea} ${type}`);
  onEvent({ type: 'stage', stage: 'brief', industry, type });

  // --- Stage 1: design brief ---
  const briefRes = await chat({
    system: briefSystem(),
    user: briefUser({ idea, appType: type, pages, industry, currency }),
    model: briefModel,
    maxTokens: 6000,
    temperature: 0.85,
    label: 'brief',
  });
  let raw;
  try {
    raw = extractJson(briefRes.text);
  } catch (e) {
    throw new Error(`brief parse failed: ${e.message}`);
  }

  // Art direction (decided by the same agent as the research) → a complete design system.
  const art = buildArt(raw, industry);
  const palette = { primary: art.tokens.primary, accent: art.tokens.accent, bg: art.tokens.bg, card: art.tokens.card, text: art.tokens.text, muted: art.tokens.inkMuted };
  const fonts = { display: art.type.display, body: art.type.body, displayWeights: art.type.displayWeights, bodyWeights: art.type.bodyWeights };
  const shellBrief = {
    name: raw.name || idea.slice(0, 24),
    tagline: raw.tagline || '',
    navTag: raw.navTag || '',
    palette,
    fonts,
    art,
    hero: raw.hero || {},
    ctaPrimary: raw.hero?.ctaPrimary || 'Get Started',
    pages: raw.pages || {},
  };
  const kit = buildImageKit({ category: industry, keyword: raw.imageKeyword, primaryHex: palette.primary });
  onEvent({ type: 'stage', stage: 'art', concept: art.concept, archetype: art.layoutArchetype, type: `${art.type.display}/${art.type.body}/${art.type.mono}`, texture: art.texture });
  onEvent({ type: 'stage', stage: 'pages', count: pages.length, brand: shellBrief.name });

  // --- Stage 2: pages (parallel) — every page render receives the art direction via fullBrief.art ---
  const fullBrief = { ...shellBrief, voice: raw.voice, audience: raw.audience, stats: raw.stats, catalog: raw.catalog, testimonials: raw.testimonials };
  const results = await Promise.allSettled(
    pages.map(async (p) => {
      const res = await chat({
        system: pageSystem(),
        user: pageUser({ brief: fullBrief, page: p, kit, currency }),
        model,
        maxTokens: 9000,
        temperature: 0.8,
        label: `page:${p.id}`,
      });
      let html = sanitizeHtml(res.text);
      // strip anything that slipped through the forbidden list
      html = html.replace(/<\/?(?:html|head|body)[^>]*>/gi, '')
                 .replace(/<nav[\s\S]*?<\/nav>/gi, '')
                 .replace(/<script[\s\S]*?<\/script>/gi, '');
      html = ensureImagery(html.trim(), kit, shellBrief);
      return { id: p.id, html };
    })
  );

  const pagesData = {};
  const failures = [];
  results.forEach((r, i) => {
    const id = pages[i].id;
    if (r.status === 'fulfilled' && r.value.html && r.value.html.length > 300) {
      pagesData[id] = r.value.html;
    } else {
      failures.push(id);
      pagesData[id] = `<section class="px-6 py-20"><div class="max-w-3xl mx-auto text-center"><h1 class="text-4xl font-display mb-4">${pages[i].title}</h1><p class="muted">This section is being refined.</p></div></section>`;
    }
  });
  onEvent({ type: 'stage', stage: 'assemble', failures });

  const html = buildShell({ brief: shellBrief, pages, pagesData });
  const manifest = {
    pages: pages.map((p) => ({ id: p.id, title: p.title, icon: p.icon, default: p.id === pages[0].id })),
    name: shellBrief.name,
    industry,
    type,
    generator: 'fatline-engine',
  };

  return {
    html,
    pagesData,
    brief: shellBrief,
    raw,
    manifest,
    meta: {
      ms: Date.now() - t0,
      pages: pages.length,
      failures,
      htmlLen: html.length,
      model,
      briefModel,
      industry,
      type,
    },
  };
}
