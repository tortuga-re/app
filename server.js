/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '127.0.0.1'
const port = process.env.PORT || '3000'
const listenTarget = isNaN(parseInt(port, 10)) ? port : parseInt(port, 10)

console.log('--- SERVER STARTING ---')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('PORT (raw):', process.env.PORT)
console.log('LISTEN TARGET:', listenTarget)
console.log('HOSTNAME:', hostname)
console.log('DEV MODE:', dev)
console.log('ENV KEYS:', Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('TOKEN') && !k.includes('SECRET')).join(', '))

const app = next({ dev, hostname, port: isNaN(parseInt(port, 10)) ? 3000 : parseInt(port, 10) })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  console.log('> Next.js app prepared')
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(listenTarget, (err) => {
    if (err) throw err
    console.log(`> Ready on ${typeof listenTarget === 'string' ? listenTarget : `http://${hostname}:${listenTarget}`}`)
  })
})
