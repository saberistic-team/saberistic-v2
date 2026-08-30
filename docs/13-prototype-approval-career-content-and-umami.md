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

- 9 additional reviewed, public career evidence-source records, producing 13 total when combined with the 4 earlier prototype sources;
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

The frontend contains a fail-closed Umami integration. It renders the tracker only when all required configuration is valid:

- `UMAMI_SCRIPT_URL` must be HTTPS and cannot contain credentials, query parameters, a fragment, or a root-only path;
- `UMAMI_WEBSITE_ID` must be a UUID;
- `UMAMI_TRACK_DOMAINS` is normalized and defaults to `saberistic.com,www.saberistic.com`;
- invalid or incomplete configuration disables analytics instead of breaking the site.

The tracker loads after the page is interactive, honors Do Not Track, limits collection to the approved domains, excludes URL queries and fragments, and enables Umami's performance measurements. A privacy guard registered before tracker hydration constrains page paths, titles, origin-only referrers, performance fields, and custom events. The Website ID is public; database, application, login, and 2FA secrets remain in Render.

On 2026-08-30, the owner completed Umami login and 2FA setup and explicitly authorized temporary collection on the shared database despite the earlier production launch gate. The `Saberistic Production` record has public Website ID `8bdad921-34a9-43cb-bc70-9e1c71efa911`; the script URL is `https://umami.saberistic.com/script.js`, and the exact domain allowlist is `saberistic.com,www.saberistic.com`. This owner-approved exception does not make the shared database production-grade or remove the backup, retention, abuse-monitoring, expiry, and workload-isolation risks.

The implemented custom-event contract includes `primary_cta_clicked`, `service_viewed`, `prototype_card_clicked`, `prototype_view`, `prototype_launch`, `prototype_source_clicked`, and `readiness_started`. Exact runtime schemas accept only allowlisted enums and public-slug-shaped prototype values. There is no visitor identification or session replay, and the tracker does not receive readiness answers, free text, contact data, prompts/results, search/filter text, full URLs, or internal identifiers.

## Zero-cost Render staging decision

Render allows only one Free PostgreSQL instance in the workspace, and Payload already uses it. Provisioning a separate Umami database would begin charges. Staging therefore uses:

- one additional Free Render web service, `saberistic-umami-staging`;
- the official Umami 3.3.1 image pinned by digest;
- a minimal bootstrap dependency manifest and committed integrity-pinned pnpm lockfile installed with `--frozen-lockfile`;
- a constant, non-elevated `saberistic_umami` PostgreSQL role created once with a Render-generated stable password and ten-connection limit, then verified without any `ALTER ROLE` dependency;
- an `umami` schema created by the container bootstrap, revoked from `PUBLIC`, and granted to only that restricted role;
- a pre-mutation role-isolation audit that requires exact safe role flags, no expiry or role settings, and the existing generated credential; rejects privilege-bearing or unrelated memberships, cross-schema or global ownership, direct cross-schema/global ACLs, and cross-schema default ACLs; and permits clean restarts, the non-inheriting/non-settable automatic creator administration grant made only for a non-superuser PostgreSQL 18 `CREATEROLE` bootstrap account, and role-owned TOAST objects attached to `umami` tables;
- a root-only PID 1 bootstrap/signal supervisor that removes the owner URL and all bootstrap secrets from the UID-1001/GID-65533 Umami child environment;
- a migration preflight that locks Umami's fixed administrator row, renames it to `saberistic_admin`, and replaces/verifies its password from a Render-generated secret before the HTTP server binds;
- Render-generated application and 2FA seed secrets, with the required stable 64-hex 2FA key derived inside the wrapper; and
- check-gated automatic deploys limited by `buildFilter` to `ops/umami/**` changes.

No Payload migration creates or owns the analytics schema. The container bootstrap is self-sufficient, and both Prisma runtime URLs use the restricted credential with `schema=umami`; direct bootstrap clients use only a connection-local `search_path`. Umami's unchanged upstream startup command still performs its normal database check and migrations after the secure preflight.

This is a staging compromise, not the production target. The Umami child does not share Payload's owner credential, but both applications still share database compute, storage, connection capacity, expiry, backup policy, and failure domain. The Free database expires after 30 days unless upgraded and currently shows an expiry date of 2026-09-27. A spoofed or flooded public ingestion endpoint could consume its 1 GB storage or degrade Payload. Production must use a dedicated Umami database.

## Deployment and acceptance sequence

