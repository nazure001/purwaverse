const http = require('http');
const fs = require('fs');
const path = require('path');

// Start backend Express server on port 3000
try {
  const expressApp = require('../server/src/server.js');
  expressApp.listen(3000, () => {
    console.log('Backend Express server listening on http://localhost:3000');
  });
} catch (e) {
  console.log('Backend server error or already started:', e.message);
}

const PUBLIC_DIR = path.resolve(__dirname, '../public');

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api')) {
    const proxyReq = http.request({
      hostname: 'localhost',
      port: 3000,
      path: req.url,
      method: req.method,
      headers: req.headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Backend unreachable' }));
    });
    req.pipe(proxyReq);
    return;
  }

  let reqPath = req.url.split('?')[0];
  let filePath = path.join(PUBLIC_DIR, reqPath === '/' ? 'index.html' : reqPath);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };

  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Preview server running on http://localhost:${PORT}`);
});
