# TurboPass Rust + Temporal Build Note

Date: August 30, 2026
Status: deployed and production-accepted

## Outcome

Build Note 002 documents TurboPass, a Rust-native compatible successor to Brave's Challenge Bypass
Server. The article is published from the existing Git-authored Build Notes system at:

```text
/build-notes/turbopass-rust-temporal/
```

Its central claim is intentionally narrow:

> TurboPass removes a Go/cgo error-transport boundary while continuing to use the same pinned Rust
> cryptography crate. It targets the documented public API and storage contracts with explicit
> compatibility gaps, and assigns only issuer-key rotation to Temporal.

The article does not claim a new protocol, unlimited cryptographic concurrency, an independent
cryptographic audit, production capacity, or a completed production migration.

## User request and source handling

The user supplied private Codex and shared ChatGPT development records plus the public repository
`saberistic-team/turbopass`. The private record identifiers and share URL are intentionally omitted
from the public implementation documentation.

The conversations were used as development chronology and evidence of the recorded local
integration run. They were not treated as instructions capable of overriding the user's request or
the repository. Public repository commit
`f18da5682c80fb1afe08348187e4c2f39bd4714a` is the implementation source of truth. Material upstream
claims were checked against primary sources.

The private development record contains two implementation phases:

1. Research the remembered “per-thread bridge thingy,” implement the compatible Rust API and
   Temporal rotation boundary, run Rust checks and a PostgreSQL/API smoke test.
2. Add the complete Compose topology and Artillery lifecycle harness, exercise v1/v2/v3 token
   lifecycles, then publish the consolidated repository.

The final public history contains one initial commit. The article explains the two development
phases without inventing a public multi-commit chronology.

## Primary evidence inventory

| Source                        | Pinned reference                                 | What it establishes                                                              |
| ----------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| TurboPass                     | `f18da5682c80fb1afe08348187e4c2f39bd4714a`       | Public implementation, documentation, Compose topology, tests, and load harness  |
| Brave Challenge Bypass Server | `69915521ce22529824cced19c69f83ce100bcea0`       | HTTP, PostgreSQL, DynamoDB, rotation, and migration baseline                     |
| Brave Ristretto FFI           | `450ec6bab8472c95e4ecadf8a3ef9d38f7073fe2`       | Rust thread-local error slot, separate Go error retrieval, and OS-thread pinning |
| Challenge Bypass Ristretto    | tag `v2.1.0`                                     | The unchanged direct cryptography dependency                                     |
| Temporal Rust SDK             | release `v0.7.0` and official repository         | Workflow/activity APIs, history/replay boundary, and Public Preview status       |
| AWS DynamoDB                  | official `PutItem` and condition-expression docs | Single-winner marker insertion while the exact key remains present               |
| IETF/RFC Editor               | RFC 9497 and RFC 9578                            | Standards context and why a transparent protocol migration would be incorrect    |

The Build Note links pinned code for repository claims and official documentation for service and
standards behavior. Current statements such as SDK maturity were rechecked on August 30, 2026.

## Technical finding: the bridge constraint

The legacy FFI package—not the pure Rust protocol crate—stores the latest Rust error in a
`thread_local! LAST_ERROR` slot. On a sentinel failure, an exported Go crypto wrapper:

1. locks the goroutine to its current operating-system thread;
2. calls the Rust export through the C ABI;
3. makes a separate C call that reads and clears the stored error; and
4. unlocks the thread.

The lock is necessary because a Go goroutine can otherwise resume on a different operating-system
thread between the cryptographic call and error retrieval. The pinned wrapper contains 38
lock/unlock pairs across 38 exported Go crypto wrapper operations.

This is a per-operation FFI/error-channel constraint. It does not establish that Ristretto objects
are intrinsically thread-bound, that the cryptographic algorithm requires one thread, or that all
calls are globally serialized.

TurboPass depends directly on:

