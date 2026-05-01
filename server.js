/* eslint-disable @typescript-eslint/no-require-imports */
// DEBUG ESTREMO PER HOSTINGER
console.log('--- STARTING SERVER.JS ---')

process.on('uncaughtException', (err) => {
  console.error('!!! UNCAUGHT EXCEPTION !!!')
  console.error(err.stack || err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('!!! UNHANDLED REJECTION !!!')
  console.error('At:', promise, 'reason:', reason)
})

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

console.log('Environment Diagnostics:')
console.log('- NODE_ENV:', process.env.NODE_ENV)
console.log('- PORT:', process.env.PORT)
console.log('- LSNODE_SOCKET:', process.env.LSNODE_SOCKET)
console.log('- HOSTNAME:', hostname)
console.log('- WORKING DIR:', process.cwd())

const app = next({ dev, hostname, port: parseInt(String(port), 10) || 3000 })
const handle = app.getRequestHandler()

console.log('Initializing Next.js (app.prepare)...')

app.prepare().then(() => {
  console.log('✓ Next.js App Prepared Successfully')
  
  const server = createServer(async (req, res) => {
    // Log di ogni singola richiesta per vedere se il traffico arriva
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
    
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('!!! REQUEST HANDLING ERROR !!!')
      console.error(err)
      res.statusCode = 500
      res.end('Internal Server Error - Check Logs')
    }
  })

  server.listen(port, (err) => {
    if (err) {
      console.error('!!! LISTEN ERROR !!!')
      console.error(err)
      process.exit(1)
    }
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log('Waiting for requests...')
  })
}).catch(err => {
  console.error('!!! FATAL APP PREPARE ERROR !!!')
  console.error(err)
  process.exit(1)
})
