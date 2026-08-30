# Render static-site rollout and operations

## Decision and scope

The public Saberistic site is a separate Next.js static export in `apps/site`. Render serves its
`out` directory from the Static Site CDN, so the homepage, prototype directory, prototype detail
pages, privacy page, and readiness page do not sleep.

Payload remains the source of truth and continues to run as the Free Docker web service at
`https://saberistic-web-staging.onrender.com`. Umami remains a separate Free Docker web service at
`https://umami.saberistic.com`. Only Payload and Umami can cold-start; a cold or unavailable backend
must not take the last successful public static deploy offline.

The live cutover completed on **2026-08-30 at 07:25 UTC**. The evidence table at the end of this
document records the service IDs, deploys, domain state, certificates, content revision, and
remaining DNS cleanup precisely; it does not treat an unverified item as complete.

## Target architecture

| Surface                 | Runtime and origin                                                  | Responsibility                                                                                       |
| ----------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Public site             | Render Static Site at `https://saberistic.com`                      | CDN-hosted exported HTML, JavaScript, CSS, and public prototype pages                                |
| Payload CMS             | Docker web service at `https://saberistic-web-staging.onrender.com` | Admin, database-backed content, snapshot API, publication hooks, and server-only application secrets |
| Public content contract | `GET /api/public/site-snapshot/v1` on the Payload origin            | Versioned, allowlisted, strict public build snapshot                                                 |
| Analytics               | Docker web service at `https://umami.saberistic.com`                | Tracker script, event ingestion, and analytics UI                                                    |
| Database                | Render Free PostgreSQL                                              | Payload data and the isolated Umami schema during this temporary staging phase                       |

The existing Payload Docker service must not be converted in place to `runtime: static`. Render
service type/runtime changes are not an in-place migration, so the Blueprint must add a new,
uniquely named static service and leave the two Docker services intact. The static service publishes
`apps/site/out`; it does not use a SPA catch-all because the Next export emits real route directories
with `trailingSlash: true`.

The static build uses the public Payload HTTPS origin. Render Static Sites cannot use another
service's private-network hostname during a CDN build. No browser request to Payload is required to
render the exported pages.

## Public snapshot build contract

The Payload endpoint `GET /api/public/site-snapshot/v1` is the only build-time content interface.
It returns a version-1 object containing a generation time, a SHA-256 content revision, the public
prototype directory, and the homepage prototype feed. It returns `503` instead of a partial or
"unavailable" snapshot when public content cannot be read.

Before `next build`, `apps/site/scripts/fetch-content.ts` performs one remote fetch and atomically
writes `.generated/public-content.json`. Every exported route reads that same validated artifact, so
one deployment cannot mix content from different CMS reads or build workers. The client enforces:

- an explicit `STATIC_CONTENT_MODE=remote` production mode;
- HTTPS outside localhost and the exact versioned endpoint on `PAYLOAD_PUBLIC_URL`;
- no redirects or cross-origin responses;
- JSON content, a 2 MiB maximum, valid dates and revision, strict public field shapes, valid URLs and
  slugs, unique IDs/slugs, and homepage references that exist in the public list;
- bounded retries to allow a sleeping Payload service to wake; and
- a hard build failure after the retry window instead of an empty or fixture deployment.

Fixture content exists only for local verification through `pnpm build:site:fixture`. It is forbidden
when Render sets `RENDER=true`. A production build is `pnpm build:site`, which selects remote mode and
requires `PAYLOAD_PUBLIC_URL=https://saberistic-web-staging.onrender.com`.

Next statically enumerates every prototype slug with `generateStaticParams` and rejects unknown
dynamic slugs. The readiness query-string behavior runs in a client component inside `Suspense`, so
its selected state is correct after static hydration.

If Payload is asleep, unavailable, redirects unexpectedly, returns an incompatible schema, or
returns oversized/invalid content, the new static deployment fails. Render's prior successful static
deploy remains the CDN production artifact. Do not weaken this fail-closed behavior to make a build
green.

## Origins, environment, and secrets

The CMS's self-origin and the public canonical origin are intentionally different:

