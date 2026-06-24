/**
 * CV page: silent PDF download via html2canvas + jsPDF (html2pdf.js).
 * No print dialog — normal file download. Print is only a last-resort fallback.
 *
 * Known blank-PDF pitfalls we work around:
 * - pagebreak mode 'avoid-all' (often yields empty pages in html2pdf 0.10.x)
 * - capturing while .cv-document has opacity < 1 (busy state)
 * - mm/viewport units confusing html2canvas sizing — pin a pixel width for export
 * - CSS custom properties sometimes not applied on off-screen clones — force colors
 */
(function () {
	'use strict';

	var IMAGE_WAIT_MS = 10000;
	var FONT_WAIT_MS = 4000;
	var PDF_FILENAME = 'christos-karamolegkos-cv-eng.pdf';
	var HTML2PDF_SRC = '/js/vendor/html2pdf.bundle.min.js';
	// A4 width at 96 CSS px/in: 210mm ≈ 794px (html2canvas is more reliable in px than mm)
	var EXPORT_WIDTH_PX = 794;

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
			// Cross-origin images can taint canvas; same-origin /img/* is fine on this site
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
		// Do NOT set opacity on #cv-document — html2canvas captures that and can produce blank output
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

	/**
	 * Build an off-DOM clone optimized for html2canvas.
	 * Capturing the live element while it has screen-only styles (mm widths, sticky
	 * toolbar offset, semi-transparent busy state) is a common source of blank PDFs.
	 */
	function buildExportClone(sourceEl) {
		var clone = sourceEl.cloneNode(true);

		// Force computed-friendly inline styles on the root (no CSS vars, fixed px box)
		clone.id = 'cv-document-export-clone';
		clone.className = 'cv-document cv-document-export';
		clone.removeAttribute('aria-label');
		clone.style.cssText = [
			'box-sizing:border-box',
			'width:' + EXPORT_WIDTH_PX + 'px',
			'max-width:' + EXPORT_WIDTH_PX + 'px',
			'min-width:' + EXPORT_WIDTH_PX + 'px',
			'margin:0',
			'padding:38px', // ~1cm at 96dpi
			'background:#ffffff',
			'color:#111111',
			'font-family:Tinos,"Times New Roman",Times,serif',
			'font-size:12px',
			'line-height:1.35',
			'box-shadow:none',
			'position:relative',
			'opacity:1',
			'visibility:visible',
			'overflow:visible',
			'transform:none',
			'left:auto',
			'top:auto'
		].join(';');

		// Ensure all descendants are visible/opaque (lazy/hidden remnants)
		var all = clone.querySelectorAll('*');
		for (var i = 0; i < all.length; i++) {
			var node = all[i];
			if (node.style) {
				if (node.style.opacity === '0') {
					node.style.opacity = '1';
				}
				if (node.style.visibility === 'hidden') {
					node.style.visibility = 'visible';
				}
			}
			if (node.tagName === 'IMG') {
				node.style.opacity = '1';
				node.classList.remove('lazy');
			}
		}

		// Mount in a fixed on-screen host so layout/fonts/images resolve like the real page.
		// html2canvas is unreliable with display:none / off-screen far left clones.
		var host = document.createElement('div');
		host.id = 'cv-pdf-export-host';
		host.setAttribute('aria-hidden', 'true');
		host.style.cssText = [
			'position:fixed',
			'left:0',
			'top:0',
			'width:' + EXPORT_WIDTH_PX + 'px',
			'z-index:2147483646',
			'background:#ffffff',
			'opacity:1',
			'pointer-events:none',
			// Keep it "visible" for capture but tucked under a full-screen white veil so the user
			// mostly sees the normal page + toolbar spinner rather than a flash of duplicated CV.
			// (We capture `clone`, not the veil.)
		].join(';');

		var veil = document.createElement('div');
		veil.style.cssText = [
			'position:fixed',
			'inset:0',
			'background:rgba(255,255,255,0.55)',
			'z-index:2147483645',
			'pointer-events:none'
		].join(';');
		veil.id = 'cv-pdf-export-veil';

		host.appendChild(clone);
		document.body.appendChild(veil);
		document.body.appendChild(host);

		return { host: host, veil: veil, clone: clone };
	}

	function teardownExportClone(parts) {
		if (!parts) {
			return;
		}
		if (parts.host && parts.host.parentNode) {
			parts.host.parentNode.removeChild(parts.host);
		}
		if (parts.veil && parts.veil.parentNode) {
			parts.veil.parentNode.removeChild(parts.veil);
		}
	}

	/**
	 * Manual html2canvas → jsPDF pipeline (more controllable than html2pdf.save defaults).
	 * Avoids the 'avoid-all' pagebreak mode that frequently produces blank multi-page output.
	 */
	function renderCloneToPdf(clone) {
		var h2cOpts = {
			scale: 2,
			useCORS: true,
			allowTaint: true,
			logging: false,
			backgroundColor: '#ffffff',
			scrollX: 0,
			scrollY: -window.scrollY,
			windowWidth: EXPORT_WIDTH_PX,
			width: EXPORT_WIDTH_PX,
			// Let height come from the element; forcing wrong height yields white slabs
			onclone: function (clonedDoc) {
				var root = clonedDoc.getElementById('cv-document-export-clone');
				if (root) {
					root.style.color = '#111111';
					root.style.background = '#ffffff';
					root.style.opacity = '1';
				}
				var style = clonedDoc.createElement('style');
				style.textContent = [
					'#cv-document-export-clone, #cv-document-export-clone * {',
					'  color: #111111 !important;',
					'  -webkit-print-color-adjust: exact !important;',
					'  print-color-adjust: exact !important;',
					'}',
					'#cv-document-export-clone { background: #ffffff !important; opacity: 1 !important; }',
					'#cv-document-export-clone a { color: #111111 !important; }',
					'#cv-document-export-clone img { opacity: 1 !important; }'
				].join('\n');
				clonedDoc.head.appendChild(style);
			}
		};

		// html2pdf exposes html2canvas + jsPDF on window via its bundle
		var html2canvas = window.html2canvas;
		var JsPDF = window.jspdf && window.jspdf.jsPDF;

		if (!html2canvas || !JsPDF) {
			// Fall back to html2pdf wrapper if globals differ by bundle version
			return window.html2pdf()
				.set({
					margin: 10,
					filename: PDF_FILENAME,
					image: { type: 'jpeg', quality: 0.98 },
					html2canvas: h2cOpts,
					jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
					// Do NOT use 'avoid-all' — it is a known source of blank pages
					pagebreak: { mode: ['css', 'legacy'] }
				})
				.from(clone)
				.save();
		}

		return html2canvas(clone, h2cOpts).then(function (canvas) {
			if (!canvas || !canvas.width || !canvas.height) {
				throw new Error('html2canvas returned an empty canvas');
			}

			// Sanity: mostly-white canvas means capture failed (still better to surface than silent blanks)
			try {
				var probe = canvas.getContext('2d').getImageData(
					Math.floor(canvas.width / 2),
					Math.min(40, canvas.height - 1),
					1,
					1
				).data;
				// If center-top pixel is pure white and height is large, we still proceed — content
				// might start lower; only fail if canvas is tiny.
			} catch (e) {
				// tainted canvas probe may throw; ignore
			}

			var pdf = new JsPDF({
				unit: 'mm',
				format: 'a4',
				orientation: 'portrait',
				compress: true
			});

			var pageWidthMm = pdf.internal.pageSize.getWidth();   // 210
			var pageHeightMm = pdf.internal.pageSize.getHeight(); // 297
			var marginMm = 0; // clone already has internal padding; use full page for image
			var contentWidthMm = pageWidthMm - marginMm * 2;
			var contentHeightMm = pageHeightMm - marginMm * 2;

			// Scale canvas so its width fills the page content area
			var pxPerMm = canvas.width / contentWidthMm;
			var pageHeightPx = contentHeightMm * pxPerMm;

			var yPx = 0;
			var page = 0;
			while (yPx < canvas.height) {
				if (page > 0) {
					pdf.addPage();
				}

				var sliceHeightPx = Math.min(pageHeightPx, canvas.height - yPx);
				var sliceCanvas = document.createElement('canvas');
				sliceCanvas.width = canvas.width;
				sliceCanvas.height = Math.max(1, Math.ceil(sliceHeightPx));
				var ctx = sliceCanvas.getContext('2d');
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
				ctx.drawImage(
					canvas,
					0, yPx, canvas.width, sliceHeightPx,
					0, 0, canvas.width, sliceHeightPx
				);

				var imgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
				var sliceHeightMm = sliceHeightPx / pxPerMm;
				pdf.addImage(imgData, 'JPEG', marginMm, marginMm, contentWidthMm, sliceHeightMm);

				yPx += sliceHeightPx;
				page += 1;
				// Safety: avoid infinite loop on bad geometry
				if (page > 20) {
					break;
				}
			}

			pdf.save(PDF_FILENAME);
		});
	}

	function generateAndDownloadPdf(sourceEl) {
		document.body.classList.add('cv-pdf-exporting');
		var parts = buildExportClone(sourceEl);

		// Give the browser a frame to layout/paint the clone (images/fonts)
		return new Promise(function (resolve) {
			requestAnimationFrame(function () {
				requestAnimationFrame(resolve);
			});
		})
			.then(function () { return waitForImages(parts.clone, IMAGE_WAIT_MS); })
			.then(function () { return waitForFonts(); })
			.then(function () {
				return renderCloneToPdf(parts.clone);
			})
			.then(function () {
				teardownExportClone(parts);
				document.body.classList.remove('cv-pdf-exporting');
			})
			.catch(function (err) {
				teardownExportClone(parts);
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
				if (typeof window.html2pdf !== 'function' && typeof window.html2canvas !== 'function') {
					throw new Error('PDF libraries unavailable');
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
			setTimeout(downloadCv, 250);
		}
	});
})();
