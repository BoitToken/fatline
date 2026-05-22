// Rule mechanics from FATBOT-RULES.md, as executable code.
// The canonical prose lives in fatline-pipeline/FATBOT-RULES.md; this module is
// the runtime enforcement of the bits a pipeline must apply mechanically.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = join(__dirname, '..', '..', 'FATBOT-RULES.md');

// Rule R10 — exact footer string. Verified verbatim against FATBOT-RULES.md.
export const FOOTER = 'Powered by Claude + OpenClaw + Actual Intelligence';

// Rule #74 — currency by geographic origin; default ₹ INR when ambiguous.
const EU_DIAL = ['+33', '+34', '+39', '+49', '+31', '+32', '+351', '+353', '+352', '+43', '+30', '+358', '+45', '+46', '+47'];
export function resolveCurrency({ phone = '', briefText = '' } = {}) {
  const p = String(phone).trim();
  if (p.startsWith('+91')) return { symbol: '₹', code: 'INR' };
  if (EU_DIAL.some((d) => p.startsWith(d))) return { symbol: '€', code: 'EUR' };
  if (p.startsWith('+1')) return { symbol: '$', code: 'USD' };
  if (/\b(USD|dollars?)\b/i.test(briefText)) return { symbol: '$', code: 'USD' };
  if (/\b(EUR|euros?)\b/i.test(briefText)) return { symbol: '€', code: 'EUR' };
  return { symbol: '₹', code: 'INR' }; // Rule #74 default
}

// Rule #72 — verbatim Discovery Answers block, injected into every downstream prompt.
export function discoveryAnswersBlock(jm) {
  const d = jm.discovery || {};
  const answers = d.discovery_answers || {};
  const lines = Object.entries(answers).map(([q, a]) => `- ${q}: ${a}`);
  return [
    '=== VERBATIM DISCOVERY ANSWERS (Rule #72 — do not paraphrase) ===',
    `app_type: ${d.app_type}`,
    `target_users: ${d.target_users || ''}`,
    `primary_outcome: ${d.primary_outcome || ''}`,
    `core_loop: ${d.core_loop || ''}`,
    `negative_constraints: ${(d.negative_constraints || []).join('; ')}`,
    ...lines,
    '=== END DISCOVERY ANSWERS ===',
  ].join('\n');
}

// Cache the canonical rule text once (used to build agent system prompts).
let _rulesText = null;
export function rulesText() {
  if (_rulesText == null) _rulesText = readFileSync(RULES_PATH, 'utf8');
  return _rulesText;
}
