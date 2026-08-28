# Umami analytics implementation

## Goal

Use self-hosted Umami to understand whether visitors discover prototypes, complete the Production Readiness Check, and request qualified human help. Do this without cookies, cross-site tracking, contact data, readiness answers, prompts, or report content.

Umami is MIT-licensed and self-hostable. Recheck the pinned release's repository license during upgrades and review separately licensed integrations before adding them.

Umami is an analytics tool, not the source of product truth. Event names and allowed properties are versioned in Git; business conclusions must be tied to their definitions.

## Deployment shape

Run Umami as a separate Render web service using an official, pinned container image and a dedicated Render Postgres instance in the same region.

```text
Browser
  ├─ saberistic.com
  ├─ selected prototype apps
  └─ analytics.saberistic.com/script.js
                    │
                    ▼
             Umami web service
                    │ private URL
                    ▼
             Umami Render Postgres
```

The separate database is the recommended production choice. It isolates migrations, permissions, retention, performance, and recovery from Payload. A shared Postgres instance is a possible temporary cost optimization, but it expands the failure domain and should not be the target architecture.

## Container and runtime

- Use Umami's official image with PostgreSQL support.
- Pin a tested version or immutable digest in production; do not deploy a mutable `latest` tag without a controlled upgrade process. As reviewed on 2026-08-28, the official GHCR package publishes `3.3.1`, which is a staging candidate rather than a license to skip future release review.
- The official image defaults to `0.0.0.0:3000`; set/test Render's service port as `3000` rather than assuming the native-runtime default. Use `/api/heartbeat` as the HTTP health-check path.
- Change the default admin password immediately during initial setup.
- Create a named non-default admin account if supported by the chosen version, enable 2FA, and keep routine dashboard access least-privileged.
- Do not expose the database externally unless an approved administrative or backup task requires it.
- Verify PostgreSQL reports a UTC timezone, as Umami recommends.

## Environment variables

Required or recommended:

| Variable | Handling | Purpose |
|---|---|---|
| `DATABASE_URL` | Render `fromDatabase`, internal connection | Umami Postgres connection |
| `DIRECT_DATABASE_URL` | Omit initially; direct URL if the normal URL later uses a pooler | Gives migrations a direct connection when required |
| `APP_SECRET` | Render-generated secret | Secures authentication tokens |
| `TWO_FACTOR_ENCRYPTION_KEY` | `sync: false`; manually generate a stable 64-character hex secret | Encrypts 2FA secrets where the deployed Umami version supports it |
| `DISABLE_TELEMETRY=1` | Committed non-secret value | Prevents anonymous product telemetry from the self-hosted instance |
| `PRIVATE_MODE=1` | Recommended after staging verification | Blocks Umami's external calls, including favicon lookup |
| `DISABLE_UPDATES=1` | Optional | Avoids dashboard update checks if upgrades are handled operationally |
| `TRACKER_SCRIPT_NAME` | Optional stable value | Custom tracker path; document it if changed |
| `SALT_ROTATION=month` | Explicit initial value | Controls anonymous session-salt rotation; revisit only with a documented measurement/privacy decision |

`DATABASE_URL` is the only variable Umami documents as strictly required, but a unique `APP_SECRET` is operationally mandatory. Never reuse the Payload secret or OpenRouter key.

Keep the default tracker path unless there is a concrete reason to change it. Renaming a tracker solely to bypass a visitor's explicit blocking choice is inconsistent with the privacy positioning. Do not set `SKIP_DB_CHECK` or `SKIP_DB_MIGRATION` unless migration execution has been moved into a separately tested process.

## Website records

Create these Umami Website records:

1. `Saberistic Production` for `saberistic.com` and the approved `www` hostname.
2. `Saberistic Staging` in the dedicated staging Umami service/database pair as the canonical upgrade and event-validation target. The normal staging website may omit its tracker when analytics is not under test.
3. One record per mature prototype when it needs a separate dashboard.

Early prototypes may use the main production property if their hostname and event context are carefully configured, but separate records provide cleaner ownership as they grow.

