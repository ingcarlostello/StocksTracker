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

Until 2026-09-12 `stocks_investments/` was a separate embedded repo recorded as a gitlink, so its code never reached GitHub. It is now versioned as normal files of the root repo (commit `e2f4b85`); its old inner history (2 commits) was verified identical and then discarded. There must be no `stocks_investments/.git` again: `git add` on a folder containing one records a gitlink instead of files.

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
| `npm test` | Vitest, single run (`vitest run`) |
| `npm run test:watch` | Vitest in watch mode |

**Tests:** Vitest 5 with `environment: "node"` ([vitest.config.mts](stocks_investments/vitest.config.mts)), for pure TypeScript only — no jsdom or React Testing Library. Tests are colocated as `*.test.ts` and only picked up under `domain/`, `adapters/`, `features/`, `services/` and `utils/`; the `@/*` alias resolves through Vite 8's native `resolve.tsconfigPaths`. Vitest 5 requires `vite` as a non-optional peer (hence the explicit `vite` devDependency) and `@types/node` ≥ 22 (matches the Node 22 runtime). Do not downgrade to Vitest 4: with Vite 8 installed, npm 10.9's arborist crashes (`Cannot read properties of null (reading 'edgesOut')`) because Vite 8's optional devtools peers request `vitest@*`.

## Stack

Next.js 16.3.5, React 19.2.8, TypeScript 5 (`strict`), Tailwind CSS v4, ESLint 9, Convex 1.45, TanStack Query 5.102, Vitest 5.

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

### Massive MCP server (`massive`)

Also in [.mcp.json](.mcp.json): Massive's remote server (`type: http`, `https://mcp.massive.com/`), added per https://massive.com/docs/ai-tools/clients/claude-code. It authenticates with OAuth (`/mcp` → `massive` → Authenticate), so the config holds no secret, and its access mirrors the account's plan (free Basic). Use it only to explore endpoints and check live response shapes while developing; the app itself calls Massive from the server with `MASSIVE_API_KEY` (Phase 6), never through MCP.

### Playwright MCP server (`playwright`)

Also in [.mcp.json](.mcp.json): `@playwright/mcp` (`npx -y @playwright/mcp@latest`), per https://playwright.dev/docs/getting-started-mcp. It drives a real browser through accessibility snapshots, which makes it useful for checking UI flows against `npm run dev` (http://localhost:3000). It needs Node ≥ 20 and runs headed by default. Add `--headless`, `--browser=…` or `--isolated` to its `args` if needed. It is a development tool only: it is not a dependency of the app and does not replace Vitest.

### Tailwind v4 is CSS-first

There is no `tailwind.config.js`. Theme tokens are declared with `@theme inline` inside [app/globals.css](stocks_investments/app/globals.css), which also holds the `:root` custom properties (dark theme only, values from the mockup). PostCSS wires it via the `@tailwindcss/postcss` plugin. Add or change design tokens in that CSS file, not in a JS config.

### Import alias

`@/*` maps to the **`stocks_investments/` root**, not to a `src/` directory — there is no `src/`. The App Router lives directly at `app/`.

## Architecture rules are mandatory

[.claude/rules/architecture.md](.claude/rules/architecture.md) defines the required layering (presentational UI → custom hooks → services → adapters) plus naming conventions (`.type.ts`, `.constants.ts`, `.service.ts`, `.adapter.ts`, `use-*.hook.ts`). Claude Code loads it automatically every session; it is binding on all generated code.

Two points where that document and the current repo do not yet line up:

- It shows a reference tree rooted at `src/`. This project has no `src/` and the `@/*` alias points at the package root, so place those layers at the `stocks_investments/` root (`services/`, `hooks/`, `adapters/`, …) or under `features/<domain>/`.
- Phase 2 created the top-level layer folders (most still empty with a `.gitkeep`). Files inside them are created as features land — follow the approved plan, not an existing tree.

## UI reference is mandatory

[docs/design/ui-reference.jpg](docs/design/ui-reference.jpg) is the approved mockup for the app, **InvestTrack**: Login, Dashboard, Add Transaction, Portfolio, Transactions, and Performance. [.claude/rules/ui-reference.md](.claude/rules/ui-reference.md) is auto-loaded like the architecture rules. It summarizes the screens, components, palette, and formats, and requires opening the image with the Read tool before any UI work.

The image deliberately lives outside `stocks_investments/public/`: it is a design document, not a runtime asset, and everything in `public/` is served with the app.

## Current state and phased plan

