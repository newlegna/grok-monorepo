export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  /** degrees, 0–360 */
  h: number;
  /** 0–1 */
  s: number;
  /** 0–1 */
  v: number;
}

export interface ExtractOptions {
  target: RGB;
  /** max circular hue distance in degrees */
  hueTolerance: number;
  /** 0–1, how far saturation/brightness may drift from the target (shadows, chalk) */
  shadeTolerance: number;
  /** minimum blob area as a fraction of total pixels */
  minAreaFraction: number;
}

export interface HoldShape {
  /** simplified closed contour, pixel coords in the processed image */
  contour: [number, number][];
  area: number;
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rn = 0;
  let gn = 0;
  let bn = 0;
  if (h < 60) [rn, gn, bn] = [c, x, 0];
  else if (h < 120) [rn, gn, bn] = [x, c, 0];
  else if (h < 180) [rn, gn, bn] = [0, c, x];
  else if (h < 240) [rn, gn, bn] = [0, x, c];
  else if (h < 300) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];
  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
  };
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** 1 = matching pixel, 0 = background */
function buildMask(image: ImageData, opts: ExtractOptions): Uint8Array {
  const { data, width, height } = image;
  const target = rgbToHsv(opts.target.r, opts.target.g, opts.target.b);
  const mask = new Uint8Array(width * height);

  const shade = opts.shadeTolerance;
  // Chalk and shadows mostly shift saturation/brightness, so those bounds are
  // loose; hue is the discriminating signal between routes.
  const sMin = Math.max(0.1, target.s * (1 - shade));
  const vMin = Math.max(0.07, target.v * (1 - shade));
  const vMax = Math.min(1, target.v + shade * 0.6);

  for (let i = 0; i < width * height; i++) {
    const { h, s, v } = rgbToHsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    if (
      hueDistance(h, target.h) <= opts.hueTolerance &&
      s >= sMin &&
      v >= vMin &&
      v <= vMax
    ) {
      mask[i] = 1;
    }
  }
  return mask;
}

/** 3x3 dilation followed by 3x3 erosion (morphological closing) to seal pinholes. */
function close(mask: Uint8Array, width: number, height: number): Uint8Array {
  const pass = (src: Uint8Array, hit: number): Uint8Array => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let found = false;
        for (let dy = -1; dy <= 1 && !found; dy++) {
          for (let dx = -1; dx <= 1 && !found; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (src[ny * width + nx] === hit) found = true;
            } else if (hit === 0) {
              found = true; // treat outside as background for erosion
            }
          }
        }
        out[y * width + x] = hit === 1 ? (found ? 1 : 0) : found ? 0 : 1;
      }
    }
    return out;
  };
  return pass(pass(mask, 1), 0);
}

interface Component {
  pixels: number[];
  area: number;
}

function connectedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
): Component[] {
  const visited = new Uint8Array(mask.length);
  const components: Component[] = [];
  const stack: number[] = [];

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] !== 1 || visited[start]) continue;
    const pixels: number[] = [];
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;
    while (stack.length > 0) {
      const idx = stack.pop()!;
      pixels.push(idx);
      const x = idx % width;
      const y = (idx / width) | 0;
      if (x > 0) tryPush(idx - 1);
      if (x < width - 1) tryPush(idx + 1);
      if (y > 0) tryPush(idx - width);
      if (y < height - 1) tryPush(idx + width);
    }
    components.push({ pixels, area: pixels.length });
  }
  return components;

  function tryPush(idx: number) {
    if (mask[idx] === 1 && !visited[idx]) {
      visited[idx] = 1;
      stack.push(idx);
    }
  }
}

/**
 * Moore-neighbor boundary tracing of a single component.
 * Returns the outer contour as pixel coordinates.
 */
function traceBoundary(
  component: Component,
  width: number,
): [number, number][] {
  const inComp = new Set(component.pixels);
  const isFg = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && inComp.has(y * width + x);

  // Start pixel: minimal index = topmost row, leftmost column.
  let startIdx = component.pixels[0];
  for (const p of component.pixels) if (p < startIdx) startIdx = p;
  const sx = startIdx % width;
  const sy = (startIdx / width) | 0;

  // Clockwise neighbor order starting from west.
  const dirs: [number, number][] = [
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
  ];

  const contour: [number, number][] = [[sx, sy]];
  let cx = sx;
  let cy = sy;
  // Backtrack starts at the west neighbor (guaranteed background because the
  // start pixel is the leftmost of its topmost row).
  let backDir = 0;
  const maxSteps = component.area * 4 + 16;

  for (let step = 0; step < maxSteps; step++) {
    let found = -1;
    for (let k = 1; k <= 8; k++) {
      const dir = (backDir + k) % 8;
      const nx = cx + dirs[dir][0];
      const ny = cy + dirs[dir][1];
      if (isFg(nx, ny)) {
        found = dir;
        break;
      }
    }
    if (found === -1) break; // isolated pixel
    cx += dirs[found][0];
    cy += dirs[found][1];
    if (cx === sx && cy === sy) break;
    contour.push([cx, cy]);
    // New backtrack: the neighbor just before the found one, expressed from
    // the new current pixel (opposite direction, stepped back by one).
    backDir = (found + 4 + 1) % 8;
  }
  return contour;
}

/** Ramer–Douglas–Peucker simplification of a closed contour. */
function simplify(
  points: [number, number][],
  epsilon: number,
): [number, number][] {
  if (points.length <= 4) return points;

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    const [x1, y1] = points[first];
    const [x2, y2] = points[last];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    let maxDist = 0;
    let maxI = -1;
    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i];
      const dist = Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / len;
      if (dist > maxDist) {
        maxDist = dist;
        maxI = i;
      }
    }
    if (maxDist > epsilon && maxI > 0) {
      keep[maxI] = 1;
      stack.push([first, maxI], [maxI, last]);
    }
  }

  const out: [number, number][] = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

export function extractHolds(
  image: ImageData,
  opts: ExtractOptions,
): HoldShape[] {
  const { width, height } = image;
  const mask = close(buildMask(image, opts), width, height);
  const minArea = Math.max(
    25,
    Math.round(width * height * opts.minAreaFraction),
  );

  const shapes: HoldShape[] = [];
  for (const comp of connectedComponents(mask, width, height)) {
    if (comp.area < minArea) continue;
    const contour = traceBoundary(comp, width);
    if (contour.length < 3) continue;
    shapes.push({ contour: simplify(contour, 1.6), area: comp.area });
  }
  return shapes;
}

/** Draw a closed contour as a smooth path using midpoint quadratic curves. */
export function pathSmoothClosed(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
): void {
  const n = pts.length;
  if (n < 3) return;
  const mid = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
  const start = mid(pts[n - 1], pts[0]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
}
