var Path 	 = require("path");
var FS = require('fs');

module.exports = {

	homeView: {
		handler: function (request, reply ) {
			var filePath = Path.join( __dirname , "../../index.html" );
			return reply.file( filePath );
		}
	},

	serveFile: {
		handler: function( request, reply ) {
			var filePath = Path.join( __dirname , "../.." + request.url.path );
			console.log( "Static File: " + filePath );
			return reply.file( filePath );
		}
	},
	searchURL: {
		handler: function (request, reply ) {
			console.dir( request.query );
			console.dir( request.query.scrapeurl );
			return reply(request.query.scrapeurl);
		}
	}
};
