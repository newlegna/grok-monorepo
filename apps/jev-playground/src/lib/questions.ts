/**
 * Editable question model for the UI, converted to real SDK question objects
 * (via `choice` / `score` / `noul` helpers) right before a run. The helpers
 * are pure functions and safe to use in the browser — only `TypeSafeClient`
 * (and the API key) must stay server-side.
 */
import { choice, noul, score, type Questions } from "@typesafe-ai/sdk"

export interface ChoiceOption {
  label: string
  description: string
}

export type EditableQuestion =
  | { id: string; name: string; type: "choice"; instructions: string; options: ChoiceOption[] }
  | { id: string; name: string; type: "score"; instructions: string; levels: string[] }
  | { id: string; name: string; type: "noul"; instructions: string; yes: string; no: string }

let counter = 0
export function nextId(): string {
  counter += 1
  return `q${counter}-${Date.now().toString(36)}`
}

function orNull(text: string): string | null {
  const trimmed = text.trim()
  return trimmed === "" ? null : trimmed
}

/** Convert the editable model into SDK question objects keyed by name. */
export function toSdkQuestions(editable: EditableQuestion[]): Questions {
  const questions: Questions = {}
  for (const q of editable) {
    const name = q.name.trim()
    if (name === "") continue
    if (q.type === "choice") {
      const criteria = Object.fromEntries(
        q.options.filter((o) => o.label.trim() !== "").map((o) => [o.label.trim(), orNull(o.description)]),
      )
      if (Object.keys(criteria).length < 2) continue
      questions[name] = choice(orNull(q.instructions), criteria)
    } else if (q.type === "score") {
      const levels = q.levels.map((level) => orNull(level))
      if (levels.length < 2) continue
      questions[name] = score(orNull(q.instructions), levels as [unknown, unknown] as never)
    } else {
      questions[name] = noul(orNull(q.instructions), {
        true: orNull(q.yes),
        false: orNull(q.no),
      })
    }
  }
  return questions
}

export function blankQuestion(type: EditableQuestion["type"]): EditableQuestion {
  const id = nextId()
  if (type === "choice") {
    return {
      id,
      name: "",
      type,
      instructions: "",
      options: [
        { label: "", description: "" },
        { label: "", description: "" },
      ],
    }
  }
  if (type === "score") {
    return { id, name: "", type, instructions: "", levels: ["", ""] }
  }
  return { id, name: "", type, instructions: "", yes: "", no: "" }
}

export interface Preset {
  key: string
  label: string
  description: string
  state: string
  questions: EditableQuestion[]
}

export const PRESETS: Preset[] = [
  {
    key: "triage",
    label: "Ticket triage",
    description: "Classify a support ticket with a choice question.",
    state: JSON.stringify(
      { document: "I was charged twice for my subscription this month. Please fix this ASAP." },
      null,
      2,
    ),
    questions: [
      {
        id: nextId(),
        name: "category",
        type: "choice",
        instructions: "What is this ticket about?",
        options: [
          { label: "billing", description: "Charges, refunds, invoices, payment methods" },
          { label: "technical", description: "Bugs, outages, errors, integration problems" },
          { label: "other", description: "Anything else" },
        ],
      },
      {
        id: nextId(),
        name: "refund_requested",
        type: "noul",
        instructions: "Is the customer asking for money back?",
        yes: "",
        no: "",
      },
    ],
  },
  {
    key: "continue",
    label: "Agent guardrail",
    description: "Should the agent keep going? A noul (yes/no) question.",
    state: JSON.stringify(
      {
        goal: "Book the cheapest direct flight from SFO to JFK next Tuesday",
        steps_taken: 14,
        last_action: "Opened the same search results page for the fourth time",
        budget_remaining_usd: 3.1,
      },
      null,
      2,
    ),
    questions: [
      {
        id: nextId(),
        name: "should_continue",
        type: "noul",
        instructions: "Should the agent continue working toward the goal?",
        yes: "The agent is making real progress and should keep going",
        no: "The agent is stuck, looping, or out of budget and should stop",
      },
    ],
  },
  {
    key: "urgency",
    label: "Urgency score",
    description: "Rate urgency on an ordered rubric with a score question.",
    state: JSON.stringify(
      {
        document:
          "Our production database is down and every customer request is failing. Revenue impact is immediate.",
      },
      null,
      2,
    ),
    questions: [
      {
        id: nextId(),
        name: "urgency",
        type: "score",
        instructions: "How urgent is this message?",
        levels: [
          "Not urgent: no action needed soon",
          "Low: handle within the week",
          "Medium: handle within a day",
          "High: handle within the hour",
          "Critical: drop everything, act now",
        ],
      },
    ],
  },
]
