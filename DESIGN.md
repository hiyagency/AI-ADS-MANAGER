# ADS MANAGER Design System

## Visual Theme

**Direction:** Precision performance cockpit. A client reviews campaign investment in a dim office or on a phone between meetings, needing bright signal, clear hierarchy, and calm confidence.

**Color strategy:** Committed. Midnight and ink surfaces establish focus; Meta-inspired electric blue carries interaction; HIY indigo adds brand depth; cyan and green are reserved for data signals.

## Color Palette

- Canvas: `oklch(0.115 0.018 258)`
- Deep surface: `oklch(0.155 0.025 258)`
- Raised surface: `oklch(0.195 0.032 258)`
- Cool border: `oklch(0.31 0.05 255)`
- Primary text: `oklch(0.965 0.008 250)`
- Secondary text: `oklch(0.73 0.025 252)`
- Electric blue: `oklch(0.63 0.22 255)`
- HIY indigo: `oklch(0.58 0.23 280)`
- Signal cyan: `oklch(0.78 0.15 210)`
- Success: `oklch(0.75 0.18 155)`
- Warning: `oklch(0.79 0.17 82)`

## Typography

Use Chivo Variable as a single committed sans family. Display text uses condensed tracking and strong weight contrast. Body text is regular with generous line height. Supporting labels are at least 12px and uppercase is reserved for short labels only.

## Layout

- Mobile-first with a 1180px maximum content width.
- Asymmetric hero: message on the left, interactive campaign preview on the right.
- Vary section density. Use open narrative bands between denser working surfaces.
- Prefer ledgers, timelines, charts, and split surfaces over identical card grids.
- Corners stay controlled at 10 to 20px, never pill-shaped by default.

## Components

- Buttons use solid electric blue or a quiet cool-border treatment with visible focus.
- Data panels use opaque blue-black surfaces and fine borders; blur is limited to the sticky navigation.
- Selected tabs include background, border, text, and check or state indicator.
- Pricing breakdown rows remain visible and explain the formula in plain language.
- Charts use blue and cyan signals with labels and patterns, not color alone.

## Operational Applications

- Admin pages use a persistent command rail on desktop and compact horizontal navigation on smaller screens.
- Offer and billing workflows pair editable controls with a live calculation ledger so the consequence of each value stays visible.
- Client reporting leads with commercial status and budget utilization before campaign-level detail.
- Loading, no-data, stale-data, connection-attention, and error states use explicit language and remain useful without animation.
- Dense financial and campaign rows collapse into labelled mobile blocks instead of causing horizontal page overflow.

## Motion

- Use transform and opacity only with exponential ease-out.
- One staged hero entrance, scroll reveals, metric crossfades, and a subtle chart trace.
- Pointer spotlight is desktop-only and nonessential.
- Reduced motion shows the complete final state immediately.

## Brand Assets

Use the supplied HIY AGENCY JPEG unchanged. Display the full image in hero and login contexts. Use CSS clipping and scaling for compact lockups so the source pixels remain unmodified.
