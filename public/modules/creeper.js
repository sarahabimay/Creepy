var requestio  = require('request');
var cheerio  = require('cheerio');
var validator = require('validator');

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

function Creeper (options) {
	var self = this;
	self.init(options);
}

Creeper.prototype.init = function init (options) {
	var self = this;
	self.globalCallback = options.callback;
	self.globalCacheOfURLs = {};
	self.globalListOfCSS = {};
	self.globalListOfScripts = {};
	self.globalListOfImages = {};
	self.globalListOfVideo = {};

	self.globalCacheOfScrapedURLs = {};

	self.cacheOfActiveURLs = [];
	self.globalCache = [];
	self.globalRootURL = "";	
	self.globalStartSearchURL = "";

	self.URL_STATE = {
		HAS_BEEN_SCRAPED : true,
		HAS_NOT_BEEN_SCRAPED : false,
	};
};

Creeper.prototype.startURL = function startURL( url ) {
	var self = this;
	var searchURL = self.makeWellFormedURL( url );

	if( self.globalStartSearchURL === searchURL ) {
		console.log( "********************RETRY OF EXISTING SEARCH SO IGNORE!********************");
	}
	else{
		// NEED A WAY OF KILLING THE PREVIOUS SEARCH!!!! 
		// UNTIL I CAN DO THIS A NEW SEARCH HAS TO BE PREVENTED !!!!
		// init( searchURL );
		console.log( "STARTING A NEW SEARCH");

		// Reset global cache of urls and global lists of static assets to be empty
		// self.resetGlobals();
		
		// // Keep track of the current search url to prevent retries whilst mid scrape.
		self.globalStartSearchURL = searchURL;

		// // The globalRootHost var should just be the protocol and hostname and none of the path
		self.globalRootURL = self.getRootURL( searchURL ); // e.g. https://www.gocardless.com
		
		// Store the searchURL in the globalCacheOfURLs
		console.log( "Starting URL: ", searchURL );
		self.cacheURL( searchURL );
		self.scrapeURL( searchURL,  function() {
			console.log( 'In callback');
		});
	}
};






Creeper.prototype.getAllStaticAssets = function getAllStaticAssets ( $ ) {
	var self = this;
	self.getAllCSS( $ );
	self.getAllScripts( $ );
	self.getAllImages( $ );
	self.getAllVideo( $ );
	self.getAllOtherLinks( $ );
};

Creeper.prototype.getAllCSS = function getAllCSS ( $ ) {
	var debug = require( 'debug' )('app:getAllCSS');
	var self = this;
	var rel, href;
	$( "link" ).each( function( index, link ) {
		rel = $( link ).attr( "rel" );
		if( rel && rel === "stylesheet" ){
			href = $( "link" ).attr( "href" );
			if( href ) {
				if( !self.globalListOfCSS.hasOwnProperty( href ) ) {
					self.globalListOfCSS[ href ] = true;
					debug( "Include CSS File: ", href );
				}
			}
		}
	});
};
Creeper.prototype.getAllOtherLinks = function getAllOtherLinks ( $ ) {
	var debug = require( 'debug' )('app:getAllOtherLinks');
	var self = this;
	var rel, href;
	$( "link" ).each( function( index, link ) {
		href = $( "link" ).attr( "href" );
		if( href ) {
			if( !self.globalListOfCSS.hasOwnProperty( href ) ) {
				self.globalListOfCSS[ href ] = true;
				debug( "Include File: ", href );
			}
		}
	});
};
Creeper.prototype.getAllScripts = function getAllScripts ( $ ) {
	var debug = require( 'debug' )('app:getAllScripts');
	var self = this;
	var script, src;
	$( "script" ).each( function( index, script ) {
		src = $( script ).attr( "src" );
		if( src ){
			if( !self.globalListOfScripts.hasOwnProperty( src ) ) {
				self.globalListOfScripts[ src ] = true;
				debug( "Include Script File: ", src );
			}
		}
	});
};

Creeper.prototype.getAllImages = function getAllImages ( $ ) {
	var debug = require( 'debug' )('app:getAllImages');
	var self = this;
	var img, src;
	$( "img" ).each( function( index, img ) {
		src = $( img ).attr( "src" );
		if( src  ){
			if( !self.globalListOfImages.hasOwnProperty( src ) ) {
				self.globalListOfImages[ src ] = true;
				debug( "Include Image File: ", src );
			}
		}
	});
};
Creeper.prototype.getAllVideo = function getAllVideo ( $ ) {
	var self = this;
	return self.globalListOfVideo;
};

