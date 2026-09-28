/**
 * Dev-only harness: run the wall-line detector on a raw RGBA dump of the
 * sample photo (produced with ffmpeg) and rasterize the result so the output
 * can be eyeballed without a browser.
 *
 *   ffmpeg -i public/sample-wall.jpg -vf scale=750:1000 -f rawvideo -pix_fmt rgba /tmp/wall.rgba
 *   bun scripts/preview-wall-lines.ts /tmp/wall.rgba 750 1000 /tmp/lines.rgba /tmp/overlay.rgba [detail]
 *   ffmpeg -f rawvideo -pix_fmt rgba -s 750x1000 -i /tmp/lines.rgba /tmp/lines.png
 */
import { detectWallLines, type Polyline } from "../src/lib/wallLines";

const [srcPath, wStr, hStr, outSketch, outOverlay, detailStr] =
  process.argv.slice(2);
const w = Number(wStr);
const h = Number(hStr);
const detail = detailStr ? Number(detailStr) : 0.5;

const raw = new Uint8ClampedArray(await Bun.file(srcPath).arrayBuffer());
const image = { data: raw, width: w, height: h };

const t0 = performance.now();
const debugDumps: Promise<number>[] = [];
const lines = detectWallLines(image, {
  detail,
  onDebugMap: (map, mw, mh) => {
    const buf = new Uint8ClampedArray(mw * mh * 4);
    for (let i = 0; i < mw * mh; i++) {
      const v = map[i] ? 0 : 255;
      buf[i * 4] = v;
      buf[i * 4 + 1] = v;
      buf[i * 4 + 2] = v;
      buf[i * 4 + 3] = 255;
    }
    debugDumps.push(Bun.write(`/tmp/debug_${mw}x${mh}.rgba`, buf));
  },
});
await Promise.all(debugDumps);
const totalLen = lines.reduce((acc, l) => {
  for (let i = 1; i < l.length; i++) {
    acc += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]);
  }
  return acc;
}, 0);
console.log(
  `${lines.length} polylines, total length ${totalLen.toFixed(0)}px, in ${(performance.now() - t0).toFixed(0)}ms`,
);

function drawPolyline(
  buf: Uint8ClampedArray,
  line: Polyline,
  r: number,
  g: number,
  b: number,
) {
  for (let p = 1; p < line.length; p++) {
    const [x1, y1] = line[p - 1];
    const [x2, y2] = line[p];
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1)) || 1;
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x1 + ((x2 - x1) * i) / steps);
      const y = Math.round(y1 + ((y2 - y1) * i) / steps);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px < 0 || px >= w || py < 0 || py >= h) continue;
          const o = (py * w + px) * 4;
          buf[o] = r;
          buf[o + 1] = g;
          buf[o + 2] = b;
          buf[o + 3] = 255;
        }
      }
    }
  }
}

// Sketch view: lines on paper.
const sketch = new Uint8ClampedArray(w * h * 4);
for (let i = 0; i < w * h; i++) {
  sketch[i * 4] = 250;
  sketch[i * 4 + 1] = 247;
  sketch[i * 4 + 2] = 241;
  sketch[i * 4 + 3] = 255;
}
for (const l of lines) drawPolyline(sketch, l, 150, 132, 110);
await Bun.write(outSketch, sketch);

// Overlay view: lines on the photo, to judge alignment.
const overlay = raw.slice();
for (const l of lines) drawPolyline(overlay, l, 255, 0, 0);
await Bun.write(outOverlay, overlay);
