
module.exports = function(server) {
	
	server.events.on("player:join", function(player) {

		player.events.on("packet:" + 0x11, function(packet) {

			if(~player.script_ids.indexOf[packet.sid]) {

				var script = player.scripts[packet.sid];

				player.send(0x12, { uid: player.uid, sid: packet.sid, data: script });

			} else {

				player.send(0x03, { uid: player.uid, from: 1, message: "Script: " + packet.sid + " doesn't exist." });

			}
		});

		player.events.on("packet:" + 0x13, function(packet) {

			if(!~player.script_ids[packet.sid])
				player.script_ids.push(packet.sid);
				
			player.scripts[packet.sid] = packet.data;

			player.send(0x14, { uid: player.uid, sid: packet.sid });

		});

	});
}