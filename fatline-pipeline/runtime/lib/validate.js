// Tiny JSON-Schema (draft-07 subset) validator — zero dependency.
// Supports: type, required, properties, items, enum, minItems, minLength.
// Enough to validate the job-memory artifact in CI/offline without ajv.

function typeOf(v) {
  if (Array.isArray(v)) return 'array';
  if (v === null) return 'null';
  return typeof v === 'number' ? 'number' : typeof v;
}

export function validate(schema, data, path = '$', errors = []) {
  if (schema.type) {
    const t = typeOf(data);
    const ok = schema.type === 'number' ? t === 'number' : t === schema.type;
    if (!ok) { errors.push(`${path}: expected ${schema.type}, got ${t}`); return errors; }
  }
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${path}: ${JSON.stringify(data)} not in enum [${schema.enum.join(', ')}]`);
  }
  if (schema.type === 'string') {
    if (schema.minLength != null && (data || '').length < schema.minLength)
      errors.push(`${path}: string shorter than minLength ${schema.minLength}`);
  }
  if (schema.type === 'array') {
    if (schema.minItems != null && data.length < schema.minItems)
      errors.push(`${path}: array shorter than minItems ${schema.minItems}`);
    if (schema.items) data.forEach((it, i) => validate(schema.items, it, `${path}[${i}]`, errors));
  }
  if (schema.type === 'object' || schema.properties || schema.required) {
    if (typeOf(data) !== 'object') return errors;
    for (const req of schema.required || [])
      if (!(req in data)) errors.push(`${path}: missing required '${req}'`);
    for (const [k, sub] of Object.entries(schema.properties || {}))
      if (k in data) validate(sub, data[k], `${path}.${k}`, errors);
  }
  return errors;
}
