import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPreferences } from '../preferences.js';

test('Entwürfe und gültige Einstellungen überstehen das Wiederherstellen', () => {
  const draft = { 'label-text':'ÄÖÜ\nMeine Ideen', 'text-size':'27', 'text-font':'pixel', contentMode:'text', brightness:'-35', contrast:'60', border:true, 'text-bold':false, model:'t02', mode:'bayer4', 'text-align':'center' };
  assert.deepEqual(cleanPreferences(draft), draft);
});
test('Beschädigte Entwürfe, fremde Werte und Überlängen werden begrenzt', () => {
  assert.deepEqual(cleanPreferences(null), {});
  assert.deepEqual(cleanPreferences({ model:'unknown', contrast:'101', brightness:'NaN', 'text-bold':'false', extra:'x', contentMode:'invalid' }), {});
  assert.equal(cleanPreferences({ 'label-text':'x'.repeat(2000) })['label-text'].length, 1000);
  assert.deepEqual(cleanPreferences({ contrast:'', brightness:' ' }), {});
});
