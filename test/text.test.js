import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapText } from '../text.js';
test('Textumbruch respektiert Wörter, Leerzeilen, Umlaute und lange Wörter', () => {
  const measure = text => [...text].length;
  assert.deepEqual(wrapText('Hallo Welt\n\nÄÖÜß', 7, measure), ['Hallo', 'Welt', '', 'ÄÖÜß']);
  assert.deepEqual(wrapText('ABCDEFGHI\r\nOK', 4, measure), ['ABCD', 'EFGH', 'I', 'OK']);
  assert.deepEqual(wrapText('🌞🌞🌞', 2, measure), ['🌞🌞', '🌞']);
  assert.throws(() => wrapText('A', 1, () => 2), /zu breit/);
});
