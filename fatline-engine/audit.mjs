#!/usr/bin/env node
/**
 * Fatline prototype audit harness.
 * Renders a generated multi-page prototype (window.__PAGES__ + postMessage router),
 * walks every page, screenshots them, extracts DOM metrics, and scores the build
 * against the V2 quality bar (calibrated to proto/p/460 ~ 7.5/10).
 *
 * Usage:
 *   node audit.mjs --url https://proto.produsa.app/proto/p/460 --label v2-460 --out ./audits
 *   node audit.mjs --file ./out/build-1/index.html --label fl-1 --out ./audits
 *
 * Output: <out>/<label>/report.json + page-*.png screenshots.
 * Exit code 0 always (the loop reads report.json).
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const LOREM = /lorem ipsum|dolor sit amet|placeholder text|consectetur adipiscing/i;

// Per-page DOM metrics, run inside the page context (works on shell or iframe doc).
const PAGE_PROBE = `(() => {
  const doc = document;
  const txt = (doc.body && doc.body.innerText) || '';
  const imgs = [...doc.querySelectorAll('img')];
  const loadedImgs = imgs.filter(i => i.complete && i.naturalWidth > 2);
  const bgImgEls = [...doc.querySelectorAll('*')].filter(el => {
    const b = getComputedStyle(el).backgroundImage;
    return b && b !== 'none' && /url\\(/.test(b);
  });
  const colors = new Set();
  [...doc.querySelectorAll('*')].slice(0, 4000).forEach(el => {
    const s = getComputedStyle(el);
    [s.color, s.backgroundColor, s.borderTopColor].forEach(c => {
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'rgb(0, 0, 0)') colors.add(c);
    });
  });
  const fonts = new Set();
  [...doc.querySelectorAll('h1,h2,h3,p,span,a,button')].slice(0, 500).forEach(el => {
    fonts.add((getComputedStyle(el).fontFamily || '').split(',')[0].replace(/['"]/g,'').trim());
  });
  const de = doc.documentElement;
  const overflowX = de.scrollWidth - de.clientWidth;
  return {
    textLen: txt.length,
    headings: doc.querySelectorAll('h1,h2,h3,h4').length,
    h1: doc.querySelectorAll('h1').length,
    paragraphs: doc.querySelectorAll('p,li').length,
    imgs: imgs.length,
    imgsLoaded: loadedImgs.length,
    bgImages: bgImgEls.length,
    svgs: doc.querySelectorAll('svg').length,
    tables: doc.querySelectorAll('table').length,
    rows: doc.querySelectorAll('tr').length,
    buttons: doc.querySelectorAll('button,a[href],[role="button"]').length,
    inputs: doc.querySelectorAll('input,select,textarea').length,
    sections: doc.querySelectorAll('section,header,nav,footer,main,aside').length,
    cards: doc.querySelectorAll('[class*="card"],[class*="Card"],[class*="rounded"]').length,
    distinctColors: colors.size,
    fontFamilies: [...fonts].filter(Boolean),
    hasLorem: ${LOREM}.test(txt),
    overflowX,
    htmlLen: doc.documentElement.outerHTML.length,
  };
})()`;

async function getPageList(page) {
  // __PAGES__ may live on top window or inside a child iframe shell.
  return await page.evaluate(() => {
    let p = window.__PAGES__;
    if (!p) {
      const f = document.querySelector('iframe');
      try { p = f && f.contentWindow && f.contentWindow.__PAGES__; } catch (e) {}
    }
    return p ? Object.keys(p) : null;
  });
}

async function probe(page) {
  // Run probe on the deepest doc that has real content (iframe if present).
  const hasIframe = await page.evaluate(() => !!document.querySelector('iframe'));
  if (hasIframe) {
    try {
      const fr = page.frames().find(f => f !== page.mainFrame());
      if (fr) return await fr.evaluate(PAGE_PROBE);
    } catch (e) {}
  }
  return await page.evaluate(PAGE_PROBE);
}

async function navTo(page, pageId) {
  await page.evaluate((id) => {
    window.postMessage({ page: id }, '*');
    const f = document.querySelector('iframe');
    if (f && f.contentWindow) f.contentWindow.postMessage({ page: id }, '*');
    if (location.hash !== undefined) location.hash = id;
  }, pageId);
}

function scoreBuild(pages) {
  // Transparent rubric calibrated so the V2 460 baseline lands ~7.5.
  if (!pages.length) return { score: 0, reasons: ['no pages rendered'] };
  const reasons = [];
  const n = pages.length;
  const avg = (sel) => pages.reduce((s, p) => s + (p.metrics?.[sel] || 0), 0) / n;
  const any = (fn) => pages.some(fn);

  let score = 0;
  // Multi-page coverage (0-1.5): 460 had 6.
  const pageScore = Math.min(1.5, (n / 5) * 1.5);
  score += pageScore;

  // Content density (0-1.5): avg text length per page; ~1500+ chars is rich.
  const dens = avg('textLen');
  score += Math.min(1.5, (dens / 1800) * 1.5);
  if (dens < 600) reasons.push(`thin content (avg ${Math.round(dens)} chars/page)`);

  // Real imagery (0-2): loaded <img> + CSS bg images. 460 leaned on real photos.
  const imgLoaded = avg('imgsLoaded');
  const bg = avg('bgImages');
  const imgScore = Math.min(2, ((imgLoaded + Math.min(bg, 3)) / 4) * 2);
  score += imgScore;
  if (imgLoaded + bg < 1) reasons.push('no real images rendered');

  // Structure & components (0-1.5): sections + cards + icons(svg).
  const struct = avg('sections') + avg('cards') * 0.4 + Math.min(avg('svgs'), 20) * 0.05;
  score += Math.min(1.5, (struct / 14) * 1.5);

  // Typography (0-1): >=2 font families incl. a display face.
  const fams = new Set();
  pages.forEach(p => (p.metrics?.fontFamilies || []).forEach(f => fams.add(f)));
  const famScore = fams.size >= 2 ? 1 : fams.size === 1 ? 0.4 : 0;
  score += famScore;
  if (fams.size < 2) reasons.push('single font family (weak hierarchy)');

  // Palette cohesion (0-0.8): enough distinct colors but not chaotic.
  const cols = avg('distinctColors');
  score += cols >= 6 && cols <= 60 ? 0.8 : 0.3;

  // Interactivity (0-0.7): buttons/links + some inputs.
  score += Math.min(0.7, (avg('buttons') / 12) * 0.7);

  // Penalties.
  if (any(p => p.metrics?.hasLorem)) { score -= 1.2; reasons.push('contains lorem ipsum'); }
  const overflow = any(p => (p.metrics?.overflowX || 0) > 8);
  if (overflow) { score -= 0.5; reasons.push('horizontal overflow (not responsive)'); }
  if (any(p => p.error)) { score -= 1; reasons.push('a page errored while rendering'); }

  score = Math.max(0, Math.min(10, score));
  return { score: Math.round(score * 10) / 10, reasons, pageCount: n, avgTextLen: Math.round(dens), avgImgsLoaded: Math.round((imgLoaded + bg) * 10) / 10, fontFamilies: [...fams] };
}

export { scoreBuild };

export async function runAudit({ url, file, label = 'audit', outDir, mobile = false } = {}) {
  const target = url || pathToFileURL(path.resolve(file)).href;
  outDir = outDir || path.resolve('./audits', label);
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const report = { label, target, ts: new Date().toISOString(), pages: [] };
  try {
    await page.goto(target, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2000);
    let list = await getPageList(page);
    if (!list || !list.length) list = ['__single__'];
    report.pageList = list;

    for (let i = 0; i < list.length; i++) {
      const pid = list[i];
      const rec = { id: pid };
      try {
        if (pid !== '__single__') { await navTo(page, pid); await page.waitForTimeout(1100); }
        await page.evaluate(() => window.scrollTo(0, 0));
        rec.metrics = await probe(page);
        const shot = path.join(outDir, `page-${String(i).padStart(2, '0')}-${pid}.png`);
        await page.screenshot({ path: shot, fullPage: true }).catch(() => page.screenshot({ path: shot }));
        rec.screenshot = shot;
      } catch (e) {
        rec.error = String(e).slice(0, 200);
      }
      report.pages.push(rec);
    }
  } finally {
    await browser.close();
  }

  report.result = scoreBuild(report.pages);
  await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[audit] ${label}: score=${report.result.score}/10 pages=${report.result.pageCount} ` +
    `text~${report.result.avgTextLen} imgs~${report.result.avgImgsLoaded} ` +
    `fonts=${(report.result.fontFamilies || []).join('|')}`);
  if (report.result.reasons?.length) console.log(`[audit]   notes: ${report.result.reasons.join('; ')}`);
  return report;
}

async function main() {
  const url = arg('url');
  const file = arg('file');
  const label = arg('label', 'audit');
  const mobile = arg('mobile') !== null;
  if (!url && !file) { console.error('need --url or --file'); process.exit(2); }
  await runAudit({ url, file, label, outDir: path.resolve(arg('out', './audits'), label), mobile });
}

// run as CLI only when invoked directly
import { fileURLToPath } from 'node:url';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
