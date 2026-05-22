#!/usr/bin/env node
// Fatline orchestrator CLI.
//   node run.mjs --idea "a marketplace for…" [--surface cli|whatsapp] [--phone +91…]
//                [--promote] [--balance N] [--estimate N] [--out DIR]
// Default generator is the offline MockGenerator (dry-run). Wire LiveGenerator
// for real runs (see lib/generator.js).
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Orchestrator } from './lib/orchestrator.js';
import { MockGenerator } from './lib/generator.js';
import { validate } from './lib/validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

const idea = arg('idea', 'a simple webapp to track daily habits and streaks');
const surface = arg('surface', 'cli');
const phone = arg('phone', '');
const promote = !!arg('promote', false);
const balance = Number(arg('balance', 1000));
const estimate = Number(arg('estimate', 500));
const outDir = arg('out', join(__dirname, 'out'));

const lines = [];
const log = (m) => { lines.push(m); console.log(m); };

log(`=== Fatline orchestrator (dry-run / MockGenerator) ===`);
log(`idea: ${idea}`);
log(`surface: ${surface}  phone: ${phone || '(none)'}\n`);

const orch = new Orchestrator({ generator: new MockGenerator(), surface, phone, log });

const jm = await orch.runToPrototype(idea);
log(`\n-- after free path: stage=${jm.stage}, verifications=${jm.verification.length}, repairs=${jm.repair_log.length}`);

if (promote) {
  log(`\n=== explicit promotion requested (--promote) ===`);
  // First show the guard refusing an *implicit* promotion (Rule #74b)…
  const guard = await orch.promoteToProduction(jm, { explicitApproval: false, balance, estimate });
  log(`  (implicit promote attempt left stage=${guard.stage} — refused as designed)`);
  // …then the legitimate explicit promotion.
  await orch.promoteToProduction(jm, { explicitApproval: true, approvedBy: 'user', balance, estimate });
  log(`\n-- after production path: stage=${jm.stage}`);
}

// Validate the artifact against the schema (Rule R7 spine integrity).
const schema = JSON.parse(readFileSync(join(__dirname, 'schema', 'job-memory.schema.json'), 'utf8'));
// Strip private/mock-only fields before validation.
const clean = JSON.parse(JSON.stringify(jm, (k, v) => (k.startsWith('_') ? undefined : v)));
const errors = validate(schema, clean);
log(`\n=== job-memory.json schema validation ===`);
log(errors.length ? `INVALID:\n - ${errors.join('\n - ')}` : 'VALID — artifact conforms to job-memory.schema.json');

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'job-memory.json'), JSON.stringify(clean, null, 2));
writeFileSync(join(outDir, 'run.log'), lines.join('\n'));
log(`\nartifact → ${join(outDir, 'job-memory.json')}`);
process.exit(errors.length ? 1 : 0);
