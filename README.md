# Obsidian Extensions

A collection of [Obsidian](https://obsidian.md/) plugins developed and maintained here. Each plugin lives in its own folder and is a fully self-contained npm project.

## Plugins

| Plugin | Description |
| ------ | ----------- |
| [Icon File Type](./icon-file-type/README.md) | Shows file-type icons in the explorer sidebar for Office documents, PDFs, images, audio, video, archives, and code files |
| [Open Images](./open-images/README.md) | `Ctrl+click` an embedded image to open it in a new tab |
| [Note Export](./note-export/README.md) | Export notes to PDF or Word (.docx) with full Mermaid diagram support |

## Appearance

| Extension | Type | Description |
| --------- | ---- | ----------- |
| [Optimal](./optimal/) | Theme | Minimal Obsidian theme |

## Installation

These plugins are not yet listed in the Obsidian Community Plugins directory. Install them manually:

1. Download the latest release assets (`main.js`, `manifest.json`, and optionally `styles.css`) from the [Releases](../../releases) page.
2. Create a folder for the plugin inside your vault:
   ```
   <vault>/.obsidian/plugins/<plugin-id>/
   ```
3. Place the downloaded files in that folder.
4. In Obsidian, go to **Settings → Community plugins**, disable Safe mode if needed, and enable the plugin.

## Building from source

Each plugin folder contains its own `package.json`. From inside a plugin folder:

```bash
npm install        # install dependencies
npm run build      # production build → outputs main.js, manifest.json, styles.css
npm run dev        # watch mode (rebuilds on save)
```

See each plugin's `README.md` for plugin-specific details.

## Contributing

Contributions, bug reports, and feature requests are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## License

Each plugin in this repository is released under the [MIT License](./LICENSE).
