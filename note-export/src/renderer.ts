import { App, Component, MarkdownRenderer, TFile } from 'obsidian';

const RENDER_SETTLE_MS = 1500;

export interface RenderedNote {
container: HTMLElement;
styles: string;
}

/**
 * Poll until every .mermaid element inside the container has an <svg> child,
 * meaning Obsidian's Mermaid post-processor has finished rendering.
 */
async function waitForMermaid(container: HTMLElement, timeoutMs = 8000): Promise<void> {
const start = Date.now();
return new Promise(resolve => {
const check = () => {
const pending = Array.from(
container.querySelectorAll<HTMLElement>('.mermaid')
).filter(el => !el.querySelector('svg'));

if (pending.length === 0) {
resolve();
return;
}
if (Date.now() - start > timeoutMs) {
console.warn(`[note-export] ${pending.length} Mermaid diagram(s) did not render in time.`);
resolve();
return;
}
setTimeout(check, 150);
};
setTimeout(check, 300);
});
}

/**
 * Render a note's markdown into a real (but hidden) DOM node attached to
 * document.body, so that Obsidian's post-processors — including Mermaid and
 * MathJax — fire exactly as they do in the reading view.
 *
 * The host is detached from the DOM before this function returns; the returned
 * container is a detached element whose subtree is fully populated.
 */
export async function renderNote(app: App, file: TFile): Promise<RenderedNote> {
const markdown = await app.vault.read(file);

const host = document.createElement('div');
host.style.cssText = [
'position:fixed',
'left:-99999px',
'top:0',
'width:800px',
'overflow:visible',
'background:#ffffff',
'color:#000000',
'font-size:16px',
'z-index:-9999',
'visibility:hidden',
].join(';');
document.body.appendChild(host);

const container = document.createElement('div');
container.className = 'markdown-preview-view markdown-rendered';
host.appendChild(container);

const component = new Component();
component.load();

try {
await MarkdownRenderer.render(app, markdown, container, file.path, component);
await waitForMermaid(container);
await new Promise(r => setTimeout(r, RENDER_SETTLE_MS));
const styles = collectStyles();
return { container, styles };
} finally {
component.unload();
if (document.body.contains(host)) document.body.removeChild(host);
}
}

function collectStyles(): string {
	// Return only minimal typography styles — NOT Obsidian's full stylesheet.
	// Embedding megabytes of Obsidian CSS into the print HTML causes the
	// BrowserWindow to parse it forever and did-finish-load never fires.
	return [
		'* { box-sizing: border-box; }',
		'body { margin:0; padding:0; background:#fff; color:#000; font-family:sans-serif; font-size:16px; line-height:1.6; }',
		'h1,h2,h3,h4,h5,h6 { font-weight:bold; margin:0.8em 0 0.4em; }',
		'h1 { font-size:2em; } h2 { font-size:1.6em; } h3 { font-size:1.3em; } h4 { font-size:1.1em; }',
		'p { margin:0 0 0.8em; }',
		'ul, ol { padding-left:2em; margin:0 0 0.8em; }',
		'li { margin:0.2em 0; }',
		'code { font-family:monospace; background:#f5f5f5; padding:0 0.2em; border-radius:3px; font-size:0.9em; }',
		'pre { background:#f5f5f5; padding:1em; border-radius:4px; white-space:pre-wrap; word-break:break-word; margin:0 0 0.8em; }',
		'pre code { background:none; padding:0; }',
		'blockquote { border-left:4px solid #ccc; margin:0 0 0.8em; padding:0 1em; color:#555; }',
		'table { border-collapse:collapse; width:100%; margin:0 0 0.8em; }',
		'th, td { border:1px solid #ddd; padding:0.4em 0.8em; text-align:left; }',
		'th { background:#f0f0f0; font-weight:bold; }',
		'img { max-width:100%; height:auto; }',
		'hr { border:none; border-top:1px solid #ddd; margin:1em 0; }',
		'a { color:#0070cc; text-decoration:none; }',
		'.mermaid svg { max-width:100%; height:auto; }',
		'strong, b { font-weight:bold; }',
		'em, i { font-style:italic; }',
		'del, s { text-decoration:line-through; }',
		'mark { background:#ffe58f; }',
		'.task-list-item { list-style:none; margin-left:-1.5em; }',
	].join('\n');
}
