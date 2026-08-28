# Operations, security, and recovery runbook

## Purpose

This runbook defines the minimum operating discipline for Saberistic V2. It should be updated with real account links, service IDs, owners, and tested commands during implementation. Never add credentials, recovery codes, database URLs, or customer/contact content to this file.

## Service inventory

Maintain an internal inventory with:

- service/resource name and Render Project environment;
- region, runtime/image version, and plan;
- custom domain and health URL;
- repository and branch;
- owner and backup owner;
- datastore dependency;
- secret names and last rotation dates, not values;
- backup method, last successful export, and last restore test;
- escalation contact and vendor status page.

Independent prototypes get their own inventory rows and recovery targets.

## Provisional service objectives

These are launch targets to validate, not public contractual SLAs:

| Component                |  Recovery time target |                        Recovery point target | Degraded behavior                                                                      |
| ------------------------ | --------------------: | -------------------------------------------: | -------------------------------------------------------------------------------------- |
| Main website and Payload |               4 hours |                           24 hours or better | Maintenance/error response; MVP CMS routes require the Payload database                |
| Payload content database |               4 hours | Render PITR window; daily independent export | Public CMS routes and publishing unavailable; restore or fail over through the runbook |
| Media bucket             |               8 hours |         Provider versioning/lifecycle target | Text content remains; missing media gets graceful fallback                             |
| Umami                    |              24 hours |                                     24 hours | Site functions without analytics                                                       |
| Readiness model call     |    Immediate fallback |                               Not applicable | Deterministic report                                                                   |
| Rate-limit store         |               Minutes |                       No durability required | Conservative in-process emergency limits or AI temporarily disabled                    |
| Individual prototype     | Defined per prototype |                        Defined per prototype | Main site marks it unavailable; remains healthy                                        |

## Monitoring

### Main website

Alert on:

- Render deploy and health-check failure;
- elevated 5xx rate and latency;
- memory/CPU saturation and restarts;
- database connection errors or exhausted pool;
- migration failure;
- direct-contact and diagnostic-handoff submission/notification failure;
- readiness fallback rate, OpenRouter 4xx/5xx, timeout, and budget thresholds;
- object-storage upload errors.
- failed or late daily logical-export jobs for either Postgres database.

Synthetic checks should exercise the homepage, a prototype detail, `/api/ready`, and a deterministic readiness fixture without calling OpenRouter on every interval.

### Payload Postgres

Monitor storage, connections, CPU/memory, slow queries, backup/recovery status, and migration history. Alert before storage or connection exhaustion, not at failure.

### Umami

Monitor process heartbeat, Render restarts, database health/storage/connections, dashboard query latency, and unexpected event-volume spikes. Remember `/api/heartbeat` does not prove database connectivity.

### OpenRouter

Track metadata only: request count, success/fallback/error class, latency buckets, selected model/provider, token counts, and cost. Alert at staged percentages of the daily/monthly cap. Never log prompts, manifests, optional symptom text, or completions.

### Prototypes

Check only declared availability URLs. Require repeated failures before paging or changing public state. A prototype outage must never trigger a main-site restart.

## Backup policy

### Payload Postgres

- paid Render PITR enabled and recovery window recorded;
- a dedicated least-privilege Render Cron Job performs the daily logical export to independent encrypted object storage for the launch target;
- named primary and backup owner, automated schedule, failure notification, and dated evidence of the last successful export;
- provisional rolling export retention of 30 days—longer than Render's dashboard retention but short enough to bound deleted-request recovery; publish the actual period in the privacy notice;
- quarterly restore test into an empty temporary database;
- direct Postgres connection for `pg_dump`, never PgBouncer;
- migration files and seed definitions retained in Git.

### Umami Postgres

- paid PITR enabled;
- paid PITR is the primary control for the provisional 24-hour RPO;
- a separate least-privilege Render Cron Job performs the daily logical export, plus an extra manual export before every Umami image upgrade;
- named primary and backup owner, automated schedule, failure notification, and dated evidence of the last successful export;
- retention aligned with the declared analytics policy;
- backup expiration aligned with that policy so a restore cannot silently reintroduce data beyond the promised period;
- restore test plus login/dashboard/event-ingestion verification.

### Media

- production media has a recoverable mechanism before launch: bucket versioning, a replicated bucket, or a tested independent export; cost may change retention depth, not whether recovery exists;
- deletion/lifecycle rules documented;
- inventory or provider audit logs available;
- restore sampling confirms both original and generated image variants;
- object-storage access keys are not the only recovery path to the provider account.

### Configuration

- application, migrations, prompts, readiness policy, analytics event names, Dockerfile, and `render.yaml` in Git;
- Render secret names in an inventory, values only in the secret manager/dashboard;
- domain/DNS configuration documented without registrar recovery secrets;
- MFA recovery codes stored in an approved offline/password-manager location.

## Restore drill

Run before launch and quarterly:

