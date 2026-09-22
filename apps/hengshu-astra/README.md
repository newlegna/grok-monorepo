# 横竖 Hengshu · GPT-6 Astra

A single-user playground for **Hengshu (横竖) poems** — omnidirectional Chinese verse laid out
as a character grid where **every row reads left-to-right and every column reads top-to-bottom
as a coherent line**. Inspired by [Cheng Lou's GPT-6 Astra demo](https://x.com/_chenglou/status/2095695694082564329).

Type a theme, pick a grid size (4×4–7×7), and `gpt-6-astra` composes a constrained poem.
Hover or focus any row, column, or character to trace a reading path; toggle English glosses;
copy the grid or any single reading.

## Run

```sh
bun install
bun run dev
```

Then open http://localhost:5173 (Vite's default port).

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | no | API key for the OpenAI-compatible Chat Completions endpoint. Read **server-side only**, inside the Vite dev server middleware (`server/api.ts`) — it is never exposed to the browser and must not be put in any `VITE_*` variable. |
| `OPENAI_BASE_URL` | no | Override the API base URL (defaults to `https://api.openai.com/v1`). |

Without a key the app stays fully demoable: generating falls back to a clearly-labeled
**offline sample** — hand-authored, genuinely valid Hengshu poems built with diagonal symmetry
(the grid equals its transpose, so rows and columns share readings), including lines after
Du Fu (春风花草香) and Wang Shifu (花落水流红).

## How it works

- `server/api.ts` — a Vite dev-server middleware exposing `POST /api/generate`. It prompts
  `gpt-6-astra` with the Hengshu constraints, requests strict JSON, validates the grid shape,
  and normalizes readings to match the grid.
- `src/lib/poem.ts` — types, the client fetch, and the offline sample poems.
- `src/components/PoemGrid.tsx` — the interactive N×N grid with row/column/crosshair highlighting.
- `src/components/ReadingsPanel.tsx` — horizontal + vertical readings, bilingual toggle, per-line copy.

## Out of scope

Accounts, auth, sharing, persistence, streaming animations, multi-user.
