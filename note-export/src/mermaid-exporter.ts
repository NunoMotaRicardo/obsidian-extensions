import { NoteExportSettings, PAGE_SIZES } from './settings';

// 1 inch = 914400 EMU (English Metric Units, used by docx library)
// 1 inch = 96 CSS pixels (standard screen DPI)
// 1 mm   = 96/25.4 = ~3.7795 CSS pixels
const MM_PER_INCH = 25.4;
const PX_PER_INCH = 96;
const MM_TO_PX    = PX_PER_INCH / MM_PER_INCH;   // pixels at 96 DPI
const MM_TO_EMU   = 914400 / MM_PER_INCH;         // EMU per mm
const CANVAS_SCALE = 2;                            // render at 2x for sharpness

export interface MermaidReplacement {
dataUrl: string;
widthMm: number;
heightMm: number;
/** Width in 96-DPI pixels (for docx ImageRun transformation) */
widthPx: number;
/** Height in 96-DPI pixels (for docx ImageRun transformation) */
heightPx: number;
}

/**
 * Convert a rendered SVGSVGElement to a PNG data URL, scaled to fit the
 * given page content area while preserving the aspect ratio.
 *
 * This function works on DETACHED SVG elements — no getComputedStyle needed
 * because Mermaid always embeds its styles as <style> blocks inside the SVG.
 */
async function svgElementToPng(
svg: SVGSVGElement,
contentWidthMm: number,
contentHeightMm: number,
): Promise<{ dataUrl: string; widthMm: number; heightMm: number }> {
// ── 1. Natural SVG dimensions from viewBox ───────────────────────────────
let svgW = 0, svgH = 0;
const vb = svg.getAttribute('viewBox');
if (vb) {
const p = vb.trim().split(/[\s,]+/);
if (p.length >= 4) { svgW = parseFloat(p[2]); svgH = parseFloat(p[3]); }
}
// Fallback to explicit width/height attributes
if (!svgW) svgW = parseFloat(svg.getAttribute('width')  ?? '0') || 800;
if (!svgH) svgH = parseFloat(svg.getAttribute('height') ?? '0') || 400;

// ── 2. Clone and set explicit dimensions (required for canvas rendering) ─
const clone = svg.cloneNode(true) as SVGSVGElement;
clone.setAttribute('width',  String(svgW));
clone.setAttribute('height', String(svgH));
clone.style.background = '#ffffff';

// ── 3. Serialize SVG → Blob URL ──────────────────────────────────────────
const svgStr = new XMLSerializer().serializeToString(clone);
const blob   = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
const url    = URL.createObjectURL(blob);

// ── 4. Scale-to-fit page content area ───────────────────────────────────
// SVG px → mm (at 96 DPI)
const PX_TO_MM = MM_PER_INCH / PX_PER_INCH;
let fitW = svgW * PX_TO_MM;
let fitH = svgH * PX_TO_MM;

if (fitW > contentWidthMm) {
const r = contentWidthMm / fitW;
fitW = contentWidthMm;
fitH *= r;
}
if (fitH > contentHeightMm) {
const r = contentHeightMm / fitH;
fitH = contentHeightMm;
fitW *= r;
}

// ── 5. Render to canvas at 2x resolution ────────────────────────────────
const canvasW = Math.round(svgW * CANVAS_SCALE);
const canvasH = Math.round(svgH * CANVAS_SCALE);

const dataUrl = await new Promise<string>((resolve, reject) => {
const canvas = document.createElement('canvas');
canvas.width  = canvasW;
canvas.height = canvasH;
const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvasW, canvasH);

const img = new Image();
img.onload = () => {
ctx.drawImage(img, 0, 0, canvasW, canvasH);
URL.revokeObjectURL(url);
resolve(canvas.toDataURL('image/png'));
};
img.onerror = (e) => {
URL.revokeObjectURL(url);
reject(new Error('Failed to load SVG into Image element: ' + e));
};
img.src = url;
});

return { dataUrl, widthMm: fitW, heightMm: fitH };
}

function getContentDimsMm(
settings: NoteExportSettings,
prefix: 'pdf' | 'docx',
): { contentWidthMm: number; contentHeightMm: number } {
const sizeKey     = prefix === 'pdf' ? settings.pdfPageSize    : settings.docxPageSize;
const orientation = prefix === 'pdf' ? settings.pdfOrientation : settings.docxOrientation;
const page        = PAGE_SIZES[sizeKey] ?? PAGE_SIZES['A4'];

const pageW = orientation === 'landscape' ? page.height : page.width;
const pageH = orientation === 'landscape' ? page.width  : page.height;

const mT = prefix === 'pdf' ? settings.pdfMarginTop    : settings.docxMarginTop;
const mB = prefix === 'pdf' ? settings.pdfMarginBottom : settings.docxMarginBottom;
const mL = prefix === 'pdf' ? settings.pdfMarginLeft   : settings.docxMarginLeft;
const mR = prefix === 'pdf' ? settings.pdfMarginRight  : settings.docxMarginRight;

return { contentWidthMm: pageW - mL - mR, contentHeightMm: pageH - mT - mB };
}

/**
 * Find all rendered Mermaid SVGs in the container, convert each to a PNG
 * data URL scaled to fit the page, and replace the .mermaid wrapper element
 * with an <img> carrying the data URL and dimension data-attributes.
 *
 * Works on both attached and detached containers because Mermaid embeds all
 * its styles inside the SVG <style> block.
 */
export async function replaceMermaidBlocks(
container: HTMLElement,
settings: NoteExportSettings,
target: 'pdf' | 'docx',
): Promise<MermaidReplacement[]> {
const { contentWidthMm, contentHeightMm } = getContentDimsMm(settings, target);
const replacements: MermaidReplacement[] = [];

// Obsidian renders: .block-language-mermaid > .mermaid > svg
// Collect the outermost wrapper so we replace the whole block
const wrappers = Array.from(
container.querySelectorAll<HTMLElement>('.block-language-mermaid')
);

// Fallback: loose .mermaid divs not inside .block-language-mermaid
const looseMermaid = Array.from(
container.querySelectorAll<HTMLElement>('.mermaid')
).filter(el => !el.closest('.block-language-mermaid'));

const targets = [...wrappers, ...looseMermaid];

for (const wrapper of targets) {
const svg = wrapper.querySelector<SVGSVGElement>('svg');
if (!svg) continue;

try {
const { dataUrl, widthMm, heightMm } = await svgElementToPng(
svg,
contentWidthMm,
contentHeightMm,
);

const widthPx  = Math.round(widthMm  * MM_TO_PX);
const heightPx = Math.round(heightMm * MM_TO_PX);

replacements.push({ dataUrl, widthMm, heightMm, widthPx, heightPx });

// Replace the wrapper in the DOM with an <img> using the data URL
const img = document.createElement('img');
img.src                  = dataUrl;
img.className            = 'note-export-mermaid-img';
img.style.cssText        = [
			'display:block',
			'margin:0 auto',
			'max-width:100%',
			`width:${widthMm}mm`,
			`height:${heightMm}mm`,
		].join(';');
img.dataset.mermaidWidthPx  = String(widthPx);
img.dataset.mermaidHeightPx = String(heightPx);

wrapper.replaceWith(img);
} catch (err) {
console.error('[note-export] Failed to convert Mermaid diagram:', err);
// Leave the original wrapper in place as a fallback
}
}

return replacements;
}