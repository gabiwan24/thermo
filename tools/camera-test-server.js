import http from 'node:http';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const allowed = new Set(['index.html', 'style.css', 'app.js', 'preferences.js', 'image.js', 'text.js', 'photo.js', 'pixel-font.js', 'tools/camera-fixture.js', 'manifest.webmanifest', 'assets/papier-pixel.ttf', 'assets/dither.svg', 'vendor/ble.js', 'vendor/printer.js', 'vendor/constants.js']);
http.createServer(async (req, res) => {
  if (new URL(req.url, 'http://localhost').pathname === '/qa') {
    const requested = Number(new URL(req.url, 'http://localhost').searchParams.get('width'));
    const width = [320, 390, 768].includes(requested) ? requested : 390;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    const ble = new URL(req.url, 'http://localhost').searchParams.get('ble');
    const fixtureQuery = ['off','error'].includes(ble) ? `?ble=${ble}` : '';
    res.end(`<title>Mobile QA ${width}px</title><style>body{margin:0;background:#ddd;display:flex;justify-content:center}iframe{border:0;width:${width}px;height:100dvh;background:white}</style><iframe src="/${fixtureQuery}" title="Thermo ${width}px"></iframe>`); return;
  }
  const path = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!allowed.has(path)) { res.writeHead(404); res.end(); return; }
  try {
    let data = await readFile(new URL(path, root));
    if (path === 'index.html') data = data.toString().replace('<script type="module" src="app.js">', '<script type="module" src="tools/camera-fixture.js"></script><script type="module" src="app.js">');
    const types = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', ttf: 'font/ttf', webmanifest: 'application/manifest+json' };
    res.writeHead(200, { 'Content-Type': types[path.split('.').pop()], 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(500); res.end(); }
}).listen(8081, '127.0.0.1', () => console.log('Synthetic camera test: http://localhost:8081'));
