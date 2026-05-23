// Fatline prototype generator — orchestrates brief → pages → deterministic shell.
import { chat, extractJson, sanitizeHtml, MODELS } from './llm.mjs';
import { detectIndustry, getPalette, getFontPair, defaultFontKey } from './palette.mjs';
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
  briefModel = MODELS.sonnet,
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

  const palette = validPalette(raw.paletteOverride) || getPalette(industry);
  const fonts = getFontPair(raw.fontKey || defaultFontKey(industry));
  const shellBrief = {
    name: raw.name || idea.slice(0, 24),
    tagline: raw.tagline || '',
    navTag: raw.navTag || '',
    palette,
    fonts,
    hero: raw.hero || {},
    ctaPrimary: raw.hero?.ctaPrimary || 'Get Started',
    pages: raw.pages || {},
  };
  const kit = buildImageKit({ category: industry, keyword: raw.imageKeyword, primaryHex: palette.primary });
  onEvent({ type: 'stage', stage: 'pages', count: pages.length, brand: shellBrief.name });

  // --- Stage 2: pages (parallel) ---
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
