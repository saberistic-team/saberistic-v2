# Payload CMS implementation

## Architecture

Payload runs inside the same Next.js application as the public website. The deployment is one web service with three surfaces:

- the public App Router pages;
- the Payload admin at `/admin`;
- Payload REST/GraphQL endpoints under the generated API routes.

Payload's core is MIT-licensed and self-hostable. Recheck the license and any optional enterprise feature terms when pinning the actual release rather than assuming this document licenses third-party add-ons.

Server Components should use Payload's Local API through a dedicated safe public-read wrapper. Payload's Local API bypasses access control by default, so public reads must explicitly set `overrideAccess: false`, supply the intended anonymous/user context, enforce published-only collection access, and use narrow `select`, `populate`, and `depth` values. Keep privileged maintenance/admin Local API calls in visibly separate modules. Browser code should receive only the data it needs through rendered props or purpose-built route handlers.

```text
Next.js + Payload web service
  ├─ public website
  ├─ /admin
  ├─ /api/... Payload and app routes
  ├─ Render Postgres (private connection)
  └─ S3-compatible media bucket
```

This is deliberately not a detached headless CMS with a second application server.

## Version and runtime policy

- Start from Payload's official website template or add Payload to a new App Router project.
- Pin every `payload` and `@payloadcms/*` package—database, storage, rich text, SEO, UI/live-preview, and email adapters included—to exactly the same version and ensure each resolves only once. Pin compatible `next`, `react`, and `react-dom` versions exactly and prevent duplicate copies.
- Pin a Payload-supported Next.js version rather than accepting automatic major/minor upgrades.
- Use Node 20.9 or newer, while also respecting the exact Node version supported by the pinned Payload and Next versions.
- Use pnpm and commit `pnpm-lock.yaml`.
- Wrap Next configuration with `withPayload()` and use ESM configuration.
- Enable Next.js standalone output for the production Docker image.
- Generate and commit Payload TypeScript types whenever the schema changes.

