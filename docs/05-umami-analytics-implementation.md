# Umami analytics implementation

## Goal

Use self-hosted Umami to understand whether visitors discover prototypes, complete the Production Readiness Check, and request qualified human help. Do this without cookies, cross-site tracking, contact data, readiness answers, prompts, or report content.

Umami is MIT-licensed and self-hostable. Recheck the pinned release's repository license during upgrades and review separately licensed integrations before adding them.

Umami is an analytics tool, not the source of product truth. Event names and allowed properties are versioned in Git; business conclusions must be tied to their definitions.

## Blueprint implementation status

The repository's `render.yaml` now declares Umami staging inside the existing `saberistic-platform` / `staging` Render environment:

- `saberistic-umami-staging`, a Free Render web service using the official Umami v3.3.1 image;
- a private owner connection exposed only to a bootstrap wrapper, not to the Umami process;
- a Render-generated, stable password for the constant, non-elevated `saberistic_umami` PostgreSQL role;
- an `umami` PostgreSQL schema created, revoked from `PUBLIC`, and granted to that restricted role by the wrapper, without a Payload migration;
- Render-generated application, administrator, database-role, and 2FA seed values, with the required 64-hex 2FA encryption key derived only inside the wrapper, plus privacy-first runtime settings;
- `/api/heartbeat` as the Render health check; and
- check-gated automatic deploys limited to changes under `ops/umami/**`.

The shared database is a staging-only cost decision. It avoids silently starting a paid Render database while improving credential and table separation through a dedicated role and schema. It does not provide workload, storage, backup, expiry, or failure-domain isolation.

The service is live at <https://saberistic-umami-staging.onrender.com>; the resource and acceptance evidence are recorded in [11](./11-live-staging-deployment.md). On 2026-08-30, the owner explicitly authorized temporary public collection on this shared database despite the earlier production launch gate. This exception does not make the database durable or production-grade and does not waive the dedicated-database, retention, backup/restore, abuse-monitoring, or upgrade work.

The `Saberistic Production` Website record has the public ID `8bdad921-34a9-43cb-bc70-9e1c71efa911`. The website configuration uses `https://umami.saberistic.com/script.js` and the exact tracker-domain allowlist `saberistic.com,www.saberistic.com`. Render verified the custom-domain DNS record, issued its certificate, and returned HTTP 200 from the custom-host heartbeat and tracker script on 2026-08-30. The final live browser suite then proved the exact rendered tracker configuration, sanitized pageview and custom-event payloads, HTTP 200 ingestion, and stored dashboard results. The supervised administrator login is complete and 2FA is enabled. Analytics retention, backup/restore, and upgrade acceptance remain incomplete.

## Deployment shape

Run Umami as a separate Render web service using an official, pinned container image. Free staging shares the existing Render Postgres instance through a dedicated restricted role and schema; production uses a dedicated database in the same region.

```text
Owner-approved temporary browser collection
  ├─ saberistic.com
  ├─ www.saberistic.com
  └─ umami.saberistic.com/script.js
                    │
                    ▼
             Umami web service
                    │ private URL
                    ▼
             Render Postgres
              ├─ public schema: Payload
              └─ umami schema: Umami staging
```

The separate database is the recommended production choice. It isolates migrations, permissions, retention, performance, and recovery from Payload. A shared Postgres instance is a possible temporary cost optimization, but it expands the failure domain and should not be the target architecture.

## Container and runtime

