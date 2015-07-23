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

var cacheOfActiveURLs = [],
		globalCache = [];
var globalRootURL = "",
	  globalStartSearchURL = "";

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

function getAllStaticAssets ( $ ) {
	getAllCSS( $ );
	getAllScripts( $ );
	getAllImages( $ );
	getAllVideo( $ );
	getAllOtherLinks( $ );
}

function getAllCSS ( $ ) {
	var debug = require( 'debug' )('app:getAllCSS');
	var rel, href;
	$( "link" ).each( function( index, link ) {
		rel = $( link ).attr( "rel" );
		if( rel && rel === "stylesheet" ){
			href = $( "link" ).attr( "href" );
			if( href ) {
				if( !globalListOfCSS.hasOwnProperty( href ) ) {
					globalListOfCSS[ href ] = true;
					debug( "Include CSS File: ", href );
				}
			}
		}
	});
}
function getAllOtherLinks ( $ ) {
	var debug = require( 'debug' )('app:getAllOtherLinks');
	var rel, href;
	$( "link" ).each( function( index, link ) {
		href = $( "link" ).attr( "href" );
		if( href ) {
			if( !globalListOfCSS.hasOwnProperty( href ) ) {
				globalListOfCSS[ href ] = true;
				debug( "Include File: ", href );
			}
		}
	});
}
function getAllScripts ( $ ) {
	var debug = require( 'debug' )('app:getAllScripts');
	var script, src;
	$( "script" ).each( function( index, script ) {
		src = $( script ).attr( "src" );
		if( src ){
			if( !globalListOfScripts.hasOwnProperty( src ) ) {
				globalListOfScripts[ src ] = true;
				debug( "Include Script File: ", src );
			}
		}
	});
}

function getAllImages ( $ ) {
	var debug = require( 'debug' )('app:getAllImages');
	var img, src;
	$( "img" ).each( function( index, img ) {
		src = $( img ).attr( "src" );
		if( src  ){
			if( !globalListOfImages.hasOwnProperty( src ) ) {
				globalListOfImages[ src ] = true;
				debug( "Include Image File: ", src );
			}
		}
	});
}
function getAllVideo ( $ ) {
	return globalListOfVideo;
}

function removeTrailingSlash ( url ){
	if( url && url.endsWith( "/" ) ){
		var searchStr = "/";
		var position = url.length -= searchStr.length;
		var lastIndex = url.indexOf("/", position );

		return url.slice(0, lastIndex );
	}
	return url;
}
function updateCachedURL ( url, state ) {
	var debug = require( "debug" )( "app:updateCachedURL" );
	if( state ) {
		console.log( "URL: ", url, " has new state: ", state );
	}
	globalCacheOfURLs[ url ] = state ;
}

function cacheURL ( url ) {
	var debug = require( "debug" )( "app:cacheURL" );
	debug( "Add url to cache as NOT SCRAPED ", url );
	updateCachedURL( url, URL.HAS_NOT_BEEN_SCRAPED );
	globalCache.push( url );
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
		debug( 'Adding to list of URLs to be scraped');
		cacheURL( url );
		return true;
	}
}