Creeper.prototype.removeTrailingSlash = function removeTrailingSlash ( url ){
	var searchStr, position, lastIndex;
	if( url && url.endsWith( "/" ) ){
		searchStr = "/";
		position = url.length -= searchStr.length;
		lastIndex = url.indexOf("/", position );

		return url.slice(0, lastIndex );
	}
	return url;
};
Creeper.prototype.updateCachedURL = function updateCachedURL ( url, state ) {
	var debug = require( "debug" )( "app:updateCachedURL" );
	var self = this;
	if( state ) {
		console.log( "URL: ", url, " has new state: ", state );
	}
	self.globalCacheOfURLs[ url ] = state ;
};

Creeper.prototype.cacheURL = function cacheURL ( url ) {
	var debug = require( "debug" )( "app:cacheURL" );
	var self = this;
	debug( "Add url to cache as NOT SCRAPED ", url );
	self.updateCachedURL( url, self.URL_STATE.HAS_NOT_BEEN_SCRAPED );
	self.globalCache.push( url );
};

Creeper.prototype.addToCache = function addToCache ( url ) {
	var debug = require( 'debug' )('app:addToCache');
	var self = this;
	if( url in self.globalCacheOfURLs ) {
			debug( 'Already saved that URL. ' );
			return false;
	}
	else if( url.indexOf( self.globalRootURL ) < 0) {
		debug( "External URL so ignore" );
		return false;
	}
	else{
		debug( 'Adding to list of URLs to be scraped');
		self.cacheURL( url );
		return true;
	}
};

Creeper.prototype.getFullPath = function getFullPath( currentLocation, href ){
	var debug = require( 'debug' )('app:getFullPath');
	var self = this;
	var fullPath = "";

	if( href.match( "^https?" ) ){
		return href;
	}
	else if( href.match("^/" ) ) { // relative path eg href='/****'
		fullPath = self.globalRootURL + href;
		debug( "Found path with leading /, make full path: " , fullPath );
		return fullPath;
	}
	else{ // relative path starts without '/' e.g. services/prototyping
		fullPath = currentLocation + "/" + href;
		debug( "Found relative path without leading /, make full path: " , fullPath );
		return fullPath;
	}
};
Creeper.prototype.addedToCache = function addedToCache( currentLocation, href ) {
	var debug = require( 'debug' )('app:addedToCache');
	var self = this;
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
		fullPath = self.getFullPath( currentLocation, href );
	}
	// validator.isURL only checks if a url is well formed and not whether it is an actual url
	if( !validator.isURL(fullPath) ) {  
		debug( 'Invalid URL so skipping: ', fullPath );
		return false;
	}
	debug( "Valid URL so stick it in the list if unique");
	return self.addToCache( fullPath );

};
Creeper.prototype.getAllHRefs = function getAllHRefs ( $, currentURL ) {
	var debug = require( 'debug' )('app:getAllHRefs');
	var self = this;
	var fullpath, href;
	var foundURLs  = {};
	var found = false;
	var atags = $('a');

	atags.each( function(index, a ) {
		href = $(a).attr( "href" );
		debug( href );
		href = self.removeTrailingSlash( href );
		debug( "After removing trailing slash", href );
		if( self.addedToCache( currentURL, href ) ) {
			fullPath = self.getFullPath( currentURL, href );
			foundURLs[ fullPath ] = self.URL_STATE.HAS_NOT_BEEN_SCRAPED;
		}
		// What about Virtual Paths
		// What about Canonical Paths ?
	});
	return foundURLs;
};

// Creeper.prototype.combineObjects = function combineObjects ( newURLs ) {
// 	for (var attrname in newURLs) { 
// 		globalCacheOfURLs[attrname] = newURLs[attrname]; 
// 	}
// 	return globalCacheOfURLs;
// };

// Creeper.prototype.isEmptyObject = function isEmptyObject (object) { 
// 	for( var i in object ) { 
// 		return true; 
// 	} 
// 	return false; 
// };

// Creeper.prototype.requestPageCB = function requestPageCB (  error, response, body, callback  ) {
	