| Variable                      | Service                   | Value or rule                                                                                              |
| ----------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `SITE_URL`                    | Payload                   | `https://saberistic-web-staging.onrender.com`; drives Payload `serverURL`, admin links, and its own origin |
| `PUBLIC_SITE_URL`             | Payload                   | `https://saberistic.com`; public canonical/seed origin and an allowed CORS/CSRF origin                     |
| `PAYLOAD_PUBLIC_URL`          | Static Site               | `https://saberistic-web-staging.onrender.com`; server-side build source, not a credential                  |
| `STATIC_CONTENT_MODE`         | Static Site/build command | `remote`; the root `build:site` script sets this explicitly                                                |
| `UMAMI_SCRIPT_URL`            | Static Site               | Public build-time tracker URL, expected to use `https://umami.saberistic.com/script.js`                    |
| `UMAMI_WEBSITE_ID`            | Static Site               | Public build-time website identifier; verify it in Umami before cutover                                    |
| `UMAMI_TRACK_DOMAINS`         | Static Site               | Public build-time allowlist, expected to include only `saberistic.com,www.saberistic.com`                  |
| `STATIC_SITE_DEPLOY_HOOK_URL` | Payload only              | Secret Render deploy-hook URL, configured outside source control                                           |

The three Umami values are intentionally present in exported HTML/JavaScript and are not
credentials. Any change to them requires another static deployment. Invalid or incomplete values
disable the tracker instead of breaking the public site.

Never give the Static Site `DATABASE_URL`, `PAYLOAD_SECRET`, the deploy-hook URL, Payload admin
credentials, OpenRouter/API credentials, Umami administrator credentials, or database bootstrap
secrets. Keep server-only secrets on their owning web service. Configure the deploy hook in the
Payload environment as a secret (`sync: false` in the Blueprint); an existing `sync: false` entry is
not populated automatically by a Blueprint sync.

If a daily rebuild is triggered from GitHub Actions, store the same hook URL in a GitHub Actions
secret as well. Never print it, copy it into documentation, pass it to the Static Site, or expose it
in build output. Regenerating the Render hook requires updating every secret copy.

## Content-triggered and scheduled rebuilds

Payload requests a static deploy after any public prototype transition or change that can alter the
snapshot:

- publish;
- unpublish;
- a public-field edit while the current or previous version is published; and
- deletion of a published record.

The hook sends an authenticated `POST` to Render, follows no redirects, times out, and accepts only
HTTP `200` or `202`. Logs record the outcome but never the hook URL. A hook failure does not roll back
the editor's successful database transaction; it produces a warning and requires an operator to
retry the deploy manually or with a newly verified hook.

`featureUntil` is evaluated while Payload creates the snapshot. Once HTML is exported, time passing
alone cannot remove an expired feature from the homepage. Configure one daily deploy-hook call as a
safety rebuild even when editors make no changes. The GitHub Actions schedule and secret were
enabled and manually accepted on 2026-08-30. A content editor can also trigger an immediate rebuild
after changing the feature state.

Introduce future public content by extending a new versioned snapshot contract. Keep `/v1`
compatible until every deployed static build has moved to the successor; do not silently change the
meaning or shape of version 1.

## Two-stage rollout

### Stage 1: compatibility and domainless acceptance

1. Deploy the Payload changes first while `saberistic.com` still points to the existing web service.
   Verify the CMS still starts, admin login works on the `onrender.com` URL, CORS/CSRF accepts the
   canonical public origin, and `/api/public/site-snapshot/v1` returns a strict `200` response.
2. Add a new Render Static Site service to the Blueprint without `saberistic.com`. Use the repository
   root as its root directory, Render's automatic locked pnpm install plus `pnpm build:site` as its build, and
   `apps/site/out` as `staticPublishPath`. Set only the public/build-time environment listed above.
3. Sync the Blueprint and verify the preview creates one new static service; it must not replace,
   delete, or change the runtime of Payload or Umami. Record the generated service URL and ID only
   after Render confirms them.
4. Test the domainless Static Site URL, including `/`, `/prototypes/`, every exported prototype,
   `/readiness/` with and without its supported query values, `/privacy/`, static assets, and a real 404. Confirm the output is multipage and has no SPA catch-all.
5. Create the Static Site deploy hook in Render and place it only in Payload's
   `STATIC_SITE_DEPLOY_HOOK_URL`. Publish, edit, unpublish, republish, and delete a disposable reviewed
   record as appropriate; verify each relevant operation queues a successful static deploy and the
   content revision changes. Do not use production evidence records for destructive acceptance.
6. Verify Umami loads on the temporary Static Site URL only if that host is deliberately included for
   acceptance. Restore the exact production tracking-domain allowlist before domain cutover.

### Stage 2: custom-domain transfer

1. Choose a quiet deployment window and record the last known-good Payload deploy, Static Site
   deploy, DNS records, and domain ownership/certificate state. Keep the old Payload frontend working
   throughout the observation window.
