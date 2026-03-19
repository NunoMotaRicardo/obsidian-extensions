import { App, Notice, TFile } from 'obsidian';
import {
	Document,
	Packer,
	Paragraph,
	TextRun,
	HeadingLevel,
	Table,
	TableRow,
	TableCell,
	WidthType,
	ImageRun,
	ExternalHyperlink,
	BorderStyle,
	AlignmentType,
	LevelFormat,
	convertMillimetersToTwip,
	TableLayoutType,
	ShadingType,
	PageOrientation,
} from 'docx';
import { NoteExportSettings, PAGE_SIZES } from './settings';
import { renderNoteToHTML } from './renderer';
import { replaceMermaidBlocks, MermaidImage } from './mermaid-exporter';

const { remote } = require('electron');
const { dialog } = remote;
const fs = require('fs');
const path = require('path');

// ─── Constants ───────────────────────────────────────────────────────────────

const MM_TO_EMU = 36000;       // 1 mm = 36000 EMU
const PT_TO_HALF_PT = 2;       // docx uses half-points for font sizes

// ─── Numbering config for lists ──────────────────────────────────────────────

const NUMBERING_CONFIG = {
	config: [
		{
			reference: 'note-export-bullets',
			levels: [
				{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertMillimetersToTwip(6), hanging: convertMillimetersToTwip(3) } } } },
				{ level: 1, format: LevelFormat.BULLET, text: '\u25E6', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertMillimetersToTwip(12), hanging: convertMillimetersToTwip(3) } } } },
				{ level: 2, format: LevelFormat.BULLET, text: '\u25AA', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertMillimetersToTwip(18), hanging: convertMillimetersToTwip(3) } } } },
			],
		},
		{
			reference: 'note-export-numbered',
			levels: [
				{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertMillimetersToTwip(6), hanging: convertMillimetersToTwip(3) } } } },
				{ level: 1, format: LevelFormat.LOWER_LETTER, text: '%2.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertMillimetersToTwip(12), hanging: convertMillimetersToTwip(3) } } } },
				{ level: 2, format: LevelFormat.LOWER_ROMAN, text: '%3.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertMillimetersToTwip(18), hanging: convertMillimetersToTwip(3) } } } },
			],
		},
	],
};

// ─── Inline formatting context ───────────────────────────────────────────────

interface InlineStyle {
	bold?: boolean;
	italics?: boolean;
	code?: boolean;
	strike?: boolean;
	underline?: boolean;
	link?: string;
	highlight?: string;
	superScript?: boolean;
	subScript?: boolean;
}

// ─── Main export function ────────────────────────────────────────────────────

export async function exportToDocx(
	app: App,
	file: TFile,
	settings: NoteExportSettings
): Promise<void> {
	const notice = new Notice('Exporting to Word…', 0);

	try {
		// 1. Render note to HTML
		const container = await renderNoteToHTML(app, file);

		// 2. Replace Mermaid diagrams with PNGs
		const mermaidImages = await replaceMermaidBlocks(container, settings, 'docx');

		// 3. Walk the DOM and build docx elements
		const children = walkChildren(container, settings, mermaidImages, 0);

		// 4. Build document
		const pageKey = settings.docxPageSize;
		const pageDef = PAGE_SIZES[pageKey] ?? PAGE_SIZES.A4;
		const landscape = settings.docxOrientation === 'landscape';

		const section = {
			properties: {
				page: {
					size: {
						orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
						width: convertMillimetersToTwip(landscape ? pageDef.height : pageDef.width),
						height: convertMillimetersToTwip(landscape ? pageDef.width : pageDef.height),
					},
					margin: {
						top: convertMillimetersToTwip(settings.docxMarginTop),
						bottom: convertMillimetersToTwip(settings.docxMarginBottom),
						left: convertMillimetersToTwip(settings.docxMarginLeft),
						right: convertMillimetersToTwip(settings.docxMarginRight),
					},
				},
			},
			children,
		};

		const doc = new Document({
			numbering: NUMBERING_CONFIG,
			sections: [section],
			styles: {
				default: {
					document: {
						run: {
							font: settings.docxFontFamily,
							size: settings.docxFontSize * PT_TO_HALF_PT,
						},
					},
					heading1: { run: { font: settings.docxHeadingFont, size: 32 * PT_TO_HALF_PT, bold: true } },
					heading2: { run: { font: settings.docxHeadingFont, size: 26 * PT_TO_HALF_PT, bold: true } },
					heading3: { run: { font: settings.docxHeadingFont, size: 22 * PT_TO_HALF_PT, bold: true } },
					heading4: { run: { font: settings.docxHeadingFont, size: 18 * PT_TO_HALF_PT, bold: true } },
					heading5: { run: { font: settings.docxHeadingFont, size: 16 * PT_TO_HALF_PT, bold: true } },
					heading6: { run: { font: settings.docxHeadingFont, size: 14 * PT_TO_HALF_PT, bold: true, italics: true } },
				},
			},
			title: file.basename,
			creator: 'Note Export – Obsidian Plugin',
		});

		// 5. Pack to buffer
		const buffer = await Packer.toBuffer(doc);

		// 6. Save dialog
		const defaultName = file.basename + '.docx';
		const result = await dialog.showSaveDialog({
			title: 'Export to Word',
			defaultPath: defaultName,
			filters: [{ name: 'Word Document', extensions: ['docx'] }],
		});

		if (result.canceled || !result.filePath) {
			notice.hide();
			return;
		}

		fs.writeFileSync(result.filePath, buffer);
		notice.hide();
		new Notice(`Exported to ${path.basename(result.filePath)}`);
	} catch (e) {
		notice.hide();
		console.error('Note Export: DOCX export failed', e);
		new Notice(`Word export failed: ${(e as Error).message}`);
	}
}

