const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const PORT = process.env.PORT || 8080;
const ROOT = path.join(__dirname, 'dist');
const VIVID_ASSET_ROUTE = '/vivid-assets/';
const VIVID_ASSET_BASE = 'https://2d-render-admin-storage.fra1.cdn.digitaloceanspaces.com/projects/1189/products/3478/playcanvas/';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function proxyVividAsset(req, res, urlPath) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method Not Allowed');
  }

  const relativePath = decodeURIComponent(urlPath.slice(VIVID_ASSET_ROUTE.length));
  if (!relativePath || relativePath.split('/').includes('..')) {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  try {
    const upstreamUrl = new URL(relativePath, VIVID_ASSET_BASE);
    const requestHeaders = {};
    ['range', 'if-none-match', 'if-modified-since'].forEach((name) => {
      if (relativePath !== 'js/index.mjs' && req.headers[name]) {
        requestHeaders[name] = req.headers[name];
      }
    });

    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: requestHeaders,
      redirect: 'follow',
    });
    if (relativePath === 'js/index.mjs' && upstream.ok && req.method === 'GET') {
      const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
      const protocol = forwardedProtocol || (req.socket.encrypted ? 'https' : 'http');
      const proxyBase = `${protocol}://${req.headers.host}${VIVID_ASSET_ROUTE}`;
      const source = await upstream.text();
      const rewrittenSource = source.split(VIVID_ASSET_BASE).join(proxyBase);

      res.writeHead(200, {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'no-store',
      });
      return res.end(rewrittenSource);
    }

    const responseHeaders = {};
    ['content-type', 'cache-control', 'etag', 'last-modified', 'accept-ranges', 'content-range'].forEach((name) => {
      const value = upstream.headers.get(name);
      if (value) responseHeaders[name] = value;
    });

    res.writeHead(upstream.status, responseHeaders);
    if (req.method === 'HEAD' || !upstream.body) return res.end();
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    console.error('Vivid asset proxy failed:', error.message);
    if (!res.headersSent) res.writeHead(502);
    res.end('Bad Gateway');
  }
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (urlPath.startsWith(VIVID_ASSET_ROUTE)) {
    proxyVividAsset(req, res, urlPath);
    return;
  }

  let filePath = path.join(ROOT, urlPath === '/' ? '/index.html' : urlPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      filePath = path.join(ROOT, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