1. Run type checking, lint, unit tests, production build, and Blueprint validation.
2. Push the release so the existing web service runs migration `20260829_151905`.
3. Verify `/api/ready`, both new collections in Payload, and the 4+4 drafts. No Payload-owned `umami` schema is expected before the analytics service starts.
4. Sync the Blueprint only after its preview shows one Free web service and no paid database.
5. Verify the deploy generated all four stable secrets, completed the restricted-role/schema bootstrap and migrations, renamed/secured the fixed administrator, and serves `/api/heartbeat`.
6. Reveal `UMAMI_ADMIN_PASSWORD` for a supervised `saberistic_admin` login, enable and verify 2FA, and store the credential securely. Do not delete, disable, or demote the fixed bootstrap row; that intentionally makes future startup fail closed.
7. Verify `saberistic_umami` has exact safe flags, no expiry or role settings, no privilege-bearing memberships, and no ownership, direct ACLs, or default ACLs outside its expected boundary; owns the Umami tables; and cannot read Payload tables in `public`. If PostgreSQL's automatic creator membership is present, require `ADMIN=true`, `SET=false`, and `INHERIT=false`. Confirm an unchanged restart succeeds and credential drift or a deliberately contaminated disposable role fails before HTTP starts without altering the stored role password.
8. At the original staging checkpoint, leave the Saberistic Website record and tracker variables unset and confirm the frontend emits no analytics. The later owner-authorized activation is a separate release and must still prove that Umami failure or cold start cannot block the website or a prototype launch.

## Verification commands

The release is accepted only after the repository's normal `pnpm verify` workflow passes. Focused tests cover:

- Experience/Case Study publication rules and derived review state;
- idempotent career seeding and preservation of published editorial content;
- Umami environment validation;
- restricted-role URL construction and rejection of unsafe schema identifiers;
- frozen bootstrap dependency installation plus fail-closed exact-role, credential-reuse, ownership, direct-ACL, default-ACL, membership, and role-setting audit coverage without `ALTER ROLE`;
- bootstrap-secret removal, UID/GID boundaries, deterministic 2FA-key derivation, and pre-server administrator password rotation;
- fail-closed tracker environment validation, the exact owner-authorized Blueprint values, the runtime event contract, privacy guard, and no-op behavior when Umami is unavailable.

## Live staging result

The CMS release reached Render through migration `20260829_151905`. Payload now contains 13 evidence records, 4 Experience drafts, and 4 Case Study/experience-profile drafts. Every career record remains `not-reviewed`. BackThen and Story Sprout Pay are published; FrescoPay remains held without a verified canonical app URL, and TadaDing remains held because its registered deployment returns HTTP 404.

Umami was declared in commit `5df7d7237c2e9ad843d2b47a861734d77a802b74` as Free service `srv-da9gkrlg1s2s73acaau0`. Initial deploy `dep-da9gkrtg1s2s73acabr0` failed closed before HTTP because Render's managed PostgreSQL owner denied `ALTER ROLE`. Commit `59791ec6dc0a98bcc4cecae879943fcc881e1163` removed that dependency, and deploy `dep-da9gs43l550s739vpvj0` completed 24 upstream migrations and became live at <https://saberistic-umami-staging.onrender.com>.

Acceptance evidence includes:

- local `pnpm verify`: TypeScript, ESLint, 83 passing tests, one normal opt-in PostgreSQL integration skip, and a successful production build;
- a separately passing real-PostgreSQL evidence-lock race test and four Playwright browser checks;
- disposable PostgreSQL 18/Docker tests for fresh bootstrap, unchanged restart, the managed `ALTER ROLE` denial, wrong-credential failure without stored-password mutation, role-setting and cross-schema-ACL contamination, restricted-role denial on a `public` table, 24 migrations, and heartbeat HTTP 200;
- live heartbeat HTTP 200 and HTTP 401 for both known-default `admin` / `umami` and `saberistic_admin` / `umami` login attempts;
- live website readiness HTTP 200 and rendered homepage HTML with no Umami script or Website ID.

This accepted disposable staging only. On 2026-08-30, the owner subsequently completed supervised login and 2FA, created the public Website record, and authorized temporary tracker activation on the shared database. Render verified DNS and issued TLS for `umami.saberistic.com`; its custom-host heartbeat and tracker script both returned HTTP 200. Final website commit `57e1844f24bc0c39b8e7702514463745226cb0ff` reached live deploy `dep-da9sm8nlk1mc738c1mb0`. Five live Playwright checks passed, including the exact tracker controls, stripped query/fragment, HTTP 200 ingestion, allowlisted CTA event, public routes, health, and anonymous admin. Umami stored the acceptance pageview and events, and neither service emitted error-level logs in the release window. The shared Free database expires on 2026-09-27 and has no backup, automatic retention policy, or workload isolation. Dedicated analytics Postgres, retention automation, abuse monitoring, backup/restore, and upgrade acceptance remain required before this is described as production-grade analytics.

For a scheduled demo, `pnpm render:warm` wakes the website and Umami once. `pnpm render:demo` keeps both warm for a default 60-minute window, and `pnpm render:demo -- --minutes 90` selects another bounded window up to a hard 120-minute maximum. The helper is not a permanent anti-sleep daemon: Render Free services spin down after 15 idle minutes, the workspace has 750 shared Free instance hours per month, and two continuously awake services would require about 1,440 hours in a 30-day month.
