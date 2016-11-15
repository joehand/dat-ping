var events = require('events')
var util = require('util')
var network = require('peer-network')()
var encoding = require('dat-encoding')
var ndjson = require('ndjson')

module.exports = DatPing

function DatPing (opts) {
  if (!(this instanceof DatPing)) return new DatPing(opts)
  events.EventEmitter.call(this)
  this.serverKey = opts.server
  this.timeout = opts.timeout || 10000
}

util.inherits(DatPing, events.EventEmitter)

DatPing.prototype.ping = function (key, cb) {
  var self = this
  if (!cb) cb = function (err) { err && self.emit('error', err) }
  if (!key) return cb(new Error('must specify a dat key'))

  var stream = network.connect(self.serverKey)
  stream.on('error', cb)
  stream.once('connect', function (err) {
    if (err) return cb(err)

    var timeout = setTimeout(timeoutEvent, self.timeout)
    var timeoutType = 'ping-server'

    stream.write(encoding.decode(key))
    stream.pipe(ndjson.parse())
      .on('data', function (data) {
        if (data.type === 'received') {
          clearTimeout(timeout)
          timeoutType = 'dat-swarm'
          timeout = setTimeout(timeoutEvent, self.timeout)
        } else if (data.type === 'connection') {
          timeoutType = null
          clearTimeout(timeout)
        } else if (data.type === 'results') {
          clearTimeout(timeout)
          self.emit('response', data.payload)
        }
      })

    function timeoutEvent () {
      timeout = null
      self.emit('timeout', timeoutType)
    }
  })
}
