# SubVysion Home v2 — Svelte updates

Drop these files into your `website/subvysion-home2/` project:

```
src/App.svelte          → replaces current scaffold
src/app.css             → replaces current app.css (adds theme vars + all design CSS)
public/Logo_full_black.svg    → brand mark for light theme
public/Logo_full_white.svg    → brand mark for dark theme
public/media/TopDownPio41st.mp4 → COPY MANUALLY from website/media/ (too large to transfer here)
```

## One manual step

Everything else is in this bundle. Just copy the files from here into `website/subvysion-home2/` preserving folders.

## What changed

- **Radar hero:** four horizontal sweep lines descending top-to-bottom, six pulsing blips, and a subtle grid in the lead-in. Masked off before it hits the content so the typography stays crisp.
- **Scroll-driven gradient backdrop:** fixed layer behind content that shifts subtle oklch hues across six stops as you scroll. Picks a different palette for light vs. dark.
- **Theme toggle:** light/dark pair in the nav, persisted to `localStorage`. Default is light.
- **Sections:** Hero · Workflow (3 steps) · Teams (video + crew chips) · Platform (9-cell integration grid) · Pricing (Team / Enterprise) · Contact (info + form that opens a pre-filled `mailto:`).
- **Smooth scroll** on every in-page anchor, with the active nav link tracked by IntersectionObserver-style math during scroll.
- **Fonts:** Geist + Geist Mono from Google Fonts, loaded via `<svelte:head>`.

## After dropping files

```bash
cd website/subvysion-home2
npm run dev
```
