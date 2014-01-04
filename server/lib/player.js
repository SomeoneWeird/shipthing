var events = require("events"),
		crypto = require('crypto'),
		contextify = require('contextify'),
		Protocol = require('./protocol.js');

    
var Player = module.exports = function Player(socket, server) {

	var self = this;

	this.name;

	this.uid;

	this.server = server;

	this.client = socket;

	this.loggedin = false;

	socket.on("data", function(packet) {

		self.server.protocol.parse(packet, function(data) {

			self.events.emit("packet:" + data.pid, data);

		});

	});

	this.lastTime = Date.now();	

	this.location = {
		block: 0, 
		x: 50, 
		y: 50
	}

	this.moving = false;

	this.movingTo = this.location;

	this.health = 100;

	this.fuel = 50;	

	this.spareEnergy = 8;

	this.energy = {
		shields: 1,
		engine: 1,
		weapons: 0,
		fuelgenerator: 0,
	}

	this.weapons = [ 
		{
			name: "BASIC",
			power: 1,
			damage: 1,
			firerate: 1,
		},
	];

	this.scripts = { };

	this.script_ids = [ ];

	this.context = {

		log: console.log,

		events: self.events,

		weapons: self.weapons,

		canMoveTo: function(x, y) {
			var fuel_needed_x = (self.location.x<x) ? x - self.location.x : self.location.x - x;
			var fuel_needed_y = (self.location.y<y) ? y - self.location.y : self.location.y - y;
			var fuel_needed = fuel_needed_y + fuel_needed_x;
			return self.fuel >= fuel_needed;
		},

		moveTo: function(x, y) {
				
			if(this.canMoveTo(x, y)) {
				self.movingTo.x = x;
				self.movingTo.y = y;
				self.moving = true;
			}

		},

		isMoving: function() {
			return self.moving;
		},

		stopMoving: function() {
			self.moving = false;
			self.movingTo = self.location;
		},

		getHealth: function() {
			return self.health;
		},

		getFuel: function() {
			return self.fuel;
		},

		getPosition: function() {
			return self.location;
		},

		getSpareEnergy: function() {
			return self.spareEnergy;
		},

		getEnergy: function(subsystem) {
			return self.energy[subsystem.toLowerCase()];
		},

		deallocateEnergy: function(from, amount) {
			from = from.toLowerCase();
			if(self.energy[from]>=amount) {
				self.energy[from] -= amount;
				self.spareEnergy += amount;
			}
		},

		allocateEnergy: function(to, amount) {
			to = to.toLowerCase();
			var energy = (to>self.spareEnergy) ? self.spareEnergy : to;
			self.energy[to] += energy;
			self.spareEnergy -= energy;
		},

	}

}

Player.prototype.init = function() {

	this.events = new events.EventEmitter;
	this.protocol = new Protocol();
	this.encryption = crypto.getDiffieHellman('modp5');
	this.encryption.generateKeys();
	contextify(this.context);

}

Player.prototype.send = function(pid, data) {

	// TODO: Encrypt with this.encryption.getPrivateKey()

	var self = this;

	this.protocol.build(pid, data, function(packet) {
		self.client.write(packet);
	});

}

Player.prototype.tick = function(time) {

	// handle
	// []  - movement ( one move per tick )
	// []  - AI 
	// [x] - shield/fuel regen etc.
	// []  - process AI
	// [x] - user scripts.

	// handle fuel regen

	var generatedFuel = this.energy.fuelgenerator * 10;
	// TODO: add generatedFuel to canMove() context function for next nick
	if(this.fuel + generatedFuel > 100) {
		this.fuel = 100;
	} else {
		this.fuel += generatedFuel;
	}

	// handle shield regen

	var regeneratedShield = this.energy.shield * 2;

	if(this.shield + regeneratedShield > 100) {
		this.shield = 100;
	} else {
		this.shield += regeneratedShield;
	}

	// ^ process fuel and shields before movement

	// process user scripts before moving etc. so you can cancel moving if need be

	for(var script in this.scripts) {
		this.context.run(this.scripts[script]);
	}

	// handle movement

	if(this.moving) {

		var path = this.server.pathfinder.findPath(this.location.x, this.location.y, this.movingTo.x, this.movingTo.y, this.server.map);

		// TODO:
		// parse path and figure out which direction to move
		// 2 fuel for diagonal

	}

	this.lastTime = time;

}