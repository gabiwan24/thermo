// Shared framing for the live camera and the final print raster.
export function cameraDisplaySize(width, height, availableWidth, pixelRatio = 1) {
  const pixelsPerDot = Math.max(1, Math.floor(availableWidth * pixelRatio / width));
  return { width: width * pixelsPerDot / pixelRatio, height: height * pixelsPerDot / pixelRatio };
}

export function photoLayout(sourceWidth, sourceHeight, width, rotation = 0) {
  if (![sourceWidth, sourceHeight, width].every(value => Number.isFinite(value) && value > 0)) throw new Error('Ungültige Bildgröße.');
  const sideways = rotation % 180 !== 0;
  const sw = sideways ? sourceHeight : sourceWidth, sh = sideways ? sourceWidth : sourceHeight;
  const height = Math.max(1, Math.round(sh * width / sw));
  if (height > 65535) throw new Error('Bild zu lang für das Druckprotokoll.');
  return { width, height, drawWidth: sideways ? height : width, drawHeight: sideways ? width : height };
}

export function drawPhoto(canvas, source, { width, rotation = 0 }) {
  const layout = photoLayout(source.videoWidth || source.width, source.videoHeight || source.height, width, rotation);
  if (canvas.width !== layout.width) canvas.width = layout.width;
  if (canvas.height !== layout.height) canvas.height = layout.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(rotation * Math.PI / 180);
  context.drawImage(source, -layout.drawWidth / 2, -layout.drawHeight / 2, layout.drawWidth, layout.drawHeight);
  context.restore();
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}
