// Nav to gr lang if clients country code GR
let httpRequest = new XMLHttpRequest();
httpRequest.onreadystatechange = function () {
  let country = httpRequest.response;
  function getCookie(cname) {
	  let name = cname + "=";
	  let decodedCookie = decodeURIComponent(document.cookie);
	  let ca = decodedCookie.split(';');
	  for(let i = 0; i <ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == ' ') {
		  c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
		  return c.substring(name.length, c.length);
		}
	  }
	  return "";
	}

  let redir = getCookie("redir");
  if(country == 'GR' && window.location.pathname != "/el/" && redir == ""){
	  location.replace("el/");
	  document.cookie = "redir=already_redirected_once;";
  }
}
httpRequest.open('GET', 'https://ipapi.co/country/');
httpRequest.send();