function getFullPath( currentLocation, href ){
	var debug = require( 'debug' )('app:getFullPath');
	var fullPath = "";

	if( href.match( "^https?" ) ){
		return href;
	}
	else if( href.match("^/" ) ) { // relative path eg href='/****'
		fullPath = globalRootURL + href;
		debug( "Found path with leading /, make full path: " , fullPath );
		return fullPath;
	}
	else{ // relative path starts without '/' e.g. services/prototyping
		fullPath = currentLocation + "/" + href;
		debug( "Found relative path without leading /, make full path: " , fullPath );
		return fullPath;
	}
}
function addedToCache( currentLocation, href ) {
	var debug = require( 'debug' )('app:addedToCache');

	var fullPath = "";
	// The href will not be added to the cache if:
	// 1. it is undefined
	// 2. it is an inline link e.g. #footer - can ignore these
	// 3. it is an empty string because this is the same as the parent url
	if( href === undefined || href.match('^#') || href === "" || href.match( "^mailto") ){
		debug( "Found an href which can be ingnored" );
		return false;
	} 

	if( href.match( '^https?') && validator.isURL( href ) ){
		debug( "href is canonical and well formed.");
		fullPath = href;
	}
	else{ 
		fullPath = getFullPath( currentLocation, href );
	}
	// validator.isURL only checks if a url is well formed and not whether it is an actual url
	if( !validator.isURL(fullPath) ) {  
		debug( 'Invalid URL so skipping: ', fullPath );
		return false;
	}
	debug( "Valid URL so stick it in the list if unique");
	return addToCache( fullPath );

}
function getAllHRefs ( $, currentURL ) {
	var debug = require( 'debug' )('app:getAllHRefs');
	var fullpath, href;
	var foundURLs  = {};
	var atags = $('a');
	var found = false;
  atags.each( function(index, a ) {
  	
  	href = $(a).attr( "href" );
  	debug( href );
  	href = removeTrailingSlash( href );
  	debug( "After removing trailing slash", href );
		if( addedToCache( currentURL, href ) ) {
			fullPath = getFullPath( currentURL, href );
			foundURLs[ fullPath ] = URL.HAS_NOT_BEEN_SCRAPED;
		}
    	// What about Virtual Paths
    	// What about Canonical Paths ?
  });
	return foundURLs;
}

function combineObjects ( newURLs ) {
	for (var attrname in newURLs) { 
		globalCacheOfURLs[attrname] = newURLs[attrname]; 
	}
	return globalCacheOfURLs;
}

function isEmptyObject (object) { 
	for( var i in object ) { 
		return true; 
	} 
	return false; 
}

function requestPageCB (  error, response, body, callback  ) {
	
}
function requestAllURLs ( urls, callback ) {
	var debug = require( 'debug' )('app:requestAllURLs');
	debug( "Next group of URL to scrape");
	debug(urls);
	for( var i in urls ) {
		if( globalCacheOfURLs.hasOwnProperty( i ) && globalCacheOfURLs[ i ] === URL.HAS_NOT_BEEN_SCRAPED) {
			debug( "NEXT URL TO SCRAPE " + i ) ;
			scrapeURL( i, callback );
		}
	}
}
function countOfURLs ( isScraped ){
	var count = 0;
	for( var i in globalCacheOfURLs ) {
		if( isScraped!==undefined && isScraped ) {
			if( globalCacheOfURLs[ i ] !== undefined && globalCacheOfURLs[ i ] === URL.HAS_BEEN_SCRAPED ) {
				++count;
			}
		}
		else if( isScraped!==undefined && !isScraped ) {
			if( globalCacheOfURLs[ i ] !== undefined && globalCacheOfURLs[ i ] === URL.HAS_NOT_BEEN_SCRAPED ) {
				++count;
			}
		}
		else {
			++count;
		}
	}
	return count;
}
function cacheDiagnosticLogs () {
	console.log( "Count of all URLS: " + countOfURLs( undefined) );
	console.log( "Count of scraped URLS: " + countOfURLs( true ) );
	console.log( "Count of unscraped URLS: " + countOfURLs( false ) );
}

function allURLsScraped () {
	var debug = require( 'debug' )('app:allURLsScraped');
	debug( globalCacheOfURLs );
	for( var i in globalCacheOfURLs ) {
		if( globalCacheOfURLs[ i ] !== undefined && globalCacheOfURLs[ i ] === URL.HAS_NOT_BEEN_SCRAPED ) {
			debug( "Found unscraped URL so return false" );
			debug( "URL: ", i );
			cacheDiagnosticLogs();
			return false;
		}
	}
	console.log( "All URLS have been scraped." );
	cacheDiagnosticLogs();
	debug( globalCacheOfURLs );
	return true;
}

