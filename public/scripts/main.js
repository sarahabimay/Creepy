$(document).ready( function (){
	$('#scrape').click( function() {
		var searchURL = $('#scrapeURL').val();
		console.log( searchURL );
		$("#scrape").prop( 'disabled', true );
		$(".waiting").remove();
		$("#waitingarea").append( "<h3 class='waiting'> Server is busy searching " + searchURL + "</h3>");
		$.get('./searchurl?scrapeurl=' + searchURL, function( data ) {
			console.log( 'data: ' + data );
		})
		.done(function(data){
			$("#searchpanel").remove();
			$('#results').html(data);

		});
		
	});
	
});