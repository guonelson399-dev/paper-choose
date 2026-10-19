import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBatches, mergeBatches } from '../src/lib/batches.js';
for (const [name, input] of Object.entries({
  paragraphs: 'First sentence.\n\nSecond paragraph.\n',
  leading: '\n\n  leading and trailing  \n\n',
  crlf: 'First\r\n\r\nSecond\r\n',
  unicode: 'A😀B😃C '.repeat(8),
  hugeParagraph: 'This is a sentence. '.repeat(700),
  noSpaces: 'x'.repeat(12001),
  whitespace: ' \n\t'.repeat(30),
})) {
  test(name + ': exact reconstruction and bounded requests', () => {
    const batches = makeBatches(input, 31);
    assert.ok(batches.every(b => b.text.length <= 31));
    assert.equal(mergeBatches(batches, batches.map(b => b.text)), input);
    assert.ok(batches.every(b => !/^[\uDC00-\uDFFF]/.test(b.text) && !/[\uD800-\uDBFF]$/.test(b.text)));
  });
}
test('partial merge preserves completed batches and whitespace', () => {
  const b = makeBatches('\nFirst.\r\nSecond.\r\n', 10);
  assert.equal(mergeBatches(b, ['第一。']), b[0].prefix + '第一。' + b[0].sep);
});
