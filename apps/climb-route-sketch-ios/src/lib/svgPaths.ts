/**
 * SVG path-string builders replacing the web app's canvas path helpers.
 * Same midpoint-quadratic smoothing math, emitted as `d` attributes.
 */

const fmt = (v: number) => v.toFixed(1);

/** Closed contour as a smooth path (midpoint quadratic curves). */
export function closedSmoothPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 3) return "";
  const mid = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
  const start = mid(pts[n - 1], pts[0]);
  let d = `M${fmt(start[0])} ${fmt(start[1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    d += ` Q${fmt(p[0])} ${fmt(p[1])} ${fmt(m[0])} ${fmt(m[1])}`;
  }
  return `${d} Z`;
}

/** Open polyline as a smooth path (midpoint quadratic curves). */
export function openSmoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${fmt(pts[i][0])} ${fmt(pts[i][1])} ${fmt(mx)} ${fmt(my)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${fmt(last[0])} ${fmt(last[1])}`;
}
