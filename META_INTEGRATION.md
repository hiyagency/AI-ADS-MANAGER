# Phase 6 Meta Marketing API integration

## Status

Phase 6 and the Phase 7 reliability layer are implemented, and their database migrations are applied to Supabase project `gaymobhfserwkrnllygt`. No Meta request is made until HIY supplies its server-only credentials. The scheduled function is deployed with `META_SYNC_ENABLED=false`, so an incomplete Meta setup produces no failing background jobs.

## Credential boundary

- META_ACCESS_TOKEN is the reporting credential used for ad-account and insights requests.
- META_APP_ACCESS_TOKEN is used only to inspect the reporting token through Meta's token-debug endpoint.
- Both values are server-only and must never use the VITE_ prefix.
- The browser receives sanitized account metadata, token status, expiry timestamps, permission names, reporting values, and sync diagnostics. It never receives either credential.
- No credential column exists in the exposed PostgreSQL schema.

The intended production credential is a HIY agency system-user token with the minimum reporting access. Phase 6 requests ads_read and business_management; the credential-health response explicitly reports either permission when missing.

## Admin workflow

1. **Check credential** validates token status, expiry, data-access expiry, and required permissions.
2. **Connect account** retrieves ad accounts visible to the agency credential.
3. The administrator selects a client workspace and an available Meta account.
4. Saving re-fetches that exact account server-side before storing the safe mapping.
5. **Sync now** creates an auditable sync log and dispatches an isolated background worker.
6. **Disconnect** disables future syncs while retaining campaigns, metrics, and synchronization history.

Manual IDs remain accepted for operational recovery, but the server still verifies the account before saving it.

## Reporting normalization

- Campaigns, ad sets, and ads retain Meta identifiers, effective/configured status, safe descriptive fields, and last_seen_at.
- Insights are stored per campaign, date, and attribution-window key through idempotent upserts.
- Meta's own aggregate response is also stored for account and campaign scopes across 7-day, 14-day, 28-day, current-month, and lifetime windows. These snapshots are the source for non-additive reach, frequency, and exact period totals.
- Daily rows power trend charts only. The dashboard shows their actual first and last synchronized dates, so a lifetime total is never confused with partial local chart history.
- The default attribution request is 7d_click,1d_view. Supported values are validated before any Graph request.
- The default incremental lookback is 35 days so a first synchronization covers a complete 31-day package cycle, and it can be configured from 1–90 days.
- Missing metrics are recorded in available_metrics; the client UI displays an em dash and an explicit unavailable message instead of presenting missing data as zero.
- Result selection uses a stable priority: messaging conversations, leads, purchases, completed registrations, contacts, then link clicks.
- Video plays and ThruPlays remain separate metrics.

## Reliability and diagnostics

- Graph pagination is followed up to a 50-page safety limit.
- Paging URLs are restricted to https://graph.facebook.com and any query-string access token is removed before the next request.
- Credentials are sent through the Authorization header for ordinary Graph requests.
- HTTP 429, server failures, and recognized transient/rate-limit error codes receive up to three bounded exponential retries and honour Retry-After.
- Sync logs retain records processed, pages fetched, retries, and sanitized Meta usage headers.
- Invalid/expired credentials and restricted accounts move the mapping into an attention state without exposing the raw credential.
- Ownership-bound, per-client leases prevent overlapping workers from synchronizing the same client, and only the owning invocation can finalize or release its lease.
- Background failures are rethrown after their database state is finalized so Netlify can perform its platform retries.
- Scheduled dispatch uses keyset pagination and bounded concurrency, while one client failure remains isolated from the remaining queue.
- Campaigns, ad sets, and ads missing from a later complete Meta response are marked non-current instead of remaining silently active.

## Credential activation

Repository deployment and the hosted database are complete. Follow `META_SETUP_README.md` to add the remaining server-only Supabase and Meta values, validate permissions, discover real accounts, reconcile one manual synchronization against Meta Ads Manager, and only then enable the six-hour schedule.
