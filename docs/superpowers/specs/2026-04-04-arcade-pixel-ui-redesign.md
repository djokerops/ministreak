# Arcade Pixel UI Redesign

**Date:** 2026-04-04
**Status:** Approved

## Overview

Restyle the entire MiniStreak frontend to an "Arcade Pixel" aesthetic — fully pixelated headings, sharp corners, neon green glow effects, pixel box-shadows, and MiniPay green/grey color palette. Remove all emoji. Replace with text-based ranks and inline SVG pixel icons. No logic changes — purely visual.

## Typography

- **Primary font:** `Press Start 2P` (Google Fonts) — all headings, labels, buttons, nav tabs, stat values
- **Secondary font:** `Inter` (already in project) — body descriptions, wallet addresses, small helper text where pixel font would be illegible at tiny sizes
- **Google Fonts import:** `Press Start 2P` loaded via `<link>` in `layout.tsx` `<head>`

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#0d1117` | Page background, nav background |
| `bg-card` | `#111827` | Card backgrounds |
| `bg-card-gradient-start` | `#1a2332` | Pot card gradient start |
| `accent-green` | `#35D07F` | Borders, labels, active states, glow |
| `accent-gold` | `#FBCC5C` | Pot values, rank numbers |
| `text-muted` | `#4B5563` | Secondary text, inactive states |
| `text-dim` | `#374151` | Tertiary text, day labels |
| `error` | `#EF4444` | Error states |
| `green-glow` | `rgba(53, 208, 127, 0.5)` | text-shadow on headings |
| `gold-glow` | `rgba(251, 204, 92, 0.4)` | text-shadow on pot values |
| `shadow-green` | `rgba(53, 208, 127, 0.2)` | Pixel box-shadow on cards |
| `shadow-btn` | `#1a6b40` | Button box-shadow (darker green) |

## Card & Component Style

- **Border radius:** 2-4px (sharp, pixelated feel)
- **Borders:** 1-2px solid `#35D07F` on all cards
- **Box shadow:** `4px 4px 0 rgba(53, 208, 127, 0.2)` — pixel-art offset shadow
- **Glow:** Subtle `text-shadow: 0 0 8px` on primary headings (green) and pot values (gold)
- **No curves, no gradients on borders** — everything sharp and blocky

## Navigation (BottomNav)

- 2 tabs: Home, Board
- Replace emoji icons with inline SVG pixel-art:
  - **Home:** 8-bit house silhouette (~20x20, pixel-aligned paths, `shape-rendering: crispEdges`)
  - **Board:** 8-bit two-player figures (~20x20, same treatment)
- Active tab: green SVG fill + green text
- Inactive tab: `#4B5563` grey fill + grey text
- Nav background: `#0d1117`
- Top border: `1px solid #35D07F` (green line, not grey)
- Labels in Press Start 2P at small size (~8px)

## Component Specifications

### App Title (page.tsx)
- "MINISTREAK" in Press Start 2P, `#35D07F`, with green text-shadow glow
- Subtitle "WEEKLY STREAK GAME" in Press Start 2P, smaller, `#4B5563`

### Pot/Round Card
- Gradient background: `linear-gradient(135deg, #1a2332, #0d1117)`
- 2px solid `#35D07F` border, 2px radius
- Pixel box-shadow: `4px 4px 0 rgba(53, 208, 127, 0.2)`
- Round label: "ROUND #N" in Press Start 2P, green, small
- Pot value: large Press Start 2P, gold `#FBCC5C`, gold glow text-shadow
- Player count: small Press Start 2P, `#4B5563`
- Status badge: green border, sharp corners, "OPEN" / "CLOSED" in pixel font

### Round Timer
- 4 individual boxes with green 1px borders, 2px radius
- Numbers: Press Start 2P, white, large
- Labels ("DAYS", "HRS", "MIN", "SEC"): Press Start 2P, green, tiny
- Box background: `#1a1a2e` (subtle dark blue)

### Streak Card
- Green 2px border, pixel box-shadow
- Streak number: large Press Start 2P, white
- Label "CURRENT STREAK": Press Start 2P, green, small
- No emoji anywhere
- Today status: pixel checkbox square (40x40px)
  - Done: `#35D07F` border, green-tinted bg, pixel checkmark character
  - Pending: grey border, dark bg, empty
- "DONE TODAY" / "PENDING" in pixel font below checkbox

### Streak Calendar
- 7 pixel squares in a row (Mon-Sun)
- Completed: solid `#35D07F` fill, dark pixel `x` mark inside
- Incomplete: `#111827` bg, `#374151` border
- Day labels below each: Press Start 2P, tiny, grey
- Tx count below completed days: Press Start 2P, green, tiny

