# PLAN — Photo Doodle Travel Object

## Goal

A single-user playground where you drop a travel photo and get a 3:4 editorial poster: the faithful photo on top, a paper-doodle study of ONE memorable object below.

## Single-user MVP

- Drop or pick one travel photo (drag-drop + file picker, image files only).
- Client renders a 3:4 poster with a hard ~1:1 horizontal split:
  - **Top half** — the original photo, cover-cropped, with a light film-magazine grade (slight warmth, lifted blacks, subtle grain, faint vignette).
  - **Bottom half** — warm-white paper panel: matte color blocks sampled from the photo's palette, 1–3 photo-texture slices cut from a center-weighted object region (torn-paper edges, not a full reprint), 3–7 sparse marker doodles (arrows, squiggles, dashes, dots), a handwritten-feel 1–3 word English title, an "OBJECT NOTE 01" label, and a 5–12 word observation derived from what the pixels actually show (palette warmth/coolness, brightness, composition).
- Regenerate button reshuffles the doodle layout (seeded randomness).
- Download the poster as PNG (1536×2048).
- Empty state shows a gallery of the four reference posters, served as local static assets.

### Explicit outs

- No auth, no accounts, no sharing, no server, no database.
- No batch/multi-upload; one photo at a time.
- No real object detection or OCR — a center-weighted saliency crop stands in for "the object".
- No paid image APIs; no secrets. Everything runs in the browser.

## Outcome-oriented tasks

1. App scaffolds and boots: `bun install && bun run dev` serves the one-screen UI.
2. A dropped photo immediately renders a graded top half on canvas.
3. The bottom half composites palette blocks, object slices, doodles, and typography that change per photo.
4. Title/observation text is generated from measured image features (never a canned lie about content).
5. Download produces a crisp 1536×2048 PNG identical to the preview.
6. Empty state gallery displays the four bundled example posters.
7. README documents port and run steps.

## Stack

- **Bun** — repo-mandated runtime/package manager; fast installs.
- **Vite + React + TypeScript** (`bunx create-vite`) — official scaffold, ideal for a one-screen client-only utility.
- **Tailwind CSS v4 + shadcn/ui** — repo-preferred UI kit; minimalist preset, components added on demand (button, card).
- **HTML Canvas 2D** — the entire poster pipeline (palette sampling, grading, grain, doodles, type) with zero API keys and exact-pixel PNG export.
- **Google Fonts (Caveat + Archivo)** — handwritten title + editorial labels; loaded via fontsource packages so no runtime CDN dependency.

## Deferred

- Real object segmentation (e.g. on-device model) instead of center-weighted crop.
- Optional hosted image-model backend behind an env flag.
- Multiple layout templates / user-editable title text.
- Print-resolution export and paper-texture assets.
- Cloudflare Pages deploy path for this app.
