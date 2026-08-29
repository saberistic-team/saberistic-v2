# Payload content import and custom-domain authentication fix

## Outcome

This release makes the primary custom domain a fully authorized Payload admin origin and imports the first reviewed CMS content without publishing any prototype automatically.

The imported content is deliberately limited to the schema that exists today:

- the `site-settings` global;
- four verified GitHub `evidence-sources` records;
- four evidence-linked `prototypes` records saved as drafts.

Résumé experience, employer case studies, and service content were not forced into unrelated collections in this import. Dedicated Experience and Case Studies schemas were subsequently implemented in [13](./13-prototype-approval-career-content-and-umami.md), with review-gated drafts rather than automatic publication.

## Incident and root cause

The first administrator could open `/admin` and see the stored Administrator role, but collection writes failed. Render logs showed an authenticated form-state request returning HTTP 401 followed by the collection create returning HTTP 403.

This was not a role-assignment or password problem. Payload built both its CORS and CSRF allowlists from `SITE_URL || RENDER_EXTERNAL_URL`, while the Render service had no `SITE_URL` value. The running service therefore trusted only `https://saberistic-web-staging.onrender.com`. Requests made from `https://saberistic.com` carried a different `Origin`, so Payload correctly declined to use the authentication cookie for the write request.

The durable correction is:

1. Declare `SITE_URL=https://saberistic.com` as a non-secret Render environment value.
2. Keep `saberistic.com` as Payload's canonical `serverURL`.
3. Build the exact CORS and CSRF allowlists from both `SITE_URL` and Render's injected `RENDER_EXTERNAL_URL`.
4. Preserve the Render fallback domain for recovery and diagnostics without making it canonical.

Rotating `PAYLOAD_SECRET`, recreating the administrator, or repeatedly logging in would not have corrected the origin mismatch.

## One-time transactional import

The original Blueprint declared an `initialDeployHook` for the seed script. That hook is unsuitable for an already-created service and is not a dependable content-delivery mechanism for replacement services whose schema migration runs at container startup.

The release replaces that hook with a committed one-time Payload data migration. Render's existing Docker command already runs `payload migrate` before starting Next.js, so the content and the migration ledger are committed together. Every Payload Local API call receives the migration request object and therefore participates in the same database transaction.

The reusable seed implementation is side-effect free. The standalone `pnpm seed` wrapper still supports controlled local or operator use, but the migration imports only the prepared-content module. It never initializes a second Payload instance, exits the process, or creates an administrator.

The migration is state-idempotent as an additional safeguard:

- evidence is matched by repository URL;
- prototypes are matched by slug;
- an existing published prototype is never replaced;
- existing site copy is preserved;
- missing public profile links are filled without overwriting other settings;
- the migration explicitly disables public-concept mode.

The down migration is intentionally non-destructive. Once editorial records may have been reviewed or edited, rollback must use a forward corrective migration or the admin UI rather than deleting content automatically.

## Imported records

### Evidence sources

| Title                              | Repository                                            |
| ---------------------------------- | ----------------------------------------------------- |
| BackThen public repository         | `https://github.com/saberistic-team/back-then`        |
| FrescoPay public repository        | `https://github.com/saberistic-team/frescopay`        |
| TadaDing public repository         | `https://github.com/saberistic-team/tadading`         |
| Story Sprout Pay public repository | `https://github.com/saberistic-team/story-sprout-pay` |

Every record is first-party public evidence, limited to the Prototype hub surface, and includes a statement of what the repository does and does not prove.

### Prototype drafts

| Prototype        | Lifecycle | Public URL recorded                    | Launch state                    |
| ---------------- | --------- | -------------------------------------- | ------------------------------- |
| BackThen         | Prototype | `https://backthen-mu.vercel.app`       | Draft, unfeatured, not reviewed |
| FrescoPay        | Prototype | None                                   | Draft, unfeatured, not reviewed |
| TadaDing         | Alpha     | None                                   | Draft, unfeatured, not reviewed |
| Story Sprout Pay | Prototype | `https://story-sprout-pay.lovable.app` | Draft, unfeatured, not reviewed |

All four records use the `synthetic-only` data classification and retain explicit limitations, safety notices, source provenance, and launch-approval gates. A reachable URL is recorded as evidence of availability only; it is not presented as proof of production readiness.

### Site settings

The global includes the approved Saberistic name, prototype-to-production tagline, canonical origin, SEO description, safe default actions, legal footer, organization metadata, both GitHub profiles, and the supplied LinkedIn profile. Contact email, booking URL, legal name, and social image remain empty rather than being invented.

## Verification

Before deployment, the release passed:

- TypeScript, ESLint, 38 unit/integration tests, and the production Next.js build;
- focused stateful seed tests covering request propagation, idempotency, draft-only behavior, published-record preservation, evidence relationships, and non-destructive settings completion;
- a fresh PostgreSQL 18 migration run with four evidence records, four linked drafts, zero published prototypes, three social links, two organization `sameAs` links, and one migration-ledger entry;
- a second migration run that performed no work;
- the exact production Docker startup path against a separate disposable PostgreSQL 18 database;
- an HTTP 200 readiness response from the temporary production container.

The two disposable databases, temporary container, and temporary image were removed after validation. The existing development database volume was preserved and returned to its prior stopped state.

## Live acceptance record

The release completed live acceptance on **2026-08-29**:

1. Blueprint deploy `dep-da9f7qdg1s2s73a88tjg` applied `20260829_144500_seed_prepared_content` once. Checks-gated deploy `dep-da9f8jjji3us73ej6m1g` then read the migration directory and reported `Done.` without rerunning it.
2. `/api/ready` returned HTTP 200, and `/api/health` reported commit `bf7eae4ffc4c`.
3. Responses from `saberistic.com` allowed the exact custom origin with credentials. No HTTP 401 or 403 requests appeared after the final deploy during authenticated browser acceptance.
4. Evidence Sources showed exactly four verified records: BackThen, FrescoPay, TadaDing, and Story Sprout Pay.
5. Prototypes showed exactly four Draft records. Every record was unfeatured and Not reviewed, and the public catalogue retained its intentional empty state.
6. The public Site Settings API returned three social links and two organization `sameAs` links.
7. The owner-created account remained an Administrator; no account or password was created, edited, or rotated by the migration.

GitHub CI run [33259035170](https://github.com/saberistic-team/saberistic-v2/actions/runs/33259035170) and CodeQL run [33259035023](https://github.com/saberistic-team/saberistic-v2/actions/runs/33259035023) both passed for the deployed commit. Render recorded no error-level rollout messages. The only application warning was the already-documented absence of a production email adapter.

## Next content-model phase

The dedicated Experience and Case Studies collections are now implemented as documented in [13](./13-prototype-approval-career-content-and-umami.md). The first seed includes only evidence-bounded Brave, BAXUS, Eternis, and independent `solana-secrets-engine` drafts; Fin and the broader Spiral Safe narrative remain held. The résumé PDF itself remains outside Media until an approved document-storage policy and object storage are available.