Work follows the user's phased spec ("Investment Portfolio Tracker — Desarrollo por fases", 15 phases): implement → verify (`lint`, `typecheck`, `build`, `npm test`) → report → stop if decisions are pending. Never implement a later phase's functionality early. The approved Phase 0 architecture (folder tree, Convex schema, data flows, Modified Dietz / average-cost methodology, phase-by-phase deliverables) is saved in the user's Claude plans directory; confirmed decisions: Massive free plan (grouped daily endpoint, end-of-day closes), average cost for sells, Total Gain/Loss = unrealized only, Vitest from Phase 4.

Progress:

- **Phase 1 (setup) done** — Convex + TanStack installed and wired through `app/providers.tsx`.
- **Phase 2 (folder structure) done** — `app/page.tsx` redirects to `/dashboard`; placeholder pages for `/dashboard`, `/portfolio`, `/transactions`, `/performance` (header only, `metadata` title template `"%s | InvestTrack"`). The mockup's app shell lives in `components/layout/` (`AppShell` server component, `NavBar` client component because of `usePathname`, `PageHeader`, `AppLogo`; nav items in `navigation.constants.ts`, icons from `lucide-react`). Route paths are in `constants/routes.constants.ts`; active-route matching is `utils/route.utils.ts` + `hooks/use-active-route.hook.ts`. Mockup palette tokens are in `app/globals.css` (dark only; use classes like `bg-surface`, `text-muted`, `border-border`, `text-primary`). Empty layer folders (`adapters/market-data/`, `services/market-data/`, `features/`, `components/ui/`, `types/`) hold a `.gitkeep`; delete it when the first real file lands. Scaffold SVGs and `public/` were removed.
- **Phase 3 (Convex DB) done** — `convex/schema.ts` defines `transactions` (indexes `by_date`, `by_ticker_date`) and exports the field validators reused by `convex/transactions.ts` (`list`, `listByTicker`, `create`, `update`, `remove`, all with `args`/`returns`). Mutations validate through `domain/transactions/transaction-validation.service.ts` (ticker normalized to uppercase SIP, valid non-future `YYYY-MM-DD` date with "today" in New York, quantity/price finite > 0), compute `totalAmount` unrounded, and throw `ConvexError({ code: "VALIDATION", issues })` or `{ code: "NOT_FOUND", id }` (codes in `transaction.constants.ts`, payload type `TransactionErrorData`). `update` never touches `createdAt`. Canonical order `(date, createdAt, id)` is `transaction-order.service.ts`; `toTransactionLike` maps a stored doc to the domain shape and keeps the id type via a generic. Oversell checks are not in yet (Phase 5).
- **Phase 4 (portfolio engine) done** — `domain/portfolio/`: `position.service.ts` (`buildPositions` replays each ticker in canonical order via `applyTransaction`; BUY adds shares and cost, SELL still throws until Phase 5), `portfolio.service.ts` (`totalShares`, `totalInvested`, `averageCost`, `currentValue`, `gainLoss`, `returnPercentage`, `buildHoldings`, `summarizePortfolio`), types `Position`/`Holding`/`PortfolioSummary`/`PriceMap`, `SHARES_EPSILON`. Returns are ratios (0.3333), never pre-multiplied percentages. Positions at or below `SHARES_EPSILON` are not holdings. A missing ticker in `PriceMap` leaves that holding's price fields `null`, and `summarizePortfolio` then returns `portfolioValue`/`totalGainLoss`/`portfolioReturn` as `null` with `missingPriceTickers`. Float noise at break-even (e.g. `-5.7e-14`) is expected: future `utils/format-*` must use `signDisplay: "exceptZero"` and choose green/red from the rounded value.
- **Phase 5 (sell logic) done** — `applyTransaction` handles SELL at average cost: `sellCostBasis` removes `quantity × average` (the whole basis when the sale closes the position), `Position.realizedGain` accumulates proceeds − removed basis, and a position whose remaining shares are ≤ `SHARES_EPSILON` snaps to `shares 0, costBasis 0`. Selling from a closed position, or more than `shares + SHARES_EPSILON`, throws `OversellError` (`position.errors.ts`); `validateSellSequence` is the non-throwing check returning the first violation in canonical order. `convex/transactions.ts` writes first, then replays the affected ticker and throws `ConvexError({ code: "OVERSELL", ticker, date, transactionId, available, requested })`, which rolls the whole mutation back. Checks run on create SELL, on every update (new ticker, plus the old ticker when it changed) and on remove BUY; create BUY and remove SELL can only add shares and skip it. Consequences for later phases:
  - `buildPositions` throws on an invalid history (e.g. rows edited in the Convex dashboard). Hooks (Phase 7) must not let that crash a render: check with `validateSellSequence` first and show an error state.
  - On a rejected **create**, `transactionId` is the id of the rolled-back document; build error messages (Phase 8) from `ticker`, `date`, `available` and `requested`.
  - Form pre-validation (Phase 8) must not invent a client `createdAt` for the candidate: same-day order is by server `createdAt`, so place a new candidate after existing same-day trades; an edit (Phase 9) keeps the stored `id` and `createdAt`.
  - The fixed 1e-9 tolerance can misjudge sell-all orders on fractional positions above roughly 1.7M shares (float64 resolution). Accepted as out of range for a personal tracker.
