import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pixelText } from '../pixel-font.js';
test('Pixelschrift vergrößert jeden schwarzen Punkt exakt in ganzen Blöcken', () => {
  for (const scale of [1, 2, 3, 4, 5, 6]) {
    const small = pixelText('Ägß', 64, { scale: 1, margin: 0 });
    const large = pixelText('Ägß', 64 * scale, { scale, margin: 0 });
    assert.equal(large.height, small.height * scale);
    for (let y = 0; y < large.height; y++) for (let x = 0; x < large.width; x++) {
      assert.equal(large.rgba[(y * large.width + x) * 4], small.rgba[(Math.floor(y / scale) * small.width + Math.floor(x / scale)) * 4]);
    }
  }
});
test('Pixelschrift unterstützt Deutsch und bricht um, lehnt fehlende Zeichen ab', () => {
  const result = pixelText('ÄÖÜäöüß\nDesign & Ideen · 0123456789', 384);
  assert.ok(result.rgba.some(value => value === 0));
  assert.ok(result.rgba.every(value => value === 0 || value === 255));
  assert.ok(pixelText('ABCDEFGHIJKLMNOP', 48, { margin: 0, scale: 1 }).height > 9);
  assert.throws(() => pixelText('🌞', 384), /fehlen/);
  assert.throws(() => pixelText('A', 384, { scale: 1.5 }), /Pixelgröße/);
  assert.throws(() => pixelText('A\n'.repeat(100), 384), /zu lang/);
});
