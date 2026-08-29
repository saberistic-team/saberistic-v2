# Payload content import and custom-domain authentication fix

## Outcome

This release makes the primary custom domain a fully authorized Payload admin origin and imports the first reviewed CMS content without publishing any prototype automatically.

The imported content is deliberately limited to the schema that exists today:

- the `site-settings` global;
- four verified GitHub `evidence-sources` records;
- four evidence-linked `prototypes` records saved as drafts.

Résumé experience, employer case studies, and service content are not forced into unrelated collections. They remain in the approved static site copy and the verified-content brief until dedicated Experience and Case Studies schemas are implemented.

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

## Live acceptance checklist

After the Render deploy:

1. Confirm the new migration completed once in the service logs.
2. Confirm `/api/ready` returns HTTP 200.
3. Confirm `saberistic.com` responses allow the custom origin and authenticated admin writes no longer produce form-state 401 errors.
4. Confirm Evidence Sources shows four records.
5. Confirm Prototypes shows four drafts and the public catalogue still contains no automatically published prototype.
6. Confirm Site Settings includes three social links and two organization `sameAs` links.
7. Confirm the existing administrator is unchanged.

## Next content-model phase

Implement dedicated Experience and Case Studies collections before importing the résumé career timeline or the Brave, BAXUS, Eternis, Fin, and Spiral Safe narratives into Payload. That phase should preserve the current provenance labels—prior employer role, founder venture, independent work, and sanitized diagnostic—and link every public claim to an evidence source. The résumé PDF itself should remain outside Media until an approved document-storage policy and object storage are available.
