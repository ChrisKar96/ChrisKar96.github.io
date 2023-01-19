document.addEventListener("DOMContentLoaded", function () {
	document.getElementById("maincont").style.visibility = "hidden";
	document.getElementById("loader").style.display = "block";
});

window.addEventListener("load", function () {
	document.getElementById("loader").classList.add("fadeOut");
	document.getElementById("maincont").style.visibility = "visible";
	setTimeout(function(){ document.getElementById("loader").style.display = "none"; }, 1000);
});