1. Select a known backup/PITR time.
2. Restore to a new temporary database; never overwrite production for a drill.
3. Connect a temporary staging service using the restored internal/external URL as appropriate.
4. Run the private-request retention sweep before opening the restored instance for normal use, then verify schema migration state, critical document counts, admin login, a published page, relationships, one media reference, and admin-only access to remaining `diagnostic-requests`/`contact-requests` without copying their bodies into drill notes.
5. For Umami, verify login, website records, recent aggregates, and ingestion into the temporary instance without polluting production.
6. Record start/end time, recovery point, gaps, and remediation.
7. Destroy the temporary service/database only after the result is reviewed and any evidence required by policy is retained.

## Release procedure

1. Review dependency/model/image release notes.
2. Confirm CI, generated Payload types, migration files, and Blueprint validation.
3. Back up before destructive schema or Umami version changes.
4. Deploy staging and run smoke, migration, access, upload, readiness, event, direct-contact, and diagnostic-handoff tests; verify internal notifications contain only request ID and routing type.
5. Review database migration for locks/data loss and document forward recovery.
6. Deploy production through checks-passing auto-deploy or an approved manual release.
7. Watch health, logs, metrics, AI cost, and conversion-critical paths.
8. Record deployed commit, policy version, Payload version, Umami image, and OpenRouter models.

Payload migrations run once in the pre-deploy phase. Umami migrations run during its pinned container startup; upgrade it at one instance after backup and staging validation.

## Rollback rules

- Application-only regression with compatible schema: roll back the web service image/commit.
- Forward-only compatible migration: fix forward rather than restoring an older schema casually.
- Destructive/incorrect migration: stop publishing/writes, assess PITR into a new database, and follow the database incident plan.
- Umami application regression after schema migration: consult its migration/release notes; do not assume the old image accepts the new schema.
- Readiness prompt/model regression: switch to the previously approved pinned model/prompt or disable AI enhancement; deterministic results continue.
- Analytics regression: remove/disable the tracker or Umami service; do not block the main release.

## Incident playbooks

### Main site unhealthy

1. Confirm Render status and the last deploy event.
2. Check `/api/health` versus `/api/ready` to distinguish process from database failure.
3. If the new release caused it, roll back when schema-compatible.
4. If database-related, stop migrations/writes and follow the database playbook.
5. Keep Umami/OpenRouter/prototype failures out of readiness health; disable those integrations independently if needed.
6. Verify recovery and document timeline/root cause.

### Payload database failure or accidental deletion

1. Restrict admin/publishing and preserve logs.
2. Identify the last known good time and current Render recovery window.
3. Prefer PITR into a new database rather than in-place destructive restoration.
4. Point staging at the recovery instance and validate content/migrations.
5. Update production connection through controlled secret/config change.
6. Verify site, admin, uploads, relationships, direct-contact and diagnostic-handoff forms, retention dates, and private-request access rules before declaring recovery.

### OpenRouter cost or abuse incident

1. Disable AI enhancement with a server-side feature flag; keep deterministic reports live.
2. Disable/rotate the dedicated key if compromise is suspected.
3. Inspect rate-limit, usage, model/provider, and error metadata without accessing content.
4. Tighten global concurrency, limits, Guardrail allowlists, and challenge thresholds.
5. Confirm no broader secret was exposed; the key must be unique to this feature.
6. Re-enable gradually and monitor spend.

### Sensitive content sent to AI

1. Disable enhancement if filtering failed systematically.
2. Identify request IDs and affected routing metadata without copying content into tickets/logs.
3. Review OpenRouter/provider data policy and account logging settings active at the time.
4. Follow the privacy incident owner’s containment/notification decision.
5. Fix local detection and add the pattern to regression tests before re-enable.

### Umami unavailable or compromised

1. Remove or feature-flag the tracker if it affects performance/security.
2. Preserve database and access evidence.
3. Rotate Umami credentials/secrets as appropriate; understand that changing `APP_SECRET` invalidates sessions and changing the 2FA encryption key can make stored TOTP secrets unreadable.
4. Restore or redeploy the pinned image/database.
5. Verify that no unauthorized event fields or public shares were added.
6. The main site remains live throughout.

### Prototype outage

1. Confirm repeated failure and whether it is a Render/vendor outage.
2. Update the Payload record with a temporary unavailable notice if visitor impact persists.
3. Remove homepage feature placement if necessary; do not delete the story.
4. Recover the independent service using its own runbook.
5. Verify before clearing `lastVerifiedAt`/availability state.

## Secret rotation

Rotate on suspected exposure, team/access change, provider requirement, or scheduled review:

- Payload secret: rotation invalidates sessions; coordinate admin re-login.
- OpenRouter key: create a new restricted key, deploy, verify, then revoke old.
- S3 credentials: create overlapping least-privilege key, deploy/test, revoke old.
- Postgres credentials: use Render's supported credential-rotation workflow and update dependents without exposing URLs.
- Umami `APP_SECRET`: keep stable unless required; expect login sessions to invalidate.
- Umami 2FA encryption key: protect and back up; do not casually rotate because existing secrets depend on it.
- Key Value internal auth: for a live client, use Render's documented dummy-allowlist/password migration to deploy the authenticated internal URL before enforcement/rotation; for a new instance, keep AI disabled until auth is enabled, the Blueprint reference is resynced, and the client is tested.