### Entry Button
- Full width, `#35D07F` background, `#0d1117` text
- Press Start 2P font, sharp corners (2px radius)
- Box-shadow: `4px 4px 0 #1a6b40`
- Text: "ENTER - 0.1 USDT"
- Loading: blinking `...` text ("APPROVING..." / "ENTERING..."), no spinner emoji
- Entered state: green border card, pixel checkmark text, "YOU'RE IN" in pixel font
- Disabled/closed: grey background, no shadow
- Error: red border card, pixel font error text, "TRY AGAIN" button

### Leaderboard
- **Ranks:** Text-based `#1`, `#2`, `#3` in gold Press Start 2P. `#4` and beyond in white/grey.
- **No emoji medals** anywhere
- Addresses: `Inter` monospace for readability at small size
- Streak values: green Press Start 2P
- Tx count / unique count: grey Inter
- Prize amounts: gold Inter
- Row styling: sharp corners, subtle border, `#111827` bg
- Highlighted row (current user): green-tinted bg, green border
- "TIED" label in gold pixel font where applicable

### Leaderboard Page (/leaderboard)
- Title: "LEADERBOARD" in Press Start 2P, white
- Round indicator: "ROUND #N" in pixel font, green
- 3 stat cards (Pot, Players, Status): sharp corners, green borders, pixel font values
- Same leaderboard component styling as home page
- Tiebreaker note: pixel font, green border card

### How It Works (Collapsible)
- Toggle heading: "HOW TO PLAY" in Press Start 2P, with pixel arrow `>>` / `<<`
- Green border card, sharp corners
- Steps: `01.` `02.` etc. in Press Start 2P green, description in Inter grey
- No emoji

### Quick TX Shortcut (TxShortcut)
- Heading: "QUICK STREAK TX" in Press Start 2P
- Description: Inter, grey
- Button: same pixel style as entry button
- Success: green border card, pixel checkmark text "TX SENT!", no emoji
- Error: red text in Inter

### Wallet Badge
- Press Start 2P for address text (truncated)
- Sharp corners (2px radius), green border
- Connect button: same pixel style, smaller

## Tailwind Config Changes

```ts
colors: {
  celo: {
    green: "#35D07F",
    gold: "#FBCC5C",
  },
  arcade: {
    bg: "#0d1117",
    card: "#111827",
    muted: "#4B5563",
    dim: "#374151",
    timer: "#1a1a2e",
  },
},
fontFamily: {
  pixel: ['"Press Start 2P"', 'monospace'],
  sans: ['Inter', 'system-ui', 'sans-serif'],
},
```

Remove unused `celo.purple`, `celo.dark`, `bounce-fire`, `pulse-slow` animations.

## globals.css Changes

Update component classes:

- `.card` — sharp corners (rounded-sm), green border, pixel box-shadow, `#111827` bg
- `.btn-primary` — sharp corners, pixel font, green bg, dark text, pixel box-shadow
- `.btn-secondary` — sharp corners, pixel font, grey bg, grey border
- `.badge` — sharp corners, pixel font, smaller padding

Add utility classes:
- `.pixel-shadow` — `box-shadow: 4px 4px 0 rgba(53, 208, 127, 0.2)`
- `.glow-green` — `text-shadow: 0 0 8px rgba(53, 208, 127, 0.5)`
- `.glow-gold` — `text-shadow: 0 0 6px rgba(251, 204, 92, 0.4)`

## layout.tsx Changes

- Add `<link>` for Google Fonts `Press Start 2P`
- Body background: `bg-[#0d1117]` instead of `bg-gray-950`
- Body text: `text-gray-100` stays

## Files Modified

| File | Changes |
|------|---------|
| `frontend/tailwind.config.ts` | New color tokens, font-pixel, remove unused |
| `frontend/app/globals.css` | Updated .card/.btn/.badge, new utility classes |
| `frontend/app/layout.tsx` | Google Fonts link, bg color |
| `frontend/app/page.tsx` | Pixel font classes, remove emoji, restyle |
| `frontend/app/leaderboard/page.tsx` | Pixel font classes, restyle |
| `frontend/components/BottomNav.tsx` | SVG pixel icons, pixel font, green border |
| `frontend/components/StreakCard.tsx` | Remove emoji, pixel checkbox, pixel font |
| `frontend/components/StreakCalendar.tsx` | Pixel squares, remove emoji |
| `frontend/components/Leaderboard.tsx` | Text ranks, remove emoji, pixel font |
| `frontend/components/EntryButton.tsx` | Remove emoji, pixel font, blinking loader |
| `frontend/components/RoundTimer.tsx` | Pixel font, green border boxes |
| `frontend/components/WalletBadge.tsx` | Pixel font, sharp corners |
| `frontend/components/TxShortcut.tsx` | Pixel font, remove emoji |

## No New Files

All changes modify existing files. No new components or utilities needed.

## No Logic Changes

Zero changes to hooks, data fetching, contract interaction, or business logic. Purely visual restyling.
