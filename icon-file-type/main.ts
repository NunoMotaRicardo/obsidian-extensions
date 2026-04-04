import { Plugin } from 'obsidian';
import pdfIcon from './icons/pdf.png';
import wordIcon from './icons/word.png';
import excelIcon from './icons/excel.png';
import powerpointIcon from './icons/powerpoint.png';
import pngIcon from './icons/png.png';
import obsidianColorIcon from './icons/obisian-color.png';

const ICON_CLASS = 'ift-icon';
const ICON_EXT_ATTR = 'data-ift-ext';

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------
function img(src: string, alt: string): string {
  return `<img src="${src}" width="14" height="14" alt="${alt}">`;
}

function badge(color: string, label: string): string {
  // Font size scales down for longer labels
  const sizes = [10, 7.5, 6, 5, 4.5];
  const fs = sizes[Math.min(label.length - 1, sizes.length - 1)];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14">` +
    `<rect width="16" height="16" rx="3" fill="${color}"/>` +
    `<text x="8" y="11" text-anchor="middle" fill="white" ` +
    `font-size="${fs}" font-family="system-ui,sans-serif" font-weight="bold">${label}</text>` +
    `</svg>`
  );
}

const FILE_ICONS: Readonly<Record<string, string>> = {
  // ── Obsidian ──────────────────────────────────────────────────────────────
  md:     img(obsidianColorIcon, 'Markdown'),
  canvas: img(obsidianColorIcon, 'Canvas'),

  // ── Office / Documents ────────────────────────────────────────────────────
  pdf:  img(pdfIcon, 'PDF'),
  doc:  img(wordIcon, 'Word'),
  docx: img(wordIcon, 'Word'),
  xls:  img(excelIcon, 'Excel'),
  xlsx: img(excelIcon, 'Excel'),
  ppt:  img(powerpointIcon, 'PowerPoint'),
  pptx: img(powerpointIcon, 'PowerPoint'),
  odt:  img(wordIcon, 'ODT'),
  ods:  img(excelIcon, 'ODS'),
  odp:  img(powerpointIcon, 'ODP'),

  // ── Data ──────────────────────────────────────────────────────────────────
  csv:  badge('#00897B', 'CSV'),   // teal
  json: badge('#FF7043', '{}'),    // deep-orange
  xml:  badge('#FF7043', 'XML'),
  yaml: badge('#FF7043', 'YML'),
  yml:  badge('#FF7043', 'YML'),

  // ── Archives ──────────────────────────────────────────────────────────────
  zip:  badge('#F9A825', 'ZIP'),   // amber
  rar:  badge('#F9A825', 'RAR'),
  '7z': badge('#F9A825', '7Z'),
  tar:  badge('#795548', 'TAR'),   // brown
  gz:   badge('#795548', 'GZ'),

  // ── Images ────────────────────────────────────────────────────────────────
  png:  img(pngIcon, 'IMG'),
  jpg:  img(pngIcon, 'IMG'),
  jpeg: img(pngIcon, 'IMG'),
  gif:  img(pngIcon, 'GIF'),
  webp: img(pngIcon, 'IMG'),
  svg:  img(pngIcon, 'SVG'),
  bmp:  img(pngIcon, 'IMG'),
  tiff: img(pngIcon, 'TIF'),

  // ── Audio ─────────────────────────────────────────────────────────────────
  mp3:  badge('#AB47BC', '\u266A'),  // ♪ purple
  wav:  badge('#AB47BC', '\u266A'),
  ogg:  badge('#AB47BC', '\u266A'),
  flac: badge('#AB47BC', '\u266A'),
  m4a:  badge('#AB47BC', '\u266A'),
  aac:  badge('#AB47BC', '\u266A'),

  // ── Video ─────────────────────────────────────────────────────────────────
  mp4:  badge('#5C6BC0', '\u25B6'),  // ▶ indigo
  mov:  badge('#5C6BC0', '\u25B6'),
  avi:  badge('#5C6BC0', '\u25B6'),
  mkv:  badge('#5C6BC0', '\u25B6'),
  webm: badge('#5C6BC0', '\u25B6'),

  // ── Web / Code ────────────────────────────────────────────────────────────
  html: badge('#FF6F00', 'HTML'),  // amber
  htm:  badge('#FF6F00', 'HTML'),
  js:   badge('#F9A825', 'JS'),    // yellow
  ts:   badge('#1E88E5', 'TS'),    // blue
  py:   badge('#29B6F6', 'Py'),    // light-blue
  css:  badge('#7E57C2', 'CSS'),   // purple

  // ── eBook ─────────────────────────────────────────────────────────────────
  epub: badge('#8D6E63', 'EPUB'),  // brown
};

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
export default class IconFileTypePlugin extends Plugin {
  private observer: MutationObserver | null = null;
  private updateTimer: number | null = null;

  async onload() {
    this.app.workspace.onLayoutReady(() => {
      this.updateAllIcons();
      this.startObserver();
    });

    // Keep icons in sync when the vault changes
    this.registerEvent(this.app.vault.on('rename', () => this.scheduleUpdate()));
    this.registerEvent(this.app.vault.on('create', () => this.scheduleUpdate()));
    this.registerEvent(this.app.vault.on('delete', () => this.scheduleUpdate()));
  }

  onunload() {
    this.observer?.disconnect();
    if (this.updateTimer !== null) window.clearTimeout(this.updateTimer);
    document.querySelectorAll(`.${ICON_CLASS}`).forEach(el => el.remove());
  }

  // ── Observer ──────────────────────────────────────────────────────────────

  private startObserver() {
    const container = document.querySelector('.nav-files-container');
    if (!container) return;

    this.observer = new MutationObserver((mutations) => {
      // Ignore mutations caused by our own icon insertions
      const relevant = mutations.some(m =>
        [...m.addedNodes, ...m.removedNodes].some(
          n => n instanceof Element && !n.classList.contains(ICON_CLASS)
        )
      );
      if (relevant) this.scheduleUpdate();
    });

    this.observer.observe(container, { childList: true, subtree: true });
  }

  // ── Update helpers ────────────────────────────────────────────────────────

  /** Debounced update – coalesces rapid vault/DOM events into one pass. */
  private scheduleUpdate() {
    if (this.updateTimer !== null) window.clearTimeout(this.updateTimer);
    this.updateTimer = window.setTimeout(() => {
      this.updateAllIcons();
      this.updateTimer = null;
    }, 80);
  }

  private updateAllIcons() {
    document.querySelectorAll<HTMLElement>('.nav-file-title').forEach(el =>
      this.applyIcon(el)
    );
  }

  private applyIcon(el: HTMLElement) {
    const path = el.getAttribute('data-path') ?? '';
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    const svgHtml = FILE_ICONS[ext];

    const existing = el.querySelector<HTMLElement>(`.${ICON_CLASS}`);

    // Nothing to show and nothing present – fast exit
    if (!svgHtml && !existing) return;

    // Already showing the right icon – skip DOM write
    if (existing && existing.getAttribute(ICON_EXT_ATTR) === ext) return;

    // Remove stale icon (wrong ext or ext no longer mapped)
    existing?.remove();

    if (!svgHtml) return;

    const span = document.createElement('span');
    span.className = ICON_CLASS;
    span.setAttribute(ICON_EXT_ATTR, ext);
    span.innerHTML = svgHtml;
    el.prepend(span);
  }
}
