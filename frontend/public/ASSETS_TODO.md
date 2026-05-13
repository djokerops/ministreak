# Public Assets — MiniPay Submission Requirements

The following assets must be placed in this directory before MiniPay submission.
All listings are referenced by `frontend/app/layout.tsx` and the MiniPay
discovery listing.

## Required

| File              | Format    | Size       | Purpose                              |
|-------------------|-----------|------------|--------------------------------------|
| `icon-512.png`    | PNG/WebP  | 512x512    | High-res app icon (MiniPay listing)  |
| `icon-192.png`    | PNG/WebP  | 192x192    | PWA icon                             |
| `favicon.ico`     | ICO       | 32x32+     | Browser favicon                      |
| `apple-touch-icon.png` | PNG  | 180x180    | iOS home-screen icon                 |
| `og-image.png`    | PNG/WebP  | 1200x630   | Open Graph share preview             |

## Guidelines (MiniPay rules)

- Prefer **SVG or WebP** for non-photographic images. PNG is acceptable for
  icons but should be optimized (try `squoosh.app`).
- Logo must be **prominent and clearly distinct** from MiniPay's branding —
  the user should know your app, not MiniPay, operates this service.
- No CELO branding in any asset. Stablecoin / USDT branding is fine.

## After dropping files in

- `layout.tsx` already references these paths via `metadata.icons` and
  `openGraph.images`; no code change needed.
- Verify with `npm run build && npm run start`, open the app in a browser,
  inspect `<head>` for icon links.
