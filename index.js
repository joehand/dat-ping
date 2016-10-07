var events = require('events')
var util = require('util')
var network = require('peer-network')()
var encoding = require('dat-encoding')
var debug = require('debug')('dat-ping')

module.exports = DatPing

function DatPing (opts) {
  if (!(this instanceof DatPing)) return new DatPing(opts)
  events.EventEmitter.call(this)
  this.serverKey = opts.server
}

util.inherits(DatPing, events.EventEmitter)

DatPing.prototype.ping = function (key, cb) {
  var self = this
  if (!cb) cb = function (err) { err && self.emit('error', err) }
  if (!key) return cb(new Error('must specify a dat key'))

  var stream = network.connect(self.serverKey)
  stream.once('connect', function (err) {
    if (err) return cb(err)
    debug('writing key', key)
    stream.write(encoding.decode(key))
    stream.on('data', function (data) {
      self.emit('response', JSON.parse(data.toString()))
    })
  })
}