- Use Umami's official image with PostgreSQL support. `ops/umami/Dockerfile` inherits from the public GHCR package `ghcr.io/umami-software/umami:3.3.1`, pinned to multi-platform manifest digest `sha256:fa32d116cf20cad52cbc3fad9a63b46e7fa02299d8f967168eb453d49c476b4a`. The manifest includes the `linux/amd64` image Render requires.
- Do not replace the digest pin with a mutable `latest` tag. As reviewed on 2026-08-29, v3.3.1 is the current maintenance release; every later upgrade still requires a release and migration review.
- The derived image installs only the PostgreSQL bootstrap driver and the same `bcryptjs` 3.0.2 password-helper version pinned by Umami. Both are declared in the minimal `ops/umami/package.json`; the committed `ops/umami/pnpm-lock.yaml` records every transitive version and integrity hash, and the image build uses pnpm 11.21.0 with `--frozen-lockfile`. Its wrapper starts as root, uses the private owner URL to create `saberistic_umami` once with all required attributes and its generated password, creates and locks down the `umami` schema, and installs `pgcrypto` when needed. It never depends on `ALTER ROLE`; on reuse it audits the immutable role state and proves the existing generated credential with a real login instead of rotating it.
- The wrapper constructs both Prisma URLs with the restricted role and `schema=umami`, while its direct PostgreSQL bootstrap clients set `search_path` only as a connection-local option. No role or role/database setting is created. The wrapper removes the owner URL and all bootstrap secrets from the child environment. PID 1 remains a root-only signal supervisor so the unprivileged application cannot read its original owner environment through `/proc/1/environ`; it constrains supplementary groups and runs Umami's migration checker as the pinned `nextjs` UID 1001 and GID 65533.
- The first migration inserts Umami's documented default administrator at a fixed ID. Before any HTTP server starts, the wrapper locks that row, renames it to `saberistic_admin`, replaces the public bcrypt hash with the stable Render-generated `UMAMI_ADMIN_PASSWORD`, and verifies the username, role, active state, and password. Only then does it spawn the explicit upstream `sh scripts/start-docker.sh` command as `nextjs`. Any migration, update, or verification failure prevents the server from binding.
- The restricted role has no superuser, database-creation, role-creation, replication, row-security-bypass, or inheritance capability. It is limited to ten connections and receives only `CONNECT` plus the required rights in `umami`. Before reusing a role, the wrapper requires the exact original flags, connection limit, no password expiry, no global or per-database role settings, and a successful login with the generated credential. It rejects privilege-bearing or unrelated memberships; when a non-superuser PostgreSQL 18 bootstrap account with `CREATEROLE` receives the automatic creator grant, that is the only tolerated reverse membership, and only when `ADMIN` is true, `SET` and `INHERIT` are false, and the grantor is a superuser. The wrapper also fails closed if the role owns a database, extension, global object, or object outside `umami` (except TOAST objects tied to its `umami` tables); has an explicit database, schema, relation, column, routine, type, or global-object grant outside the expected boundary; or has cross-schema default privileges. This materially limits database privileges but cannot isolate CPU, memory, storage, privileges inherited from PostgreSQL's implicit `PUBLIC` role, or catalog state in another database that is not visible from the connected database.
- The official image defaults to `0.0.0.0:3000`; set/test Render's service port as `3000` rather than assuming the native-runtime default. Use `/api/heartbeat` as the HTTP health-check path.
- The supervised first `saberistic_admin` login and 2FA enablement are complete. Keep the generated administrator credential and 2FA recovery material in the approved password manager, and create additional individually named administrators only when needed.
- The fixed bootstrap row and generated secret are a startup invariant. The wrapper restores the `saberistic_admin` username or generated password after drift; deleting, disabling, or demoting that row makes startup fail closed. It compares before hashing, so an ordinary restart does not change the bcrypt salt or invalidate sessions.
- Do not expose the database externally unless an approved administrative or backup task requires it.
- Verify PostgreSQL reports a UTC timezone, as Umami recommends.

## Environment variables

Required or recommended:

