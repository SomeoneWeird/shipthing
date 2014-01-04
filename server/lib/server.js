
var net = require('net'),
		events = require('events'),
		contextify = require('contextify'),
		PF = require('pathfinding'),
		Player = require('./player.js'),
		Protocol = require('./protocol.js');

var Server = module.exports = function Server() {
	
	this.port = 8012;

	this.players = [];
	this.enemies = [];

	this.events = new events.EventEmitter;

	this.map = new PF.Grid(10, 10);

	this.pathfinder = new PF.AStarFinder({
    allowDiagonal: true
	});

	this.server = null;

}

Server.prototype.init = function() {
	this.protocol = new Protocol();
	this.packets = new events.EventEmitter();
}

Server.prototype.start = function(cb) {

	var self = this;

	var server = net.createServer(function (socket) {

			var host = socket.remoteAddress;
			var port = socket.remotePort;

			console.log("Got connection from " + host + ":" + port);

			socket.on("end", function() {
				console.log("Connection closed from " + host + ":" + port);
			});
		
			var player = new Player(socket, self);
			player.init();
			self.players.push(player);
			self.events.emit("player:join", player);

	});

	server.listen(this.port, function() {
		console.log("listening on :" + self.port);
		if(cb)
			cb();
	});

	this.server = server;

}

Server.prototype.iterateClients = function(cb) {
	this.players.forEach(function(player) {
		cb(player);
	});
}

Server.prototype.removePlayer = function(player) {
	var index = this.players.indexOf(player);
  if (index !== -1) {
    this.players.splice(index, 1);
    this.events.emit("player:quit", player);
  }
}

Server.prototype.startLoop = function() {
	var self = this;

	setInterval(function() {
		self.players.forEach(function(player) {
			if(player.disconnected == true) {
				self.removePlayer(player);
				self.events.emit("player:timeout", player);
				console.log(player.name + ": timed out");
			}
		});
	}, 5000);

	setInterval(function() {
		self.players.forEach(function(player) {
			player.tick(Date.now());
		});
	}, 1000);
}