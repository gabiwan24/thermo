import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monochrome, PATTERNS } from '../image.js';
import { print, getPrinterWidthBytes } from '../vendor/printer.js';

test('packt schwarze Pixel MSB-first und zeigt exakt dieselben Punkte', () => {
  const input = new Uint8ClampedArray(16 * 4);
  for (let i = 0; i < 16; i++) input.set([i % 2 ? 255 : 0, i % 2 ? 255 : 0, i % 2 ? 255 : 0, 255], i * 4);
  const result = monochrome(input, 8, 2);
  assert.deepEqual([...result.data], [0xaa, 0xaa]);
  assert.equal(result.widthBytes, 1);
  for (let i = 0; i < 16; i++) assert.equal(result.preview[i * 4], input[i * 4]);
});
test('transparente Pixel bleiben weiß und ungültige Maße werden abgelehnt', () => {
  assert.deepEqual([...monochrome(new Uint8ClampedArray(32), 8, 1).data], [0]);
  assert.throws(() => monochrome(new Uint8ClampedArray(28), 7, 1));
});
test('Helligkeit und Raster verändern das Bild kontrolliert', () => {
  const input = new Uint8ClampedArray(32);
  for (let i = 0; i < 8; i++) input.set([120, 120, 120, 255], i * 4);
  assert.equal(monochrome(input, 8, 1, { mode: 'threshold' }).data[0], 255);
  assert.equal(monochrome(input, 8, 1, { mode: 'threshold', brightness: 40 }).data[0], 0);
  const result = monochrome(input, 8, 1);
  assert.notEqual(result.data[0], 255);
  assert.notEqual(result.data[0], 0);
  for (let x = 0; x < 8; x++) assert.equal(result.preview[x * 4] === 0, Boolean(result.data[0] & (128 >> x)));
});
test('Kontrast verstärkt und reduziert Tonabstände vor dem Dithering', () => {
  const pixels = new Uint8ClampedArray(8 * 8 * 4);
  const blackCount = contrast => {
    const result = monochrome(pixels, 8, 8, { mode: 'bayer8', contrast });
    return [...result.preview].filter((value, i) => i % 4 === 0 && value === 0).length;
  };
  for (const gray of [96, 160]) {
    for (let i = 0; i < 64; i++) pixels.set([gray, gray, gray, 255], i * 4);
    const neutral = blackCount(0), high = blackCount(100), low = blackCount(-100);
    if (gray < 128) { assert.ok(high > neutral); assert.ok(low < neutral); }
    else { assert.ok(high < neutral); assert.ok(low > neutral); }
    assert.deepEqual(monochrome(pixels, 8, 8), monochrome(pixels, 8, 8, { contrast: 0 }));
  }
  assert.throws(() => blackCount(NaN), /Kontrast/);
  assert.throws(() => blackCount(101), /Kontrast/);
});
test('alle Muster behalten Endwerte, sind deterministisch und stimmen mit den Druckbits überein', () => {
  for (const { id } of PATTERNS) {
    for (const gray of [0, 255]) {
      const pixels = new Uint8ClampedArray(8 * 8 * 4);
      for (let i = 0; i < 64; i++) pixels.set([gray, gray, gray, 255], i * 4);
      const result = monochrome(pixels, 8, 8, { mode: id });
      assert.ok(result.data.every(byte => byte === (gray === 0 ? 255 : 0)), id);
    }
    const gradient = new Uint8ClampedArray(8 * 8 * 4);
    for (let i = 0; i < 64; i++) gradient.set([i * 4, i * 4, i * 4, 255], i * 4);
    const a = monochrome(gradient, 8, 8, { mode: id });
    assert.deepEqual(a, monochrome(gradient, 8, 8, { mode: id }));
    for (let i = 0; i < 64; i++) assert.equal(a.preview[i * 4] === 0, Boolean(a.data[i >> 3] & (128 >> (i % 8))), id);
  }
  assert.throws(() => monochrome(new Uint8ClampedArray(32), 8, 1, { mode: 'invalid' }));
});
test('Bayer-Raster füllt bei mittlerem Grau genau die Hälfte und wiederholt seine Kachel', () => {
  const pixels = new Uint8ClampedArray(16 * 16 * 4);
  for (let i = 0; i < 256; i++) pixels.set([127.5, 127.5, 127.5, 255], i * 4);
  for (const [mode, size] of [['bayer2', 2], ['bayer4', 4], ['bayer8', 8]]) {
    const result = monochrome(pixels, 16, 16, { mode });
    assert.equal([...result.preview].filter((value, i) => i % 4 === 0 && value === 0).length, 128);
    for (let y = 0; y < 16 - size; y++) for (let x = 0; x < 16 - size; x++) {
      const gray = (x, y) => result.preview[(y * 16 + x) * 4];
      assert.equal(gray(x, y), gray(x + size, y + size));
    }
  }
});
test('T02-Treiber sendet Header, unverändertes Raster und Vorschub; Abbruch wird weitergegeben', async () => {
  const writes = [], progress = [];
  const transport = { send: async bytes => writes.push([...bytes]), delay: async () => {} };
  const raster = { data: new Uint8Array(48 * 2).fill(0xaa), widthBytes: 48, heightLines: 2 };
  assert.equal(getPrinterWidthBytes('', 't02'), 48);
  await print(transport, raster, { isBLE: true, printerModel: 't02', density: 4, onProgress: p => progress.push(p) });
  assert.deepEqual(writes[3], [0x1d, 0x76, 0x30, 0, 48, 0, 2, 0]);
  assert.deepEqual(writes[4], [...raster.data]);
  assert.deepEqual(writes.at(-1), [0x1b, 0x4a, 32]);
  assert.equal(progress.at(-1), 100);
  await assert.rejects(print({ send: async () => { throw new Error('Disconnected'); } }, raster, { isBLE: true, printerModel: 't02' }), /Disconnected/);
});
