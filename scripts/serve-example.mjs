#!/usr/bin/env node
/**
 * Lightweight static server for the Quarto example output used in Playwright tests.
 * Serves files from example/_output and maps `/example` to the generated index.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', 'example', '_output');
const PORT = Number(process.env.PORT ?? '5173');
const HOST = process.env.HOST ?? '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const sanitizePath = (requestedPath) => {
  const normalized = normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
  return normalized;
};

const resolvePath = async (urlPath) => {
  if (urlPath === '/' || urlPath === '/example' || urlPath === '/example/') {
    return join(ROOT, 'index.html');
  }

  let candidate = join(ROOT, sanitizePath(urlPath));
  try {
    const stats = await stat(candidate);
    if (stats.isDirectory()) {
      return join(candidate, 'index.html');
    }
    return candidate;
  } catch {
    // Try appending .html for bare paths
    candidate = `${candidate}.html`;
    const fallbackStats = await stat(candidate).catch(() => null);
    if (fallbackStats) {
      return candidate;
    }
    throw new Error('NOT_FOUND');
  }
};

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    const filePath = await resolvePath(decodeURIComponent(url.pathname));
    const ext = filePath.slice(filePath.lastIndexOf('.'));
    const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(body);
  } catch (error) {
    if ((error instanceof Error && error.message === 'NOT_FOUND') || error.code === 'ENOENT') {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    console.error('Static server error:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Example site available at http://${HOST}:${PORT}`);
});