2. Detach `saberistic.com` from the Payload web service, then attach it to the accepted Static Site.
   A Render custom domain cannot be attached to both services simultaneously, so a short transfer
   window is unavoidable. Do not add the domain to the new Blueprint service until the existing
   attachment has been removed.
3. Leave the existing DNS records in place only if Render confirms they are still the correct target;
   otherwise apply the exact values Render shows and verify them at the authoritative DNS provider.
   Wait for Render to verify ownership and issue TLS before declaring the cutover complete.
4. Declare only the apex `saberistic.com` on the Static Site. Render automatically adds `www` as a
   redirect for an apex domain; verify that behavior instead of consuming another explicit domain.
   Together with `umami.saberistic.com`, this preserves the expected Hobby custom-domain allowance.
5. Verify `https://saberistic.com` serves the accepted static revision, `www` redirects correctly,
   Payload admin/API remain available on `saberistic-web-staging.onrender.com`, and analytics events
   arrive through `umami.saberistic.com`.
6. After the Dashboard transfer is accepted, bring the Blueprint domain declaration into agreement
   with the live attachment. Domain, redirect, header, and environment changes are not part of a code
   deploy rollback, so record them separately.

Do not introduce a third `cms.saberistic.com` domain for this Free architecture. Share the stable
Payload `onrender.com` origin with administrators instead. If a static `/admin/*` redirect is added,
remember Render Static Site redirect rules are permanent `301` redirects and target only that stable
origin.

## Acceptance checklist

Before cutover:

- `pnpm verify` passes, including root/site type checking, lint, tests, the Payload production build,
  and the fixture static build.
- A remote `pnpm build:site` succeeds against the exact Payload `onrender.com` origin and produces
  `apps/site/out` without server routes.
- The version-1 endpoint returns `Cache-Control: no-store`, JSON, one valid revision, no private
  fields, no draft records, and no duplicate or truncated public records.
- A simulated bad, unavailable, redirected, cross-origin, or oversized snapshot fails the build and
  does not replace the last successful Static Site deploy.
- The temporary Static Site URL passes route, deep-link, hydration, keyboard, responsive, and 404
  checks.
- No database, Payload, deploy-hook, OpenRouter, administrator, or Umami server secret appears in
  exported files, browser requests, Render build logs, or repository history.
- The publication hook is accepted for publish, unpublish, relevant public edits, and delete, while
  draft-only/private changes do not create unnecessary deploys.
- Umami's script configuration and allowlisted public events work without delaying navigation or
  exposing readiness answers, prompts, free text, queries, fragments, or visitor identity.

After cutover:

- Apex HTTPS, certificate, security headers, assets, deep links, real 404s, and the automatic `www`
  redirect pass from an external network.
- The homepage and prototype routes show the same `contentRevision` as the accepted build record.
- Payload admin login, `/api/ready`, and `/api/public/site-snapshot/v1` pass on the CMS origin.
- A controlled public edit reaches the apex through one hook-driven static deployment.
- Umami heartbeat/script/event ingestion pass on its custom origin, and an Umami cold start does not
  make the Static Site unavailable.
- The daily rebuild and its failure notification are enabled and recorded.

## Routine operations

`pnpm render:warm` wakes Payload and Umami once. `pnpm render:demo -- --minutes 90` repeats those two
checks for a bounded demo window, with a ten-minute cadence and a 120-minute hard maximum. The helper
does not ping the Static Site because CDN delivery never sleeps, and it is not a permanent Free-tier
uptime daemon.

The temporary shared Free PostgreSQL database was last documented to expire on **2026-09-27**. The
current expiry, upgrade state, storage, and backup state are **pending verification** in the Render
Dashboard. Before that deadline, export and test restoration or upgrade the database. If it expires,
the last successful static CDN deploy can continue serving, but Payload editing, hook-generated
snapshots, future static builds, and Umami will fail. The static artifact is not a database backup.

Review failed static builds, Payload hook warnings, and daily-schedule failures. A content change is
not public until its new static deploy is live. Record the deployed content revision alongside each
release so operators can distinguish a CMS write from a completed public publication.

## Rollback and recovery

