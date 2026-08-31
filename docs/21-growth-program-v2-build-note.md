# Growth Program v2 Build Note 006

## Outcome

Saberistic now has a source-pinned Build Note for Growth Program: an issuer-controlled Solana
scorecard and credential primitive that was reviewed, locally contained, and redesigned as an undeployed v2
before a website and two deliberately different demonstrations were built around it.

The public route is:

`/build-notes/growth-program-v2-scorecards/`

The article is designed to make four systems impossible to confuse:

1. the legacy v1 program already present on mainnet and devnet;
2. the privacy-minimized snapshots and local containment work;
3. the implemented but undeployed Growth v2 replacement; and
4. the website's synthetic browser simulator versus its loopback-only real-validator lab.

Through the existing Git-authored Build Notes manifest, the note also enters the homepage journal,
Build Notes index, RSS feed, sitemap, article metadata, JSON-LD, Umami event allow-list, fixture
static export, and public route verifier. It does not require a Payload content change.

## Immutable source set

| Source         | Pinned commit                              | Role                                                                                                                        |
| -------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Growth Program | `d944ee75cbb06d6eabdbd7075a88a15bb15e5936` | Legacy audit, sanitized snapshots, v2 contract, website, browser simulator, loopback bridge, local-validator lab, and tests |

The canonical repository is
[saberistic-team/growth-program](https://github.com/saberistic-team/growth-program). All article
source links resolve against the pinned commit instead of the moving `main` branch.

The supplied shared ChatGPT conversation is supplementary session chronology. It can explain why
work happened and which failures redirected it, but it is not a substitute for immutable source,
sanitized artifacts, or independently rerun checks.

## Product contract

The most accurate product description is an **issuer-controlled scorecard and credential
primitive**. An organization defines a rubric, enrolls a subject, and publishes bounded aggregate
results that advance the subject through per-pillar thresholds. The chain records authority,
relationships, score bounds, rubric and period provenance, lifecycle state, and append-style
assessment history.

It is not a decentralized feedback network, anonymous review system, ranking protocol, evidence
oracle, or proof that an assessment is fair or true. Feedback collection, reviewer identity,
moderation, evidence validation, aggregation, eligibility, confidence, and ranking policy remain
off-chain product responsibilities.

## Legacy audit and containment

The original Anchor program used floating-point weights and aggregates and included SPL Token and
Metaplex interactions for a changing credential. Read-only evidence preserved in the repository
shows that its declared address exists under Solana's upgradeable loader on both mainnet and devnet,
with different deployed binaries and a shared single-key authority.

The review also found previously committed development credentials and live account state. The safe
response was therefore containment before feature work:

- remove signer material from the current tree and replace fixed test identities with ephemeral
  fixtures;
- preserve binaries, public IDLs, loader observations, account counts, address-set commitments,
  public balances, and metadata health in a checksummed snapshot;
- exclude raw score payloads, names, reviews, private keys, and signer secrets;
- document the provider, authority, custody, and Git-history actions that still require an
  authorized operator; and
- treat deletion from the current checkout as containment, not revocation or incident closure.

No Solana transaction, authority change, upgrade, deployment, fund transfer, IDL mutation, or
legacy-data publication was part of the website work.

## Growth v2 contract

Growth v2 is a standalone replacement rather than an in-place upgrade. It removes floating-point
state, token minting, Metaplex CPIs, and unchecked third-party dependencies. Its core model is:

| Account                  | Canonical relationship                   | Mutability                                                                |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------------------- |
| `Organization`           | immutable creator plus organization seed | authority, status, and active-rubric pointer only                         |
| `Rubric`                 | organization plus sequential version     | immutable after creation except one-time activation; immutable thereafter |
| `ScoreProfile`           | organization plus subject wallet         | lifecycle and current cached result                                       |
| `Assessment`             | score profile plus monotonic sequence    | immutable result record; status can become disputed or corrected          |
| `LegacyMigrationReceipt` | canonical legacy score                   | globally one-use, immutable provenance receipt                            |

Scores, coverage, weights, and thresholds use integers on a 0–10,000 scale. Positive weights must
sum to 10,000. A rubric may contain up to 16 unique pillars and eight increasing thresholds per
pillar. Weighted values are summed before one round-half-up operation.

Enrollment and rubric adoption require issuer and subject signatures. Normal periodic assessment
issuance is issuer-signed; it does not require a new subject signature for every period. A
correction creates a new co-signed assessment that supersedes the latest result instead of editing
history. Subjects can dispute or revoke, the issuer can administratively revoke, pause blocks new
issuance, and revocation and retirement are terminal.

## Migration boundary

The migration planner verifies the legacy owner, account discriminators, canonical organization and
score PDAs, stored authority, and subject identity. Growth v2 then records one continuity receipt
and a snapshot commitment.

It deliberately does **not** import legacy floating-point scores or claim that old assessments were
valid. The legacy program must move through observe, consent, parallel-read, cutover, and archival
phases; it must not be upgraded in place with the v2 binary.

## Website and browser-local demonstration

The website provides three synthetic product examples: Team Health, Project Maturity, and
Contributor Journey. Its `/explorer` route compares fixture profiles only within the same
issuer/rubric/version/period context.

The ordinary `/playground` route models the v2 contract in browser memory. A visitor can define a
rubric, enroll a synthetic subject, issue and correct assessments, exercise lifecycle controls, and
inspect modeled PDAs, account changes, events, and an unsigned future-devnet replay plan.

That hosted playground has no RPC client, wallet adapter, transaction signer, transaction-send
path, automatic persistence, remote storage, live-account ingestion, analytics, or feedback
publishing. Its only file output is an explicit, warned JSON download. The route-specific policy
uses `connect-src 'none'`.

The Growth website remains owner-only. Anonymous access returning an authorization response is an
access boundary, not a public prototype failure. Making it public later would not authorize wallet,
RPC, signing, live-account, feedback, or deployment capabilities.

## Local-validator browser lab

The separate `/playground/localnet` surface runs only on loopback. It connects the browser to a
loopback bridge holding disposable issuer and subject keys in memory, while an isolated resettable
validator executes the real v2 instructions.

The demonstrated flow is:

1. create an ephemeral browser session and fund a disposable local authority;
2. atomically create an organization, rubric, and activation;
3. co-sign subject enrollment;
4. submit bounded pillar aggregates as an issuer-signed assessment; and
5. inspect transaction signatures, owners, PDAs, decoded account fields, and evidence bytes.

The local UI allows one to six pillars. The six-pillar worst case produces a 1,167-byte atomic
transaction, below Solana's 1,232-byte packet boundary; seven would exceed it. This is a UI/demo
constraint around one atomic setup transaction, not the v2 protocol's general 16-pillar state
limit.

Growth v2's declared address is test-only and has no matching deployment key in the repository.
The validator genesis-loads the compiled binary. This proves execution against an isolated local
ledger; it is not a devnet or mainnet deployment and does not prove a normal deployment ceremony.

## Verification evidence

The evidence recorded for this note at the pinned commit produced:

| Check                                      | Result                                                    |
| ------------------------------------------ | --------------------------------------------------------- |
| Rust unit tests                            | 10 / 10 passed                                            |
| Isolated local lifecycle and planner suite | 12 / 12 passed                                            |
| Loopback bridge unit/boundary suite        | 4 / 4 passed                                              |
| Website fixture boundary                   | 1 / 1 passed                                              |
| Website simulator and boundary suite       | 14 / 14 passed                                            |
| Full browser-to-validator proof            | passed with confirmed transactions and account evidence   |
| Rust format and strict Clippy              | passed                                                    |
| TypeScript, website lint, and formatting   | passed                                                    |
| Anchor SBF build                           | passed                                                    |
| Website production build                   | passed with seven prerender results and six static routes |

The Rust, format, lint, type, bridge, fixture, simulator, SBF, and prerender checks were rerun from
the pinned source. A previously started local lab occupied the canonical ports, so the one-shot
runner correctly refused to replace it. Its health gate first matched the exact current binary,
IDL, loader identity, and run identity; the 12-case Anchor test glob and browser proof were then
rerun manually against that verified isolated stack. Those two results are current
verification-session evidence, not a fresh-start or deployment proof.

The resulting program binary is 511,336 bytes with SHA-256
`668da8ea743ca339e83019433904513ecfce3d722f8dc9c63d7a8aee5140639b`.

The committed newline-terminated IDL has SHA-256
`9e65824eb077b8e87921541426063baf0744f1eadc2de0245a024f6cbd414d0d`. The older
`0c25ec…` value in two status documents hashes the generated form before its final newline; the IDL
check canonicalizes that difference and confirms equivalent content.

Passing local tests and an SBF build are development evidence, not release provenance. There is no
completed reproducible-build ceremony, final program identity, multisig custody, independent
security audit, devnet soak, indexer validation, or mainnet release.

## Build Note implementation

The site integration consists of:

- a newest-first manifest record in `src/lib/build-notes.ts`;
- `src/content/build-notes/GrowthProgram.tsx` for the evidence-led article;
- `src/components/build-notes/GrowthProgramDiagrams.tsx` for four accessible semantic diagrams;
- a slug-to-component registration in the shared dynamic Build Note route;
- focused unit, browser, and static-export checks; and
- this implementation and release record.

The four diagrams cover containment order, the v2 account graph, assessment lifecycle, and the
hosted-versus-loopback demo boundary. They use semantic HTML/CSS inside the existing `DiagramFrame`
component, with visible captions, explicit accessible labels, and keyboard-scrollable wide frames.

The generic Build Note route supplies article Open Graph metadata, canonical URL, breadcrumb and
`BlogPosting` JSON-LD, publication dates, tags, source actions, contents navigation, Umami events,
RSS, and sitemap inclusion. No Growth-specific metadata branch or Payload migration is required.

## Production acceptance

Website commit `65ae864` passed CI run `33353599054` and CodeQL run `33353598490`, including root
and static-site types, lint, 164 passing tests with one intentional skip, the Payload production
build, and the reviewed fixture export. A focused Chromium run also passed the new route smoke and
hosted-versus-local-validator boundary checks.

The checks-gated Render release completed on 30 August 2026 EDT / 31 August UTC:

| Surface                | Deploy / evidence                   | Accepted result                                                                  |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| Payload service        | `dep-daaf7ls9v7es73eb9f5g`          | live at the website commit; public snapshot revision `2e8da5a6f350`              |
| Static Site            | `dep-daaf7ls9v7es73eb9fc0`          | live; generated 24 pages, six Build Notes, and five Payload prototype routes     |
| Growth article         | public custom-domain response       | HTTP/2 200; correct title, canonical, source pin, contents, and release boundary |
| Structured discovery   | page, homepage, index, RSS, sitemap | `BlogPosting`, breadcrumb, homepage/index card, feed item, and sitemap URL found |
| CDN and browser policy | response headers                    | cache HIT, five-minute shared cache, CSP restricted to same origin plus Umami    |

The accepted page includes the current `d944ee75…` source pin, the 88.50% / 91.50% session values,
the hosted `connect-src 'none'` excerpt, and the explicit statement that V2 is not deployed or
release-ready. Publication does not depend on the owner-only Growth companion website.

## Release gates that remain closed

- Revoke the exposed provider credential and complete legacy signer/program/IDL authority actions.
- Generate a final v2 program identity through an approved offline or hardware-backed ceremony.
- Assign a reviewed multisig upgrade authority.
- Execute adversarial migration, expiry, terminality, and event/indexer tests on an isolated
  validator.
- Produce identical verifiable builds with two independent operators and compare binary, IDL, and
  client hashes.
- Complete an independent security audit, deploy to a fresh devnet address, reconcile and soak the
  release, and only then consider enabling a separately labelled devnet explorer.

These gates are part of the Build Note's product truth. A polished website and complete local demo
do not turn the replacement contract into a production deployment.
