import { test } from 'node:test';
import assert from 'node:assert/strict';
import { photoLayout, drawPhoto, cameraDisplaySize } from '../photo.js';

test('Gedrehte Vorschau behält dieselbe Punktgröße in ganzen Gerätepixeln', () => {
  for (const pixelRatio of [1, 1.25, 2, 2.625, 3]) {
    for (const availableWidth of [288, 358, 448]) {
      const landscape = cameraDisplaySize(384, 227, availableWidth, pixelRatio);
      const portrait = cameraDisplaySize(384, 664, availableWidth, pixelRatio);
      const scale = landscape.width / 384;
      assert.equal(portrait.width, landscape.width);
      assert.ok(Math.abs(portrait.height / 664 - scale) < 1e-10);
      assert.ok(Math.abs(scale * pixelRatio - Math.round(scale * pixelRatio)) < 1e-10);
    }
  }
});

test('Originalauflösung bleibt erhalten; Hoch-/Querformat passen auf die Druckbreite', () => {
  const portrait = photoLayout(3000, 4000, 384, 0);
  const landscape = photoLayout(3000, 4000, 384, 90);
  assert.deepEqual(portrait, { width: 384, height: 512, drawWidth: 384, drawHeight: 512 });
  assert.deepEqual(landscape, { width: 384, height: 288, drawWidth: 288, drawHeight: 384 });
  assert.deepEqual(photoLayout(3000, 4000, 384, 180), portrait);
  assert.deepEqual(photoLayout(100, 10000, 384), { width: 384, height: 38400, drawWidth: 384, drawHeight: 38400 });
  assert.throws(() => photoLayout(1, 10000, 384), /Druckprotokoll/);
  assert.throws(() => photoLayout(0, 4000, 384));
});
test('Videoframe und Aufnahme verwenden identische Skalierung und Drehung', () => {
  const frame = { videoWidth: 4096, videoHeight: 3072 };
  const photo = { width: 4096, height: 3072 };
  function draw(source) {
    const calls = [];
    const canvas = { width: 0, height: 0, getContext: () => ({
      fillRect: (...args) => calls.push(['fill', ...args]), save: () => {}, restore: () => {},
      translate: (...args) => calls.push(['translate', ...args]), rotate: angle => calls.push(['rotate', angle]),
      drawImage: (input, ...args) => calls.push(['draw', ...args]),
      getImageData: () => ({ data: new Uint8ClampedArray(canvas.width * canvas.height * 4) }),
    }) };
    const pixels = drawPhoto(canvas, source, { width: 384, rotation: 90 });
    return { calls, width: canvas.width, height: canvas.height, pixels: pixels.length };
  }
  assert.deepEqual(draw(frame), draw(photo));
  assert.deepEqual(frame, { videoWidth: 4096, videoHeight: 3072 });
});

test('Lange oder kurze Bildseite füllt je nach Drehung immer die gesamte Druckbreite', () => {
  for (const width of [384, 576, 624]) for (const rotation of [0, 90, 180, 270]) {
    const layout = photoLayout(1920, 1080, width, rotation);
    assert.equal(rotation % 180 ? layout.drawHeight : layout.drawWidth, width);
    assert.equal(layout.height, Math.round(width * (rotation % 180 ? 1920 / 1080 : 1080 / 1920)));
  }
});
