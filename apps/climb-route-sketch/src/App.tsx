import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  extractHolds,
  hsvToRgb,
  pathSmoothClosed,
  rgbToHsv,
  type RGB,
} from "./lib/extract";
import { detectWallLines, type Polyline } from "./lib/wallLines";

const MAX_DIM = 1000;
const SAMPLE_URL = `${import.meta.env.BASE_URL}sample-wall.jpg`;

function rgbCss({ r, g, b }: RGB): string {
  return `rgb(${r} ${g} ${b})`;
}

/** Flat poster color derived from the picked pixel (chalk desaturates holds). */
function posterColor(target: RGB): RGB {
  const { h, s, v } = rgbToHsv(target.r, target.g, target.b);
  return hsvToRgb(h, Math.max(s, 0.55), Math.min(Math.max(v, 0.55), 0.92));
}

/** Open polyline as a smooth path (midpoint quadratic curves). */
function pathSmoothOpen(ctx: CanvasRenderingContext2D, pts: Polyline): void {
  if (pts.length < 2) return;
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
}

export default function App() {
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [target, setTarget] = useState<RGB | null>(null);
  const [pickedAt, setPickedAt] = useState<[number, number] | null>(null);
  const [hueTolerance, setHueTolerance] = useState(14);
  const [shadeTolerance, setShadeTolerance] = useState(0.55);
  const [minSize, setMinSize] = useState(1.2); // slider units, scaled below
  const [showWallLines, setShowWallLines] = useState(true);
  const [lineDetail, setLineDetail] = useState(0.5);
  const [loading, setLoading] = useState(false);

  const loadImage = useCallback((src: string, revoke = false) => {
    setLoading(true);
    const img = new Image();
    img.onload = () => {
      if (revoke) URL.revokeObjectURL(src);
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = photoCanvasRef.current!;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);
      setImageData(ctx.getImageData(0, 0, w, h));
      setTarget(null);
      setPickedAt(null);
      setLoading(false);
    };
    img.onerror = () => setLoading(false);
    img.src = src;
  }, []);

  const onFile = (file: File | undefined) => {
    if (file) loadImage(URL.createObjectURL(file), true);
  };

  const onPick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = photoCanvasRef.current;
    if (!canvas || !imageData) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.round(
      ((e.clientY - rect.top) / rect.height) * canvas.height,
    );
    // Average a 5x5 patch so a single noisy pixel doesn't skew the pick.
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || px >= imageData.width || py < 0 || py >= imageData.height)
          continue;
        const i = (py * imageData.width + px) * 4;
        r += imageData.data[i];
        g += imageData.data[i + 1];
        b += imageData.data[i + 2];
        n++;
      }
    }
    setTarget({
      r: Math.round(r / n),
      g: Math.round(g / n),
      b: Math.round(b / n),
    });
    setPickedAt([x, y]);
  };

  // Redraw the photo with the pick marker.
  useEffect(() => {
    const canvas = photoCanvasRef.current;
    if (!canvas || !imageData) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.putImageData(imageData, 0, 0);
    if (pickedAt) {
      const [x, y] = pickedAt;
      const rad = Math.max(8, canvas.width * 0.012);
      ctx.lineWidth = Math.max(2.5, rad * 0.28);
      ctx.strokeStyle = "white";
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.beginPath();
      ctx.arc(x, y, rad + ctx.lineWidth, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [imageData, pickedAt]);

  const shapes = useMemo(() => {
    if (!imageData || !target) return null;
    return extractHolds(imageData, {
      target,
      hueTolerance,
      shadeTolerance,
      minAreaFraction: (minSize / 10000) * 0.6,
    });
  }, [imageData, target, hueTolerance, shadeTolerance, minSize]);
  const holdCount = shapes ? shapes.length : null;

  const wallLines = useMemo(() => {
    if (!imageData || !showWallLines) return null;
    return detectWallLines(imageData, { detail: lineDetail });
  }, [imageData, showWallLines, lineDetail]);

  // Paint the abstract sketch.
  useEffect(() => {
    const canvas = resultCanvasRef.current;
    if (!canvas || !imageData) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#faf7f1";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (wallLines) {
      ctx.strokeStyle = "rgba(148, 131, 109, 0.6)";
      ctx.lineWidth = Math.max(2, canvas.width * 0.003);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const line of wallLines) {
        ctx.beginPath();
        pathSmoothOpen(ctx, line);
        ctx.stroke();
      }
    }

    if (!shapes || !target) return;

    const fill = rgbCss(posterColor(target));
    ctx.fillStyle = fill;
    ctx.strokeStyle = fill;
    ctx.lineJoin = "round";
    ctx.lineWidth = 3; // plumps the silhouettes slightly for a cleaner look
    for (const shape of shapes) {
      ctx.beginPath();
      pathSmoothClosed(ctx, shape.contour);
      ctx.fill();
      ctx.stroke();
    }
  }, [imageData, target, shapes, wallLines]);

  const download = () => {
    const canvas = resultCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "route-sketch.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">
            Climb Route Sketch
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Turn a wall photo into an abstract map of one route&apos;s holds.
            Everything runs in your browser.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">1 · Photo</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white active:bg-stone-700"
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => loadImage(SAMPLE_URL)}
                className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm font-medium active:bg-stone-300"
              >
                Load sample
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <p className="mt-2 text-sm text-stone-600">
            {imageData
              ? "Tap a hold to pick the route color."
              : loading
                ? "Loading photo…"
                : "Upload a wall photo or load the sample to start."}
          </p>
          <canvas
            ref={photoCanvasRef}
            onPointerDown={onPick}
            className={`mt-3 w-full cursor-crosshair rounded-xl touch-none ${
              imageData ? "" : "hidden"
            }`}
          />
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">2 · Route color</h2>
            {target ? (
              <span className="flex items-center gap-2 text-sm text-stone-600">
                <span
                  className="inline-block h-6 w-6 rounded-full ring-2 ring-stone-300"
                  style={{ backgroundColor: rgbCss(target) }}
                />
                picked
              </span>
            ) : (
              <span className="text-sm text-stone-400">not picked yet</span>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3">
            <label className="text-sm">
              <span className="flex justify-between text-stone-600">
                <span>Hue tolerance</span>
                <span>±{hueTolerance}°</span>
              </span>
              <input
                type="range"
                min={4}
                max={40}
                value={hueTolerance}
                onChange={(e) => setHueTolerance(Number(e.target.value))}
                className="mt-1 w-full accent-stone-900"
              />
            </label>
            <label className="text-sm">
              <span className="flex justify-between text-stone-600">
                <span>Shade tolerance (chalk &amp; shadows)</span>
                <span>{Math.round(shadeTolerance * 100)}%</span>
              </span>
              <input
                type="range"
                min={20}
                max={90}
                value={Math.round(shadeTolerance * 100)}
                onChange={(e) => setShadeTolerance(Number(e.target.value) / 100)}
                className="mt-1 w-full accent-stone-900"
              />
            </label>
            <label className="text-sm">
              <span className="flex justify-between text-stone-600">
                <span>Minimum hold size</span>
                <span>{minSize.toFixed(1)}</span>
              </span>
              <input
                type="range"
                min={2}
                max={40}
                value={Math.round(minSize * 10)}
                onChange={(e) => setMinSize(Number(e.target.value) / 10)}
                className="mt-1 w-full accent-stone-900"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">3 · Sketch</h2>
            <button
              type="button"
              onClick={download}
              disabled={!target}
              className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white active:bg-stone-700 disabled:opacity-40"
            >
              Download PNG
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={showWallLines}
                onChange={(e) => setShowWallLines(e.target.checked)}
                className="h-4 w-4 accent-stone-900"
              />
              Show wall lines (seams, volumes, plane breaks)
            </label>
            {showWallLines && (
              <label className="text-sm">
                <span className="flex justify-between text-stone-600">
                  <span>Wall line detail</span>
                  <span>{Math.round(lineDetail * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(lineDetail * 100)}
                  onChange={(e) => setLineDetail(Number(e.target.value) / 100)}
                  className="mt-1 w-full accent-stone-900"
                />
              </label>
            )}
          </div>
          <p className="mt-2 text-sm text-stone-600">
            {holdCount === null
              ? "Pick a color above to draw the route."
              : `${holdCount} hold${holdCount === 1 ? "" : "s"} found.`}
          </p>
          <canvas
            ref={resultCanvasRef}
            className={`mt-3 w-full rounded-xl ring-1 ring-stone-200 ${
              imageData ? "" : "hidden"
            }`}
          />
        </section>

        <footer className="pb-4 text-center text-xs text-stone-400">
          No uploads leave your device — all processing is local.
        </footer>
      </div>
    </div>
  );
}
