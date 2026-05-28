#!/usr/bin/env node
// CLI: generate one prototype to <out>/<label>/index.html
//   node run.mjs --idea "..." --type ecommerce --label fl-1 --out ./out [--brief-opus]
import { generatePrototype } from './src/generate.mjs';
import { MODELS } from './src/llm.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}
const flag = (n) => process.argv.includes(`--${n}`);

async function main() {
  const idea = arg('idea');
  const type = arg('type', 'webapp');
  const label = arg('label', 'build-' + Date.now());
  const out = path.resolve(arg('out', './out'), label);
  const currency = arg('currency', '₹ (INR)');
  if (!idea) { console.error('need --idea "..."'); process.exit(2); }

  await mkdir(out, { recursive: true });
  console.log(`[gen] "${idea}" (${type}) -> ${label}`);
  const res = await generatePrototype({
    idea, appType: type, currency,
    briefModel: flag('brief-opus') ? MODELS.opus : MODELS.sonnet,
    model: flag('pages-opus') ? MODELS.opus : MODELS.sonnet,
    onEvent: (e) => console.log('   ·', JSON.stringify(e)),
  });

  await writeFile(path.join(out, 'index.html'), res.html);
  await writeFile(path.join(out, 'pages.json'), JSON.stringify(res.pagesData, null, 2));
  await writeFile(path.join(out, 'brief.json'), JSON.stringify({ brief: res.brief, raw: res.raw, manifest: res.manifest }, null, 2));
  await writeFile(path.join(out, 'verification.json'), JSON.stringify(res.verification, null, 2));
  const sr = res.meta.shipReady ? 'SHIP-READY ✅' : 'NOT ship-ready ⚠';
  console.log(`[gen] done in ${(res.meta.ms / 1000).toFixed(1)}s | ${res.meta.htmlLen} bytes | pages=${res.meta.pages} failures=${res.meta.failures.join(',') || 'none'} | verdict=${sr} | ${out}/index.html`);
}

main().catch((e) => { console.error('[gen] FAILED:', e.message); process.exit(1); });
