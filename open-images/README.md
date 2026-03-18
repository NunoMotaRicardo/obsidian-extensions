# Open Images

An [Obsidian](https://obsidian.md/) plugin that lets you open an embedded image in a new tab with a single `Ctrl+click` (or `Cmd+click` on macOS).

## Usage

Embed an image in a note as usual:

```
![[my-photo.png]]
```

Hold **Ctrl** (or **Cmd** on macOS) and click the rendered image — it opens in a new Obsidian tab, just like any other file.

## Installation

### Option A — Manual install from release (recommended)

1. Go to the [Releases](../../../releases) page and download the latest `open-images` assets: `main.js` and `manifest.json`.
2. In your vault, create the folder `.obsidian/plugins/open-images/`.
3. Copy the files into that folder.
4. In Obsidian, open **Settings → Community plugins**, disable Safe mode if prompted, and toggle **Open Images** on.

### Option B — Build from source

```bash
cd open-images
npm install
npm run build
# Then copy main.js and manifest.json to your vault's plugin folder
```

## Development

```bash
npm run dev   # watch mode — rebuilds on every save
```

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](../CONTRIBUTING.md).

## License

MIT — see [LICENSE](../LICENSE).
