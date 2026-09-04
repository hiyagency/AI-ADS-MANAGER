# Production operations runbook

The repository is connected to GitHub, Supabase project `gaymobhfserwkrnllygt`, and Netlify site `adsmanage`. The production hostname is `ads.hiy.agency`. Use this runbook for final account activation and future releases.

## 1. Supabase

1. Confirm every database command targets project `gaymobhfserwkrnllygt` before applying it.
2. Review migration history, apply new migrations in timestamp order, and run every suite in `supabase/tests`.
4. Run Supabase database advisors and resolve security or performance findings.
5. Disable public email sign-up. Configure the Site URL and redirect allowlist for the Netlify preview URL and, later, `https://ads.hiy.agency/login`.
6. Create the first Auth user in the Dashboard, then promote its exact UUID to an active admin using the SQL documented in `README.md`.
7. Configure a production SMTP provider and customize the client invitation template.

## 2. Meta

1. Confirm the HIY Business portfolio, developer app, required Marketing API permissions, and access to every client ad account.
2. Generate an agency system-user token with the minimum permissions needed for reporting and a server-only app access token for credential diagnostics.
3. Set `META_GRAPH_API_VERSION` to the currently approved version and add both tokens only to Netlify's server environment.
4. Review `META_ATTRIBUTION_WINDOWS` and `META_SYNC_LOOKBACK_DAYS`; retain the documented defaults unless HIY approves a reporting change.
5. In Admin → Meta sync, run **Check credential**, confirm required permissions, discover the accessible accounts, and connect each account to the correct client.
6. Run one manual sync and verify campaigns, daily totals, result mapping, unavailable-metric states, attribution behavior, token status, and Meta usage diagnostics before enabling client access.

## 3. Netlify

1. Use the connected `adsmanage` site. Build settings are checked into `netlify.toml`: `npm run build`, `dist`, and `netlify/functions`.
2. Add every server variable listed in `.env.example`; mark all secret values as sensitive.
3. Use a deploy preview to test invitation, login, offer assignment, payment recording, dashboard isolation, manual sync, scheduled dispatch, 404 handling, and responsive layouts.
4. Publish production only after the SQL tests, frontend tests, lint, TypeScript, and production build pass.
5. Monitor function logs and the Admin → Meta sync status after release.

## 4. Domain and SSL

1. Keep `ads.hiy.agency` assigned to the `adsmanage` Netlify site.
2. Keep only the `ads` CNAME pointing to `adsmanage.netlify.app`. Do not replace records for the apex `hiy.agency` site.
3. Wait for Netlify SSL issuance and require HTTPS.
4. Replace preview redirect URLs with the production domain in Supabase and the Meta developer app.
5. Repeat login, invitation, admin, client, sync, mobile, 404, SSL, and browser-console checks on the final hostname.

## Backups and rollback

- Enable Supabase backups before first production data entry and verify the plan's retention window.
- Export offer, assignment, and payment records before a destructive production migration.
- Roll back application releases through the previous known-good Netlify deploy.
- Database migrations are forward-only. Prepare a reviewed corrective migration instead of editing or deleting applied migration history.
- If Meta synchronization degrades, mark the affected account inactive or remove its server token, preserve existing metrics, and keep the commercial dashboard available.

## Privacy and operational controls

- Store only client contacts, commercial records, account identifiers, and reporting metrics required for the portal.
- Keep Supabase secret keys, Meta tokens, and dispatch secrets in server environment variables only.
- Use disabled/archived/voided states instead of hard deletion so commercial history remains auditable.
- Limit production administrators, review access periodically, and rotate tokens immediately after suspected exposure.
