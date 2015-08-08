var path = require( "path" );
var Creeper = require( "../../public/modules/creeper.js" );

module.exports = {

	homeView: {
		handler: function (request, reply ) {
			var filePath = path.join( __dirname , "../../index.html" );
			return reply.file( filePath );
		}
	},

	serveFile: {
		handler: function( request, reply ) {
			var filePath = path.join( __dirname , "../.." + request.url.path );
			return reply.file( filePath );
		}
	},
	searchURL: {
		handler: function (request, reply ) {
			var searchURL = request.query.scrapeurl;
			var creep = new Creeper( {
				callback : function(error, assets ) {
					console.log( " ********************** All URLS SCRAPED **************************");
					
					// clear the global 'globalStartSearchURL'
					// globalStartSearchURL = "";

					if( error ) {
						console.log( error );
						// make an error alert to put at the top of the page
						return reply.view( "homepage", { alerts: [{isError: true, alert: "Error for URL: " + searchURL }, {isError: true, alert: "Error : " + error }] } );
					}
					if( assets ) {
						console.log( "Assets found: " ) ;
						console.dir( assets );
						return reply.view("sitemap", { rootURL: searchURL, urls : assets.urls, css: assets.css, scripts : assets.scripts, images : assets.images });
					}
					return reply.view( "homepage", { alerts: [{isError: true, alert: "Error for URL: " + searchURL }, {isError: true, alert: "Error : No Static Assets Found." }] } );
				}
			});

			creep.startURL( searchURL );

		}
	}
};
