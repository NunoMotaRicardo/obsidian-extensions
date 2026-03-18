# Icon File Type – Setup & Deployment

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- An [Obsidian](https://obsidian.md/) vault

---

## 1. Install dependencies

Open a terminal inside the `icon-file-type` folder and run:

```bash
npm install
```

---

## 2. Build the plugin

### Development (watch mode)

Builds continuously and outputs directly to `../.obsidian/plugins/icon-file-type/`
(the vault one level above this repo root):

```bash
npm run dev
```

### Production build

```bash
npm run build
```

Both commands produce three files in the output directory:
- `main.js`
- `manifest.json`
- `styles.css`

---

## 3. Deploy to a vault manually

If your vault is not located one level above this repository, copy the output
files to the correct plugin folder:

```bash
# Windows (PowerShell)
$vault = "C:\path\to\your\vault"
$dest  = "$vault\.obsidian\plugins\icon-file-type"
New-Item -ItemType Directory -Force -Path $dest
Copy-Item main.js, manifest.json, styles.css -Destination $dest
```

```bash
# macOS / Linux
VAULT="/path/to/your/vault"
DEST="$VAULT/.obsidian/plugins/icon-file-type"
mkdir -p "$DEST"
cp main.js manifest.json styles.css "$DEST"
```

---

## 4. Enable the plugin in Obsidian

1. Open Obsidian and go to **Settings → Community plugins**.
2. Disable **Safe mode** if prompted.
3. Find **Icon File Type** in the installed plugins list and toggle it **on**.

---

## 5. Reload after changes

After rebuilding, reload the plugin without restarting Obsidian:

- Open the command palette (`Ctrl+P` / `Cmd+P`)
- Run **Reload app without saving**

Or, for a faster workflow during development, install the
[Hot Reload](https://github.com/pjeby/hot-reload) community plugin — it
automatically reloads any plugin whose folder contains a `.hotreload` file
whenever `main.js` changes.

To enable hot reload for this plugin:

```bash
# From the plugin output folder
New-Item -ItemType File -Path .hotreload   # PowerShell
# or
touch .hotreload                            # macOS / Linux
```

---

## Supported file types

The plugin shows icons for the following extensions in the file explorer sidebar:

| Category   | Extensions                                      |
| ---------- | ----------------------------------------------- |
| Documents  | pdf, doc, docx, odt                             |
| Spreadsheets | xls, xlsx, ods                                |
| Presentations | ppt, pptx, odp                               |
| Images     | png, jpg, jpeg, gif, webp, svg, bmp, tiff       |
| Data       | csv, json, xml, yaml, yml                       |
| Archives   | zip, rar, 7z, tar, gz                           |
| Audio      | mp3, wav, ogg, flac, m4a, aac                   |
| Video      | mp4, mov, avi, mkv, webm                        |
| Web / Code | html, htm, js, ts, py, css                      |
| eBook      | epub                                            |
