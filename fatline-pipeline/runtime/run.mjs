#!/usr/bin/env node
// Fatline orchestrator CLI.
//   node run.mjs --idea "a marketplace for…" [--surface cli|whatsapp] [--phone +91…]
//                [--promote] [--balance N] [--estimate N] [--out DIR]
//   Generators:
//     (default)            offline MockGenerator — deterministic dry-run, no creds
//     --live               LiveGenerator → Anthropic model + api.produsa.app
//                          (needs ANTHROPIC_API_KEY + PRODUSA_TOKEN; R9)
//     --live --allow-production   also fire the PAID POST /build/production
//     --probe              read-only connectivity check (GET /api/health), then exit
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Orchestrator } from './lib/orchestrator.js';
import { MockGenerator, LiveGenerator } from './lib/generator.js';
import { validate } from './lib/validate.js';
import { loadConfig, assertLiveReady } from './lib/config.js';
import { ProdusaClient } from './lib/produsaClient.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};

const cfg = loadConfig();
const lines = [];
const log = (m) => { lines.push(m); console.log(m); };

// --probe: read-only connectivity check, no build, no model.
if (cfg.probe) {
  log(`=== probe: ${cfg.apiBase}/api/health ===`);
  try {
    const h = await new ProdusaClient({ apiBase: cfg.apiBase, token: cfg.token }).health();
    log(`OK — ${JSON.stringify(h)}`);
    process.exit(0);
  } catch (e) { log(`FAIL — ${e.message}`); process.exit(1); }
}

const idea = arg('idea', 'a simple webapp to track daily habits and streaks');
const surface = arg('surface', 'cli');
const phone = arg('phone', '');
const promote = !!arg('promote', false);
const balance = Number(arg('balance', 1000));
const estimate = Number(arg('estimate', 500));
const outDir = arg('out', join(__dirname, 'out'));

let generator;
if (cfg.live) {
  try { assertLiveReady(cfg); } // ANTHROPIC_API_KEY / PRODUSA_TOKEN required
  catch (e) { console.error(`\n✗ ${e.message}\n`); process.exit(2); }
  generator = new LiveGenerator({ ...cfg, log });
  log(`=== Fatline orchestrator (LIVE → ${cfg.apiBase}, model ${cfg.model}) ===`);
  log(cfg.allowProduction ? '⚠️  --allow-production: the PAID production build WILL fire on promote.' : 'production build is gated (omit --allow-production = prototype only).');
} else {
  generator = new MockGenerator();
  log(`=== Fatline orchestrator (dry-run / MockGenerator) ===`);
}
log(`idea: ${idea}`);
log(`surface: ${surface}  phone: ${phone || '(none)'}\n`);

const orch = new Orchestrator({ generator, surface, phone, log });

const jm = await orch.runToPrototype(idea);
log(`\n-- after free path: stage=${jm.stage}, verifications=${jm.verification.length}, repairs=${jm.repair_log.length}`);

if (promote) {
  log(`\n=== explicit promotion requested (--promote) ===`);
  const guard = await orch.promoteToProduction(jm, { explicitApproval: false, balance, estimate });
  log(`  (implicit promote attempt left stage=${guard.stage} — refused as designed)`);
  await orch.promoteToProduction(jm, { explicitApproval: true, approvedBy: 'user', balance, estimate });
  log(`\n-- after production path: stage=${jm.stage}`);
}

// Validate the artifact against the schema (Rule R7 spine integrity).
const schema = JSON.parse(readFileSync(join(__dirname, 'schema', 'job-memory.schema.json'), 'utf8'));
const clean = JSON.parse(JSON.stringify(jm, (k, v) => (k.startsWith('_') ? undefined : v)));
const errors = validate(schema, clean);
log(`\n=== job-memory.json schema validation ===`);
log(errors.length ? `INVALID:\n - ${errors.join('\n - ')}` : 'VALID — artifact conforms to job-memory.schema.json');

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'job-memory.json'), JSON.stringify(clean, null, 2));
writeFileSync(join(outDir, 'run.log'), lines.join('\n'));
log(`\nartifact → ${join(outDir, 'job-memory.json')}`);
process.exit(errors.length ? 1 : 0);
