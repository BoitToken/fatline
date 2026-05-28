// Fatline prototype generator — orchestrates brief → pages → deterministic shell,
// with FatJudge in-build verification + bounded FatRepair after each agent
// (per fatline-pipeline/FATPIPELINE.md): the brief and every page are verified
// (static channel) and regenerated on failure; the assembled build is verified in
// a real browser (runtime/visual channel) and bad pages are surgically repaired.
import { chat, extractJson, sanitizeHtml, MODELS } from './llm.mjs';
import { detectIndustry, getPalette, getFontPair, defaultFontKey, hexToRgb, HERO_ARCHETYPES } from './palette.mjs';
import { getPages, resolveType } from './pages.mjs';
import { buildImageKit } from './images.mjs';
import { briefSystem, briefUser, pageSystem, pageUser } from './prompts.mjs';
import { buildShell } from './shell.mjs';
import { verifyBrief, verifyPage, verifyBuildRuntime } from './verify.mjs';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

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

// Deterministic image-floor: GUARANTEE >=3 real photos per content page.
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

// strip anything the page agent should never emit
function cleanFragment(text) {
  return sanitizeHtml(text)
    .replace(/<\/?(?:html|head|body)[^>]*>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .trim();
}

const STUB = (p) => `<section class="px-6 py-20"><div class="max-w-3xl mx-auto text-center"><h1 class="text-4xl font-display mb-4">${p.title}</h1><p class="muted">This section is being refined.</p></div></section>`;

// Bounded budgets (FATPIPELINE: bounded repair, not infinite).
const MAX_BRIEF_ATTEMPTS = Number(process.env.FATLINE_BRIEF_ATTEMPTS || 2);
const MAX_PAGE_ATTEMPTS = Number(process.env.FATLINE_PAGE_ATTEMPTS || 3);
const MAX_BUILD_REPAIRS = Number(process.env.FATLINE_BUILD_REPAIRS || 1);
const RUNTIME_GATE = process.env.FATLINE_RUNTIME_GATE !== 'off';

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

  // --- Stage 1: design brief — FatJudge static gate + bounded regen ---
  let raw = null, briefVerify = null, briefNote = '';
  for (let attempt = 1; attempt <= MAX_BRIEF_ATTEMPTS; attempt++) {
    const briefRes = await chat({
      system: briefSystem(),
      user: briefUser({ idea, appType: type, pages, industry, currency }) + briefNote,
      model: briefModel, maxTokens: 6000, temperature: 0.85, label: attempt > 1 ? `brief:retry${attempt}` : 'brief',
    });
    try {
      raw = extractJson(briefRes.text);
    } catch (e) {
      if (attempt === MAX_BRIEF_ATTEMPTS) throw new Error(`brief parse failed after ${attempt} attempts: ${e.message}`);
      briefNote = '\n\nYour previous output was not valid JSON. Return ONLY the JSON object, no prose.';
      continue;
    }
    briefVerify = verifyBrief(raw, pages, idea);
    onEvent({ type: 'verify', stage: 'brief', attempt, pass: briefVerify.pass, score: briefVerify.score, defects: briefVerify.defects });
    if (briefVerify.pass || attempt === MAX_BRIEF_ATTEMPTS) break;
    briefNote = `\n\nFatJudge REJECTED your previous brief (score ${briefVerify.score}/10). Fix EXACTLY these defects and return the full corrected JSON:\n- ${briefVerify.defects.join('\n- ')}`;
  }

  // Art direction → complete design system.
  const art = buildArt(raw, industry);
  const palette = { primary: art.tokens.primary, accent: art.tokens.accent, bg: art.tokens.bg, card: art.tokens.card, text: art.tokens.text, muted: art.tokens.inkMuted };
  const fonts = { display: art.type.display, body: art.type.body, displayWeights: art.type.displayWeights, bodyWeights: art.type.bodyWeights };
  const shellBrief = {
    name: raw.name || idea.slice(0, 24),
    tagline: raw.tagline || '',
    navTag: raw.navTag || '',
    palette, fonts, art,
    hero: raw.hero || {},
    ctaPrimary: raw.hero?.ctaPrimary || 'Get Started',
    pages: raw.pages || {},
  };
  const kit = buildImageKit({ category: industry, keyword: raw.imageKeyword, primaryHex: palette.primary });
  onEvent({ type: 'stage', stage: 'art', concept: art.concept, archetype: art.layoutArchetype, type: `${art.type.display}/${art.type.body}/${art.type.mono}`, texture: art.texture });
  onEvent({ type: 'stage', stage: 'pages', count: pages.length, brand: shellBrief.name });

  const fullBrief = { ...shellBrief, voice: raw.voice, audience: raw.audience, stats: raw.stats, catalog: raw.catalog, testimonials: raw.testimonials };

  // --- Stage 2: pages (parallel) — each page: FatJudge static gate + bounded regen ---
  const genOnePage = async (p) => {
    let html = '', v = null, note = '', attempts = 0;
    for (let attempt = 1; attempt <= MAX_PAGE_ATTEMPTS; attempt++) {
      attempts = attempt;
      const res = await chat({
        system: pageSystem(),
        user: pageUser({ brief: fullBrief, page: p, kit, currency }) + note,
        model, maxTokens: 9000, temperature: 0.8, label: attempt > 1 ? `page:${p.id}:retry${attempt}` : `page:${p.id}`,
      });
      html = ensureImagery(cleanFragment(res.text), kit, shellBrief);
      v = verifyPage(p.id, html, p);
      onEvent({ type: 'verify', stage: 'page', page: p.id, attempt, pass: v.pass, score: v.score, defects: v.defects });
      if (v.pass) break;
      note = `\n\nFatJudge REJECTED your previous render of "${p.title}" (score ${v.score}/10). Fix EXACTLY these and return the FULL corrected fragment:\n- ${v.defects.join('\n- ')}`;
    }
    return { id: p.id, html, verify: v, attempts };
  };
  const settled = await Promise.allSettled(pages.map(genOnePage));

  const pagesData = {};
  const failures = [];
  const pageVerify = {};
  settled.forEach((r, i) => {
    const id = pages[i].id;
    if (r.status === 'fulfilled' && r.value.html && r.value.html.length > 300) {
      pagesData[id] = r.value.html;
      pageVerify[id] = { ...r.value.verify, attempts: r.value.attempts };
      if (!r.value.verify?.pass) failures.push(id); // shipped after exhausting attempts — flagged, not silent
    } else {
      failures.push(id);
      pagesData[id] = STUB(pages[i]);
      pageVerify[id] = { pass: false, score: 0, defects: ['page generation threw/empty after retries'], attempts: MAX_PAGE_ATTEMPTS };
    }
  });
  onEvent({ type: 'stage', stage: 'assemble', failures });

  let html = buildShell({ brief: shellBrief, pages, pagesData });

  // --- Stage 3: FatJudge runtime/visual gate + bounded FatRepair (renders in chromium) ---
  let runtime = { skipped: true, pass: true, score: null, defects: [] };
  if (RUNTIME_GATE) {
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'fl-verify-'));
    try {
      for (let cycle = 0; cycle <= MAX_BUILD_REPAIRS; cycle++) {
        const file = path.join(tmp, 'index.html');
        await writeFile(file, html, 'utf8');
        runtime = await verifyBuildRuntime(file, pages);
        onEvent({ type: 'verify', stage: 'runtime', cycle, pass: runtime.pass, score: runtime.score, defects: runtime.defects, skipped: runtime.skipped });
        if (runtime.pass || runtime.skipped || cycle === MAX_BUILD_REPAIRS) break;
        const badPages = pages.filter((p) => runtime.defects.some((d) => d.includes(`"${p.id}"`)));
        if (!badPages.length) break;
        onEvent({ type: 'repair', stage: 'runtime', pages: badPages.map((p) => p.id) });
        for (const p of badPages) {
          const note = `\n\nFatJudge runtime check (real browser @390px) failed for THIS page. Fix EXACTLY these and return the FULL corrected fragment:\n- ${runtime.defects.filter((d) => d.includes(`"${p.id}"`)).join('\n- ')}`;
          try {
            const res = await chat({ system: pageSystem(), user: pageUser({ brief: fullBrief, page: p, kit, currency }) + note, model, maxTokens: 9000, temperature: 0.7, label: `repair:${p.id}` });
            const h = ensureImagery(cleanFragment(res.text), kit, shellBrief);
            if (h.length > 300) { pagesData[p.id] = h; pageVerify[p.id] = { ...verifyPage(p.id, h, p), repaired: true }; }
          } catch { /* keep prior page on repair error */ }
        }
        html = buildShell({ brief: shellBrief, pages, pagesData });
      }
    } finally {
      await rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
  }

  const manifest = {
    pages: pages.map((p) => ({ id: p.id, title: p.title, icon: p.icon, default: p.id === pages[0].id })),
    name: shellBrief.name, industry, type, generator: 'fatline-engine',
  };

  // Overall verification verdict (the production gate the orchestrator/loop can read).
  const pageScores = Object.values(pageVerify).map((v) => v.score ?? 0);
  const verification = {
    brief: briefVerify,
    pages: pageVerify,
    runtime,
    summary: {
      briefPass: !!briefVerify?.pass,
      pagesAllPass: failures.length === 0,
      runtimePass: runtime.skipped ? null : runtime.pass,
      failures,
      minPageScore: pageScores.length ? Math.min(...pageScores) : 0,
      // ship-ready iff brief ok AND no hard page failures AND runtime ok (or skipped)
      shipReady: !!briefVerify?.pass && failures.length === 0 && (runtime.skipped || runtime.pass),
    },
  };
  onEvent({ type: 'verdict', shipReady: verification.summary.shipReady, failures, runtimeScore: runtime.score });

  return {
    html, pagesData, brief: shellBrief, raw, manifest, verification,
    meta: {
      ms: Date.now() - t0, pages: pages.length, failures, htmlLen: html.length,
      model, briefModel, industry, type,
      shipReady: verification.summary.shipReady,
    },
  };
}
