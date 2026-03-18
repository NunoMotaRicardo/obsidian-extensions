---
applyTo: "**/esbuild.config.mjs"
---
# Obsidian Plugin Build Conventions

## Output Directory

Always output to the **plugin folder itself** (`.`). This puts `main.js` next to `main.ts` so it can be committed alongside source and installed directly from the repo.

```js
const outDir = '.';
```

## Required Copies

After building, always copy `manifest.json` (and `styles.css` when present) alongside `main.js`:

```js
copyFileSync('manifest.json', `${outDir}/manifest.json`);
// copyFileSync('styles.css', `${outDir}/styles.css`);  // only if styles.css exists
```

## External Modules

Always mark runtime-provided modules as external so they are never bundled:

```js
external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*']
```
