# Jev Playground

An interactive lab for **TypeSafe System One (Jev)** — a model purpose-built for *typed decisions*. Instead of free-form text, you give Jev a **state** (any text or JSON blob) and a set of **typed questions**, and it returns structured, probability-weighted answers:

- **choice** — pick one of several named labels (e.g. ticket triage: `billing` / `technical` / `other`)
- **score** — a score on an ordered rubric you define (e.g. urgency from 0 to 4)
- **noul** — a yes/no answer as a probability (e.g. "should the agent continue?")

This app lets you paste/edit a state blob, build questions with the SDK's `choice` / `score` / `noul` helpers, run `systemOne`, and inspect the typed answers, raw response JSON, and elapsed time.

- SDK: [`@typesafe-ai/sdk`](https://github.com/typesafe-ai/typesafe-sdk-js)
- Docs: [docs.typesafe.ai](https://docs.typesafe.ai/)

## Run it

```sh
bun install
bun run dev
```

Open http://localhost:5173. **No API key is required** — without one, the app runs in a deterministic **mock / dry-run mode** that mirrors the live response shape exactly (same fields, realistic latency), so the UI is identical either way.

> **Note:** TypeSafe has **paused new signups** as of 2026-09-22, so mock mode is the default experience unless you already have an account.

## Live mode

If you have a TypeSafe API key, export it before starting the dev server:

```sh
export TYPESAFE_API_KEY=sk-...
bun run dev
```

The header badge switches to **Live** and runs go to the real API. A "Force dry run" toggle lets you compare mock output while a key is set.

### The key never reaches the browser

The Vite dev server hosts a tiny API (`server/plugin.ts`):

- `GET /api/status` — reports whether a key is configured (a boolean, never the key)
- `POST /api/systemone` — runs `TypeSafeClient.systemOne` server-side with the env key

The SDK has a `dangerouslyAllowBrowser` option; this demo deliberately does **not** use it. Only the pure question helpers (`choice`, `score`, `noul`) run in the browser.

## How it works

```ts
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

const client = new TypeSafeClient(); // reads TYPESAFE_API_KEY
const { answers } = await client.systemOne({
  state: { document: "I was charged twice. Please fix this ASAP." },
  questions: {
    category: choice("What is this ticket about?", {
      billing: null,
      technical: null,
      other: null,
    }),
  },
});
// answers.category.choice === "billing", with per-label probabilities
```

The mock engine (`server/mock.ts`) hashes the state + questions to produce deterministic fake probabilities in the exact `SystemOneResult` shape, with ~10–40 ms simulated latency.

## Stack

Bun · Vite · React · TypeScript · Tailwind CSS v4 · shadcn/ui · `@typesafe-ai/sdk` 0.6
