# Growth Program sensor receipts and experimental devnet build note

## Purpose

Build Note 010 documents the next public Growth Program boundary after the local-validator article:

- the scorecard primitive was applied to sensor-backed physical-asset custody;
- Growth v2 received a real experimental Solana devnet program identity;
- the executable and published Anchor IDL were recorded and rechecked during the publication audit;
  and
- the hosted product surface remained disconnected from devnet while production gates stayed open.

This is a sequel to [21](./21-growth-program-v2-build-note.md), not a replacement. Build Note 006
remains historically correct at `d944ee7`, where v2 was implemented and locally validated but not
deployed. Build Note 010 pins the later evidence commit `3497678`.

## Source authority

| Source                       | Pin or identity                                | What it supports                                                              |
| ---------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| Growth Program repository    | `3497678cee2271c84172c41c62788806373bea4c`     | Current source, IDL, use cases, tests, deployment manifest, and release gates |
| Previous repository boundary | `d944ee75cbb06d6eabdbd7075a88a15bb15e5936`     | Local-validator baseline and exact comparison boundary                        |
| Solana devnet program        | `DA9eu83HutyKB75K7gcPvAGTMH53HmcXN5Kg9Km8DAVE` | Current executable account and ProgramData pointer                            |
| ProgramData                  | `AHUsoqpv7EPyTErV539kvUb9q9MS9ywuiu6aYFzCrD3i` | Deploy slot and current upgrade authority                                     |
| Anchor IDL account           | `Da3msDhRT1ZHTEcG7HZMy1bhR8VN7ARWDKtWY9dfbJvt` | Published program interface                                                   |
| Development conversation     | Reviewed, not linked from the public article   | Intent, chronology, and operator-session context only                         |

The shared conversation is supplementary. Public implementation and deployment claims come from
the exact repository pin, the immutable deployment manifest, or fresh read-only chain checks. The
user-reported faucet balance and private deliberation are not published as protocol evidence.

## Exact repository delta

The new Growth revision is the direct child of the prior Build Note pin:

```text
d944ee75cbb06d6eabdbd7075a88a15bb15e5936
  ↓
3497678cee2271c84172c41c62788806373bea4c

30 files changed
718 insertions
116 deletions
```

The contract-logic delta is only the declared program identity. The account model, fixed-point
scoring, consent, correction, migration, and lifecycle design were already present at `d944ee7`.
The substantive additions are deployment evidence and the expanded use-case/product surface.

## Editorial model

The article follows three linked claims:

1. **The primitive travels.** A bounded score vector becomes meaningful only with an issuer,
   immutable rubric version, evidence policy, and assessment period.
2. **Sensor evidence has an off-chain trust boundary.** In the proposed architecture, sensors and
   inspections feed a governed adapter; the program receives signed aggregates and one commitment,
   not raw telemetry. The pinned repository does not yet implement or test that adapter.
3. **Deployment is narrower than release approval.** The program and IDL are inspectable on devnet,
   while custody, independent reproduction, external audit, adversarial testing, indexer
   reconciliation, soak, and public-client gates remain open.

The article does not repeat the full v2 contract archaeology from Build Note 006. It links the prior
note for the account/lifecycle deep dive and concentrates on the new evidence boundary.

## Use-case expansion

The Growth website now presents 27 concepts:

- three original templates: team health, project maturity, and contributor journey;
- six detailed sensor-backed scenarios:
  - medicine cold-room custody;
  - museum and archive preservation;
  - grain silo stewardship;
  - underground tank integrity;
  - battery storage safety; and
  - refrigerated food transport; and
- 18 adjacent hypotheses covering grant cohorts, vendor qualification, learning cohorts, indoor
  air, seed banks, concrete curing, transit assets, art logistics, water storage, renewable fleets,
  rental equipment, restoration nurseries, critical spares, materials custody, and loss prevention.