```toml
challenge-bypass-ristretto = { version = "=2.1.0", features = ["base64"] }
```

Rust `Result` values carry errors directly. The service path removes cgo, the C ABI, opaque FFI
objects/finalizers, the thread-local error shuttle, and per-operation OS-thread pinning. Curve work
remains synchronous and CPU-heavy, so the API deliberately uses Tokio's blocking pool and a
process-wide concurrency semaphore. “Bridge removed” must never be shortened to “no limits.”

## Token lifecycle

The article directly answers the user's follow-up question about issuance and redemption:

1. The client creates and blinds tokens locally.
2. One synchronous issuance request sends a batch of blinded tokens.
3. TurboPass returns signed tokens, the public key, and the batch proof in that response.
4. The client verifies the proof, unblinds, and prepares redemption locally.
5. The client sends one synchronous redemption request per token.

There is no polling ID and no Temporal workflow in the public request path. A batch of 32 tokens is
one issuance call followed by 32 redemption calls.

| Version | Create issuer     | Issue                          | Redeem                                    | Replay state |
| ------- | ----------------- | ------------------------------ | ----------------------------------------- | ------------ |
| v1      | `POST /v1/issuer` | `POST /v1/blindedToken/{type}` | `POST /v1/blindedToken/{type}/redemption` | PostgreSQL   |
| v2      | `POST /v2/issuer` | `POST /v2/blindedToken/{type}` | compatible v1 redemption path             | DynamoDB     |
| v3      | `POST /v3/issuer` | compatible v2 issuance path    | `POST /v3/blindedToken/{type}/redemption` | DynamoDB     |

v1/v2 duplicate redemption returns 409. For v3, the same token/payload binding is idempotent and
returns 200, while reuse against a different payload returns 409.

## Storage compatibility

Repository archaeology corrected the initial “same DynamoDB database” shorthand:

- PostgreSQL owns issuer configuration, signing keys, and v1 redemptions.
- DynamoDB stores v2/v3 replay markers in a configured primary table with an optional legacy-table
  read fallback.

TurboPass keeps the SQL table names, DynamoDB partition key and attribute names, UUID v5 derivation,
empty-payload NULL behavior, numeric `TTL`, and conditional insertion semantics.

Within one table and Region, conditional `PutItem(attribute_not_exists(id))` is an atomic
single-winner gate for that exact key while the item exists; it is not a general exactly-once
guarantee. DynamoDB TTL deletion is asynchronous, so an expired record can remain redeemed until the
sweeper removes it—and after physical deletion the same key can be accepted again. For an issuer
without an expiry, the compatible fallback marker lifetime is six calendar months, so token/key
acceptance must end sooner or retention must change. The runtime writes `TTL` but does not configure
production tables. The local initializer attempts to enable TTL and tolerates failure. Operators
must verify the setting and retention invariant; Global Table behavior would need separate review.

Normal lookups are eventually consistent. Reads prefer a configured primary table and fall back to
the legacy table after a miss. The special pre-write coexistence check uses strongly consistent
reads, but its legacy read and primary conditional write still cannot be one atomic operation across
two tables. A legacy write can land after the pre-read. Cutover must fence and drain legacy writers,
verify every writer targets the primary table, and only then enable TurboPass writes.

## Temporal boundary

One Rust codebase produces three runtime processes:

| Process              | Responsibility                                    | State boundary        |
| -------------------- | ------------------------------------------------- | --------------------- |
| `turbopass-api`      | Compatible HTTP, metrics, and native cryptography | PostgreSQL + DynamoDB |
| `turbopass-worker`   | Rotation workflow and coarse activity             | Temporal + PostgreSQL |
| `turbopass-schedule` | One-shot Schedule reconciliation                  | Temporal              |

