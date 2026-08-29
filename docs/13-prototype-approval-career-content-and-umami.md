# Prototype approval, career content, and Umami rollout

## Scope

This release turns the initial imported material into three operational parts of Saberistic V2:

1. reviewed prototype publication in Payload;
2. review-gated Experience and Case Studies collections seeded from verified public evidence and the supplied résumé research;
3. self-hosted Umami staging on Render with conditional, privacy-oriented tracker loading.

The release does not weaken any publication safeguard to make content appear complete. Broken launch URLs, unsupported metrics, ambiguous client relationships, and unreviewed claims remain drafts.

## Live prototype approval decisions

The prototype records were rechecked on 2026-08-29 before publication.

| Prototype        | Decision       | Evidence and reason                                                                                                                                 |
| ---------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| BackThen         | Published      | Registered app URL returned HTTP 200; launch approval, reviewer, approval date, availability check, and last verification were recorded in Payload. |
| Story Sprout Pay | Published      | Registered app URL returned HTTP 200; launch approval, reviewer, approval date, availability check, and last verification were recorded in Payload. |
| FrescoPay        | Draft retained | No verified GitHub homepage or deployment URL was available. A launch URL was not invented.                                                         |
| TadaDing         | Draft retained | The registered Render deployment returned HTTP 404. A broken demo was not marked launch-ready.                                                      |

The public `/prototypes` route consequently shows two launchable records. Publishing the other two requires a working canonical app URL followed by a fresh availability and safety review.

## Payload collections

### Experience

`experience` stores role and contribution timeline entries. Its key fields include:

- organization, reviewed role wording, optional verified dates, and display timeframe;
- a structured relationship label such as employment, team role, independent work, or open-source contribution;
- selected work, evidence sources, and claim-level review records;
- derived claim and permission status;
- About/homepage visibility and display order;
- an optional related Case Study;
- administrator publication approval, reviewer, approval date, and internal notes;
- Payload drafts and version history.

### Case Studies

`case-studies` stores long-form proof content. It includes:

- summary, body, organization, role, timeframe, situation, responsibility, decisions, and outcome;
- public labels that distinguish a true case study from an experience, contribution, or research profile;
- capabilities, technologies, SEO, feature ordering, evidence, and claim-level review;
- administrator publication approval and Payload drafts/version history.

The `case_study` label is deliberately restricted. Prior employment cannot be presented as a Saberistic client case study merely because work was performed there.

## Seeded career drafts

Migration `20260829_151905` creates the collections and idempotently seeds:

- 9 reviewed, public evidence-source records;
- 4 Case Study/experience-profile drafts;
- 4 linked Experience drafts;
- Brave, BAXUS, Eternis, and the independent `solana-secrets-engine` project.

The seed preserves editorial work: it creates only missing records and never overwrites an existing evidence decision, edited draft, or published record. All newly created career records start as drafts with `publicationApproval=not-reviewed`.

The schema migration is intentionally non-reversible. Its down path fails before any destructive statement can run because dropping the collection and version tables after editors begin work would destroy content history. Rollback requires a reviewed database backup or a forward repair migration.

The initial copy intentionally omits unverified dates, performance multipliers, transaction/customer metrics, the Vyrent/Walmart exit, unsupported Fin/GlueFi claims, detailed customer integrations, and a broader Spiral Safe relationship. These can be added only with claim-specific evidence and permission review.

## Publication gate

Only an administrator may publish Experience or Case Study content. Publication fails unless:

- the record is explicitly approved and has a reviewer and non-future approval date;
- every material statement is represented by a unique structured claim;
- the relationship field has an exact matching relationship claim;
- every claim is public, not held, allowed on each selected surface, and linked to evidence;
- every referenced source is verified, public, and approved for the selected surface;
- metrics have direct primary or first-party public evidence;
- a hidden Experience remains a draft;
- a `case_study` label represents a Saberistic engagement, sanitized diagnostic, or explicitly permitted contract.

Editors can prepare drafts but cannot change administrator approval fields or edit published proof records. A material edit to a previously reviewed draft automatically resets its approval, reviewer, and approval date unless an administrator explicitly reapproves the change in that same save. The same stale-approval protection now applies to prototypes.

Evidence is a durable publication dependency. A material source downgrade or change is blocked while any published Experience, Case Study, or prototype references it; linked draft approvals are invalidated automatically. Publication checks take shared PostgreSQL transaction advisory locks for every evidence ID, while evidence changes and deletion take the matching exclusive locks before checking references. IDs are acquired in deterministic order, and the operation fails closed if the request-scoped transaction cannot be used. This prevents a concurrent publication from racing an evidence downgrade. Deletion is blocked until every active reference is detached. Access-date and private internal-note maintenance remain review-neutral.

## Umami application integration

The frontend contains a fail-closed Umami integration for a later production launch. It renders the tracker only when all required configuration is valid:

