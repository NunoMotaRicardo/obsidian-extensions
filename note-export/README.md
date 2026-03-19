# Note Export

An [Obsidian](https://obsidian.md/) plugin that exports notes to **PDF** or **Word (.docx)**, with robust support for Mermaid diagrams, tables, code blocks, images, and rich inline formatting.

> **Desktop only** — requires Obsidian's Electron runtime for PDF generation.

## Features

- Export the active note to PDF or Word (.docx) in one click
- **Mermaid diagrams rendered correctly** — re-renders each diagram at its natural full size, converts to PNG, and scales it to fit the page (no clipping, no squishing)
- Full inline formatting: bold, italic, strikethrough, underline, highlight, superscript, subscript, inline code
- Nested bullet and numbered lists (up to 3 levels)
- Tables with header row shading
- Code blocks with monospace font and background shading
- Blockquotes with left border
- Hyperlinks (external)
- Horizontal rules
- Configurable page size, orientation, and margins for both PDF and DOCX
- Configurable body font, font size, and heading font for DOCX
- Optional page header/footer templates for PDF (with page number support)
- Ribbon icon with format chooser modal (toggleable)
- Export actions available in the command palette and the file right-click menu

## Usage

### Via ribbon icon
Click the **download** icon in the left sidebar. A modal appears asking you to choose:
- **PDF** — generates a PDF using Electron's `printToPDF`
- **Word (.docx)** — generates a `.docx` file using the `docx` library

A save dialog opens after processing, letting you choose where to save the file.

### Via command palette
Open the command palette (`Ctrl/Cmd+P`) and search for:
- **Note Export: Export to PDF**
- **Note Export: Export to Word (.docx)**

### Via file right-click menu
Right-click any `.md` file in the file explorer (or use the editor's more-options menu). Both export options appear at the bottom of the context menu.

## Settings

Open **Settings → Note Export** to configure:

| Setting | Description |
|---------|-------------|
| Show ribbon icon | Toggle the sidebar export button on/off |
| **PDF — Page size** | A4 (default), A3, Letter, Legal, Tabloid |
| **PDF — Orientation** | Portrait / Landscape |
| **PDF — Margins** | Top, bottom, left, right in mm |
| **PDF — Print background** | Include background colors/images |
| **PDF — Header template** | HTML for page header. Use `<span class="pageNumber">` and `<span class="totalPages">` |
| **PDF — Footer template** | HTML for page footer (page numbers shown by default) |
| **Word — Page size** | A4 (default), A3, Letter, Legal, Tabloid |
| **Word — Orientation** | Portrait / Landscape |
| **Word — Margins** | Top, bottom, left, right in mm |
| **Word — Body font** | Font name for body text (default: Calibri) |
| **Word — Body font size** | In points (default: 11 pt) |
| **Word — Heading font** | Font name for headings (default: Calibri) |

## Mermaid Diagram Support

Most export plugins fail or clip large Mermaid diagrams because they capture the diagram as rendered in the editor pane, which is width-constrained.

This plugin takes a different approach:

1. Each Mermaid code block is **re-rendered independently** using the `mermaid` library in a hidden, unconstrained container — allowing the diagram to render at its natural full width.
2. The resulting SVG is converted to a **PNG at 2× resolution** for crisp output.
3. The PNG is then **scaled to fit the page content area** (width-first, then height if needed), preserving the aspect ratio.

This means even wide flowcharts, gantt charts, and complex sequence diagrams will fit cleanly on the page.

## Installation

### Option A — Manual install from release (recommended)

1. Go to the [Releases](../../../releases) page and download the latest `note-export` assets: `main.js`, `manifest.json`, and `styles.css`.
2. In your vault, create the folder `.obsidian/plugins/note-export/`.
3. Copy the three files into that folder.
4. In Obsidian, open **Settings → Community plugins**, disable Safe mode if prompted, and enable **Note Export**.

### Option B — Build from source

```bash
cd note-export
npm install
npm run build
# Copy main.js, manifest.json, styles.css to <vault>/.obsidian/plugins/note-export/
```

## Development

```bash
npm run dev   # watch mode — rebuilds on every save
```

To avoid restarting Obsidian on each rebuild, install the [Hot Reload](https://github.com/pjeby/hot-reload) community plugin and create an empty `.hotreload` file in the plugin output folder.

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](../CONTRIBUTING.md).

## License

MIT — see [LICENSE](../LICENSE).
