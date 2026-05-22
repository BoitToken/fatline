// Loads the 6 FatBot SKILL.md files and assembles the system prompt each agent
// runs with: skill body + the canonical rule system + (for downstream agents)
// the verbatim discovery-answers block (Rule #72).
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSkill } from './frontmatter.js';
import { rulesText, discoveryAnswersBlock } from './rules.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = join(__dirname, '..', '..', 'agents');

// Stage → agent directory. The 6-stage FatBot pipeline.
export const STAGE_AGENT = {
  discovery: 'fatline-discovery-director',
  concept: 'fatline-concept-architect',
  prototype: 'fatline-prototype-builder',
  verifying: 'fatline-verification-orchestrator',
  repairing: 'fatline-repair-engineer',
  production: 'fatline-production-forge',
};

export function loadAgents() {
  const out = {};
  for (const dir of readdirSync(AGENTS_DIR)) {
    const skill = parseSkill(join(AGENTS_DIR, dir, 'SKILL.md'));
    out[dir] = skill;
  }
  return out;
}

// Build the full system prompt for a stage's agent.
export function systemPromptFor(stage, agents, jm) {
  const dir = STAGE_AGENT[stage];
  const skill = agents[dir];
  if (!skill) throw new Error(`No agent for stage ${stage}`);
  const downstream = stage !== 'discovery';
  return [
    `# ${skill.name}`,
    skill.description,
    '',
    '## Operating rules (canonical)',
    rulesText(),
    '',
    '## Role skill',
    skill.body,
    ...(downstream ? ['', discoveryAnswersBlock(jm)] : []),
  ].join('\n');
}
