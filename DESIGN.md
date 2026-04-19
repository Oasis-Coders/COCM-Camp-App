# COCM Camp App — Design System

> Inspired by Airbnb's warm, photography-forward aesthetic, adapted for an
> outdoor camp & event management app. Nature palette, generous rounding,
> multi-layer shadows, and a cozy serif-meets-sans typography pairing.

## 1. Visual Theme & Atmosphere

The COCM Camp App is a warm, nature-inspired management tool that should feel
like a well-designed lodge notice-board — friendly, organised, inviting. The
design operates on a warm sand/cream canvas (`#faf6ee`) rather than clinical
white, with deep forest green (`#0f3d2e`) as the primary brand color and a
burnt ember orange (`#d26a39`) as the singular accent for CTAs and alerts.

Typography pairs a warm serif display face (**DM Serif Display** / serif
fallback) for headings with a clean humanist sans (**Inter** / system-ui
fallback) for body text. This serif + sans pairing evokes outdoor signage
and camp journals — approachable yet structured.

The component language uses Airbnb-style multi-layer shadows, generous
border-radius (12px–28px), and tactile card surfaces that feel lifted off a
wooden table. Photography and illustrations are encouraged but never required
— the palette and typography should carry the identity on their own.

**Key Characteristics:**
- Warm cream canvas (`#faf6ee`) — never pure white
- Deep Forest Green (`#0f3d2e`) as primary brand color
- Ember Orange (`#d26a39`) as singular accent for CTAs and highlights
- Serif + sans type pairing (DM Serif Display + Inter)
- Three-layer card shadows for warm, natural depth
- Generous border-radius: 12px buttons, 20px inputs, 28px cards
- Nature-inspired naming: forest, moss, sand, ember, sky

## 2. Color Palette & Roles

### Core Brand
| Token           | Hex        | Role                                        |
|-----------------|-----------|---------------------------------------------|
| `camp-forest`   | `#0f3d2e` | Primary text, headings, nav, filled buttons  |
| `camp-moss`     | `#4f7a5c` | Secondary text, labels, subtle accents       |
| `camp-sand`     | `#f4e8c1` | Card surfaces, tag fills, soft backgrounds   |
| `camp-ember`    | `#d26a39` | Primary CTA, badges, active indicators       |
| `camp-sky`      | `#d9edf6` | Info banners, calendar highlights            |

### Extended Palette (new)
| Token                | Hex / Value           | Role                                     |
|---------------------|-----------------------|------------------------------------------|
| `camp-cream`         | `#faf6ee`             | Page background (replaces pure white)     |
| `camp-forest-light`  | `#1a5c43`             | Hover variant for forest elements         |
| `camp-ember-dark`    | `#b8532b`             | Pressed / dark variant of ember           |
| `camp-ember-light`   | `#f9e0d0`             | Soft ember tint for error/alert surfaces  |
| `camp-border`        | `rgba(15,61,46,0.10)` | Card borders, dividers                    |
| `camp-disabled`      | `rgba(15,61,46,0.24)` | Disabled text and controls                |

### Surface & Shadows
- **Page background**: `#faf6ee` (camp-cream)
- **Card surface**: `#ffffff` (pure white — cards pop against cream)
- **Card shadow**: `rgba(15,61,46,0.03) 0px 0px 0px 1px, rgba(15,61,46,0.05) 0px 2px 8px, rgba(15,61,46,0.10) 0px 8px 24px`
- **Hover shadow**: `rgba(15,61,46,0.08) 0px 4px 16px`
- **Panel shadow** (modals): `0 18px 60px rgba(15,61,46,0.14)`

## 3. Typography Rules

### Font Families
- **Display / Headings**: `'DM Serif Display', 'Georgia', serif`
- **Body / UI**: `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`

### Hierarchy

| Role             | Font             | Size       | Weight | Line Height | Letter Spacing | Notes               |
|------------------|------------------|------------|--------|-------------|----------------|----------------------|
| Page Title       | DM Serif Display | 32px 2rem  | 400    | 1.25        | -0.02em        | Main headings        |
| Section Heading  | DM Serif Display | 24px 1.5rem| 400    | 1.33        | -0.01em        | Card/section titles  |
| Sub-heading      | Inter            | 18px 1.125rem| 600  | 1.44        | normal         | Feature headings     |
| Body             | Inter            | 15px 0.94rem | 400  | 1.6         | normal         | Paragraphs, forms    |
| Body Medium      | Inter            | 15px 0.94rem | 500  | 1.6         | normal         | Emphasized body      |
| Small / Caption  | Inter            | 13px 0.81rem | 500  | 1.38        | 0.01em         | Helpers, timestamps  |
| Tag / Badge      | Inter            | 11px 0.69rem | 600  | 1.27        | 0.04em         | Status badges        |
| Button Label     | Inter            | 15px 0.94rem | 600  | 1.0         | 0.01em         | All buttons          |

### Principles
- Headings always use the serif (DM Serif Display) for warmth.
- Body and UI always use the sans (Inter) for clarity.
- Never go below weight 400 for body or 600 for buttons.
- Slight negative letter-spacing on headings creates a cozy feel.
- Positive letter-spacing on small/tag text aids readability.

## 4. Component Stylings

### Buttons

**Primary (Ember CTA)**
- Background: `#d26a39` → hover `#b8532b`
- Text: `#ffffff`, weight 600, 15px
- Padding: 12px 24px
- Radius: 12px
- Shadow: `0 2px 8px rgba(210,106,57,0.25)`
- Transition: `all 150ms ease`
- Focus ring: `0 0 0 3px rgba(210,106,57,0.35)`

**Secondary (Forest)**
- Background: `#0f3d2e` → hover `#1a5c43`
- Text: `#ffffff`
- Same sizing as primary