| Failure                                       | Recovery                                                                                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bad static artifact after cutover             | Roll the Static Site back to its last known-good deploy. Content remains read-only on the CDN while the source/build is repaired.                                                  |
| Static build cannot reach or validate Payload | Leave the failed deploy failed; diagnose Payload/snapshot compatibility and retry. Never publish fixtures or an empty fallback.                                                    |
| Hook rejected, timed out, or leaked           | Trigger a manual known-good deploy, regenerate the Render deploy hook, update Payload and the daily-schedule secret, and revoke the old URL.                                       |
| Domain or TLS cutover fails                   | Detach the apex from the Static Site and reattach it to the still-working Payload service; restore the recorded DNS values if they changed. Verify TLS again.                      |
| Snapshot contract regression                  | Restore `/v1` compatibility or roll back the consuming Static Site. Add `/v2` for an intentional incompatible change.                                                              |
| Published content must be reverted            | Restore a reviewed Payload version or make a reviewed corrective edit, then complete and verify a new static build.                                                                |
| Payload or database outage                    | Continue serving the last successful static deploy. Restore/upgrade the database before attempting another build; do not treat CDN content as recoverable CMS state.               |
| Umami outage                                  | Keep the public site online; analytics is optional and must fail independently. Repair Umami without rolling back the Static Site unless its baked tracker configuration is wrong. |

Render code-deploy rollback does not restore custom-domain attachment, DNS, redirects, headers,
environment variables, Blueprint state, or secret values. Those settings require explicit manual
rollback from the recorded pre-cutover state.

## Live rollout record

This table records the accepted 2026-08-30 rollout. Secret values are deliberately omitted.

| Evidence                                          | Verified value/status                                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static Site Blueprint name and service ID         | `saberistic-site-staging` / `srv-da9tdgu7bikc73esbqvg`                                                                                                      |
| Static Site `onrender.com` URL                    | `https://saberistic-site-staging.onrender.com`                                                                                                              |
| First successful Static Site deploy ID and commit | `dep-da9tes67bikc73eser3g` / `cca2f288eba43ba5656a2f8a611e8db4d4a2e7b0`; checks-gated successor `dep-da9tfrgu01pc73db23qg`                                  |
| Accepted `contentRevision` and generation time    | `5cd17cdaa03c347a6e36c92f9e1b81cc50a4de4a38e56fde6f5d1a9d23c0ed48`; `2026-08-30T07:27:31.409Z`; two published prototypes                                    |
| Payload readiness and snapshot endpoints          | Both HTTP 200 at `https://saberistic-web-staging.onrender.com`; snapshot is `no-store`                                                                      |
| Deploy hook storage and last acceptance           | Secret present on Payload and GitHub Actions; workflow `33299159323` passed and created `deploy_hook` deploy `dep-da9tlnon74is7396ugm0`                     |
| Live editor-operation acceptance                  | Hook selection/request behavior is tested; destructive acceptance was deliberately not performed on production evidence records                             |
| `saberistic.com` attachment and TLS               | Attached to the Static Site, Render verified, certificate issued, external HTTPS HTTP 200 with CDN and security headers                                     |
| `www.saberistic.com` redirect                     | External HTTPS returns 301 to the apex; Render reports DNS pending because the authoritative CNAME remains stale                                            |
| Authoritative DNS records/provider check          | DigitalOcean NS; apex A `216.24.57.1`; `www` still points to `saberistic-web-staging.onrender.com` and must point to `saberistic-site-staging.onrender.com` |
| Umami build variables and live service            | Exact script URL, website ID, and apex/`www` allowlist exported; script/heartbeat HTTP 200; live `primary_cta_clicked` appeared in Umami Events             |
| Daily rebuild and failure visibility              | Schedule `35 11 * * *`; manual run `33299159323` passed; GitHub account notification delivery was not independently audited                                 |
| Free PostgreSQL expiry/upgrade/backup             | Last verified expiry `2026-09-27`; still disposable staging; upgrade/backup remains required                                                                |
| Last known-good rollback checkpoints              | Static `dep-da9tlnon74is7396ugm0`; Payload `dep-da9tkb9srm7s73dacu20`; Payload remains reachable on its Render origin                                       |
| Cutover operator and timestamp                    | Owner-confirmed Codex-assisted cutover, `2026-08-30`, completed at approximately `07:25 UTC`                                                                |

The only cutover cleanup still requiring owner authentication is the DigitalOcean `www` CNAME.
The current redirect works through Render's shared edge, but the record must be updated to the
Static Site target so Render can verify it and the DNS intent matches the deployed architecture.

## Official Render references

- [Static Sites](https://render.com/docs/static-sites)
- [Blueprint specification](https://render.com/docs/blueprint-spec)
- [Deploy hooks](https://render.com/docs/deploy-hooks)
- [Custom domains](https://render.com/docs/custom-domains)
- [Redirects and rewrites](https://render.com/docs/redirects-rewrites)
