# Agent notes

This is a sticky demo monorepo. Do not create a new GitHub repository.

## Layout

- `apps/<kebab-slug>/` — one self-contained demo per pick
- `tracking/seen-bookmarks.json` — already-proposed bookmarks
- `skills/project-planning/` — MVP planning rules if present

## Rules

- Only add or update files under `apps/<slug>/` unless asked otherwise.
- Use Bun. Include `bunfig.toml` with `[install] minimumReleaseAge = 259200` before `bun install`.
- Scaffold with `bunx create-*`. Prefer shadcn/ui for UI.
- App must run with `bun install && bun run dev`.
- Open one PR. Attach both a screenshot and a video of the running app.
- One Cloudflare Pages project for the repo (path per app), not one project per app.