## Next.js tracker integration

Load the tracker with Next.js `Script` after the page becomes interactive. Configure:

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
  | { name: 'readiness_completed'; data: { readiness_level: string; policy_version: string; latency_bucket: string } }
```

Generate TypeScript types and runtime validation from one event contract. The wrapper should no-op when the tracker is unavailable, reject undeclared properties, constrain values to enums/known public slugs and short patterns, enforce length/cardinality limits, and never make product behavior depend on analytics success. TypeScript alone is not a privacy boundary because arbitrary browser values can still reach Umami. The `data-before-send` callback is a second line of defense, not the canonical validator.

Emit `readiness_completed` exactly once, only after a validated deterministic result (with or without the AI wording enhancement) has rendered successfully to the visitor. It is therefore the canonical “report viewed” event; `readiness_report_downloaded` measures the separate print/download action and must not be used as a proxy for viewing.

## Event taxonomy

Umami event names are limited to 50 characters. Use stable snake_case names.

### Navigation and conversion

| Event | Allowed properties |
|---|---|
| `primary_cta_clicked` | `cta`, `placement` |
| `service_viewed` | `service` |
| `diagnostic_started` | `source` |
| `diagnostic_submitted` | `source`, `readiness_level` |
| `contact_started` | `service_interest` |
| `contact_submitted` | `service_interest` |
| `contact_failed` | `service_interest`, generic `error_class` |

`contact_*` is exclusively the direct scoped-inquiry flow backed by `contact-requests`; `service_interest` is allowlisted to `prototype_to_production`, `engineering_rescue`, or `fractional_principal_engineer`. `readiness_handoff_*` is the post-report consented form backed by `diagnostic-requests`. Reserve `diagnostic_*` for the paid **Architecture Diagnostic** booking/request flow and emit `diagnostic_submitted` only after the chosen fulfillment integration can confirm success; do not infer a paid submission from a CTA click. Omit `readiness_level` when the diagnostic did not originate from a readiness result.

### Prototype hub

| Event | Allowed properties |
|---|---|
| `prototype_card_clicked` | `prototype`, `status`, `placement` |
| `prototype_view` | `prototype`, `status` |
| `prototype_launch` | `prototype`, `placement` |
| `prototype_source_clicked` | `prototype` |
| `prototype_feedback_started` | `prototype` |

### Readiness check

| Event | Allowed properties |
|---|---|
| `readiness_started` | `mode`, `entry` |
| `readiness_section_completed` | `section` as a small integer/string |
| `readiness_completed` | `readiness_level`, `latency_bucket`, `policy_version` |
| `readiness_blocked` | generic `guardrail_category` |
| `readiness_failed` | generic `error_class`, `fallback_used` |
| `readiness_report_downloaded` | `readiness_level` |
| `readiness_handoff_started` | `readiness_level` |
| `readiness_handoff_submitted` | `readiness_level` |

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
- the default admin password is gone, 2FA is configured, and secrets are unique;
- a documented backup and upgrade test has been completed.

If analytics is ever embedded inside the Payload admin, protected Umami API calls must occur server-side and no Umami bearer/login credential may reach the browser. Embedding is out of MVP scope; an iframe can require Umami build-time configuration and therefore a custom image rather than the chosen prebuilt-image path.

## Official references

- [Umami repository and MIT license](https://github.com/umami-software/umami)
- [Umami v3 introduction and privacy model](https://docs.umami.is/docs)
- [Self-hosted installation](https://docs.umami.is/docs/install)
- [Environment variables](https://docs.umami.is/docs/environment-variables)
- [Collect data](https://docs.umami.is/docs/collect-data)
- [Tracker configuration](https://docs.umami.is/docs/tracker-configuration)
- [Track events](https://docs.umami.is/docs/track-events)
- [Tracker functions and event-data limits](https://docs.umami.is/docs/tracker-functions)
- [Getting updates](https://docs.umami.is/docs/updates)
- [Official Docker Compose health-check example](https://github.com/umami-software/umami/blob/master/docker-compose.yml)
