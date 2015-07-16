var path 	 = require("path");
var requestio  = require('request');
var cheerio  = require('cheerio');
var validator = require('validator');
 
function getAllHRefs( $, rootHost, listOfURLs ) {
	var fullpath, isValid, href, atags;
	var uniqueURLs = {};
	atags = $('a');
  $('a').each( function(index, a ) {
  	href = $(a).attr( "href" );
  	if( href !== undefined ) {
  		
    	console.log( "HREF: " + href );
    	if( href.match( '^http') ){
    		if( href in listOfURLs ) {
    			console.log( 'Already saved that URL. ' );
    		}
    		else{
    			console.log( 'Adding to list of URLs to be scraped');
    			listOfURLs[href] = true;
    			uniqueURLs [ href ] = true;
    		}
    	}
    	else{
    		// need to add the root hostname to the href
    		fullpath = rootHost + href;
    		console.log( "Fullpath: " + fullpath );
    		if( validator.isURL(fullpath) ) {
    			console.log( "Valid URL so stick it in the list if unique");
  				if( href in listOfURLs ) {
	    			console.log( 'Already saved that URL: ' );
	    		}
	    		else{
	    			console.log( 'Adding to list of URLs to be scraped');
	    			listOfURLs[ fullpath ] = true;
	    			uniqueURLs[ fullpath ] = true;
	    		}
    		}
    		else {
    			console.log( 'Invalid URL so skipping');
    		}
    	}
  	// console.log( $(a).attr( "href" ) );
  	}
  });
	return uniqueURLs;
}

function crawlAndQueue( rootHost, currentURLs, allURLs, css, scripts, images ) {
	// currentURLs should only contain the urls found in this recursion so as not to keep repeating searches
	var newURLs = {};
	for (var url in currentURLs ) {

		requestio(url, function (error, response, body) {
		  if (!error && response.statusCode == 200) {

		    // console.log(body); // Show the HTML for the Google homepage. 
		    $ = cheerio.load(body);
		    newURLs = getAllHRefs( $, rootHost, allURLs);
		    allURLs = combineObjects( newURLs, allURLs );
		    scripts = getAllScripts( $, scripts );
		    css = getAllCSS( $, css );
		    images = getAllImg( $, images );
		    
		    console.dir( newURLs );
				console.dir( allURLs );
		  }
		  else {
		  	console.log( "Error" + error );
		  }
	    return !jQuery.isEmptyObject( newURLs ) ? crawlAndQueue( rootHost, newURLs, allURLs, css, scripts, images ) :
	  				 { "urls": allURLs , "css": css , "scripts": scripts, "images": images };
		});
	}
}
function getAllCSS( $, listOfCSS ) {
	return listOfCSS;
}
function getAllScripts( $, listOfScripts ) {
	return listOfScripts;
}
function getAllImg( $, listOfImg ) {
	return listOfImg;
}
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
			console.log( "Static File: " + filePath );
			return reply.file( filePath );
		}
	},
	searchURL: {
		handler: function (request, reply ) {
			
			console.dir( request.query );
			console.dir( request.query.scrapeurl );
			// requestio
			// .get(request.query.scrapeurl)
			// .on('response', function(response) {
			// 	console.log(response.statusCode); // 200 
			// 	console.log(response.headers['content-type']); // 'image/png' 
			// });
			// rootHost should just be the host and none of the path... gotta do that...
			var rootHost = request.query.scrapeurl; // e.g. https://www.gocardless.com
			var listOfURLs = { rootHost: true };
			var listOfCSS = {};
			var listOfImg = {};
			var listOfScripts = {};

			var results = crawlAndQueue( rootHost, listOfURLs, listOfURLs, listOfCSS, listOfScripts, listOfImg ); 
			

			return reply(request.query.scrapeurl);
		}
	}
};
