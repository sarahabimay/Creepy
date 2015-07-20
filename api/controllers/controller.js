var path = require( "path" );
var requestio  = require('request');
var cheerio  = require('cheerio');
var validator = require('validator');

var globalCacheOfURLs = {},
		globalListOfCSS = {},
		globalListOfScripts = {},
		globalListOfImages = {},
		globalListOfVideo = {};

var globalCacheOfScrapedURLs = {};

var globalCache = [];
var globalRootURL = "";
var URL = {
    	HAS_BEEN_SCRAPED : true,
    	HAS_NOT_BEEN_SCRAPED : false,
};

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (position === undefined || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}
function removeTrailingSlash( url ){
	if( url && url.endsWith( "/" ) ){
		var searchStr = "/";
		var position = url.length -= searchStr.length;
		var lastIndex = url.indexOf("/", position );

		return url.slice(0, lastIndex );
	}
}
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
		console.log( 'Adding to list of URLs to be scraped');
		cacheURL( url );
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
	var foundURLs  = {};
	var atags = $('a');
	var found = false;
  $('a').each( function(index, a ) {
  	href = $(a).attr( "href" );
  		
  	href = removeTrailingSlash( href );
  	// console.log( "HREF without trailing slash: " + href );
  	if( href !== undefined ) {
    	if( href.match( '^http') && validator.isURL( href ) ){
    		if( addToCache( href ) ) { foundURLs[ fullpath ] = URL.HAS_NOT_BEEN_SCRAPED; }
    		
    		// EITHER REQUEST THE URL STRAIGHT AWAY HERE USING requestPage( href, callback )
    		// OR WAIT UNTIL getALLHREFs returns to requestPage and then loop through found
    		// hrefs calling requestPage recursively 
    		// Questions: 
    		// 1. Will this recursive call of an asynchronous function with a callback work
    		//     as desired?
    	}
    	else if( href.match('^#') ){ // inline link e.g. #footer - can ignore these
    		debug( "Found an inline link which can be ingnored" );
    	}
    	else if( href === "" ){
    		// This href can be ignored as it's the same as the parent url, only with a trailing /
    		console.log( "Found an empty string for Href so ignore." );
    	}
    	else	{ // relative path eg href='/****'
    		// need to add the root hostname to the href
    		fullpath = globalRootURL + href;
    		debug( "Fullpath: " , fullpath );
    		if( validator.isURL(fullpath) ) {
    			debug( "Valid URL so stick it in the list if unique");
  				if( addToCache( fullpath ) ) { foundURLs[ fullpath ] = URL.HAS_NOT_BEEN_SCRAPED; }
  			}
    		else {
    			console.log( 'Invalid URL so skipping');
    		}
    	}
    	// What about Virtual Paths
    	// What about Canonical Paths ?
  	}
  });
	return foundURLs;
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


function requestPage(  url, callback  ) {
	
}
function requestAllURLs( urls, callback ) {
	var count = 0;
	for( var i in urls ) {
		if( count++ === 1 ) return;

		if( urls[ i ] === URL.HAS_NOT_BEEN_SCRAPED ) {
			console.log( "NEXT FOUND URL TO SCRAPE" + i ) ;
			scrapeURL( i, callback );
		}
	}
}
var globalCount = 0;
function allURLsScraped() {
	for( var i in globalCacheOfURLs ) {
		if( globalCacheOfURLs[ i ] === false ) {
			console.log( "Found Un-Scraped URL so continue." );
			return false;
		}
	}
	return true;
}

function scrapeURL(  startingURL, callback ) {
	var foundURLs = {};
	requestio( startingURL, function (error, response, body) {
		console.log( 'URL to be scraped: ' + startingURL );
	  if (!error && response.statusCode == 200) {
	    $ = cheerio.load(body);
	    foundURLs = getAllHRefs( $, startingURL);
	    console.dir( foundURLs );
	    // get static assets and store in global namespace
    	getAllStaticAssets( $ );		 
  		requestAllURLs( foundURLs, callback );
  		
  		// set URL to HAS_BEEN_SCRAPED in cache as it's been scraped/
  		globalCacheOfURLs[ startingURL ] = URL.HAS_BEEN_SCRAPED;
	    if( allURLsScraped() /*if globalCacheOfURLs contains any false links then don't callback yet*/ ) {
	    	callback();
	    }
	    
	  }
	  else {
	  	console.error( error );
	  }
	});
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
	globalCacheOfURLs[ url ] = URL.HAS_NOT_BEEN_SCRAPED;
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
			
			console.log( "Starting URL: ", globalRootURL );
			cacheURL( globalRootURL );


			scrapeURL( globalRootURL, function(error) {
				console.log( " ********************** All URLS SCRAPED **************************");
				console.log( "Count of URLs found: " + globalCache.length );
				console.dir( globalCacheOfURLs );
				if( error ) {
					console.log( error );
				}
				return reply("Found " + globalCache.length  + " URLs" );
			} ); 
		}
	}
};
