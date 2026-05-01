/* eslint-disable @typescript-eslint/no-require-imports */
// LIMITAZIONE RISORSE PER HOSTINGER
process.env.UV_THREADPOOL_SIZE = 1;

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = false; // Forziamo production per risparmiare memoria
const hostname = 'localhost'
const port = process.env.PORT || 3000

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

app.prepare().then(() => {
  console.log('--- TORTUGA APP ONLINE (Low Resource Mode) ---')
  
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
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
