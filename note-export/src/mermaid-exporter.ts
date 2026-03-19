import mermaid from 'mermaid';
import { NoteExportSettings, PAGE_SIZES } from './settings';

/** Extracted Mermaid block: the DOM element and its source code */
interface MermaidBlock {
	element: HTMLElement;
	code: string;
}

/** Result of rendering a Mermaid diagram to PNG */
export interface MermaidImage {
	png: Uint8Array;
	/** Display width in mm, fitted to page */
	widthMm: number;
	/** Display height in mm, fitted to page */
	heightMm: number;
}

let mermaidInitialized = false;

function ensureMermaidInit() {
	if (mermaidInitialized) return;
	mermaid.initialize({
		startOnLoad: false,
		theme: 'default',
		securityLevel: 'loose',
		fontFamily: 'sans-serif',
	});
	mermaidInitialized = true;
}

/**
 * Find all Mermaid code blocks in the rendered container and
 * extract the original source. Obsidian renders Mermaid into divs
 * that contain SVG; the original source is kept in a `<code>` sibling
 * or we parse it from the SVG.
 */
export function extractMermaidSources(container: HTMLElement): MermaidBlock[] {
	const blocks: MermaidBlock[] = [];

	// Obsidian wraps Mermaid output in elements with class "mermaid"
	const mermaidEls = container.querySelectorAll<HTMLElement>('.mermaid');
	for (const el of mermaidEls) {
		// Try to get source from a preceding <code> in the same code block
		const codeBlock = el.closest('.block-language-mermaid') ?? el.closest('[class*="language-mermaid"]');
		let code = '';

		if (codeBlock) {
			const codeEl = codeBlock.querySelector('code');
			if (codeEl) {
				code = codeEl.textContent ?? '';
			}
		}

		// Fallback: extract from data attribute if Obsidian stores it
		if (!code) {
			code = el.getAttribute('data-source') ?? '';
		}

		// Fallback: try to recover from the SVG's aria-label or content
		if (!code) {
			const svg = el.querySelector('svg');
			if (svg) {
				code = svg.getAttribute('aria-roledescription') === 'mermaid'
					? (svg.querySelector('.mermaid-main-font')?.textContent ?? '')
					: '';
			}
		}

		if (code.trim()) {
			blocks.push({ element: el, code: code.trim() });
		}
	}

	return blocks;
}

/**
 * Render a Mermaid diagram in an unconstrained off-screen container,
 * then convert the resulting SVG to PNG at 2× resolution.
 */
