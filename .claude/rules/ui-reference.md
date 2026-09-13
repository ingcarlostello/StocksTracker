# UI REFERENCE: INVESTTRACK MOCKUP

The approved visual design for this app is the mockup at:

**`docs/design/ui-reference.jpg`** (relative to the `StockTracker/` root; JPEG, 1536×1024)

It shows six desktop screens of **InvestTrack**: Login, Dashboard, Add Transaction, Portfolio, Transactions, and Performance.

This reference is **MANDATORY** for all UI work: pages, layouts, components, styles, design tokens, icons, and UI copy.

---

## 1. How to use it

1. **Before** designing, creating, or modifying anything visual, open the image with the Read tool and study the screens involved. This document is a summary. **The image is the source of truth** for layout and styling.
2. Match the layout, visual hierarchy, spacing rhythm, palette, type weights, and component styles. It does not need to be pixel-perfect, but it must have the same look and feel.
3. When something is not covered (see §2), extend the same visual language instead of inventing a new one, and state the assumption.
4. If a design skill (e.g. `frontend-design`) suggests a different aesthetic direction (fonts, palette, layout), the mockup wins.
5. This reference does not override [architecture.md](architecture.md). The mockup defines how the UI **looks**, not where code lives: components stay presentational, data flows through hooks and services, and formatting lives in `utils/`.

---

## 2. What the mockup does NOT define

- **The numbers.** All figures are illustrative and internally inconsistent. For example, the holdings' market values add up to $13,570.01 while Portfolio Value shows $12,432.56. Never use them as fixtures or expected values, and never infer formulas from them. Gain/loss, YTD return, and TWR calculations are domain logic to be specified separately.
- **Responsive behavior.** Only desktop is shown; mobile and tablet layouts (e.g. collapsing the sidebar) must be designed.
- **Missing screens and states:** Settings, sign-up ("Create one"), forgot password, the "⋯" row-menu contents, edit/delete flows, confirmations, empty/loading/error states, losses (negative values), light theme.
- **Assets:** the Login hero's mountain photo and the logo are not provided as files.
- **Presentation framing:** the gray board around the screens and the Spanish captions under them (e.g. "1. Login — Acceso a tu cuenta") are not UI. The UI copy itself is English.

---

## 3. App shell (every screen except Login)

- **Sidebar** on the left, same background as the page, separated from the content by a 1px border.
  - Top: logo (three ascending green bars) + "InvestTrack" wordmark.
  - Nav items, icon + label: Dashboard, Portfolio, Transactions, Performance, Settings.
  - "Log out" pinned to the bottom.
  - Active item: rounded background with a dark green tint, green icon, near-white label. Inactive items: muted icon and label.
- **Page header:** large semibold title and a one-line muted subtitle, with optional actions aligned right.

---

## 4. Screens

1. **Login** (no shell). Split view.
   - Left hero: logo, three-line headline "Your Investments. / In One Place.", a supporting paragraph, a dark snowy-mountain photo fading into the background, and the footer "Built for long-term thinkers."
   - Right card: "Welcome back" / "Sign in to your account", Email, Password (show/hide eye icon), "Remember me" checkbox + "Forgot password?" link, full-width primary "Sign in", and "Don't have an account yet? Create one".
2. **Dashboard**
   - Header actions: last-updated timestamp + outline-accent "Refresh Prices" button.
   - Four stat cards: Portfolio Value (+% today), Total Invested, Total Gain / Loss (+$ and +%), Cash Contributed (YTD).
   - "Holdings" table: Ticker, Shares, Avg. Cost, Current Price, Market Value, Gain / Loss, %.
   - "Recent Transactions" table (latest 3) with a "View all >" link: Date, Type, Ticker, Shares, Price, Total.
3. **Add Transaction**: drawn as a full page inside the shell, with Transactions active.
   - Form card: Type segmented toggle (Buy / Sell, each with an icon), Ticker (search icon), Date (calendar icon), Shares, Price (USD).
   - Two equal-width buttons: Cancel (secondary) and Add Transaction (primary).
4. **Portfolio**
   - Holdings table (same columns as the Dashboard) plus a trailing "⋯" row-actions column.
   - "Portfolio Totals" card: Market Value, Total Invested, Total Gain / Loss (+$ and +%).
5. **Transactions**
   - Header action: primary "+ Add Transaction".
   - Table: Date, Type (Buy/Sell badge), Ticker, Shares, Price, Total, "⋯".