Record rotation date and owner, never the secret value.

## Access and account security

- MFA on Git provider, Render, DNS/registrar, object storage, OpenRouter, email/booking, and password manager;
- individual accounts instead of shared logins where supported;
- least-privilege Render roles and protected production environment;
- branch protection and reviewed infrastructure/migration changes;
- Payload admins limited to actual operators; editors do not manage roles or private operational fields;
- Umami default credentials removed, 2FA enabled, sharing reviewed;
- quarterly access review and immediate removal on role change.

### Source-repository hardening

The 2026-08-28 organization audit found secret scanning/push protection disabled on several legacy repositories and dependency-security updates disabled across the public inventory. Treat those as migration findings, not acceptable defaults for V2.

- enable secret scanning, push protection, dependency alerts/security updates, and protected branches on the core V2 repository and every selected public prototype where the provider plan supports them;
- where a platform control is unavailable, run secret and dependency scanning in required CI and document who reviews alerts;
- review every imported/generated repository for committed credentials, unsafe example environment files, unpinned dependencies, generated history, and license before adding Render secrets or production data;
- do not copy the unusually large `agent-web` history into the new V2 repository by default; migrate approved content, routes, and implementation pieces deliberately;
- require a security-settings check and current dependency scan in each prototype launch packet.

### Dependency and vendored-asset review

- run the package-manager audit against the committed lockfile before release and investigate every production-scoped result;
- inspect the built application for vendored browser assets when an upstream package embeds dependencies, because a clean package-tree audit does not prove that compiled copies are patched;
- keep pnpm overrides narrowly scoped, pinned, documented, and covered by build, migration, and browser tests;
- remove an override when the owning upstream dependency ships the fix, rather than allowing it to become permanent invisible policy;
- as of 2026-08-28, Payload `3.88.0` pulls Monaco Editor `0.56.0`, whose prebuilt assets embed an older DOMPurify copy. The current schema has no code/JSON editor fields, so do not add those fields until this exception is reassessed or upstream ships a fixed stable bundle.

## Logging and privacy

Allowed operational fields:

- timestamp, request ID, route template, status, timing bucket;
- deploy/build/policy version;
- generic error class;
- model/provider, token count, cost, and fallback boolean;
- document ID for CMS operations without rich-text body.

Do not log:

- request/response bodies for readiness, diagnostic-handoff, or direct-contact forms;
- names, email, phone, company, website, free text;
- cookies, authorization headers, full database URLs, API keys;
- prompts/completions or normalized manifests;
- signed media URLs or query strings with tokens.

Set log retention deliberately and restrict access. Debug logging that expands bodies must not be enabled in production.

Private `diagnostic-requests` and `contact-requests` both receive a 90-day review date under the provisional launch policy. Delete closed/unconverted requests at review unless a legal/business record policy for an active engagement requires transfer to an approved system and a different retention basis. With the provisional 30-day rolling Payload-export window, a deleted record can remain encrypted and inaccessible in disaster-recovery backups for up to 30 additional days; disclose the final window. Every restore runs the retention sweep before normal access so expired records are not silently revived. Test deletion and backup-expiry behavior for both collections, and keep internal notifications to request ID plus request/service type. Confirm this policy before publishing the privacy notice; do not retain records indefinitely merely because they are in Payload.

## Routine maintenance

### Weekly

- review failed deploys, 5xx, readiness fallbacks, AI spend, form failures, and prototype health;
- verify backup/export completion;
- inspect dependency/security alerts;
- review Umami event delivery for unexpected properties/volume.

### Monthly

- update dependencies/images through staging;
- review Render and database sizing;
- review prototype featured status and `lastVerifiedAt`;
- confirm analytics retention/deletion tasks;
- confirm the tested deletion mechanism, named owner, schedule, and backup expiry before any public date-based retention promise;
- sample public evidence links and redirects.

### Quarterly

- restore both databases into temporary instances;
- review account access/MFA/recovery owners;
- rotate scheduled keys where appropriate;
- rerun readiness golden evaluations against pinned models;
- review privacy, terms, methodology, CSP, and vendor data settings;
- test the complete incident/rollback path.

## Launch-day checklist

- [ ] production environment protected and isolated;
- [ ] internal datastore URLs and external allowlists verified;
- [ ] paid Postgres recovery active for both databases;
- [ ] logical export and object-storage recovery confirmed;
- [ ] custom domains, TLS, root/`www` redirects, and default subdomain policy verified;
- [ ] Payload admin roles, secure cookies, lockout, and preview tested;
- [ ] Umami password/2FA/privacy flags/domain filter/query exclusion tested;
- [ ] OpenRouter limited key, Guardrail, ZDR, data denial, rate limits, and fallback tested;
- [ ] no PII in Umami or logs;
- [ ] diagnostic/contact request privacy, 90-day review dates, private access, minimized notifications, and deletion path tested;
- [ ] at least one prototype outage simulated without main-site impact;
- [ ] owner and rollback availability confirmed for the first 48 hours.