- **Phase 6 (Massive) done** — `GET /api/prices?symbols=AAPL,MSFT` ([route.ts](stocks_investments/app/api/prices/route.ts)) → `getMarketDataService()` (`services/market-data/market-data.server.ts`, `server-only`, wires the key from `lib/env.server.ts`) → `createMarketDataService` (pure and unit-tested with fakes) → `MassiveMarketDataProvider` (`adapters/market-data/`) plus the Convex cache adapter `ConvexDailyCloseCache` (`adapters/convex/`, calls `convex/dailyCloses.ts` through `fetchQuery`/`fetchMutation`). "Current price" = close of the newest of up to 3 weekdays strictly before today in New York (`domain/market-data/trading-date.service.ts`). A date whose closes are all cached costs no Massive request. Otherwise one grouped-daily request is made and every requested ticker is stored write-once (`null` = no bar that day). Dates with no market data are remembered in memory per server process, not persisted. Response `PricesResponse` (`types/prices-response.type.ts`); errors `ApiErrorResponse` with 400 `INVALID_SYMBOLS`, 429 `RATE_LIMITED` + `Retry-After: 60`, 503 `PRICES_UNAVAILABLE`, 500 `CONFIGURATION_ERROR`, 502 `UPSTREAM_ERROR`, 500 `INTERNAL_ERROR`; always `Cache-Control: no-store`. Vitest now also includes `services/**`. `dailyCloses` functions are public like `transactions` (single-user, no auth; revisit in Phase 15).
- **Massive behavior verified live on 2026-09-13** (free Stocks Basic plan, not in their docs):
  - Grouped daily is ~1.4 MB and ~12.5k bars. Bars have keys `T`, `c`, `o`, `h`, `l`, `v`, `vw`, `n`, `t`; `t` is 16:00 New York.
  - Tickers use SIP format (`BRK.B`). Preferreds look like `WFCpL` and do not pass `TICKER_REGEX`.
  - Weekend or holiday: 200, `status: "OK"`, `resultsCount: 0`, and **no `results` key**.
  - Today before end of day, and dates beyond the ~2-year entitlement: both 403 `NOT_AUTHORIZED`; only the `message` text tells them apart.
  - Bad or missing key: 401 with `error`. Malformed date: 400.
  - Over 5 requests/min: 429 with `error` and **no `Retry-After`** header.
- **Phase 7 (prices + TanStack) done** — data flow for every priced screen:
  - `useTransactions` (`features/transactions/hooks/`): Convex `useQuery(api.transactions.list)`, sorted canonically; `undefined` while loading.
  - `usePortfolio` (`features/portfolio/hooks/`): `tryBuildPositions` (non-throwing), then `openPositions` tickers, then `usePrices`, then `buildHoldings`/`summarizePortfolio`. Returns `PortfolioState`: `loading` | `invalid-history` (with the `OversellViolation`) | `ready`.
  - `usePrices` (`features/market-data/hooks/`): `useQuery(currentPricesQueryOptions(symbols))`. The cache contract lives in `features/market-data/prices.service.ts` (`fetchPrices`, `priceKeys`). Key = sorted unique symbols; disabled with no symbols; `staleTime` 5 min; `retry`, `refetchOnWindowFocus` and `refetchOnReconnect` off; `placeholderData: keepPreviousData`; the `AbortSignal` is deliberately not passed to `fetch`.
  - After a 429, `canRefresh` stays false until `Retry-After` (default 60 s). Only the Refresh button is gated; mounts and new symbol sets still fetch.
  - Errors reach the UI as English messages from `prices-messages.constants.ts`.
  - Formatters: `utils/number-format.utils.ts` (`formatCurrency`, `formatSignedCurrency`, `formatShares`, `formatSignedPercent`; signed ones use `exceptZero`) and `utils/date-format.utils.ts` (`formatIsoDate` in UTC, returning non-ISO input unchanged; `formatDateTime` as "Nov 15, 2024 10:24 AM"). Locale and decimals are in `constants/format.constants.ts`; `API_ENDPOINTS` and `API_ERROR_CODES` in `constants/api.constants.ts` (`ApiErrorCode` derives from it).
  - `/portfolio` renders the minimal `PortfolioView` (`PriceStatus` + `HoldingsPreview`), which the Phase 10 `HoldingsTable`/`PortfolioTotals` replace.
  - Verified in a real browser with the Playwright MCP: 1 request on open, none on focus or reconnect, 1 per Refresh, reactive Convex updates, 429 cooldown, invalid history, empty state. The MCP writes to `/.playwright-mcp/`, which is git-ignored.
