# Icon File Type

An [Obsidian](https://obsidian.md/) plugin that shows small file-type icons next to non-Markdown files in the **File Explorer** sidebar.

Office documents, PDFs, images, audio, video, archives, code files, and eBooks each get a recognisable icon so you can distinguish them at a glance without relying on the filename extension alone.

## Features

- Zero configuration — icons appear automatically on startup
- Stays in sync: icons update when you rename, create, or delete files
- Uses real PNG icons for Office/PDF files and compact SVG badges for everything else
- Lightweight: no external dependencies, no network calls

## Supported file types

| Category      | Extensions                                       |
| ------------- | ------------------------------------------------ |
| Documents     | `.pdf`, `.doc`, `.docx`, `.odt`                  |
| Spreadsheets  | `.xls`, `.xlsx`, `.ods`                          |
| Presentations | `.ppt`, `.pptx`, `.odp`                          |
| Images        | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.bmp`, `.tiff` |
| Data          | `.csv`, `.json`, `.xml`, `.yaml`, `.yml`         |
| Archives      | `.zip`, `.rar`, `.7z`, `.tar`, `.gz`             |
| Audio         | `.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`, `.aac`  |
| Video         | `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`          |
| Web / Code    | `.html`, `.htm`, `.js`, `.ts`, `.py`, `.css`     |
| eBook         | `.epub`                                          |

## Installation

### Option A — Manual install from release (recommended)

1. Go to the [Releases](../../../releases) page and download the latest `icon-file-type` assets: `main.js`, `manifest.json`, and `styles.css`.
2. In your vault, create the folder `.obsidian/plugins/icon-file-type/`.
3. Copy the three files into that folder.
4. In Obsidian, open **Settings → Community plugins**, disable Safe mode if prompted, and toggle **Icon File Type** on.

### Option B — Build from source

See [docs/setup.md](./docs/setup.md) for full build and deployment instructions.

```bash
cd icon-file-type
npm install
npm run build
# Then copy main.js, manifest.json, styles.css to your vault's plugin folder
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
