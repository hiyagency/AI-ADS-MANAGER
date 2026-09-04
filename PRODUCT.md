# ADS MANAGER

## Register

brand

## Users

HIY AGENCY advertising clients who want to understand their campaign investment, expected enquiry opportunity, and live performance without learning Meta Ads Manager. They are usually business owners or operators checking the portal quickly on a phone and need direct, confidence-building explanations of costs and results.

## Product Purpose

ADS MANAGER is HIY AGENCY's multi-client advertising portal. Its public experience explains how packages are priced, separates client payment from actual Meta advertising budget, and makes performance reporting feel simple. Phases 1-3 established the public experience, Supabase access model, admin command layer, and approved 31-day catalogue. Phase 4 adds versioned offers, frozen assignments, and payment history. Phase 5 adds client reporting. Phases 6-7 provide the Meta connection, normalization, scheduling, and reliability layer. The hosted schema is active; real Meta data begins after HIY enters and verifies its private credentials.

## Access Model

- Every Auth user receives a disabled client profile and must be provisioned by HIY through a trusted administrative path.
- Global HIY administrators and client users share one application but enter separate protected route shells.
- Each client login belongs to exactly one client tenant. A client tenant may have multiple logins.
- Active profile, membership, and client records are all required before client data becomes readable.
- Database grants and Row Level Security are authoritative. Frontend route guards provide navigation and status messaging only.
- Active admins can create, duplicate, edit, publish, privately assign, and archive offers. Hard deletion is intentionally unavailable.
- An assignment freezes its complete price breakdown and commercial dates. Catalogue edits cannot rewrite client history.
- Active admins can record or void payments and see billed, paid, and outstanding totals.
- Auth invitations and Meta synchronization cross a protected Netlify server boundary; neither Supabase administrative credentials nor Meta tokens enter browser code.
- Client reporting tables remain tenant-scoped and read-only to browser sessions. Service-role server functions own synchronization writes.
- Public sign-up, password recovery, OAuth, a payment gateway, campaign editing, and automatic ad optimization remain out of scope.

## Commercial Model

- The approved offer catalog uses a 31-day cycle and remains separate from the Phase 1 chart-based 28-day estimator.
- Meta media spend is daily budget multiplied by 31.
- HIY service is 35% of media spend. GST is 18% of media spend only.
- Month 1 includes one basic ₹2,000 creative and ₹0 AI Ads Manager access.
- Month 2 base excludes a fresh creative and includes AI Ads Manager from ₹499/month.
- Seven plans run from ₹200/day Local Starter to ₹1,500/day Market Dominance, with higher-spend creative recommendations stored explicitly.

## Operational Surfaces

- `/admin/clients`: client workspaces, membership attachment, and protected invitations.
- `/admin/offers`: standard/custom catalogue authoring, duplication, visibility, and archiving.
- `/admin/billing`: immutable assignment creation, commercial history, and the manual payment ledger.
- `/admin/meta`: Meta-account mappings, token/freshness status, sync history, and manual dispatch.
- `/dashboard`: client billing, allocation, time-range metrics, campaign performance, and data-freshness states.

## Activation Boundary

The repository, Supabase project, and Netlify site are connected. Production operations follow the checked-in deployment runbook. Meta credentials and client account permissions remain an explicit business-account activation step documented separately in `META_SETUP_README.md`.

## Brand Personality

Calibrated, luminous, exact. The interface should feel like a premium campaign-control surface operated by a human agency: advanced but understandable, energetic but never noisy, and transparent about every rupee.

## Anti-references

- Generic purple SaaS landing pages with repeated icon cards.
- A copy of Meta Ads Manager or use of Meta's logo.
- Excessive glassmorphism, floating gradients, dashboard clutter, or decorative animation.
- Claims that imply estimated enquiries are guaranteed outcomes.
- Tiny low-contrast labels or interactions that only work with a mouse.

## Design Principles

1. Make the pricing explorer useful enough to be the visual centerpiece.
2. Show the relationship between Meta spend, GST, service, creative, and total payment in plain language.
3. Let clients explore estimates through meaningful controls instead of passive decoration.
4. Use HIY's identity as the source of visual authority, with Meta-inspired performance cues rather than imitation.
5. Keep every route mobile-first, accessible, and operational without motion.

## Accessibility & Inclusion

Target WCAG 2.2 AA contrast and interaction patterns. All controls require visible keyboard focus, semantic roles, 44px touch targets, and non-color selected states. Respect reduced-motion preferences and disable pointer effects for touch or coarse-pointer devices.