// };
Creeper.prototype.requestAllURLs = function requestAllURLs ( urls, callback ) {
	var debug = require( 'debug' )('app:requestAllURLs');
	var self = this;
	debug( "Next group of URL to scrape");
	debug(urls);
	for( var i in urls ) {
		if( self.globalCacheOfURLs.hasOwnProperty( i ) && self.globalCacheOfURLs[ i ] === self.URL_STATE.HAS_NOT_BEEN_SCRAPED) {
			debug( "NEXT URL TO SCRAPE " + i ) ;
			self.scrapeURL( i, callback );
		}
	}
};
Creeper.prototype.countOfURLs = function countOfURLs ( isScraped ){
	var self = this;
	var count = 0;
	for( var i in self.globalCacheOfURLs ) {
		if( isScraped!==undefined && isScraped ) {
			if( self.globalCacheOfURLs[ i ] !== undefined && self.globalCacheOfURLs[ i ] === self.URL_STATE.HAS_BEEN_SCRAPED ) {
				++count;
			}
		}
		else if( isScraped!==undefined && !isScraped ) {
			if( self.globalCacheOfURLs[ i ] !== undefined && self.globalCacheOfURLs[ i ] === self.URL_STATE.HAS_NOT_BEEN_SCRAPED ) {
				++count;
			}
		}
		else {
			++count;
		}
	}
	return count;
};
Creeper.prototype.cacheDiagnosticLogs = function cacheDiagnosticLogs () {
	var self = this;
	console.log( "Count of all URLS: " + self.countOfURLs( undefined) );
	console.log( "Count of scraped URLS: " + self.countOfURLs( true ) );
	console.log( "Count of unscraped URLS: " + self.countOfURLs( false ) );
};

Creeper.prototype.allURLsScraped = function allURLsScraped () {
	var debug = require( 'debug' )('app:allURLsScraped');
	var self = this;
	debug( self.globalCacheOfURLs );
	for( var i in self.globalCacheOfURLs ) {
		if( self.globalCacheOfURLs[ i ] !== undefined && self.globalCacheOfURLs[ i ] === self.URL_STATE.HAS_NOT_BEEN_SCRAPED ) {
			debug( "Found unscraped URL so return false" );
			debug( "URL: ", i );
			self.cacheDiagnosticLogs();
			return false;
		}
	}
	console.log( "All URLS have been scraped." );
	self.cacheDiagnosticLogs();
	debug( self.globalCacheOfURLs );
	return true;
};

Creeper.prototype.scrapeURL =function scrapeURL(  startingURL, callback ) {
	var debug = require( 'debug' )('app:scrapeURL');
	console.log( "In scrapeURL" );
	var self = this;
	var foundURLs = {};
	requestio( startingURL, function (error, response, body) {

	  if (!error && response.statusCode == 200) {
			debug( 'GOING TO SCRAPE URL: ' + startingURL );
			// use cheerio to get a jQuery like handle on the body object
		$ = cheerio.load(body);
		foundURLs = self.getAllHRefs( $, startingURL);

		// get static assets and store in global namespace
		self.getAllStaticAssets( $ );		

		// spin off $.get (equivalent) asynchronous requests for each of the found URLs.
		self.requestAllURLs( foundURLs, callback );
		
		// set URL to HAS_BEEN_SCRAPED in cache as it's been scraped
		self.updateCachedURL( startingURL, self.URL_STATE.HAS_BEEN_SCRAPED );
			// if URLs in globalCacheOfURLs are all URL.HAS_BEEN_SCRAPED then the scrape is done and we can callback
		if( self.allURLsScraped() ) {
			console.log( "allURLsScraped returned true so we are done");
			debug( "Count of URLs found: " + self.globalCache.length );

			self.globalCallback(null, { urls : self.globalCacheOfURLs, css : self.globalListOfCSS, scripts : self.globalListOfScripts, images : self.globalListOfImages });
		}
	  }
	  else {
		console.log( "Error GET-ting: " + startingURL );
		self.globalCacheOfURLs[ startingURL ] = undefined;
		if( self.allURLsScraped() ) {
			console.log( "allURLsScraped returned true so we are done");
			self.globalCallback( null, { urls : self.globalCacheOfURLs, css : self.globalListOfCSS, scripts : self.globalListOfScripts, images : self.globalListOfImages });
		}
	  }
	});
};

Creeper.prototype.getRootURL = function getRootURL ( url ) {
	var pathArray = url.split( '/' );
	var protocol = pathArray[0];
	var host = pathArray[2];
	return protocol + '//' + host;
};

Creeper.prototype.makeWellFormedURL = function makeWellFormedURL( url ){
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
};

Creeper.prototype.resetGlobals = function resetGlobals(){
	globalCacheOfURLs = {};
	globalListOfCSS = {};
	globalListOfScripts = {};
	globalListOfImages = {};
	globalCache = [];
	globalStartSearchURL = "";
	globalRootURL = "";
};

module.exports = Creeper;
