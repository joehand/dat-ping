#!/usr/bin/env node

var args = require('minimist')(process.argv.slice(2), {
  boolean: ['server'],
  alias: {
    server: 's'
  },
  default: {
    serverKey: 'dat-ping'
  }
})

if (args.debug) {
  var debug = args.debug
  if (typeof args.debug === 'boolean') debug = '*' // default
  process.env.DEBUG = debug
}

if (args.server) runServer()
else if (args._[0]) runPing()
else {
  console.error('Usage: dat-ping <dat-key>')
  process.exit(1)
}

function runPing () {
  var datPing = require('.')({server: args.serverKey})
  datPing.ping(args._[0])
  datPing.once('response', function (data) {
    console.log('Ping Successful!')
    console.log(`Server saw ${data.entries} entries in metadata`)
    process.exit(0)
  })
  datPing.once('timeout', function (type) {
    console.log('Ping Failed.')
    console.log(`${type} timed out trying to connect.`)
    process.exit(1)
  })
  datPing.on('error', function (err) {
    console.error(err)
    process.exit(1)
  })
}

function runServer () {
  var pingServer = require('./server')()
  pingServer.start(args.serverKey)
  pingServer.on('error', function (err) {
    console.error(err)
  })
}