- `UMAMI_SCRIPT_URL` must be HTTPS and cannot contain credentials, query parameters, a fragment, or a root-only path;
- `UMAMI_WEBSITE_ID` must be a UUID;
- `UMAMI_TRACK_DOMAINS` is normalized and defaults to `saberistic.com,www.saberistic.com`;
- invalid or incomplete configuration disables analytics instead of breaking the site.

The tracker loads after the page is interactive, honors Do Not Track, limits collection to the approved domains, excludes URL queries and fragments, and enables Umami's performance measurements. The Website ID is public; database, application, login, and 2FA secrets remain in Render.

No tracker variables or Website ID are declared for the live `saberistic.com` service. Production collection remains disabled until Umami has a dedicated analytics database, backup/retention procedures, privacy disclosure, and abuse monitoring. The shared Free database is not an acceptable ingestion target for public traffic.

## Zero-cost Render staging decision

Render allows only one Free PostgreSQL instance in the workspace, and Payload already uses it. Provisioning a separate Umami database would begin charges. Staging therefore uses:

- one additional Free Render web service, `saberistic-umami-staging`;
- the official Umami 3.3.1 image pinned by digest;
- a minimal bootstrap dependency manifest and committed integrity-pinned pnpm lockfile installed with `--frozen-lockfile`;
- a constant, non-elevated `saberistic_umami` PostgreSQL role with a Render-generated stable password and ten-connection limit;
- an `umami` schema created by the container bootstrap, revoked from `PUBLIC`, and granted to only that restricted role;
- a pre-mutation role-isolation audit that rejects memberships in either direction, cross-schema or global ownership, direct cross-schema/global ACLs, cross-schema default ACLs, and unexpected role settings while permitting clean restarts and the role-owned TOAST objects attached to `umami` tables;
- a root-only PID 1 bootstrap/signal supervisor that removes the owner URL and all bootstrap secrets from the UID-1001/GID-65533 Umami child environment;
- a migration preflight that locks Umami's fixed administrator row, renames it to `saberistic_admin`, and replaces/verifies its password from a Render-generated secret before the HTTP server binds;
- Render-generated application and 2FA seed secrets, with the required stable 64-hex 2FA key derived inside the wrapper; and
- check-gated automatic deploys limited by `buildFilter` to `ops/umami/**` changes.

No Payload migration creates or owns the analytics schema. The container bootstrap is self-sufficient, and both Prisma runtime URLs use the restricted credential with `schema=umami`. Umami's unchanged upstream startup command still performs its normal database check and migrations after the secure preflight.

This is a staging compromise, not the production target. The Umami child does not share Payload's owner credential, but both applications still share database compute, storage, connection capacity, expiry, backup policy, and failure domain. The Free database expires after 30 days unless upgraded and currently shows an expiry date of 2026-09-27. A spoofed or flooded public ingestion endpoint could consume its 1 GB storage or degrade Payload. Production must use a dedicated Umami database.

## Deployment and acceptance sequence

1. Run type checking, lint, unit tests, production build, and Blueprint validation.
2. Push the release so the existing web service runs migration `20260829_151905`.
3. Verify `/api/ready`, both new collections in Payload, and the 4+4 drafts. No Payload-owned `umami` schema is expected before the analytics service starts.
4. Sync the Blueprint only after its preview shows one Free web service and no paid database.
5. Verify the deploy generated all four stable secrets, completed the restricted-role/schema bootstrap and migrations, renamed/secured the fixed administrator, and serves `/api/heartbeat`.
6. Reveal `UMAMI_ADMIN_PASSWORD` for a supervised `saberistic_admin` login, enable and verify 2FA, and store the credential securely. Do not delete, disable, or demote the fixed bootstrap row; that intentionally makes future startup fail closed.
7. Verify `saberistic_umami` has no elevated flags, memberships, ownership, direct ACLs, or default ACLs outside its expected boundary; owns the Umami tables; and cannot read Payload tables in `public`. Confirm an unchanged restart succeeds and a deliberately contaminated disposable role fails before HTTP starts.
8. Leave the Saberistic Website record and tracker variables unset. Confirm the frontend emits no analytics and that Umami failure or cold start cannot block the website or a prototype launch.

## Verification commands

The release is accepted only after the repository's normal `pnpm verify` workflow passes. Focused tests cover:

- Experience/Case Study publication rules and derived review state;
- idempotent career seeding and preservation of published editorial content;
- Umami environment validation;
- restricted-role URL construction and rejection of unsafe schema identifiers;
- frozen bootstrap dependency installation plus fail-closed ownership, direct-ACL, default-ACL, membership, and role-setting audit coverage;
- bootstrap-secret removal, UID/GID boundaries, deterministic 2FA-key derivation, and pre-server administrator password rotation;
- absence of production tracker variables from the Blueprint.
