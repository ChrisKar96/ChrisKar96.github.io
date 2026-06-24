/**
 * CV page: silent PDF download via html2canvas + jsPDF (html2pdf.js).
 * No print dialog — triggers a normal browser file download.
 * Falls back to window.print() only if the library fails to load/generate.
 */
(function () {
	'use strict';

	var IMAGE_WAIT_MS = 10000;
	var FONT_WAIT_MS = 3000;
	var PDF_FILENAME = 'christos-karamolegkos-cv-eng.pdf';
	// Served from /static/js/vendor/ — fully client-side on GitHub Pages
	var HTML2PDF_SRC = '/js/vendor/html2pdf.bundle.min.js';

	var busy = false;

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

	function waitForFonts() {
		if (!document.fonts || !document.fonts.ready) {
			return Promise.resolve();
		}
		return Promise.race([
			document.fonts.ready,
			new Promise(function (resolve) { setTimeout(resolve, FONT_WAIT_MS); })
		]);
	}

	function shouldAutoDownload() {
		try {
			var params = new URLSearchParams(window.location.search);
			return params.has('print') || params.has('download');
		} catch (e) {
			return /[?&](print|download)(=|&|$)/.test(window.location.search);
		}
	}

	function setBusy(on) {
		busy = !!on;
		var btn = document.getElementById('cv-print-btn');
		if (!btn) {
			return;
		}
		btn.disabled = busy;
		if (busy) {
			btn.setAttribute('aria-busy', 'true');
			btn.dataset.originalHtml = btn.innerHTML;
			btn.innerHTML = '<i class="fa fa-fw fa-spinner fa-spin"></i> Generating PDF\u2026';
		} else {
			btn.removeAttribute('aria-busy');
			if (btn.dataset.originalHtml) {
				btn.innerHTML = btn.dataset.originalHtml;
			}
		}
		document.body.classList.toggle('cv-pdf-busy', busy);
	}

	function loadScript(src) {
		return new Promise(function (resolve, reject) {
			if (typeof window.html2pdf === 'function') {
				resolve();
				return;
			}
			var existing = document.querySelector('script[data-cv-html2pdf]');
			if (existing) {
				existing.addEventListener('load', function () { resolve(); });
				existing.addEventListener('error', function () { reject(new Error('html2pdf load failed')); });
				return;
			}
			var s = document.createElement('script');
			s.src = src;
			s.async = true;
			s.setAttribute('data-cv-html2pdf', '1');
			s.onload = function () { resolve(); };
			s.onerror = function () { reject(new Error('Failed to load ' + src)); };
			document.head.appendChild(s);
		});
	}

	/**
	 * Render #cv-document to a multi-page A4 PDF and trigger a file download.
	 * html2pdf uses html2canvas (rasterize) + jsPDF (assemble pages) — fully in-browser.
	 */
	function generateAndDownloadPdf(element) {
		var opt = {
			margin: [10, 10, 10, 10], // mm — matches LaTeX 1cm margins
			filename: PDF_FILENAME,
			image: { type: 'jpeg', quality: 0.96 },
			html2canvas: {
				scale: 2,
				useCORS: true,
				allowTaint: true,
				logging: false,
				// Capture at full document width; background white for clean pages
				backgroundColor: '#ffffff',
				scrollX: 0,
				scrollY: 0,
				windowWidth: element.scrollWidth
			},
			jsPDF: {
				unit: 'mm',
				format: 'a4',
				orientation: 'portrait',
				compress: true
			},
			pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
		};

		// Temporarily neutralize screen-only chrome so it cannot affect layout math
		document.body.classList.add('cv-pdf-exporting');

		return window.html2pdf()
			.set(opt)
			.from(element)
			.save()
			.then(function () {
				document.body.classList.remove('cv-pdf-exporting');
			})
			.catch(function (err) {
				document.body.classList.remove('cv-pdf-exporting');
				throw err;
			});
	}

	function fallbackPrint() {
		window.print();
	}

	function downloadCv() {
		if (busy) {
			return;
		}
		var doc = document.getElementById('cv-document');
		if (!doc) {
			fallbackPrint();
			return;
		}

		setBusy(true);
		materializeLazyImages(doc);

		waitForFonts()
			.then(function () { return waitForImages(doc, IMAGE_WAIT_MS); })
			.then(function () { return loadScript(HTML2PDF_SRC); })
			.then(function () {
				if (typeof window.html2pdf !== 'function') {
					throw new Error('html2pdf unavailable');
				}
				return generateAndDownloadPdf(doc);
			})
			.then(function () {
				setBusy(false);
			})
			.catch(function (err) {
				console.warn('CV PDF generation failed, falling back to print:', err);
				setBusy(false);
				fallbackPrint();
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
				downloadCv();
			});
		}

		if (shouldAutoDownload()) {
			// Slight delay so the page paints and toolbar is visible during generation
			setTimeout(downloadCv, 150);
		}
	});
})();
