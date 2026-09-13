# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout: one git repo, app in a subfolder

```
StockTracker/              ← the only git repo (remote: github.com/ingcarlostello/StocksTracker)
├── .gitignore             ← root-only: /node_modules/, .DS_Store
├── package.json           ← only next-devtools-mcp (MCP server), not the app
├── .claude/rules/         ← architecture + UI reference rules (auto-loaded)
├── .mcp.json              ← next-devtools MCP server
├── docs/design/           ← UI mockup (ui-reference.jpg)
└── stocks_investments/    ← the entire Next.js app (plain folder, own .gitignore)
```

Until 2026-09-12 `stocks_investments/` was a separate embedded repo recorded as a gitlink, so its code never reached GitHub. It is now versioned as normal files of the root repo (commit `e2f4b85`); the old inner history (2 commits) is kept outside the repo at `../stocks_investments-git-backup`. There must be no `stocks_investments/.git` again: `git add` on a folder containing one records a gitlink instead of files.

Consequences:

- All application code, its `package.json`, and its `node_modules/` live in `stocks_investments/`. **Run every npm command from there**, not from the repo root (the root `package.json` only exists for the MCP server).
- `stocks_investments/.gitignore` keeps ignoring the app's `node_modules`, `.next`, `.env*` (except `.env.example`) and `next-env.d.ts`; the root `.gitignore` only covers root-level files.
- Turbopack's root is pinned to the app folder in `next.config.ts`, because the repo root also contains a `package-lock.json`.

## Commands

