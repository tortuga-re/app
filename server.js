/* eslint-disable @typescript-eslint/no-require-imports */
// Entry point usato da Hostinger tramite lo script `npm start`.
// LIMITAZIONE RISORSE PER HOSTINGER
process.env.UV_THREADPOOL_SIZE = '4';
process.env.NODE_OPTIONS = '--max-old-space-size=512';

const { createServer } = require('http')
const { parse } = require('url')
const path = require('path')
const fs = require('fs')
const next = require('next')

const dev = false; // Forziamo production per risparmiare memoria
const hostname = 'localhost'
const port = process.env.PORT || 3000

const MIME_TYPES = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

function serveStaticFile(filePath, res, maxAgeSeconds = 31536000) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': `public, max-age=${maxAgeSeconds}, immutable`,
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

const app = next({
  dev,
  hostname,
  port: parseInt(String(port), 10) || 3000,
  // Riduciamo ulteriormente il carico se possibile
  conf: {
    experimental: {
      workerThreads: false,
      cpus: 1
    }
  }
})

const handle = app.getRequestHandler()
const nextStaticDir = path.join(__dirname, '.next', 'static')

app.prepare().then(() => {
  console.log('--- TORTUGA APP ONLINE (Low Resource Mode) ---')

  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      const pathname = parsedUrl.pathname || ''

      // Servizio diretto file statici _next/static per evitare di intasare l'Event Loop con chiamate parallele a Next
      if (pathname.startsWith('/_next/static/')) {
        const relPath = pathname.slice('/_next/static/'.length)
        const filePath = path.join(nextStaticDir, relPath)
        if (filePath.startsWith(nextStaticDir) && fs.existsSync(filePath)) {
          return serveStaticFile(filePath, res, 31536000)
        }
      }

      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Request Error:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on port ${port}`)
  })
}).catch(err => {
  console.error('Fatal Initialization Error:', err)
  process.exit(1)
})