| Variable                           | Handling                                         | Purpose                                                                                                                     |
| ---------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `UMAMI_DATABASE_ADMIN_URL`         | Render `fromDatabase`, internal owner connection | Bootstrap-only connection used to create and constrain the dedicated role/schema; removed from the Umami child environment  |
| `UMAMI_DATABASE_PASSWORD`          | Render-generated secret                          | Creation-time password for `saberistic_umami`; later starts must authenticate with the same value and never rotate the role |
| `UMAMI_ADMIN_PASSWORD`             | Render-generated 32–72-byte secret               | Renames and secures the fixed upstream administrator before the server binds; never passed to the child                     |
| `UMAMI_DATABASE_SCHEMA=umami`      | Committed non-secret value                       | Names the staging-only isolated schema selected by the wrapper                                                              |
| `DATABASE_URL`                     | Constructed inside the wrapper                   | Restricted runtime URL for Umami, with `schema=umami`; never set to the owner URL                                           |
| `DIRECT_DATABASE_URL`              | Constructed inside the wrapper                   | Same restricted direct URL so Prisma migrations cannot fall back to the owner connection                                    |
| `APP_SECRET`                       | Render-generated secret                          | Secures authentication tokens                                                                                               |
| `UMAMI_TWO_FACTOR_SEED`            | Render-generated secret                          | Stable bootstrap seed; never passed to Umami as a standalone variable                                                       |
| `TWO_FACTOR_ENCRYPTION_KEY`        | Constructed inside the wrapper                   | 64-character hex SHA-256 derivation supplied only to the child; encrypts 2FA secrets                                        |
| `HOSTNAME=0.0.0.0` and `PORT=3000` | Committed non-secret values                      | Make the image listen on Render's public interface and declared service port                                                |
| `DISABLE_TELEMETRY=1`              | Committed non-secret value                       | Prevents anonymous product telemetry from the self-hosted instance                                                          |
| `PRIVATE_MODE=1`                   | Committed non-secret value                       | Blocks Umami's external calls, including favicon lookup                                                                     |
| `DISABLE_UPDATES=1`                | Committed non-secret value                       | Avoids dashboard update checks because upgrades are handled operationally                                                   |
| `TRACKER_SCRIPT_NAME`              | Optional stable value                            | Custom tracker path; document it if changed                                                                                 |
| `SALT_ROTATION=month`              | Explicit initial value                           | Controls anonymous session-salt rotation; revisit only with a documented measurement/privacy decision                       |

`DATABASE_URL` is the only variable Umami documents as strictly required, but the wrapper supplies it only after bootstrap. A unique `APP_SECRET` is operationally mandatory. Never reuse the Payload secret, Payload database password, restricted database password, 2FA key, or OpenRouter key.

Render's `generateValue: true` produces a base64-encoded 256-bit value, so it is appropriate for `APP_SECRET`, `UMAMI_DATABASE_PASSWORD`, `UMAMI_ADMIN_PASSWORD`, and `UMAMI_TWO_FACTOR_SEED`. A generated value remains stable for the environment variable's lifetime. The wrapper hashes the 2FA seed with a versioned context using SHA-256 and gives Umami the required 64-character hexadecimal `TWO_FACTOR_ENCRYPTION_KEY`; the seed itself is removed from the child environment. This avoids manual `sync: false` provisioning gaps and commits no secret. Do not delete/recreate generated passwords or seeds casually: changing `UMAMI_DATABASE_PASSWORD` makes startup fail credential verification and requires a supervised database-role recovery; the wrapper will not silently rotate the database role. Changing the generated administrator password updates the fixed Umami administrator on the next successful database bootstrap, and changing the 2FA seed can invalidate stored 2FA secrets.

Umami v3.3.1 has no bundled password-reset command. Its `DISABLE_LOGIN` option hides or rejects the login pages, but the pinned bundle does not apply that check inside `/api/auth/login`; it is therefore not used as a substitute for password rotation. The migration-first, password-second, server-last sequence is the fail-closed control.

Keep the default tracker path unless there is a concrete reason to change it. Renaming a tracker solely to bypass a visitor's explicit blocking choice is inconsistent with the privacy positioning. Do not set `SKIP_DB_CHECK` or `SKIP_DB_MIGRATION` unless migration execution has been moved into a separately tested process.

## Render staging plans and cost boundary

The Umami web service uses Render's Free plan for initial staging. Render spins a Free web service down after 15 minutes without inbound HTTP or WebSocket traffic. It can lose pageviews while waking and shares the workspace's 750 monthly Free instance hours with the website. Upgrade Umami to an always-on paid web plan before treating it as continuously available production analytics.

Render permits only one active Free Postgres database per workspace, and `saberistic-payload-db-staging` already occupies it. A second isolated database would therefore start charges as soon as the Blueprint was synced. Free staging instead uses the existing instance's `umami` schema. The Umami child no longer receives the Payload owner credential, but the applications still share compute, storage, connection capacity, expiry, backup policy, and the database failure domain. Free Render Postgres expires after 30 days unless upgraded, and this staging database is currently scheduled to expire on 2026-09-27. Do not treat it as durable analytics storage.

