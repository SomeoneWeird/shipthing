
module.exports = function(server) {

	var timeout = 10;

	var timeouts = {};
	
	server.events.on("player:join", function(player) {

		player.events.on("packet:" + 0xff, function(packet) {

			console.log("GOT " + packet.packet_name + " from " + player.name);

			timeouts[player.name] = 0;

			if(player.loggedin) {

				// Logged in, send KEEP-ALIVE back

				console.log("Sending KEEP-ALIVE to " + player.name);

				player.send(0xff, { uid: player.uid });

			} else {

				console.error("Player not logged in, not sending KEEP-ALIVE. Client should send LOGIN packet before KEEP-ALIVE's")

			}

		});
	});

	setInterval(function() {
		for(var name in timeouts) {
			timeouts[name]++;
		}
	}, 1000);

	setInterval(function() {
		for(var name in timeouts) {
			if(timeouts[name]>=timeout) {
				for(var i = 0; i < server.players.length; i++) {
					if(server.players[i].name == name) {
						server.players[i].disconnected = 1;
					}
				}
			}
		}
	}, 10000);

}