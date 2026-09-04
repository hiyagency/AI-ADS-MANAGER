# Meta connection steps for HIY Ads Manager

This is the only remaining integration that requires values from HIY's Meta Business account. The website, database schema, reporting tables, sync queue, retry logic, and client dashboard already have dedicated spaces for Meta data. Scheduled synchronization stays safely disabled until these steps are complete.

## Important security rule

Never paste a Meta token, Supabase secret key, or Netlify secret into ChatGPT, email, a GitHub issue, browser code, or any variable beginning with `VITE_`. Enter secret values directly in Netlify's environment-variable screen.

## Values that must be added

Add these in **Netlify → adsmanage → Project configuration → Environment variables**:

| Variable | What to enter | Secret? |
|---|---|---|
| `SUPABASE_SECRET_KEY` | The server-only secret key for Supabase project `gaymobhfserwkrnllygt` | Yes |
| `META_GRAPH_API_VERSION` | The current Marketing API version shown in the Meta developer app, such as `vXX.X` | No |
| `META_ACCESS_TOKEN` | A long-lived HIY Business system-user token with reporting access to the client ad accounts | Yes |
| `META_APP_ACCESS_TOKEN` | The app access token used only to validate the system-user token | Yes |
| `META_ATTRIBUTION_WINDOWS` | `7d_click,1d_view` | No |
| `META_SYNC_LOOKBACK_DAYS` | `35` | No |
| `META_SYNC_ENABLED` | Keep `false` until the validation below passes; then change to `true` | No |

`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PUBLIC_APP_URL`, and `SYNC_DISPATCH_SECRET` are application/deployment values rather than Meta values. They must also exist in Netlify. Do not replace the generated dispatch secret.

## Step-by-step Meta setup

1. Open [Meta for Developers](https://developers.facebook.com/apps/) and select HIY's production Business app, or create a Business app owned by HIY's Business Portfolio.
2. Add the Marketing API product to the app.
3. In Meta Business Settings, create a dedicated system user for Ads Manager reporting. Do not use a staff member's personal short-lived token.
4. Assign the system user to every client ad account that HIY is authorized to report on. Give it the minimum access required to view campaigns and insights.
5. Generate a system-user access token for the production app with `ads_read` and `business_management`. Store it immediately in Netlify as `META_ACCESS_TOKEN`.
6. Generate/copy the app access token and store it in Netlify as `META_APP_ACCESS_TOKEN`.
7. Copy the Marketing API version currently supported by the app into `META_GRAPH_API_VERSION`. Use the version displayed by Meta; do not rely on a version copied from an old tutorial.
8. In the live HIY Admin panel, open **Meta sync** and choose **Check credential**. Confirm the token is valid, unexpired, and both required permissions are present.
9. Choose **Connect account**, select the correct HIY client, discover the accessible Meta accounts, and attach the exact ad account to that client.
10. Click **Sync now** for one account. Wait for success, then compare spend, results, reach, impressions, and date range with Meta Ads Manager using the same attribution window.
11. Repeat the comparison for each client. Resolve any access or attribution mismatch before showing the dashboard to that client.
12. After at least one complete manual sync passes, change `META_SYNC_ENABLED` to `true` in Netlify. The six-hour scheduler will then dispatch isolated background sync jobs.
13. Check Netlify function logs and Admin → Meta sync after the first scheduled run. One client's failure will not stop the other client jobs.

## What the application saves

The database saves safe account identifiers, campaigns, ad sets, ads, daily metrics, exact period snapshots, availability markers, and sanitized synchronization logs. It does not have a column for the Meta access token. Tokens remain only in Netlify's server environment.

The client dashboard has five reporting windows: 7 days, 14 days, 28 days, this month, and lifetime. Non-additive Meta values such as reach and frequency come from exact period snapshots rather than incorrectly summing daily rows.

## Common problems

- **Missing permission:** regenerate the system-user token after assigning the app and ad account assets; confirm `ads_read` and `business_management`.
- **Account does not appear:** verify the system user has access to that exact ad account inside the same Business Portfolio.
- **Invalid or expired token:** replace `META_ACCESS_TOKEN` in Netlify and rerun **Check credential**. Never store it in Supabase or frontend code.
- **Numbers differ from Ads Manager:** compare the same dates, account timezone, attribution window, and result definition.
- **Scheduled sync does nothing:** confirm `META_SYNC_ENABLED=true` and that all four required server-side Meta/Supabase values exist in Netlify.
- **One client is stale:** use **Sync now** for that account and review its sanitized sync log; do not delete historical reporting rows.

## Copy this prompt into normal ChatGPT

```text
Help me connect Meta Marketing API to my existing HIY Ads Manager one screen at a time. The app is already deployed at https://ads.hiy.agency and supports server-only Netlify variables named SUPABASE_SECRET_KEY, META_GRAPH_API_VERSION, META_ACCESS_TOKEN, META_APP_ACCESS_TOKEN, META_ATTRIBUTION_WINDOWS, META_SYNC_LOOKBACK_DAYS, and META_SYNC_ENABLED. Do not ask me to paste any token or secret into chat. Tell me exactly which Meta or Netlify screen to open, wait for me to confirm each step, and help me create a least-privilege Meta Business system user with ads_read and business_management. Keep META_SYNC_ENABLED=false until credential check and a manual single-account reconciliation pass. Then guide me through connecting each client account and enabling the six-hour schedule.
```

## Completion checklist

- [ ] Supabase server secret is stored in Netlify, never in the browser.
- [ ] Meta system user belongs to HIY and has only the required client assets.
- [ ] Both required permissions pass **Check credential**.
- [ ] Every account is mapped to the correct client.
- [ ] Manual sync matches Meta Ads Manager for the same settings.
- [ ] Client tenant isolation is rechecked with two real client users.
- [ ] `META_SYNC_ENABLED` is changed to `true` only after reconciliation.
- [ ] First scheduled run completes and data-freshness timestamps update.
