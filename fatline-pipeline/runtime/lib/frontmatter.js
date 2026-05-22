// Minimal YAML-frontmatter extractor for FatBot SKILL.md files.
// Zero-dependency: handles the simple `name:` / `description:` frontmatter the
// skills use. Not a general YAML parser.
import { readFileSync } from 'node:fs';

export function parseSkill(path) {
  const raw = readFileSync(path, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`No frontmatter in ${path}`);
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  if (!fm.name) throw new Error(`SKILL.md missing 'name' in ${path}`);
  if (!fm.description) throw new Error(`SKILL.md missing 'description' in ${path}`);
  return { name: fm.name, description: fm.description, body: m[2].trim(), raw };
}
