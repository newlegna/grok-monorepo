/**
 * PHOTO DOODLE TRAVEL OBJECT — client-side poster pipeline.
 *
 * Renders a 3:4 poster (1536x2048) with a hard horizontal split:
 * top = the original photo with a light film-magazine grade,
 * bottom = a warm-white paper panel with matte palette blocks,
 * torn photo-texture slices of one object region, sparse marker
 * doodles and handwritten-feel typography.
 */

export const POSTER_W = 1536
export const POSTER_H = 2048
const SPLIT_Y = Math.round(POSTER_H * 0.5)

const PAPER = '#f5efe3'
const PAPER_DEEP = '#efe7d7'
const INK = '#453a2e'
const INK_SOFT = '#6b5d4d'

export interface PosterText {
  title: string
  note: string
}

/* ---------------------------------- RNG ---------------------------------- */

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rng = () => number
const pick = <T,>(rng: Rng, arr: T[]): T => arr[Math.floor(rng() * arr.length)]
const range = (rng: Rng, min: number, max: number) => min + rng() * (max - min)

/* ------------------------------- Analysis -------------------------------- */

interface Analysis {
  palette: [number, number, number][]
  dominant: [number, number, number]
  luminance: number // 0..1
  /** Object region in source-image coordinates. */
  objectRect: { x: number; y: number; w: number; h: number }
  /** Object center as a fraction of image width/height. */
  objectCx: number
  objectCy: number
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return [h * 360, s, l]
}

function analyzeImage(img: HTMLImageElement): Analysis {
  const aw = 96
  const ah = Math.max(64, Math.round((img.naturalHeight / img.naturalWidth) * aw))
  const off = document.createElement('canvas')
  off.width = aw
  off.height = ah
  const octx = off.getContext('2d', { willReadFrequently: true })!
  octx.drawImage(img, 0, 0, aw, ah)
  const data = octx.getImageData(0, 0, aw, ah).data

  // Coarse palette via 4-bit-per-channel histogram buckets.
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>()
  let lumSum = 0
  const lum = new Float32Array(aw * ah)
  const sat = new Float32Array(aw * ah)
  for (let i = 0; i < aw * ah; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    lum[i] = l
    lumSum += l
    const mx = Math.max(r, g, b)
    const mn = Math.min(r, g, b)
    sat[i] = mx === 0 ? 0 : (mx - mn) / mx
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    bucket.n++
    bucket.r += r
    bucket.g += g
    bucket.b += b
    buckets.set(key, bucket)
  }

  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n)
  const palette: [number, number, number][] = []
  for (const bk of sorted) {
    const c: [number, number, number] = [bk.r / bk.n, bk.g / bk.n, bk.b / bk.n]
    const [, , l] = rgbToHsl(c[0], c[1], c[2])
    if (l > 0.94 || l < 0.06) continue // skip near white/black for blocks
    const distinct = palette.every(
      (p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 52,
    )
    if (distinct) palette.push(c)
    if (palette.length >= 6) break
  }
  if (palette.length === 0) palette.push([120, 110, 96])

  // Dominant = most saturated of the top palette entries (more "object-like").
  const dominant =
    [...palette]
      .slice(0, 4)
      .sort((a, b) => rgbToHsl(b[0], b[1], b[2])[1] - rgbToHsl(a[0], a[1], a[2])[1])[0] ??
    palette[0]

  // Center-weighted saliency grid: saturation + local contrast.
  const gx = 6
  const gy = 6
  let best = { score: -1, cx: 0.5, cy: 0.5 }
  for (let cyi = 0; cyi < gy; cyi++) {
    for (let cxi = 0; cxi < gx; cxi++) {
      const x0 = Math.floor((cxi / gx) * aw)
      const x1 = Math.floor(((cxi + 1) / gx) * aw)
      const y0 = Math.floor((cyi / gy) * ah)
      const y1 = Math.floor(((cyi + 1) / gy) * ah)
      let satSum = 0
      let edgeSum = 0
      let n = 0
      for (let y = y0 + 1; y < y1 - 1; y++) {
        for (let x = x0 + 1; x < x1 - 1; x++) {
          const i = y * aw + x
          satSum += sat[i]
          edgeSum += Math.abs(lum[i + 1] - lum[i - 1]) + Math.abs(lum[i + aw] - lum[i - aw])
          n++
        }
      }
      if (n === 0) continue
      const ccx = (cxi + 0.5) / gx
      const ccy = (cyi + 0.5) / gy
      const centerDist = Math.hypot(ccx - 0.5, ccy - 0.55)
      const centerWeight = Math.exp(-(centerDist * centerDist) / 0.16)
      const score = (satSum / n + 1.4 * (edgeSum / n)) * centerWeight
      if (score > best.score) best = { score, cx: ccx, cy: ccy }
    }
  }

  const iw = img.naturalWidth
  const ih = img.naturalHeight
  const side = Math.round(Math.min(iw, ih) * 0.46)
  const x = Math.min(Math.max(best.cx * iw - side / 2, 0), iw - side)
  const y = Math.min(Math.max(best.cy * ih - side / 2, 0), ih - side)

  return {
    palette,
    dominant,
    luminance: lumSum / (aw * ah),
    objectRect: { x, y, w: side, h: side },
    objectCx: best.cx,
    objectCy: best.cy,
  }
}

