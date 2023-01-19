function updateTime() {
	var time = moment().tz("{{ .Site.Params.home.timeZone }}").format("{{ .Site.Params.home.timeFormat }}");
    $("#time").html(time);
}
$(document).ready(function() {
	updateTime();
    setInterval(updateTime, 1000);
})
