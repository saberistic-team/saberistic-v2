import Link from 'next/link'

import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  GrowthDeploymentProofDiagram,
  GrowthEnvironmentLanesDiagram,
  GrowthSubjectMapDiagram,
  GrowthTelemetryPipelineDiagram,
} from '@/components/build-notes/GrowthProgramDevnetDiagrams'

const commit = '3497678cee2271c84172c41c62788806373bea4c'
const previousCommit = 'd944ee75cbb06d6eabdbd7075a88a15bb15e5936'
const repository = 'https://github.com/saberistic-team/growth-program'
const source = (path: string, anchor = '') => `${repository}/blob/${commit}/${path}${anchor}`

const programId = 'DA9eu83HutyKB75K7gcPvAGTMH53HmcXN5Kg9Km8DAVE'
const programData = 'AHUsoqpv7EPyTErV539kvUb9q9MS9ywuiu6aYFzCrD3i'
const authority = '7NrJdHqZY8KETyA46BBrngExHjFF4GPxboUskbGTz9P8'
const idlAccount = 'Da3msDhRT1ZHTEcG7HZMy1bhR8VN7ARWDKtWY9dfbJvt'
const deploymentSignature =
  '4QKTxfYrTZ7ZG6spRxpH9N6yRH1M4MjHsxYXJAHNjbDzVoLR7F9JoLqrjxgRkPCBLAZaUBiP2rpAQEKLuM4igZm7'

const programExplorer = `https://explorer.solana.com/address/${programId}?cluster=devnet`
const programDataExplorer = `https://explorer.solana.com/address/${programData}?cluster=devnet`
const idlExplorer = `https://explorer.solana.com/address/${idlAccount}?cluster=devnet`
const deploymentExplorer = `https://explorer.solana.com/tx/${deploymentSignature}?cluster=devnet`

const releaseDelta = `$ git diff --stat ${previousCommit.slice(0, 7)}..${commit.slice(0, 7)}
# 30 files changed, 718 insertions(+), 116 deletions(-)

The delta does two jobs:
1. expand the product map from people and projects into sensor-backed custody;
2. replace the provisional local identity with a recorded experimental devnet deployment.

The earlier Build Note remains a correct historical snapshot at d944ee7.
This note freezes the next public state at 3497678.`

const portableReceipt = `Meaning = Organization + Rubric identity/commitment
        + evidence policy + assessment period

Subject public key may represent:
  team controller | project controller | contributor
  asset-associated controller | operational-unit controller

Stored assessment:
  per-pillar score_bps + sample_count + coverage_bps
  weighted_score_bps + weighted_coverage_bps
  period_start + period_end + expires_at
  rubric_commitment + evidence_commitment

Comparison rule:
  compare only inside the same Organization and Rubric identity/commitment,
  under the same evidence policy and a compatible period policy`

const evidenceBundle = `// Illustrative off-chain evidence envelope—not an on-chain account.
{
  "schema": "growth-evidence@1",
  "subject": "cold-room:BOS-03",
  "window": { "start": "2026-08-01", "end": "2026-08-31" },
  "sources": [
    { "logger": "T-07", "calibrationCurrent": true, "signed": true }
  ],
  "validation": {
    "expectedSamples": 43200,
    "coverageBps": 9980,
    "excursionMinutes": 11
  },
  "rubric": "COLD-CUSTODY/v3",
  "aggregates": ["five bounded pillar results"],
  "rawTelemetry": "private; retained and disclosed by policy"
}

canonical_payload = canonical_json(bundle)
private_salt = cryptographically_random_bytes(>= 16)

evidence_commitment =
  SHA-256("growth-v2:evidence:v1" || 0x00 || private_salt ||
          0x00 || canonical_payload)

authorized verification discloses canonical_payload + private_salt
through the evidence system's controlled channel`

const coldRoomMath = `Thermal compliance    40% × 96 = 38.4
Monitoring coverage  20% × 99 = 19.8
Excursion response   20% × 94 = 18.8
Calibration integrity 10% × 100 = 10.0
Access discipline    10% × 91 =  9.1
                                      ────
Synthetic weighted result             96.1 / 100

Context carried beside the result:
  43,200 expected samples · 99.8% valid coverage
  2 excursions / 11 minutes · 4-minute median response
  rubric COLD-CUSTODY/v3 · illustrative evidence hash`

const assessmentInput = `pub struct SubmitAssessmentArgs {
    pub sequence: u64,
    pub period_id: u64,
    pub period_start: i64,
    pub period_end: i64,
    pub evidence_commitment: [u8; 32],
    pub aggregates: Vec<PillarAggregateInput>,
}

pub struct PillarAggregateInput {
    pub pillar_id: [u8; 16],
    pub score_bps: u16,
    pub sample_count: u32,
    pub coverage_bps: u16,
}`

