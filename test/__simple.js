var lab    = exports.lab = require("lab").script();
var assert = require("chai").assert;
var Hapi   = require("hapi");
var server = require("../api/server.js");

// Authentication and routing testing
lab.experiment("When a user visits the home page, ", function() {

	lab.test("the home page should be rendered ", function(done) {

		var options = {
		    url : "/",
		    method : "GET",
		};

		server.inject(options, function(response) {
			assert.equal(response.statusCode, 200, " they should get an OK status code (200)");
			assert.include(response.payload, "href=\"/login\"", "there should be a to text box and a button");
			done();
		    });
	    });
});

lab.experiment("When a user clicks the button and sends the URL" ), function() {
	lab.test( "they should get back what? The site map or a FOUND(302) response or a 200?", function( done) {

		var options = {
			url: "http://www.gocardless.com",
			method : "GET",
		};

		server.inject( options, function( response ) {
			assert.equal( response.statusCode, 200, " they get an OK status code(200)");
			assert.include( response.payload, "  ", "there should be what in the html");
			done();
		});
	});
});
