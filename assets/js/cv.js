/**
 * CV page: silent PDF download (html2pdf = html2canvas + jsPDF).
 *
 * Strategy (keeps it simple — previous clone/fixed-host/scrollY hacks caused
 * blank pages or content shifted so only paragraph tails were visible):
 *  1. scroll to top
 *  2. restyle the *live* #cv-document for export (fixed px width, no shadow)
 *  3. body.cv-pdf-exporting enables block (non-flex) layout for timeline
 *  4. html2pdf with minimal options, margin 0 (padding is on the element)
 *  5. restore styles
 */
(function () {
	'use strict';

	var IMAGE_WAIT_MS = 12000;
	var FONT_WAIT_MS = 5000;
	var AUTO_DOWNLOAD_DELAY_MS = 1200;
	var PDF_FILENAME = 'christos-karamolegkos-cv-eng.pdf';
	var HTML2PDF_SRC = '/js/vendor/html2pdf.bundle.min.js';
	// A4 @ 96dpi
	var EXPORT_WIDTH_PX = 794;

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
		// Start from a known scroll/viewport origin — offsets here are a prime cause of
		// "content shifted left, only ends of lines visible" in html2canvas.
		window.scrollTo(0, 0);
		if (document.documentElement) {
			document.documentElement.scrollTop = 0;
		}
		document.body.scrollTop = 0;

		savedInlineStyle = el.getAttribute('style');
		el.classList.add('cv-document-export');
		document.body.classList.add('cv-pdf-exporting');

		// Fixed pixel box, normal flow, top-left of its containing block (body)
		el.style.setProperty('box-sizing', 'border-box', 'important');
		el.style.setProperty('width', EXPORT_WIDTH_PX + 'px', 'important');
		el.style.setProperty('max-width', EXPORT_WIDTH_PX + 'px', 'important');
		el.style.setProperty('min-width', EXPORT_WIDTH_PX + 'px', 'important');
		el.style.setProperty('margin', '0', 'important');
		el.style.setProperty('margin-left', '0', 'important');
		el.style.setProperty('margin-right', '0', 'important');
		el.style.setProperty('padding', '36px', 'important');
		el.style.setProperty('background', '#ffffff', 'important');
		el.style.setProperty('color', '#111111', 'important');
		el.style.setProperty('box-shadow', 'none', 'important');
		el.style.setProperty('position', 'relative', 'important');
		el.style.setProperty('left', '0', 'important');
		el.style.setProperty('top', '0', 'important');
		el.style.setProperty('right', 'auto', 'important');
		el.style.setProperty('transform', 'none', 'important');
		el.style.setProperty('opacity', '1', 'important');
		el.style.setProperty('visibility', 'visible', 'important');
		el.style.setProperty('overflow', 'visible', 'important');
		el.style.setProperty('float', 'none', 'important');
		el.style.setProperty('display', 'block', 'important');
		el.style.setProperty('min-height', '0', 'important');
		el.style.setProperty('height', 'auto', 'important');
	}

	function restoreElementAfterCapture(el) {
		el.classList.remove('cv-document-export');
		document.body.classList.remove('cv-pdf-exporting');
		if (savedInlineStyle === null || savedInlineStyle === undefined) {
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

	function delay(ms) {
		return new Promise(function (resolve) { setTimeout(resolve, ms); });
	}

	/**
	 * html2pdf worker API only — avoids hand-rolled canvas slicing and scroll offsets.
	 * margin 0: the element already carries ~1cm padding.
	 */
	/**
	 * Ensure anchors have absolute http(s)/mailto/tel hrefs so html2pdf's hyperlinks
	 * plugin can embed clickable annotations (relative or empty hrefs are skipped).
	 */
	function normalizeAnchorHrefs(root) {
		var anchors = (root || document).querySelectorAll('a[href]');
		for (var i = 0; i < anchors.length; i++) {
			var a = anchors[i];
			var href = a.getAttribute('href');
			if (!href || href.charAt(0) === '#') {
				continue;
			}
			// Resolve protocol-relative and path-only links against the live site origin
			try {
				if (/^(https?:|mailto:|tel:)/i.test(href)) {
					continue; // already absolute
				}
				a.setAttribute('href', a.href); // browser resolves to absolute URL
			} catch (e) {
				// ignore
			}
		}
	}

	function renderElementToPdf(el) {
		normalizeAnchorHrefs(el);

		var opt = {
			// Per-page margin in mm [top, left, bottom, right] — prevents text cut-off at page edges
			margin: [10, 10, 10, 10],
			filename: PDF_FILENAME,
			image: { type: 'jpeg', quality: 0.98 },
			// html2pdf hyperlinks plugin: overlay real PDF link annotations on the raster
			enableLinks: true,
			html2canvas: {
				scale: 2,
				useCORS: true,
				allowTaint: true,
				logging: false,
				backgroundColor: '#ffffff',
				// Critical: do NOT set scrollX/scrollY/x/y/windowWidth — those are what
				// shifted content off the left edge of the page in the previous build.
				// Let html2canvas measure the element from its normal document position.
				onclone: function (clonedDoc) {
					var root = clonedDoc.getElementById('cv-document');
					if (!root) {
						return;
					}
					root.style.setProperty('color', '#111111', 'important');
					root.style.setProperty('background', '#ffffff', 'important');
					root.style.setProperty('opacity', '1', 'important');
					root.style.setProperty('margin', '0', 'important');
					root.style.setProperty('left', '0', 'important');
					root.style.setProperty('transform', 'none', 'important');
					root.style.setProperty('min-height', '0', 'important');
					root.style.setProperty('height', 'auto', 'important');

					// Resolve hrefs in the clone too (plugin reads this DOM)
					var anchors = root.querySelectorAll('a[href]');
					for (var i = 0; i < anchors.length; i++) {
						var a = anchors[i];
						var href = a.getAttribute('href');
						if (!href || href.charAt(0) === '#') {
							continue;
						}
						if (!/^(https?:|mailto:|tel:)/i.test(href)) {
							try {
								a.setAttribute('href', a.href);
							} catch (e) { /* ignore */ }
						}
					}

					// Extra safety in the cloned DOM (html2canvas's internal copy)
					var style = clonedDoc.createElement('style');
					style.textContent = [
						'body.cv-pdf-exporting, body.cv-pdf-exporting * {',
						'  animation: none !important;',
						'  transition: none !important;',
						'}',
						'#cv-document.cv-document-export, #cv-document.cv-document-export * {',
						'  color: #111111 !important;',
						'}',
						'#cv-document.cv-document-export {',
						'  background: #ffffff !important;',
						'  opacity: 1 !important;',
						'  box-shadow: none !important;',
						'  margin: 0 !important;',
						'  left: 0 !important;',
						'  transform: none !important;',
						'  min-height: 0 !important;',
						'  height: auto !important;',
						'}',
						/* Sections/timeline/document: flow across pages */
						'#cv-document, #cv-document .cv-section, #cv-document .cv-section-body,',
						'#cv-document ul.timeline {',
						'  page-break-inside: auto !important;',
						'  break-inside: auto !important;',
						'}',
						/* Individual entries: keep together on one page */
						'#cv-document ul.timeline > li,',
						'#cv-document ul.timeline > li.timeline-inverted {',
						'  page-break-inside: avoid !important;',
						'  break-inside: avoid !important;',
						'}',
						/* Block layout — flex is poorly supported in html2canvas */
						'body.cv-pdf-exporting .cv-section-body ul.timeline > li,',
						'body.cv-pdf-exporting .cv-section-body ul.timeline > li.timeline-inverted {',
						'  display: block !important;',
						'  overflow: hidden !important;',
						'}',
						'body.cv-pdf-exporting .cv-section-body ul.timeline > li > a:first-child {',
						'  float: left !important;',
						'  display: block !important;',
						'  width: 48px !important;',
						'  margin: 0 10px 4px 0 !important;',
						'}',
						'body.cv-pdf-exporting .cv-section-body .timeline-panel {',
						'  display: block !important;',
						'  overflow: hidden !important;',
						'  width: auto !important;',
						'  float: none !important;',
						'}',
						'body.cv-pdf-exporting .cv-section-body .timeline-image,',
						'body.cv-pdf-exporting .cv-section-body img.timeline-image {',
						'  width: 42px !important;',
						'  height: auto !important;',
						'  max-width: 42px !important;',
						'  max-height: 42px !important;',
						'}'
					].join('\n');
					clonedDoc.head.appendChild(style);
				}
			},
			jsPDF: {
				unit: 'mm',
				format: 'a4',
				orientation: 'portrait',
				compress: true
			},
			// 'css' mode: html2pdf honors break-inside:avoid on <li> entries (keeps each
			// job/cert/edu together) while letting sections flow freely across pages.
			pagebreak: { mode: ['css'] }
		};

		return window.html2pdf().set(opt).from(el).save();
	}

	function generateAndDownloadPdf(el) {
		prepareElementForCapture(el);
		materializeLazyImages(el);

		// Let layout settle after style mutations (esp. important for ?download=1 fast path)
		return nextFrame()
			.then(function () { return waitForFonts(); })
			.then(function () { return waitForImages(el, IMAGE_WAIT_MS); })
			.then(function () { return delay(100); })
			.then(function () { return nextFrame(); })
			.then(function () {
				if (typeof window.html2pdf !== 'function') {
					throw new Error('html2pdf unavailable');
				}
				return renderElementToPdf(el);
			})
			.then(function () {
				restoreElementAfterCapture(el);
			})
			.catch(function (err) {
				restoreElementAfterCapture(el);
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
			// Wait for first paint + assets — 250ms was too early (blank PDFs from home link)
			setTimeout(downloadCv, AUTO_DOWNLOAD_DELAY_MS);
		}
	});
})();
