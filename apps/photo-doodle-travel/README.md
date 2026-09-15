# Photo Doodle · Travel Object

A single-user playground: drop one travel photo and get a 3:4 editorial poster —
the faithful photo (light film grade, slight grain) on top, and a paper-doodle
study of ONE memorable object below: matte color blocks sampled from the image,
torn photo-texture slices of the object, sparse marker doodles, a
handwritten-feel title, an "OBJECT NOTE 01" label and a short observation
derived from what the pixels actually show. Everything runs in the browser — no
API keys, no backend.

Recipe source: [PHOTO DOODLE TRAVEL OBJECT｜照片涂鸦旅行物件](https://x.com/Hamburgerai/status/2094798229204549718).
The four reference posters are bundled in `public/examples/` and shown in the
empty state.

## Run

```sh
cd apps/photo-doodle-travel
bun install
bun run dev
```

Vite serves the app on **http://localhost:5173** (it picks the next free port
if 5173 is taken — check the terminal output).

## Use

1. Drag-drop a travel photo onto the page (or click to pick a file).
2. The poster renders immediately; "Reshuffle doodles" re-rolls the layout.
3. "Download PNG" saves the 1536×2048 poster.

## Stack

Bun · Vite · React · TypeScript · Tailwind CSS v4 · shadcn/ui · Canvas 2D ·
Fontsource (Patrick Hand / Archivo / Caveat). See `PLAN.md` for scope and
deferred items.
