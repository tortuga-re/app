/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http')

const port = process.env.PORT || 3000
const socketPath = process.env.LSNODE_SOCKET
const listenTarget = socketPath || port

console.log('--- HELLO WORLD TEST STARTING ---')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('PORT:', process.env.PORT)
console.log('LSNODE_SOCKET:', socketPath)

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Tortuga App - Test Hello World Online!\nEnvironment: ' + process.env.NODE_ENV + '\nPort: ' + port)
})

server.listen(listenTarget, () => {
  console.log('> Test Server ready on ' + listenTarget)
})

server.on('error', (err) => {
  console.error('Test Server Error:', err)
})
