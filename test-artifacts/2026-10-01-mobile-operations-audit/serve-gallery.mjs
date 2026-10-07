import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.jpg': 'image/jpeg' };
http.createServer(async (request, response) => {
  try {
    const name = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname).slice(1) || 'gallery.html';
    if (!['gallery.html', 'REPORT.md'].includes(name) && !/^\d{2,3}-[a-z0-9-]+\.jpg$/.test(name)) {
      response.writeHead(404).end('Not found');
      return;
    }
    const content = await readFile(path.join(directory, name));
    response.writeHead(200, { 'Content-Type': types[path.extname(name)], 'Cache-Control': 'no-store' }).end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(5176, '127.0.0.1', () => console.log('QA screenshot gallery: http://127.0.0.1:5176/'));
