var path = require('path')
var test = require('tape')
var hyperdrive = require('hyperdrive')
var swarm = require('hyperdrive-archive-swarm')
var memdb = require('memdb')
var raf = require('random-access-file')

var DatPing = require('.')
var PingServer = require('./server')

var serverKey = 'the-best-dat-ping-test-server-ftw'
var server = PingServer()
server.start(serverKey)

var drive = hyperdrive(memdb())
var archive = drive.createArchive({
  file: function (name) {
    return raf(path.join(__dirname, name))
  }
})
archive.append('server.js')
archive.finalize(runTests)

function runTests () {
  var datKey = archive.key.toString('hex')
  var sw = swarm(archive)

  test('ping gets repsonse', function (t) {
    var datPing = DatPing({server: serverKey, timeout: 100})
    datPing.ping(datKey)
    datPing.once('response', function (data) {
      t.pass('received response')
      t.same(data.entries, 1, 'one entry received')
      t.end()
    })
    datPing.once('timeout', function (type) {
      t.fail('timeout')
    })
    datPing.once('error', function () {
      t.fail('error')
    })
  })

  test('wrong ping gets timeout', function (t) {
    var datPing = DatPing({server: serverKey, timeout: 100})
    datPing.ping(Array(64 + 1).join('d')) // not a real key hopefully
    datPing.once('response', function (data) {
      t.fail('got a response oops')
    })
    datPing.once('timeout', function (type) {
      t.same(type, 'dat-swarm', 'dat-swarm timeout received')
      t.end()
    })
    datPing.once('error', function () {
      t.fail('error')
    })
  })

  test.onFinish(function () {
    sw.close()
    server.close()
    process.exit(0) // some handles are not closing
  })
}
