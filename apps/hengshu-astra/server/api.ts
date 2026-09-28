import type { Connect, Plugin } from "vite"

/**
 * Dev-server API route: POST /api/generate
 *
 * Runs inside the Vite dev server (Node/Bun side) so OPENAI_API_KEY is read
 * from the process environment and never shipped to the client bundle.
 */

const MODEL = "gpt-6-astra"

interface GenerateRequest {
  theme: string
  size: number
}

interface PoemPayload {
  title: string
  grid: string[][]
  horizontal: { zh: string; en: string }[]
  vertical: { zh: string; en: string }[]
  note?: string
}

function systemPrompt(size: number): string {
  return [
    "You are a master of classical Chinese constrained poetry, specialising in 横竖诗 (Hengshu / omnidirectional poems).",
    `Compose a ${size}×${size} grid of single Chinese characters (regular script, no punctuation) for the user's theme.`,
    "Hard constraints:",
    `- Every ROW, read left to right, must be a coherent, grammatical ${size}-character line of classical-style Chinese poetry.`,
    `- Every COLUMN, read top to bottom, must ALSO be a coherent, grammatical ${size}-character line.`,
    "- All rows together and all columns together should each cohere as a poem on the theme.",
    "- Do not use punctuation, Latin letters, or digits inside the grid.",
    "Respond with ONLY a JSON object, no markdown fences, of the shape:",
    `{"title": string (short Chinese title), "grid": string[${size}][${size}] (one character per cell), "horizontal": [{"zh": string, "en": string} x ${size}] (each row as a line plus a faithful English gloss), "vertical": [{"zh": string, "en": string} x ${size}] (each column as a line plus gloss), "note": string (one short English sentence on the technique used)}`,
    "The zh strings must exactly match the grid rows/columns. Verify before answering.",
  ].join("\n")
}

function validate(payload: unknown, size: number): PoemPayload {
  const p = payload as PoemPayload
  if (!p || !Array.isArray(p.grid)) throw new Error("model response missing grid")
  if (p.grid.length !== size || p.grid.some((r) => !Array.isArray(r) || r.length !== size))
    throw new Error(`model returned a malformed ${size}×${size} grid`)
  for (const row of p.grid)
    for (const cell of row)
      if (typeof cell !== "string" || [...cell].length !== 1)
        throw new Error("grid cells must be single characters")
  const lines = (a: unknown): a is { zh: string; en: string }[] =>
    Array.isArray(a) && a.length === size && a.every((l) => l && typeof l.zh === "string" && typeof l.en === "string")
  if (!lines(p.horizontal) || !lines(p.vertical)) throw new Error("model response missing readings")
  // Trust but verify: readings must match the grid characters.
  const rowStr = (i: number) => p.grid[i].join("")
  const colStr = (j: number) => p.grid.map((r) => r[j]).join("")
  for (let i = 0; i < size; i++) {
    if (p.horizontal[i].zh !== rowStr(i)) p.horizontal[i].zh = rowStr(i)
    if (p.vertical[i].zh !== colStr(i)) p.vertical[i].zh = colStr(i)
  }
  return { title: typeof p.title === "string" ? p.title : "无题", grid: p.grid, horizontal: p.horizontal, vertical: p.vertical, note: typeof p.note === "string" ? p.note : undefined }
}

async function readBody(req: Connect.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString("utf8")
}

async function callModel(theme: string, size: number, apiKey: string): Promise<PoemPayload> {
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "")
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt(size) },
        { role: "user", content: `主题 / theme: ${theme}` },
      ],
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`upstream ${res.status}: ${text.slice(0, 300)}`)
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error("upstream returned no content")
  return validate(JSON.parse(content), size)
}

export function hengshuApi(): Plugin {
  return {
    name: "hengshu-api",
    configureServer(server) {
      server.middlewares.use("/api/generate", async (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status
          res.setHeader("content-type", "application/json")
          res.end(JSON.stringify(body))
        }
        if (req.method !== "POST") return send(405, { error: { code: "method_not_allowed" } })
        try {
          const { theme, size } = JSON.parse(await readBody(req)) as GenerateRequest
          const gridSize = Math.min(7, Math.max(4, Math.trunc(size) || 5))
          if (!theme?.trim()) return send(400, { error: { code: "bad_request", message: "theme is required" } })
          const apiKey = process.env.OPENAI_API_KEY
          if (!apiKey)
            return send(503, { error: { code: "no_api_key", message: "OPENAI_API_KEY is not set on the server" } })
          const poem = await callModel(theme.trim(), gridSize, apiKey)
          return send(200, { poem, source: "model", model: MODEL })
        } catch (err) {
          return send(502, { error: { code: "generation_failed", message: err instanceof Error ? err.message : String(err) } })
        }
      })
    },
  }
}
