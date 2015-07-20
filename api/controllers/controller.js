var path 	 = require("path");
var requestio  = require('request');
// var jQuery = require ('jquery');
var cheerio  = require('cheerio');
var validator = require('validator');

var globalCacheOfURLs = {},
		globalListOfCSS = {},
		globalListOfScripts = {},
		globalListOfImages = {},
		globalListOfVideo = {};
var globalCache = [];
var globalRootURL = "";

function addToCache ( url ) {
	var debug = require( 'debug' )('app:addToCache');

	if( url in globalCacheOfURLs ) {
			debug( 'Already saved that URL. ' );
			return false;
	}
	else if( url.indexOf( globalRootURL ) < 0) {
		debug( "External URL so ignore" );
		return false;
	}
	else{
		debug( 'Adding to list of URLs to be scraped');
		globalCacheOfURLs[ url ] = false;
		globalCache.push( url );
		return true;
	}
}

function getAllStaticAssets ( $ ) {
	getAllCSS( $ );
	getAllScripts( $ );
	getAllImages( $ );
	getAllVideo( $ );
}
function getAllCSS ( $ ) {
	return globalListOfCSS;
}
function getAllScripts ( $ ) {
	return globalListOfScripts;
}
function getAllImages ( $ ) {
	return globalListOfImages;
}
function getAllVideo ( $ ) {
	return globalListOfVideo;
}
function getAllHRefs ( $, currentURL ) {
	var debug = require( 'debug' )('app:getAllHRefs');
	var fullpath, href;
	var atags = $('a');
  $('a').each( function(index, a ) {
  	href = $(a).attr( "href" );
  	if( href !== undefined ) {
  		
    	console.log( "HREF: " + href );

    	if( href.match( '^http') && validator.isURL( href ) ){
    		addToCache( href );
    			
    		// EITHER REQUEST THE URL STRAIGHT AWAY HERE USING requestPage( href, callback )
    		// OR WAIT UNTIL getALLHREFs returns to requestPage and then loop through found
    		// hrefs calling requestPage recursively 
    		// Questions: 
    		// 1. Will this recursive call of an asynchronous function with a callback work
    		//     as desired?
    	}
    	else if( href.match('^#') ){
    		fullpath = currentURL + href;
    		console.log( "Full path", fullpath );
    		if( validator.isURL(fullpath) ) {
    			console.log( "Valid URL so stick it in the list if unique");
  				addToCache( fullpath );
    		}
    		else {
    			console.log( 'Invalid URL so skipping');
    		}
    	}
    	else	{ // eg href='/****'
    		// need to add the root hostname to the href
    		fullpath = globalRootURL + href;
    		debug( "Fullpath: " , fullpath );
    		if( validator.isURL(fullpath) ) {
    			debug( "Valid URL so stick it in the list if unique");
  				addToCache( fullpath );
    		}
    		else {
    			console.log( 'Invalid URL so skipping');
    		}
    	}
  	}
  });
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

function requestPage(  url, callback  ) {
	requestio( url, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	    $ = cheerio.load(body);
	    getAllHRefs( $, url/*, callback*/ );
	    // get static assets and store in global namespace
    	getAllStaticAssets( $ );
	    // EITHER : LOOP THROUGH FOUND URLS and recursively call requestPage( href, callback )
  		// OR STRAIGHT AWAY in getAllHrefs 
  		// hrefs calling requestPage recursively 
  		// Questions: 
  		// 1. Will this recursive call of an asynchronous function with a callback work
  		//     as desired?
  		// 2. Is passing callback around a good or bad idea?
  		/* 
  		requestAllURLs( newURLs, callback );
  		// defined as:
  		
  		for( var i in newURLs ) {
				if( ! newURLs[ i ] ) {
					requestPage( i, callback );
				}
  		}

  		*/
	    if( 1===1 /*if globalCacheOfURLs contains any false links then don't callback yet*/ ) {
	    	callback();
	    }
	    
	  }
	  else {
	  	console.error( error );
	  }
	});
}

function scrapeURL(  startingURL, callback ) {

	requestPage( startingURL, callback );
}



// 	var newURLs = {};
// 	var urlCount = 0;
// 	// for (var url in currentURLs ) {
// 	for( i = 0 ; i< globalCache.length; i++ ) {
// 		console.log( "Global Cache Length: ", globalCache.length );
// 		url = globalCache[i];
// 		(function( url ){
// 			// if globalCacheOfURLs[ url ] is false then it needs to be scraped still
// 			if( globalCacheOfURLs[ url ] !== undefined && !globalCacheOfURLs[ url ]) {
// 				console.log( "SEARCHING URL: ", url );
// 				requestio( url, function (error, response, body) {
// 				  if (!error && response.statusCode == 200) {

// 				    // console.log(body); // Show the HTML for the Google homepage. 
// 				    $ = cheerio.load(body);
// 				    newURLs = getAllHRefs( $, url );
// 				    console.log( '*********************** NEW URLS to Be Scraped *********************** ');
// 				    console.dir( newURLs );
// 				    // globalCacheOfURLs = combineObjects(  newURLs );
// 				    scripts = getAllScripts( $, scripts );
// 				    css = getAllCSS( $, css );
// 				    images = getAllImg( $, images );
				    
// 				    // searched this URL so flag it as true in the global cache
// 				    globalCacheOfURLs[ url ] = true;
// 				    globalCacheOfScrapedURLs [ url ] = true;

// 				    if( ++urlCount === globalCache.length ) {
// 				    	callback();
// 				    }
// 				  }
// 				  else {
// 				  	console.log( "Error" + error );
// 				  	callback( error );
// 				  }
				  
			  				 
// 			    // return !jQuery.isEmptyObject( newURLs ) 
// 				});
// 			}
// 			else{
// 				console.log( 'URL: ', url, ' has already been scraped' );
// 			}
// 		})(url);
	
// 	}
// }


// function crawlAndQueue ( startingURL, callback ) {
// 	// currentURLs should only contain the urls found in this recursion so as not to keep repeating searches
// 	var debug = require( 'debug' )('app:crawlAndQueue');
	
// 	scrapeURL( startingURL, function() {
// 		for( var u in newURLs ) {
// 			requestPage(  u, function( new ))
// 		}

// }

function cacheURL( url ) {
	globalCacheOfURLs[ url ] = false;
	globalCache.push( url );
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
			// rootHost should just be the host and none of the path... gotta do that...
			globalRootURL = request.query.scrapeurl; // e.g. https://www.gocardless.com
			var startingPoint = {};
			startingPoint[ globalRootURL ] = false;
			
			console.log( "Starting URL: ", globalRootURL );
			cacheURL( globalRootURL );

			// crawlAndQueue( startingPoint, listOfCSS, listOfScripts, listOfImg, function( error, results ) {

			scrapeURL( globalRootURL, function(error) {
				console.log( " ********************** All URLS SCRAPED **************************");
				console.log( "Count of URLs found: " + globalCache.length );
				console.dir( globalCacheOfURLs );
				if( error ) {
					console.log( error );
				}
				return reply(globalCacheOfURLs);
			} ); 
		}
	}
};
