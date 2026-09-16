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
- **Phase 8.5 (multiple portfolios) done** — added on user request (2026-09-13) between Phase 8 and Phase 9, because Phases 9–12 all depend on the portfolio scope. The Phase 0 plan has the details (§12).
  - **Data.** `portfolios { name, nameKey, createdAt }` with index `by_name_key`. `transactions.portfolioId` is required, with indexes `by_portfolio_date` and `by_portfolio_ticker_date`.
  - **Portfolio functions** (`convex/portfolios.ts`): `list` (creation order), `create`, `rename`, `remove`.
    - Names are trimmed, whitespace-collapsed and NFC, at most 40 code points (`domain/portfolio/portfolio-name.service.ts`), and unique ignoring case and spacing.
    - `remove` throws `NOT_EMPTY` while any transaction references the portfolio; history is never deleted with it.
    - Errors: `ConvexError({ code: VALIDATION | DUPLICATE_NAME | NOT_FOUND | NOT_EMPTY })`.
  - **Transaction functions.** `transactions.list` takes an optional `portfolioId`. `create`/`update` report a missing portfolio as the VALIDATION issue `UNKNOWN_PORTFOLIO` (the domain adds `MISSING_PORTFOLIO` for an empty id).
  - **Oversell checks** replay only the (portfolio, ticker) position. `update` also re-checks the old position when the portfolio or ticker changed.
  - **Positions.** `buildPositions` replays each (portfolio, ticker) separately, then `combinePositions` sums shares, cost basis and realized gain per ticker. The "All portfolios" view therefore equals the sum of each portfolio's view; transactions from different portfolios are never replayed together. `findCandidateOversell` filters by portfolio and ticker. Prices and `dailyCloses` stay shared.
  - **Active portfolio.** A sidebar selector (`ActivePortfolioSwitcher`, passed to `AppShell` as `sidebarHeader`) offers "All portfolios" plus each portfolio.
    - The choice is a per-browser preference in localStorage, through `adapters/browser-storage/local-storage-store.adapter.ts` (in-memory fallback when storage is blocked, follows other tabs).
    - `useActivePortfolio` reads it with `useSyncExternalStore`; on the server it reports loading, so there is no hydration mismatch. A stored id that no longer exists resolves to "All portfolios".
    - Screens read `activePortfolio.scope` and pass it to `useTransactions(scope | "skip")`.
  - **Screens.**
    - `/portfolios` (`ROUTES.PORTFOLIOS`, reached from "Manage portfolios", not in the nav) creates, renames inline and deletes after an inline confirmation. A portfolio with transactions shows why it cannot be deleted.
    - The Add Transaction form has a Portfolio select first. It defaults to the active portfolio, or the only one; with several portfolios in "All portfolios" the user must choose. A portfolio deleted while the form is open counts as not chosen.
    - With no portfolios, the form and `/portfolio` show `NoPortfoliosNotice`.
  - **New shared UI:** `SelectField` (native select), `FieldShell` + `describeField` (label, hint and error wiring shared with `TextField`, which gained `hideLabel`), and the `Button` variant `danger`.
  - **Verification.** Browser-verified with Playwright. Three independent reviews (financial/server, React/UI/architecture, completeness/tests) found no defects. The 3 NVDA buys that existed were deleted at the user's request, so the dev deployment started empty.
  - **For Phase 9.** `OversellViolation` has no `portfolioId`. When the edit form lets a trade move between portfolios, name the portfolio in the message (the violation's `transactionId` can be looked up in the history). The combined view's invalid-history message has the same gap.
  - **Known limitation.** Name normalization does not strip zero-width characters, so visually identical names are possible if pasted deliberately.
- **Phase 9 (transactions table, edit, delete) done.** Convex functions and schema are unchanged.
  - **List (`/transactions`)**
    - `TransactionsView`, inside a required `<Suspense>` because it reads `useSearchParams` on a static page, shows the active portfolio scope. Columns: Date, Type badge, Ticker, Portfolio (only in "All portfolios"), Shares, Price, Total and a "⋯" menu.
    - Row menu: `RowActionsMenu` uses the Popover API, placed with `position: fixed` from the trigger rect and measured against `documentElement.clientWidth/Height`.
    - Sort is a total order (`sortTransactionList`, ties newest first; portfolio names tie-break by accent-sensitive collation, then id).
    - Filters: ticker prefix, type, inclusive date range.
    - Filters and sort live in the URL (`transaction-list-query.utils.ts`). The in-page draft is the source of truth and URL writes use `window.history.replaceState`. `reconcileUrlQuery` tells our own delayed router commits (`pendingWrites`) apart from real navigations.
    - Rows are view models built by `toTransactionRows`.
  - **Edit (`/transactions/[id]/edit`)**
    - An async page with a server-sanitized `returnHref`; `EditTransactionView` reuses `TransactionForm` through `useTransactionFormFields`, which the create hook also uses.
    - Exact prefill (`editFormValuesFromTransaction`): `formatExactDecimal` text parses back to the stored doubles. `chooseEditSizeDriver` reopens short share counts with Shares driving, and amount-entered trades with Amount driving only when amount ÷ price is proven to give the same quantity.
    - An unchanged save sends no mutation; a partial edit keeps quantity, price and totalAmount bit-identical (browser-verified against Convex).
    - The pre-check `findUpdateOversell` mirrors `update` (it keeps `id` and `createdAt`; it checks the new position, then the old one).
    - Changes or deletions made elsewhere show a banner, and Save is disabled until "Load latest version". A save or create that finishes after the user left does not navigate.
  - **Delete**
    - `useDeleteTransaction` plus `ConfirmDialog` (a native `<dialog>` mounted only while open).
    - `findRemovalOversell` blocks deleting a BUY that a later sale needs, with an "Edit that sale" link.
    - The dialog can be closed while a deletion is pending (Convex queues mutations offline). A failure reopens it; success is announced in a polite status.
  - **Messages.** Oversell texts come from `describeOversell` (actions create/update/remove). The portfolio name is included only with more than one portfolio, and only when it can be proven from the history. With one portfolio, the create texts equal Phase 8.
  - **Verification.** A design panel (3 designs, 2 judges), a 5-agent implementation, and an adversarial review of 4 dimensions with a skeptic per finding. 9 confirmed findings were fixed; one limitation is accepted (below). Browser-verified with Playwright: sorting and `aria-sort`, URL filters, reload, nav reset, edit prefill, exact saves, oversell messages, blocked and confirmed delete, a double click giving one mutation, an offline delete, banners, focus return, no console warnings. 523 tests.
  - **Accepted limitations**
    - If two filter changes are batched into one router commit that returns to the URL already shown, a stale pending write can make a later click on the Transactions nav link keep the filters. Timing-dependent and rare. Fixing it from the browser URL would reintroduce keystroke rollback, because Next's `HistoryUpdater` rewrites history on every commit.
    - There is no server compare-and-swap for concurrent edits; the banner covers what the client can see. Revisit in Phase 15.
    - Add Transaction still returns to an unfiltered list.
    - Focus can drop to `<body>` when the confirm button disables or disappears inside the dialog (Phase 13).
- **Phase 10 (/portfolio) done.** Convex schema and functions are unchanged.
  - **Screen.** `PortfolioView` (`usePortfolioView`) renders `PriceStatus`, then `HoldingsTable` (Ticker, Shares, Avg. Cost, Current Price, Market Value, Gain / Loss, %, "⋯"), then the `PortfolioTotals` card, for the active portfolio. Non-ready states keep their Phase 7 markup and text: loading, no portfolios, invalid history, and a single "No holdings yet…" message for both "never traded" and "everything sold".
  - **User decisions (2026-09-14).**
    - The "⋯" menu has one item, "View transactions" → `tickerTransactionsHref(ticker)` (`/transactions?ticker=AAPL`). The list filter is a prefix match, so "F" also lists "FB" (accepted).
    - Headers are sortable with local state (`useHoldingsTable`), not in the URL. Initial sort is Ticker A→Z. Numbers start largest first. Missing values go last and ties break by ticker, in both directions. The sort survives scope switches and refreshes and resets on navigation.
  - **Pure layer** (`features/portfolio/`):
    - `holdings-table.{type,constants,utils}.ts`: `sortHoldings` on raw values, `toHoldingRows` with pre-formatted labels, `holdingsCaption`. The `%` header's accessible name is "Return %".
    - `portfolio-totals.utils.ts`: `toPortfolioTotals`. Market Value and Gain show "—" while any price is missing, with the note "Totals appear once prices load." while `isPending || isFetching`, otherwise "No price for …".
    - `portfolio-view.utils.ts`: `invalidHistoryMessage`.
    - `usePortfolio`'s ready state now also carries `active`.
  - **Shared helpers extracted from Phase 9, no behavior change:**
    - `types/sort.type.ts` (`SortDirection`, `SortState`)
    - `utils/sort.utils.ts` (`compareValues`, `toggleSortState`, `sortedDirection`, `sortedTableCaption`)
    - `constants/sort.constants.ts`
    - `components/ui/table-sort.utils.ts` (`headerSortDirection`, the aria-sort token map)
    - `activePortfolioScopeLabel`
  - **Green/red.** `signedCurrencyLabel`/`signedPercentLabel` (`utils/number-format.utils.ts`) return `{ label, sign }`, with the sign read from `formatToParts` of the same formatter, so the color always matches the rounded text ("$0.00" is neutral). `SignedValue` (`components/ui/`) renders it; `NOT_AVAILABLE_LABEL` ("—") is in `constants/format.constants.ts`. Phase 11 stat cards should reuse both.
  - **Domain fix.** `buildPositions` now settles each (portfolio, ticker) position at or below `SHARES_EPSILON` to `shares 0, costBasis 0` (realized gain kept) before `combinePositions`. Before, sub-epsilon buys in two portfolios could add up to an "All portfolios" holding that no single portfolio showed. `isOpenPosition` is the single threshold predicate. Oversell semantics are unchanged, and the change reaches the Convex bundle (pushed with `npx convex dev --once`).
  - **Tests (613).** The three plan verifications are domain tests in `portfolio.service.test.ts`: multi-ticker never mixed (F/FB, BRK.B/BRKB), rows reconcile with totals, and combined view = sum of the individual views, including a seeded property test that fails without the settle step.
  - **Verification.** A design panel (3 designs, 2 judges, critic), a 4-package implementation, and an adversarial review of 3 dimensions with 2 skeptics per finding: 0 confirmed. Browser-verified with Playwright:
    - The combined view equals the sum of Pension + two test portfolios, to the cent.
    - Sorting: keyboard, aria-sort and caption; persists across scopes; resets on navigation; no requests.
    - The "⋯" menu opens up or down, closes with Escape and returns focus, and its link keeps the active portfolio.
    - Price states: missing price, held request, and a 503.
    - Break-even shows neutral colors, dust in two portfolios shows nowhere, and the empty state renders.
    - The `/transactions` sort and its URL round-trip still work.
  - **Accepted limits.** Displayed row labels can differ from the totals by cents. During a Refresh with a still-missing ticker, the totals note reads "Totals appear once prices load." until the fetch ends. The ZZZZ test ticker left a write-once `dailyCloses` null row.
- **Phase 11 (/dashboard) done.** Convex schema, functions and domain are unchanged.
  - **Screen.** `app/dashboard/page.tsx` stays a static Server Component (`○ /dashboard`) that mounts `DashboardView`, the only client boundary. `DashboardView` renders `PageHeader` itself so the price label (`PriceStatusLabel`) and `RefreshPricesButton` sit in the header actions. Below the header, in order:
    - price alerts, then `SummaryCards` (4 `StatCard`s in a `<dl>`: Portfolio Value, Total Invested, Total Gain / Loss, Portfolio Return);
    - "Holdings" (`HoldingsTable`);
    - "Recent Transactions" (latest 3 with "View all >" to `/transactions`).
  - **User decisions (2026-09-15).**
    - Dashboard Holdings are identical to `/portfolio`: same `HoldingsTable`, sortable, with "⋯" and no new props.
    - The Total Gain / Loss card shows only the signed amount; Portfolio Return shows the signed %.
  - **Data flow.** `useDashboard` = `usePortfolio` (the single source; its ready state gained `transactions` and `portfolios`) + `usePortfolioHoldingsTable` (shared with `usePortfolioView`) + a memoized `selectRecentTransactions`. The pure `buildDashboardView` (`features/dashboard/dashboard-view.utils.ts`) maps it to `DashboardState`, reusing `blockedPortfolioView` for loading / no-portfolios / invalid-history. With no open holdings, no price label, Refresh or alerts are shown, because a disabled TanStack query can still hold placeholder data. Cards read $0.00 / $0.00 / $0.00 / — and the Holdings section shows "No holdings yet…".
  - **Cards** come from `toPortfolioTotals` (`toSummaryCards`), so they equal `/portfolio`'s totals by construction. The note reason is the shared `withheldTotalsReason`. The dashboard wording is "…so Portfolio Value, Total Gain / Loss and Portfolio Return can't be calculated."; `/portfolio` keeps "can't be totaled".
  - **Recent Transactions** are the reversed canonical order `(date, createdAt, id)`, limit `RECENT_TRANSACTIONS_LIMIT` (3). They follow trade date, so a back-dated trade entered today is not "recent". Rows are `toTransactionRows` trimmed to the rendered cells, with a Portfolio column only in "All portfolios".
  - **Shared pieces extracted, no behavior change:**
    - `PriceStatus` is now composed of `PriceStatusLabel`, `RefreshPricesButton` and `PriceAlerts`, with its text in `price-status.utils.ts` (`priceStatusLabel`, `missingClosesMessage`).
    - `features/transactions/components/transaction-columns.tsx` (`TransactionColumnHeaders`, sortable only with `sorting`, and `TransactionRowCells`) is used by `TransactionsTable` and the read-only `RecentTransactionsTable`.
    - `components/ui/stat-card.tsx`.
  - **Phase 7 amendment (my decision, objectable).** `usePrices().refresh` calls `refetch({ cancelRefetch: false })`. Before, two clicks in the same task (before the button re-rendered disabled) cancelled and restarted the fetch, but the first HTTP request kept running (no `AbortSignal`): 2 requests, measured in the browser. Now it is 1. Revert path: the one line in `use-prices.hook.ts`.
  - **Tests (710).** New pure tests for the cards model, recent selection (ties, limit, back-dated), row model, state machine, price-status text and the shared portfolio mappers.
  - **Verification.** A design panel (3 designs, 2 judges, critic), a 4-package implementation, and an adversarial review of 3 dimensions: 0 findings. Browser-verified with Playwright:
    - 1 `/api/prices` on open and 1 per Refresh, including a double click.
    - The cards match a hand computation and `/portfolio`'s totals.
    - Holdings JSON is identical to `/portfolio`, and Recent equals the first 3 rows of `/transactions`, in a single portfolio and in "All".
    - Sort persistence and reset, "⋯" and "View all" links.
    - 429 cooldown, 503, held request and missing-ticker states; sold-out and empty portfolios.
    - 4 cards in one row at 1440px.
    - A pre-change DOM baseline of `/portfolio` (price block, totals, table, missing note) and `/transactions` (thead, rows) matched 18/18 hashes after the change.
  - **Accepted limits.** Stat cards wrap to 2×2 below 1280px (Phase 13). The header label keeps the full "Close of … · updated …" text. Invalid history hides Recent Transactions too.
- **Phase 12 (/performance) done.** Convex schema and functions are unchanged; `dailyCloses` already was the storage the annual percentage needs (closes only — share counts are always re-derived from the transaction log).
  - **Screen.** `app/performance/page.tsx` stays a static Server Component (`○ /performance`) mounting `PerformanceView`, the only client island, which renders `PageHeader` with the year `SelectField` in the actions. Then: 3 `StatCard`s in a `<dl>` (Total Return, Cash Contributed, Investment Performance), the notes, the "Performance Summary" card (period line with the scope, 5 rows, valuation line, footnote) and the methodology note.
  - **Methodology (Modified Dietz).** `R = (EV − BV − F) / (BV + Σ Wᵢ·Fᵢ)`, `Wᵢ = (CD − Dᵢ)/CD`, period `[start, endExclusive)`, flows at the start of the day. No cash account: BUY = contribution (+`totalAmount`), SELL = withdrawal (−`totalAmount`); `Cash Contributed = buys − sells` (can be negative); `Investment Performance = EV − BV − Cash Contributed` (realized + unrealized of the period — this is where `realizedGain` surfaces). Never annualized, never presented as TWR. Denominator ≤ `MONEY_EPSILON` (0.005, `domain/performance/performance.constants.ts`) → `undefined-average-capital` and `—`, dollars still exact.
  - **Period, both ends re-based.** It starts at the year's first flow when nothing was held on Jan 1 (settled in the plan) and **ends at the last flow when nothing is held at the valuation date** (user decision of 2026-09-16: a 2025 sell-all on Mar 1 reads +10.19% over Jan 1–Mar 1, not +128.52% over the calendar year; the dollars are identical either way). A closed-out period also removes any dependence on a guessed valuation date. Current year: EV at the `asOfDate` of current prices, `endExclusive = asOfDate + 1`, and trades dated after it are excluded and named in a note.
  - **Statuses** (first match wins): `awaiting-first-close`, `no-activity`, `missing-begin-price`, `missing-end-price`, `undefined-average-capital`, `ok`; plus the period flags `isRebasedStart` (the plan's `partial`), `isInProgress` and `isClosedOut`.
  - **Year-end prices.** `GET /api/prices?symbols=…&year=YYYY` → `getYearEndPrices`, which shares the candidate walk and the write-once `dailyCloses` cache with `getCurrentPrices` (byte-identical behaviour, its 8 tests unedited). Candidates are `candidateTradingDates(\`${year+1}-01-01\`)`, so no `lastWeekdayOnOrBefore` was needed. The year is validated in the service against its own clock (4 digits, ≥ 1970, `< current NY year`) → 400 `INVALID_YEAR`. A 403 from Massive on a candidate at least 7 days old means "outside the ~2-year history": it memoises a monotone `historyLimitDate`, stops the walk, and returns the cached closes as a 200 with the rest in `missing[]`, or 404 `PRICE_HISTORY_UNAVAILABLE` when nothing is cached. The cache lookup always precedes the memo, so closes fetched inside the window keep working forever.
  - **Client.** `usePerformanceView` = `usePortfolioHistory` (extracted from `usePortfolio`, no prices) + `useMarketToday` + local year state + `useAnnualPerformance`, which always mounts exactly two `useQueries` slots (begin/end; `year: null` or no history keeps both disabled and calls no domain code). The current-year end slot prices the superset `openTickersAt(now) ∪ ⋃ openTickersAt(d)` over the 5 possible valuation weekdays, so every ticker held at the server's `asOfDate` is priced and the key normally equals `/dashboard`'s. `yearEndPricesQueryOptions`: `staleTime` Infinity, `gcTime` 24 h, no `placeholderData`, `retry` false. The year select is never disabled; a failed boundary shows the message plus a "Try again" button (user decision), gated by the extracted `useRateLimitCooldown`.
  - **Shared extractions, no behavior change:** `usePortfolioHistory`, `useRateLimitCooldown`, `pricesErrorMessage` (the single rejection→sentence mapper), `marketToday` moved to `domain/market-data/trading-date.service.ts`, `positionsAt`/`openTickersAt`/`valuePositions` in `domain/portfolio/`, `StatCard`'s optional `caption`.
  - **Tests (909).** The four plan verifications are domain tests: spec example (BV 5 000, +10 000 on Jul 1, EV 16 500 → +$1,500 and +14.94%), BV = 0 re-base, partial year never annualized, and a combined two-portfolio year. Plus the leap year (+14.96%), the closed-out re-base, negative Cash Contributed, the guards and the year-end service/route behaviour with fakes.
  - **Verification.** A design panel (1 surviving design + 2 judges + critic), a 5-package implementation and an adversarial review of 3 dimensions with 2 skeptics per finding: 3 distinct defects confirmed and fixed — the 429 cooldown and "Try again" were gated on the wrong boundary when the other one was history-unavailable (now `blockingBoundarySide` decides, and a retry never refetches a boundary that cannot succeed); the closed-out note claimed "every trade of the year is included" while a later trade was excluded; and the excluded-trades / awaiting-first-close notes disappeared when no boundary had been priced (the period's last day now stands in for the close date). A fourth, found during integration, was the duplicate `useQueries` key of two disabled slots.  Browser-verified with Playwright against real and seeded data: the live year (+63.21%), a closed-out 2025 (−0.17%, period Jan 1 – Jun 11), the history-unavailable year (404 → note, Cash Contributed still exact), a combined year equal to the sum of its portfolios, the empty state, 503 + Try again (a double click sends one request), the 429 cooldown (Try again disabled, select enabled, cached year at 0 requests), and DOM-hash equality of `/portfolio`, `/dashboard` and `/transactions/new` against a pre-change baseline (10/10).
  - **Accepted limits.** Modified Dietz still distorts a sell-all-then-rebuy inside one year (GIPS would revalue at large flows, i.e. TWR — excluded by rule 2); dividends, fees, taxes and splits are not tracked; a year-end close never fetched while inside Massive's 2-year window is permanently unavailable (explicit status, never a wrong number); positions are counted at the calendar year end and priced at the nearest close, so a trade dated on a non-trading Dec 29–31 is valued at a close that predates it (this keeps `EV(N) === BV(N+1)`); `today` is read once on mount.
- Not yet: responsive layout and UI states (Phase 13).

## Agent instruction files in `stocks_investments/`

- `AGENTS.md` — **regenerated by `next dev`** (see the `BEGIN:nextjs-agent-rules` marker block and `node_modules/next/dist/server/lib/generate-agent-files.js`). Do not put durable project instructions here; they will be overwritten.
- `CLAUDE.md` — contains only `@AGENTS.md`, so it inherits that same volatility.

Durable guidance belongs in this file or in `.claude/rules/`.

The user is solely responsible for all Git operations. The AI ​​is strictly prohibited from executing or automating Git commands (branch, commit, push, merge, etc.). The AI ​​must focus exclusively on code generation and problem-solving.
