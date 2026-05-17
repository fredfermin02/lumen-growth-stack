# Lumen — Brand Tokens

Canonical reference for color and typography. Actual values live in the Shopify theme (`theme/config/settings_data.json` after step 5). This file is the source of truth when those drift.

## Palette

| Token | Hex | Use |
|---|---|---|
| `bg.base` | `#F6F1E7` | Off-white page background |
| `bg.inverse` | `#1B1B1B` | Dark sections, footer |
| `fg.base` | `#1B1B1B` | Ink / body text |
| `fg.inverse` | `#F6F1E7` | Text on dark sections |
| `accent.sage` | `#7C8C5C` | Secondary accent, badges |
| `accent.coral` | `#E37A5F` | Primary CTA, buy buttons |
| `border.subtle` | `#E4DDD0` | Card edges, dividers |
| `state.success` | `#5C8C6E` | Cart added, in-stock |
| `state.error` | `#B6593F` | Form errors, declines |

### Mapped to Shopify color schemes

**Scheme 1 — "Light" (default):**
- background = `bg.base`, foreground = `fg.base`, primary button = `accent.coral`, primary button label = `bg.base`, secondary button = `bg.base`, secondary button label = `fg.base`, accent-1 = `accent.sage`, accent-2 = `accent.coral`, link = `accent.coral`, badge = `accent.sage`.

**Scheme 2 — "Inverse" (dark sections):**
- background = `bg.inverse`, foreground = `fg.inverse`, primary button = `accent.coral`, primary button label = `bg.inverse`, secondary button = `bg.inverse`, secondary button label = `fg.inverse`, accent-1 = `accent.sage`, accent-2 = `accent.coral`, link = `accent.coral`, badge = `accent.sage`.

## Typography

| Token | Font | Weights | Use |
|---|---|---|---|
| `font.display` | Fraunces | 400, 600 | Headlines, hero copy |
| `font.body` | Inter | 400, 500, 600 | Body, UI, buttons |

Both are loaded via Shopify's theme font picker, which pulls from Google Fonts and serves through Shopify's CDN (no extra `@font-face` needed).

### Type scale (rem)

| Token | Size | Use |
|---|---|---|
| `text.xs` | 0.75 | Eyebrows, badges |
| `text.sm` | 0.875 | Small labels |
| `text.base` | 1.0 | Body |
| `text.lg` | 1.125 | Lead paragraph |
| `text.xl` | 1.5 | Section headings |
| `text.2xl` | 2.25 | Page headings |
| `text.3xl` | 3.5 | Hero headlines (display font) |

## Voice

- Calm, knowing, ingredient-forward.
- Specific over superlative ("200mg lion's mane" over "supercharged focus").
- Lowercase styling where appropriate (the wordmark, section eyebrows).
- Never: "supercharge," "unlock your potential," "next-level," "game-changing."
