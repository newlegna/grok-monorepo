# PLAN — Hengshu Astra (横竖)

## Goal

A single-user playground where you enter a theme/seed phrase, call `gpt-6-astra`, and get a constrained multi-direction (Hengshu) Chinese poem rendered as an interactive character grid with a bilingual toggle.

## Single-user MVP

- One screen, dark editorial UI: title, a short explanation of Hengshu (poems that read correctly both across and down), theme input, grid-size picker (4×4–7×7), generate button.
- Generate calls an OpenAI-compatible Chat Completions endpoint with model `gpt-6-astra`, via a tiny server route inside the Vite dev server so `OPENAI_API_KEY` never reaches the client. The system prompt constrains output to a strict JSON grid where every row and every column is a coherent classical-Chinese line, plus English glosses.
- If no key is configured (or the API fails), fall back to a clearly-labeled offline mock: hand-authored, genuinely valid Hengshu sample poems (diagonal-symmetric construction so rows ≡ columns — a real classical technique), so the whole UI is demoable without secrets.
- Grid interaction: hover/focus any row or column to highlight that reading path in the grid and its line in the readings panel. Horizontal readings and vertical readings listed beside the grid.
- Bilingual toggle: Chinese-only vs. Chinese + English gloss per reading.
- Copy-to-clipboard: whole grid, and each individual reading.
- Loading and error states (spinner during generation; readable error with mock fallback offer).

### Explicit outs

- No auth, no accounts, no persistence, no sharing/social, no multi-user.
- No streaming/animated "poetry theater".
- No key input in the browser; key is server-side env only.
- No new GitHub repo; everything lives under `apps/hengshu-astra/`.

## Tasks (outcome-oriented)

1. App scaffolded with `bunx create-vite` (react-ts), `bunfig.toml` with `minimumReleaseAge` committed before any install, Tailwind v4 + shadcn/ui wired up.
2. Dev API route `POST /api/generate` (Vite server middleware) that calls `gpt-6-astra` with a Hengshu-constraint system prompt, validates the JSON shape, and returns `{ grid, horizontal, vertical, glosses }`; returns a typed "no key" response when `OPENAI_API_KEY` is unset.
3. Offline mock module with hand-authored valid sample poems (5×5 spring poem, 4×4 moon-water poem) including English glosses.
4. Interactive grid component: row/column hover + keyboard focus highlighting, synced with the readings panel.
5. Readings panel with bilingual toggle and per-line copy; grid copy button; toasts.
6. Loading/error states covered; empty state shows the sample poem so the app is never blank.
7. README with `bun install && bun run dev`, `OPENAI_API_KEY` docs, and port (5173).

## Stack

- **Bun** — required runtime/package manager for this monorepo.
- **Vite + React + TypeScript** (`bunx create-vite`) — official scaffold, ideal for a one-screen utility; its dev server also hosts the API route so no second process is needed.
- **Tailwind CSS v4** — utility styling that shadcn/ui builds on; fastest path to a polished dark editorial look.
- **shadcn/ui** — house rule; prebuilt accessible Button/Input/Select/Switch/Card components added on demand.
- **No client OpenAI SDK** — one `fetch` from a Vite middleware is boring and keeps the key server-side.

## Deferred

- Real streaming token-by-token grid fill animation.
- Verification pass (second model call to score reading validity both ways).
- Diagonal / reverse (回文) reading directions beyond rows and columns.
- Export as image / share links.
- Cloudflare Pages function variant of the API route (repo uses one Pages project; wire the path when deploying).
