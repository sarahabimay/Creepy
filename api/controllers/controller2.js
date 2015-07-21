var path 	 = require("path");
var requestio  = require('request');
// var jQuery = require ('jquery');
var cheerio  = require('cheerio');
var validator = require('validator');

var globalCacheOfURLs = {};
var globalCache = [];
 
function getAllHRefs( $, rootURL, currentURL ) {
	var debug = require( 'debug' )('app:getAllHRefs');
	var fullpath, isValid, href;
	var uniqueURLs = {};
	var atags = $('a');
  $('a').each( function(index, a ) {
  	href = $(a).attr( "href" );
  	if( href !== undefined ) {
  		
    	console.log( "HREF: " + href );

    	if( href.match( '^http') ){
    		if( href in globalCacheOfURLs ) {
    			debug( 'Already saved that URL. ' );
    		}
    		else{
    			debug( 'Adding to list of URLs to be scraped');
    			globalCacheOfURLs[ href ] = false;
    			globalCache.push( href );
    			uniqueURLs [ href ] = false;
    		}
    	}
    	else if( href.match('^#') ){
    		fullpath = currentURL + href;
    		console.log( "Full path", fullpath );
    		if( validator.isURL(fullpath) ) {
    			console.log( "Valid URL so stick it in the list if unique");
  				if( href in globalCacheOfURLs ) {
	    			debug( 'Already saved that URL: ' );
	    		}
	    		else{
	    			console.log( 'Adding to list of URLs to be scraped');
	    			globalCacheOfURLs[ fullpath ] = false;
	    			globalCache.push( fullpath );
	    			uniqueURLs[ fullpath ] = false;
	    		}
    		}
    		else {
    			console.log( 'Invalid URL so skipping');
    		}
    	}
    	else	{
    		// need to add the root hostname to the href
    		fullpath = rootURL + href;
    		debug( "Fullpath: " , fullpath );
    		if( validator.isURL(fullpath) ) {
    			debug( "Valid URL so stick it in the list if unique");
  				if( href in globalCacheOfURLs ) {
	    			debug( 'Already saved that URL: ' );
	    		}
	    		else{
	    			debug( 'Adding to list of URLs to be scraped');
	    			globalCacheOfURLs[ fullpath ] = false;
	    			globalCache.push( fullpath );
	    			uniqueURLs[ fullpath ] = false;
	    		}
    		}
    		else {
    			console.log( 'Invalid URL so skipping');
    		}
    	}
  	}
  });
	return uniqueURLs;
}

function combineObjects ( newURLs ) {
	for (var attrname in newURLs) { 
		globalCacheOfURLs[attrname] = newURLs[attrname]; 
	}
	return globalCacheOfURLs;
}

function isEmptyObject(object) { 
	for(var i in object) { 
		return true; 
	} 
	return false; 
}

var globalCacheOfScrapedURLs = {};

function scrapeURL( rootHost, startingURL, css, scripts, images, callback ) {
	var newURLs = {};
	var urlCount = 0;
	// for (var url in currentURLs ) {
	for( i = 0 ; i< globalCache.length; i++ ) {
		console.log( "Global Cache Length: ", globalCache.length );
		url = globalCache[i];
		(function( url ){
			// if globalCacheOfURLs[ url ] is false then it needs to be scraped still
			if( globalCacheOfURLs[ url ] !== undefined && !globalCacheOfURLs[ url ]) {
				console.log( "SEARCHING URL: ", url );
				requestio( url, function (error, response, body) {
				  if (!error && response.statusCode == 200) {

				    // console.log(body); // Show the HTML for the Google homepage. 
				    $ = cheerio.load(body);
				    newURLs = getAllHRefs( $, rootHost, url );
				    console.log( '*********************** NEW URLS to Be Scraped *********************** ');
				    console.dir( newURLs );
				    // globalCacheOfURLs = combineObjects(  newURLs );
				    scripts = getAllScripts( $, scripts );
				    css = getAllCSS( $, css );
				    images = getAllImg( $, images );
				    
				    // searched this URL so flag it as true in the global cache
				    globalCacheOfURLs[ url ] = true;
				    globalCacheOfScrapedURLs [ url ] = true;

				    if( ++urlCount === globalCache.length ) {
				    	callback();
				    }
				  }
				  else {
				  	console.log( "Error" + error );
				  	callback( error );
				  }
				  
			  				 
			    // return !jQuery.isEmptyObject( newURLs ) 
				});
			}
			else{
				console.log( 'URL: ', url, ' has already been scraped' );
			}
		})(url);
	
	}
}
function repeat( nextURLs ) {
	scrapeURL( rootHost, nextURLs, css, scripts, images, repeat );
}

function crawlAndQueue ( rootHost, startingURL, css, scripts, images, callback ) {
	// currentURLs should only contain the urls found in this recursion so as not to keep repeating searches
	var debug = require( 'debug' )('app:crawlAndQueue');
	scrapeURL( rootHost, startingURL, css, scripts, images, function() {
		  if( globalCache.length === globalCacheOfScrapedURLs.length ) {
		  	console.log( "Finished!");
		  	console.log( '*********************** CrawlAndQueue CB - All URLS ***********************');
				console.dir( globalCacheOfURLs );
				callback({ "css": css , "scripts": scripts, "images": images } );
		  }
		  else {
		  	console.log( 'BOOOOOHOOOOO');
		  	callback( "Error: Cache of Scraped URLS and GlobalCache of All URLS found don't match.");
		  }
		 //  if( !isEmptyObject( nextURLs ) ) {
			// 	// scrapeURL( rootHost, nextURLs, css, scripts, images, function( nextURLs ) {
			// 		console.log( 'In scrapURL callback, NextURLs');
			// 		console.dir( nextURLs );
			// }
			// else {
			// 	return callback({ "css": css , "scripts": scripts, "images": images } );
			// }
	} );

	// scrapeURL( starterURL, function( latestURLs ) {
	// 	if( !isEmptyObject( latestURLSs ) ) {
	// 		allURLs = combineObjects( allURLs, latestURLs);
	// 		for( var url in latestURLS ) {
	// 			return scrapeURL( url,  callback );
	// 		}
	// 	}
	// 	else {
	// 		return allURLS;
	// 	}
	// });
	
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
			return reply.file( filePath );
		}
	},
	searchURL: {
		handler: function (request, reply ) {
			
			console.dir( request.query.scrapeurl );
			// requestio
			// .get(request.query.scrapeurl)
			// .on('response', function(response) {
			// 	console.log(response.statusCode); // 200 
			// 	console.log(response.headers['content-type']); // 'image/png' 
			// });
			// rootHost should just be the host and none of the path... gotta do that...
			var rootHost = request.query.scrapeurl; // e.g. https://www.gocardless.com
			// var listOfURLs = {};
			globalCacheOfURLs[ rootHost ] = false;
			globalCache.push( rootHost );
			var listOfCSS = {};
			var listOfImg = {};
			var listOfScripts = {};
			var startingPoint[ rootHost ] = false;

			crawlAndQueue( rootHost, startingPoint, listOfCSS, listOfScripts, listOfImg, function( error, results ) {
				console.log( " ********************** All URLS SCRAPED **************************");
				console.log( "Count of URLs found: " + globalCache.length );
				console.dir( globalCacheOfURLs );
				// console.dir( results );
				// return reply(request.query.scrapeurl);
				if( error ) {
					console.log( error );
				}
				return reply(globalCacheOfURLs);
			} ); 
			
			
		}
	}
};