The public analytics ingestion endpoint can be spoofed or flooded. Even with the ten-connection restricted role, expensive queries or excessive events can exhaust shared database resources, consume its 1 GB limit, or degrade Payload. PostgreSQL `PUBLIC` grants and any security-definer functions created outside `umami` are also a shared-database boundary the wrapper cannot fully neutralize without risking Payload. Keep the official pinned image plugin-free and regard every event collected under the owner-approved temporary exception as disposable.

Before this temporary collection is described as production-grade, provision a dedicated Umami database, point the bootstrap owner reference at it (or simplify the wrapper after a separate security review), migrate or intentionally reset staging analytics data, and verify backup/restore independently. Never turn this staging exception into the permanent data architecture merely to save cost.

### Local demo warm-up

Use the repository helper only to prepare for a review or a bounded live demo:

```bash
pnpm render:warm
pnpm render:demo
pnpm render:demo -- --minutes 90
```

`pnpm render:warm` requests the website readiness endpoint and the Umami heartbeat once, retrying while a cold service starts. `pnpm render:demo` defaults to a 60-minute window, repeats that check every 10 minutes, and has a hard maximum of 120 minutes. The helper deliberately is not a permanent anti-sleep daemon. Keeping both Free services awake continuously would consume two instance hours per wall-clock hour, or about 1,440 hours in a 30-day month, which exceeds the workspace's shared 750-hour allowance. Render health checks also do not keep an already spun-down service awake. Continuous availability requires an appropriate paid plan rather than an indefinite local loop.

## Blueprint sync runbook and consequences

1. Review Render's proposed change set before syncing. It should add exactly one Free web service and no database to the existing staging environment; it must not replace either Payload resource. No Payload migration is required because the entrypoint owns schema bootstrap.
2. Confirm the website service has `UMAMI_SCRIPT_URL=https://umami.saberistic.com/script.js`, `UMAMI_WEBSITE_ID=8bdad921-34a9-43cb-bc70-9e1c71efa911`, and `UMAMI_TRACK_DOMAINS=saberistic.com,www.saberistic.com`. The Website ID is public; none of the Umami administrator, application, database, or 2FA secrets belongs in the website service.
3. Sync the Blueprint. Render will generate stable values for `APP_SECRET`, `UMAMI_DATABASE_PASSWORD`, `UMAMI_ADMIN_PASSWORD`, and `UMAMI_TWO_FACTOR_SEED`, expose the existing database's private owner URL only as `UMAMI_DATABASE_ADMIN_URL`, build the derived image, and attempt the first Umami deploy. The wrapper creates the restricted role with its final flags/password, creates the schema without any `ALTER ROLE` operation, proves the generated role credential, derives the valid 2FA key, runs the upstream migrations, and renames/secures the fixed administrator before starting HTTP.
4. Confirm `/api/heartbeat`, inspect startup logs for the restricted role and `umami` migration target, verify the existing `saberistic_admin` login and 2FA challenge, and keep the credential and recovery material securely stored.
5. Verify in PostgreSQL that the Umami tables are owned by `saberistic_umami`, that the role has exact safe flags and no privilege-bearing memberships, role settings, cross-schema ownership, explicit grants, or default grants, and that it cannot read Payload tables in `public`. The PostgreSQL 18 automatic creator membership may exist only with `ADMIN=true`, `SET=false`, and `INHERIT=false`. Deliberate credential drift or cross-schema contamination must stop before the HTTP listener, while an unchanged second start must remain healthy. Verify the database timezone is UTC and perform the acceptance tests below.
6. Verify `https://umami.saberistic.com/script.js` over valid TLS, confirm the rendered Saberistic page contains the exact Website ID and domain allowlist, exercise one automatic pageview and one allowlisted custom event, and verify both in the Umami dashboard without sending free text or personal data.

`autoDeployTrigger: checksPass` makes Git-triggered Umami deploys wait for repository checks. Its `buildFilter` limits those automatic deploys to `ops/umami/**`; changes only to analytics documentation or unrelated application code do not rebuild Umami. Blueprint configuration changes are still evaluated when the Blueprint is synced and can update or redeploy declared services regardless of the code-path filter. Sync can therefore affect the existing web service as well as adding Umami; review the proposed changes every time.

