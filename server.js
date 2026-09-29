/** Local development server. The allowlist keeps workspace files off the LAN. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const root = __dirname;
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '127.0.0.1';
const files = new Set(['/index.html', '/styles.css', '/data/dat.xml']);
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.xml': 'application/xml', '.svg': 'image/svg+xml' };

function allowed(pathname) {
  return files.has(pathname) || /^\/src\/(?:main\.js|game\/[\w-]+\.js|assets\/images\/(?:terrain|army)\/[\w-]+\.svg)$/.test(pathname);
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  if (!allowed(pathname)) {
    response.writeHead(404).end('Not found');
    return;
  }
  const file = path.join(root, pathname.slice(1));
  fs.readFile(file, (error, content) => {
    if (error) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': `${mime[path.extname(file)]}; charset=utf-8`,
      'Cache-Control': 'no-store'
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  });
});

server.listen(port, host, () => {
  console.log(`电脑预览：http://localhost:${port}/`);
  if (host === '0.0.0.0') {
    const addresses = Object.values(os.networkInterfaces()).flat()
      .filter(item => item && item.family === 'IPv4' && !item.internal)
      .map(item => item.address);
    for (const address of [...new Set(addresses)]) {
      console.log(`手机同一 Wi-Fi 可尝试：http://${address}:${port}/`);
    }
  }
  console.log('按 Ctrl+C 停止服务');
});
