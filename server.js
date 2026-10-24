import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('./', import.meta.url);
const allowed = new Set(['index.html', 'style.css', 'app.js', 'image.js', 'text.js', 'photo.js', 'manifest.webmanifest', 'pixel-font.js', 'assets/papier-pixel.ttf', 'assets/dither.svg', 'vendor/ble.js', 'vendor/printer.js', 'vendor/constants.js']);
const types = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', ttf: 'font/ttf', svg: 'image/svg+xml', webmanifest: 'application/manifest+json' };
const port = Number(process.env.PORT || 8080);
http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (!allowed.has(path)) { res.writeHead(404); res.end('Not found'); return; }
    const data = await readFile(fileURLToPath(new URL(path, root)));
    res.writeHead(200, { 'Content-Type': types[path.split('.').pop()], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  } catch { res.writeHead(500); res.end('Server error'); }
}).listen(port, '0.0.0.0', () => console.log(`Papier: http://localhost:${port} (Handy benötigt HTTPS)`));
