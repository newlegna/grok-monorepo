# Climb Route Sketch

Turn a photo of a climbing gym wall into a clean abstract drawing of a single
route: pick the route's color and the app extracts just those hold shapes and
draws their silhouettes, in place, on a blank canvas — plus a sparse set of
muted strokes tracing the wall's own structure (panel seams, volume edges,
plane breaks) so the sketch reads as *that* wall. Everything runs client-side
in the browser (canvas + ImageData) — no API keys, no uploads.

## Run

```sh
bun install
bun run dev
```

Then open the printed URL (default http://localhost:5173).

## Use

1. **Load a photo** — tap *Load sample* to use the bundled gym wall photo, or
   *Upload* to use your own.
2. **Pick the route color** — tap any hold of the route in the photo
   (an eyedropper samples a small patch around your tap). For the sample
   photo, tap one of the bright cyan-blue holds in the center-left.
3. **Tune if needed** — *Hue tolerance* widens/narrows which colors count as
   the route (keep it tight to separate cyan from royal blue), *Shade
   tolerance* forgives chalk and shadows, *Minimum hold size* drops specks.
   *Show wall lines* toggles the structural outline; *Wall line detail*
   controls how many lines are kept.
4. **Download PNG** — save the abstract sketch.

## How it works

Holds:

- The photo is downscaled and read as `ImageData`.
- Each pixel is compared to the picked color in HSV space (circular hue
  distance plus saturation/value bounds).
- The binary mask is cleaned with a morphological closing, split into
  connected components, and small blobs are discarded.
- Each hold's outer contour is traced (Moore-neighbor tracing), simplified
  (Ramer–Douglas–Peucker), and drawn as a smooth filled shape on a paper-toned
  canvas.

Wall lines (two complementary passes, drawn beneath the holds):

- Coarse: the image is 8× block-averaged (killing wood grain and bolt holes),
  colorful hold cells are masked, near-uniform brightness regions are grown,
  and boundaries between large regions — differently lit plywood planes, dark
  volumes, the floor — are traced into simplified polylines.
- Fine: Sobel edges on the lightly blurred luma (holds/mats masked, per-tile
  thresholds so faint seams survive) feed a Hough transform; supported runs
  along peak lines become straight segments for crisp seams and volume edges.
- Fine segments that just retrace a coarse boundary are dropped.

`scripts/preview-wall-lines.ts` is a dev harness to tune the detector against
the sample photo without a browser (see comments in the file).

## Stack

Bun · Vite · React · TypeScript · Tailwind CSS v4.
