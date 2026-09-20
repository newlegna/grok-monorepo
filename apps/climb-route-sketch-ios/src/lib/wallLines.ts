import { rgbToHsv } from "./extract";
import type { RasterImage } from "./raster";

export interface WallLineOptions {
  /** 0–1; higher = more/finer lines */
  detail: number;
  /** dev hook: receives intermediate binary maps for tuning */
  onDebugMap?: (map: Uint8Array, width: number, height: number) => void;
}

export type Polyline = [number, number][];

const BLOCK = 8;

/**
 * Extract a sparse set of long structural lines (panel seams, volume edges,
 * plane breaks) from a wall photo. Two complementary passes:
 *
 * - Coarse: the image is 8x block-averaged (killing wood grain and bolt
 *   holes), colorful hold cells are masked out, and near-uniform brightness
 *   regions are grown. Boundaries between large regions — plywood planes lit
 *   differently, dark volumes, the floor — are traced into polylines.
 * - Fine: Sobel edges on the lightly blurred luma (holds/mats masked, local
 *   per-tile thresholds so faint seams survive) feed a Hough transform;
 *   supported runs along peak lines become straight segments. This catches
 *   crisp seams and volume edges that don't separate big regions.
 *
 * Fine segments that mostly retrace a coarse boundary are dropped.
 */
export function detectWallLines(
  image: RasterImage,
  opts: WallLineOptions,
): Polyline[] {
  const { data, width: w, height: h } = image;
  const n = w * h;
  const detail = Math.min(1, Math.max(0, opts.detail));

  const luma = new Float32Array(n);
  const saturated = new Uint8Array(n);
  const excludeFine = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    luma[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    const { s, v } = rgbToHsv(r, g, b);
    if (s > 0.42) saturated[i] = 1;
    if (s > 0.38 || v < 0.16) excludeFine[i] = 1;
  }

  // ---------- coarse pass: region boundaries ----------
  const cw = Math.floor(w / BLOCK);
  const ch = Math.floor(h / BLOCK);
  const coarseLuma = new Float32Array(cw * ch);
  const coarseExclude = new Uint8Array(cw * ch);
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      let sum = 0;
      let sat = 0;
      for (let dy = 0; dy < BLOCK; dy++) {
        for (let dx = 0; dx < BLOCK; dx++) {
          const i = (cy * BLOCK + dy) * w + cx * BLOCK + dx;
          sum += luma[i];
          sat += saturated[i];
        }
      }
      const cells = BLOCK * BLOCK;
      coarseLuma[cy * cw + cx] = sum / cells;
      // Colorful cells are holds, not wall; dark cells stay (black volumes
      // and the floor are wall structure).
      if (sat / cells > 0.35) coarseExclude[cy * cw + cx] = 1;
    }
  }

  // Note: the region tolerance is intentionally NOT tied to the detail
  // slider. Lowering it does not add detail — it fragments panels into
  // regions too small to pass the size filter, so boundaries vanish.
  const boundary = regionBoundaryMap(coarseLuma, coarseExclude, cw, ch, {
    tolerance: 12,
    minRegionFrac: 0.008,
  });
  opts.onDebugMap?.(boundary, cw, ch);

  const coarsePolylines = traceChains(boundary, cw, ch)
    .filter((line) => pathLength(line) >= 9)
    .map((line) => simplifyPolyline(line, 1.2))
    .map((line) =>
      line.map(
        ([x, y]) => [(x + 0.5) * BLOCK, (y + 0.5) * BLOCK] as [number, number],
      ),
    );

  // ---------- fine pass: Hough segments ----------
  dilate(excludeFine, w, h, 2);
  const blurred = boxBlur(boxBlur(luma, w, h), w, h);
  const magFine = sobel(blurred, w, h, excludeFine);
  const edgeFine = thresholdPerTile(magFine, w, h, 64, 0.015 + detail * 0.045);

  const maxDim = Math.max(w, h);
  const fineSegs = dedupeSegments(
    houghSegments(edgeFine, w, h, {
      minSegLen: Math.max(40, 0.09 * maxDim),
      maxGap: 14,
      minDensity: 0.3,
      maxPeaks: Math.round(8 + detail * 22),
      tolerance: 2,
    }),
  );

  // Drop fine segments that mostly retrace a coarse region boundary.
  const occupied = new Uint8Array(cw * ch);
  for (let i = 0; i < boundary.length; i++) occupied[i] = boundary[i];
  dilate(occupied, cw, ch, 1);
  const finePolylines: Polyline[] = [];
  for (const seg of fineSegs) {
    const segLen = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
    const samples = Math.max(2, Math.ceil(segLen / BLOCK));
    let covered = 0;
    for (let s = 0; s <= samples; s++) {
      const x = seg.x1 + ((seg.x2 - seg.x1) * s) / samples;
      const y = seg.y1 + ((seg.y2 - seg.y1) * s) / samples;
      const cx = Math.min(cw - 1, Math.max(0, (x / BLOCK) | 0));
      const cy = Math.min(ch - 1, Math.max(0, (y / BLOCK) | 0));
      if (occupied[cy * cw + cx]) covered++;
    }
    if (covered / (samples + 1) < 0.7) {
      finePolylines.push([
        [seg.x1, seg.y1],
        [seg.x2, seg.y2],
      ]);
    }
  }

  return [...coarsePolylines, ...finePolylines];
}

