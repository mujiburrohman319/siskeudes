// Server statis untuk Firebase App Hosting / Cloud Run.
// App Hosting menjalankan `npm start` dan mengharuskan aplikasi listen di $PORT (8080).
// Menyajikan hasil build Vite (dist/) dengan fallback SPA ke index.html. Tanpa dependensi.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 8080;

const TIPE = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

if (!existsSync(join(ROOT, 'index.html'))) {
  console.error(`dist/index.html tidak ditemukan di ${ROOT}. Jalankan "npm run build" terlebih dahulu.`);
  process.exit(1);
}

function kirim(res, file, status = 200) {
  const ext = extname(file).toLowerCase();
  const isAset = file.startsWith(join(ROOT, 'assets'));
  res.writeHead(status, {
    'Content-Type': TIPE[ext] ?? 'application/octet-stream',
    'Content-Length': statSync(file).size,
    // Aset Vite ber-hash → cache lama; index.html selalu dicek ulang.
    'Cache-Control': isAset ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let path;
  try {
    path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isFile()) return kirim(res, file);
  // File aset yang hilang → 404 (jangan kirim index.html sebagai JS).
  if (extname(path)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Tidak ditemukan');
    return;
  }
  kirim(res, join(ROOT, 'index.html'));
}).listen(PORT, '0.0.0.0', () => {
  console.log(`SISKEUDES-Web berjalan di port ${PORT}`);
});
