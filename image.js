export const PATTERNS = [
  { id: 'dither', name: 'Floyd–Steinberg', note: 'Feine, unregelmäßige Punkte' },
  { id: 'atkinson', name: 'Atkinson', note: 'Luftiger Look, kräftige Kontraste' },
  { id: 'bayer2', name: 'Bayer 2 × 2', note: 'Kleines, regelmäßiges Raster' },
  { id: 'bayer4', name: 'Bayer 4 × 4', note: 'Klassischer Retro-Look' },
  { id: 'bayer8', name: 'Bayer 8 × 8', note: 'Mehr Tonstufen, sichtbare Struktur' },
  { id: 'threshold', name: 'Schwellenwert', note: 'Flächig, ohne Dithering' },
];
function bayer(size) {
  let matrix = [[0]];
  while (matrix.length < size) {
    const n = matrix.length;
    matrix = Array.from({ length: n * 2 }, (_, y) => Array.from({ length: n * 2 }, (_, x) =>
      4 * matrix[y % n][x % n] + [[0, 2], [3, 1]][Math.floor(y / n)][Math.floor(x / n)]));
  }
  return matrix;
}
const matrices = { bayer2: bayer(2), bayer4: bayer(4), bayer8: bayer(8) };

// One raster drives both preview and printer, so the dots stay identical.
export function monochrome(rgba, width, height, { brightness = 0, contrast = 0, mode = 'dither' } = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width % 8 || rgba.length !== width * height * 4) throw new Error('Ungültige Bildgröße.');
  if (!PATTERNS.some(pattern => pattern.id === mode)) throw new Error('Unbekanntes Dithermuster.');
  if (!Number.isFinite(contrast) || contrast < -100 || contrast > 100) throw new Error('Ungültiger Kontrast.');
  const contrastFactor = 2 ** (contrast / 50);
  const values = new Float32Array(width * height);
  for (let i = 0; i < values.length; i++) {
    const p = i * 4, alpha = rgba[p + 3] / 255;
    const gray = (.299 * rgba[p] + .587 * rgba[p + 1] + .114 * rgba[p + 2]) * alpha + 255 * (1 - alpha);
    values[i] = Math.max(0, Math.min(255, (gray - 127.5) * contrastFactor + 127.5 + brightness));
  }
  const data = new Uint8Array(width / 8 * height);
  const preview = new Uint8ClampedArray(rgba.length);
  const matrix = matrices[mode];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const threshold = matrix ? (matrix[y % matrix.length][x % matrix.length] + .5) / (matrix.length ** 2) * 255 : 128;
    const i = y * width + x, old = values[i], value = old < threshold ? 0 : 255;
    if (!value) data[y * width / 8 + (x >> 3)] |= 128 >> (x % 8);
    preview[i * 4] = preview[i * 4 + 1] = preview[i * 4 + 2] = value;
    preview[i * 4 + 3] = 255;
    if (mode === 'dither') {
      const error = old - value;
      if (x + 1 < width) values[i + 1] += error * 7 / 16;
      if (y + 1 < height) {
        if (x) values[i + width - 1] += error * 3 / 16;
        values[i + width] += error * 5 / 16;
        if (x + 1 < width) values[i + width + 1] += error / 16;
      }
    } else if (mode === 'atkinson') {
      const error = (old - value) / 8;
      if (x + 1 < width) values[i + 1] += error;
      if (x + 2 < width) values[i + 2] += error;
      if (y + 1 < height) {
        if (x) values[i + width - 1] += error;
        values[i + width] += error;
        if (x + 1 < width) values[i + width + 1] += error;
      }
      if (y + 2 < height) values[i + width * 2] += error;
    }
  }
  return { data, preview, widthBytes: width / 8, heightLines: height };
}