const publicInterface = `declare_id!("${programId}");

17 instructions
  organization  create · pause · resume · retire
  authority     propose · cancel · accept
  rubric        create · activate
  subject       enroll · adopt · revoke · administrative revoke
  assessment    submit · dispute · correct
  migration     record legacy provenance

5 account types
  Organization · Rubric · ScoreProfile · Assessment · LegacyMigrationReceipt

13 emitted event types
  organization, authority, rubric, subject, assessment, and migration transitions`

const deploymentRecord = `Network              Solana devnet
Status               experimental-not-release-approved
Program              ${programId}
ProgramData          ${programData}
Upgrade + IDL auth   ${authority}
Deploy slot          491039186
Deploy time          2026-08-31T17:16:54Z
Executable size      511,312 bytes
Executable SHA-256   c2fbee57bbfe9481e9c4348e0b88bc24c5dee51f3dd206c844b9bd8485029ff6

Current decision     NO-GO beyond experimental devnet deployment`

const buildEvidence = `$ anchor build --verifiable --solana-version 2.3.12
# image: solanafoundation/anchor:v0.31.1
# two same-operator runs produced identical 511,312-byte artifacts

$ anchor verify --skip-build ${programId}
# recorded result: program is verified

local artifact SHA-256
  c2fbee57bbfe9481e9c4348e0b88bc24c5dee51f3dd206c844b9bd8485029ff6
finalized on-chain dump SHA-256
  c2fbee57bbfe9481e9c4348e0b88bc24c5dee51f3dd206c844b9bd8485029ff6

Important provenance boundary:
  baseCommit             d944ee75cbb06d6eabdbd7075a88a15bb15e5936
  worktreeCleanAtBuild   false
  independent operators false`

const idlEvidence = `IDL account           ${idlAccount}
IDL authority         ${authority}
Account owner         ${programId}
Account space         9,282 bytes
Compressed data       4,619 bytes

committed file SHA-256
  c1b29996021bebd745cddeb32916d8297f80d1028df8afe7fd0d27b9bab48929
fetched raw SHA-256
  6544b1bda637eb7b24b9d5dd433b1b7a1758ab118195fc9ab8f2ccf2b2f43e38
stable normalized SHA-256 (both)
  e67007882e851569801710737f2f84e1e0ea48d64192627ad095a8a510b599ce

semanticMatch         true
Normalization         recursively sort object keys, then JSON.stringify without newline`

const rpcEvidence = `Fresh read-only devnet RPC check during this publication pass

Program account
  executable    true
  owner         BPFLoaderUpgradeab1e11111111111111111111111
  ProgramData   ${programData}

ProgramData account
  last slot     491039186
  authority     ${authority}
  account space 511,357 bytes (45-byte loader header + 511,312-byte program)

IDL account
  owner         ${programId}
  account space 9,282 bytes

Finalized program-owned account census
  IDL account   present
  business PDAs 0 Organization · 0 Rubric · 0 ScoreProfile
                0 Assessment · 0 LegacyMigrationReceipt`

const verificationCommands = `$ cd v2
$ cargo +1.92.0 test --locked --lib
# 10 Rust tests

$ yarn idl:check && yarn typecheck
$ yarn test:local
# 12 total: 8 lifecycle + 4 migration-planner cases

$ node --test tests/localnet-bridge.test.mjs
# 4 bridge boundary tests

$ cd ../website
$ npm run test:fixtures
$ npm run test:playground
# 1 fixture boundary + 14 playground cases

$ npm run lint && npm run build
# lint and application prerender/build`

const repositoryTree = `growth-program/
├── docs/
│   └── EXECUTION_STATUS.md       # current decision and open gates
├── security/                     # pre-release and playground reviews
├── snapshots/2026-08-30/        # privacy-minimized legacy evidence
├── v2/
│   ├── programs/growth_v2/src/   # Anchor program
│   ├── idl/                      # canonical public interface + hash
│   ├── tests/                    # lifecycle, migration, bridge
│   ├── docs/                     # security, migration, deployment
│   └── deployments/devnet/
│       └── 2026-08-31/           # immutable manifest + checksum
└── website/
    ├── app/use-cases/            # 27 concepts + research anchors
    ├── app/playground/           # browser-memory simulator
    └── app/playground/localnet/  # isolated real-validator lab`

const sensorUseCases = [
  [
    'Medicine cold-room custody',
    'Room, freezer, shipment, or lot',
    'Temperature distribution, excursions, logger coverage, calibration, response time',
    'WHO',
    'https://www.who.int/publications/i/item/9789240042773',
  ],
  [
    'Museum and archive preservation',
    'Gallery, archive room, case, or zone',
    'Humidity, stability, light, pollutants, vibration, uptime, conservation response',
    'NPS',
    'https://www.nps.gov/subjects/museums/upload/MHI_Ch4_Environment.pdf',
  ],
  [
    'Grain silo stewardship',
    'Bin, silo, commodity lot, or season',
    'Temperature gradients, moisture, CO₂, aeration, hot spots, sampling coverage',
    'USDA',
    'https://www.nal.usda.gov/research-tools/food-safety-research-projects/management-bin-grain-drying-and-storage-systems',
  ],
  [
    'Underground tank integrity',
    'Tank, piping system, or inspection period',
    'Inventory variance, alarms, gauge status, sensor tests, calibration, acknowledgement',
    'EPA',
    'https://www.epa.gov/ust/release-detection-underground-storage-tanks-usts-introduction',
  ],
  [
    'Battery storage safety',
    'Rack, enclosure, site, or operating window',
    'Temperature spread, vent gas, alarms, redundancy, isolation time, maintenance',
    'DOE',
    'https://www.energy.gov/sites/default/files/2024-05/EED_2827_FIG_SafetyStrategy%20240505v2.pdf',
  ],
  [
    'Refrigerated food transport',
    'Vehicle, container, route, handoff, or load',
    'Pre-cooling, time–temperature history, door events, uptime, cleaning, handoff',
    'FDA',
    'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-sanitary-transportation-food',
  ],
] as const

