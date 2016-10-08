var events = require('events')
var util = require('util')
var peerNetwork = require('peer-network')
var hyperdrive = require('hyperdrive')
var swarm = require('hyperdrive-archive-swarm')
var memdb = require('memdb')
var encoding = require('dat-encoding')
var ndjson = require('ndjson')
var pump = require('pump')
var debug = require('debug')('dat-ping')

module.exports = PingServer

var webrtc

try {
  webrtc = require('electron-webrtc')()
} catch (e) {
  webrtc = false
}

function PingServer () {
  if (!(this instanceof PingServer)) return new PingServer()
  var self = this
  events.EventEmitter.call(this)

  self.openPings = []
  self.servers = {}
  self.network = peerNetwork()
}
util.inherits(PingServer, events.EventEmitter)

PingServer.prototype.start = function (key) {
  var self = this
  if (!key) throw new Error('must specify key')
  if (self.servers[key]) throw new Error('already joined that key')
  debug(`Running dat-ping server on key: ${key}`)

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
      debug('open', self.openPings.indexOf(datKey))
      if (self.openPings.indexOf(datKey) > -1) return
      self.openPings.push(datKey)

      var serialize = ndjson.serialize()
      pump(serialize, stream, function (err) {
        if (err) debug('stream error', err)
        return done()
      })
      serialize.write({type: 'received', key: datKey})

      var drive = hyperdrive(memdb())
      var archive = drive.createArchive(datKey, {sparse: true})
      var sw = swarm(archive, {upload: false, wrtc: webrtc})
      sw.on('connection', function (peer) {
        debug('new swarm connection')
        serialize.write({type: 'connection'})
      })
      archive.list({}, function (err, entries) {
        if (err) return self.emit('error', err)
        outData.entries = entries.length
        debug('Sending results for', datKey.toString('hex'))
        serialize.write({type: 'results', payload: outData})
        return done()
      })

      function done () {
        archive.close()
        sw.close()
        stream.end()
        self.openPings.splice(self.openPings.indexOf(datKey))
      }
    })

    function readKey (cb) {
      var datKey = stream.read(32)
      if (!datKey) {
        return stream.once('readable', function () {
          readKey(cb)
        })
      }
      try {
        datKey = encoding.encode(datKey)
      } catch (e) { return cb(e) }
      debug('received ping key', datKey.toString('hex'))
      cb(null, datKey)
    }
  })
  server.listen(key)
}

PingServer.prototype.close = function (cb) {
  var self = this
  self.network.destroy(cb)
}