Eight primary public-sector or standards-practice sources anchor the operational signals. The
article states that those sources do not endorse Growth and that a synthetic receipt is not a
regulatory certification.

## Sensor trust boundary

The architecture is deliberately explicit:

```text
Sensors and inspections
        ↓
Proposed off-chain adapter would validate provenance,
calibration, gaps, signatures, and policy
        ↓
Accountable issuer applies one rubric version
        ↓
Growth v2 stores bounded aggregates,
period, rubric version, and evidence commitment
```

Raw telemetry remains off chain. A salted commitment to a canonical evidence envelope can detect
later change when evidence is disclosed. It cannot prove that a sensor was calibrated, physically
secure, complete, or truthful, and it cannot prove that an issuer applied a fair policy.

The commitment follows the repository's security guidance: a protocol-specific domain, explicit
delimiters, and a private random salt of at least 128 bits precede the canonical payload. Authorized
verification requires controlled disclosure of both the payload and salt. A physical asset also
needs an associated controller wallet, including custody, recovery, and rotation policy, because
the on-chain subject is a public key and subject lifecycle actions require its signature.

The synthetic cold-room example preserves its exact published values:

- 43,200 expected samples;
- 99.8% valid coverage;
- two excursions totaling 11 minutes;
- four-minute median response;
- five weighted pillars; and
- 96.1 weighted result under `COLD-CUSTODY/v3`.

## Devnet evidence

The dated repository manifest records:

| Fact                        | Value                                                              |
| --------------------------- | ------------------------------------------------------------------ |
| Status                      | `experimental-not-release-approved`                                |
| Program                     | `DA9eu83HutyKB75K7gcPvAGTMH53HmcXN5Kg9Km8DAVE`                     |
| ProgramData                 | `AHUsoqpv7EPyTErV539kvUb9q9MS9ywuiu6aYFzCrD3i`                     |
| Upgrade and IDL authority   | `7NrJdHqZY8KETyA46BBrngExHjFF4GPxboUskbGTz9P8`                     |
| Deployment slot             | `491039186`                                                        |
| Deployment time             | `2026-08-31T17:16:54Z`                                             |
| Executable size             | 511,312 bytes                                                      |
| Executable SHA-256          | `c2fbee57bbfe9481e9c4348e0b88bc24c5dee51f3dd206c844b9bd8485029ff6` |
| IDL account                 | `Da3msDhRT1ZHTEcG7HZMy1bhR8VN7ARWDKtWY9dfbJvt`                     |
| Canonical IDL SHA-256       | `c1b29996021bebd745cddeb32916d8297f80d1028df8afe7fd0d27b9bab48929` |
| Stable semantic IDL SHA-256 | `e67007882e851569801710737f2f84e1e0ea48d64192627ad095a8a510b599ce` |

Fresh finalized RPC checks during the article audit confirmed that:

- the deployment transaction succeeded;
- the program remains executable and owned by the upgradeable loader;
- its ProgramData pointer, last-deploy slot, and authority match the manifest;
- the 511,312 executable bytes hash to the committed SHA-256;
- the IDL account is owned by the Growth program and semantically matches the committed IDL; and
- no Organization, Rubric, ScoreProfile, Assessment, or LegacyMigrationReceipt state exists on
  devnet yet; the IDL is the only program-owned account found by the finalized census.

The last fact prevents the article from implying that the use-case examples or hosted playground
have created live devnet business state.

## Reproducibility wording

The program dump and built artifact are byte-identical. Two verifiable builds in the pinned Anchor
environment are also byte-identical. Those facts are intentionally not described as an independent
reproducible release because:

- both builds were performed by the same operator;
- the build worktree was dirty;
- the recorded base commit was `d944ee7`; and
- the deployment and IDL writes preceded the signed `3497678` evidence commit.

The correct phrase is **two byte-identical same-operator verifiable builds**. The next gate is a
second operator reproducing the deployed bytes from a clean, signed source pin.

## Article and diagram implementation