// ─── DOM Walker ──────────────────────────────────────────────────────────────

type DocxChild = Paragraph | Table;

function walkChildren(
	parent: HTMLElement | Node,
	settings: NoteExportSettings,
	mermaidImages: MermaidImage[],
	listLevel: number
): DocxChild[] {
	const results: DocxChild[] = [];

	for (const node of parent.childNodes) {
		if (node.nodeType === Node.TEXT_NODE) {
			const text = node.textContent ?? '';
			if (text.trim()) {
				results.push(new Paragraph({ children: [new TextRun(text)] }));
			}
			continue;
		}

		if (node.nodeType !== Node.ELEMENT_NODE) continue;
		const el = node as HTMLElement;
		const tag = el.tagName.toLowerCase();

		// Skip hidden elements
		if (el.style.display === 'none' || el.classList.contains('frontmatter')) continue;

		switch (tag) {
			case 'h1':
				results.push(makeHeading(el, HeadingLevel.HEADING_1, settings));
				break;
			case 'h2':
				results.push(makeHeading(el, HeadingLevel.HEADING_2, settings));
				break;
			case 'h3':
				results.push(makeHeading(el, HeadingLevel.HEADING_3, settings));
				break;
			case 'h4':
				results.push(makeHeading(el, HeadingLevel.HEADING_4, settings));
				break;
			case 'h5':
				results.push(makeHeading(el, HeadingLevel.HEADING_5, settings));
				break;
			case 'h6':
				results.push(makeHeading(el, HeadingLevel.HEADING_6, settings));
				break;

			case 'p':
				results.push(makeParagraph(el, settings, mermaidImages));
				break;

			case 'ul':
				results.push(...makeList(el, settings, mermaidImages, 'bullets', listLevel));
				break;

			case 'ol':
				results.push(...makeList(el, settings, mermaidImages, 'numbered', listLevel));
				break;

			case 'table':
				results.push(makeTable(el, settings, mermaidImages));
				break;

			case 'blockquote':
				results.push(...makeBlockquote(el, settings, mermaidImages));
				break;

			case 'pre':
				results.push(makeCodeBlock(el, settings));
				break;

			case 'hr':
				results.push(makeHorizontalRule());
				break;

			case 'img': {
				const imgPara = makeImageParagraph(el as HTMLImageElement, settings, mermaidImages);
				if (imgPara) results.push(imgPara);
				break;
			}

			case 'div':
			case 'section':
			case 'article':
			case 'main':
			case 'span':
				// Container elements — recurse into children
				results.push(...walkChildren(el, settings, mermaidImages, listLevel));
				break;

			case 'br':
				// Skip standalone <br> at block level
				break;

			default:
				// For unknown elements, try to recurse
				if (el.children.length > 0) {
					results.push(...walkChildren(el, settings, mermaidImages, listLevel));
				} else if (el.textContent?.trim()) {
					results.push(new Paragraph({ children: [new TextRun(el.textContent)] }));
				}
				break;
		}
	}

	return results;
}

// ─── Element builders ────────────────────────────────────────────────────────

function makeHeading(el: HTMLElement, level: typeof HeadingLevel[keyof typeof HeadingLevel], settings: NoteExportSettings): Paragraph {
	const runs = extractInlineRuns(el, {});
	return new Paragraph({
		heading: level,
		children: runs,
	});
}

