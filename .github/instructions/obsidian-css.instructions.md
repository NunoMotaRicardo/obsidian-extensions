---
applyTo: "**/*.css"
---
# Obsidian CSS Conventions

## Always Use CSS Variables

Never use hard-coded color values. Always use or override Obsidian's CSS custom properties:

```css
/* CORRECT */
color: var(--text-normal);
background: var(--background-primary);

/* WRONG */
color: #333333;
background: white;
```

Reference: https://docs.obsidian.md/Reference/CSS+variables/CSS+variables

## Support Both Themes

Always include rules for both dark and light modes:

```css
.theme-dark {
  --my-custom-var: #1a1a2e;
}

.theme-light {
  --my-custom-var: #f5f5f5;
}
```

## Avoid `!important`

Only use `!important` when Obsidian's specificity cannot be overridden otherwise. Add a comment explaining why.

## Snippet Files

- Live in their own top-level repo folder
- Users install by copying the `.css` file into `<vault>/.obsidian/snippets/` and enabling it in Settings → Appearance → CSS Snippets
- One concern per file (e.g., `heading-sizes.css`, `sidebar-width.css`)

## Theme Files

- Live in their own top-level repo folder
- Users install by copying the folder into `<vault>/.obsidian/themes/<ThemeName>/`
- Must cover all visual states (normal, hover, active, focus)
- Must define variables under both `.theme-dark` and `.theme-light`
- Pair with a `manifest.json` in the same folder

## Key Variable Groups

| Group | Variables |
|-------|-----------|
| Backgrounds | `--background-primary`, `--background-secondary`, `--background-modifier-border` |
| Text | `--text-normal`, `--text-muted`, `--text-faint`, `--text-accent` |
| Interactive | `--interactive-normal`, `--interactive-hover`, `--interactive-accent` |
| Typography | `--font-text`, `--font-monospace`, `--font-text-size` |
| Layout | `--file-line-width`, `--sidebar-width` |