6. **Performance**
   - Header action: year select.
   - Three stat cards: Total Return (YTD), Cash Contributed, Investment Performance (with a "(time-weighted)" caption).
   - "Performance Summary" card of label/value rows: Starting Value (Jan 1), Cash Contributed, Ending Value (as-of date), Total Gain / Loss, Investment Performance (TWR). Footnote: "Performance takes into account all deposits and withdrawals during the period."

---

## 5. Components

- **Card:** surface background, 1px subtle border, small rounded corners, generous padding, flat (no heavy shadows).
- **Stat card:** small muted label → large semibold value (near-white, or green for gains) → optional small green delta line.
- **Data table:** bordered, rounded container. The header row sits on a slightly lighter band with small muted labels. Body rows are separated by subtle dividers. Tickers are semibold near-white, numeric columns are right-aligned, and a "⋯" actions column is optional.
- **Type badge:** small rounded rectangle with a 1px border in its own hue. Buy: green text and border on a dark green tint. Sell: red text and border on a dark red tint.
- **Buttons:**
  - Primary: solid green, dark text, optional leading icon ("+ Add Transaction").
  - Secondary: raised dark surface, 1px border, near-white text ("Cancel").
  - Outline accent: dark green tint, green border, green text and icon ("Refresh Prices").
- **Input:** surface background, 1px border (more visible than card borders), rounded corners, muted placeholder, and a bold label above. Optional trailing icon (search, calendar, eye).
- **Segmented toggle:** equal-width options. Selected: green border, dark green tint, green icon and label. Unselected: raised surface with a border.
- **Links:** green. Inline links are underlined ("Create one"); section links end with a chevron ("View all >").
- **Icons:** thin-stroke outline icons (Lucide-like). No icon library is installed yet; choosing one is an open decision.

---

## 6. Visual tokens

The design is dark theme only. Tokens belong in `stocks_investments/app/globals.css` (`:root` + `@theme inline`). That file still holds scaffold values that do not match this design: white/near-black `prefers-color-scheme` colors, and `body { font-family: Arial }` overriding the loaded font.

### Palette (measured from the image)

These are median samples from the JPEG. Large flat areas are reliable. JPEG compression softens 1px lines and small text, so real borders are probably slightly lighter and real text colors slightly more saturated than measured. Treat the values as a starting point for tokens, not as exact brand values.

| Role | Hex | Measured on |
| --- | --- | --- |
| Page background (content and sidebar) | `#091016` | Dashboard, Portfolio |
| Surface: cards, inputs, table body | `#101920` | stat cards, login card, form card, inputs |
| Raised surface: table header, secondary button, unselected toggle | `#151E27` | tables, Cancel, Sell toggle |
| Border: cards, sidebar divider, table rows | `#1D242B` | card and table edges |
| Border: inputs | `#2C353C` | login inputs |
| Primary green | `#4ADB8D` | Sign in, Add Transaction buttons |
| Text on primary | `#002E05` | "Sign in" label (very dark green) |
| Accent tint: active nav, selected toggle | `#0D2F2D` | nav items, Buy toggle |
| Outline-accent button background | `#0C2425` | Refresh Prices |
| Buy badge background | `#0D2322` | Transactions table |
| Sell badge background | `#2A1C1D` | Transactions table |
| Positive text: gains, links, Buy | `#55BD89`–`#86DFB6` | gain figures (primary green family) |
| Negative text: Sell | `#AB595B` | Sell badge (likely brighter in the real design) |
| Logo bars | `#3AE5B3` | sidebar and login logos (slightly teal) |
| Text primary | `#FAFCFF` | headings, values |
| Text muted | `#9AA4AE` | subtitles, labels, table headers |

### Typography

- A single neutral sans-serif (Inter/Geist-like). `app/layout.tsx` already loads Geist through `next/font`, which is a close match.
- Hierarchy, largest to smallest: Login headline (bold) > page titles (semibold) > stat values (semibold) > section titles ("Holdings", "Recent Transactions") > body and table text > labels and captions (small, muted).
- Use tabular figures for amounts and numeric columns so digits align.

### Number and date formats (as shown)

- Currency: USD with thousands separators and 2 decimals (`$1,893.20`).
- Shares: 4 decimals (`10.0000`).
- Gains and returns: explicit sign, green when positive (`+$393.20`, `+26.21%`). Losses are not shown; use the negative red with a minus sign.
- Percentages: 2 decimals (the Performance card's `+24.8%` is the lone exception).
- Dates: `Nov 10, 2024` in tables, `Nov 15, 2024 10:24 AM` for the last-updated timestamp, `11/15/2024` in the date input.

Formatting functions belong in `utils/` (architecture.md §3), never inline in components.
