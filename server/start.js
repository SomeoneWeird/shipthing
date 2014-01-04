
var fs 			= require('fs'),
		Server 	= require('./lib/server.js'),

		server 	= new Server();

server.init();

fs.readdir('./plugins', function(err, files) {

	for(var i = 0; i < files.length; i++) {
		require('./plugins/'+files[i])(server);
	}

	server.start(function() {

		server.startLoop();

	});

});

