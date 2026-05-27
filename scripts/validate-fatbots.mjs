#!/usr/bin/env node
// CI guard for the FatBot definitions. Zero-dependency. Run from repo root.
// Checks (the audit's A + B, ported to Node so CI needs no python):
//   A. Every SKILL.md has valid frontmatter (name matches dir, description present)
//   B. Every Rxx / #xx / Dx a SKILL cites is defined in FATBOT-RULES.md
//   C. Each agent has a manifest.json with the Rule #44 fields
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PIPE = join(ROOT, 'fatline-pipeline');
const AGENTS = join(PIPE, 'agents');
const RULES = join(PIPE, 'FATBOT-RULES.md');
let fail = 0;
const ok = (m) => console.log(`  ok   ${m}`);
const bad = (m) => { console.log(`  FAIL ${m}`); fail++; };

// ---- A. frontmatter ----
console.log('A. SKILL.md frontmatter');
const dirs = readdirSync(AGENTS).filter((d) => existsSync(join(AGENTS, d, 'SKILL.md')));
const skills = {};
for (const d of dirs) {
  const txt = readFileSync(join(AGENTS, d, 'SKILL.md'), 'utf8');
  skills[d] = txt;
  const m = txt.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) { bad(`${d}: no frontmatter`); continue; }
  const name = (m[1].match(/^name:\s*(.+)$/m) || [])[1]?.trim();
  const desc = (m[1].match(/^description:\s*(.+)$/m) || [])[1]?.trim();
  if (name !== d) bad(`${d}: name '${name}' != dir`);
  else if (!desc || desc.length < 40) bad(`${d}: description missing/short`);
  else ok(`${d}`);
}

// ---- B. rule-reference integrity ----
console.log('B. rule-reference integrity');
const rulesTxt = readFileSync(RULES, 'utf8');
const defined = new Set();
for (const m of rulesTxt.matchAll(/^### (R\d+|D\d+) /gm)) defined.add(m[1]);
for (const m of rulesTxt.matchAll(/#(\d+[a-c]?)/g)) defined.add(m[1]);
for (const [d, txt] of Object.entries(skills)) {
  const refs = new Set();
  for (const m of txt.matchAll(/#(\d+[a-c]?)/g)) refs.add(m[1]);
  for (const m of txt.matchAll(/\b(R\d+|D\d+)\b/g)) refs.add(m[1]);
  const dangling = [...refs].filter((r) => !defined.has(r));
  if (dangling.length) bad(`${d}: dangling refs ${dangling.join(', ')}`);
  else ok(`${d} (${refs.size} refs)`);
}
if (!existsSync(RULES)) bad('FATBOT-RULES.md missing');

// ---- C. manifests ----
console.log('C. per-agent manifest.json (Rule #44)');
const need = ['phase', 'depends_on', 'outputs', 'max_runtime', 'quality_gate'];
for (const d of dirs) {
  const mp = join(AGENTS, d, 'manifest.json');
  if (!existsSync(mp)) { bad(`${d}: no manifest.json`); continue; }
  let man;
  try { man = JSON.parse(readFileSync(mp, 'utf8')); } catch (e) { bad(`${d}: manifest invalid JSON`); continue; }
  const miss = need.filter((k) => !(k in man));
  if (miss.length) bad(`${d}: manifest missing ${miss.join(', ')}`);
  else ok(`${d} manifest`);
}

console.log(`\n${fail ? `FAIL — ${fail} issue(s)` : 'PASS — FatBot definitions valid'}`);
process.exit(fail ? 1 : 0);