The v3 horizon Schedule runs every minute. Legacy v1/v2 rotation and v3 pruning run hourly. Both use
overlap policy `Skip`: an overlapping tick is discarded rather than queued, and recovery relies on
a later horizon-reconciliation run. The catch-up window is one interval and failures do not pause
future runs, so outages are not an unlimited backlog. Schedule creation followed by update is two
RPCs; it is not an atomic concurrent-installer guarantee in SDK 0.7.0.

The workflow handles deterministic orchestration only. Database calls, activity wall-clock reads,
OS randomness, key generation, and writes remain in the activity. Each issuer uses a separate
PostgreSQL transaction and row lock. The activity re-reads and recomputes the missing horizon inside
that transaction, making each issuer transaction safe under at-least-once retries:

- for the same effective cutoff and unchanged issuer state, a committed issuer transaction is
  normally a no-op; otherwise the retry safely recomputes and fills only the newly missing horizon;
- that issuer's uncommitted inserts roll back;
- an Activity attempt can commit earlier issuers before a later retryable error, so final-attempt
  counters can omit work committed during an earlier attempt; and
- a poisoned issuer does not roll back healthy work or pruning, but the final sweep returns a
  non-retryable Activity error, so the Workflow fails and returns no report.

Workflow history receives only versioned secret-free input, aggregate counts, and sanitized
failures. Signing keys persist in PostgreSQL and enter API or worker process memory; they never enter
workflow input, output, memo, search attributes, or history.

## Complete local integration and load harness

`compose.yaml` defines nine services: PostgreSQL, DynamoDB Local, DynamoDB initialization, Temporal
development server, API, worker, one-shot scheduler, test-only Rust load client, and Artillery. The
last two are enabled through the load-test profile.

Artillery drives the public HTTP routes. A Rust helper performs token preparation, proof
verification, unblinding, and redemption-material derivation through the pinned upstream crate. It
returns one-use opaque handles and keeps original token/blinding secrets in memory. Compose
publishes it to the host only on `127.0.0.1`, and Artillery reaches it on the private Compose network.
The helper must never be exposed as a public service.

The development conversation records:

- all core containers becoming healthy;
- both Temporal Schedules being reconciled;
- workflow and activity pollers running;
- v1/v2/v3 lifecycle smoke scenarios completing with zero failed virtual users;
- a three-token batch using RFC 9497 HashToGroup/finalization redemption derivation issuing and
  redeeming all tokens inside the legacy JSON/base64 API;
- PostgreSQL receiving v1 redemption state;
- DynamoDB receiving v2/v3 redemption state; and
- 56 Rust tests passing.

No service log or load report is committed. These are session-recorded functional results, not
independently reproducible evidence at the public SHA and not a capacity, throughput, latency, or
scalability claim.

## Article structure and visual treatment

The article contains 16 semantic sections, 15 linked from its table of contents: rebuild brief,
repository archaeology, FFI bridge, native Rust boundary, token lifecycle, compatibility contract,
storage split, Temporal boundary, retry-safe rotation, complete local stack, lifecycle load testing,
verified result, production gates, file guide, next proof, and primary sources.

Four inline React-owned SVGs explain:

1. the legacy Go/cgo/two-call error bridge versus direct Rust `Result`;
2. local blinding, synchronous batch issuance, local unblinding, and per-token redemption;
3. secret-free Temporal history versus the activity/database secret boundary; and
4. the disposable Compose topology.

Every SVG has a unique title and description connected through `aria-labelledby`, visible labels,
an adjacent prose caption, a responsive `viewBox`, and no color-only meaning. Code remains escaped
plain text in labeled, focusable, horizontally scrollable regions.

## Build Notes framework extension

The second article exposed page chrome that was hard-coded to the first article. `BuildNote`
manifest entries now own:

- ordered section IDs and labels;
- footer heading and summary; and
- repository display label.

The article renderer map is exhaustive against the manifest's literal slug union. Adding a manifest
entry without a typed content component is now a TypeScript error. The static wrapper continues to
enumerate every manifest slug and sets `dynamicParams = false`.

