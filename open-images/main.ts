import { Plugin, TFile } from 'obsidian';

export default class OpenImagesPlugin extends Plugin {
	onload() {
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			if (!evt.ctrlKey) return;

			const target = evt.target as HTMLElement;
			if (!(target instanceof HTMLImageElement)) return;

			// Internal embeds (![[image.png]]) are wrapped in .internal-embed
			// which carries the original link path in its `src` attribute.
			const embed = target.closest('.internal-embed');
			if (!embed) return;

			const linkSrc = embed.getAttribute('src');
			if (!linkSrc) return;

			evt.preventDefault();
			evt.stopPropagation();

			const sourcePath = this.app.workspace.getActiveFile()?.path ?? '';
			const file = this.app.metadataCache.getFirstLinkpathDest(linkSrc, sourcePath);

			if (file instanceof TFile) {
				const leaf = this.app.workspace.getLeaf('tab');
				leaf.openFile(file);
			}
		});
	}

	onunload() {}
}
