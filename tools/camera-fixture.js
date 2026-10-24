// Browser test fixture: synthetic camera only, never asks for access to a real device.
const frame = document.createElement('canvas');
frame.width = 1920; frame.height = 1080;
const context = frame.getContext('2d');
let time = 0;
function paint() {
  const gradient = context.createLinearGradient(0, 0, 1920, 1080);
  gradient.addColorStop(0, '#fff'); gradient.addColorStop(1, '#222');
  context.fillStyle = gradient; context.fillRect(0, 0, 1920, 1080);
  context.fillStyle = '#fff'; context.beginPath(); context.arc(1450, 340, 180, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#111'; context.fillRect(180 + Math.sin(time / 40) * 60, 350, 400, 500);
  context.font = 'bold 100px monospace'; context.fillText('LIVE / TEST', 650, 850);
  time++;
  requestAnimationFrame(paint);
}
paint();
Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
  getUserMedia: async () => frame.captureStream(15),
} });
