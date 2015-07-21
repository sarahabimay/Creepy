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

function removeTrailingSlash ( url ){
	if( url && url.endsWith( "/" ) ){
		var searchStr = "/";
		var position = url.length -= searchStr.length;
		var lastIndex = url.indexOf("/", position );

		return url.slice(0, lastIndex );
	}
}
function updateCachedURL ( url, state ) {
	globalCacheOfURLs[ url ] = state ;
}

function cacheURL ( url ) {
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

function getAllStaticAssets ( $ ) {
	getAllCSS( $ );
	getAllScripts( $ );
	getAllImages( $ );
	getAllVideo( $ );
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

function getAllHRefs ( $, currentURL ) {
	var debug = require( 'debug' )('app:getAllHRefs');
	var fullpath, href;
	var foundURLs  = {};
	var atags = $('a');
	var found = false;
  $('a').each( function(index, a ) {
  	href = $(a).attr( "href" );
  		
  	href = removeTrailingSlash( href );
  	if( href !== undefined ) {
    	if( href.match( '^http') && validator.isURL( href ) ){
    		if( addToCache( href ) ) { foundURLs[ fullpath ] = URL.HAS_NOT_BEEN_SCRAPED; }
    	}
    	else if( href.match('^#') ){ // inline link e.g. #footer - can ignore these
    		debug( "Found an inline link which can be ingnored" );
    	}
    	else if( href === "" ){
    		// This href can be ignored as it's the same as the parent url, only with a trailing /
    		debug( "Found an empty string for Href so ignore." );
    	}
    	else	{ // relative path eg href='/****'
    		// need to add the root hostname to the href
    		fullpath = globalRootURL + href;
    		debug( "Fullpath: " , fullpath );
    		// validator.isURL only checks if a url is well formed and not whether it is an actual url
    		if( validator.isURL(fullpath) ) {  
    			debug( "Valid URL so stick it in the list if unique");
  				if( addToCache( fullpath ) ) { foundURLs[ fullpath ] = URL.HAS_NOT_BEEN_SCRAPED; }
  			}
    		else {
    			debug( 'Invalid URL so skipping: ', fullpath );
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

function isEmptyObject (object) { 
	for(var i in object) { 
		return true; 
	} 
	return false; 
}

function requestPageCB (  error, response, body, callback  ) {
	
}
function requestAllURLs( urls, callback ) {
	var debug = require( 'debug' )('app:requestAllURLs');
	for( var i in urls ) {
		if( globalCacheOfURLs.hasOwnProperty( i ) && globalCacheOfURLs[ i ] === URL.HAS_NOT_BEEN_SCRAPED) {
			debug( "NEXT URL TO SCRAPE " + i ) ;
			scrapeURL( i, callback );
		}
	}
}

function allURLsScraped() {
	var debug = require( 'debug' )('app:allURLsScraped');
	for( var i in globalCacheOfURLs ) {
		if( globalCacheOfURLs[ i ] === URL.HAS_NOT_BEEN_SCRAPED ) {
			return false;
		}
	}
	debug( "All URLS have been scraped." );

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
	    	callback();
	    }
	    
	  }
	  else {
			console.log( "GET request error for URL: ", startingURL );
	  	console.error( error );
	  }
	});
}

function getRootURL ( url ) {
	var pathArray = url.split( '/' );
	var protocol = pathArray[0];
	var host = pathArray[2];
	return protocol + '//' + host;
}

function resetGlobals(){
	globalCacheOfURLs = {};
	globalListOfCSS = {};
	globalListOfScripts = {};
	globalListOfImages = {};
	globalCache = [];
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
			var searchURL = request.query.scrapeurl;
			// globalRootHost should just be the protocol and hostname and none of the path
			resetGlobals();
			globalRootURL = getRootURL( searchURL ); // e.g. https://www.gocardless.com
			
			console.log( "Starting URL: ", searchURL );
			cacheURL( searchURL );

			scrapeURL( searchURL, function(error) {
				console.log( " ********************** All URLS SCRAPED **************************");
				console.log( "Count of URLs found: " + globalCache.length );
				if( error ) {
					console.log( error );
					reply.redirect( "/" );
					// make an error alert to put at the top of the page
				}
				return reply.view("sitemap", {rootURL: searchURL, urls : globalCacheOfURLs, css: globalListOfCSS, scripts : globalListOfScripts, images : globalListOfImages });
			} ); 
		}
	}
};
