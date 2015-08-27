var requestio  = require('request');
var cheerio  = require('cheerio');
var validator = require('validator');
var urlPath = require( 'url' );

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

Creeper.prototype.init = function (options) {
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

// HELPER FUNCTIONS //

Creeper.prototype.updateCacheWithStartingURL = function ( startingSearchURL ){
	var self = this
	self.globalStartSearchURL = startingSearchURL;
	self.globalRootURL = self.getRootURL( startingSearchURL ); // e.g. https://www.gocardless.com
	self.cacheURL( startingSearchURL );
};
Creeper.prototype.cacheAllStaticAssets = function ( $ ) {
	var self = this;
	self.getAllCSS( $ );
	self.getAllScripts( $ );
	self.getAllImages( $ );
	self.getAllVideo( $ );
	self.getAllOtherLinks( $ );
};

Creeper.prototype.getAllCSS = function ( $ ) {
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

Creeper.prototype.getAllOtherLinks = function ( $ ) {
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

Creeper.prototype.getAllScripts = function ( $ ) {
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

Creeper.prototype.getAllImages = function ( $ ) {
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

Creeper.prototype.getAllVideo = function ( $ ) {
	var self = this;
	return self.globalListOfVideo;
};

Creeper.prototype.removeTrailingSlash = function ( url ){
	var searchStr, position, lastIndex;
	if( url && url.endsWith( "/" ) ){
		searchStr = "/";
		position = url.length -= searchStr.length;
		lastIndex = url.indexOf("/", position );

		return url.slice(0, lastIndex );
	}
	return url;
};

Creeper.prototype.updateStateOfCachedURL = function ( url, state ) {
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
	self.updateStateOfCachedURL( url, self.URL_STATE.HAS_NOT_BEEN_SCRAPED );
	self.globalCache.push( url );
};

Creeper.prototype.addToCache = function ( url ) {
	var debug = require( 'debug' )('app:addToCache');
	var self = this;
	debug( "Search for external domain. Root URL: ", self.globalRootURL );
	debug( "Found URL: ", url );
	// debug( ( url.indexOf( self.globalRootURL ) < 0) ? "External URL" : "Internal URL");
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

Creeper.prototype.getFullPath = function( currentLocation, href ){
	var debug = require( 'debug' )('app:getFullPath');
	var self = this;
	var fullPath = "";

	if( href.match( "^https?" ) ){
		return href;
	}
	else if( href.match("^/" ) ) { // root-relative path eg href='/****'
		fullPath = urlPath.resolve( self.globalRootURL, href );
		debug( "Root-relative path resolved to Fullpath is: ", fullPath );
		return fullPath;
	}
	else{ // relative path starts without '/' e.g. services/prototyping
		// a bit of a hack to fit the condition when currentLocation is like: http://blah.blah/blah/blah.html
		if( !currentLocation.match(".html$")){
			debug( "CurrentLocation doesn't have .html at the end" );
			currentLocation += '/';
		}
		fullPath = urlPath.resolve( currentLocation, href );
		debug( "Current Location: ", currentLocation );
		debug( "URL: ", href );
		debug( "Relative path resolved to Fullpath is: ", fullPath );
		return fullPath;
	}
};
Creeper.prototype.addedToCache = function( currentLocation, href ) {
	var debug = require( 'debug' )('app:addedToCache');
	var self = this;
	var fullPath = "";
	// The href will not be added to the cache if:
	// 1. it is undefined
	// 2. it is an inline link e.g. #footer - can ignore these
	// 3. it is an empty string because this is the same as the parent url
	// 4. it is a duplicate of an already cached url
	// 5. it is a url for an different domain to the one we initiated the scrape with.
	if( href === undefined || href.match('^#') || href === "" || href.match( "^mailto") ){
		debug( "Found an href which can be ingnored" );
		return false;
	} 
	// validator.isURL only checks if a url is well formed and not whether it is an actual url
	if( href.match( '^https?') && validator.isURL( href ) ){
		debug( "href is canonical and well formed.");
		fullPath = href;
	}
	else{ 
		fullPath = self.getFullPath( currentLocation, href );
	}
	if( !validator.isURL(fullPath) ) {  
		debug( 'Invalid URL so skipping: ', fullPath );
		return false;
	}
	debug( "Valid URL so stick it in the list if unique");
	return self.addToCache( fullPath );

};

Creeper.prototype.totalOfURLFound = function () {
	var self = this;
	var count = 0;
	for( var i in self.globalCacheOfURLs ) {
		++count;
	}
	return count;
};
Creeper.prototype.getScrapeStateType = function ( type ) {
	var self = this;
	return ( type === "fail" )? undefined : type === "scraped";
};

Creeper.prototype.countURLType = function countURLType ( stateType ) {
	var self = this;
	var count = 0;
	for( var i in self.globalCacheOfURLs ) {
		if( self.globalCacheOfURLs[ i ] === stateType ) {
			++count;
		}
	}
	return count;
};

Creeper.prototype.countOfURLs = function ( type ){
	var self = this;
	var count = 0;
	if( type === "all" ) return self.totalOfURLFound();
	var stateType = self.getScrapeStateType( type );
	return self.countURLType( stateType );
};

Creeper.prototype.cacheDiagnosticLogs = function () {
	var self = this;
	console.log( "Count of all URLS: " + self.countOfURLs( "all") );
	console.log( "Count of scraped URLS: " + self.countOfURLs( 'scraped' ) );
	console.log( "Count of unscraped URLS: " + self.countOfURLs( 'unscraped' ) );
	console.log( "Count of URLS which failed to scrape: " + self.countOfURLs( 'fail' ) );
};

Creeper.prototype.getRootURL = function ( url ) {
	var pathArray = url.split( '/' );
	var protocol = pathArray[0];
	var host = pathArray[2];
	return protocol + '//' + host;
};

Creeper.prototype.makeWellFormedURL = function ( url ){
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

Creeper.prototype.allURLsHaveBeenScraped = function () {
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

Creeper.prototype.requestAllURLsFor = function ( urls ) {
	var debug = require( 'debug' )('app:requestAllURLs');
	var self = this;
	debug( "Next group of URL to scrape");
	debug(urls);
	for( var i in urls ) {
		if( self.globalCacheOfURLs.hasOwnProperty( i ) && self.globalCacheOfURLs[ i ] === self.URL_STATE.HAS_NOT_BEEN_SCRAPED) {
			debug( "NEXT URL TO SCRAPE " + i ) ;
			self.startScrapingURL( i );
		}
	}
};
Creeper.prototype.extractURLsFrom = function ( $, currentURL ) {
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
	});
	return foundURLs;
};

Creeper.prototype.responseSuccessful = function ( error, response ) {
	return !error && response.statusCode == 200;
};

Creeper.prototype.completeTheScrape = function(){
	var debug = require( "debug") ("app:completTheScrape");
	var self = this;
	console.log( "allURLsHaveBeenScraped returned true so we are done");
	self.globalCallback( null, { urls : self.globalCacheOfURLs, css : self.globalListOfCSS, scripts : self.globalListOfScripts, images : self.globalListOfImages });
};

Creeper.prototype.processResponseError = function ( searchURL, error ){
	console.log( "Error GET-ting: " + searchURL );
	console.error( error );
	var self = this;
	self.globalCacheOfURLs[ startingURL ] = undefined;
	if( self.allURLsHaveBeenScraped() ) self.completeTheScrape();
};

Creeper.prototype.processSuccessfulResponse = function ( searchURL, body ) {
	var debug = require( 'debug' )('app:processSuccessfulResponse');
	var self = this;
	var parsedBody = cheerio.load( body );
	debug( 'GOING TO SCRAPE URL: ' + searchURL );		
	self.requestAllURLsFor( self.extractURLsFrom( parsedBody, searchURL ) );
	self.cacheAllStaticAssets( parsedBody );		
	self.updateStateOfCachedURL( searchURL, self.URL_STATE.HAS_BEEN_SCRAPED );

	if( self.allURLsHaveBeenScraped() ) self.completeTheScrape();
};

Creeper.prototype.startScrapingURL = function ( startingURL ) {
	var debug = require( 'debug' )('app:scrapeURL');
	var self = this;
	var foundURLs = {};
	debug( "In scrapeURL" );
	requestio( { uri: startingURL, headers: { 'User-Agent': 'request' } }, function ( error, response, body ) {
		self.responseSuccessful( error, response ) ? self.processSuccessfulResponse( startingURL, body ) : self.processResponseError();
	});
};

Creeper.prototype.startSearchingURL = function( url ) {
	var self = this;
	var searchURL = self.makeWellFormedURL( url );

	if( self.globalStartSearchURL === searchURL ) {
		console.log( "********************RETRY OF EXISTING SEARCH SO IGNORE!********************");
	}
	else{
		// NEED A WAY OF KILLING THE PREVIOUS SEARCH!!!! 
		// UNTIL I CAN DO THIS A NEW SEARCH HAS TO BE PREVENTED !!!!
		console.log( "STARTING A NEW SEARCH");
		self.updateCacheWithStartingURL( searchURL );
		
		console.log( "Start Scraping the URL: ", searchURL );
		self.startScrapingURL( searchURL );
	}
};
module.exports = Creeper;