function makeParagraph(el: HTMLElement, settings: NoteExportSettings, mermaidImages: MermaidImage[]): Paragraph {
	// Check if this paragraph contains only a Mermaid image
	const mermaidImg = el.querySelector<HTMLImageElement>('img.note-export-mermaid-img');
	if (mermaidImg) {
		const imgPara = makeImageParagraph(mermaidImg, settings, mermaidImages);
		if (imgPara) return imgPara;
	}

	// Check for regular images
	const img = el.querySelector<HTMLImageElement>('img:not(.note-export-mermaid-img)');
	if (img && el.childNodes.length === 1) {
		const imgPara = makeImageParagraph(img, settings, mermaidImages);
		if (imgPara) return imgPara;
	}

	const runs = extractInlineRuns(el, {});
	return new Paragraph({ children: runs });
}

function makeList(
	el: HTMLElement,
	settings: NoteExportSettings,
	mermaidImages: MermaidImage[],
	type: 'bullets' | 'numbered',
	level: number
): Paragraph[] {
	const items: Paragraph[] = [];
	const ref = type === 'bullets' ? 'note-export-bullets' : 'note-export-numbered';

	for (const li of el.children) {
		if (li.tagName.toLowerCase() !== 'li') continue;

		// Collect direct inline content (not nested lists)
		const inlineRuns: (TextRun | ExternalHyperlink)[] = [];
		const nestedLists: HTMLElement[] = [];

		for (const child of li.childNodes) {
			if (child.nodeType === Node.ELEMENT_NODE) {
				const childEl = child as HTMLElement;
				const childTag = childEl.tagName.toLowerCase();
				if (childTag === 'ul' || childTag === 'ol') {
					nestedLists.push(childEl);
				} else {
					inlineRuns.push(...extractInlineRuns(childEl, {}));
				}
			} else if (child.nodeType === Node.TEXT_NODE) {
				const text = child.textContent ?? '';
				if (text.trim()) {
					inlineRuns.push(new TextRun(text));
				}
			}
		}

		items.push(
			new Paragraph({
				children: inlineRuns,
				numbering: {
					reference: ref,
					level: Math.min(level, 2),
				},
			})
		);

		// Recurse into nested lists
		for (const nested of nestedLists) {
			const nestedType = nested.tagName.toLowerCase() === 'ol' ? 'numbered' : 'bullets';
			items.push(...makeList(nested, settings, mermaidImages, nestedType, level + 1));
		}
	}

	return items;
}

function makeTable(el: HTMLElement, settings: NoteExportSettings, mermaidImages: MermaidImage[]): Table {
	const rows: TableRow[] = [];
	const tableRows = el.querySelectorAll('tr');

	for (let rowIdx = 0; rowIdx < tableRows.length; rowIdx++) {
		const tr = tableRows[rowIdx];
		const cells: TableCell[] = [];
		const cellEls = tr.querySelectorAll('th, td');

		for (const cellEl of cellEls) {
			const isHeader = cellEl.tagName.toLowerCase() === 'th' || rowIdx === 0;
			const runs = extractInlineRuns(cellEl as HTMLElement, { bold: isHeader || undefined });
			cells.push(
				new TableCell({
					children: [new Paragraph({ children: runs })],
					width: { size: 0, type: WidthType.AUTO },
					shading: isHeader ? { type: ShadingType.SOLID, color: 'E8E8E8', fill: 'E8E8E8' } : undefined,
				})
			);
		}

		if (cells.length > 0) {
			rows.push(new TableRow({ children: cells }));
		}
	}

	return new Table({
		rows,
		width: { size: 100, type: WidthType.PERCENTAGE },
		layout: TableLayoutType.AUTOFIT,
	});
}

function makeBlockquote(el: HTMLElement, settings: NoteExportSettings, mermaidImages: MermaidImage[]): Paragraph[] {
	const children = walkChildren(el, settings, mermaidImages, 0);
	// Apply left border + indent to all paragraphs inside blockquote
	return children.map(child => {
		if (child instanceof Paragraph) {
			return new Paragraph({
				...((child as any).options ?? {}),
				children: extractInlineRuns(el, {}),
				indent: { left: convertMillimetersToTwip(10) },
				border: {
					left: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 4 },
				},
			});
		}
		return child;
	}) as Paragraph[];
}

function makeCodeBlock(el: HTMLElement, settings: NoteExportSettings): Paragraph {
	const codeEl = el.querySelector('code');
	const text = (codeEl ?? el).textContent ?? '';

	const lines = text.split('\n');
	const runs: TextRun[] = [];
	for (let i = 0; i < lines.length; i++) {
		if (i > 0) runs.push(new TextRun({ break: 1 }));
		runs.push(new TextRun({
			text: lines[i],
			font: { name: 'Courier New' },
			size: (settings.docxFontSize - 1) * PT_TO_HALF_PT,
		}));
	}

	return new Paragraph({
		children: runs,
		shading: { type: ShadingType.SOLID, color: 'F5F5F5', fill: 'F5F5F5' },
		spacing: { before: 100, after: 100 },
		indent: { left: convertMillimetersToTwip(3), right: convertMillimetersToTwip(3) },
	});
}

