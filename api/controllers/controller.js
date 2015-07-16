var Path 	 = require("path");

module.exports = {

	homeView: {
		handler: function (request, reply ) {
			return reply("success");
		}
	},

	searchURL: {
		handler: function (request, reply ) {
			console.log( "Payload: " + request.payload );
			return reply("success");
		}
	}
};
