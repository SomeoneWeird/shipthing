
var Concentrate = require('concentrate'),
		Dissolve = require('dissolve'),
		randomstring = require('randomstring'),
		util = require('util'),
		assert = require('assert');

var packet_names = {

	0x01: "LOGIN",
	0x02: "LOGIN-ACK",
	0x03: "MESSAGE",
	0x04: "POS-MOVE",

	0x11: "GET-SCRIPT",
	0x12: "SEND-SCRIPT",
	0x13: "UPDATE-SCRIPT",
	0x14: "SCRIPT-ACK",

	0xfc: "NOT-LOGGED-IN",
	0xfd: "GET-PUBKEY",
	0xfe: "SEND-PUBKEY",
	0xff: "KEEP-ALIVE"

}

var packet_data = {

	0x01: {
		from: "client",
		data: {
			"uid": {
				type: "string",
				length: 32
			},
			"name": {
				type: "string",
				length: 20
			}
		}
	},
	0x02: {
		from: "server",
		data: {
			"uid": {
				type: "string",
				length: 32
			}
		}
	},
	0x03: {
		from: "both",
		data: {
			uid: {
				type: "string",
				length: 32
			},
			from: {
				// UID of sender, 1 if server, 2 if debug
				type: "string",
				length: 32
			},
			message: {
				type: "string",
				length: 100
			}
		}
	},
	0x04: {
		from: "server",
		data: {
			"uid": {
				type: "string",
				length: 32
			},
			"block": {
				type: "uint32be"
			},
			"x": {
				type: "uint32be"
			},
			"y": {
				type: "uint32be"
			}
		}
	},


	0x11: {
		from: "client",
		data: {
			"uid": {
				type: "string",
				length: 32
			},
			"sid": {
				type: "string",
				length: 20
			}
		}
	},

	0x12: {
		from: "server",
		data: {
			"uid": {
				type: "string",
				length: 32
			},
			"sid": {
				type: "string",
				length: 20
			},
			"data": {
				type: "string",
				length: 200
			}
		}
	},

	0x13: {
		from: "client",
		data: {
			"uid": {
				type: "string",
				length: 32
			},
			"sid": {
				type: "string",
				length: 20
			},
			"data": {
				type: "string",
				length: 200
			}
		}
	},

	0x14: {
		from: "server",
		data: {
			"uid": {
				type: "string",
				length: 32
			},
			"sid": {
				type: "string",
				length: 20
			}
		}
	},

	0xfc: {
		from: "server",
		data: {
			// no data, send microtime ?
		}
	},
	0xfd: {
		from: "client",
		data: {
			"publicKey": {
				type: "string",
				length: 384
			}
		}
	},
	0xfe: {
		from: "server",
		data: {
			"publicKey": {
				type: "string",
				length: 384
			}
		}
	},
	0xff: {
		from: "both",
		data: {
			"uid": {
				type: "string",
				length: 32
			},
		}
	}
}

var buildPacket = function(pid, data, cb) {

	var packet = Concentrate().uint8(pid);
	var pdata = packet_data[pid];

	for(var item in data) {
		var type = pdata.data[item].type;
		var value = data[item];

		if(type=="string") {

			var length = pdata.data[item]['length'];
			var t = length - value.length;

			for(var i = 0; i < t; i++) {
				value += " ";
			}

			packet[type](value, length);

		}	else {
			packet[type](value);
		}
	}

	cb(packet.result());

}

function Parser() {
  Dissolve.call(this);
  this.loop(function(end) {
    this.uint8("pid").tap(function() {
      switch (this.vars.pid) {

      	// TODO: loop packet_data and add relevant fields to parser automatically
      	// NOTE: i suppose it doesnt matter but would be easier to add just add packets to packet_data and not have todo anything else

      	case 0x01: this.string("uid", 32); this.string("name", 20); break;
        case 0x02: this.string("uid", 32); break;
        case 0x03: this.string("uid", 32).string("from", 32).string("message", 100); break;
        case 0x04: this.string("uid", 32).uint32be("block").uint32be("x").uint32be("y"); break;
        case 0xfd: this.string("publicKey", 384); break;
        case 0xfe: this.string("publicKey", 384); break;
        case 0xff: this.string("uid", 32); break;

      }
    }).tap(function() {
      this.emit("data", this.vars);
      this.vars = {};
    });
  });
}
util.inherits(Parser, Dissolve);

var parsePacket = function(packet, cb) {
	var self = this;
	var p = new Parser();
	p.on("data", function(data) {
		var t = {};
		for(var item in data) {
			if(typeof data[item] == "string")
				data[item] = data[item].trim();
			t[item] = data[item];
		}

		t.packet_name = packet_names[t.pid];

		cb(t);
	});
	p.write(packet);
}

var testPacket = function(pid, uid) {

	var uid = uid || randomstring.generate(32);
	var pid = pid || 0x02;

	buildPacket(pid, {
		uid: uid
	}, function(packet) {

		parsePacket(packet, function(data) {

			assert.equal(data.pid, pid, "Packet has pid: " + data.pid + " expected " + pid);
			assert.equal(data.uid, uid, "Packet has uid: " + data.uid + " expected " + uid);

		});

	});
}

var protocol = function Protocol() {

	this.parse = parsePacket;
	this.build = buildPacket;
	this.test = testPacket;

}

testPacket();

module.exports = protocol;

