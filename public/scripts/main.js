$(document).ready( function (){
	$('#scrape').click( function() {
		var searchURL = $('#scrapeURL').val();
		console.log( searchURL );
		$(".waiting").remove();
		$("#results").append( "<h2 class='waiting'> Server is busy searching " + searchURL + "</h2>");
	});
	// send a GET request to my web server
	/*$('#scrape').click( function() {
		var resultHTML;
		console.log( $('#scrapeURL').val());
		$.get('./searchurl?query=' + $('#scrapeURL').val(), function( data ) {
			console.log( 'data: ' + data );
		})
		.done(function(data){
			console.log( "In done callback. Data: " + data );
			// resultHTML = data.map( function( element, index ){
			// 	return '<li>' + element.text + '</li>';
			// });
			// $('#results').html(resultHTML.join("") );
			// $('#results').appendChild( "<p>"+data+"</p>");
		});
	});*/
});