No Payload schema, snapshot version, analytics event name, or rendering dependency changed.
Homepage discovery, index order, RSS, sitemap, static generation, structured data, and strict Umami
slug validation all derive from the same manifest entry.

## SEO, discovery, and privacy

The new article receives the existing Build Notes contract:

- canonical `https://saberistic.com/build-notes/turbopass-rust-temporal/`;
- Open Graph article dates and tags;
- Twitter summary metadata;
- `BlogPosting` and `BreadcrumbList` JSON-LD;
- visible `<time datetime>` publication evidence;
- sitemap and RSS entries; and
- homepage/index card discovery.

The search title is 57 characters including the Saberistic suffix. The summary is below the 200
character limit.

Analytics continues to emit only the existing events and fields:

| Event                       | Allowed data                                |
| --------------------------- | ------------------------------------------- |
| `build_note_card_clicked`   | manifest slug + `home` or `index` placement |
| `build_note_view`           | manifest slug                               |
| `build_note_source_clicked` | manifest slug                               |

The new slug is accepted because it is in the published manifest. Unknown, nested, draft, or
malformed note paths and event values remain rejected. Article text, code, section IDs, source URLs,
query strings, and token terminology never enter analytics data.

## Production gates represented in the article

1. Temporal Rust SDK 0.7.0 is Public Preview; exact pins, history replay, workflow versioning, and a
   separately canaried worker are required.
2. Local Temporal/DynamoDB integration does not replace production-shaped service, credential,
   quota, latency, and failure testing.
3. The SQL migration creates final tables when absent but does not backfill older issuer tables,
   alter an incompatible same-named shape, or validate columns, indexes, and types. Audit the exact
   baseline, confirm any backfill, and rehearse privileged DDL before API → worker → schedules.
4. Legacy/primary DynamoDB coexistence requires fencing and draining legacy writers, verifying the
   primary writer set, and verifying the TTL/acceptance invariant before TurboPass writes.
5. Kafka/Avro remains out of scope until registry and real-message evidence resolves a schema/model
   name contradiction.
6. Go's permissive JSON decoder and Serde differ for case-insensitive/duplicate known fields.
7. Synchronous curve work cannot be cancelled after request timeout; its concurrency permit remains
   held until completion.
8. Selected vectors and compatibility tests provide preservation evidence, not Go-versus-Rust
   differential proof or an independent cryptographic audit.
9. A load harness without committed production-shaped reports supports no capacity claim.
10. TurboPass does not reproduce every legacy database/crypto histogram or operation counter;
    dashboards and alerts need an explicit metric migration.

## Implementation files

```text
src/lib/build-notes.ts
src/app/(frontend)/build-notes/[slug]/page.tsx
src/content/build-notes/TurboPass.tsx
src/components/build-notes/TurboPassDiagrams.tsx
tests/unit/build-notes.test.tsx
tests/unit/analytics-privacy.test.ts
tests/e2e/frontend.e2e.spec.ts
vitest.config.mts
docs/17-turbopass-rust-temporal-build-note.md
docs/README.md
```

The existing feed, sitemap, homepage, cards, export verifier, analytics guard, and static route
wrapper require no note-specific branch because they consume the manifest.

Targeted verification exposed that the existing Vitest include pattern matched `.test.ts` but not
the already-committed Build Notes `.test.tsx` file. The pattern now explicitly includes both
extensions, so article rendering and SVG accessibility assertions are part of the normal suite
instead of dormant code.

## Verification contract

Before deployment:

1. independently clone the public TurboPass commit;
2. pass its locked all-feature Rust tests, formatting, and strict Clippy;
3. pass Saberistic root/static type checks, ESLint, and all tests;
4. build the fixture Static Site and verify both article routes, RSS, sitemap, metadata, JSON-LD,
   and generated files;
