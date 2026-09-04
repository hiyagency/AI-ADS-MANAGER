# HIY ADS MANAGER

HIY AGENCY's multi-tenant advertising portal. The application covers the public estimator, Supabase authentication and tenant isolation, the HIY admin workspace, immutable 31-day commercial assignments, a manual payment ledger, the client reporting dashboard, and the Phase 6/7 Meta Marketing API synchronization layer.

The production database schema and seven approved offers are deployed to Supabase project `gaymobhfserwkrnllygt`. The GitHub repository and Netlify site are connected, and `ads.hiy.agency` is the production hostname. Meta synchronization has a deliberate activation switch and remains disabled until HIY adds and verifies its private Meta credentials using `META_SETUP_README.md`.

## Current scope

- Public 28-day chart-based planning estimator with 25 niches and seven daily Meta budget tiers.
- Supabase Auth with role-protected `/admin` and `/dashboard` routes and fail-closed provisioning.
- Strict tenant RLS across profiles, clients, assignments, payments, Meta entities, daily metrics, and synchronization logs.
- Admin management for clients, secure invitations, standard/custom offers, duplication, publishing, archiving, private assignment, price customization, and payment recording/voiding.
- Seven authoritative 31-day packages, kept separate from the public 28-day estimator.
- Immutable client pricing snapshots with activation dates, history, notes, and exact paise-level database constraints.
- Client dashboard with billed/paid/outstanding values, allocation and utilization, five reporting periods, campaign metrics, freshness warnings, and loading/empty/error states.
- Server-only Netlify functions for client invitations, Meta account discovery and verification, credential health, soft disconnects, manual synchronization, six-hour dispatch, background processing, pagination, locking, rate-limit retries, attribution controls, and idempotent metric upserts.
- Stable Meta response normalization that distinguishes unavailable values from real zeroes and records sanitized sync diagnostics.
- Netlify security/build configuration and a production activation runbook for Supabase, Meta, Netlify, and `ads.hiy.agency`.

The complete Meta security boundary is documented in `META_INTEGRATION.md`; the remaining credential entry and account-connection procedure is in `META_SETUP_README.md`.

## Commercial pricing

The 31-day offer catalogue and assigned client agreements use:

- Meta media spend: daily budget × 31.
- HIY service: 35% of media spend.
- GST: 18% of media spend.
- Creative: one included basic creative from ₹2,000 in Month 1.
- Optional AI-manager fee, additional charges, and discount.

Every assignment freezes the complete calculation. Editing a catalogue offer later cannot change an existing client agreement. Payments are retained as an auditable ledger; corrections void an entry and add its replacement.

## Local setup

Requirements: Node.js 20+ and, for database integration tests, Docker.

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env.local` and add only browser-safe Supabase values:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

3. Start the Vite frontend:

   ```powershell
   npm run dev
   ```

For local Netlify functions, use `npx netlify dev` after adding the server-only variables from `.env.example` to an uncommitted local environment file. Never expose a Supabase secret/service-role key or Meta token through a `VITE_` variable.

Without browser-safe Supabase values, the public site remains available and protected portal routes show a safe configuration message.

## Database migrations

The reproducible local schema lives in `supabase/migrations/`:

1. multi-tenant Auth and RLS;
2. the 31-day offer catalogue;
3. admin/client management;
4. commercial assignments and payments;
5. Meta reporting and synchronization state.
6. Meta account verification, metric availability, freshness, and synchronization diagnostics.

The filenames match the applied hosted migration versions. Never edit applied migration files; add a new forward-only migration for future database changes.

## First administrator

After the migrations are applied to the correct project, create the Auth user through the Supabase Dashboard and promote that exact UUID using privileged SQL:

```sql
update public.profiles
set role = 'admin', status = 'active'
where id = 'THE-EXACT-AUTH-USER-UUID';
```

The Auth trigger starts every new profile as a disabled client and never trusts user metadata for role or tenant assignment.

## Client invitations

The Admin → Clients invitation form calls the protected `invite-client` Netlify function. That function verifies the caller as an active HIY administrator, invokes Supabase Auth with the server-only secret key, and attaches the invited user to exactly one client.

This flow requires Netlify Functions and the server-only Supabase variables; it does not work through a standalone Vite server. Public browser sign-up should remain disabled.

## Verification

```powershell
npm test
npm run lint
npm run build
```

Database integration tests require Docker and the local Supabase stack:

```powershell
npx supabase start
npx supabase test db
```

The pgTAP suites cover grants, RLS, Client A/Client B isolation, disabled-account behavior, immutable pricing, assignment replacement, the payment ceiling, and reporting visibility. RLS remains the authorization boundary; frontend route guards improve navigation and messaging only.
