import { BLETransport } from './vendor/ble.js';
import { print, getPrinterWidthBytes, getPrinterDpi } from './vendor/printer.js';
import { monochrome, PATTERNS } from './image.js';
import { wrapText } from './text.js';
import { pixelText } from './pixel-font.js';
import { drawPhoto, cameraDisplaySize } from './photo.js';
import { cleanPreferences, preferenceKey } from './preferences.js';

const $ = id => document.getElementById(id);
const transport = new BLETransport();
let source = null, rotation = 0, raster = null, stream = null, busy = false, cameraSession = 0, loadSession = 0;
let contentMode = 'photo';
let editingText = false;
let loadingImage = false, pendingPrintConnection = false, renderAnimation = 0;
let cameraRotation = 0, cameraAnimation = 0, lastCameraFrame = 0, cameraFacing = 'environment';
const cameraCanvas = $('camera-preview');
const cameraContext = cameraCanvas.getContext('2d', { willReadFrequently: true });
const preview = $('preview');
const context = preview.getContext('2d');
const cards = PATTERNS.map(pattern => {
  const option = document.createElement('option');
  option.value = pattern.id; option.textContent = pattern.name;
  $('mode').append(option);
  $('camera-mode').append(option.cloneNode(true));
  const button = document.createElement('button');
  button.className = 'pattern'; button.disabled = true;
  const canvas = document.createElement('canvas'); canvas.hidden = true;
  canvas.setAttribute('aria-hidden', 'true');
  const title = document.createElement('strong'); title.textContent = pattern.name;
  button.append(canvas, title);
  button.onclick = () => { $('mode').value = pattern.id; render(); };
  $('patterns').append(button);
  return { button, canvas, pattern };
});
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
  $('system-status').textContent = message;
  $('system-status').classList.toggle('error', error);
}
function savePreferences() {
  const values = { contentMode };
  for (const id of ['model', 'text-font', 'text-size', 'text-align', 'mode', 'brightness', 'contrast', 'label-text']) values[id] = $(id).value;
  values['text-bold'] = $('text-bold').checked; values.border = $('border').checked;
  try { localStorage.setItem(preferenceKey, JSON.stringify(values)); } catch { /* Editing still works if local storage is unavailable. */ }
}
function scheduleRender() {
  savePreferences();
  cancelAnimationFrame(renderAnimation);
  renderAnimation = requestAnimationFrame(() => { renderAnimation = 0; render(); });
}
function update() {
  const connected = transport.isConnected();
  $('connect').textContent = connected ? 'Trennen' : 'Verbinden';
  $('connect').title = connected ? transport.device.name || 'Drucker' : '';
  $('connection-chip').textContent = connected ? 'Verbunden' : 'Offline';
  $('connection-chip').classList.toggle('connected', connected);
  $('connection-chip').setAttribute('aria-label', connected ? 'Drucker verbunden, Einstellungen öffnen' : 'Drucker nicht verbunden, Einstellungen öffnen');
  $('connect').classList.toggle('connected', connected);
  $('connect').disabled = busy || !window.isSecureContext || !BLETransport.isAvailable();
  $('print').disabled = busy || loadingImage || !raster || (!connected && !BLETransport.isAvailable());
  const invalidText = contentMode === 'text' && $('label-text').hasAttribute('aria-invalid');
  $('print').textContent = busy ? 'Bitte warten...' : loadingImage ? 'Bild laden...' : invalidText ? 'Text prüfen' : !raster ? (contentMode === 'photo' ? 'Bild fehlt' : 'Text fehlt') : connected ? 'Drucken' : BLETransport.isAvailable() ? 'Drucker verbinden' : 'Bluetooth fehlt';
  $('connection-state').textContent = connected ? transport.device.name || 'Verbunden' : 'Nicht verbunden';
  $('connect').setAttribute('aria-busy', String(busy));
  $('print').setAttribute('aria-busy', String(busy || loadingImage));
  $('empty-label').textContent = invalidText ? 'Text prüfen' : contentMode === 'text' ? 'Kein Text' : 'Kein Bild';
  $('empty-action').textContent = contentMode === 'text' ? 'Text schreiben' : 'Bild wählen';
  $('empty-action').disabled = busy || loadingImage;
  $('edit-text').disabled = busy;
  $('download').disabled = busy || loadingImage || !raster;
  for (const id of ['choose', 'camera', 'mode', 'brightness', 'contrast', 'border', 'model', 'demo', 'detail']) $(id).disabled = busy;
  for (const id of ['photo-mode', 'text-mode', 'label-text', 'text-font', 'text-size', 'text-align', 'text-bold']) $(id).disabled = busy;
  $('text-bold').disabled = busy || $('text-font').value === 'pixel';
  $('text-bold').closest('label').hidden = $('text-font').value === 'pixel';
  for (const id of ['mode', 'brightness', 'contrast']) $(id).disabled = busy || contentMode === 'text';
  for (const id of ['rotate', 'reset', 'download']) $(id).disabled = busy || loadingImage || !raster;
  $('rotate').disabled = busy || loadingImage || !source || contentMode === 'text';
  for (const { button, pattern } of cards) {
    button.disabled = busy || !source;
    button.setAttribute('aria-pressed', String(pattern.id === $('mode').value));
  }
}
function showRaster() {
  context.putImageData(new ImageData(raster.preview, preview.width, preview.height), 0, 0);
  preview.hidden = false;
  $('empty').hidden = true;
  $('dimensions').textContent = `${preview.width} x ${preview.height}`;
  update();
}
function renderText() {
  $('label-text').removeAttribute('aria-invalid');
  raster = null;
  preview.hidden = true;
  $('empty').hidden = false;
  $('dimensions').textContent = 'Text';
  const text = $('label-text').value;
  if (!text.trim()) { status(''); update(); return; }
  const width = getPrinterWidthBytes('', $('model').value) * 8;
  const size = Number($('text-size').value), margin = $('border').checked ? 16 : 4;
  const family = $('text-font').value === 'mono' ? 'monospace' : 'Arial, sans-serif';
  const font = `${$('text-bold').checked ? 'bold' : 'normal'} ${size}px ${family}`;
  context.font = font;
  try {
    if ($('text-font').value === 'pixel') {
      const result = pixelText(text, width, { scale: size / 9, margin, align: $('text-align').value });
      preview.width = result.width; preview.height = result.height;
      raster = monochrome(result.rgba, result.width, result.height, { mode: 'threshold' });
      showRaster();
      status('');
      return;
    }
    const lines = wrapText(text, width - margin * 2, value => {
      const m = context.measureText(value);
      return Math.max(m.width, (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0));
    });
    const metrics = context.measureText('ÄÖÜgjpq'), ascent = Math.ceil(metrics.actualBoundingBoxAscent || size);
    const descent = Math.ceil(metrics.actualBoundingBoxDescent || size * .25);
    const lineHeight = Math.max(Math.ceil(size * 1.3), ascent + descent + 2);
    const height = margin * 2 + lines.length * lineHeight;
    if (height > 1600) throw new Error('Der Text ist zu lang. Kürze ihn oder wähle eine kleinere Schrift.');
    preview.width = width; preview.height = height;
    context.fillStyle = 'white'; context.fillRect(0, 0, width, height);
    context.font = font; context.fillStyle = 'black';
    context.textAlign = $('text-align').value;
    const x = context.textAlign === 'center' ? Math.floor(width / 2) : context.textAlign === 'right' ? width - margin : margin;
    lines.forEach((line, i) => context.fillText(line, x, margin + ascent + i * lineHeight));
    raster = monochrome(context.getImageData(0, 0, width, height).data, width, height, { mode: 'threshold' });
    showRaster();
    status('');
  } catch (error) { $('label-text').setAttribute('aria-invalid', 'true'); status(error.message, true); update(); }
}
function setContentMode(mode) {
  if (busy) return;
  status('');
  contentMode = mode;
  $('content-title').textContent = mode === 'text' ? 'Textetikett' : 'Foto';
  document.querySelector('.app-shell').classList.toggle('text-mode', mode === 'text');
  $('photo-mode').setAttribute('aria-pressed', String(mode === 'photo'));
  $('text-mode').setAttribute('aria-pressed', String(mode === 'text'));
  setTextEditing(mode === 'text' && !$('label-text').value.trim());
  $('text-settings').hidden = mode !== 'text';
  document.querySelector('.sources').hidden = mode === 'text';
  $('comparison').hidden = mode === 'text';
  $('mode').closest('label').hidden = mode === 'text';
  $('brightness').closest('label').hidden = mode === 'text';
  $('contrast').closest('label').hidden = mode === 'text';
  $('rotate').hidden = mode === 'text';
  $('border').closest('label').hidden = mode === 'photo';
  // Preserve the user's preview zoom instead of changing it on every mode switch.
  savePreferences();
  render();
}
$('photo-mode').onclick = () => setContentMode('photo');
$('text-mode').onclick = () => { loadSession++; loadingImage = false; setContentMode('text'); };
function setTextEditing(open) {
  editingText = open && contentMode === 'text';
  $('text-editor').hidden = !editingText;
  $('preview-scroll').hidden = editingText;
  $('empty').classList.toggle('editing', editingText);
  $('edit-text').hidden = contentMode !== 'text';
  $('edit-text').textContent = editingText ? 'Fertig' : 'Bearbeiten';
  document.querySelector('.paper').classList.toggle('editing-text', editingText);
}
$('edit-text').onclick = () => {
  setTextEditing(!editingText);
  if (editingText) $('label-text').focus();
  else { $('label-text').blur(); render(); }
};
$('empty-action').onclick = () => {
  if (contentMode === 'photo') $('file').click();
  else { setTextEditing(true); $('label-text').focus(); }
};
$('menu-open').onclick = () => { pendingPrintConnection = false; $('system-status').textContent = ''; $('system-menu').showModal(); };
$('connection-chip').onclick = () => $('menu-open').click();
$('menu-close').onclick = () => $('system-menu').close();
for (const id of ['label-text', 'text-font', 'text-size', 'text-align', 'text-bold']) $(id).addEventListener('input', scheduleRender);
function render() {
  $('brightness-value').value = $('brightness').value;
  $('contrast-value').value = $('contrast').value;
  if (contentMode === 'text') { renderText(); return; }
  if (!source) { raster = null; preview.hidden = true; $('empty').hidden = false; $('dimensions').textContent = '384 px'; update(); return; }
  const width = getPrinterWidthBytes('', $('model').value) * 8;
  let original;
  try { original = drawPhoto(preview, source, { width, rotation }); }
  catch (error) { raster = null; preview.hidden = true; $('empty').hidden = false; status(error.message, true); update(); return; }
  const compareVisible = $('main-settings').open && $('comparison').querySelector('details').open;
  for (const { pattern, canvas } of cards) {
    if (!compareVisible && pattern.id !== $('mode').value) continue;
    const result = monochrome(original, width, preview.height, { brightness: Number($('brightness').value), contrast: Number($('contrast').value), mode: pattern.id });
    const detail = $('detail').checked;
    canvas.width = detail ? Math.min(128, width) : width;
    canvas.height = detail ? Math.min(160, preview.height) : preview.height;
    canvas.hidden = false;
    canvas.getContext('2d').putImageData(new ImageData(result.preview, width, preview.height),
      -Math.floor((width - canvas.width) / 2), -Math.floor((preview.height - canvas.height) / 2));
    if (pattern.id === $('mode').value) raster = result;
  }
  showRaster();
  $('brightness-value').value = $('brightness').value;
  update();
}
async function loadFile(file) {
  if (!file) return;
  const session = ++loadSession;
  if (!file.type.startsWith('image/')) { loadingImage = false; update(); return status('Bitte eine Bilddatei auswählen.', true); }
  if (file.size > 30 * 1024 * 1024) { loadingImage = false; update(); return status('Das Bild ist zu groß. Bitte unter 30 MB bleiben.', true); }
  loadingImage = true; update();
  status('Bild wird vorbereitet …');
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    if (session !== loadSession) { bitmap.close(); return; }
    source?.close?.();
    source = bitmap;
    rotation = 0;
    status(''); render();
  } catch {
    if (session === loadSession) status('Dieses Bild konnte nicht geöffnet werden. Bitte JPG, PNG oder WebP verwenden.', true);
  } finally { if (session === loadSession) { loadingImage = false; update(); } }
}
$('choose').onclick = () => $('file').click();
for (const id of ['file', 'capture-file']) $(id).onchange = event => {
  loadFile(event.target.files[0]);
  event.target.value = '';
};
function stopCamera() {
  cameraSession++;
  cancelAnimationFrame(cameraAnimation);
  cameraAnimation = 0;
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  $('video').srcObject = null;
  $('shutter').disabled = true;
  $('camera-switch').disabled = true;
}
function syncCameraControls() {
  for (const id of ['brightness', 'contrast', 'mode']) $(`camera-${id}`).value = $(id).value;
  $('camera-brightness-value').value = $('brightness').value;
  $('camera-contrast-value').value = $('contrast').value;
}
function renderCameraFrame() {
  const video = $('video');
  if (!stream || video.readyState < 2 || !video.videoWidth) return;
  const original = drawPhoto(cameraCanvas, video, {
    width: getPrinterWidthBytes('', $('model').value) * 8,
    rotation: cameraRotation,
  });
  const result = monochrome(original, cameraCanvas.width, cameraCanvas.height, {
    brightness: Number($('brightness').value), contrast: Number($('contrast').value), mode: $('mode').value,
  });
  cameraContext.putImageData(new ImageData(result.preview, cameraCanvas.width, cameraCanvas.height), 0, 0);
  // Scale only by width, in whole device pixels; tall images scroll instead of shrinking.
  const display = cameraDisplaySize(cameraCanvas.width, cameraCanvas.height, $('camera-dialog').clientWidth - 32, window.devicePixelRatio || 1);
  if (cameraCanvas.style.width !== `${display.width}px`) cameraCanvas.style.width = `${display.width}px`;
  if (cameraCanvas.style.height !== `${display.height}px`) cameraCanvas.style.height = `${display.height}px`;
  const resolution = `${video.videoWidth} x ${video.videoHeight}`;
  if ($('camera-resolution').textContent !== resolution) $('camera-resolution').textContent = resolution;
  $('shutter').disabled = false;
  $('camera-switch').disabled = false;
}
function animateCamera(now) {
  if (!stream || !$('camera-dialog').open) return;
  try {
    // shortcut: cap processing at 15 fps to avoid heating the phone; use a worker if needed.
    if (now - lastCameraFrame >= 1000 / 15) { renderCameraFrame(); lastCameraFrame = now; }
    cameraAnimation = requestAnimationFrame(animateCamera);
  } catch {
    stopCamera(); $('camera-dialog').close(); status('Kameravorschau fehlgeschlagen.', true);
  }
}
for (const id of ['brightness', 'contrast', 'mode']) $(`camera-${id}`).addEventListener('input', () => {
  $(id).value = $(`camera-${id}`).value;
  syncCameraControls();
  savePreferences();
  renderCameraFrame();
});
function setCameraControls(open) {
  $('camera-toggle').setAttribute('aria-expanded', String(open));
  $('camera-adjustments').inert = !open;
  $('camera-adjustments').classList.toggle('expanded', open);
}
$('camera-toggle').onclick = () => setCameraControls($('camera-toggle').getAttribute('aria-expanded') !== 'true');
$('camera-rotate').onclick = () => {
  cameraRotation = (cameraRotation + 90) % 360;
  $('camera-rotate').setAttribute('aria-label', `Bild drehen (${cameraRotation} Grad)`);
  renderCameraFrame();
  document.querySelector('.camera-stage').scrollTo(0, 0);
};
async function startCamera(facing, exact = false) {
  stopCamera();
  const session = cameraSession;
  $('camera-resolution').textContent = '...';
  try {
    const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: exact ? { exact: facing } : { ideal: facing }, width: { ideal: 4096 }, height: { ideal: 4096 }, frameRate: { ideal: 15, max: 30 } }, audio: false });
    if (session !== cameraSession) { next.getTracks().forEach(track => track.stop()); return false; }
    stream = next;
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities?.();
    if (capabilities?.width?.max && capabilities?.height?.max) {
      try { await track.applyConstraints({ width: { ideal: capabilities.width.max }, height: { ideal: capabilities.height.max } }); }
      catch { /* Keep the negotiated native stream if its maximum combination is unavailable. */ }
    }
    if (session !== cameraSession) { next.getTracks().forEach(track => track.stop()); return false; }
    cameraFacing = track.getSettings?.().facingMode || facing;
    $('camera-switch').querySelector('span').textContent = cameraFacing === 'user' ? 'Rückkamera' : 'Selfie';
    $('camera-switch').setAttribute('aria-label', cameraFacing === 'user' ? 'Zur Rückkamera wechseln' : 'Zur Selfie-Kamera wechseln');
    $('video').srcObject = stream;
    await $('video').play();
    if (session === cameraSession) { renderCameraFrame(); cameraAnimation = requestAnimationFrame(animateCamera); return true; }
    return false;
  } catch (error) {
    if (session !== cameraSession) return false;
    stopCamera();
    throw error;
  }
}
$('camera').onclick = async () => {
  if (!window.isSecureContext) return status('Die Kamera benötigt HTTPS. Öffne die App über eine HTTPS-Adresse.', true);
  if (!navigator.mediaDevices?.getUserMedia) { $('capture-file').click(); return; }
  loadSession++; loadingImage = false;
  cameraRotation = 0; lastCameraFrame = 0;
  $('camera-rotate').setAttribute('aria-label', 'Bild drehen');
  document.querySelector('.camera-stage').scrollTo(0, 0);
  setCameraControls(false);
  cameraCanvas.width = 384; cameraCanvas.height = 512;
  cameraContext.fillStyle = 'white'; cameraContext.fillRect(0, 0, 384, 512);
  $('camera-resolution').textContent = '...';
  $('camera-status').textContent = '';
  $('camera-switch').disabled = true;
  syncCameraControls();
  $('camera-dialog').showModal();
  // Browser tabs may reject orientation locks; the portrait layout remains enforced by CSS.
  if (screen.orientation?.lock) screen.orientation.lock('portrait').catch(() => {});
  try { await startCamera(cameraFacing); }
  catch (error) {
    $('camera-dialog').close();
    status(error.name === 'NotAllowedError' ? 'Kamera nicht freigegeben. Zugriff in den Website-Einstellungen erlauben.' : 'Kamera nicht verfügbar. Bitte ein Bild aus der Galerie wählen.', true);
  }
};
$('camera-switch').onclick = async () => {
  const previous = cameraFacing;
  const target = previous === 'user' ? 'environment' : 'user';
  $('camera-status').textContent = '';
  try { await startCamera(target, true); }
  catch (error) {
    if (!$('camera-dialog').open) return;
    if (error.name === 'NotAllowedError') { $('camera-dialog').close(); status('Kamerazugriff nicht erlaubt.', true); return; }
    try {
      if (await startCamera(previous)) $('camera-status').textContent = target === 'user' ? 'Selfie-Kamera nicht verfügbar.' : 'Rückkamera nicht verfügbar.';
    } catch { $('camera-dialog').close(); status('Kamerawechsel fehlgeschlagen.', true); }
  }
};
$('close-camera').onclick = () => { stopCamera(); $('camera-dialog').close(); };
$('camera-dialog').addEventListener('close', () => { stopCamera(); render(); });
$('camera-dialog').addEventListener('cancel', stopCamera);
$('shutter').onclick = () => {
  const video = $('video');
  if (!video.videoWidth || !video.videoHeight) return;
  loadSession++;
  source?.close?.();
  source = document.createElement('canvas');
  source.width = video.videoWidth;
  source.height = video.videoHeight;
  source.getContext('2d').drawImage(video, 0, 0);
  rotation = cameraRotation;
  stopCamera();
  $('camera-dialog').close();
  render();
  status('');
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopCamera(); $('camera-dialog').close(); }
});
window.addEventListener('pagehide', stopCamera);
$('rotate').onclick = () => { rotation = (rotation + 90) % 360; render(); };
$('reset').onclick = () => {
  if (contentMode === 'text') {
    $('text-size').value = '27'; $('text-font').value = 'pixel'; $('text-bold').checked = true; $('text-align').value = 'left'; $('border').checked = true; savePreferences(); render(); return;
  }
  rotation = 0; $('brightness').value = '0'; $('contrast').value = '0'; $('mode').value = 'dither'; $('border').checked = true; savePreferences(); render();
};
for (const id of ['brightness', 'contrast', 'mode', 'border', 'model', 'detail']) $(id).addEventListener('input', scheduleRender);
for (const details of [$('main-settings'), $('comparison').querySelector('details')]) details.addEventListener('toggle', () => { if (details.open) scheduleRender(); });
transport.onDisconnect = () => { update(); status(busy ? 'Verbindung abgebrochen. Der Druck kann unvollständig sein.' : 'Drucker getrennt.', busy); };
$('connect').onclick = async () => {
  if (busy) return;
  busy = true; update();
  try {
    if (transport.isConnected()) { await transport.disconnect(); status('Drucker getrennt.'); }
    else {
      status('Verbinden...');
      await transport.connect({ showAllDevices: true });
      status(`Verbunden: ${transport.device.name || 'Phomemo'}`);
      if (pendingPrintConnection) { pendingPrintConnection = false; $('system-menu').close(); $('print').focus(); }
    }
  } catch (error) {
    await transport.disconnect();
    status(error.name === 'NotFoundError' ? 'Keine Verbindung ausgewählt. Du kannst es erneut versuchen.' : `Verbindung fehlgeschlagen: ${error.message}. Schließe die Phomemo-App und versuche es erneut.`, true);
  } finally { busy = false; update(); if (transport.isConnected() && !$('system-menu').open) $('print').focus(); }
};
$('print').onclick = async () => {
  if (busy || loadingImage || !raster) return;
  if (renderAnimation) { cancelAnimationFrame(renderAnimation); renderAnimation = 0; render(); if (!raster) return; }
  if (!transport.isConnected()) { pendingPrintConnection = true; $('system-status').textContent = ''; $('system-menu').showModal(); return; }
  busy = true; update();
  try {
    const feed = Math.round(7 * getPrinterDpi(transport.device.name, $('model').value) / 25.4);
    await print(transport, raster, { isBLE: true, deviceName: transport.device.name, printerModel: $('model').value, density: 4, feed,
      onProgress: percent => status(`Bild wird an den Drucker gesendet … ${percent} %`),
    });
    status('Bild vollständig übertragen. Bitte den Ausdruck am Drucker prüfen.');
  } catch (error) { status(`Druck unterbrochen: ${error.message}. Bitte Drucker prüfen, bevor du erneut druckst.`, true); }
  finally { busy = false; update(); }
};
$('download').onclick = () => {
  if (renderAnimation) { cancelAnimationFrame(renderAnimation); renderAnimation = 0; render(); }
  if (!raster || loadingImage || busy) return;
  const filename = contentMode === 'text' ? 'papier-etikett.png' : `papier-${$('mode').value}.png`;
  preview.toBlob(blob => {
  if (!blob) return status('Bild konnte nicht gespeichert werden.', true);
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}, 'image/png');
};
$('original-pixels').onchange = () => $('preview-scroll').classList.toggle('original-pixels', $('original-pixels').checked);
$('demo').onclick = () => {
  loadSession++;
  source?.close?.();
  source = document.createElement('canvas'); source.width = 768; source.height = 960;
  const c = source.getContext('2d');
  const gradient = c.createLinearGradient(0, 0, 768, 700);
  gradient.addColorStop(0, '#f8f3dc'); gradient.addColorStop(.55, '#859083'); gradient.addColorStop(1, '#182d32');
  c.fillStyle = gradient; c.fillRect(0, 0, 768, 960);
  c.fillStyle = '#f6df9e'; c.beginPath(); c.arc(525, 230, 123, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5b7972'; c.beginPath(); c.moveTo(0, 690); c.lineTo(275, 300); c.lineTo(620, 790); c.lineTo(0, 790); c.fill();
  c.fillStyle = '#233e43'; c.beginPath(); c.moveTo(210, 790); c.lineTo(580, 420); c.lineTo(768, 670); c.lineTo(768, 850); c.fill();
  c.fillStyle = '#fffaf0'; c.fillRect(0, 790, 768, 170);
  c.fillStyle = '#202b29'; c.font = 'bold 50px Arial'; c.fillText('RASTER / 001', 40, 860);
  c.font = '25px Arial'; c.fillText('Licht, Flächen & feine Übergänge.', 40, 915);
  rotation = 0; render(); status('');
};
$('support').textContent = !window.isSecureContext ? 'Kamera und Bluetooth benötigen HTTPS.' : !BLETransport.isAvailable() ? 'Bluetooth benötigt Chrome auf Android oder einen unterstützten Desktop-Browser.' : '';
$('support').hidden = !$('support').textContent;
let saved = {};
try { saved = cleanPreferences(JSON.parse(localStorage.getItem(preferenceKey))); } catch { /* Ignore invalid or inaccessible drafts. */ }
for (const [id, value] of Object.entries(saved)) {
  if (id === 'contentMode') continue;
  if (typeof value === 'boolean') $(id).checked = value; else $(id).value = value;
}
$('border').closest('label').hidden = true;
setContentMode(saved.contentMode || 'photo');