export async function renderMermaidToPng(
	code: string,
	scale: number = 2
): Promise<{ png: Uint8Array; naturalWidth: number; naturalHeight: number }> {
	ensureMermaidInit();

	// Create an unconstrained off-screen container
	const offscreen = document.createElement('div');
	offscreen.style.cssText =
		'position:fixed; left:-99999px; top:0; width:99999px; visibility:hidden; overflow:visible;';
	document.body.appendChild(offscreen);

	try {
		const id = `mermaid-export-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const { svg: svgCode } = await mermaid.render(id, code, offscreen);
		offscreen.innerHTML = svgCode;

		const svgEl = offscreen.querySelector('svg');
		if (!svgEl) throw new Error('Mermaid render produced no SVG');

		// Get intrinsic dimensions
		const viewBox = svgEl.getAttribute('viewBox');
		let svgW: number, svgH: number;
		if (viewBox) {
			const parts = viewBox.split(/[\s,]+/).map(Number);
			svgW = parts[2];
			svgH = parts[3];
		} else {
			svgW = svgEl.width.baseVal.value || svgEl.getBoundingClientRect().width;
			svgH = svgEl.height.baseVal.value || svgEl.getBoundingClientRect().height;
		}

		// Ensure the SVG has explicit width/height for canvas rendering
		svgEl.setAttribute('width', String(svgW));
		svgEl.setAttribute('height', String(svgH));

		// Serialize SVG to a data URL
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svgEl);
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(svgBlob);

		// Draw on canvas at scaled resolution
		const canvas = document.createElement('canvas');
		canvas.width = svgW * scale;
		canvas.height = svgH * scale;
		const ctx = canvas.getContext('2d')!;
		ctx.scale(scale, scale);

		const png = await new Promise<Uint8Array>((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				ctx.drawImage(img, 0, 0, svgW, svgH);
				URL.revokeObjectURL(url);
				canvas.toBlob(blob => {
					if (!blob) return reject(new Error('Canvas toBlob failed'));
					blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
				}, 'image/png');
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error('Failed to load Mermaid SVG as image'));
			};
			img.src = url;
		});

		return { png, naturalWidth: svgW, naturalHeight: svgH };
	} finally {
		offscreen.remove();
	}
}

/**
 * Compute display dimensions that fit within the page content area,
 * preserving aspect ratio.
 */
export function fitToPage(
	naturalWidth: number,
	naturalHeight: number,
	contentWidthMm: number,
	contentHeightMm: number
): { widthMm: number; heightMm: number } {
	// Convert SVG px to mm (assume 96 DPI screen → 1px = 0.2646mm)
	const PX_TO_MM = 0.2646;
	const imgW = naturalWidth * PX_TO_MM;
	const imgH = naturalHeight * PX_TO_MM;

	let w = imgW;
	let h = imgH;

	// Scale down to fit content width
	if (w > contentWidthMm) {
		const ratio = contentWidthMm / w;
		w = contentWidthMm;
		h = h * ratio;
	}

	// If still too tall, scale down to fit content height
	if (h > contentHeightMm) {
		const ratio = contentHeightMm / h;
		h = contentHeightMm;
		w = w * ratio;
	}

	return { widthMm: w, heightMm: h };
}

/**
 * Get the page content area dimensions in mm from settings.
 */
export function getContentArea(settings: NoteExportSettings, prefix: 'pdf' | 'docx'): { widthMm: number; heightMm: number } {
	const sizeKey = prefix === 'pdf' ? settings.pdfPageSize : settings.docxPageSize;
	const orientation = prefix === 'pdf' ? settings.pdfOrientation : settings.docxOrientation;
	const page = PAGE_SIZES[sizeKey] ?? PAGE_SIZES.A4;

	const pageW = orientation === 'landscape' ? page.height : page.width;
	const pageH = orientation === 'landscape' ? page.width : page.height;

	const mTop = prefix === 'pdf' ? settings.pdfMarginTop : settings.docxMarginTop;
	const mBottom = prefix === 'pdf' ? settings.pdfMarginBottom : settings.docxMarginBottom;
	const mLeft = prefix === 'pdf' ? settings.pdfMarginLeft : settings.docxMarginLeft;
	const mRight = prefix === 'pdf' ? settings.pdfMarginRight : settings.docxMarginRight;

	return {
		widthMm: pageW - mLeft - mRight,
		heightMm: pageH - mTop - mBottom,
	};
}

/**
 * Process all Mermaid blocks in the container:
 * re-render each at natural size, convert to PNG, and replace the SVG
 * element with an <img> tag at fitted dimensions.
 *
 * Returns the list of MermaidImage data for use by the DOCX exporter.
 */
export async function replaceMermaidBlocks(
	container: HTMLElement,
	settings: NoteExportSettings,
	target: 'pdf' | 'docx'
): Promise<MermaidImage[]> {
	const blocks = extractMermaidSources(container);
	const contentArea = getContentArea(settings, target);
	const images: MermaidImage[] = [];

	for (const block of blocks) {
		try {
			const { png, naturalWidth, naturalHeight } = await renderMermaidToPng(block.code);
			const { widthMm, heightMm } = fitToPage(
				naturalWidth,
				naturalHeight,
				contentArea.widthMm,
				contentArea.heightMm
			);

			images.push({ png, widthMm, heightMm });

			// Replace the Mermaid element with an <img>
			const img = document.createElement('img');
			const blob = new Blob([png.buffer as ArrayBuffer], { type: 'image/png' });
			img.src = URL.createObjectURL(blob);
			img.style.width = `${widthMm}mm`;
			img.style.height = `${heightMm}mm`;
			img.style.maxWidth = '100%';
			img.style.display = 'block';
			img.classList.add('note-export-mermaid-img');
			img.setAttribute('data-mermaid-index', String(images.length - 1));

			block.element.replaceWith(img);
		} catch (e) {
			console.error('Note Export: failed to render Mermaid diagram', e);
			// Leave original element in place as fallback
		}
	}

	return images;
}