interface RegionOptions {
  /** max |luma - region mean| for a cell to join a region */
  tolerance: number;
  /** regions smaller than this fraction of cells produce no boundaries */
  minRegionFrac: number;
}

/**
 * Grow near-uniform brightness regions (BFS with a running mean) and return
 * a map marking cells that border a *different large* region.
 */
function regionBoundaryMap(
  luma: Float32Array,
  exclude: Uint8Array,
  w: number,
  h: number,
  opts: RegionOptions,
): Uint8Array {
  const n = w * h;
  const region = new Int32Array(n).fill(-1);
  const regionSizes: number[] = [];
  const queue: number[] = [];

  for (let start = 0; start < n; start++) {
    if (region[start] !== -1 || exclude[start]) continue;
    const id = regionSizes.length;
    let sum = 0;
    let count = 0;
    region[start] = id;
    queue.length = 0;
    queue.push(start);
    while (queue.length > 0) {
      const i = queue.pop()!;
      sum += luma[i];
      count++;
      const mean = sum / count;
      const x = i % w;
      const y = (i / w) | 0;
      const tryJoin = (j: number) => {
        if (
          region[j] === -1 &&
          !exclude[j] &&
          Math.abs(luma[j] - mean) <= opts.tolerance
        ) {
          region[j] = id;
          queue.push(j);
        }
      };
      if (x > 0) tryJoin(i - 1);
      if (x < w - 1) tryJoin(i + 1);
      if (y > 0) tryJoin(i - w);
      if (y < h - 1) tryJoin(i + w);
    }
    regionSizes.push(count);
  }

  const minCells = Math.max(12, Math.round(n * opts.minRegionFrac));
  const boundary = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = region[i];
      if (a === -1 || regionSizes[a] < minCells) continue;
      const check = (j: number) => {
        const b = region[j];
        return b !== -1 && b !== a && regionSizes[b] >= minCells;
      };
      if (
        (x < w - 1 && check(i + 1)) ||
        (y < h - 1 && check(i + w)) ||
        (x < w - 1 && y < h - 1 && check(i + w + 1))
      ) {
        boundary[i] = 1;
      }
    }
  }
  return boundary;
}

/**
 * Trace 8-connected chains of marked cells into open polylines. At branch
 * points the walk picks one direction; remaining branches become their own
 * polylines on later iterations.
 */
function traceChains(map: Uint8Array, w: number, h: number): Polyline[] {
  const visited = new Uint8Array(map.length);
  const lines: Polyline[] = [];

  const neighborsOf = (i: number, unvisitedOnly: boolean): number[] => {
    const x = i % w;
    const y = (i / w) | 0;
    const out: number[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const j = ny * w + nx;
        if (map[j] && (!unvisitedOnly || !visited[j])) out.push(j);
      }
    }
    return out;
  };

  // Prefer starting from endpoints (single unvisited chain neighbor) so
  // chains are traced end to end rather than from the middle.
  for (const endpointsFirst of [true, false]) {
    for (let i = 0; i < map.length; i++) {
      if (!map[i] || visited[i]) continue;
      if (endpointsFirst && neighborsOf(i, true).length > 1) continue;
      const line: Polyline = [];
      let cur = i;
      while (cur !== -1) {
        visited[cur] = 1;
        line.push([cur % w, (cur / w) | 0]);
        const next = neighborsOf(cur, true);
        cur = next.length > 0 ? next[0] : -1;
      }
      if (line.length >= 2) lines.push(line);
    }
  }
  return lines;
}

function pathLength(line: Polyline): number {
  let len = 0;
  for (let i = 1; i < line.length; i++) {
    len += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
  }
  return len;
}

