var requestio  = require('request');
var cheerio  = require('cheerio');
var validator = require('validator');
var url = require( 'url' );

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

// HELPER FUNCTIONS //

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
	else if( href.match("^/" ) ) { // root-relative path eg href='/****'
		fullPath = url.resolve( self.globalRootURL, href );
		debug( "Root-relative path resolved to Fullpath is: ", fullPath );
		return fullPath;
	}
	else{ // relative path starts without '/' e.g. services/prototyping
		fullPath = url.resolve( currentLocation, href );
		debug( "Relative path resolved to Fullpath is: ", fullPath );
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

Creeper.prototype.totalOfURLFound = function numberOfURLFound () {
	var self = this;
	var count = 0;
	for( var i in self.globalCacheOfURLs ) {
		++count;
	}
	return count;
};
Creeper.prototype.getScrapeStateType = function getScrapeStateType ( type ) {
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

Creeper.prototype.countOfURLs = function countOfURLs ( type ){
	var self = this;
	var count = 0;
	if( type === "all" ) return self.totalOfURLFound();
	var stateType = self.getScrapeStateType( type );
	return self.countURLType( stateType );
};

Creeper.prototype.cacheDiagnosticLogs = function cacheDiagnosticLogs () {
	var self = this;
	console.log( "Count of all URLS: " + self.countOfURLs( "all") );
	console.log( "Count of scraped URLS: " + self.countOfURLs( 'scraped' ) );
	console.log( "Count of unscraped URLS: " + self.countOfURLs( 'unscraped' ) );
	console.log( "Count of URLS which failed to scrape: " + self.countOfURLs( 'fail' ) );
};

Creeper.prototype.getRootURL = function getRootURL ( url ) {
	var pathArray = url.split( '/' );
	var protocol = pathArray[0];
	var host = pathArray[2];
	return protocol + '//' + host;
};

Creeper.prototype.makeWellFormedURL = function makeWellFormedURL ( url ){
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

Creeper.prototype.requestAllURLs = function requestAllURLs ( urls ) {
	var debug = require( 'debug' )('app:requestAllURLs');
	var self = this;
	debug( "Next group of URL to scrape");
	debug(urls);
	for( var i in urls ) {
		if( self.globalCacheOfURLs.hasOwnProperty( i ) && self.globalCacheOfURLs[ i ] === self.URL_STATE.HAS_NOT_BEEN_SCRAPED) {
			debug( "NEXT URL TO SCRAPE " + i ) ;
			self.scrapeURL( i );
		}
	}
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
Creeper.prototype.scrapeURL =function scrapeURL(  startingURL ) {
	var debug = require( 'debug' )('app:scrapeURL');
	debug( "In scrapeURL" );
	var self = this;
	var foundURLs = {};
	requestio( {uri: startingURL, headers: {'User-Agent': 'request'}}, function (error, response, body) {

		if (!error && response.statusCode == 200) {
			debug( 'GOING TO SCRAPE URL: ' + startingURL );
			// use cheerio to get a jQuery like handle on the body object
			$ = cheerio.load(body);
			foundURLs = self.getAllHRefs( $, startingURL);

			// get static assets and store in global namespace
			self.getAllStaticAssets( $ );		

			// spin off asynchronous GET requests for each of the found URLs.
			self.requestAllURLs( foundURLs );
			
			// current URL has been scraped so update it's state to HAS_BEEN_SCRAPED in the cache
			self.updateCachedURL( startingURL, self.URL_STATE.HAS_BEEN_SCRAPED );
				// if all URLs in globalCacheOfURLs are: URL.HAS_BEEN_SCRAPED, then the scrape is done and we can callback to client
			if( self.allURLsScraped() ) {
				console.log( "allURLsScraped returned true so we are done");
				debug( "Count of URLs found: " + self.globalCache.length );

				self.globalCallback(null, { urls : self.globalCacheOfURLs, css : self.globalListOfCSS, scripts : self.globalListOfScripts, images : self.globalListOfImages });
			}
		}
		else {
		console.log( "Error GET-ting: " + startingURL );
		console.error( error );
		self.globalCacheOfURLs[ startingURL ] = undefined;
		if( self.allURLsScraped() ) {
			console.log( "allURLsScraped returned true so we are done");
			self.globalCallback( null, { urls : self.globalCacheOfURLs, css : self.globalListOfCSS, scripts : self.globalListOfScripts, images : self.globalListOfImages });
		}
		}
	});
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
		console.log( "STARTING A NEW SEARCH");

		// // Keep track of the current search url to prevent retries whilst mid scrape.
		self.globalStartSearchURL = searchURL;

		// // The globalRootHost var should just be the protocol and hostname and none of the path
		self.globalRootURL = self.getRootURL( searchURL ); // e.g. https://www.gocardless.com
		
		// Store the searchURL in the globalCacheOfURLs
		console.log( "Starting URL: ", searchURL );
		self.cacheURL( searchURL );
		self.scrapeURL( searchURL );
	}
};
module.exports = Creeper;