function makeHorizontalRule(): Paragraph {
	return new Paragraph({
		border: {
			bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC', space: 4 },
		},
		spacing: { before: 200, after: 200 },
	});
}

function makeImageParagraph(
	img: HTMLImageElement,
	settings: NoteExportSettings,
	mermaidImages: MermaidImage[]
): Paragraph | null {
	// Check if this is a Mermaid image
	const mermaidIdx = img.getAttribute('data-mermaid-index');
	if (mermaidIdx !== null) {
		const idx = parseInt(mermaidIdx, 10);
		const mimg = mermaidImages[idx];
		if (mimg) {
			return new Paragraph({
				children: [
					new ImageRun({
						data: mimg.png,
						transformation: {
							width: mimg.widthMm * MM_TO_EMU / 914.4,  // EMU → points for transformation
							height: mimg.heightMm * MM_TO_EMU / 914.4,
						},
						type: 'png',
					}),
				],
				alignment: AlignmentType.CENTER,
			});
		}
	}

	// Regular image — try to load from src
	// For now, skip images that can't be loaded synchronously
	// In a future version, could pre-fetch all images
	return null;
}

// ─── Inline content extraction ─────────────────────────────────────────────

function extractInlineRuns(el: HTMLElement | Node, parentStyle: InlineStyle): (TextRun | ExternalHyperlink)[] {
	const runs: (TextRun | ExternalHyperlink)[] = [];

	for (const node of el.childNodes) {
		if (node.nodeType === Node.TEXT_NODE) {
			const text = node.textContent ?? '';
			if (text) {
				runs.push(makeTextRun(text, parentStyle));
			}
			continue;
		}

		if (node.nodeType !== Node.ELEMENT_NODE) continue;
		const child = node as HTMLElement;
		const tag = child.tagName.toLowerCase();

		const style: InlineStyle = { ...parentStyle };

		switch (tag) {
			case 'strong':
			case 'b':
				style.bold = true;
				runs.push(...extractInlineRuns(child, style));
				break;

			case 'em':
			case 'i':
				style.italics = true;
				runs.push(...extractInlineRuns(child, style));
				break;

			case 'code':
				style.code = true;
				runs.push(...extractInlineRuns(child, style));
				break;

			case 'del':
			case 's':
			case 'strike':
				style.strike = true;
				runs.push(...extractInlineRuns(child, style));
				break;

			case 'u':
				style.underline = true;
				runs.push(...extractInlineRuns(child, style));
				break;

			case 'mark':
				style.highlight = 'yellow';
				runs.push(...extractInlineRuns(child, style));
				break;

			case 'sup':
				style.superScript = true;
				runs.push(...extractInlineRuns(child, style));
				break;

			case 'sub':
				style.subScript = true;
				runs.push(...extractInlineRuns(child, style));
				break;

			case 'a': {
				const href = child.getAttribute('href') ?? '';
				const linkRuns = extractInlineRuns(child, { ...style });
				if (href) {
					runs.push(
						new ExternalHyperlink({
							children: linkRuns.map(r => {
								if (r instanceof TextRun) return r;
								// Flatten nested hyperlinks — just extract text runs
								return new TextRun({ text: child.textContent ?? '' });
							}),
							link: href,
						})
					);
				} else {
					runs.push(...linkRuns);
				}
				break;
			}

			case 'br':
				runs.push(new TextRun({ break: 1 }));
				break;

			case 'img': {
				// Inline images — skip for now (handled at block level)
				const alt = child.getAttribute('alt');
				if (alt) {
					runs.push(new TextRun({ text: `[${alt}]`, italics: true }));
				}
				break;
			}

			default:
				// Recurse into unknown inline elements (span, etc.)
				runs.push(...extractInlineRuns(child, style));
				break;
		}
	}

	return runs;
}

function makeTextRun(text: string, style: InlineStyle): TextRun {
	return new TextRun({
		text,
		bold: style.bold || undefined,
		italics: style.italics || undefined,
		strike: style.strike || undefined,
		superScript: style.superScript || undefined,
		subScript: style.subScript || undefined,
		underline: style.underline ? { type: 'single' as any } : undefined,
		highlight: style.highlight ? (style.highlight as any) : undefined,
		font: style.code ? { name: 'Courier New' } : undefined,
		shading: style.code ? { type: ShadingType.SOLID, color: 'F0F0F0', fill: 'F0F0F0' } : undefined,
	});
}
