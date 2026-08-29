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

The service is live at <https://saberistic-umami-staging.onrender.com>; the resource and acceptance evidence are recorded in [11](./11-live-staging-deployment.md). This proves the disposable staging stack, not production analytics readiness. The production site has no tracker environment variables or Website ID and emits no analytics. Do not create or connect the `saberistic.com` Website record until Umami has its own production-grade database and the privacy launch checks in this document pass.

The accepted staging deploy runs commit `59791ec6dc0a98bcc4cecae879943fcc881e1163` as Render deploy `dep-da9gs43l550s739vpvj0`. It completed 24 upstream migrations, returned HTTP 200 from `/api/heartbeat`, and rejected both known-default `admin` / `umami` and `saberistic_admin` / `umami` login attempts with HTTP 401. The generated administrator secret was not inspected during automated acceptance. First supervised login, 2FA enablement, retention, backup, and upgrade acceptance remain operator work.

## Deployment shape

Run Umami as a separate Render web service using an official, pinned container image. Free staging shares the existing Render Postgres instance through a dedicated restricted role and schema; production uses a dedicated database in the same region.

```text
Future approved browser collection (currently disabled)
  ├─ saberistic.com
  ├─ selected prototype apps
  └─ dedicated analytics host/script.js
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
- Reveal `UMAMI_ADMIN_PASSWORD` in the Render Dashboard only for the supervised first `saberistic_admin` login. Enable and verify 2FA, store the secret in the approved password manager, and create additional individually named administrators only when needed.
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

The Umami web service uses Render's Free plan for initial staging. This is useful for validating the stack, but it spins down after idle periods, shares the workspace's monthly Free instance-hour allowance, and can lose pageviews while waking. Upgrade it to an always-on paid web plan before treating it as production analytics.

Render permits only one active Free Postgres database per workspace, and `saberistic-payload-db-staging` already occupies it. A second isolated database would therefore start charges as soon as the Blueprint was synced. Free staging instead uses the existing instance's `umami` schema. The Umami child no longer receives the Payload owner credential, but the applications still share compute, storage, connection capacity, expiry, backup policy, and the database failure domain. Free Render Postgres expires after 30 days unless upgraded, and this staging database is currently scheduled to expire on 2026-09-27. Do not treat it as durable analytics storage.

The public analytics ingestion endpoint can be spoofed or flooded. Even with the ten-connection restricted role, expensive queries or excessive events can exhaust shared database resources, consume its 1 GB limit, or degrade Payload. PostgreSQL `PUBLIC` grants and any security-definer functions created outside `umami` are also a shared-database boundary the wrapper cannot fully neutralize without risking Payload. Keep the official pinned image plugin-free, expose no production tracker, and regard all staging analytics as disposable.

Before production traffic, provision a dedicated Umami database, point the bootstrap owner reference at it (or simplify the wrapper after a separate security review), migrate or intentionally reset staging analytics data, and verify backup/restore independently. Only then create the `saberistic.com` Website record and add its script URL, Website ID, and exact domain allowlist to the web service. Never change this staging exception into a production default merely to save cost.

## Blueprint sync runbook and consequences

1. Review Render's proposed change set before syncing. It should add exactly one Free web service and no database to the existing staging environment; it must not replace either Payload resource. No Payload migration is required because the entrypoint owns schema bootstrap.
2. Confirm the web service change removes `UMAMI_SCRIPT_URL`, `UMAMI_WEBSITE_ID`, and `UMAMI_TRACK_DOMAINS`. Also remove any manually managed equivalents in Render; Blueprint removal cannot be assumed to clean up unrelated manual variables.
3. Sync the Blueprint. Render will generate stable values for `APP_SECRET`, `UMAMI_DATABASE_PASSWORD`, `UMAMI_ADMIN_PASSWORD`, and `UMAMI_TWO_FACTOR_SEED`, expose the existing database's private owner URL only as `UMAMI_DATABASE_ADMIN_URL`, build the derived image, and attempt the first Umami deploy. The wrapper creates the restricted role with its final flags/password, creates the schema without any `ALTER ROLE` operation, proves the generated role credential, derives the valid 2FA key, runs the upstream migrations, and renames/secures the fixed administrator before starting HTTP.
4. Confirm `/api/heartbeat`, inspect startup logs for the restricted role and `umami` migration target, reveal `UMAMI_ADMIN_PASSWORD` for the supervised `saberistic_admin` login, enable and test 2FA, and store the credential securely.
5. Verify in PostgreSQL that the Umami tables are owned by `saberistic_umami`, that the role has exact safe flags and no privilege-bearing memberships, role settings, cross-schema ownership, explicit grants, or default grants, and that it cannot read Payload tables in `public`. The PostgreSQL 18 automatic creator membership may exist only with `ADMIN=true`, `SET=false`, and `INHERIT=false`. Deliberate credential drift or cross-schema contamination must stop before the HTTP listener, while an unchanged second start must remain healthy. Verify the database timezone is UTC and perform the acceptance tests below.
6. Leave `saberistic.com` without an Umami Website record or tracker variables. The staging dashboard can be exercised directly without collecting production visits.

`autoDeployTrigger: checksPass` makes Git-triggered Umami deploys wait for repository checks. Its `buildFilter` limits those automatic deploys to `ops/umami/**`; changes only to analytics documentation or unrelated application code do not rebuild Umami. Blueprint configuration changes are still evaluated when the Blueprint is synced and can update or redeploy declared services regardless of the code-path filter. Sync can therefore affect the existing web service as well as adding Umami; review the proposed changes every time.

Future Umami upgrades require changing the pinned base image in `ops/umami/Dockerfile`, reviewing the database migration, deliberately updating `ops/umami/package.json` and regenerating its lockfile with the pinned pnpm version if bootstrap dependencies change, rebuilding with the frozen lockfile, syncing the Blueprint, and verifying the deployment. Blueprint sync never deletes an existing resource merely because its definition was removed; deliberate removal requires deleting it from the file and then deleting the live resource separately in Render. Dropping the shared `umami` schema deletes the analytics data, so export it first.

## Website-record launch gate

No Website ID is configured by this Blueprint. In particular, the `saberistic.com` collection remains disabled while Umami shares Payload's expiring Free database. Creating a public Website record now would expose an unauthenticated ingestion path that can consume the same finite storage and compute needed by the CMS.

After a dedicated analytics database, backups, retention procedure, privacy disclosure, and abuse monitoring are ready, create `Saberistic Production` for `saberistic.com` and the approved `www` hostname. Add one separate record per mature prototype when it needs its own ownership and reporting boundary. Use a non-production staging property only during deliberate delivery tests, with an exact staging hostname allowlist and no production domain.

## Next.js tracker integration

This section is the future integration plan; it is intentionally inactive until the website-record launch gate is satisfied. At that point, load the tracker with Next.js `Script` after the page becomes interactive and configure:

- the production Umami script URL;
- the Website ID as a public environment value;
- `data-domains` with exact production hostnames so preview/staging traffic is not mixed into production;
- `data-exclude-search="true"` and `data-exclude-hash="true"` so query/hash values cannot leak tokens or personal data;
- `data-do-not-track="true"` if the final privacy choice is to honor the browser setting;
- a reviewed `data-before-send` callback that cancels or normalizes events when URL path, page title, or referrer contains disallowed query values, tokens, personal data, or unexpected high-cardinality content;
- automatic SPA pageview handling unless tests show duplicate navigation events.

The Website ID is not a secret. The Umami login, API credentials, database URL, and app secret are secrets.

`data-domains` gates tracker execution on the client; it does not prevent the script from loading, secure the public ingestion endpoint, or stop spoofed events. Omit the tracker component entirely outside approved environments where possible.

Design public routes and page titles so they never contain email addresses, names, invite/reset tokens, or user-generated strings. Query/hash exclusion does not sanitize the referrer, path, or title by itself.

Do not call `umami.identify()` on this marketing site. Do not load Umami's optional session-replay recorder; replay can capture interactions that are intentionally out of scope around the readiness and lead forms.

Centralize custom events in a typed wrapper rather than calling `window.umami` throughout components:

```ts
type AnalyticsEvent =
  | { name: 'prototype_view'; data: { prototype: string; status: string } }
  | { name: 'prototype_launch'; data: { prototype: string; placement: string } }
  | { name: 'readiness_started'; data: { mode: 'example' | 'custom'; entry: string } }
  | {
      name: 'readiness_completed'
      data: { readiness_level: string; policy_version: string; latency_bucket: string }
    }
```

Generate TypeScript types and runtime validation from one event contract. The wrapper should no-op when the tracker is unavailable, reject undeclared properties, constrain values to enums/known public slugs and short patterns, enforce length/cardinality limits, and never make product behavior depend on analytics success. TypeScript alone is not a privacy boundary because arbitrary browser values can still reach Umami. The `data-before-send` callback is a second line of defense, not the canonical validator.

Emit `readiness_completed` exactly once, only after a validated deterministic result (with or without the AI wording enhancement) has rendered successfully to the visitor. It is therefore the canonical “report viewed” event; `readiness_report_downloaded` measures the separate print/download action and must not be used as a proxy for viewing.

## Event taxonomy

Umami event names are limited to 50 characters. Use stable snake_case names.

### Navigation and conversion

| Event                  | Allowed properties                        |
| ---------------------- | ----------------------------------------- |
| `primary_cta_clicked`  | `cta`, `placement`                        |
| `service_viewed`       | `service`                                 |
| `diagnostic_started`   | `source`                                  |
| `diagnostic_submitted` | `source`, `readiness_level`               |
| `contact_started`      | `service_interest`                        |
| `contact_submitted`    | `service_interest`                        |
| `contact_failed`       | `service_interest`, generic `error_class` |

`contact_*` is exclusively the direct scoped-inquiry flow backed by `contact-requests`; `service_interest` is allowlisted to `prototype_to_production`, `engineering_rescue`, or `fractional_principal_engineer`. `readiness_handoff_*` is the post-report consented form backed by `diagnostic-requests`. Reserve `diagnostic_*` for the paid **Architecture Diagnostic** booking/request flow and emit `diagnostic_submitted` only after the chosen fulfillment integration can confirm success; do not infer a paid submission from a CTA click. Omit `readiness_level` when the diagnostic did not originate from a readiness result.

### Prototype hub

| Event                        | Allowed properties                 |
| ---------------------------- | ---------------------------------- |
| `prototype_card_clicked`     | `prototype`, `status`, `placement` |
| `prototype_view`             | `prototype`, `status`              |
| `prototype_launch`           | `prototype`, `placement`           |
| `prototype_source_clicked`   | `prototype`                        |
| `prototype_feedback_started` | `prototype`                        |

### Readiness check

| Event                         | Allowed properties                                    |
| ----------------------------- | ----------------------------------------------------- |
| `readiness_started`           | `mode`, `entry`                                       |
| `readiness_section_completed` | `section` as a small integer/string                   |
| `readiness_completed`         | `readiness_level`, `latency_bucket`, `policy_version` |
| `readiness_blocked`           | generic `guardrail_category`                          |
| `readiness_failed`            | generic `error_class`, `fallback_used`                |
| `readiness_report_downloaded` | `readiness_level`                                     |
| `readiness_handoff_started`   | `readiness_level`                                     |
| `readiness_handoff_submitted` | `readiness_level`                                     |

Never send:

- name, email, company, phone, or website;
- IP address as custom data;
- free-text context;
- individual assessment answers;
- prompts, completions, report IDs, or report text;
- full referrer/query strings that may contain tokens or personal data;
- repository, document, or internal service identifiers.

## Funnels

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

Umami's current documentation describes it as cookie-free, without cross-site tracking or personal-data collection by default. The Saberistic privacy page must still accurately disclose:

- that analytics is self-hosted;
- what pageview and custom-event metadata is collected;
- the purpose of collection;
- the retention decision;
- whether and how visitors can opt out;
- that contact and readiness content are not put into analytics.

Privacy compliance depends on actual configuration, jurisdiction, and any added event data. Do not treat a product's “GDPR compliant” marketing statement as a substitute for reviewing the deployed behavior and privacy notice.

Choose and document a retention period before launch. A practical starting policy is to keep detailed analytics only as long as it remains useful for year-over-year comparison. Umami does not document an automatic self-hosted TTL/aggregation feature, so do not promise date-based deletion or aggregation until a supported procedure has been implemented and restore-tested against the pinned version. Assign an owner and make backup expiration consistent with the public retention statement.

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