As reviewed on 2026-08-28, Payload documents specific supported Next.js patch lines. Recheck the [official installation compatibility table](https://payloadcms.com/docs/getting-started/installation) before scaffolding or upgrading.

## Suggested application structure

The tree below is abbreviated. Copy and preserve the official generated `(payload)` route group—including its layout, import map, not-found route, styles, GraphQL playground where included, and other generated elements—instead of hand-authoring only these example files.

```text
src/
  app/
    (frontend)/
      page.tsx
      prototypes/[slug]/page.tsx
      work/[slug]/page.tsx
      readiness/page.tsx
    (payload)/
      admin/[[...segments]]/page.tsx
      api/[...slug]/route.ts
      graphql/route.ts
    api/
      health/route.ts
      ready/route.ts
      readiness/assess/route.ts
      diagnostic-requests/route.ts
      contact-requests/route.ts
  collections/
  globals/
  blocks/
  access/
  hooks/
  lib/
    actions/
      public-actions.v1.ts
    analytics/
    payload/
      public-read.ts
    readiness/
    validation/
  migrations/
  payload.config.ts
  payload-types.ts
```

Keep schemas, access functions, hooks, and blocks in small named modules. Avoid a single oversized `payload.config.ts`.

## Collections

### `users`

Purpose: CMS authentication and authorization.

Fields:

- `name`
- `email` through Payload auth
- `role`: `admin` or `editor`
- optional `lastSecurityReviewAt`

Rules:

- no public read, create, update, or delete;
- only admins manage users and roles;
- editors can update their own name and password, not their role;
- require strong passwords and enable secure cookies in production;
- configure login-attempt lockout.

### `prototypes`

Purpose: editorial registry for independent apps.

Core fields:

- `title`, `slug`, `summary`, `story`
- `status`: `concept`, `prototype`, `alpha`, `beta`, `live`, `archived`
- `problem`, `primaryAction`, `decisions`, `limitations`
- `dataClassification`: `none`, `synthetic-only`, `non-sensitive`, `account-data`, `sensitive`
- `safetyNotice`, `dataHandlingNotes`
- `appUrl`, `sourceUrl` (public display link), `availabilityUrl`
- optional `sourceProvenance` group: canonical `repositoryUrl`, `repositoryOwner`, `repositoryName`, `relation` (`organization_owned`, `personal_original`, `fork`, or `external_contribution`), `licenseSpdxExpression`, `sourceLastCheckedAt`, and `sourceReviewStatus` (`unreviewed`, `metadata_only`, `reviewed`, or `blocked`)
- `availabilityStatus`: `unchecked`, `available`, `degraded`, `unavailable`, `retired`
- `availabilityMessage`, `availabilityCheckedAt`, `availabilityCheckedBy`
- `poster`, `gallery`, optional `demoVideo`
- `technologies` relationship
- `buildLog` array with date, title, notes, and optional release URL
- `featured`, `featuredOrder`, `featureUntil`
- `launchedAt`, `lastVerifiedAt`
- `privacyUrl`, `termsUrl`, `serviceExpectations`
- launch-control dates: `authReviewedAt`, `securityReviewedAt`, `monitoringVerifiedAt`, `restoreTestedAt`, `rollbackTestedAt`
- internal launch approval and reviewer
- `relatedCaseStudies`, `relatedServices`
- internal-only `renderServiceId` and `operationalNotes`
- reusable SEO group: title, description, social image, canonical override, no-index toggle

Publishing validation and status gates:

- `prototype`, `alpha`, `beta`, and `live` require `appUrl`, `lastVerifiedAt`, and a manual availability state other than `unchecked`/`retired`;
- `concept` and `prototype` may use only `none` or `synthetic-only` data;
- `alpha` may add `non-sensitive` data only with a safety notice and reviewed data handling;
- `account-data` or `sensitive` requires `beta`/`live`, privacy and terms URLs, documented retention/deletion, reviewed authentication/authorization, monitoring, rollback, recovery, and admin launch approval;
- `live` also requires public service/support expectations and recent monitoring, restore, rollback, and security-review dates;
- `featured` requires poster, summary, safety notice, and a non-archived status;
- `archived` cannot be featured;
- homepage queries treat `featureUntil` in the past as not featured even if an editor forgot to clear the boolean;
- external URLs must be HTTPS outside local development;
- when a public `sourceUrl` is present, the source-provenance group is required; the repository owner/name must match the canonical repository URL, the license must be a reviewed SPDX expression or `NOASSERTION`, and `sourceLastCheckedAt` records the most recent manual review rather than repository activity;
- GitHub presence, organization membership, repository existence, README copy, repository homepage metadata, badges, releases, or a Pages deployment are discovery evidence only. They never automatically change `status`, set a prototype to `live`, satisfy availability/security/recovery gates, or prove ownership, originality, license, production use, or Saber's contribution. A reviewer must set `sourceReviewStatus` and prototype status explicitly from the underlying evidence;
- public reads return only published documents and omit internal fields.

### `case-studies`

Purpose: selected proof and long-form work pages.

Fields:

- `title`, `slug`, `summary`, `body`
- `organization`
- `relationship`: `employment`, `contract`, `founder`, `team_role`, `saberistic_engagement`, `sanitized_diagnostic`, `independent`, `open_source`, `research`
- `publicContentType`: `case_study`, `experience_profile`, `contribution_profile`, or `research_profile`
- `role`, `timeframe`
- `situation`, `responsibility`, `decisions`, `outcome`
- `capabilities` and `technologies`
- `evidenceSources` relationship
- `claims` array: stable claim ID, exact public statement, `claimType` (`relationship`, `role`, `contribution`, `outcome`, or `metric`), related evidence sources, `claimStatus` (`publicly_corroborated`, `founder_provided`, or `hold`), permission status, permission evidence/reviewer/date, and allowed surfaces
- derived page-level `claimStatus`: the most restrictive state among claims selected for that page
- derived page-level `permissionStatus`: the most restrictive permission among selected claims/evidence records
- `featured`, `sortOrder`
- SEO group

A page must never publish with a selected claim or derived `claimStatus: hold`. The displayed relationship must have a matching structured relationship claim that is allowed on that surface; a founder-provided employer/founder assertion cannot silently inherit homepage permission from separately corroborated code contributions. Numeric outcomes require a directly supporting primary/first-party public source and any necessary permission; an internal approval note alone cannot convert an unsupported metric into public corroboration. Material relationship, role, contribution, outcome, and metric statements render from the structured claims array or a typed claim-reference block—not arbitrary rich text. Contextual prose still receives editorial review because schema validation cannot determine factual truth. Use the “case study” public label only for `saberistic_engagement`, `sanitized_diagnostic`, or a contract with explicit public permission. Employer/founder work normally renders as an experience profile.

### `experience`

Purpose: the About timeline and additional resume history.

Fields:

- organization, role, start/end dates;
- `relationship`: `employment`, `contract`, `founder`, `team_role`, `saberistic_engagement`, `sanitized_diagnostic`, `independent`, `open_source`, or `research`;
- concise summary and selected work;
- the same structured `claims` array, evidence-source links, permission fields, and derived `claimStatus` used by case studies;
- display order and visibility;
- optional related case study.

Keep full resume chronology here, while `case-studies` remains curated. An experience item with a selected `hold` claim cannot publish; founder-provided items must render the exact relationship and evidence labels instead of being implied as independently verified client work.

### `evidence-sources`

Purpose: normalize provenance and prevent unsupported copy.

Fields:

- `title`, `url`, `sourceType`
- `publisherOrOwner`
- `accessedAt`
- `supports` short factual statement
- `strength`: `primary`, `first-party-public`, `public-contribution`, `secondary`, `self-attested`
- `permissionStatus`: `public`, `approval-required`, `private-only`
- `allowedSurfaces`: homepage, Work, About, proposal, private-only
- optional archived URL and archive date
- internal verification notes
- relationships back to experience and case studies

Only admins can delete evidence records. Editors may attach existing records and propose new ones.

Canonical mapping:

- a directly relevant `primary`, `first-party-public`, `public-contribution`, or named `secondary` source may support `publicly_corroborated`;
- `self-attested` material maps to `founder_provided` unless stronger direct evidence is attached;
- insufficient, disputed, outcome/metric-only, or permission-restricted material maps to `hold` for public surfaces;
- relationship values always render the exact public labels defined in [03](./03-verified-content-and-ai-brief.md), regardless of card/page template.

### `services`

Fields:

- `title`, `slug`, `shortPromise`
- `bestFor`, `notFor`
- `signals`, `deliverables`, `process`
- `startingPriceOrModel` as carefully reviewed copy, not a calculation field;
- `primaryActionId` selected from the Git-owned public-action registry, `sortOrder`, `published`;
- SEO group.

Seed exactly three: Prototype to Production, Engineering Rescue, and Fractional Principal Engineer.

Conversion labels and destinations are not free-form CMS fields. Define a versioned `public-actions.v1.ts` registry in Git with stable IDs, exact display labels, allowed placements, and route/destination type. The initial registry includes `check_production_readiness`, `explore_prototypes`, `start_architecture_diagnostic`, `inquire_prototype_to_production`, `inquire_engineering_rescue`, and `inquire_fractional_principal_engineer`. Payload stores only an allowed action ID; the public app resolves its reviewed label and destination. Changing the registry requires updating ADR-016, analytics allowlists, forms, and tests together.

### `pages`

Purpose: flexible legal and durable editorial pages, not every major product page.

Fields:

- title, slug, layout blocks, SEO group;
- page type: standard, legal, methodology;
- last legally reviewed date for legal content.

Use dedicated schemas/globals for the homepage and readiness UI so their structure cannot be accidentally destroyed through an unrestricted page builder.

### `media`

Fields:

- upload, alt text, caption, credit/source;
- usage rights: owned, licensed, public-domain, third-party-permission;
- focal point and generated responsive sizes;
- optional prototype/case-study relationship.

Alt text and usage rights are required before publication. Validate allowed file types and set conservative file-size limits. Do not store arbitrary executable files.

### `technologies`

Purpose: controlled taxonomy for prototypes and proof. Fields are `name`, `slug`, `category`, and optional official URL. Avoid turning every library into a tag.

### `diagnostic-requests`

Purpose: explicit post-report human handoff.

Fields:

- name and email; optional company and website;
- `requestType`: `architecture_diagnostic` or `engineering_rescue_inquiry`;
- optional `additionalContext`, maximum 1,000 characters, entered on the handoff form rather than copied from the AI symptom field;
- report ID, readiness level, policy version, and only the blocker IDs the visitor explicitly selected to share; after token verification, the server derives and stores canonical label snapshots from the signed policy version's Git-owned catalog rather than accepting browser label text;
- `shareAssessmentSummary`, `contactConsent`, consent timestamp, and privacy-notice version;
- status: new, reviewed, replied, archived;
- retention review date, initially 90 days after creation/closure under the provisional policy;
- internal notes.

This collection is private. OpenRouter never receives these fields. Never store the raw answer manifest, symptom text from the assessment, AI summary/prose, dimension narrative, or downloaded report. The internal notification contains only the request ID and request type; the authorized reviewer opens this private record to see the consented fields.

### `contact-requests`

Purpose: a direct scoped inquiry from service/About/Contact surfaces that does not require a readiness report.

Fields:

- name and email; optional company and website;
- `serviceInterest`: `prototype_to_production`, `engineering_rescue`, or `fractional_principal_engineer`;
- optional `additionalContext`, maximum 1,000 characters;
- `contactConsent`, consent timestamp, and privacy-notice version;
- status: new, reviewed, replied, archived;
- retention review date, initially 90 days after creation/closure under the provisional policy;
- internal notes.

This collection is private and receives no assessment token, blocker, readiness, or model fields. The internal notification contains only the request ID and `serviceInterest`. Direct service inquiries do not add new readiness result IDs; `self_serve`, `architecture_diagnostic`, and `engineering_rescue_inquiry` remain the complete deterministic result vocabulary.

### Shared public-form security contract

Apply this contract to both `POST /api/diagnostic-requests` and `POST /api/contact-requests`:

- accept only the intended JSON content type with a conservative total-body limit, strict schema, bounded strings, normalized email, allowlisted enums, and rejection of unknown fields;
- require same-origin/CSRF validation and use secure cookie settings; never rely on a hidden field alone;
- use Key Value-backed limits for both an IP-derived one-way key and a separate session/challenge token, plus a global submission ceiling and honeypot or challenge escalation; set expirations and never send these identifiers or personal data to analytics;
- validate a submitted website as data only and never fetch it server-side, preventing SSRF;
- set request status, consent timestamp, privacy version, retention review date, and any server-derived blocker labels on the server rather than trusting client values;
- return generic success/error responses that do not enumerate existing email addresses or expose database/provider details;
- make duplicate/retry behavior explicit with a short-lived idempotency token or safe duplicate handling;
- log only request ID, route, outcome class, timing bucket, and rate-limit result—never bodies, contact fields, free text, tokens, or notification content;
- after validation, store personal data only in the matching private Payload collection: readiness handoffs in `diagnostic-requests` and direct service inquiries in `contact-requests`. Deny public read/list access, persist only the documented fields, and never copy PII into Umami, OpenRouter, rate-limit state, or provider notifications;
- send the minimized ID/type-only notification only after the database write succeeds, and alert on notification failure without rolling back the accepted request.

Test cross-origin posts, oversized bodies, unknown fields, enum tampering, header injection, URL/SSRF payloads, replay/duplicates, rate-limit exhaustion, database failure, notification failure, and body-free logs for both endpoints.

## Globals

### `site-settings`

- site name, canonical origin, default SEO and social image;
- contact email and booking URL;
- public social/profile links;
- default CTA action IDs selected from the Git-owned public-action registry; no free-form conversion labels;
- legal footer and organization structured-data fields.

### `navigation`

- ordered header and footer links;
- each item limited to approved internal route or validated HTTPS URL;
- no deeply nested mega-menu in V2.

### `homepage`

- hero eyebrow, headline, support, and CTA references;
- featured-prototype heading and selection mode;
- readiness introduction copy;
- proof, offers, approach, About summary, and final CTA copy.

Keep actual prototype, case-study, and service data in their collections; the global stores presentation and explicit selections.

### `readiness-copy`

- introduction, privacy warning, section labels, help text;
- result disclaimers and human-handoff copy;
- example profile descriptions.

The question IDs, answer values, weights, hard blockers, policy logic, JSON Schema, and system prompt stay in Git. Editorial access must not be able to change a score or model contract.

## Reusable field groups and blocks

Create strongly typed groups for:

- SEO metadata;
- CTA link/action;
- evidence references;
- relationship labels;
- media with alt/caption;
- status and last-verified display;
- rich-text content with an intentionally small feature set.

Use a restrained block library: prose, image/media, quote, evidence list, architecture diagram, callout, related prototype, and CTA. Avoid a generic “anything goes” block that undermines layout consistency.

## Drafts, versions, and preview

- Enable drafts and versions for prototypes, case studies, services, pages, and key globals.
- Collection/global `read` access must constrain anonymous users to `_status = published`; do not rely on every caller remembering a filter. Authenticated, signed previews may request the newest draft explicitly.
- Configure preview URLs against the staging site.
- Protect draft preview with a signed, short-lived token and editor authentication.
- Limit retained versions to a reasonable count after launch.
- Use scheduled publish only after verifying the worker or scheduler that will execute it.

## Access-control matrix

| Resource | Public | Editor | Admin |
|---|---|---|---|
| Published editorial content | Read | CRUD drafts/publish approved types | Full |
| Drafts and previews | No | Read/write | Full |
| Evidence sources | Public projection only where linked | Create/update; no delete | Full |
| Users | No | Self only | Full |
| Diagnostic and contact requests | No | Read/update if explicitly allowed | Full |
| Operational fields | No | No | Full |
| Readiness policy/prompt | No CMS access | No CMS access | Code review only |

Implement access at collection and field level. Hiding an admin field in the UI is not access control.

For public rendering, make `public-read.ts` the only normal entry to the Local API. It must always use `overrideAccess: false`, an anonymous request context, bounded relationship depth, and an explicit field selection. Add tests proving that first drafts, private fields, internal relationships, users, diagnostic requests, and contact requests cannot cross this wrapper. Reserve `overrideAccess: true` for narrowly named maintenance code and code-review it as privileged behavior.

## Postgres and migrations

Use `@payloadcms/db-postgres` with `DATABASE_URL`. In development, Payload's Drizzle push mode is acceptable for a disposable local database. Production uses committed migrations only.

Schema-change workflow:

1. Change the Payload config locally.
2. Regenerate Payload types.
3. Create a named migration with `pnpm payload migrate:create`.
4. Review generated SQL, especially destructive operations.
5. Test `up` against a production-shaped synthetic or explicitly sanitized staging dataset. Never copy production diagnostic/contact PII into staging.
6. Test rollback or write a forward recovery procedure.
7. Commit schema, types, and migration together.
8. Run pending migrations in Render's pre-deploy step before the new web version receives traffic.

Do not run development push mode against staging or production. Do not let every horizontally scaled instance race to perform the same migration at startup.

Because the web service uses a slim Next.js standalone Docker image, deliberately include a migration runner and everything it needs in the final image. A `preDeployCommand` such as `pnpm payload migrate` is valid only if pnpm, the Payload CLI/config, migration files, and required packages are actually present in that image. Test the exact command against the built container, not only the development checkout.

Use backward-compatible expand/contract migrations:

1. add new nullable structures or dual-read/dual-write support;
2. deploy application code compatible with both old and new schema;
3. backfill/verify data separately;
4. switch reads after verification;
5. remove old fields only in a later release.

Render may keep the previous web version serving if the new image fails health checks, but it does not undo a successful pre-deploy database migration. The previous version must therefore remain compatible with the migrated schema. Treat destructive migrations as separately staged operations with backup and forward-recovery plans.

The initial Render strategy is a database-free compile followed by migration and runtime rendering:

1. Docker build runs Next's documented compile-only build mode and does not query Payload content.
2. Avoid `NEXT_PUBLIC_*` build-time variables; read server environment values and render approved public config such as Umami script attributes from the server layout.
3. Render runs `pnpm payload migrate` in pre-deploy.
4. The new service starts and CMS-backed routes render dynamically with deliberate caching/revalidation.

If a future release adds static generation from the Payload Local API, redesign ordering so migrations run before the generation step with database access. Payload also documents a `generate-env` step for compile-only builds that need `NEXT_PUBLIC_*` values, but the preferred V2 design avoids that coupling.

## Media storage

Use `@payloadcms/storage-s3` with AWS S3 or Cloudflare R2's S3-compatible API.

Install `sharp` and pass it to Payload's configuration; responsive sizes, focal-point cropping, and image transformations depend on it.

Recommended behavior:

- local filesystem storage only in development;
- object storage enabled in staging and production;
- separate bucket or prefix per environment;
- randomized or collision-safe object keys;
- direct public CDN URLs only for intentionally public marketing media;
- signed downloads or Payload access-control proxying for private assets;
- bucket CORS limited to the necessary site origins and methods;
- lifecycle policy for abandoned uploads and old generated variants;
- credentials restricted to the exact bucket/prefix.

For public marketing media, direct bucket/CDN URLs require an intentional public-read policy, Payload storage URL generation, and explicit acceptance that Payload access control is bypassed. Keep restricted assets proxied through Payload access control or use signed downloads.

Do not attach a Render disk for media in the primary architecture. A disk binds the service to one instance and removes the normal zero-downtime deployment behavior.

## Hooks and revalidation

After publishing or unpublishing content:

- revalidate the exact detail path;
- revalidate the affected index;
- revalidate `/` only when featured or homepage-visible data changed;
- log the document ID and paths, never full private content.

Hooks should not make a publish request depend synchronously on noncritical third parties. Queue slow screenshot generation, link checks, or notifications.

## Jobs

The MVP does not require a Payload worker if it avoids scheduled publishing and background work. When scheduled publishing, prototype health checks, email, or media processing is enabled, add an independent Render background worker running Payload's documented jobs runner.

Important distinction: a Payload schedule enqueues a task; a runner must still execute it. Define named queues and run an explicit command such as `pnpm payload jobs:run --cron "*/5 * * * *" --queue default --handle-schedules`. The worker image must contain the same Payload config/tasks and compatible secrets. Monitor queue age and failed jobs. Do not rely on an in-process `autoRun` loop once the web service scales beyond one instance.

## Email and account recovery

Configure an official Payload email adapter before production. The default recommendation is `@payloadcms/email-nodemailer` with an approved SMTP provider; `@payloadcms/email-resend` is an alternative if selected deliberately.

Required configuration includes a verified From address/name and provider credentials stored in Render. Use the adapter for Payload password reset/user verification and, if desired, a generic diagnostic-submission notification containing only the internal request ID—not the visitor's technical content.

Launch tests must cover delivery, expiration/one-time use of reset tokens, unknown-address behavior, spam placement, and provider failure. CMS owners need a documented recovery path that does not depend on an already logged-in admin.

## Seed and migration content

Create an idempotent development/staging seed that inserts:

- the three services;
- site settings and navigation;
- homepage skeleton;
- verified experience and evidence records from [03](./03-verified-content-and-ai-brief.md);
- three sample prototype records clearly marked as sample or draft;
- readiness copy and legal-page placeholders.

Production content import should preserve stable slugs and source URLs. Do not automatically publish claims placed on hold.

## Payload acceptance criteria

- an editor can create, preview, publish, unpublish, and archive a prototype without code changes;
- public APIs never expose drafts, diagnostic requests, internal notes, Render IDs, or user data;
- public Local API calls explicitly respect access control and use narrow field selection;
- all uploaded production media survives a web redeploy;
- a failed migration prevents release rather than serving code against the wrong schema;
- every published case-study claim has the required relationship label and evidence state;
- every conversion CTA resolves through an allowlisted Git-owned action ID and exact approved label/destination;
- generated TypeScript types are current and pass CI;
- `/admin` uses HTTPS, secure cookies, lockout, and least-privilege roles;
- password-reset email is configured and tested end to end.

## Official references

- [Payload MIT license](https://github.com/payloadcms/payload/blob/main/LICENSE.md)
- [Payload installation](https://payloadcms.com/docs/getting-started/installation)
- [Payload project and Admin overview](https://payloadcms.com/docs/admin/overview)
- [Local API access control](https://payloadcms.com/docs/local-api/access-control)
- [Draft access control](https://payloadcms.com/docs/versions/drafts)
- [Dependency/version troubleshooting](https://payloadcms.com/docs/troubleshooting/troubleshooting)
- [Postgres adapter](https://payloadcms.com/docs/database/postgres)
- [Database migrations](https://payloadcms.com/docs/database/migrations)
- [Uploads](https://payloadcms.com/docs/upload/overview)
- [Storage adapters and S3/R2 guidance](https://payloadcms.com/docs/upload/storage-adapters)
- [Jobs overview](https://payloadcms.com/docs/jobs-queue/overview)
- [Jobs queues and runners](https://payloadcms.com/docs/jobs-queue/queues)
- [Email adapters and account mail](https://payloadcms.com/docs/email/overview)
- [Production deployment](https://payloadcms.com/docs/production/deployment)
- [Building without a database connection](https://payloadcms.com/docs/production/building-without-a-db-connection)
