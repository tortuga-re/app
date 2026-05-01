/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const port = process.env.PORT || 3000
const hostname = 'localhost'

console.log('--- SERVER STARTING (Standard Mode) ---')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('PORT:', process.env.PORT)
console.log('LSNODE_SOCKET:', process.env.LSNODE_SOCKET)

const app = next({ dev, hostname, port: parseInt(String(port), 10) || 3000 })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  console.log('> Next.js app prepared')
  
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Su Hostinger con Passenger, se PORT è undefined, spesso si aspetta la 3000
  // ma dobbiamo assicurarci di non bloccare il loop se il binding fallisce
  server.listen(port, (err) => {
    if (err) {
      console.error('Listen error:', err)
      process.exit(1)
    }
    console.log(`> Ready on http://${hostname}:${port}`)
  })
}).catch(err => {
  console.error('Fatal App Prepare Error:', err)
  process.exit(1)
})
