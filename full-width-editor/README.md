# Full Width Editor

A CSS snippet for [Obsidian](https://obsidian.md) that removes the default line-width constraint so the editor and reading view expand to fill all available horizontal space.

## Installation

1. Copy `full-width-editor.css` to `<your-vault>/.obsidian/snippets/`
2. Open Obsidian → **Settings → Appearance → CSS Snippets**
3. Enable **full-width-editor**

## What it does

Forces notes to use the full available width in both editing (Source / Live Preview) and Reading view, overriding Obsidian's "Readable line length" setting. It works by:

- Setting `--file-line-width` to a very large pixel value (Obsidian expects pixels, not percentages)
- Overriding `max-width` and `width` on `.cm-sizer`, `.cm-contentContainer`, `.markdown-preview-sizer`, and other key containers with `!important` to beat Obsidian's internal specificity
- Also expanding the inline title and Properties (metadata) section to full width

> **Note:** You do *not* need to disable "Readable line length" in Settings → Editor — this snippet overrides it automatically.

## Uninstall

Disable or delete the snippet from **Settings → Appearance → CSS Snippets**.
