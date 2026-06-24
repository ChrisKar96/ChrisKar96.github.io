/**
 * CV page: silent PDF download via html2pdf (html2canvas + jsPDF).
 * Export styling lives in cv.css (.cv-document-export, body.cv-pdf-exporting).
 */
(function () {
	'use strict';

	var IMAGE_WAIT_MS = 12000;
	var FONT_WAIT_MS = 5000;
	var AUTO_DOWNLOAD_DELAY_MS = 1200;
	var PDF_FILENAME = 'christos-karamolegkos-cv-eng.pdf';
	var HTML2PDF_SRC = '/js/vendor/html2pdf.bundle.min.js';
	var busy = false;
	var savedInlineStyle = null;

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
			img.style.visibility = 'visible';
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
			if (!btn.dataset.originalHtml) {
				btn.dataset.originalHtml = btn.innerHTML;
			}
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
				if (typeof window.html2pdf === 'function') {
					resolve();
					return;
				}
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

	function prepareElementForCapture(el) {
		window.scrollTo(0, 0);
		savedInlineStyle = el.getAttribute('style');
		el.classList.add('cv-document-export');
		document.body.classList.add('cv-pdf-exporting');
	}

	function restoreElementAfterCapture(el) {
		el.classList.remove('cv-document-export');
		document.body.classList.remove('cv-pdf-exporting');
		if (savedInlineStyle == null) {
			el.removeAttribute('style');
		} else {
			el.setAttribute('style', savedInlineStyle);
		}
		savedInlineStyle = null;
	}

	function nextFrame() {
		return new Promise(function (resolve) {
			requestAnimationFrame(function () {
				requestAnimationFrame(resolve);
			});
		});
	}

	/** Resolve relative hrefs to absolute so html2pdf's hyperlinks plugin can embed them. */
	function normalizeAnchorHrefs(root) {
		var anchors = (root || document).querySelectorAll('a[href]');
		for (var i = 0; i < anchors.length; i++) {
			var a = anchors[i];
			var href = a.getAttribute('href');
			if (!href || href.charAt(0) === '#') continue;
			if (/^(https?:|mailto:|tel:)/i.test(href)) continue;
			try { a.setAttribute('href', a.href); } catch (e) { /* ignore */ }
		}
	}

	function renderElementToPdf(el) {
		return window.html2pdf().set({
			margin: [10, 10, 10, 10],
			filename: PDF_FILENAME,
			image: { type: 'jpeg', quality: 0.98 },
			enableLinks: true,
			html2canvas: {
				scale: 2,
				useCORS: true,
				allowTaint: true,
				logging: false,
				backgroundColor: '#ffffff',
				// ponytail: all export styling lives in cv.css via .cv-document-export
				// and body.cv-pdf-exporting — clone inherits the stylesheet, no inline
				// overrides needed. Only hrefs need fixing (clone is a separate DOM).
				onclone: function (clonedDoc) {
					normalizeAnchorHrefs(clonedDoc.getElementById('cv-document') || clonedDoc.body);
				}
			},
			jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
			pagebreak: { mode: ['css'] }
		}).from(el).save();
	}

	function downloadCv() {
		if (busy) return;
		var doc = document.getElementById('cv-document');
		if (!doc) { window.print(); return; }

		setBusy(true);
		materializeLazyImages(doc);

		waitForFonts()
			.then(function () { return waitForImages(doc, IMAGE_WAIT_MS); })
			.then(function () { return loadScript(HTML2PDF_SRC); })
			.then(function () {
				prepareElementForCapture(doc);
				return nextFrame();
			})
			.then(function () { return renderElementToPdf(doc); })
			.then(function () { restoreElementAfterCapture(doc); setBusy(false); })
			.catch(function (err) {
				console.warn('CV PDF generation failed, falling back to print:', err);
				restoreElementAfterCapture(doc);
				setBusy(false);
				window.print();
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
		materializeLazyImages();

		var btn = document.getElementById('cv-print-btn');
		if (btn) {
			btn.addEventListener('click', function (e) {
				e.preventDefault();
				downloadCv();
			});
		}

		if (shouldAutoDownload()) {
			// Wait for first paint + assets — 250ms was too early (blank PDFs from home link)
			setTimeout(downloadCv, AUTO_DOWNLOAD_DELAY_MS);
		}
	});
})();