function scrapeURL(  startingURL, callback ) {
	var debug = require( 'debug' )('app:scrapeURL');
	var foundURLs = {};
	requestio( startingURL, function (error, response, body) {

	  if (!error && response.statusCode == 200) {
			debug( 'GOING TO SCRAPE URL: ' + startingURL );
			// use cheerio to get a jQuery like handle on the body object
	    $ = cheerio.load(body);
	    foundURLs = getAllHRefs( $, startingURL);

	    // get static assets and store in global namespace
    	getAllStaticAssets( $ );		

    	// spin off $.get (equivalent) asynchronous requests for each of the found URLs.
  		requestAllURLs( foundURLs, callback );
  		
  		// set URL to HAS_BEEN_SCRAPED in cache as it's been scraped
  		updateCachedURL( startingURL, URL.HAS_BEEN_SCRAPED );
			// if URLs in globalCacheOfURLs are all URL.HAS_BEEN_SCRAPED then the scrape is done and we can callback
	    if( allURLsScraped() ) {
	    	console.log( "allURLsScraped returned true so we are done");
	    	callback();
	    }
	    
	  }
	  else {
	  	console.log( "Error GET-ting: " + startingURL );
	  	globalCacheOfURLs[ startingURL ] = undefined;
	  	if( allURLsScraped() ) {
	    	console.log( "allURLsScraped returned true so we are done");
	    	callback();
	    }
	  }
	});
}

function getRootURL ( url ) {
	var pathArray = url.split( '/' );
	var protocol = pathArray[0];
	var host = pathArray[2];
	return protocol + '//' + host;
}

function makeWellFormedURL( url ){
	var debug = require( 'debug' )('app:makeWellFormedURL');
	debug(url);
	
	if( !url.match( '^https?' ) ) {
		if( !url.match( '^www' ) ) {
			debug( "http://www." + url );
			return "http://www." + url;
		}
		else {
			debug( "http://" + url );
			return "http://" + url;
		}
	}
	debug( "Well formed already! " + url );
	return url;
}

function resetGlobals(){
	globalCacheOfURLs = {};
	globalListOfCSS = {};
	globalListOfScripts = {};
	globalListOfImages = {};
	globalCache = [];
	globalStartSearchURL = "";
	globalRootURL = "";
}

function init( searchURL ) {
	console.log( "STARTING A NEW SEARCH");

	// Reset global cache of urls and global lists of static assets to be empty
	resetGlobals();
	
	// Keep track of the current search url to prevent retries whilst mid scrape.
	globalStartSearchURL = searchURL;

	// The globalRootHost var should just be the protocol and hostname and none of the path
	globalRootURL = getRootURL( searchURL ); // e.g. https://www.gocardless.com
	
	// Store the searchURL in the globalCacheOfURLs
	console.log( "Starting URL: ", searchURL );
	cacheURL( searchURL );
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
			var searchURL = makeWellFormedURL( request.query.scrapeurl );
			if( globalStartSearchURL === searchURL ) {
				console.log( "********************RETRY OF EXISTING SEARCH SO IGNORE!********************");
			}
			else{
				// NEED A WAY OF KILLING THE PREVIOUS SEARCH!!!! 
				// UNTIL I CAN DO THIS A NEW SEARCH HAS TO BE PREVENTED !!!!
				init( searchURL );
				
				scrapeURL( searchURL, function(error) {
					console.log( " ********************** All URLS SCRAPED **************************");
					console.log( "Count of URLs found: " + globalCache.length );
					
					// clear the global 'globalStartSearchURL'
					globalStartSearchURL = "";

					if( error ) {
						console.log( error );
						// make an error alert to put at the top of the page
						return reply.view( "homepage", { alerts: [{isError: true, alert: "Error for URL: " + searchURL }, {isError: true, alert: "Error Message: " + error }] } );
					}
					return reply.view("sitemap", {rootURL: searchURL, urls : globalCacheOfURLs, css: globalListOfCSS, scripts : globalListOfScripts, images : globalListOfImages });
				} );
			} 
		}
	}
};
