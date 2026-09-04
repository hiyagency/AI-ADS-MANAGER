# AI Ads Manager — What Is Built, What Is Left, and What Users Will See

Audit date: 4 September 2026

> The screenshots in this document use safe demonstration data. They do not contain real clients, Meta accounts, or live advertising results.

## Simple project summary

The application is built and deployed. The public website, secure role model, HIY admin panels, offer and billing engine, client dashboard, Meta reporting integration, and six-hour synchronization worker are in production code. The hosted Supabase schema has passed 146 database assertions and contains the seven approved 31-day offers.

The remaining account-owner work is operational onboarding: finish DNS/SSL, create the first Auth administrator, add the server-only Supabase and Meta credentials, connect real clients, and reconcile their first Meta sync. These steps require HIY's private account access and are documented in `META_SETUP_README.md`.

## Current phase status

| Phase | Current status | What is still required |
|---|---|---|
| 1. Public website | Deployed | Final custom-domain smoke test after DNS resolves |
| 2. Supabase and authentication | Schema and RLS deployed and tested | Configure Auth URLs/email and create the first administrator |
| 3. HIY Admin | Deployed | Verify the first real invitation and hosted mutations |
| 4. Offers and pricing | Deployed | Seven offers are live; onboard real assignments and payments |
| 5. Client dashboard | Deployed | Verify with the first two tenant-isolated client logins |
| 6. Meta Marketing API | Deployed but disabled | Add private credentials and reconcile one controlled ad account |
| 7. Automatic synchronization | Deployed with a safe activation switch | Enable only after manual Meta reconciliation |
| 8. Production deployment | Released on Netlify | Complete authenticated role QA after the first users exist |
| 9. Production domain | Assigned in Netlify | Add/verify Hostinger CNAME and wait for SSL issuance |

## What is already working in the code

- Public HIY landing page with the 28-day niche planning estimator.
- Twenty-five business niches and seven daily Meta budget levels.
- Separate authoritative 31-day commercial packages.
- Admin and client roles with protected routes.
- Tenant-level database security policies.
- Client creation, editing, enabling, disabling, login attachment, and secure invitation function.
- Standard and custom offers with publishing, duplication, editing, versioning, and archiving.
- Immutable client package assignments.
- Manual payment recording, outstanding balances, and auditable payment voiding.
- Client reporting for 7 days, 14 days, 28 days, this month, and lifetime.
- Campaign spend, reach, impressions, clicks, CTR, CPC, CPM, results, leads, messages, and supported video metrics.
- Meta account discovery, verification, credential health, disconnect, manual sync, rate-limit handling, and safe server-only token use.
- Six-hour synchronization dispatch, per-account isolation, incremental lookback, and sync history.
- Responsive layouts, loading states, empty states, error states, and branded 404 page.

## Required account-owner onboarding before clients can use it

Complete these steps in order:

1. In Hostinger, make `ads` a CNAME to `adsmanage.netlify.app`; wait for Netlify SSL.
2. Configure Supabase Site URL, redirect allowlist, invitation email, password recovery, SMTP, and disable unwanted public sign-up.
3. Create and promote the first real HIY administrator.
4. Add `SUPABASE_SECRET_KEY` directly to Netlify so protected invitations can create client logins.
5. Test the hosted admin workflow: create client, invite login, assign offer, record payment, and verify tenant isolation with two users.
6. Follow `META_SETUP_README.md` to add Meta values, connect one controlled account, and reconcile it with Meta Ads Manager.
7. Change `META_SYNC_ENABLED` to `true` only after the manual comparison passes, then observe the first scheduled run.
8. Complete authenticated desktop/mobile QA for both roles on `https://ads.hiy.agency`.

## Expected final output

### Public visitor

A branded website where a prospect can explore chart-based enquiry estimates, select a niche and Meta budget, understand GST/service/creative costs, and then proceed to the secure login page.

### Client

Each client receives an isolated account. After login, they see only their own:

- active package and exact frozen price;
- amount paid and outstanding;
- Meta advertising allocation, spend, remaining budget, and utilization;
- reporting freshness;
- campaign outcomes for selectable time periods;
- campaign-level spend, results, cost per result, CTR, and status;
- complete commercial breakdown.

### HIY administrator

You receive one command center for:

- client workspaces and login access;
- the complete offer catalogue;
- custom packages and immutable assignments;
- payment entry and outstanding balance tracking;
- Meta account mapping and credential health;
- manual synchronization and synchronization history.

### Background system

Every six hours, the deployed scheduler dispatches separate account jobs. Each job safely retrieves recent Meta campaigns and reporting data, updates records without duplicates, records diagnostics, and prevents one failed client from blocking the others.

## Features intentionally not included

These require a separate decision and are not blockers for the planned first release:

- online payment gateway;
- public self-registration;
- OAuth/social login;
- campaign creation or editing inside this portal;
- automatic budget changes or AI campaign optimization;
- a native mobile application.

## Screen previews

### 1. Public website — what a visitor sees

Pricing explanation, enquiry estimator, performance preview, and client login entry.

![Public website](docs/project-screenshots/01-public-home.png)

### 2. Login — what clients and HIY staff use

One secure entry point. The application sends each authenticated role to the correct workspace.

![Login](docs/project-screenshots/02-login.png)

### 3. Client dashboard — what the customer sees

The customer sees only their own commercial package, payments, budget, campaign performance, and reporting freshness.

![Client dashboard](docs/project-screenshots/03-client-dashboard.png)

### 4. Admin overview — what you see first

Your opening command-center summary: active clients, offers, package coverage, outstanding payments, client pulse, and rollout status.

![Admin overview](docs/project-screenshots/04-admin-overview.png)

### 5. Admin clients

Create and manage client workspaces, packages, contacts, status, attached users, and secure invitations.

![Admin clients](docs/project-screenshots/05-admin-clients.png)

### 6. Admin offers

Manage the seven 31-day packages and future custom/private offers with exact commercial breakdowns.

![Admin offers](docs/project-screenshots/06-admin-offers.png)

### 7. Admin billing

Assign frozen packages, record payments, view balances, preserve agreement history, and void incorrect payment entries.

![Admin billing](docs/project-screenshots/07-admin-billing.png)

### 8. Admin Meta sync

Connect client ad accounts, verify mappings, check credential health, start synchronization, and see account warnings.

![Admin Meta sync](docs/project-screenshots/08-admin-meta.png)

### 9. Branded 404

Unknown URLs receive a consistent recovery page instead of a blank screen.

![Not found](docs/project-screenshots/09-not-found.png)

## Final definition of done

The project is production-ready when the hosted database tests pass, real admin and client accounts work, one Meta account is reconciled against Meta Ads Manager, scheduled jobs remain healthy, every role sees only authorized data, the production domain has valid HTTPS, and final desktop/mobile QA reports no broken routes, console errors, or horizontal overflow.
