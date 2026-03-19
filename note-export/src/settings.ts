import { App, PluginSettingTab, Setting } from 'obsidian';
import type { Plugin } from 'obsidian';

// Forward declaration to avoid circular dependency
interface NoteExportPluginLike extends Plugin {
	settings: NoteExportSettings;
	saveSettings(): Promise<void>;
	toggleRibbonIcon(): void;
}

export interface NoteExportSettings {
	// General
	showRibbonIcon: boolean;

	// PDF
	pdfPageSize: string;
	pdfOrientation: 'portrait' | 'landscape';
	pdfMarginTop: number;
	pdfMarginBottom: number;
	pdfMarginLeft: number;
	pdfMarginRight: number;
	pdfHeaderTemplate: string;
	pdfFooterTemplate: string;
	pdfPrintBackground: boolean;

	// DOCX
	docxPageSize: string;
	docxOrientation: 'portrait' | 'landscape';
	docxMarginTop: number;
	docxMarginBottom: number;
	docxMarginLeft: number;
	docxMarginRight: number;
	docxFontFamily: string;
	docxFontSize: number;
	docxHeadingFont: string;
}

export const DEFAULT_SETTINGS: NoteExportSettings = {
	showRibbonIcon: true,

	pdfPageSize: 'A4',
	pdfOrientation: 'portrait',
	pdfMarginTop: 10,
	pdfMarginBottom: 10,
	pdfMarginLeft: 10,
	pdfMarginRight: 10,
	pdfHeaderTemplate: '',
	pdfFooterTemplate: '<div style="font-size:8px;text-align:center;width:100%;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
	pdfPrintBackground: false,

	docxPageSize: 'A4',
	docxOrientation: 'portrait',
	docxMarginTop: 25,
	docxMarginBottom: 25,
	docxMarginLeft: 25,
	docxMarginRight: 25,
	docxFontFamily: 'Calibri',
	docxFontSize: 11,
	docxHeadingFont: 'Calibri',
};

/** Page dimensions in mm (width × height in portrait) */
export const PAGE_SIZES: Record<string, { width: number; height: number }> = {
	A4: { width: 210, height: 297 },
	A3: { width: 297, height: 420 },
	Letter: { width: 216, height: 279 },
	Legal: { width: 216, height: 356 },
	Tabloid: { width: 279, height: 432 },
};

export class NoteExportSettingTab extends PluginSettingTab {
	plugin: NoteExportPluginLike;

	constructor(app: App, plugin: NoteExportPluginLike) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ── General ──
		containerEl.createEl('h2', { text: 'General' });

		new Setting(containerEl)
			.setName('Show ribbon icon')
			.setDesc('Show an export button in the left sidebar.')
			.addToggle(t =>
				t.setValue(this.plugin.settings.showRibbonIcon).onChange(async v => {
					this.plugin.settings.showRibbonIcon = v;
					await this.plugin.saveSettings();
					this.plugin.toggleRibbonIcon();
				})
			);

		// ── PDF Settings ──
		containerEl.createEl('h2', { text: 'PDF Export' });

		new Setting(containerEl)
			.setName('Page size')
			.addDropdown(d =>
				d
					.addOptions(Object.fromEntries(Object.keys(PAGE_SIZES).map(k => [k, k])))
					.setValue(this.plugin.settings.pdfPageSize)
					.onChange(async v => {
						this.plugin.settings.pdfPageSize = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Orientation')
			.addDropdown(d =>
				d
					.addOptions({ portrait: 'Portrait', landscape: 'Landscape' })
					.setValue(this.plugin.settings.pdfOrientation)
					.onChange(async v => {
						this.plugin.settings.pdfOrientation = v as 'portrait' | 'landscape';
						await this.plugin.saveSettings();
					})
			);

		this.addMarginSettings(containerEl, 'pdf');

		new Setting(containerEl)
			.setName('Print background')
			.setDesc('Include background colors and images.')
			.addToggle(t =>
				t.setValue(this.plugin.settings.pdfPrintBackground).onChange(async v => {
					this.plugin.settings.pdfPrintBackground = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Header template')
			.setDesc('HTML template for page header. Use <span class="pageNumber"></span> and <span class="totalPages"></span>.')
			.addTextArea(t =>
				t
					.setValue(this.plugin.settings.pdfHeaderTemplate)
					.onChange(async v => {
						this.plugin.settings.pdfHeaderTemplate = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Footer template')
			.setDesc('HTML template for page footer.')
			.addTextArea(t =>
				t
					.setValue(this.plugin.settings.pdfFooterTemplate)
					.onChange(async v => {
						this.plugin.settings.pdfFooterTemplate = v;
						await this.plugin.saveSettings();
					})
			);

		// ── DOCX Settings ──
		containerEl.createEl('h2', { text: 'Word Export' });

		new Setting(containerEl)
			.setName('Page size')
			.addDropdown(d =>
				d
					.addOptions(Object.fromEntries(Object.keys(PAGE_SIZES).map(k => [k, k])))
					.setValue(this.plugin.settings.docxPageSize)
					.onChange(async v => {
						this.plugin.settings.docxPageSize = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Orientation')
			.addDropdown(d =>
				d
					.addOptions({ portrait: 'Portrait', landscape: 'Landscape' })
					.setValue(this.plugin.settings.docxOrientation)
					.onChange(async v => {
						this.plugin.settings.docxOrientation = v as 'portrait' | 'landscape';
						await this.plugin.saveSettings();
					})
			);

		this.addMarginSettings(containerEl, 'docx');

		new Setting(containerEl)
			.setName('Body font')
			.addText(t =>
				t.setValue(this.plugin.settings.docxFontFamily).onChange(async v => {
					this.plugin.settings.docxFontFamily = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Body font size')
			.setDesc('In points (pt).')
			.addText(t =>
				t
					.setValue(String(this.plugin.settings.docxFontSize))
					.onChange(async v => {
						const n = parseFloat(v);
						if (!isNaN(n) && n > 0) {
							this.plugin.settings.docxFontSize = n;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName('Heading font')
			.addText(t =>
				t.setValue(this.plugin.settings.docxHeadingFont).onChange(async v => {
					this.plugin.settings.docxHeadingFont = v;
					await this.plugin.saveSettings();
				})
			);
	}

	private addMarginSettings(containerEl: HTMLElement, prefix: 'pdf' | 'docx') {
		const unit = prefix === 'pdf' ? 'mm' : 'mm';
		for (const side of ['Top', 'Bottom', 'Left', 'Right'] as const) {
			const key = `${prefix}Margin${side}` as keyof NoteExportSettings;
			new Setting(containerEl)
				.setName(`Margin ${side.toLowerCase()} (${unit})`)
				.addText(t =>
					t
						.setValue(String(this.plugin.settings[key]))
						.onChange(async v => {
							const n = parseFloat(v);
							if (!isNaN(n) && n >= 0) {
								(this.plugin.settings as any)[key] = n;
								await this.plugin.saveSettings();
							}
						})
				);
		}
	}
}
