$('#maincont').hide();

$( window ).on("load", function() {
	$(".loader").fadeOut("slow");
	$('#maincont').show();
});