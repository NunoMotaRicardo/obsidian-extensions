import * as fs   from 'fs';
import * as os   from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';

import { App, Notice, TFile } from 'obsidian';

import { NoteExportSettings, PAGE_SIZES } from './settings';
import { renderNote }           from './renderer';
import { replaceMermaidBlocks } from './mermaid-exporter';

// mm → inches for Electron printToPDF margins
const MM_TO_IN = 1 / 25.4;

function sleep(ms: number): Promise<void> {
return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeTemplate(template: string): string | undefined {
const trimmed = template.trim();
return trimmed ? trimmed : undefined;
}

function buildHtmlPage(bodyHtml: string, styles: string, settings: NoteExportSettings): string {
const sizeKey     = settings.pdfPageSize;
const orientation = settings.pdfOrientation;
const page        = PAGE_SIZES[sizeKey] ?? PAGE_SIZES['A4'];
const pageW       = orientation === 'landscape' ? page.height : page.width;
const pageH       = orientation === 'landscape' ? page.width  : page.height;

// @page sets the paper size and margins within the HTML/CSS
const pageRuleWidthMM  = orientation === 'landscape' ? page.height : page.width;
const pageRuleHeightMM = orientation === 'landscape' ? page.width  : page.height;

return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
@page {
  size: ${pageRuleWidthMM}mm ${pageRuleHeightMM}mm;
  margin: ${settings.pdfMarginTop}mm ${settings.pdfMarginRight}mm ${settings.pdfMarginBottom}mm ${settings.pdfMarginLeft}mm;
}
html, body {
  margin: 0; padding: 0;
  background: #ffffff;
  color: #000000;
  font-family: sans-serif;
}
body { padding: ${settings.pdfMarginTop}mm ${settings.pdfMarginRight}mm ${settings.pdfMarginBottom}mm ${settings.pdfMarginLeft}mm; box-sizing: border-box; }
/* Mermaid images: centred, no overflow */
img.note-export-mermaid-img { display:block; margin:0 auto; max-width:100%; }
img { max-width:100%; }
pre, code { white-space: pre-wrap; word-break: break-all; }
${styles}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export async function exportToPdf(
app: App,
file: TFile,
settings: NoteExportSettings,
): Promise<void> {
// ── 1. Ask where to save ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { remote } = require('electron') as any;
const defaultPath = path.join(
os.homedir(),
file.basename + '.pdf',
);

const { filePath, canceled } = await remote.dialog.showSaveDialog({
defaultPath,
filters: [{ name: 'PDF', extensions: ['pdf'] }],
});

if (canceled || !filePath) return;

// ── 2. Render note with Obsidian's pipeline ───────────────────────────────
const notice = new Notice('⏳ Rendering note…', 0);

let container: HTMLElement;
let styles: string;
try {
({ container, styles } = await renderNote(app, file));
} catch (err) {
notice.hide();
new Notice(`❌ Render failed: ${err instanceof Error ? err.message : String(err)}`, 0);
console.error('[note-export] renderNote failed:', err);
throw err;
}

// ── 3. Convert Mermaid SVGs to PNG images ─────────────────────────────────
try {
await replaceMermaidBlocks(container, settings, 'pdf');
} catch (err) {
console.error('[note-export] replaceMermaidBlocks error:', err);
// Continue even if some diagrams fail — they keep their original SVG fallback
}

// ── 4. Build self-contained HTML string ───────────────────────────────────
const html = buildHtmlPage(container.innerHTML, styles, settings);

// ── 5. Write temp HTML file ───────────────────────────────────────────────
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'note-export-'));
const tmpFile = path.join(tempDir, `${file.basename}__note_export__.html`);
try {
fs.writeFileSync(tmpFile, html, 'utf-8');
} catch (err) {
notice.hide();
new Notice(`❌ Could not write temp file: ${err instanceof Error ? err.message : String(err)}`, 0);
console.error('[note-export] writeFileSync (tmp) failed:', err);
throw err;
}

// ── 6. Print to PDF via a hidden BrowserWindow ────────────────────────────
notice.hide();
const printNotice = new Notice('🖨️ Printing to PDF…', 0);

try {
await new Promise<void>((resolve, reject) => {
const BrowserWindow = remote.BrowserWindow;
const win = new BrowserWindow({
show: false,
webPreferences: {
javascript: false, // no JS needed — content is static HTML
nodeIntegration: false,
contextIsolation: true,
},
});

const fileUrl = pathToFileURL(tmpFile).toString();
console.log('[note-export] Loading temp HTML:', fileUrl);

const hangTimeout = setTimeout(() => {
win.destroy();
reject(new Error('Timed out waiting for page to load. The note may be too large for PDF export.'));
}, 15_000);

win.webContents.once('did-finish-load', async () => {
clearTimeout(hangTimeout);
try {
// Give fonts/layout a moment to settle.
await sleep(500);

const sizeKey     = settings.pdfPageSize;
const orientation = settings.pdfOrientation;
const page        = PAGE_SIZES[sizeKey] ?? PAGE_SIZES['A4'];
const pageW       = orientation === 'landscape' ? page.height : page.width;
const pageH       = orientation === 'landscape' ? page.width  : page.height;

console.log('[note-export] Calling printToPDF, page:', sizeKey, orientation, pageW, 'x', pageH, 'mm');
const headerTemplate = normalizeTemplate(settings.pdfHeaderTemplate);
const footerTemplate = normalizeTemplate(settings.pdfFooterTemplate);
const pdfBuffer = await win.webContents.printToPDF({
printBackground: settings.pdfPrintBackground,
landscape:       orientation === 'landscape',
pageSize:        { width: Math.round(pageW * 1000), height: Math.round(pageH * 1000) }, // microns
margins: {
marginType: 'custom',
top:    settings.pdfMarginTop    * MM_TO_IN,
bottom: settings.pdfMarginBottom * MM_TO_IN,
left:   settings.pdfMarginLeft   * MM_TO_IN,
right:  settings.pdfMarginRight  * MM_TO_IN,
},
displayHeaderFooter: Boolean(headerTemplate || footerTemplate),
headerTemplate,
footerTemplate,
});

console.log('[note-export] printToPDF done, bytes:', pdfBuffer.length);
fs.writeFileSync(filePath, pdfBuffer);
win.destroy();
resolve();
} catch (e) {
win.destroy();
reject(e);
}
});

win.webContents.once('did-fail-load', (_ev: unknown, code: number, desc: string) => {
clearTimeout(hangTimeout);
win.destroy();
reject(new Error(`Page failed to load [${code}]: ${desc}`));
});

win.loadURL(fileUrl).catch((error: unknown) => {
clearTimeout(hangTimeout);
win.destroy();
reject(error instanceof Error ? error : new Error(String(error)));
});
});

new Notice(`✅ PDF saved: ${path.basename(filePath)}`);
} catch (err) {
new Notice(`❌ PDF export failed: ${err instanceof Error ? err.message : String(err)}`, 0);
console.error('[note-export] PDF export failed:', err);
throw err;
} finally {
printNotice.hide();
try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
try { fs.rmdirSync(tempDir); } catch { /* ignore */ }
}
}
