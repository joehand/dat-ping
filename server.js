var events = require('events')
var util = require('util')
var pump = require('pump')
var peerNetwork = require('peer-network')
var hyperdrive = require('hyperdrive')
var swarm = require('hyperdrive-archive-swarm')
var memdb = require('memdb')
var encoding = require('dat-encoding')
var debug = require('debug')('dat-ping')

module.exports = PingServer

function PingServer () {
  if (!(this instanceof PingServer)) return new PingServer()
  var self = this
  events.EventEmitter.call(this)

  self.servers = {}
  self.network = peerNetwork()
}
util.inherits(PingServer, events.EventEmitter)

PingServer.prototype.start = function (key) {
  var self = this
  if (!key) throw new Error('must specify key')
  if (self.servers[key]) throw new Error('already joined that key')

  var outData = {
    entries: 0
    // TODO: dat.json info, bytes, etc.
  }

  var server = self.servers[key] = self.network.createServer()
  server.on('connection', function (stream) {
    self.emit('connection', key)
    debug('New peer connection on server', key)
    readKey(function (err, datKey) {
      if (err) return self.emit('error', err)

      var drive = hyperdrive(memdb())
      var archive = drive.createArchive(key, {sparse: true})
      var sw = swarm(archive, {upload: false})
      sw.on('connection', function (peer) {
        debug('new swarm connection')
      })
      archive.list({}, function (err, entries) {
        outData.entries = entries.length
        debug('Sending results for', datKey.toString('hex'))
        stream.write(JSON.stringify(outData))
        stream.end()
      })

      function done () {
        archive.close()
        sw.close()
        stream.end()
      }
    })

    function readKey (cb) {
      var datKey = stream.read(32)
      if (!datKey) return stream.once('readable', function () {
        readKey(cb)
      })
      datKey = encoding.encode(datKey)
      debug('received ping key', datKey.toString('hex'))
      cb(null, datKey)
    }
  })
  server.listen(key)
}
