export const preferenceKey = 'thermo.editor.v1';
const choices = {
  model: ['t02', 'm02', 'm02-pro', 'm260'],
  'text-font': ['pixel', 'sans', 'mono'],
  'text-size': ['9', '18', '27', '36', '45', '54'],
  'text-align': ['left', 'center', 'right'],
  mode: ['dither', 'atkinson', 'bayer2', 'bayer4', 'bayer8', 'threshold'],
};
export function cleanPreferences(input) {
  if (!input || typeof input !== 'object') return {};
  const result = {};
  for (const [key, values] of Object.entries(choices)) if (values.includes(input[key])) result[key] = input[key];
  for (const [key, min, max] of [['brightness', -80, 80], ['contrast', -100, 100]]) {
    if (typeof input[key] === 'string' && input[key].trim() && Number.isFinite(Number(input[key])) && Number(input[key]) >= min && Number(input[key]) <= max) result[key] = String(Math.round(Number(input[key])));
  }
  if (typeof input['label-text'] === 'string') result['label-text'] = input['label-text'].slice(0, 1000);
  if (typeof input['text-bold'] === 'boolean') result['text-bold'] = input['text-bold'];
  if (typeof input.border === 'boolean') result.border = input.border;
  if (['photo', 'text'].includes(input.contentMode)) result.contentMode = input.contentMode;
  return result;
}
