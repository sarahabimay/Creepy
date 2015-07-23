var Hapi = require( "hapi" );
var path 	= require('path');
var port 	= {port: (process.env.port || 3000 ) };
var controller 	= require("./controllers/controller.js");

var server = new Hapi.Server({
	connections: {
		routes: {
			files: {
				relativeTo: path.join(__dirname, '../public')
			}
		}
	}
});

server.connection(port);

server.views({
		engines: {
			jade: require("jade")
		},
		compileOptions: {
			pretty: true
		},
		relativeTo: __dirname,
		path: 		  "./views",
		isCached: false
});

server.route( 
	[
		{
			path: "/", 			 method: "GET",   config: controller.homeView
		},
		{
			path: "/public/{file*}",	 method: "GET",   config: controller.serveFile
		},
		{
			path: "/searchurl",  method: "GET",   config: controller.searchURL
		}
	]
);

module.exports = server;
