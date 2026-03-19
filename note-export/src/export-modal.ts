import { App, Modal } from 'obsidian';

export type ExportFormat = 'pdf' | 'docx';

export class ExportFormatModal extends Modal {
	private resolve: ((format: ExportFormat | null) => void) | null = null;

	constructor(app: App) {
		super(app);
	}

	/** Open the modal and return a promise that resolves with the chosen format (or null if cancelled). */
	pick(): Promise<ExportFormat | null> {
		return new Promise(resolve => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('note-export-modal');

		contentEl.createEl('h3', { text: 'Export note' });

		const btnContainer = contentEl.createDiv({ cls: 'note-export-modal-buttons' });

		const pdfBtn = btnContainer.createEl('button', { text: 'PDF', cls: 'note-export-btn note-export-btn-pdf' });
		pdfBtn.addEventListener('click', () => {
			this.resolve?.('pdf');
			this.resolve = null;
			this.close();
		});

		const docxBtn = btnContainer.createEl('button', { text: 'Word (.docx)', cls: 'note-export-btn note-export-btn-docx' });
		docxBtn.addEventListener('click', () => {
			this.resolve?.('docx');
			this.resolve = null;
			this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
		// If the modal was closed without picking (Escape key / backdrop click)
		if (this.resolve) {
			this.resolve(null);
			this.resolve = null;
		}
	}
}
