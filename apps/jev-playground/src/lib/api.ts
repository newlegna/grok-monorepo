import type { Questions } from "@typesafe-ai/sdk"

export interface NoulAnswer {
  type: "noul"
  noul: number
}

export interface ChoiceAnswer {
  type: "choice"
  choice: string
  confidence: number
  probabilities: Record<string, number>
}

export interface ScoreAnswer {
  type: "score"
  score: number
  confidence: number
  legend: Record<string, unknown>
  probabilities: Record<string, number>
}

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer

export interface RunResult {
  model: string
  answers: Record<string, Answer>
  usage: { input_tokens: number; output_tokens: number }
}

export interface RunResponse {
  mode: "live" | "mock"
  elapsedMs: number
  result: RunResult
}

export async function fetchStatus(): Promise<{ live: boolean }> {
  const res = await fetch("/api/status")
  if (!res.ok) throw new Error(`Status check failed (HTTP ${res.status})`)
  return res.json()
}

export async function runSystemOne(
  state: unknown,
  questions: Questions,
  forceMock: boolean,
): Promise<RunResponse> {
  const res = await fetch("/api/systemone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, questions, forceMock }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? `Request failed (HTTP ${res.status})`)
  return body as RunResponse
}