The implementation adds:

- `src/content/build-notes/GrowthProgramDevnet.tsx` — 17-section article;
- `src/components/build-notes/GrowthProgramDevnetDiagrams.tsx` — four accessible diagrams;
- a newest-first manifest entry in `src/lib/build-notes.ts`;
- the article route mapping in the shared dynamic page;
- shared responsive styling;
- unit, browser, and static-export acceptance assertions; and
- this durable implementation and pending release record.

The four diagrams explain:

1. one receipt shape across teams, projects, contributors, and asset custody;
2. the observe → validate → grade → commit sensor boundary;
3. candidate source → same-operator builds → deployment → byte/IDL checks → evidence commit; and
4. the distinct hosted, localhost, devnet, and mainnet lanes.

Every diagram has a text-equivalent `aria-label`, a visible caption, and a keyboard-scrollable frame
for narrow screens. The article remains a Server Component and adds no article-specific client-side
JavaScript.

## Claim controls

The following wording is required:

- **Experimental devnet program**, not production release.
- **Issuer-attested**, not decentralized or trustless.
- **Evidence commitment**, not proof of sensor truth.
- **Semantically identical IDL**, not byte-identical raw IDL.
- **Same-operator repeated builds**, not independent reproduction.
- **Six-pillar atomic bridge limit**, not a six-pillar contract limit; the program permits 16.
- **No live hosted devnet client**, despite the public program address.
- **No retained capacity benchmark**, despite passing correctness tests.
- **Local containment**, not completed credential revocation or legacy authority recovery.

The article must not publish the shared ChatGPT URL, user-reported wallet balance, private-key
location, seed phrase, or other operator secret.

## Fresh source verification

An isolated checkout of `3497678` passed:

- 10/10 Rust library tests;
- normal Anchor SBF build;
- canonical public-IDL check;
- TypeScript typecheck;
- 12/12 local-validator cases, comprising eight lifecycle and four migration-planner cases;
- 4/4 loopback bridge boundary tests;
- 1/1 website fixture-boundary test;
- 14/14 website playground tests;
- website lint; and
- website production build with seven prerendered outputs.

The four migration-planner cases are included in the 12 local-validator total and must not be added
again. The committed Playwright browser-to-validator proof remains one test, but the publication
audit did not rerun it because the orchestrator correctly detected occupied port `18999` and refused
to interfere with an existing local lab.

## Website verification plan

Before publishing the Saberistic article:

1. Run focused Build Notes unit tests.
2. Run root and Static Site typechecks.
3. Run lint and formatting checks.
4. Build the Payload application.
5. Build the fixture-backed Static Site and require its export verifier to find the new canonical
   route, metadata, structured data, TOC anchors, commit pin, hashes, and NO-GO wording.
6. Run the focused Playwright route acceptance against the built public surface.
7. Push the implementation commit and require GitHub CI and CodeQL to pass.
8. Trigger the checks-gated Render Static Site deploy.
9. Verify the production custom-domain route, canonical metadata, JSON-LD, RSS, sitemap, CDN cache,
   and security headers.
10. Record the exact website commit, hosted check runs, Render deploy ID, page count, and production
    acceptance below.

## Production acceptance

Pending implementation commit, hosted checks, and checks-gated Render deployment.

## Remaining Growth release gates

The new article does not change the Growth repository decision. Before a live explorer or production
use, the project still needs:

1. approved hardware-backed multisig custody for program and IDL authority;
2. an independent clean-build attestation from a signed commit;
3. an external smart-program audit;
4. adversarial devnet lifecycle and migration coverage;
5. a finalized-account indexer with fork and missed-log reconciliation;
6. synthetic devnet fixtures under an explicit privacy policy;
7. retained compute, transaction-size, rate, failure, and soak evidence; and
8. closure of legacy provider, signer, authority, and Git-history incident actions.

Growth v2 must not replace either legacy-v1 deployment through an in-place upgrade.
