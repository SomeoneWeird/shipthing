

var net = require('net'),
    events = require('events'),
    crypto = require('crypto'),
    express = require('express'),
    ejs = require('ejs'),
    sio = require('socket.io')
    Protocol = require('../server/lib/protocol.js');

var app = express();

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  res.render('index.ejs', {
    layout: false
  });
});

app.configure(function() {
    app.set('views', './views');
    app.use(app.router);
    app.use(express.static('./public'));
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

var server = require('http').createServer(app);
var io = sio.listen(server);
server.listen(8013);

var protocol = new Protocol();

var host = "127.0.0.1";
var port = "8012";

var packets = new events.EventEmitter;

var keys = {};

keys.local = crypto.getDiffieHellman('modp5');

keys.local.generateKeys();

var loggedin = false;

var name = "testlolol";

var uid = Math.random().toString(36).substr(2,16) + Math.random().toString(36).substr(2,16);

var client = null;

connect(host, port);

function connect(host, port) {

    client = net.connect({
      port: port,
      host: host
    }, function() {

      console.log('client connected');

      console.log("Sending initial packets.");

      initialPackets();

    });

    client.on('data', function(packet) {

      protocol.parse(packet, function(data) {

        if(data.uid && data.uid != uid) { 
          console.error("Recieved packet with non-matching UID -> " + data.pid);
          console.log(data);
          return;
        }

        packets.emit(data.pid, data);

      }); 
    });

    client.on('end', function() {
      console.log('disconnect from server??');
    });

}


function initialPackets() {

  packets.on(0xFE, function(packet) {

    keys.server = packet.publicKey;
    console.log("Got 0xFE");
    loggedin = 2;

  });

  packets.on(0x02, function(packet) {

    if(packet.uid == uid && loggedin == 2 && keys.server.length == 384) {

      loggedin = true;
      console.log("Got 0x02");
      console.log("Finishing handshake..");

      console.log("Starting to send KEEP-ALIVEs");

    }

  });

  console.log("Starting handshake.");

  sendPacket(0x01, {
    uid: uid,
    name: name
  });

  console.log("Sent 0x01");

  sendPacket(0xFD, {
    publicKey: keys.local.getPublicKey('hex')
  });

  console.log("Sent 0xFD, waiting for 0xFE");

}

function sendPacket(pid, data) {

  if(!loggedin && !( pid == 0x01 || pid == 0xFD )) {
    console.error('need to login before sending ' + pid);
    return;
  }

  protocol.build(pid, data, function(packet) {

    client.write(packet);

  });

}

// KEEP-ALIVE

setInterval(function() {

  if(loggedin === true)
    sendPacket(0xff, { uid: uid });

}, 1000);