Run from `stocks_investments/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build (also type-checks) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (flat config, no args) |
| `npm run typecheck` | `next typegen && tsc --noEmit` — typegen first, so the global `LayoutProps`/`PageProps` types exist |
| `npx convex dev` | Convex dev loop: codegen + push functions, watches `convex/` (needs `.env.local`) |
| `npx convex dev --once` | Single codegen + push, no watch — use it to verify a phase |

**There is no test setup yet.** Vitest (node environment, pure-TS tests only) is scheduled for Phase 4 of the phased plan; until it lands, do not assume a runner exists.

## Stack

Next.js 16.3.5, React 19.2.8, TypeScript 5 (`strict`), Tailwind CSS v4, ESLint 9, Convex 1.45, TanStack Query 5.102.

### Convex

- Project `investtrack` (team `carlos-tello`), dev deployment `brainy-leopard-0`. Dashboard: https://dashboard.convex.dev/t/carlos-tello/investtrack
- `npx convex dev` writes `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` to `stocks_investments/.env.local` (git-ignored). [.env.example](stocks_investments/.env.example) documents every variable; `NEXT_PUBLIC_CONVEX_URL` is the only one that may reach the browser.
- `convex/_generated/` is committed (Convex's own recommendation) so typecheck/build work without running codegen.
- `convex/tsconfig.json` is CLI-generated and has **no `paths`**: the root `@/*` alias does not resolve inside `convex/`, and the CLI can regenerate the file. Policy: **relative imports only** inside `domain/`, `convex/`, `adapters/` and `utils/`, enforced by a `no-restricted-imports` rule in [eslint.config.mjs](stocks_investments/eslint.config.mjs). Verified in Phase 1 that a Convex push bundles `../domain/...` correctly.
- Since Convex 1.31 `ctx.db.get/patch/replace/delete` take the table name first: `ctx.db.get("transactions", id)`.
- Do **not** run `npx convex ai-files install`: it writes AGENTS/CLAUDE files into `stocks_investments/`, which are volatile there (see below). The "Convex AI files are not installed" notice is safe to ignore.
- The `convex` MCP server (`~/.claude.json`) can run functions and inspect tables on the dev deployment.

### Client providers

[app/providers.tsx](stocks_investments/app/providers.tsx) (`"use client"`) nests `ConvexProvider` and `QueryClientProvider`; [lib/query-client.ts](stocks_investments/lib/query-client.ts) follows the local Next 16 TanStack guide (new `QueryClient` per server render, one module-scoped client in the browser). `app/layout.tsx` stays a Server Component and only wraps `{children}` with `<Providers>`. Convex hooks are for transactions; TanStack Query is reserved for market prices fetched through a Next.js Route Handler (later phases). `@convex-dev/react-query` and `cacheComponents` are deliberately not used.

### Next.js 16 differs from older Next.js

`stocks_investments/AGENTS.md` warns that this version has breaking changes relative to model training data. Read the relevant guide in `stocks_investments/node_modules/next/dist/docs/` (`01-app/` covers the App Router) before writing framework code.

A concrete example already in the codebase: [app/layout.tsx](stocks_investments/app/layout.tsx) types its props as `LayoutProps<"/">` — a globally available, route-aware type generated into `.next/types` by `next dev`, `next build` or `next typegen`, not an imported or hand-written interface. Expect similar generated types (`PageProps<"/route">`, `RouteContext<"/api/…">`) rather than the older manual prop typing.

### Next.js MCP server (`next-devtools`)

[.mcp.json](.mcp.json) at the **repository** root registers `next-devtools-mcp`, as described in `01-app/02-guides/mcp.md`. It lives outside the app folder because Claude Code runs from `StockTracker/`; Claude Code also picks it up when launched from `stocks_investments/`. Like any `.mcp.json` server, it loads only after a one-time approval in an interactive `claude` session (folder trust + server approval).

- `nextjs_index` / `nextjs_call` need `npm run dev` running in `stocks_investments/`; discovery probes ports 3000–3010. `get_errors` and `get_page_metadata` only report on pages open in a browser.
- `nextjs_docs` defaults `project_path` to the MCP process's working directory — the repository root, where `next` is not installed — and falsely answers `upgrade_required`. Always pass `project_path: "stocks_investments"`.

### Tailwind v4 is CSS-first

There is no `tailwind.config.js`. Theme tokens are declared with `@theme inline` inside [app/globals.css](stocks_investments/app/globals.css), which also holds the `:root` light/dark custom properties. PostCSS wires it via the `@tailwindcss/postcss` plugin. Add or change design tokens in that CSS file, not in a JS config.

### Import alias

`@/*` maps to the **`stocks_investments/` root**, not to a `src/` directory — there is no `src/`. The App Router lives directly at `app/`.

## Architecture rules are mandatory

[.claude/rules/architecture.md](.claude/rules/architecture.md) defines the required layering (presentational UI → custom hooks → services → adapters) plus naming conventions (`.type.ts`, `.constants.ts`, `.service.ts`, `.adapter.ts`, `use-*.hook.ts`). Claude Code loads it automatically every session; it is binding on all generated code.

Two points where that document and the current repo do not yet line up:

- It shows a reference tree rooted at `src/`. This project has no `src/` and the `@/*` alias points at the package root, so place those layers at the `stocks_investments/` root (`services/`, `hooks/`, `adapters/`, …) or under `features/<domain>/`.
- None of those layers exist yet. The structure is prescriptive, to be created as features land — not an existing tree to match.

## UI reference is mandatory

[docs/design/ui-reference.jpg](docs/design/ui-reference.jpg) is the approved mockup for the app, **InvestTrack**: Login, Dashboard, Add Transaction, Portfolio, Transactions, and Performance. [.claude/rules/ui-reference.md](.claude/rules/ui-reference.md) is auto-loaded like the architecture rules. It summarizes the screens, components, palette, and formats, and requires opening the image with the Read tool before any UI work.

The image deliberately lives outside `stocks_investments/public/`: it is a design document, not a runtime asset, and everything in `public/` is served with the app.

## Current state and phased plan

Work follows the user's phased spec ("Investment Portfolio Tracker — Desarrollo por fases", 15 phases): implement → verify (`lint`, `typecheck`, `build`, tests once they exist) → report → stop if decisions are pending. Never implement a later phase's functionality early. The approved Phase 0 architecture (folder tree, Convex schema, data flows, Modified Dietz / average-cost methodology, phase-by-phase deliverables) is saved in the user's Claude plans directory; confirmed decisions: Massive free plan (grouped daily endpoint, end-of-day closes), average cost for sells, Total Gain/Loss = unrealized only, Vitest from Phase 4.

Progress: **Phase 1 (setup) done** — Convex + TanStack installed and wired through `app/providers.tsx`, `convex/schema.ts` is an empty `defineSchema({})`, metadata is "InvestTrack". `app/page.tsx` and `app/globals.css` are still the scaffold defaults (replaced in Phase 2). No domain code, services, adapters or market-data integration exist yet.

## Agent instruction files in `stocks_investments/`

- `AGENTS.md` — **regenerated by `next dev`** (see the `BEGIN:nextjs-agent-rules` marker block and `node_modules/next/dist/server/lib/generate-agent-files.js`). Do not put durable project instructions here; they will be overwritten.
- `CLAUDE.md` — contains only `@AGENTS.md`, so it inherits that same volatility.

Durable guidance belongs in this file or in `.claude/rules/`.

The user is solely responsible for all Git operations. The AI ​​is strictly prohibited from executing or automating Git commands (branch, commit, push, merge, etc.). The AI ​​must focus exclusively on code generation and problem-solving.
