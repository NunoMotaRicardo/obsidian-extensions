import { Notice, Plugin, TFile } from 'obsidian';
import { NoteExportSettings, DEFAULT_SETTINGS, NoteExportSettingTab } from './src/settings';
import { exportToPdf } from './src/pdf-exporter';
import { exportToDocx } from './src/docx-exporter';
import { ExportFormatModal } from './src/export-modal';

export default class NoteExportPlugin extends Plugin {
	settings: NoteExportSettings = DEFAULT_SETTINGS;
	private ribbonIconEl: HTMLElement | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new NoteExportSettingTab(this.app, this));

		// ── Commands ──
		this.addCommand({
			id: 'export-pdf',
			name: 'Export to PDF',
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== 'md') return false;
				if (!checking) this.doExportPdf(file);
				return true;
			},
		});

		this.addCommand({
			id: 'export-docx',
			name: 'Export to Word (.docx)',
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== 'md') return false;
				if (!checking) this.doExportDocx(file);
				return true;
			},
		});

		// ── File menu (right-click in explorer + editor more-options menu) ──
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (!(file instanceof TFile) || file.extension !== 'md') return;

				menu.addItem(item => {
					item.setTitle('Export to PDF')
						.setIcon('file-down')
						.onClick(() => this.doExportPdf(file));
				});

				menu.addItem(item => {
					item.setTitle('Export to Word (.docx)')
						.setIcon('file-text')
						.onClick(() => this.doExportDocx(file));
				});
			})
		);

		// ── Ribbon icon ──
		this.toggleRibbonIcon();
	}

	onunload() {
		// Ribbon icon is automatically cleaned up by Obsidian
	}

	// ── Settings persistence ──

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// ── Ribbon icon toggle ──

	toggleRibbonIcon() {
		if (this.settings.showRibbonIcon && !this.ribbonIconEl) {
			this.ribbonIconEl = this.addRibbonIcon('download', 'Export note', async () => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== 'md') {
					new Notice('No active markdown note to export.');
					return;
				}

				const modal = new ExportFormatModal(this.app);
				const format = await modal.pick();
				if (format === 'pdf') {
					await this.doExportPdf(file);
				} else if (format === 'docx') {
					await this.doExportDocx(file);
				}
			});
		} else if (!this.settings.showRibbonIcon && this.ribbonIconEl) {
			this.ribbonIconEl.remove();
			this.ribbonIconEl = null;
		}
	}

	// ── Export actions ──

	private async doExportPdf(file: TFile) {
		try {
			await exportToPdf(this.app, file, this.settings);
		} catch (e) {
			console.error('Note Export: PDF export failed', e);
			new Notice(`PDF export failed: ${(e as Error).message}`);
		}
	}

	private async doExportDocx(file: TFile) {
		try {
			await exportToDocx(this.app, file, this.settings);
		} catch (e) {
			console.error('Note Export: DOCX export failed', e);
			new Notice(`Word export failed: ${(e as Error).message}`);
		}
	}
}