Future Umami upgrades require changing the pinned base image in `ops/umami/Dockerfile`, reviewing the database migration, deliberately updating `ops/umami/package.json` and regenerating its lockfile with the pinned pnpm version if bootstrap dependencies change, rebuilding with the frozen lockfile, syncing the Blueprint, and verifying the deployment. Blueprint sync never deletes an existing resource merely because its definition was removed; deliberate removal requires deleting it from the file and then deleting the live resource separately in Render. Dropping the shared `umami` schema deletes the analytics data, so export it first.

## Website record and temporary launch exception

The earlier gate required a dedicated analytics database, backup/restore, a retention procedure, privacy disclosure, and abuse monitoring before public collection. On 2026-08-30, the owner explicitly accepted activating analytics earlier for launch validation while preserving those items as unresolved production requirements.

The resulting `Saberistic Production` record is scoped to `saberistic.com` and `www.saberistic.com` and has public Website ID `8bdad921-34a9-43cb-bc70-9e1c71efa911`. Do not reuse it for preview hosts or independent prototype applications. Add one separate record per mature prototype only when it needs its own ownership and reporting boundary.

The exception increases risk: the unauthenticated ingestion path can consume finite compute and storage shared with Payload, detailed analytics has no automatic deletion policy, and the Free database expires on 2026-09-27 with no backup. The tracker therefore remains a directional launch signal rather than a security, billing, audit, or durable business record.

## Next.js tracker integration

The active frontend integration loads the tracker with Next.js `Script` after the page becomes interactive and configures:

- `https://umami.saberistic.com/script.js` as the analytics script URL;
- public Website ID `8bdad921-34a9-43cb-bc70-9e1c71efa911`;
- `data-domains="saberistic.com,www.saberistic.com"` so preview/staging traffic is not mixed into this property;
- `data-exclude-search="true"` and `data-exclude-hash="true"` so query/hash values cannot leak tokens or personal data;
- `data-do-not-track="true"` to honor the browser setting;
- a reviewed `data-before-send` callback registered before tracker hydration that rejects unapproved hosts and routes, strips query/hash components, reduces a valid referrer to its origin, and cancels invalid titles, performance data, and custom events;
- `data-performance="true"` for validated standard web-performance measurements; and
- automatic SPA pageview handling unless tests show duplicate navigation events.

The Website ID is not a secret. The Umami login, API credentials, database URL, and app secret are secrets.

`data-domains` gates tracker execution on the client; it does not prevent the script from loading, secure the public ingestion endpoint, or stop spoofed events. Omit the tracker component entirely outside approved environments where possible.

Design public routes and page titles so they never contain email addresses, names, invite/reset tokens, or user-generated strings. Query/hash exclusion does not sanitize the referrer, path, or title by itself.

Do not call `umami.identify()` on this marketing site. Do not load Umami's optional session-replay recorder; replay can capture interactions that are intentionally out of scope around the readiness and lead forms.

Custom events are centralized in a typed, runtime-validated wrapper rather than calling `window.umami` throughout components. The implemented contract is:

```ts
type AnalyticsEvent =
  | { name: 'primary_cta_clicked'; data: { cta: string; placement: string } }
  | { name: 'service_viewed'; data: { service: string } }
  | {
      name: 'prototype_card_clicked'
      data: { prototype: string; status: string; placement: 'home' | 'index' }
    }
  | { name: 'prototype_view'; data: { prototype: string; status: string } }
  | { name: 'prototype_launch'; data: { prototype: string; placement: string } }
  | { name: 'prototype_source_clicked'; data: { prototype: string } }
  | { name: 'readiness_started'; data: { mode: 'example'; entry: string } }
```

The runtime validator requires exact keys, constrains CTA, placement, service, readiness-entry, and status values to small enums, constrains prototype values to short public-slug syntax, and no-ops when Umami is unavailable. It rejects undeclared properties, and product behavior never depends on analytics success. TypeScript alone is not a privacy boundary because arbitrary browser values can still reach Umami. The `data-before-send` callback provides an independent second line of defense.

