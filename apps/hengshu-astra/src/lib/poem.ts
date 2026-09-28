export interface Reading {
  zh: string
  en: string
}

export interface Poem {
  title: string
  grid: string[][]
  horizontal: Reading[]
  vertical: Reading[]
  note?: string
}

export type PoemSource = "model" | "mock"

export type Highlight =
  | { kind: "row"; index: number }
  | { kind: "col"; index: number }
  | { kind: "cell"; row: number; col: number }
  | null

/**
 * Hand-authored offline samples. Both use diagonal symmetry (对角对称) — the
 * grid equals its own transpose, so row i and column i share one reading, a
 * classical technique for poems that scan identically across and down.
 * Every line is real, coherent Chinese; two lines are borrowed from the canon
 * (Du Fu's 春风花草香, Wang Shifu's 花落水流红).
 */
const SPRING_5X5: Poem = {
  title: "暮春",
  grid: [
    ["春", "风", "花", "草", "香"],
    ["风", "吹", "落", "絮", "飞"],
    ["花", "落", "水", "流", "红"],
    ["草", "絮", "流", "春", "雨"],
    ["香", "飞", "红", "雨", "中"],
  ],
  horizontal: [
    { zh: "春风花草香", en: "In the spring wind, flowers and grasses breathe fragrance" },
    { zh: "风吹落絮飞", en: "The breeze stirs fallen willow-down into flight" },
    { zh: "花落水流红", en: "Petals fall — the stream runs crimson" },
    { zh: "草絮流春雨", en: "Grass and catkins drift through the spring rain" },
    { zh: "香飞红雨中", en: "Fragrance floats amid a rain of red petals" },
  ],
  vertical: [
    { zh: "春风花草香", en: "In the spring wind, flowers and grasses breathe fragrance" },
    { zh: "风吹落絮飞", en: "The breeze stirs fallen willow-down into flight" },
    { zh: "花落水流红", en: "Petals fall — the stream runs crimson" },
    { zh: "草絮流春雨", en: "Grass and catkins drift through the spring rain" },
    { zh: "香飞红雨中", en: "Fragrance floats amid a rain of red petals" },
  ],
  note: "Diagonally symmetric grid: each column repeats the reading of its matching row, so the poem scans identically across and down.",
}

const MOON_4X4: Poem = {
  title: "水月",
  grid: [
    ["门", "前", "碧", "水"],
    ["前", "溪", "水", "中"],
    ["碧", "水", "映", "月"],
    ["水", "中", "月", "圆"],
  ],
  horizontal: [
    { zh: "门前碧水", en: "Before the gate, jade-green water" },
    { zh: "前溪水中", en: "Within the waters of the stream ahead" },
    { zh: "碧水映月", en: "The green water mirrors the moon" },
    { zh: "水中月圆", en: "In the water, the moon hangs full" },
  ],
  vertical: [
    { zh: "门前碧水", en: "Before the gate, jade-green water" },
    { zh: "前溪水中", en: "Within the waters of the stream ahead" },
    { zh: "碧水映月", en: "The green water mirrors the moon" },
    { zh: "水中月圆", en: "In the water, the moon hangs full" },
  ],
  note: "Diagonally symmetric grid: each column repeats the reading of its matching row, so the poem scans identically across and down.",
}

const MOON_HINTS = /[月水江湖夜镜]|moon|water|night|lake|river|mirror/i

export function pickMockPoem(theme: string, size: number): Poem {
  if (size <= 4 || MOON_HINTS.test(theme)) return MOON_4X4
  return SPRING_5X5
}

export const DEFAULT_MOCK = SPRING_5X5

export function gridToText(grid: string[][]): string {
  return grid.map((row) => row.join("")).join("\n")
}

interface GenerateOk {
  poem: Poem
  source: "model"
  model: string
}

interface GenerateErr {
  error: { code: string; message?: string }
}

export class NoApiKeyError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not configured on the server")
    this.name = "NoApiKeyError"
  }
}

export async function generatePoem(theme: string, size: number): Promise<GenerateOk> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ theme, size }),
  })
  const body = (await res.json()) as GenerateOk & GenerateErr
  if (res.ok) return body
  if (body.error?.code === "no_api_key") throw new NoApiKeyError()
  throw new Error(body.error?.message ?? `generation failed (${res.status})`)
}