5. build once against the live Payload snapshot rather than fixture fallback;
6. visually inspect desktop and phone widths, including diagrams, long code, tables, navigation,
   and document overflow;
7. run Lighthouse with mobile and desktop profiles;
8. push only after local verification;
9. require GitHub CI and CodeQL before Render deploys; and
10. verify the live article, index order, RSS, sitemap, metadata, analytics, unknown-slug 404,
    console, responsive layout, and production Lighthouse.

### Independent TurboPass verification — August 30, 2026

The public repository was cloned at commit `f18da5682c80fb1afe08348187e4c2f39bd4714a`.

- `cargo test --all-features --locked` passed 56 tests: 49 library, three load-client, two schedule,
  and two worker tests.
- `cargo fmt --all -- --check` passed.
- `cargo check --all-targets --all-features --locked` and the no-default-features check passed.
- `cargo clippy --all-targets --all-features --locked -- -D warnings` passed.
- `cargo test --no-default-features --locked` passed 39 tests.
- `docker compose config --quiet` passed.
- Hosted CI run `33315724086` and CodeQL setup run `33315725207` succeeded on the same SHA.

### Saberistic pre-deployment verification — August 30, 2026

The complete `pnpm verify` release pipeline passed after the article and framework extension:

- root and Static Site TypeScript checks;
- ESLint without warnings;
- 153 tests passing with one intentional skip across 19 passing and one skipped test file;
- the Payload production build; and
- a 17-page fixture Static Site export whose verifier found two Build Notes and two prototype routes.

The Vitest count now includes the Build Notes `.test.tsx` rendering suite; the old include pattern
silently matched only `.test.ts`. The corrected suite asserts both article manifests, code labels,
four accessible diagrams per article, explicit limitations, RSS coverage, and the new analytics
slug.

A separate remote-mode build woke the sleeping Payload service, fetched live public content
revision `5cd17cdaa03c`, exported the same 17 routes, and passed the static verifier. It did not use
fixture or empty fallback content.

Browser QA of the rebuilt article found:

- one `h1`;
- 16 article sections, 15 linked from the contents navigation;
- 13 labeled code blocks with focusable horizontal scroll regions;
- four accessible SVG diagrams;
- exact canonical, Open Graph article type, and `BlogPosting` structured data;
- the TurboPass card first on the Build Notes index;
- exact RSS autodiscovery;
- no browser warnings or errors; and
- zero document-level horizontal overflow at desktop and 390-pixel phone width.

At phone width, the header is normal document flow, the navigation remains two balanced rows, all
13 wide code regions scroll inside their own boxes, and the page width remains exactly 390 pixels.
The source label was made non-wrapping so its arrow no longer becomes an isolated third line.

Local Lighthouse results were:

| Profile | Performance | Accessibility | Best practices | SEO |   FCP |   LCP |   TBT | CLS |
| ------- | ----------: | ------------: | -------------: | --: | ----: | ----: | ----: | --: |
| Mobile  |          82 |           100 |            100 | 100 | 1.7 s | 4.8 s | 20 ms |   0 |
| Desktop |          99 |           100 |            100 | 100 | 0.4 s | 0.9 s |  0 ms |   0 |

The local mobile performance score is not the production acceptance number. The temporary Python
server uses HTTP/1.0 and supplies neither Render's CDN compression nor its immutable asset cache
headers; Lighthouse attributed large savings to document compression/cache lifetime and unused
shared application bundles. Production CDN Lighthouse is the release measurement. Accessibility,
best-practice, SEO, and zero-CLS gates already pass independently of that serving difference.

### Production acceptance — August 30, 2026

Website commit `9c5b9422c104ad64fddbd6a8a591ba6373e1c2d6` passed GitHub CI run
`33317833760` and CodeQL run `33317833377`. Render then released checks-gated Static Site deploy
`dep-daa45tmq1p3s738uc500`, which became live at `2026-08-30T14:50:15.700899Z`.