The present readiness experience is a deterministic preview, so it emits only `readiness_started` with `mode=example` and an allowlisted entry point. Completion, report, handoff, contact, diagnostic-submission, and AI-result events remain unimplemented until those truthful product states exist.

## Event taxonomy

Umami event names are limited to 50 characters. Use stable snake_case names.

### Implemented events

| Event                      | Allowed properties                 | Truthful trigger                                                               |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| `primary_cta_clicked`      | `cta`, `placement`                 | An allowlisted primary CTA is clicked.                                         |
| `service_viewed`           | `service`                          | One of the three named homepage service links is followed.                     |
| `prototype_card_clicked`   | `prototype`, `status`, `placement` | A public prototype card is opened from the homepage or index.                  |
| `prototype_view`           | `prototype`, `status`              | A public prototype detail view mounts, deduplicated across development mounts. |
| `prototype_launch`         | `prototype`, `placement`           | A visitor follows an approved prototype launch link.                           |
| `prototype_source_clicked` | `prototype`                        | A visitor follows a public prototype source link.                              |
| `readiness_started`        | `mode`, `entry`                    | A fixed readiness example is selected; `mode` is always `example`.             |

Allowed property values are enums or validated public slugs. Search/filter text, selected readiness profile, full links, internal IDs, and arbitrary component state are not event properties. Automatic App Router pageviews remain separate from custom events; the application does not send an extra manual pageview during navigation.

### Reserved, not implemented

Future flows may add `readiness_completed`, readiness handoff, contact, diagnostic-submission, or feedback events only when the corresponding product state and backend success signal exist. `contact_*` is reserved for a direct scoped-inquiry flow, `readiness_handoff_*` for a post-report consented flow, and `diagnostic_*` for a real Architecture Diagnostic booking/request flow. A CTA click is never reported as a submitted form, completed readiness result, paid diagnostic, or qualified conversation.

Never send:

- name, email, company, phone, or website;
- IP address as custom data;
- free-text context;
- individual assessment answers;
- prompts, completions, report IDs, or report text;
- full referrer/query strings that may contain tokens or personal data;
- repository, document, or internal service identifiers.

## Planned funnels

Only pageviews, CTA/service discovery, the fixed readiness-example start, and prototype interactions are implemented today. The downstream steps below remain the measurement plan for product flows that do not yet exist.

### Primary utility funnel

```text
primary CTA clicked
  → readiness started
  → readiness completed
  → optional report downloaded
  → readiness handoff started
  → readiness handoff submitted
```

### Prototype discovery funnel

```text
prototype card clicked
  → prototype view
  → prototype launch
  → return to Saberistic or diagnostic start
```

### Paid-intent funnel

```text
service viewed
  → contact started
  → contact submitted

readiness completed
  → readiness handoff started
  → readiness handoff submitted

service viewed or readiness completed
  → diagnostic started
  → diagnostic submitted after verified fulfillment success
  → qualified conversation
```

“Qualified conversation” belongs in a private operational system or a manually reconciled count, not as client-identifying Umami data.

## Reporting rhythm

For the first month, review weekly:

- event delivery and duplicate pageviews;
- top entry routes and prototype launches;
- readiness completion and failure rate;
- readiness completion → handoff rate;
- bot or internal traffic contamination;
- mobile/desktop differences large enough to warrant usability testing.

After four weeks, set baseline targets. Avoid optimizing a percentage with fewer than a meaningful number of sessions; read the actual prototype and diagnostic feedback alongside analytics.

Treat repeat visits as approximate within the configured salt-rotation window, not durable person-level retention. Never join Umami sessions to diagnostic contacts or readiness report IDs.

## Privacy and disclosure

Umami's current documentation describes it as cookie-free and without cross-site tracking by default. The public `/privacy` page discloses:

- that analytics is self-hosted;
- what pageview and custom-event metadata is collected;
- the purpose of collection;
- the current absence of an automatic retention/deletion policy and backups;
- whether and how visitors can opt out;
- that contact and readiness content are not put into analytics.

Privacy compliance depends on actual configuration, jurisdiction, and any added event data. Do not treat a product's “GDPR compliant” marketing statement as a substitute for reviewing the deployed behavior and privacy notice.