/** Ramer–Douglas–Peucker simplification of an open polyline. */
function simplifyPolyline(points: Polyline, epsilon: number): Polyline {
  if (points.length <= 2) return points;
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
  const out: Polyline = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

// ---------------------------------------------------------------------------
// Fine-scale helpers
// ---------------------------------------------------------------------------

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function sobel(
  src: Float32Array,
  w: number,
  h: number,
  exclude: Uint8Array,
): Float32Array {
  const mag = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (exclude[i]) continue;
      const tl = src[i - w - 1];
      const t = src[i - w];
      const tr = src[i - w + 1];
      const l = src[i - 1];
      const r = src[i + 1];
      const bl = src[i + w - 1];
      const b = src[i + w];
      const br = src[i + w + 1];
      const gx = tr + 2 * r + br - tl - 2 * l - bl;
      const gy = bl + 2 * b + br - tl - 2 * t - tr;
      mag[i] = Math.hypot(gx, gy);
    }
  }
  return mag;
}

/**
 * Per-tile percentile threshold: faint seams in flat plywood areas would be
 * drowned out by a global threshold dominated by volume/floor edges. The
 * Hough long-line requirement filters the grain noise this lets through.
 */
function thresholdPerTile(
  mag: Float32Array,
  w: number,
  h: number,
  tile: number,
  keepFrac: number,
): Uint8Array {
  let magMax = 0;
  for (let i = 0; i < mag.length; i++) if (mag[i] > magMax) magMax = mag[i];
  const edge = new Uint8Array(w * h);
  if (magMax === 0) return edge;
  const absFloor = 0.04 * magMax;
  const tileMags: number[] = [];
  for (let ty = 0; ty < h; ty += tile) {
    for (let tx = 0; tx < w; tx += tile) {
      tileMags.length = 0;
      const yEnd = Math.min(h, ty + tile);
      const xEnd = Math.min(w, tx + tile);
      for (let y = ty; y < yEnd; y++) {
        for (let x = tx; x < xEnd; x++) {
          const m = mag[y * w + x];
          if (m > 0) tileMags.push(m);
        }
      }
      if (tileMags.length === 0) continue;
      tileMags.sort((a, b) => a - b);
      const qIdx = Math.max(
        0,
        Math.min(
          tileMags.length - 1,
          Math.floor(tileMags.length * (1 - keepFrac * 3)),
        ),
      );
      const threshold = Math.max(absFloor, tileMags[qIdx]);
      for (let y = ty; y < yEnd; y++) {
        for (let x = tx; x < xEnd; x++) {
          const i = y * w + x;
          if (mag[i] >= threshold) edge[i] = 1;
        }
      }
    }
  }
  return edge;
}

interface HoughOptions {
  minSegLen: number;
  maxGap: number;
  minDensity: number;
  maxPeaks: number;
  tolerance: number;
}

