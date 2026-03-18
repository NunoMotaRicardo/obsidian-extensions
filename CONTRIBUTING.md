# Contributing

Thank you for your interest in contributing! Here's how to get involved.

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) when opening an issue. Please include:

- Which plugin is affected
- Obsidian version and operating system
- Steps to reproduce the problem
- What you expected vs. what happened

## Requesting features

Open an issue with the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md). Describe the use case clearly — what problem does this solve?

## Submitting a pull request

1. Fork the repository and create a branch off `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes inside the relevant plugin folder.
3. Build the plugin and verify it works in Obsidian:
   ```bash
   cd <plugin-folder>
   npm install
   npm run build
   ```
4. Commit `main.js`, `manifest.json`, and `styles.css` (if changed) alongside your source changes so users can install without building.
5. Open a pull request against `main` and fill in the PR template.

## Development setup

Each plugin is an independent npm project. From inside a plugin folder:

```bash
npm install     # install dependencies
npm run dev     # watch mode
npm run build   # production build
```

Requires Node.js v18 or later.

## Code style

- TypeScript with strict mode
- Keep each plugin's logic self-contained in its own folder
- Prefer Obsidian API patterns (`registerEvent`, `addCommand`, etc.) over raw DOM manipulation where possible
- No bundling the `obsidian` package — it is provided at runtime

## Releases

Maintainers tag releases as `<plugin-id>-v<version>` (e.g. `icon-file-type-v1.1.0`) and attach the built artifacts as release assets so users can install without a build step.