**Ghost / Outline**
- Background: transparent → hover `rgba(15,61,46,0.06)`
- Border: `1.5px solid rgba(15,61,46,0.20)` → hover `rgba(15,61,46,0.40)`
- Text: `#0f3d2e`
- Radius: 12px

**Danger**
- Background: `#c13515` → hover `#a52d12`
- Text: `#ffffff`

### Cards & Panels
- Background: `#ffffff`
- Border: `1px solid rgba(15,61,46,0.08)`
- Radius: **28px** (large panels), **20px** (standard cards)
- Shadow: three-layer camp shadow (see §2)
- Hover (if interactive): translate-y(-2px) + hover shadow
- Padding: 24px (desktop), 16px (mobile)

### Inputs & Selects
- Background: `#ffffff`
- Border: `1.5px solid rgba(15,61,46,0.15)` → focus `#4f7a5c`
- Radius: 20px
- Padding: 12px 16px
- Focus ring: `0 0 0 3px rgba(79,122,92,0.20)`
- Text: `#0f3d2e`, placeholder `rgba(15,61,46,0.40)`

### Badges / Tags
- Background: `#f4e8c1` (sand) for default, `#d26a39` for active
- Text: `#0f3d2e` (sand bg) or `#ffffff` (ember bg)
- Radius: 10px
- Padding: 4px 10px
- Font: 11px Inter weight 600

### Navigation / Sidebar
- Background: `#0f3d2e` (forest)
- Active item: `rgba(255,255,255,0.12)` bg + white text
- Inactive: `rgba(255,255,255,0.65)` text
- Item radius: 12px
- Item padding: 10px 16px

### Tables
- Header bg: `#f4e8c1` (sand), text weight 600
- Row divider: `1px solid rgba(15,61,46,0.08)`
- Alternating rows: `#faf6ee` / `#ffffff` (subtle)
- Cell padding: 12px 16px
- Radius on table container: 20px with overflow-hidden

### Modals & Dialogs
- Overlay: `rgba(15,61,46,0.40)` backdrop-blur 4px
- Surface: `#ffffff`, radius 28px
- Shadow: panel shadow
- Max-width: 520px (small), 720px (medium)
- Padding: 32px

## 5. Layout Principles

### Spacing System (8px base)
- `2px` — hairline gaps, border offsets
- `4px` — inline icon spacing
- `8px` — compact element spacing
- `12px` — button internal padding
- `16px` — card padding (mobile), grid gap (tight)
- `20px` — standard section gap
- `24px` — card padding (desktop)
- `32px` — section spacing
- `48px` — major section dividers
- `64px` — page-level vertical rhythm

### Grid
- Max content width: 1200px, centered with auto margins
- Standard page padding: 24px (mobile) → 48px (desktop)
- Dashboard grid: `repeat(auto-fill, minmax(320px, 1fr))` with 20px gap
- Calendar grid: fixed column layout with 72px time gutter

### Whitespace Philosophy
- **Lodge-board spacing**: Generous padding around cards (20–32px gaps) creates
  a calm, organised feel — not a cramped spreadsheet.
- **Content breathes**: Every section has at least 32px vertical margin above.
- **Cards are islands**: Each card is a self-contained unit floating on the
  cream canvas, not edge-to-edge panels.

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Ground (0) | No shadow, border only | Flat badges, dividers |
| Card (1) | Three-layer camp shadow | Cards, panels, dropdowns |
| Hover (2) | Hover shadow + translateY(-2px) | Interactive card hover |
| Modal (3) | Panel shadow + backdrop blur | Modals, overlays |

## 7. Do's and Don'ts

### Do
- Use `#faf6ee` (cream) for page backgrounds — never clinical `#ffffff`
- Use `#ffffff` for card surfaces — they should "pop" against cream
- Apply the three-layer shadow to ALL elevated surfaces
- Use DM Serif Display for every heading — the serif warmth is the brand
- Use Inter for all body/UI text — clean and functional
- Apply ember orange (`#d26a39`) only for primary CTAs and active states
- Use generous border-radius: 12px buttons, 20px inputs, 28px panels
- Pad generously: 24px minimum inside cards

### Don't
- Don't use pure white (`#ffffff`) as page background — always cream
- Don't use pure black (`#000000`) for text — always `#0f3d2e` (forest)
- Don't apply ember orange to large surfaces or backgrounds
- Don't use sharp corners (<8px radius) on any component
- Don't use thin font weights (300) anywhere
- Don't mix serif into body text or sans into headings
- Don't use flat cards without the three-layer shadow

## 8. Responsive Behavior

| Breakpoint | Width      | Key Changes                              |
|-----------|------------|------------------------------------------|
| Mobile     | <640px     | Single column, 16px card padding, stacked nav |
| Tablet     | 640–1024px | 2-column grid, sidebar collapses         |
| Desktop    | >1024px    | Full sidebar, 3-column dashboard grid    |

### Touch Targets
- Minimum 44px touch target on all interactive elements
- Buttons: minimum height 44px
- Nav items: full-width tap targets with 12px vertical padding

## 9. Transition & Animation

- **Default transition**: `all 150ms ease`
- **Card hover**: `transform 200ms ease, box-shadow 200ms ease`
- **Page transitions**: Skeleton loading states matching card dimensions
- **Focus**: ring appears with `150ms ease` — never instant
- **Avoid**: bouncing, sliding, parallax — keep it calm and grounded

## 10. Icons

- Style: outline / line icons (not filled)
- Stroke: 1.5px–2px
- Size: 20px default, 16px compact, 24px large
- Color: inherits from text color
- Preferred set: Heroicons (outline) or Lucide — consistent with camp aesthetic