function houghSegments(
  edge: Uint8Array,
  w: number,
  h: number,
  opts: HoughOptions,
): Segment[] {
  const edgePoints: number[] = [];
  for (let i = 0; i < edge.length; i++) if (edge[i]) edgePoints.push(i);
  if (edgePoints.length === 0) return [];

  const thetaSteps = 180;
  const rhoStep = 2;
  const diag = Math.hypot(w, h);
  const rhoBins = Math.ceil((2 * diag) / rhoStep) + 1;
  const cosT = new Float32Array(thetaSteps);
  const sinT = new Float32Array(thetaSteps);
  for (let t = 0; t < thetaSteps; t++) {
    const a = (t / thetaSteps) * Math.PI;
    cosT[t] = Math.cos(a);
    sinT[t] = Math.sin(a);
  }
  const accu = new Uint32Array(thetaSteps * rhoBins);
  const stride = edgePoints.length > 70000 ? 2 : 1;
  for (let p = 0; p < edgePoints.length; p += stride) {
    const i = edgePoints[p];
    const x = i % w;
    const y = (i / w) | 0;
    for (let t = 0; t < thetaSteps; t++) {
      const rho = x * cosT[t] + y * sinT[t];
      accu[t * rhoBins + Math.round((rho + diag) / rhoStep)]++;
    }
  }

  const voteThreshold = Math.max(15, (opts.minSegLen * 0.6) / stride);
  interface Peak {
    t: number;
    r: number;
    votes: number;
  }
  const peaks: Peak[] = [];
  const tWin = 4;
  const rWin = 4;
  for (let t = 0; t < thetaSteps; t++) {
    for (let r = 0; r < rhoBins; r++) {
      const v = accu[t * rhoBins + r];
      if (v < voteThreshold) continue;
      let isMax = true;
      for (let dt = -tWin; dt <= tWin && isMax; dt++) {
        const tt = t + dt;
        if (tt < 0 || tt >= thetaSteps) continue;
        for (let dr = -rWin; dr <= rWin; dr++) {
          const rr = r + dr;
          if (rr < 0 || rr >= rhoBins) continue;
          const ov = accu[tt * rhoBins + rr];
          if (ov > v || (ov === v && (dt < 0 || (dt === 0 && dr < 0)))) {
            isMax = false;
            break;
          }
        }
      }
      if (isMax) peaks.push({ t, r, votes: v });
    }
  }
  peaks.sort((a, b) => b.votes - a.votes);
  peaks.length = Math.min(peaks.length, opts.maxPeaks);

  const segments: Segment[] = [];
  const tol = Math.round(opts.tolerance);
  const isEdgeNear = (x: number, y: number, nx: number, ny: number) => {
    for (let k = -tol; k <= tol; k++) {
      const px = Math.round(x + nx * k);
      const py = Math.round(y + ny * k);
      if (px >= 0 && px < w && py >= 0 && py < h && edge[py * w + px]) {
        return true;
      }
    }
    return false;
  };

  for (const peak of peaks) {
    const c = cosT[peak.t];
    const s = sinT[peak.t];
    const rho = peak.r * rhoStep - diag;
    const bx = rho * c;
    const by = rho * s;

    let runStart = Number.NaN;
    let lastHit = Number.NaN;
    let hits = 0;

    const flush = (endT: number) => {
      if (Number.isNaN(runStart)) return;
      const len = endT - runStart;
      if (len >= opts.minSegLen && hits / len >= opts.minDensity) {
        segments.push({
          x1: bx - s * runStart,
          y1: by + c * runStart,
          x2: bx - s * endT,
          y2: by + c * endT,
        });
      }
      runStart = Number.NaN;
      hits = 0;
    };

    for (let t = -Math.ceil(diag); t <= Math.ceil(diag); t++) {
      const x = bx - s * t;
      const y = by + c * t;
      if (x < 0 || x >= w || y < 0 || y >= h) {
        flush(lastHit);
        continue;
      }
      if (isEdgeNear(x, y, c, s)) {
        if (Number.isNaN(runStart)) runStart = t;
        else if (t - lastHit > opts.maxGap) {
          flush(lastHit);
          runStart = t;
        }
        lastHit = t;
        hits++;
      }
    }
    flush(lastHit);
  }
  return segments;
}

function boxBlur(src: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let cnt = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            sum += src[ny * w + nx];
            cnt++;
          }
        }
      }
      out[y * w + x] = sum / cnt;
    }
  }
  return out;
}

function dilate(mask: Uint8Array, w: number, h: number, times: number): void {
  for (let iter = 0; iter < times; iter++) {
    const snapshot = mask.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (snapshot[y * w + x]) continue;
        let hit = false;
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          for (let dx = -1; dx <= 1 && !hit; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              if (snapshot[ny * w + nx]) hit = true;
            }
          }
        }
        if (hit) mask[y * w + x] = 1;
      }
    }
  }
}

/** Drop the shorter of two segments that are nearly collinear and overlapping. */
function dedupeSegments(segments: Segment[]): Segment[] {
  const len = (s: Segment) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
  const sorted = [...segments].sort((a, b) => len(b) - len(a));
  const kept: Segment[] = [];
  for (const seg of sorted) {
    const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
    let duplicate = false;
    for (const other of kept) {
      const oAngle = Math.atan2(other.y2 - other.y1, other.x2 - other.x1);
      let dAng = Math.abs(angle - oAngle) % Math.PI;
      if (dAng > Math.PI / 2) dAng = Math.PI - dAng;
      if (dAng > (6 * Math.PI) / 180) continue;
      const mx = (seg.x1 + seg.x2) / 2;
      const my = (seg.y1 + seg.y2) / 2;
      const dx = other.x2 - other.x1;
      const dy = other.y2 - other.y1;
      const oLen = Math.hypot(dx, dy) || 1;
      const dist =
        Math.abs(
          dy * mx - dx * my + other.x2 * other.y1 - other.y2 * other.x1,
        ) / oLen;
      if (dist > 10) continue;
      const proj = (px: number, py: number) =>
        ((px - other.x1) * dx + (py - other.y1) * dy) / oLen;
      const a1 = proj(seg.x1, seg.y1);
      const a2 = proj(seg.x2, seg.y2);
      const lo = Math.min(a1, a2);
      const hi = Math.max(a1, a2);
      const overlap = Math.min(hi, oLen) - Math.max(lo, 0);
      if (overlap > 0.5 * len(seg)) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) kept.push(seg);
  }
  return kept;
}
