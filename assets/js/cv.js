/**
 * CV page helpers:
 * - Materialize lazy-loaded images (data-src → src) so print/PDF includes logos.
 * - Download / ?print=1 / ?download=1 triggers the browser print dialog (Save as PDF).
 * Works in all major browsers; actual PDF file is produced by the browser's print engine.
 */
(function () {
	'use strict';

	var PRINT_DELAY_MS = 400;
	var IMAGE_WAIT_MS = 8000;

	function materializeLazyImages(root) {
		var imgs = (root || document).querySelectorAll('img[data-src], img.lazy');
		for (var i = 0; i < imgs.length; i++) {
			var img = imgs[i];
			var src = img.getAttribute('data-src') || img.getAttribute('data-original');
			if (src && (!img.getAttribute('src') || img.getAttribute('src').indexOf('data:') === 0)) {
				img.setAttribute('src', src);
			}
			img.classList.remove('lazy');
			img.style.opacity = '1';
		}
	}

	function waitForImages(root, timeoutMs) {
		var imgs = (root || document).querySelectorAll('img');
		if (!imgs.length) {
			return Promise.resolve();
		}
		var pending = [];
		for (var i = 0; i < imgs.length; i++) {
			(function (img) {
				if (img.complete && img.naturalWidth > 0) {
					return;
				}
				pending.push(new Promise(function (resolve) {
					var done = function () {
						img.removeEventListener('load', done);
						img.removeEventListener('error', done);
						resolve();
					};
					img.addEventListener('load', done);
					img.addEventListener('error', done);
				}));
			})(imgs[i]);
		}
		if (!pending.length) {
			return Promise.resolve();
		}
		var timeout = new Promise(function (resolve) {
			setTimeout(resolve, timeoutMs || IMAGE_WAIT_MS);
		});
		return Promise.race([Promise.all(pending), timeout]);
	}

	function shouldAutoPrint() {
		try {
			var params = new URLSearchParams(window.location.search);
			return params.has('print') || params.has('download');
		} catch (e) {
			return /[?&](print|download)(=|&|$)/.test(window.location.search);
		}
	}

	/**
	 * Open the system print dialog. User chooses "Save as PDF" / "Microsoft Print to PDF".
	 * This is the only fully cross-browser, client-side, no-server way to get a real PDF
	 * with selectable text and correct pagination on static GitHub Pages hosting.
	 */
	function printCv() {
		var doc = document.getElementById('cv-document') || document.body;
		materializeLazyImages(doc);
		waitForImages(doc, IMAGE_WAIT_MS).then(function () {
			setTimeout(function () {
				window.print();
			}, PRINT_DELAY_MS);
		});
	}

	function onReady(fn) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', fn);
		} else {
			fn();
		}
	}

	onReady(function () {
		var doc = document.getElementById('cv-document') || document.body;
		materializeLazyImages(doc);

		var btn = document.getElementById('cv-print-btn');
		if (btn) {
			btn.addEventListener('click', function (e) {
				e.preventDefault();
				printCv();
			});
		}

		if (shouldAutoPrint()) {
			printCv();
		}
	});
})();
