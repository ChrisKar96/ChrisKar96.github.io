let _doNotTrack = (
	window.doNotTrack == "1" || 
    navigator.doNotTrack == "yes" || 
    navigator.doNotTrack == "1" || 
    navigator.msDoNotTrack == "1" || 
    ('msTrackingProtectionEnabled' in window.external && 
    window.external.msTrackingProtectionEnabled())
);
if (!_doNotTrack) {
	(function () {
		var ga = document.createElement('script');
		ga.type = 'text/javascript';
		ga.async = true;
		ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-6C72R28657';
		var s = document.getElementsByTagName('script')[0];
		s.parentNode.insertBefore(ga, s);
	})();
	window.dataLayer = window.dataLayer || [];
	function gtag() {
		dataLayer.push(arguments);
	}
	gtag('js', new Date());
	gtag('config', 'G-6C72R28657');
}