/* ----------------------------- Text generation --------------------------- */

const HUE_NAMES: [number, string][] = [
  [15, 'red'],
  [40, 'orange'],
  [65, 'golden'],
  [95, 'olive'],
  [150, 'green'],
  [195, 'teal'],
  [250, 'blue'],
  [290, 'violet'],
  [330, 'pink'],
  [360, 'red'],
]

function colorName([r, g, b]: [number, number, number]): string {
  const [h, s, l] = rgbToHsl(r, g, b)
  if (s < 0.14) return l > 0.6 ? 'pale' : 'grey'
  if (l < 0.22) return 'dark'
  if (h >= 15 && h < 50 && s < 0.45 && l < 0.55) return 'brown'
  for (const [limit, name] of HUE_NAMES) if (h < limit) return name
  return 'red'
}

function generateText(analysis: Analysis, rng: Rng): PosterText {
  const cn = colorName(analysis.dominant)
  const nouns = ['OBJECT', 'DETAIL', 'PAUSE', 'CORNER', 'MOMENT', 'NOTE', 'FIND', 'STILL']
  const title = `${cn.toUpperCase()} ${pick(rng, nouns)}`

  const posH =
    analysis.objectCx < 0.38 ? 'left side' : analysis.objectCx > 0.62 ? 'right side' : 'middle'
  const light =
    analysis.luminance > 0.62 ? 'bright' : analysis.luminance < 0.35 ? 'shadowed' : 'soft'
  const templates = [
    `One ${cn} shape rests near the ${posH} of the frame.`,
    `A small ${cn} detail waits in ${light} light.`,
    `${cn[0].toUpperCase() + cn.slice(1)} tones gather around the ${posH} here.`,
    `Something ${cn} holds still in this ${light} scene.`,
  ]
  return { title, note: pick(rng, templates) }
}

/* ------------------------------ Draw helpers ----------------------------- */

type Ctx = CanvasRenderingContext2D

