// FatJudge — in-build verification (per the original FATPIPELINE plan).
// Verifies each agent's output on the static channel (brief, page) and the
// assembled build on the runtime/visual channel, localizes defects, and returns
// a score so the orchestrator can route bounded repairs. Pure + side-effect-free
// except verifyBuildRuntime which renders in headless chromium.

const LOREM = /lorem ipsum|dolor sit amet|placeholder text|consectetur adipiscing|example\.com|\btbd\b|\btodo\b|being refined/i;
const HEX = /^#[0-9a-fA-F]{6}$/;
const GENERIC_NAME = /^(app|untitled|my app|product|website|home|brand|company)$/i;

// ── Static: brief agent ──────────────────────────────────────────────────────
export function verifyBrief(raw, pages, idea) {
  const d = [];
  const name = (raw?.name || '').trim();
  if (!name || name.length < 2) d.push('brief.name missing');
  else if (GENERIC_NAME.test(name)) d.push('brief.name is generic');
  // A real brand name is short. Flag only a sentence-length name or a long verbatim
  // chunk of the idea — NOT a legitimate brand that happens to lead the idea string
  // (e.g. idea "Aequer — structural engineering…" → name "Aequer" is correct).
  else if (name.split(/\s+/).length > 5) d.push('brief.name is a sentence, not a brand name');
  else if (name.length >= 20 && (idea || '').toLowerCase().startsWith(name.toLowerCase())) d.push('brief.name echoes the raw idea (use the brand name only)');
  if (!(raw?.tagline || '').trim() || raw.tagline.trim().split(/\s+/).length < 2) d.push('brief.tagline weak/missing');
  if (!(raw?.hero?.headline || '').trim() || raw.hero.headline.trim().split(/\s+/).length < 4) d.push('brief.hero.headline weak/missing (<4 words)');
  const ad = raw?.artDirection || {};
  if (!(ad.concept || '').trim()) d.push('artDirection.concept missing (the design through-line)');
  const tk = ad.tokens || {};
  for (const k of ['primary', 'bg', 'text', 'accent']) if (!HEX.test(tk[k] || '')) d.push(`artDirection.tokens.${k} not a #hex`);
  if (!(ad.type?.display || '').trim() || !(ad.type?.body || '').trim()) d.push('artDirection.type.display/body missing');
  // pages: an entry for EVERY page id, each with concrete sections
  const pblock = raw?.pages || {};
  for (const p of pages) {
    const pe = pblock[p.id];
    if (!pe) { d.push(`pages.${p.id} missing`); continue; }
    const secs = Array.isArray(pe.sections) ? pe.sections.filter((s) => (s || '').trim().length > 6) : [];
    if (secs.length < 3) d.push(`pages.${p.id} has <3 concrete sections`);
  }
  if ((raw?.stats || []).length < 3) d.push('stats <3 items');
  if ((raw?.catalog || []).length < 4) d.push('catalog <4 items');
  const blob = JSON.stringify(raw || {});
  if (LOREM.test(blob)) d.push('brief contains lorem/placeholder/example.com');
  // score: 10 minus weighted defects (cap floor 0)
  const score = Math.max(0, 10 - d.length * 1.3);
  return { pass: d.length === 0, score: Math.round(score * 10) / 10, defects: d };
}

// ── Static: page agent ───────────────────────────────────────────────────────
export function verifyPage(id, html, page, { minLen = 800, minImages = 3, minSections = 3, isContent = true } = {}) {
  const d = [];
  const h = html || '';
  if (h.length < minLen) d.push(`page "${id}" too short (${h.length} < ${minLen})`);
  if (LOREM.test(h)) d.push(`page "${id}" has lorem/placeholder/"being refined"`);
  if (/<\/?(?:html|head|body)\b|<nav\b|<script\b/i.test(h)) d.push(`page "${id}" contains forbidden tag (html/head/body/nav/script)`);
  const imgs = (h.match(/<img\b/gi) || []).length + (h.match(/background-image\s*:\s*url|url\(['"]?https?:/gi) || []).length;
  if (isContent && imgs < minImages) d.push(`page "${id}" has <${minImages} images (${imgs})`);
  const sections = (h.match(/<section\b/gi) || []).length;
  if (sections < minSections) d.push(`page "${id}" has <${minSections} sections (${sections})`);
  if (!/<h[1-3]\b/i.test(h)) d.push(`page "${id}" has no h1-h3 heading`);
  if (/<(h[1-6]|p)[^>]*>\s*<\/\1>/i.test(h)) d.push(`page "${id}" has empty heading/paragraph tags`);
  const score = Math.max(0, 10 - d.length * 1.6);
  return { pass: d.length === 0, score: Math.round(score * 10) / 10, defects: d };
}

// DOM probe reused for the runtime channel (mirrors audit.mjs).
const PAGE_PROBE = `(() => {
  const doc = document; const txt = (doc.body && doc.body.innerText) || '';
  const imgs = [...doc.querySelectorAll('img')];
  const loaded = imgs.filter(i => i.complete && i.naturalWidth > 2);
  const bg = [...doc.querySelectorAll('*')].filter(el => { const b = getComputedStyle(el).backgroundImage; return b && b !== 'none' && /url\\(/.test(b); });
  return {
    textLen: txt.length,
    imgs: imgs.length, imgsLoaded: loaded.length, bgImages: bg.length,
    sections: doc.querySelectorAll('section').length,
    hasLorem: /lorem ipsum|being refined|placeholder text/i.test(txt),
    overflowX: Math.max(0, (doc.documentElement.scrollWidth || 0) - (doc.documentElement.clientWidth || 0)),
  };
})()`;

// ── Runtime/visual: assembled build (renders in chromium) ────────────────────
// Returns per-page metrics + localized defects so FatRepair can target pages.
export async function verifyBuildRuntime(htmlFilePath, pages, { minImgsLoaded = 1, minText = 400 } = {}) {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { return { skipped: true, pass: true, score: null, defects: [], perPage: {} }; }
  const { pathToFileURL } = await import('node:url');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pg = await ctx.newPage();
  const jsErrors = [];
  pg.on('pageerror', (e) => jsErrors.push(String(e).slice(0, 120)));
  const perPage = {}; const defects = [];
  try {
    await pg.goto(pathToFileURL(htmlFilePath).href, { waitUntil: 'networkidle', timeout: 30000 });
    for (const p of pages) {
      try {
        await pg.evaluate((id) => window.loadPage && window.loadPage(id), p.id);
        await pg.waitForTimeout(500);
        const m = await pg.evaluate(PAGE_PROBE);
        perPage[p.id] = m;
        if (m.imgsLoaded + Math.min(m.bgImages, 3) < minImgsLoaded) defects.push(`page "${p.id}" renders <${minImgsLoaded} loaded image`);
        if (m.textLen < minText) defects.push(`page "${p.id}" near-empty at runtime (${m.textLen} chars)`);
        if (m.hasLorem) defects.push(`page "${p.id}" shows lorem/"being refined" at runtime`);
        if (m.overflowX > 24) defects.push(`page "${p.id}" horizontal overflow ${m.overflowX}px (mobile)`);
      } catch (e) { defects.push(`page "${p.id}" failed to render: ${String(e.message).slice(0, 80)}`); }
    }
    if (jsErrors.length) defects.push(`runtime JS errors: ${jsErrors.slice(0, 2).join(' | ')}`);
  } finally { await browser.close(); }
  const score = Math.max(0, 10 - defects.length * 1.2);
  return { skipped: false, pass: defects.length === 0, score: Math.round(score * 10) / 10, defects, perPage };
}