- **Phase 8 (transaction form) done** — `/transactions` has a "+ Add Transaction" `ButtonLink` to `/transactions/new` (`ROUTES.ADD_TRANSACTION`; the nav keeps Transactions active).
  - The page mounts `AddTransactionView`. It renders `TransactionForm` only after `useIsClient()` (`hooks/use-is-client.hook.ts`), because the default and max date come from the viewer's clock. Rendering it on the server hydrate-mismatched and could show one date while submitting another.
  - **Amount field (user request, 2026-09-13):** the form has "Price per share (USD)", "Amount (USD)" and "Shares"; the label deviates from the mockup's "Price (USD)" on purpose.
    - Amount and Shares are synchronized through the price. `TransactionFormValues` stores only the driver (`sizeField` + `sizeText`), and `positionSizeDisplay` calculates the other input with a "Calculated from …" hint: amount at 2 decimals, shares at up to 9, so a copied share count closes a position within `SHARES_EPSILON`.
    - When the amount drives, the submitted quantity is the unrounded `calculateQuantityFromAmount(amount, price)` (domain), so the stored `totalAmount` equals the typed amount. Quantity validation errors are shown on Amount.
    - Plain input text uses the Intl-based `formatFixedDecimal`/`formatTrimmedDecimal`, so it rounds exactly like `formatCurrency`.
    - Convex still receives `{ quantity, price }`; no schema change.
  - `useTransactionForm` keeps raw strings (the ticker is shown uppercase via CSS, so the caret never jumps). On submit it runs `buildTransactionInput`: `parseDecimalInput` (strict plain decimals) plus the same `validateTransactionInput` the server uses. It then checks `findCandidateOversell` against the live Convex history (the candidate sorts after same-day trades, with no invented `createdAt`), then calls `useTransactionMutations().createTransaction`.
  - Server `ConvexError`s map through `toTransactionMutationError`: field errors, oversell text via `oversellMessage(violation, isNewTransactionViolation(...))`, which names a saved sale when that is the one left short, or a generic message. The button stays disabled after a successful create until navigation, to prevent duplicates.
  - New shared UI in `components/ui/`: `Button`/`ButtonLink` (variants `primary`, `secondary`, `outline-accent`), `Card`, `TextField` (label, `aria-invalid`/`aria-describedby`, trailing icon), `SegmentedToggle` (native radios, keyboard-accessible). New utils: `formatSharesExact`, `isRecord` (`utils/type-guard.utils.ts`).
  - Browser-verified with Playwright, including a server-side FUTURE_DATE via a shifted browser clock. The Convex client itself logs server-rejected mutations to the console; that noise is expected.
  - Deferred to Phase 13 (a11y polish): move focus to the first invalid field after a failed submit, avoid focus dropping to `body` while the submit button is disabled, and announce the calculated Amount/Shares value to screen readers (e.g. a polite live region).
- **Next: multiple portfolios (user request, 2026-09-13), a new phase inserted between Phase 8 and Phase 9.** Named portfolios ("Viajes", "Retiro", …), each with its own transactions and positions. It goes first because Phases 9–12 all depend on the portfolio scope. Agreed design points:
  - A `portfolios` table plus a `portfolioId` on every transaction.
  - Average cost and oversell checks are per (portfolio, ticker).
  - A combined view sums per-portfolio positions; it never replays all transactions together.
  - Prices and `dailyCloses` stay shared.
  - Before implementing, update the Phase 0 plan (Phases 9–12) and ask the user about: an "All portfolios" view, deleting a portfolio that has transactions, how the active portfolio is chosen in the UI, and moving shares between portfolios.
- Not yet: transactions table with edit/delete (Phase 9), full portfolio/dashboard/performance screens, responsive layout and UI states (Phase 13).

## Agent instruction files in `stocks_investments/`

- `AGENTS.md` — **regenerated by `next dev`** (see the `BEGIN:nextjs-agent-rules` marker block and `node_modules/next/dist/server/lib/generate-agent-files.js`). Do not put durable project instructions here; they will be overwritten.
- `CLAUDE.md` — contains only `@AGENTS.md`, so it inherits that same volatility.

Durable guidance belongs in this file or in `.claude/rules/`.

The user is solely responsible for all Git operations. The AI ​​is strictly prohibited from executing or automating Git commands (branch, commit, push, merge, etc.). The AI ​​must focus exclusively on code generation and problem-solving.
