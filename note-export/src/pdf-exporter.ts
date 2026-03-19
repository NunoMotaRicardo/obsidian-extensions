import { App, Notice, TFile } from 'obsidian';
import { NoteExportSettings, PAGE_SIZES } from './settings';
import { renderNoteToHTML, collectObsidianCSS, buildFullHTML } from './renderer';
import { replaceMermaidBlocks } from './mermaid-exporter';

// Electron APIs available in Obsidian's desktop environment
const { remote } = require('electron');
const { BrowserWindow, dialog } = remote;
const fs = require('fs');
const path = require('path');
const os = require('os');

/** Map our page size names to Electron's expected format */
function getElectronPageSize(settings: NoteExportSettings): { width: number; height: number } | string {
	const knownSizes: Record<string, string> = {
		A4: 'A4',
		A3: 'A3',
		Letter: 'Letter',
		Legal: 'Legal',
		Tabloid: 'Tabloid',
	};

	const electronName = knownSizes[settings.pdfPageSize];
	if (electronName) return electronName as any;

	// Fallback to dimensions in microns
	const page = PAGE_SIZES[settings.pdfPageSize] ?? PAGE_SIZES.A4;
	return {
		width: page.width * 1000, // mm to microns
		height: page.height * 1000,
	};
}

export async function exportToPdf(
	app: App,
	file: TFile,
	settings: NoteExportSettings
): Promise<void> {
	const notice = new Notice('Exporting to PDF…', 0);

	try {
		// 1. Render note to HTML
		const container = await renderNoteToHTML(app, file);

		// 2. Replace Mermaid SVGs with fitted PNGs
		await replaceMermaidBlocks(container, settings, 'pdf');

		// 3. Collect Obsidian CSS and build full HTML document
		const css = collectObsidianCSS();
		const html = buildFullHTML(container, css);

		// 4. Write HTML to a temp file (data URLs can hit length limits)
		const tmpDir = os.tmpdir();
		const tmpFile = path.join(tmpDir, `note-export-${Date.now()}.html`);
		fs.writeFileSync(tmpFile, html, 'utf-8');

		// 5. Create hidden BrowserWindow and load the HTML
		const win = new BrowserWindow({
			show: false,
			width: 800,
			height: 600,
			webPreferences: {
				offscreen: true,
			},
		});

		await win.loadFile(tmpFile);

		// Wait a bit for any images to load
		await new Promise(resolve => setTimeout(resolve, 500));

		// 6. Generate PDF
		const landscape = settings.pdfOrientation === 'landscape';
		const pdfBuffer = await win.webContents.printToPDF({
			landscape,
			marginsType: 0, // custom margins
			pageSize: getElectronPageSize(settings),
			printBackground: settings.pdfPrintBackground,
			margins: {
				top: settings.pdfMarginTop / 25.4,       // mm to inches
				bottom: settings.pdfMarginBottom / 25.4,
				left: settings.pdfMarginLeft / 25.4,
				right: settings.pdfMarginRight / 25.4,
			},
			headerTemplate: settings.pdfHeaderTemplate || undefined,
			footerTemplate: settings.pdfFooterTemplate || undefined,
			displayHeaderFooter: !!(settings.pdfHeaderTemplate || settings.pdfFooterTemplate),
		});

		win.destroy();

		// Clean up temp file
		try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

		// 7. Show save dialog
		const defaultName = file.basename + '.pdf';
		const result = await dialog.showSaveDialog({
			title: 'Export to PDF',
			defaultPath: defaultName,
			filters: [{ name: 'PDF', extensions: ['pdf'] }],
		});

		if (result.canceled || !result.filePath) {
			notice.hide();
			return;
		}

		// 8. Write PDF
		fs.writeFileSync(result.filePath, pdfBuffer);

		notice.hide();
		new Notice(`Exported to ${path.basename(result.filePath)}`);
	} catch (e) {
		notice.hide();
		console.error('Note Export: PDF export failed', e);
		new Notice(`PDF export failed: ${(e as Error).message}`);
	}
}
