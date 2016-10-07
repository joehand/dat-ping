#!/usr/bin/env node

var args = require('minimist')(process.argv.slice(2), {
  boolean: ['server']
})

if (args.debug) {
  var debug = args.debug
  if (typeof args.debug === 'boolean') debug = '*' // default
  process.env.DEBUG = debug
}

var DEFAULT_SERVER = 'dat-ping'

if (args.server) runServer()
else if (args._[0]) runPing()
else {
  console.error('Usage: dat-ping <dat-key>')
  process.exit(1)
}

function runPing () {
  var datPing = require('.')({server: DEFAULT_SERVER})
  datPing.ping(args._[0])
  datPing.on('response', function (data) {
    console.log('Ping Successful!')
    console.log(`Server saw ${data.entries} entries in metadata`)
    process.exit(0)
  })
}

function runServer () {
  var pingServer = require('./server')()
  pingServer.start(DEFAULT_SERVER)
  pingServer.on('error', function (err) {
    console.error(err)
  })
}