const adjacentUseCases = [
  'Grant cohort progress',
  'Vendor qualification',
  'Learning cohorts',
  'Community stewardship',
  'Product readiness',
  'Silo quality maps',
  'Indoor-air stewardship',
  'Seed-bank preservation',
  'Concrete curing assurance',
  'Transit asset condition',
  'Art logistics custody',
  'Water-storage stewardship',
  'Renewable fleet care',
  'Rental equipment care',
  'Restoration nursery health',
  'Critical spares readiness',
  'Construction material custody',
  'Loss-prevention programs',
] as const

const verificationRows = [
  ['Rust unit logic', '10 / 10', 'Repository manifest; rerun at the pinned public commit'],
  [
    'Validator lifecycle + planner',
    '12 / 12',
    'Eight program cases plus four included migration-planner cases',
  ],
  [
    'Loopback bridge boundaries',
    '4 / 4',
    'RPC/run-ID validation, artifact identity, and six/seven-pillar packet boundaries',
  ],
  [
    'Website boundaries',
    '15 / 15',
    'One fixture test plus fourteen playground and route-isolation cases',
  ],
  [
    'Verifiable program builds',
    '2 matching',
    'Same operator and dirty source worktree; not independent reproduction',
  ],
  [
    'Devnet program + IDL',
    'Present',
    'Fresh read-only account check; manifest records byte and semantic equality',
  ],
] as const

const productionGates = [
  [
    'Authority custody',
    'Program and IDL remain controlled by one devnet-only key.',
    'Transfer both to an approved hardware-backed multisig under a reviewed policy.',
  ],
  [
    'Build provenance',
    'Two same-operator artifacts match, but the build worktree was dirty.',
    'Rebuild a signed clean commit independently and reconcile every byte and client hash.',
  ],
  [
    'Security review',
    'Internal reviews exist; no external smart-contract audit approves this release.',
    'Complete external review, remediate findings, and publish the exact audited pin.',
  ],
  [
    'Adversarial devnet behavior',
    'The candidate is deployed; a full malicious lifecycle and migration campaign is not.',
    'Exercise bad owners, PDAs, signers, receipts, expiry, terminality, and rollback.',
  ],
  [
    'Indexer reconciliation',
    'There is no approved finalized-account indexer or fork-aware reconciler.',
    'Treat events as hints, rebuild from canonical accounts, and prove missed-log recovery.',
  ],
  [
    'Live product path',
    'The hosted simulator cannot read RPC, connect a wallet, sign, or send.',
    'Enable a separately labeled devnet client only after custody and reconciliation gates.',
  ],
  [
    'Capacity and soak',
    'No retained throughput, compute-budget, concurrency, or long-running soak report exists.',
    'Measure realistic rubric sizes and write patterns; retain machine-readable results.',
  ],
  [
    'Legacy incident',
    'Provider revocation, authority recovery, and Git-history decisions remain owner work.',
    'Close the containment record without upgrading either v1 deployment in place.',
  ],
] as const

