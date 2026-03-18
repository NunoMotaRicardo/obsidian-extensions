# Project Guidelines

## Overview

This is a **GitHub repository for developing Obsidian plugins and appearance customizations** (themes, CSS snippets). Each extension lives in its own top-level folder.

**Obsidian documentation**: https://docs.obsidian.md/Home

## Repository Structure

```
.github/
  copilot-instructions.md   # Repo-wide Copilot rules
  agents/                   # Custom Copilot agents
  instructions/             # Scoped instruction files
<plugin-name>/              # One folder per plugin/extension
  package.json
  tsconfig.json
  esbuild.config.mjs
  manifest.json
  main.ts
  styles.css                # Optional
  node_modules/             # Per-plugin dependencies (not committed)
```

Each plugin folder is a fully self-contained npm project. There is no shared root `package.json`.

## Obsidian Plugin Development

- Plugins use the [Obsidian API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin) — TypeScript, compiled to a single `main.js`
- Every plugin requires: `manifest.json`, `main.js`, and optionally `styles.css`
- Use `esbuild` for bundling (standard Obsidian plugin toolchain)
- Target ES2018+, use `import` for Obsidian API (`import { Plugin, Notice } from 'obsidian'`)
- Never bundle the `obsidian` module — it's provided at runtime
- Plugin entry point extends `Plugin` class with `onload()` / `onunload()`
- Use `this.addCommand()`, `this.registerEvent()`, `this.addSettingTab()` for features
- Store settings via `this.loadData()` / `this.saveData()`
- Test plugins by reloading Obsidian (`Ctrl+P` → "Reload app without saving") or using the Hot Reload plugin

### manifest.json Schema

```json
{
  "id": "plugin-id",
  "name": "Plugin Name",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "description": "What it does",
  "author": "Author",
  "isDesktopOnly": false
}
```

## Obsidian Appearance Customization

- **Themes**: A folder with `theme.css` and `manifest.json`, deployed to `.obsidian/themes/<ThemeName>/` in a vault
- **Snippets**: A single CSS file, deployed to `.obsidian/snippets/` in a vault
- Use Obsidian CSS variables (`--text-normal`, `--background-primary`, etc.) for compatibility
- Target `.theme-dark` and `.theme-light` body classes for theme variants
- Prefer CSS custom properties over hard-coded colors
- Reference the [Obsidian CSS variables list](https://docs.obsidian.md/Reference/CSS+variables/CSS+variables)

## Conventions

- Each extension has its own folder at the repo root with its own `package.json`
- `node_modules/` is never committed — each developer runs `npm install` per plugin folder
- Do not create a shared root `package.json` unless explicitly requested
- New plugins follow the same scaffold: `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `manifest.json`, `main.ts`

## Build

```bash
# From inside the plugin folder
npm install
npm run dev          # esbuild watch mode
npm run build        # production build → outputs main.js, manifest.json, styles.css
```

## Community Repository

This is a **public community repo**. All code, docs, and artifacts should be user-ready at all times.

### Published artifacts
- **Commit `main.js`, `manifest.json`, and `styles.css`** (when present) alongside source changes. Users install from these files — they should not need to build from source.
- **Commit `package-lock.json`** per plugin so CI (`npm ci`) and contributor builds are reproducible.

### Versioning & releases
- Bump `manifest.json` `version` with every user-facing change following [semver](https://semver.org/).
- Tag releases as `<plugin-id>-v<version>` (e.g. `icon-file-type-v1.1.0`) and attach the three build artifacts as release assets.
- Maintain a `CHANGELOG.md` in each plugin folder. Add an entry for every release: new features, bug fixes, and breaking changes.

### Documentation
- Every plugin must have a `README.md` with: description, feature list, installation steps (release + build-from-source), usage, and development instructions.
- Keep the root `README.md` plugin table up to date when adding or renaming plugins.
- Screenshots or demo GIFs in each plugin README strongly improve discoverability and adoption.

### Contribution standards
- `CONTRIBUTING.md`, `LICENSE`, issue templates, and the PR template are present at the repo root — reference them when suggesting workflow changes.
- PR descriptions should fill in the PR template checklist.
- Commit messages should be clear and scoped (e.g. `fix(icon-file-type): handle missing file extension`).

### Obsidian Community Plugins submission
- Once a plugin is stable, it can be submitted to the [Obsidian Community Plugins directory](https://github.com/obsidianmd/obsidian-releases) via a PR to that repo.
- Prerequisites: public GitHub repo, at least one tagged GitHub Release with artifacts, manifest `id` matches the folder name.
