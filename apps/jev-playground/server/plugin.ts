/**
 * Vite dev-server middleware exposing a tiny API so TYPESAFE_API_KEY stays
 * server-side. The browser never sees the key and the SDK's
 * `dangerouslyAllowBrowser` flag is never enabled.
 *
 *   GET  /api/status     -> { live: boolean }
 *   POST /api/systemone  -> { mode: "live" | "mock", elapsedMs, result }
 */
import type { IncomingMessage, ServerResponse } from "node:http"
import { APIError, TypeSafeClient, type Questions } from "@typesafe-ai/sdk"
import type { Plugin } from "vite"
import { mockSystemOne } from "./mock.ts"

function hasApiKey(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY?.trim())
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(body))
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(chunk as Buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

interface RunRequest {
  state: unknown
  questions: Questions
  forceMock?: boolean
}

async function handleRun(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: RunRequest
  try {
    body = (await readJsonBody(req)) as RunRequest
  } catch {
    sendJson(res, 400, { error: "Request body must be valid JSON." })
    return
  }

  const { state, questions, forceMock } = body
  if (!questions || typeof questions !== "object" || Object.keys(questions).length === 0) {
    sendJson(res, 400, { error: "At least one question is required." })
    return
  }

  const live = hasApiKey() && !forceMock
  const startedAt = performance.now()

  try {
    const result = live
      ? await new TypeSafeClient().systemOne({
          state: state as never,
          questions,
        })
      : await mockSystemOne(state, questions)
    const elapsedMs = Math.round(performance.now() - startedAt)
    sendJson(res, 200, { mode: live ? "live" : "mock", elapsedMs, result })
  } catch (error) {
    if (error instanceof APIError) {
      sendJson(res, 502, {
        error: `TypeSafe API error (HTTP ${error.status}): ${error.message}`,
      })
      return
    }
    sendJson(res, 502, { error: error instanceof Error ? error.message : String(error) })
  }
}

export function systemOneApi(): Plugin {
  return {
    name: "jev-playground-systemone-api",
    configureServer(server) {
      server.middlewares.use("/api/status", (req, res, next) => {
        if (req.method !== "GET") return next()
        sendJson(res, 200, { live: hasApiKey() })
      })
      server.middlewares.use("/api/systemone", (req, res, next) => {
        if (req.method !== "POST") return next()
        void handleRun(req, res)
      })
    },
  }
}