function rgb([r, g, b]: [number, number, number], a = 1): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`
}

/** Mix a color toward another (0 = keep a, 1 = full b). */
function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

const PAPER_RGB: [number, number, number] = [245, 239, 227]

function addGrain(ctx: Ctx, x: number, y: number, w: number, h: number, alpha: number, rng: Rng) {
  const gw = 256
  const gh = 256
  const off = document.createElement('canvas')
  off.width = gw
  off.height = gh
  const octx = off.getContext('2d')!
  const id = octx.createImageData(gw, gh)
  for (let i = 0; i < gw * gh; i++) {
    const v = Math.floor(rng() * 255)
    id.data[i * 4] = v
    id.data[i * 4 + 1] = v
    id.data[i * 4 + 2] = v
    id.data[i * 4 + 3] = 255
  }
  octx.putImageData(id, 0, 0)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'overlay'
  for (let ty = y; ty < y + h; ty += gh) {
    for (let tx = x; tx < x + w; tx += gw) {
      ctx.drawImage(off, tx, ty)
    }
  }
  ctx.restore()
}

/** Build a torn-paper polygon path around a rect. */
function tornRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, rng: Rng, jitter = 9) {
  const step = 30
  ctx.beginPath()
  ctx.moveTo(x + range(rng, -jitter, jitter), y + range(rng, -jitter, jitter))
  for (let px = x + step; px < x + w; px += step)
    ctx.lineTo(px, y + range(rng, -jitter, jitter))
  ctx.lineTo(x + w + range(rng, -jitter, jitter), y + range(rng, -jitter, jitter))
  for (let py = y + step; py < y + h; py += step)
    ctx.lineTo(x + w + range(rng, -jitter, jitter), py)
  ctx.lineTo(x + w + range(rng, -jitter, jitter), y + h + range(rng, -jitter, jitter))
  for (let px = x + w - step; px > x; px -= step)
    ctx.lineTo(px, y + h + range(rng, -jitter, jitter))
  ctx.lineTo(x + range(rng, -jitter, jitter), y + h + range(rng, -jitter, jitter))
  for (let py = y + h - step; py > y; py -= step)
    ctx.lineTo(x + range(rng, -jitter, jitter), py)
  ctx.closePath()
}

/** Organic matte blob: smooth closed curve through jittered ellipse points. */
function blobPath(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, rng: Rng) {
  const n = 9
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const jr = range(rng, 0.78, 1.14)
    pts.push([cx + Math.cos(a) * rx * jr, cy + Math.sin(a) * ry * jr])
  }
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[(i + 1) % n]
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2
    if (i === 0) ctx.moveTo(mx, my)
    else ctx.quadraticCurveTo(x0, y0, mx, my)
    if (i === n - 1) ctx.quadraticCurveTo(x1, y1, (x1 + pts[0][0]) / 2, (y1 + pts[0][1]) / 2)
  }
  ctx.closePath()
}

/** Hand-drawn line: subdivided segments with perpendicular jitter. */
function handLine(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, rng: Rng, jitter = 3) {
  const segs = Math.max(3, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 34))
  ctx.moveTo(x0, y0)
  for (let i = 1; i <= segs; i++) {
    const t = i / segs
    ctx.lineTo(
      x0 + (x1 - x0) * t + range(rng, -jitter, jitter),
      y0 + (y1 - y0) * t + range(rng, -jitter, jitter),
    )
  }
}

/* -------------------------------- Doodles -------------------------------- */

function inkStroke(ctx: Ctx, width: number) {
  ctx.strokeStyle = 'rgba(66,56,45,0.86)'
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function doodleArrow(ctx: Ctx, x: number, y: number, tx: number, ty: number, rng: Rng) {
  const mx = (x + tx) / 2 + range(rng, -50, 50)
  const my = (y + ty) / 2 + range(rng, -50, 50)
  ctx.beginPath()
  inkStroke(ctx, 5.5)
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(mx, my, tx, ty)
  ctx.stroke()
  const ang = Math.atan2(ty - my, tx - mx)
  const hl = 26
  ctx.beginPath()
  ctx.moveTo(tx - hl * Math.cos(ang - 0.45), ty - hl * Math.sin(ang - 0.45))
  ctx.lineTo(tx, ty)
  ctx.lineTo(tx - hl * Math.cos(ang + 0.45), ty - hl * Math.sin(ang + 0.45))
  ctx.stroke()
}

function doodleSquiggle(ctx: Ctx, x: number, y: number, w: number, rng: Rng) {
  ctx.beginPath()
  inkStroke(ctx, 5)
  ctx.moveTo(x, y)
  const waves = 3 + Math.floor(rng() * 2)
  const step = w / waves
  for (let i = 0; i < waves; i++) {
    ctx.quadraticCurveTo(
      x + step * (i + 0.5),
      y + (i % 2 === 0 ? -1 : 1) * range(rng, 12, 22),
      x + step * (i + 1),
      y + range(rng, -4, 4),
    )
  }
  ctx.stroke()
}

function doodleDashes(ctx: Ctx, x: number, y: number, rng: Rng, angle = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  inkStroke(ctx, 5)
  const n = 3 + Math.floor(rng() * 2)
  for (let i = 0; i < n; i++) {
    ctx.beginPath()
    handLine(ctx, i * 34, 0, i * 34 + 18, 0, rng, 2)
    ctx.stroke()
  }
  ctx.restore()
}

function doodleDots(ctx: Ctx, x: number, y: number, rng: Rng) {
  ctx.fillStyle = 'rgba(66,56,45,0.8)'
  const n = 5 + Math.floor(rng() * 4)
  for (let i = 0; i < n; i++) {
    ctx.beginPath()
    ctx.arc(x + range(rng, -34, 34), y + range(rng, -22, 22), range(rng, 2.4, 4.4), 0, Math.PI * 2)
    ctx.fill()
  }
}

function doodleCross(ctx: Ctx, x: number, y: number, rng: Rng) {
  const s = range(rng, 10, 16)
  ctx.beginPath()
  inkStroke(ctx, 5)
  handLine(ctx, x - s, y - s, x + s, y + s, rng, 2)
  handLine(ctx, x + s, y - s, x - s, y + s, rng, 2)
  ctx.stroke()
}

function doodleArcs(ctx: Ctx, x: number, y: number, rng: Rng) {
  inkStroke(ctx, 4.5)
  const n = 2 + Math.floor(rng() * 2)
  for (let i = 0; i < n; i++) {
    ctx.beginPath()
    const r = 20 + i * 13
    const a0 = range(rng, -2.4, -2.0)
    ctx.arc(x, y, r, a0, a0 + range(rng, 0.7, 1.0))
    ctx.stroke()
  }
}

function doodleSteam(ctx: Ctx, x: number, y: number, rng: Rng) {
  inkStroke(ctx, 4.5)
  for (let i = 0; i < 2; i++) {
    ctx.beginPath()
    const sx = x + i * 28
    ctx.moveTo(sx, y)
    ctx.bezierCurveTo(
      sx - range(rng, 8, 14), y - 22,
      sx + range(rng, 8, 14), y - 40,
      sx - range(rng, 4, 10), y - 60,
    )
    ctx.stroke()
  }
}

/* ------------------------------ Main render ------------------------------ */

function coverCrop(iw: number, ih: number, tw: number, th: number) {
  const scale = Math.max(tw / iw, th / ih)
  const sw = tw / scale
  const sh = th / scale
  return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh }
}

function drawTopHalf(ctx: Ctx, img: HTMLImageElement, rng: Rng) {
  const { sx, sy, sw, sh } = coverCrop(img.naturalWidth, img.naturalHeight, POSTER_W, SPLIT_Y)
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, POSTER_W, SPLIT_Y)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, POSTER_W, SPLIT_Y)
  ctx.clip()

  // Warm magazine tint.
  ctx.globalCompositeOperation = 'overlay'
  ctx.fillStyle = 'rgba(255,196,120,0.10)'
  ctx.fillRect(0, 0, POSTER_W, SPLIT_Y)
  // Lifted blacks (faded film shadows).
  ctx.globalCompositeOperation = 'lighten'
  ctx.fillStyle = 'rgb(26,22,20)'
  ctx.fillRect(0, 0, POSTER_W, SPLIT_Y)
  // Gentle vignette.
  ctx.globalCompositeOperation = 'multiply'
  const vg = ctx.createRadialGradient(
    POSTER_W / 2, SPLIT_Y / 2, POSTER_W * 0.34,
    POSTER_W / 2, SPLIT_Y / 2, POSTER_W * 0.78,
  )
  vg.addColorStop(0, 'rgba(255,255,255,1)')
  vg.addColorStop(1, 'rgba(226,220,212,1)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, POSTER_W, SPLIT_Y)
  ctx.restore()

  addGrain(ctx, 0, 0, POSTER_W, SPLIT_Y, 0.055, rng)
}

function drawPaper(ctx: Ctx, rng: Rng) {
  const g = ctx.createLinearGradient(0, SPLIT_Y, 0, POSTER_H)
  g.addColorStop(0, PAPER)
  g.addColorStop(1, PAPER_DEEP)
  ctx.fillStyle = g
  ctx.fillRect(0, SPLIT_Y, POSTER_W, POSTER_H - SPLIT_Y)
  addGrain(ctx, SPLIT_Y === 0 ? 0 : 0, SPLIT_Y, POSTER_W, POSTER_H - SPLIT_Y, 0.03, rng)
  // Hard, clean split line.
  ctx.fillStyle = 'rgba(60,50,40,0.16)'
  ctx.fillRect(0, SPLIT_Y, POSTER_W, 3)
}

interface Layout {
  /** true = art composition on the right, text on the left. */
  artOnRight: boolean
  artCx: number
  artCy: number
  textX: number
}

function drawMatteBlocks(ctx: Ctx, a: Analysis, layout: Layout, rng: Rng) {
  const colors = a.palette.slice(0, 4)
  const nBlocks = Math.min(colors.length, 2 + Math.floor(rng() * 2))
  for (let i = 0; i < nBlocks; i++) {
    const c = mix(colors[(i + 1) % colors.length], PAPER_RGB, 0.12)
    ctx.save()
    ctx.globalAlpha = 0.92
    ctx.fillStyle = rgb(c)
    const bx = layout.artCx + range(rng, -190, 190)
    const by = layout.artCy + range(rng, -170, 190)
    if (rng() < 0.5) {
      blobPath(ctx, bx, by, range(rng, 130, 235), range(rng, 110, 200), rng)
      ctx.fill()
    } else {
      ctx.translate(bx, by)
      ctx.rotate(range(rng, -0.09, 0.09))
      const w = range(rng, 200, 360)
      const h = range(rng, 170, 330)
      tornRectPath(ctx, -w / 2, -h / 2, w, h, rng, 6)
      ctx.fill()
    }
    ctx.restore()
  }
}

function drawSlices(ctx: Ctx, img: HTMLImageElement, a: Analysis, layout: Layout, rng: Rng) {
  const r = a.objectRect
  const nSlices = 1 + Math.floor(rng() * 3) // 1..3

  // Main slice — the object study.
  const mainW = range(rng, 480, 560)
  const mainH = mainW * range(rng, 0.92, 1.1)
  drawOneSlice(ctx, img, r.x, r.y, r.w, r.h, layout.artCx, layout.artCy, mainW, mainH,
    range(rng, -0.05, 0.05), rng)

  // Optional small detail slices from sub-regions of the object.
  for (let i = 1; i < nSlices; i++) {
    const subW = r.w * 0.45
    const sx = r.x + range(rng, 0, r.w - subW)
    const sy = r.y + range(rng, 0, r.h - subW)
    const size = range(rng, 150, 220)
    const px = layout.artCx + (rng() < 0.5 ? -1 : 1) * range(rng, 250, 330)
    const py = layout.artCy + (rng() < 0.5 ? -1 : 1) * range(rng, 200, 300)
    drawOneSlice(ctx, img, sx, sy, subW, subW, px, py, size, size, range(rng, -0.14, 0.14), rng)
  }
}

function drawOneSlice(
  ctx: Ctx, img: HTMLImageElement,
  sx: number, sy: number, sw: number, sh: number,
  cx: number, cy: number, w: number, h: number,
  rot: number, rng: Rng,
) {
  cy = Math.min(Math.max(cy, SPLIT_Y + 120 + h / 2), POSTER_H - 150 - h / 2)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rot)
  ctx.shadowColor = 'rgba(70,58,42,0.28)'
  ctx.shadowBlur = 22
  ctx.shadowOffsetY = 10
  tornRectPath(ctx, -w / 2, -h / 2, w, h, rng, 8)
  ctx.fillStyle = PAPER
  ctx.fill()
  ctx.shadowColor = 'transparent'
  tornRectPath(ctx, -w / 2, -h / 2, w, h, rng, 8)
  ctx.clip()
  const crop = coverCrop(sw, sh, w, h)
  ctx.drawImage(img, sx + crop.sx, sy + crop.sy, crop.sw, crop.sh, -w / 2, -h / 2, w, h)
  // Matte the slice down toward paper so it reads as print, not gloss.
  ctx.fillStyle = 'rgba(245,239,227,0.12)'
  ctx.fillRect(-w / 2, -h / 2, w, h)
  ctx.restore()
}

function drawDoodles(ctx: Ctx, layout: Layout, rng: Rng) {
  const n = 3 + Math.floor(rng() * 5) // 3..7
  const placed: [number, number][] = []
  const kinds = ['arrow', 'squiggle', 'dashes', 'dots', 'cross', 'arcs', 'steam']
  const shuffled = [...kinds].sort(() => rng() - 0.5)
  for (let i = 0; i < n; i++) {
    const kind = shuffled[i % shuffled.length]
    const ang = range(rng, 0, Math.PI * 2)
    const dist = range(rng, 320, 430)
    const x = Math.min(Math.max(layout.artCx + Math.cos(ang) * dist, 90), POSTER_W - 110)
    const y = Math.min(Math.max(layout.artCy + Math.sin(ang) * dist * 0.85, SPLIT_Y + 90), POSTER_H - 110)
    if (placed.some(([px, py]) => Math.hypot(px - x, py - y) < 130)) continue
    placed.push([x, y])
    switch (kind) {
      case 'arrow': {
        const tx = layout.artCx + (x < layout.artCx ? -1 : 1) * 280
        const ty = layout.artCy + range(rng, -160, 160)
        doodleArrow(ctx, x, y, tx, ty, rng)
        break
      }
      case 'squiggle':
        doodleSquiggle(ctx, x - 60, y, range(rng, 90, 150), rng)
        break
      case 'dashes':
        doodleDashes(ctx, x - 40, y, rng, range(rng, -0.5, 0.5))
        break
      case 'dots':
        doodleDots(ctx, x, y, rng)
        break
      case 'cross':
        doodleCross(ctx, x, y, rng)
        break
      case 'arcs':
        doodleArcs(ctx, x, y, rng)
        break
      case 'steam':
        doodleSteam(ctx, x, y - 20, rng)
        break
    }
  }
}

function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawTypography(ctx: Ctx, text: PosterText, layout: Layout, rng: Rng) {
  const x = layout.textX
  let y = SPLIT_Y + (POSTER_H - SPLIT_Y) * 0.42
  const align: CanvasTextAlign = layout.artOnRight ? 'left' : 'right'
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'

  // Title — handwritten-feel caps, wrapped if needed.
  ctx.fillStyle = INK
  ctx.font = '116px "Patrick Hand"'
  const titleLines = wrapText(ctx, text.title, 560)
  ctx.save()
  ctx.rotate(range(rng, -0.008, 0.008))
  for (const line of titleLines) {
    ctx.fillText(line, x, y)
    y += 118
  }
  ctx.restore()
  y -= 26

  // Hand underline.
  ctx.beginPath()
  inkStroke(ctx, 5)
  const uw = 300
  const ux0 = align === 'left' ? x : x - uw
  handLine(ctx, ux0, y, ux0 + uw, y + range(rng, -4, 4), rng, 3)
  ctx.stroke()
  y += 78

  // OBJECT NOTE label.
  ctx.fillStyle = INK
  ctx.font = '600 42px Archivo'
  const prevSpacing = ctx.letterSpacing
  ctx.letterSpacing = '10px'
  ctx.fillText('OBJECT NOTE 01', x, y)
  ctx.letterSpacing = prevSpacing
  y += 26
  ctx.beginPath()
  inkStroke(ctx, 3.5)
  const lw = 356
  const lx0 = align === 'left' ? x : x - lw
  handLine(ctx, lx0, y, lx0 + lw, y, rng, 2)
  ctx.stroke()
  y += 84

  // Observation note.
  ctx.fillStyle = INK_SOFT
  ctx.font = '52px "Patrick Hand"'
  for (const line of wrapText(ctx, text.note, 520)) {
    ctx.fillText(line, x, y)
    y += 66
  }
}

export async function renderPoster(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  seed: number,
): Promise<PosterText> {
  await document.fonts.load('116px "Patrick Hand"')
  await document.fonts.load('600 42px Archivo')

  canvas.width = POSTER_W
  canvas.height = POSTER_H
  const ctx = canvas.getContext('2d')!
  const rng = mulberry32(seed)
  const analysis = analyzeImage(img)
  const text = generateText(analysis, rng)

  const artOnRight = rng() < 0.5
  const layout: Layout = {
    artOnRight,
    artCx: artOnRight ? POSTER_W * 0.66 : POSTER_W * 0.34,
    artCy: SPLIT_Y + (POSTER_H - SPLIT_Y) * 0.52,
    textX: artOnRight ? POSTER_W * 0.075 : POSTER_W * 0.925,
  }

  drawTopHalf(ctx, img, rng)
  drawPaper(ctx, rng)
  drawMatteBlocks(ctx, analysis, layout, rng)
  drawSlices(ctx, img, analysis, layout, rng)
  drawDoodles(ctx, layout, rng)
  drawTypography(ctx, text, layout, rng)

  return text
}
