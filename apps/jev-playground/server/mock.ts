/**
 * Deterministic mock of the TypeSafe System One API.
 *
 * Mirrors the exact response shape of `TypeSafeClient.systemOne` so the UI
 * renders identically in mock and live mode. Answers are derived from a hash
 * of the state + question, so the same input always yields the same output.
 */
import type { Question, Questions } from "@typesafe-ai/sdk"

interface MockAnswerNoul {
  type: "noul"
  noul: number
}

interface MockAnswerChoice {
  type: "choice"
  choice: string
  confidence: number
  probabilities: Record<string, number>
}

interface MockAnswerScore {
  type: "score"
  score: number
  confidence: number
  legend: Record<string, unknown>
  probabilities: Record<string, number>
}

type MockAnswer = MockAnswerNoul | MockAnswerChoice | MockAnswerScore

export interface MockResult {
  model: string
  answers: Record<string, MockAnswer>
  usage: { input_tokens: number; output_tokens: number }
}

/** FNV-1a 32-bit hash for deterministic seeding. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32 PRNG: tiny, seedable, good enough for fake probabilities. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000
}

/** Random weights sharpened with an exponent so one option clearly "wins". */
function sharpProbabilities(keys: string[], rng: () => number): Record<string, number> {
  const weights = keys.map(() => Math.pow(rng(), 3) + 0.02)
  const total = weights.reduce((sum, w) => sum + w, 0)
  const probabilities: Record<string, number> = {}
  keys.forEach((key, i) => {
    probabilities[key] = round(weights[i] / total)
  })
  return probabilities
}

function answerQuestion(name: string, question: Question, stateText: string): MockAnswer {
  const rng = mulberry32(fnv1a(`${stateText}::${name}::${JSON.stringify(question)}`))

  if (question.type === "noul") {
    return { type: "noul", noul: round(0.02 + rng() * 0.96) }
  }

  if (question.type === "choice") {
    const labels = Object.keys(question.criteria)
    const probabilities = sharpProbabilities(labels, rng)
    const choice = labels.reduce((best, label) =>
      probabilities[label] > probabilities[best] ? label : best,
    )
    return { type: "choice", choice, confidence: probabilities[choice], probabilities }
  }

  const indices = question.criteria.map((_, i) => String(i))
  const probabilities = sharpProbabilities(indices, rng)
  const score = indices.reduce((sum, key) => sum + Number(key) * probabilities[key], 0)
  const confidence = Math.max(...indices.map((key) => probabilities[key]))
  const legend = Object.fromEntries(question.criteria.map((entry, i) => [String(i), entry]))
  return { type: "score", score: round(score), confidence, legend, probabilities }
}

export async function mockSystemOne(state: unknown, questions: Questions): Promise<MockResult> {
  const stateText = JSON.stringify(state)
  const seed = fnv1a(stateText + JSON.stringify(questions))
  // Realistic-feeling latency (~10-40 ms), deterministic per input.
  const latency = 10 + (seed % 31)
  await new Promise((resolve) => setTimeout(resolve, latency))

  const answers: Record<string, MockAnswer> = {}
  for (const [name, question] of Object.entries(questions)) {
    answers[name] = answerQuestion(name, question, stateText)
  }

  const inputTokens = Math.ceil((stateText.length + JSON.stringify(questions).length) / 4)
  return {
    model: "jev-mock (dry run)",
    answers,
    usage: { input_tokens: inputTokens, output_tokens: Object.keys(questions).length * 3 },
  }
}