export function GrowthProgramDevnetArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / THE NEW BOUNDARY</p>
        <h2>
          A score contract became useful for physical custody—and real enough to verify on devnet.
        </h2>
        <p className="article-lede">
          Growth Program v2 now has an experimental Solana devnet identity and a broader product
          story: the same bounded, versioned score receipt can describe a team, a software project,
          a consenting contributor, or how well a physical asset was cared for during one period.
        </p>
        <p>
          This is a continuation, not a rewrite. The earlier{' '}
          <Link href="/build-notes/growth-program-v2-scorecards/">Growth Program build note</Link>{' '}
          freezes commit <code>d944ee7</code>: legacy containment, the hardened contract, the
          no-network simulator, and the isolated-validator proof before any public deployment. This
          note freezes commit{' '}
          <a href={`${repository}/tree/${commit}`} rel="external">
            <code>3497678</code>
          </a>
          , where the product surface expands and the candidate program plus IDL are recorded on
          devnet.
        </p>
        <ArticleCallout title="THE ONE-SENTENCE RELEASE" tone="success">
          <p>
            Turn governed off-chain evidence into a bounded, time-scoped score receipt, then prove
            which candidate program and interface produced it—without confusing deployment with
            production approval.
          </p>
        </ArticleCallout>
        <p>
          The devnet deployment closes the placeholder-identity gap. It does not close custody,
          independent reproduction, external audit, adversarial testing, indexer, soak, or public UI
          gates. The repository&apos;s decision remains{' '}
          <strong>NO-GO beyond experimental devnet</strong>.
        </p>
      </section>

      <section id="release-boundary">
        <p className="eyebrow">02 / FROM LOCAL PROOF TO PUBLIC CANDIDATE</p>
        <h2>The delta is small in Git and large in what can now be claimed.</h2>
        <p>
          Commit <code>d944ee7</code> proved the real Anchor program only on a disposable local
          validator under a provisional identity. Commit <code>3497678</code> changes the declared
          program address across source, IDL, local tooling, website copy, and tests; adds the dated
          devnet deployment manifest; and expands the use-case page with sensor-backed physical
          custody.
        </p>
        <CodeBlock
          code={releaseDelta}
          label="Exact release boundary"
          language="text"
          sourceHref={`${repository}/compare/${previousCommit}...${commit}`}
        />
        <div
          aria-label="Build Note release comparison"
          className="article-table-wrap"
          role="region"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Question</th>
                <th scope="col">Build Note 006</th>
                <th scope="col">This release</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Where does code execute?</th>
                <td>Isolated local validator only</td>
                <td>Local validator plus one experimental devnet program</td>
              </tr>
              <tr>
                <th scope="row">What identity is authoritative?</th>
                <td>Provisional test address</td>
                <td>
                  Devnet program <code>DA9e…DAVE</code>
                </td>
              </tr>
              <tr>
                <th scope="row">What can be scored?</th>
                <td>Teams, projects, contributors</td>
                <td>Those three plus sensor-backed asset custody and 18 adjacent hypotheses</td>
              </tr>
              <tr>
                <th scope="row">Is there a live public client?</th>
                <td>No</td>
                <td>No—the hosted simulator remains network-disabled</td>
              </tr>
              <tr>
                <th scope="row">Release decision</th>
                <td>NO-GO for devnet deployment</td>
                <td>Deployed experimentally; NO-GO beyond that boundary</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="portable-primitive">
        <p className="eyebrow">03 / WHY THE PRIMITIVE TRAVELS</p>
        <h2>The reusable part is not “growth.” It is a policy-bound assessment receipt.</h2>
        <p>
          The contract never decides whether a team is healthy or a cold room was managed safely. It
          provides bounded arithmetic, versioned rubrics, period ordering, consent and lifecycle
          rules, commitments, and append-style assessment history. Domain meaning stays in the
          issuer&apos;s rubric and evidence policy.
        </p>
        <GrowthSubjectMapDiagram />
        <CodeBlock
          code={portableReceipt}
          label="The invariant under every use case"
          language="text"
          sourceHref={`${repository}/tree/${commit}`}
        />
        <p>
          This distinction prevents a dangerous product slide. “Create a growth contract” in the
          playground means create an <code>Organization</code> PDA and a versioned{' '}
          <code>Rubric</code> inside one shared program. It does not deploy a new executable. And a
          ranking shown by a website is not on-chain truth: comparisons are defensible only when
          Organization, Rubric identity or commitment, evidence rules, and compatible period policy
          are genuinely shared.
        </p>
        <p>
          On chain, every subject is a public key. A physical-asset workflow therefore needs an
          asset-associated controller wallet, plus explicit custody, recovery, and rotation rules
          for every lifecycle action that requires the subject signature. The program does not make
          a freezer, tank, or shipment sign for itself.
        </p>
        <ArticleCallout title="NOT A UNIVERSAL REPUTATION SCORE" tone="warning">
          <p>
            A score from one issuer or rubric cannot be silently compared with another. The chain
            proves who attested and what bytes were committed; it does not make the rubric fair, the
            evidence representative, or the conclusion true.
          </p>
        </ArticleCallout>
      </section>

      <section id="telemetry-pipeline">
        <p className="eyebrow">04 / SENSOR EVIDENCE</p>
        <h2>The contract receives a grade, not a firehose of readings.</h2>
        <p>
          A proposed physical-asset workflow begins with sensors and inspections, but those systems
          stay off chain. In that architecture, an adapter would check provenance, calibration,
          signatures, missing intervals, and exceptions before an accountable issuer applies one
          published rubric to bounded aggregates. Only then would a signed assessment reach Growth
          v2. The pinned repository does not yet implement or test this adapter or a telemetry
          verifier.
        </p>
        <GrowthTelemetryPipelineDiagram />
        <CodeBlock
          code={evidenceBundle}
          label="Proposed off-chain evidence envelope, illustrative"
          language="JSON + pseudocode"
        />
        <p>
          Keeping raw telemetry off chain protects commercial routes, facility operations, and
          detailed environmental histories from automatic public disclosure. The evidence commitment
          can later detect whether a disclosed canonical bundle changed when an authorized verifier
          receives both the bundle and its private salt through a controlled channel. It cannot
          establish that a logger was installed correctly, that calibration evidence is genuine, or
          that the issuer did not omit inconvenient readings. The envelope above is article-authored
          pseudocode; only its domain-separated, salted hash construction follows the
          repository&apos;s{' '}
          <a href={source('v2/docs/SECURITY.md', '#L23-L31')} rel="external">
            commitment guidance
          </a>
          .
        </p>
        <ArticleCallout title="THE TRUST BOUNDARY" tone="warning">
          <p>
            Solana can make an issuer&apos;s claim durable and attributable. Sensor truth still
            depends on hardware security, calibration, provenance, sampling policy, adapter
            controls, independent inspection, and consequences for false attestation.
          </p>
        </ArticleCallout>
      </section>

      <section id="cold-room">
        <p className="eyebrow">05 / WORKED EXAMPLE</p>
        <h2>A month of cold-room operations becomes one inspectable custody receipt.</h2>
        <p>
          The website&apos;s synthetic BOS-03 example starts with 43,200 expected readings, 99.8%
          valid coverage, two excursions totaling 11 minutes, a four-minute median response, and a
          current calibration record. Five declared weights produce a 96.1 result.
        </p>
        <CodeBlock
          code={coldRoomMath}
          label="BOS-03 synthetic score calculation"
          language="text"
          sourceHref={source('website/app/use-cases/page.tsx', '#L210-L246')}
        />
        <p>
          The useful object is not “96.1” by itself. It is 96.1 under <code>COLD-CUSTODY/v3</code>,
          for one declared window, with 99.8% coverage, five visible weights, an accountable
          assessor, and a commitment to the evidence bundle. A later rubric or a different issuer
          creates a different comparison boundary.
        </p>
        <p>
          The example was informed by the World Health Organization&apos;s{' '}
          <a href="https://www.who.int/publications/i/item/9789240042773" rel="external">
            temperature-mapping guidance
          </a>
          . It is synthetic; it is not a WHO certification, regulatory finding, or claim about a
          real facility.
        </p>
      </section>

      <section id="asset-use-cases">
        <p className="eyebrow">06 / PHYSICAL-ASSET MAP</p>
        <h2>
          Six concrete scenarios test whether the abstraction survives contact with operations.
        </h2>
        <p>
          The repository turns six established monitoring practices into protocol hypotheses. Each
          one needs its own rubric, issuer qualification, calibration rules, privacy policy, and
          dispute process; the linked agencies describe the operating domain, not an endorsement of
          this protocol.
        </p>
        <div
          aria-label="Physical-asset scorecard scenarios"
          className="article-table-wrap"
          role="region"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Scenario</th>
                <th scope="col">Possible subject</th>
                <th scope="col">Illustrative evidence</th>
                <th scope="col">Practice anchor</th>
              </tr>
            </thead>
            <tbody>
              {sensorUseCases.map(([scenario, subject, evidence, publisher, href]) => (
                <tr key={scenario}>
                  <th scope="row">{scenario}</th>
                  <td>{subject}</td>
                  <td>{evidence}</td>
                  <td>
                    <a href={href} rel="external">
                      {publisher} <span aria-hidden="true">↗</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The same page carries 18 adjacent explorations—bringing the displayed map to 27 concepts
          when combined with the original three templates and six detailed sensor cases. They are a
          product backlog, not shipped integrations.
        </p>
        <div className="reference-grid">
          {adjacentUseCases.map((useCase, index) => (
            <article key={useCase}>
              <p className="eyebrow">HYPOTHESIS {String(index + 1).padStart(2, '0')}</p>
              <h3>{useCase}</h3>
              <p>Needs domain-specific governance, evidence, calibration, privacy, and review.</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contract-interface">
        <p className="eyebrow">07 / WHAT THE PROGRAM ACTUALLY EXPOSES</p>
        <h2>The use cases changed; the bounded contract model did not.</h2>
        <p>
          The deployment delta does not introduce a sensor instruction or a new asset account. It
          gives the existing general-purpose scorecard program a real address. At the pinned commit,
          the IDL exposes 17 instructions, five account types, and 13 event types.
        </p>
        <CodeBlock
          code={publicInterface}
          label="Growth v2 public interface, condensed"
          language="Rust + IDL summary"
          sourceHref={source('v2/idl/growth_v2.json')}
        />
        <CodeBlock
          code={assessmentInput}
          label="The domain-neutral assessment payload"
          language="Rust"
          sourceHref={source('v2/programs/growth_v2/src/state.rs', '#L88-L143')}
        />
        <p>
          The program accepts at most 16 pillars with up to eight increasing thresholds each. The
          browser&apos;s atomic local setup bridge still caps maximum-shaped rubrics at six because
          seven maximum-field pillars exceed Solana&apos;s 1,232-byte transaction packet. That is a
          bridge and transaction-composition limit, not a six-pillar contract limit.
        </p>
        <p>
          Organization authority submits routine assessments. Subjects co-sign enrollment and rubric
          adoption, can dispute the latest result, and co-sign corrections. A correction creates a
          new assessment that supersedes the old one. The previous score, evidence, and period
          payload remains intact, while the target account&apos;s status changes to{' '}
          <code>Corrected</code>. The previous build note contains the full lifecycle and migration
          walkthrough.
        </p>
      </section>

      <section id="devnet-identity">
        <p className="eyebrow">08 / EXPERIMENTAL DEVNET IDENTITY</p>
        <h2>
          The candidate now has a public address, loader record, authority, and transaction trail.
        </h2>
        <p>
          On 31 August 2026, Growth v2 was deployed to Solana devnet at{' '}
          <a href={programExplorer} rel="external">
            <code>{programId}</code>
          </a>
          . Its upgradeable-loader ProgramData account is{' '}
          <a href={programDataExplorer} rel="external">
            <code>{programData}</code>
          </a>
          , and the initial upgrade and IDL authority is the single devnet-only wallet{' '}
          <code>{authority}</code>.
        </p>
        <CodeBlock
          code={deploymentRecord}
          label="Committed devnet deployment record"
          language="manifest"
          sourceHref={source('v2/deployments/devnet/2026-08-31/manifest.json')}
        />
        <p>
          The{' '}
          <a href={deploymentExplorer} rel="external">
            deployment transaction
          </a>{' '}
          finalized in slot <code>491039186</code>. The manifest records a 3,559,935,600-lamport
          rent-exempt balance for ProgramData executable storage and a 511,312-byte executable. A
          fresh read-only devnet RPC check during this article&apos;s publication still returned the
          expected executable flag, upgradeable-loader owner, ProgramData pointer, last-deploy slot,
          and authority.
        </p>
        <CodeBlock
          code={rpcEvidence}
          label="Fresh public-account check"
          language="Solana JSON-RPC summary"
        />
        <p>
          A finalized program-owned account census found only the Anchor IDL account—no live
          Organization, Rubric, ScoreProfile, Assessment, or LegacyMigrationReceipt state. The
          public use cases are therefore still product hypotheses and synthetic fixtures, not a
          hidden set of devnet customer records.
        </p>
        <ArticleCallout title="A PROGRAM ID IS NOT A RELEASE CERTIFICATE" tone="warning">
          <p>
            Anyone can inspect this candidate. That does not mean they should trust it with
            production data, authority, or money. The same single key can still upgrade the program
            and IDL until custody is deliberately changed.
          </p>
        </ArticleCallout>
      </section>

      <section id="artifact-proof">
        <p className="eyebrow">09 / EXECUTABLE PROOF</p>
        <h2>Fetched bytes match the built bytes; source provenance is still incomplete.</h2>
        <GrowthDeploymentProofDiagram />
        <p>
          The candidate was built twice with Anchor 0.31.1 and Solana 2.3.12 in the pinned
          verifiable-build image. Both same-operator runs produced the same SHA-256. A dump of the
          finalized devnet executable produced that hash again, and Anchor&apos;s skip-build
          verification reported the program verified.
        </p>
        <CodeBlock
          code={buildEvidence}
          label="Build and deployed-byte evidence"
          language="shell + manifest"
          sourceHref={source('v2/deployments/devnet/2026-08-31/manifest.json')}
        />
        <p>
          This proves a useful equality: the recorded artifact and deployed executable are the same
          bytes. It does not prove that those bytes came from a clean, signed release commit. The
          manifest explicitly records a dirty worktree based on <code>d944ee7</code>, and both
          builds were run by one operator. Calling this “independently reproducible” would erase the
          most important remaining provenance gap.
        </p>
      </section>

      <section id="published-idl">
        <p className="eyebrow">10 / PUBLISHED INTERFACE</p>
        <h2>The IDL was written to devnet and compared semantically, not by fragile formatting.</h2>
        <p>
          The Anchor IDL account at{' '}
          <a href={idlExplorer} rel="external">
            <code>{idlAccount}</code>
          </a>{' '}
          is owned by the Growth v2 program and governed by the same initial authority. Publishing
          required nine chronological write transactions; all nine signatures are recorded in the
          manifest.
        </p>
        <CodeBlock
          code={idlEvidence}
          label="Committed and fetched IDL comparison"
          language="manifest"
          sourceHref={source('v2/deployments/devnet/2026-08-31/manifest.json')}
        />
        <p>
          The fetched raw file and committed file have different byte hashes because Anchor changes
          object-key order and omits the final newline. Recursively sorting object keys and encoding
          both as compact JSON produces the same stable hash. That makes the claim precise: the
          published interface is semantically identical, not raw-file identical.
        </p>
      </section>

      <section id="website-boundary">
        <p className="eyebrow">11 / THE UI STILL FAILS CLOSED</p>
        <h2>The program is on devnet. The hosted playground still cannot touch it.</h2>
        <GrowthEnvironmentLanesDiagram />
        <p>
          The owner-only website can model organizations, rubrics, enrollment, scoring, disputes,
          corrections, pausing, retirement, revocation, expiry, accounts, PDAs, events, and an
          unsigned devnet replay plan. Its normal playground runs entirely in browser memory under
          <code>connect-src &apos;none&apos;</code> and has no RPC, wallet, signing, sending,
          automatic persistence, remote storage, or import path.
        </p>
        <p>
          Real browser-initiated writes remain confined to the separate localhost lab with ephemeral
          signers and an isolated validator. The new public program address therefore supports
          verification and future integration work; it does not quietly turn the existing website
          into a live devnet application.
        </p>
        <ArticleCallout title="WHY THE DEVNET EXPLORER IS STILL LOCKED" tone="warning">
          <p>
            A trustworthy explorer needs finalized-account reconciliation, fork and missed-log
            recovery, synthetic devnet fixtures, privacy review, stable custody, and a clear
            distinction between issuer claims and verified evidence. An address alone supplies none
            of those controls.
          </p>
        </ArticleCallout>
      </section>

      <section id="debugging">
        <p className="eyebrow">12 / WHAT BROKE OR ALMOST BECAME A FALSE CLAIM</p>
        <h2>The hardest bugs were mismatches between evidence and language.</h2>
        <div className="bug-ledger">
          <article>
            <span>01</span>
            <div>
              <h3>A real address had to replace the provisional identity everywhere</h3>
              <p>
                Source, Anchor configuration, IDL, public website artifact, local bridge, tests, and
                documentation all declared the old local-only identity. The release changes them
                together so clients cannot silently derive accounts for a different program.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Two matching builds were tempting to call reproducible</h3>
              <p>
                The byte result is strong, but both runs came from one operator and a dirty
                worktree. The manifest now preserves those qualifiers beside the hashes instead of
                turning same-machine repeatability into independent provenance.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>A raw IDL hash reported a mismatch that was only serialization</h3>
              <p>
                The fetched IDL reordered keys and dropped the trailing newline. Stable recursive
                key sorting separated semantic equality from raw-file equality and retained both
                hashes for audit.
              </p>
            </div>
          </article>
          <article>
            <span>04</span>
            <div>
              <h3>Adding sensors could have implied that the chain validates hardware</h3>
              <p>
                The architecture now draws the off-chain adapter explicitly. Growth v2 accepts an
                issuer-signed aggregate and commitment; it neither reads a sensor nor proves its
                calibration, completeness, or honesty.
              </p>
            </div>
          </article>
          <article>
            <span>05</span>
            <div>
              <h3>Deployment created pressure to unlock the hosted playground</h3>
              <p>
                The UI remains network-free. Public program verification, public account
                exploration, and a transaction-capable product are separate release decisions with
                different evidence requirements.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section id="verification">
        <p className="eyebrow">13 / VERIFIED RESULT</p>
        <h2>
          The repository, local harness, and public accounts support different parts of the claim.
        </h2>
        <div className="article-metrics" aria-label="Growth Program devnet verification metrics">
          <div>
            <strong>17</strong>
            <span>program instructions</span>
          </div>
          <div>
            <strong>511,312</strong>
            <span>deployed program bytes</span>
          </div>
          <div>
            <strong>27</strong>
            <span>displayed use-case concepts</span>
          </div>
          <div>
            <strong>NO-GO</strong>
            <span>beyond experimental devnet</span>
          </div>
        </div>
        <div
          aria-label="Growth Program verification results"
          className="article-table-wrap"
          role="region"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Evidence surface</th>
                <th scope="col">Result</th>
                <th scope="col">Scope</th>
              </tr>
            </thead>
            <tbody>
              {verificationRows.map(([surface, result, scope]) => (
                <tr key={surface}>
                  <th scope="row">{surface}</th>
                  <td>
                    <strong>{result}</strong>
                  </td>
                  <td>{scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CodeBlock
          code={verificationCommands}
          label="Fresh local verification lanes"
          language="shell"
        />
        <p>
          The dated manifest additionally records a matching on-chain program dump, a semantic IDL
          match, a passing IDL-current check, and a passing Anchor skip-build verification. The
          fresh RPC read verifies current public account identity; it does not rerun deployment,
          mutate authority, or create devnet fixture accounts.
        </p>
      </section>

      <section id="limits">
        <p className="eyebrow">14 / CURRENT TRUTH</p>
        <h2>Experimental deployment is complete. Production evidence is not.</h2>
        <div
          aria-label="Growth Program production release gates"
          className="article-table-wrap"
          role="region"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Gate</th>
                <th scope="col">Current state</th>
                <th scope="col">Required evidence</th>
              </tr>
            </thead>
            <tbody>
              {productionGates.map(([gate, current, required]) => (
                <tr key={gate}>
                  <th scope="row">{gate}</th>
                  <td>{current}</td>
                  <td>{required}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          No production capacity claim is possible yet. There is no retained compute-unit profile,
          realistic concurrent writer test, RPC-provider failure test, indexer recovery run, or
          long-duration soak artifact. Local correctness counts and a successful deployment are not
          throughput evidence.
        </p>
        <p>
          Public-chain assessments would make subject wallet keys, issuer relationships, timestamps,
          periods, per-pillar aggregates, sample counts, coverage, disputes, corrections,
          revocation, and history linkable. A commitment keeps raw evidence out of the account only
          when the producer uses a strong, salted canonical scheme and a defensible disclosure
          policy.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">15 / FILE GUIDE</p>
        <h2>
          The repository separates implementation, deployment evidence, product hypotheses, and
          policy.
        </h2>
        <CodeBlock
          code={repositoryTree}
          label="Repository map at the pinned commit"
          language="text"
          sourceHref={`${repository}/tree/${commit}`}
        />
        <div className="reference-grid">
          <article>
            <p className="eyebrow">DEPLOYMENT</p>
            <h3>
              <a href={source('v2/deployments/devnet/2026-08-31/manifest.json')} rel="external">
                Machine-readable manifest <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Program, ProgramData, authority, transactions, hashes, build scope, and gates.</p>
          </article>
          <article>
            <p className="eyebrow">PRODUCT MAP</p>
            <h3>
              <a href={source('website/app/use-cases/page.tsx')} rel="external">
                Use-case page <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>
              Three core templates, six sensor scenarios, 18 hypotheses, and eight research anchors.
            </p>
          </article>
          <article>
            <p className="eyebrow">INTERFACE</p>
            <h3>
              <a href={source('v2/idl/growth_v2.json')} rel="external">
                Canonical IDL <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Current program address, instructions, accounts, events, types, and errors.</p>
          </article>
          <article>
            <p className="eyebrow">DECISION</p>
            <h3>
              <a href={source('docs/EXECUTION_STATUS.md')} rel="external">
                Execution status <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>What changed, what remains owner work, and why the live explorer is still NO-GO.</p>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">16 / WHAT IS NEXT</p>
        <h2>
          The next milestone should make this deployment governable, reproducible, and observable.
        </h2>
        <ol className="next-list">
          <li>
            <span>01</span>
            <p>
              <strong>Close authority custody.</strong> Move program and IDL control from the single
              devnet key to an approved hardware-backed multisig with an upgrade and emergency
              policy.
            </p>
          </li>
          <li>
            <span>02</span>
            <p>
              <strong>Reproduce from a clean signed commit.</strong> Have a second operator build
              independently, compare the executable, IDL, generated client, lockfiles, and deployed
              bytes, and retain the attestation.
            </p>
          </li>
          <li>
            <span>03</span>
            <p>
              <strong>Run adversarial devnet lifecycles.</strong> Use synthetic accounts to exercise
              authority rotation, expiry, disputes, corrections, revocation, retirement, migrations,
              duplicate receipts, malformed owners, and rollback.
            </p>
          </li>
          <li>
            <span>04</span>
            <p>
              <strong>Build a reconciled read path.</strong> Index finalized canonical accounts,
              survive forks and missed events, and demonstrate a complete rebuild before offering a
              live explorer.
            </p>
          </li>
          <li>
            <span>05</span>
            <p>
              <strong>Specify one sensor adapter deeply.</strong> Define canonical evidence, salts,
              calibration, signer provenance, missing-data rules, retention, disclosure, appeals,
              and issuer liability for one bounded pilot.
            </p>
          </li>
          <li>
            <span>06</span>
            <p>
              <strong>Retain performance evidence.</strong> Measure compute units, transaction
              sizes, realistic rubric shapes, concurrent writers, RPC failures, indexer lag, and
              soak behavior without presenting a toy run as capacity.
            </p>
          </li>
        </ol>
      </section>

      <section id="sources">
        <p className="eyebrow">17 / EVIDENCE LEDGER</p>
        <h2>
          The public repository and chain state carry the claims; the build conversation supplies
          chronology.
        </h2>
        <p>
          All implementation, use-case, and deployment claims above point to public commit{' '}
          <a href={`${repository}/tree/${commit}`} rel="external">
            <code>{commit}</code>
          </a>
          . The development conversation was reviewed to reconstruct intent and order of work, but
          only claims independently supported by public evidence are included.
        </p>
        <div className="reference-grid">
          <article>
            <p className="eyebrow">PRIMARY SOURCE</p>
            <h3>
              <a href={`${repository}/tree/${commit}`} rel="external">
                Pinned Growth repository <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Source, tests, product map, security reviews, manifest, and release decision.</p>
          </article>
          <article>
            <p className="eyebrow">CHAIN STATE</p>
            <h3>
              <a href={programExplorer} rel="external">
                Experimental program <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Executable devnet account and upgradeable-loader ProgramData relationship.</p>
          </article>
          <article>
            <p className="eyebrow">DEPLOYMENT TRAIL</p>
            <h3>
              <a href={deploymentExplorer} rel="external">
                Deployment transaction <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Finalized devnet transaction recorded in the dated deployment manifest.</p>
          </article>
          <article>
            <p className="eyebrow">PUBLISHED INTERFACE</p>
            <h3>
              <a href={idlExplorer} rel="external">
                Anchor IDL account <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Program-owned interface account with semantic-match evidence in the manifest.</p>
          </article>
        </div>
      </section>
    </>
  )
}
