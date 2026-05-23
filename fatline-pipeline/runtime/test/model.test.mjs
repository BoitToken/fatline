// extractJson robustness — string-aware brace matching. node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJson } from '../lib/modelClient.js';

test('plain object', () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
});
test('fenced ```json block', () => {
  assert.deepEqual(extractJson('here:\n```json\n{"a":[1,2]}\n```\nthanks'), { a: [1, 2] });
});
test('prose before and after', () => {
  assert.deepEqual(extractJson('Sure! {"x":"y"} — done.'), { x: 'y' });
});
test('braces inside string values do not break matching', () => {
  assert.deepEqual(extractJson('{"css":"a{b:c}","n":2}'), { css: 'a{b:c}', n: 2 });
});
test('escaped quotes inside strings', () => {
  assert.deepEqual(extractJson('{"q":"he said \\"hi\\""}'), { q: 'he said "hi"' });
});
test('truncated JSON throws with context (no silent bad parse)', () => {
  assert.throws(() => extractJson('{"a":1,"b":{"c":2'), /truncated|JSON/i);
});
