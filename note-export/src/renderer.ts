import { App, Component, MarkdownRenderer, TFile } from 'obsidian';

/**
 * Render a note's markdown to a fully-processed HTML container.
 * Obsidian's MarkdownRenderer handles Mermaid, MathJax, embeds, etc.
 */
export async function renderNoteToHTML(
	app: App,
	file: TFile
): Promise<HTMLElement> {
	const markdown = await app.vault.read(file);
	const container = document.createElement('div');
	container.classList.add('note-export-render');

	const component = new Component();
	component.load();

	await MarkdownRenderer.render(app, markdown, container, file.path, component);

	// Wait for async post-processors (Mermaid, MathJax, etc.)
	await sleep(800);

	component.unload();
	return container;
}

/**
 * Collect all CSS custom properties and Obsidian theme styles
 * needed to render the exported HTML correctly.
 */
export function collectObsidianCSS(): string {
	const sheets: string[] = [];

	// Gather all stylesheets accessible from the document
	for (const sheet of document.styleSheets) {
		try {
			for (const rule of sheet.cssRules) {
				sheets.push(rule.cssText);
			}
		} catch {
			// Cross-origin sheets will throw — skip them
		}
	}

	return sheets.join('\n');
}

/**
 * Build a complete HTML document from the rendered container,
 * with Obsidian CSS inlined for correct appearance.
 */
export function buildFullHTML(container: HTMLElement, css: string): string {
	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
/* Force light theme for export */
body {
  background: white;
  color: black;
  font-family: var(--font-text, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  line-height: 1.6;
  padding: 0;
  margin: 0;
}
.note-export-render {
  max-width: 100%;
  padding: 0;
}
img {
  max-width: 100%;
  height: auto;
}
${css}
</style>
</head>
<body class="theme-light">
${container.innerHTML}
</body>
</html>`;
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