The owner-authorized launch exception does not include a fabricated retention promise. Detailed analytics currently remains in the shared Free database until manual deletion or until the database is replaced or expires on 2026-09-27; there is no automatic TTL, aggregation, or backup. Umami does not document an automatic self-hosted TTL/aggregation feature, so do not promise date-based deletion or aggregation until a supported procedure has been implemented and restore-tested against the pinned version. Assign an owner and make backup expiration consistent with the public retention statement.

Self-hosted Umami data otherwise remains in the operator's database indefinitely. The public Website ID and unauthenticated ingestion endpoint also mean analytics can be spoofed; treat dashboards as product signals, never as a security, billing, or audit ledger.

## Upgrade process

1. Read Umami release notes and migration notes.
2. Create a logical database export and confirm Render recovery coverage.
3. Test the pinned image against staging.
4. Verify login, `/api/heartbeat`, pageviews, custom events, funnels, and dashboard queries.
5. Deploy production during a low-traffic window.
6. If a major upgrade performs schema migrations, run PostgreSQL `ANALYZE` afterward as Umami recommends for refreshed planner statistics.
7. Keep the prior immutable image available for application rollback; remember that a database migration may require a separate forward recovery plan.

The official container's startup script checks the database and applies Prisma migrations before starting the app. Stage upgrades at one instance and back up first; do not assume a rolling multi-instance start is a coordinated migration strategy.

## Analytics acceptance criteria

The owner-authorized temporary activation passed custom-domain TLS, tracker-script, ingestion, exact-attribute, sanitized-pageview, custom-event, dashboard, and core-UX acceptance on 2026-08-30. It remains a launch-validation exception rather than production-grade analytics while the dedicated database, backup/restore, automatic retention, abuse monitoring, and always-on service requirements remain open.

- no events are emitted outside approved hostnames, and the tracker component is omitted from non-analytics environments where possible;
- normal site and SPA navigation produce one pageview each;
- all custom events reject undeclared fields in development tests;
- no form field, readiness answer, URL token, prompt, or report text appears in Umami;
- crafted paths, titles, referrers, query strings, and event values are cancelled or sanitized by tested runtime rules;
- analytics failure never blocks a prototype launch, form, or readiness result;
- `/api/heartbeat` is healthy and database connectivity is monitored;
- operators understand that `/api/heartbeat` is process liveness only and does not query Postgres;
- an unchanged restart passes the role-isolation audit, while test ownership, explicit ACL, and default-ACL contamination outside `umami` each fail before HTTP starts;
- changing the generated database password causes credential verification to fail without altering the stored role password;
- the default admin password is gone, 2FA is configured, and secrets are unique;
- a documented backup and upgrade test has been completed.

If analytics is ever embedded inside the Payload admin, protected Umami API calls must occur server-side and no Umami bearer/login credential may reach the browser. Embedding is out of MVP scope; an iframe can require Umami build-time configuration and therefore a custom image rather than the chosen prebuilt-image path.

## Official references

- [Umami repository and MIT license](https://github.com/umami-software/umami)
- [Umami v3.3.1 release](https://github.com/umami-software/umami/releases/tag/v3.3.1)
- [Umami v3 introduction and privacy model](https://docs.umami.is/docs)
- [Self-hosted installation](https://docs.umami.is/docs/install)
- [Environment variables](https://docs.umami.is/docs/environment-variables)
- [Collect data](https://docs.umami.is/docs/collect-data)
- [Tracker configuration](https://docs.umami.is/docs/tracker-configuration)
- [Track events](https://docs.umami.is/docs/track-events)
- [Tracker functions and event-data limits](https://docs.umami.is/docs/tracker-functions)
- [Getting updates](https://docs.umami.is/docs/updates)
- [Official Docker Compose health-check example](https://github.com/umami-software/umami/blob/master/docker-compose.yml)
- [Render Blueprint specification](https://render.com/docs/blueprint-spec)
- [Render prebuilt-image deployment behavior](https://render.com/docs/deploying-an-image)
- [Render Free-plan limits](https://render.com/docs/free)
- [Render health checks](https://render.com/docs/health-checks)
- [Render acceptable-use policy](https://render.com/acceptable-use)
