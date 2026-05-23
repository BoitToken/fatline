#!/usr/bin/env node
// Test-dev loop: generate prototypes across varied briefs, audit each, and track
// the consecutive-pass streak toward 10 builds that beat the V2 bar.
//   node loop.mjs --count 14 --gate 8.5 --out ./loop
import { generatePrototype } from './src/generate.mjs';
import { runAudit } from './audit.mjs';
import { MODELS } from './src/llm.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}
const flag = (n) => process.argv.includes(`--${n}`);

// Varied briefs spanning industries + app types (proves generality, like V2's streak test).
const BRIEFS = [
  { idea: 'Premium betel-leaf paan delivery in Bangalore — curated paan boxes for celebrations', type: 'ecommerce' },
  { idea: 'A CRM for freelance interior designers to track clients, projects and invoices', type: 'crm' },
  { idea: 'A SaaS analytics platform for D2C brands to see revenue, retention and ad spend in one place', type: 'saas' },
  { idea: 'A landing page for an AI legal contract review tool for startups', type: 'landing' },
  { idea: 'A boutique streetwear label dropping limited sneaker collaborations', type: 'ecommerce' },
  { idea: 'A meditation and sleep app with guided sessions and streaks', type: 'mobile' },
  { idea: 'A real-estate marketplace for luxury villas in Goa with virtual tours', type: 'webapp' },
  { idea: 'A fitness coaching platform with workout plans, progress tracking and a trainer marketplace', type: 'saas' },
  { idea: 'A specialty coffee roastery with subscriptions and a brewing guide', type: 'ecommerce' },
  { idea: 'A fintech expense-management dashboard for small businesses', type: 'crm' },
  { idea: 'A landing page for a premium online cooking school by a Michelin chef', type: 'landing' },
  { idea: 'A skincare D2C brand with a personalized routine quiz', type: 'ecommerce' },
  { idea: 'A travel concierge app for curated weekend getaways in India', type: 'mobile' },
  { idea: 'A B2B SaaS for restaurants to manage inventory, suppliers and waste', type: 'saas' },
  { idea: 'A creator portfolio + booking platform for wedding photographers', type: 'webapp' },
  { idea: 'A music studio booking and collaboration platform for indie artists', type: 'webapp' },
];

function isPass(result, gate) {
  return (
    result.score >= gate &&
    result.pageCount >= 5 &&
    (result.avgImgsLoaded || 0) >= 3 &&
    (result.fontFamilies || []).length >= 2 &&
    (result.reasons || []).length === 0
  );
}

async function main() {
  const gate = parseFloat(arg('gate', '8.5'));
  const target = parseInt(arg('target', '10'), 10);
  const count = parseInt(arg('count', String(BRIEFS.length)), 10);
  const start = parseInt(arg('start', '0'), 10);
  const outRoot = path.resolve(arg('out', './loop'));
  const briefModel = flag('brief-opus') ? MODELS.opus : MODELS.sonnet;
  const pagesModel = flag('pages-opus') ? MODELS.opus : MODELS.sonnet;
  await mkdir(outRoot, { recursive: true });

  const runId = `run-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const results = [];
  let streak = 0, best = 0, passes = 0;

  console.log(`\n=== Fatline build loop ${runId} | gate=${gate} target=${target} consecutive ===\n`);

  for (let k = 0; k < count; k++) {
    const brief = BRIEFS[(start + k) % BRIEFS.length];
    const label = `b${String(start + k).padStart(2, '0')}-${brief.type}`;
    const buildDir = path.join(outRoot, runId, label);
    await mkdir(buildDir, { recursive: true });
    const rec = { i: start + k, label, ...brief };
    const t0 = Date.now();
    try {
      const gen = await generatePrototype({ idea: brief.idea, appType: brief.type, briefModel, model: pagesModel });
      await writeFile(path.join(buildDir, 'index.html'), gen.html);
      await writeFile(path.join(buildDir, 'brief.json'), JSON.stringify({ brief: gen.brief, raw: gen.raw }, null, 2));
      const report = await runAudit({ file: path.join(buildDir, 'index.html'), label, outDir: buildDir });
      rec.score = report.result.score;
      rec.pages = report.result.pageCount;
      rec.imgs = report.result.avgImgsLoaded;
      rec.text = report.result.avgTextLen;
      rec.fonts = (report.result.fontFamilies || []).length;
      rec.reasons = report.result.reasons || [];
      rec.brand = gen.brief.name;
      rec.genMs = gen.meta.ms;
      rec.pass = isPass(report.result, gate);
    } catch (e) {
      rec.error = e.message;
      rec.pass = false;
    }
    rec.ms = Date.now() - t0;
    results.push(rec);

    if (rec.pass) { streak++; passes++; best = Math.max(best, streak); }
    else streak = 0;

    const tag = rec.pass ? 'PASS' : 'FAIL';
    console.log(
      `[${k + 1}/${count}] ${label.padEnd(16)} ${tag}  score=${rec.score ?? 'ERR'}  ` +
      `pages=${rec.pages ?? '-'} imgs=${rec.imgs ?? '-'} text=${rec.text ?? '-'}  ` +
      `streak=${streak}/${target}  ${rec.brand || ''}` +
      (rec.reasons?.length ? `  | ${rec.reasons.join('; ')}` : '') +
      (rec.error ? `  | ERR ${rec.error}` : '')
    );

    await writeFile(path.join(outRoot, runId, 'report.json'),
      JSON.stringify({ runId, gate, target, streak, best, passes, results }, null, 2));

    if (streak >= target) { console.log(`\n🎯 ${target} CONSECUTIVE PASSES — goal reached.\n`); break; }
  }

  const avg = results.filter((r) => r.score).reduce((s, r) => s + r.score, 0) / Math.max(1, results.filter((r) => r.score).length);
  console.log(`\n=== summary: ${passes}/${results.length} pass | best streak ${best}/${target} | avg score ${avg.toFixed(2)} ===`);
  console.log(`report: ${path.join(outRoot, runId, 'report.json')}`);
}

main().catch((e) => { console.error('[loop] FATAL', e); process.exit(1); });
