
module.exports = function(server) {
	
	server.events.on("player:join", function(player) {

		player.events.on("packet:" + 0x01, function(packet) {

			if(player.loggedin == false) {

					player.uid = packet.uid;
					player.name = packet.name;
					player.loggedin = 2;

					console.log(player.name + " starting handshake.");

			} else if(player.loggedin == 2) {

				console.log(player.name + " sent 0x01 but is already in the middle of a handshake.");

			} else {

				console.log("Player " + player.name + " already logged in, ignoring 0x01");

			}
		});

		player.events.on("packet:" + 0xFD, function(packet) {

			if(player.loggedin==2) {

				player.encryption.clientKey = packet.publicKey;

				player.loggedin = true;

				console.log(player.name + " sent their publicKey.");

				console.log("Sending publicKey to " + player.name);

				player.send(0xFE, { publicKey: player.encryption.getPublicKey('hex') });

				console.log(player.name + ": sending 0x02 to finish handshake.");

				player.send(0x02, { uid: player.uid });

			} else {

				console.error(player.name + " sent 0xFD without 0x01!");

			}
		});
	});
}