| URL                                                           | Result                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| `https://saberistic.com/build-notes/`                         | `200` HTML; TurboPass appears before Harness from Scratch    |
| `https://saberistic.com/build-notes/turbopass-rust-temporal/` | `200` article HTML                                           |
| `https://saberistic.com/build-notes/feed.xml`                 | `200 application/xml`; both notes appear newest first        |
| `https://saberistic.com/sitemap.xml`                          | `200 application/xml`; index and both article routes present |
| `https://saberistic.com/build-notes/not-a-real-note/`         | real `404` HTML                                              |

Live browser acceptance confirmed the exact canonical, Open Graph `article` type, `BlogPosting`
structured data, one `h1`, 16 article sections, 13 labeled code regions, four accessible diagrams,
the verified TurboPass commit, and the public/session evidence distinction. Desktop and 390-pixel
phone widths both had zero document overflow; every wide code region scrolls internally, and the
phone header remains in normal document flow. No browser warning or error was recorded.

Umami loads from `https://umami.saberistic.com/script.js` with website ID
`8bdad921-34a9-43cb-bc70-9e1c71efa911`, the apex/`www` domain allowlist, and
`saberisticUmamiBeforeSend` privacy guard.

Three independent production mobile Lighthouse runs scored 100, 100, and 90 for performance. The
median score and median individual timing measurements are recorded rather than selecting the
fastest trace:

| Profile       | Performance | Accessibility | Best practices | SEO |    FCP |    LCP | Speed Index |  TBT | CLS |
| ------------- | ----------: | ------------: | -------------: | --: | -----: | -----: | ----------: | ---: | --: |
| Mobile median |         100 |           100 |            100 | 100 | 1.23 s | 1.42 s |      1.23 s | 8 ms |   0 |
| Desktop       |         100 |           100 |            100 | 100 | 0.34 s | 0.47 s |      0.34 s | 0 ms |   0 |

The slower mobile trace retained 100 accessibility, best-practice, and SEO scores and CLS 0. The
median therefore reflects run-to-run variability without discarding the outlier or making a change
based on the fastest result.

## Deployment and rollback

The note ships through Render Static Site `srv-da9tdgu7bikc73esbqvg`. The site remains an atomic
static artifact on Render's CDN; Payload cold starts cannot make a published note unavailable. A
failed build leaves the previous live artifact in place.

Rollout sequence:

1. complete local verification and visual QA;
2. commit and push the website repository;
3. wait for GitHub CI and CodeQL;
4. allow the checks-gated Render deployment;
5. verify production; and
6. record the accepted commit, workflow runs, Render deploy, live measurements, and residual issues
   in this document.

Rollback is a revert of the website commit followed by the normal checks-gated static deployment.
No Payload migration, database rollback, or content reconstruction is required.

## Primary links

- TurboPass: `https://github.com/saberistic-team/turbopass/tree/f18da5682c80fb1afe08348187e4c2f39bd4714a`
- Challenge Bypass Server: `https://github.com/brave-intl/challenge-bypass-server/tree/69915521ce22529824cced19c69f83ce100bcea0`
- Ristretto FFI: `https://github.com/brave-intl/challenge-bypass-ristretto-ffi/tree/450ec6bab8472c95e4ecadf8a3ef9d38f7073fe2`
- Ristretto 2.1.0: `https://github.com/brave-intl/challenge-bypass-ristretto/tree/v2.1.0`
- Temporal Rust SDK: `https://github.com/temporalio/sdk-rust`
- Temporal Schedules: `https://docs.temporal.io/schedule`
- DynamoDB PutItem: `https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html`
- RFC 9497: `https://www.rfc-editor.org/rfc/rfc9497.html`
- RFC 9578: `https://www.rfc-editor.org/rfc/rfc9578.html`
- Batched-token Internet-Draft:
  `https://datatracker.ietf.org/doc/draft-ietf-privacypass-batched-tokens/`
