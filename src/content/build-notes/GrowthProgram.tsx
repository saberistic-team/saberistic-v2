import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  GrowthAccountModelDiagram,
  GrowthContainmentDiagram,
  GrowthDemoBoundaryDiagram,
  GrowthLifecycleDiagram,
} from '@/components/build-notes/GrowthProgramDiagrams'

const commit = 'd944ee75cbb06d6eabdbd7075a88a15bb15e5936'
const repository = 'https://github.com/saberistic-team/growth-program'
const source = (path: string, anchor = '') => `${repository}/blob/${commit}/${path}${anchor}`

const sharedSession = 'https://chatgpt.com/s/cx_6a94ecfd3e048191bbc1cafebf35d48d'
const ownerOnlySite = 'https://saberistic-growth-protocol.saberistic.chatgpt.site/'
const legacyProgram = '97d8t22JenPAwR85PZEXvc4gkvtAMZR9Ct7xuY11a2X8'
const mainnetExplorer = `https://explorer.solana.com/address/${legacyProgram}`
const devnetExplorer = `https://explorer.solana.com/address/${legacyProgram}?cluster=devnet`

const legacyState = `// Growth v1: selected fields from the deployed account format.
pub struct Org {
    pub name: String,
    pub min_reviews: u8,
    pub weights: Vec<f32>,
    pub ranges: Vec<u8>,
    pub levels: Vec<Vec<f32>>,
    pub mint: Pubkey,
    pub authority: Pubkey,
    // ...
}

pub struct Score {
    pub name: String,
    pub scores: Vec<f32>,
    pub scores_sum: Vec<f32>,
    pub applicant: Pubkey,
    pub mint: Pubkey,
    pub reviews_recieved: Vec<u16>,
    pub reviews_sent: u16,
    pub levels: Vec<u8>,
    // ...
}`

const v2AccountModel = `Organization           creator + org_seed
├── Rubric             organization + sequential version
└── ScoreProfile       organization + subject
    └── Assessment     profile + monotonic sequence

LegacyMigrationReceipt
                        canonical legacy Score account; globally one-use

Organization: namespace, authority, status, active rubric
Rubric:       immutable scoring policy after activation
ScoreProfile: current cache and lifecycle pointer
Assessment:   append-style period result and commitments
Receipt:      one-time provenance marker; no score import`

const rubricValidation = `pub const SCORE_SCALE: u16 = 10_000;
pub const WEIGHT_SCALE: u16 = 10_000;
pub const MAX_PILLARS: usize = 16;
pub const MAX_LEVEL_THRESHOLDS: usize = 8;

require!(!pillars.is_empty() && pillars.len() <= MAX_PILLARS, ...);

for pillar in pillars {
    require!(pillar.weight_bps > 0, ...);
    require!(pillar.min_samples > 0, ...);
    require!(pillar.min_coverage_bps <= SCORE_SCALE, ...);
    // IDs are unique and thresholds are strictly increasing.
    weight_sum = weight_sum.checked_add(u32::from(pillar.weight_bps))?;
}

require!(weight_sum == u32::from(WEIGHT_SCALE), ...);`

const fixedPointScoring = `score_numerator += u64::from(input.score_bps)
    .checked_mul(u64::from(pillar.weight_bps))?;

coverage_numerator += u64::from(input.coverage_bps)
    .checked_mul(u64::from(pillar.weight_bps))?;

// Round half-up exactly once after all weighted terms are added.
let weighted_score = score_numerator
    .checked_add(u64::from(WEIGHT_SCALE) / 2)?
    / u64::from(WEIGHT_SCALE);

let level = pillar.level_thresholds
    .iter()
    .take_while(|threshold| input.score_bps >= **threshold)
    .count();`

const consentBoundary = `// Enrollment and rubric adoption require both signers.
pub struct EnrollSubject<'info> {
    #[account(mut)] pub authority: Signer<'info>,
    pub subject: Signer<'info>,
    // ...
}

pub struct AdoptRubric<'info> {
    pub authority: Signer<'info>,
    pub subject: Signer<'info>,
    // ...
}

// Routine periodic assessment is issuer-signed—not co-signed.
pub struct SubmitAssessment<'info> {
    #[account(mut)] pub authority: Signer<'info>,
    // no subject signer
}`

const periodGuards = `let expected_sequence = score_profile.latest_sequence.checked_add(1)?;
require!(args.sequence == expected_sequence, InvalidAssessmentSequence);

let expected_period_id = score_profile.latest_period_id.checked_add(1)?;
require!(args.period_id == expected_period_id, InvalidPeriodId);

require!(
    args.period_end > args.period_start
        && args.period_start >= score_profile.last_period_end
        && args.period_end <= now + MAX_FUTURE_CLOCK_SKEW_SECONDS,
    InvalidPeriod
);

require!(now - args.period_end <= rubric.max_submission_delay_seconds, ...);
require!(args.period_end + rubric.assessment_ttl_seconds > now, ...);`

const correctionRecord = `pub struct SubmitCorrection<'info> {
    #[account(mut)] pub authority: Signer<'info>,
    pub subject: Signer<'info>,
    // target_assessment and new correction are distinct accounts
}

target.status = AssessmentStatus::Corrected;

correction.set_inner(Assessment {
    status: AssessmentStatus::Final,
    sequence: args.sequence,
    period_id: target.period_id,
    rubric_version: target.rubric_version,
    supersedes: target.key(),
    correction_reason_commitment: args.reason_commitment,
    // ...new aggregates and evidence commitment...
});`

const migrationBoundary = `/// Validates only the stable v1 prefix needed for migration provenance.
/// No legacy floating-point score is interpreted or imported.
pub fn validate_legacy_score_data(
    data: &[u8],
    expected_subject: &Pubkey,
) -> Result<()> {
    let expected = &hash(b"account:Score").to_bytes()[..8];
    require!(&data[..8] == expected, ...);
    skip_legacy_dynamic_field(data, &mut cursor, 1)?; // name
    skip_legacy_dynamic_field(data, &mut cursor, 4)?; // Vec<f32> scores
    skip_legacy_dynamic_field(data, &mut cursor, 4)?; // Vec<f32> sums
    require!(&data[cursor..cursor + 32] == expected_subject.as_ref(), ...);
    Ok(())
}`

const hostedCsp = `const isLocalValidatorLab =
  isLoopback && pathname.startsWith('/playground/localnet');

const policy = isLocalValidatorLab
  ? "connect-src 'self' http://127.0.0.1:18999; ..."
  : pathname.startsWith('/playground')
    ? "connect-src 'none'; ..."
    : "connect-src 'self'; ...";

// The hosted simulator cannot gain a quiet RPC fallback.
response.headers.set('Content-Security-Policy', policy);`

const localDemoCommands = `# From the repository root: start the complete local lab.
npm run demo:localnet

# Or run the browser-to-validator proof and clean up afterward.
npm run test:localnet

# Lower-level v2 controls, from v2/:
yarn local:start      # terminal 1: isolated validator
yarn local:bridge     # terminal 2: loopback transaction bridge
yarn local:status
yarn local:stop`

const localIdentityGate = `const identity = await verifyLocalIdentity();

return {
  artifactIdlSha256: identity.idlSha256,
  artifactProgramSha256: identity.programSha256,
  identityVerified: true,
  rpcUrl: "http://127.0.0.1:18899",
};

// Every write re-checks loader ownership, ProgramData pointer,
// upgrade authority, deployed bytes, committed IDL, and checksums.`

const atomicSetup = `create organization
+ create rubric
+ activate rubric
= one signed, simulated, atomic transaction

6 maximum-length pillars → 1,167 serialized bytes → allowed
7 maximum-length pillars → 1,263 serialized bytes → rejected before send
Solana packet limit          → 1,232 bytes

The on-chain contract supports 16 pillars.
The bridge's tighter six-pillar ceiling belongs only to this atomic demo.`

const verificationCommands = `$ cd v2

$ cargo +1.92.0 test --lib
# 10 passed

$ anchor build && yarn idl:check && yarn typecheck
# SBF build, canonical IDL, and TypeScript checks passed

$ yarn test:local
# Anchor's tests/**/*.ts glob runs 8 lifecycle + 4 planner cases: 12 passed

$ cd ..

$ npm --prefix website run test:fixtures
# 1 passed

$ npm --prefix website run test:playground
# 14 simulator and boundary cases passed

$ npm run test:localnet
# 1 browser-to-validator proof passed`

const programArtifact = `Program identity (test-only)
  GrWthV2cQ4GVjzQF8X2VXcZ6HC8ZwHfEEw5fm7cMx99

growth_v2.so
  size    511,336 bytes
  sha256  668da8ea743ca339e83019433904513ecfce3d722f8dc9c63d7a8aee5140639b`

const idlArtifact = `growth_v2.json (canonical, newline-terminated IDL)
  sha256  9e65824eb077b8e87921541426063baf0744f1eadc2de0245a024f6cbd414d0d`

const repositoryTree = `growth-program/
├── programs/growth/              # preserved v1 source
├── snapshots/2026-08-30/         # sanitized live-state evidence
├── docs/
│   ├── USE_CASES.md
│   └── CONTAINMENT_STATUS.md
├── security/V2_SECURITY_REVIEW.md
├── v2/
│   ├── programs/growth_v2/src/   # replacement Anchor program
│   ├── idl/                      # canonical public interface + hash
│   ├── tests/                    # lifecycle and migration planner
│   ├── scripts/                  # build, identity, bridge, local ledger
│   └── docs/                     # security, migration, release runbooks
├── website/                      # fixtures + two separated playgrounds
└── scripts/localnet-demo.sh      # complete browser lab orchestrator`

const useCases = [
  [
    'Team health',
    'Delivery, quality, collaboration, and sustainability measured under one versioned rubric.',
    'An issuer-attested periodic scorecard—not an anonymous employee-review network.',
  ],
  [
    'Project maturity',
    'A project key carries comparable readiness or operating pillars across periods.',
    'Comparison is meaningful only inside the same issuer, rubric version, and period policy.',
  ],
  [
    'Contributor journey',
    'A consenting subject can inspect history, challenge a latest result, and leave future issuance.',
    'Revocation cannot erase a public chain history or make a wallet identity private.',
  ],
] as const

const verificationRows = [
  ['Rust scoring and serialization', '10 / 10', 'Fresh pass at the pinned commit'],
  [
    'Isolated validator + migration planner',
    '12 / 12',
    'Current verification session on the exact-health-verified isolated stack',
  ],
  ['Loopback bridge unit/boundary', '4 / 4', 'Artifact and maximum-packet guards'],
  [
    'Website fixture + simulator boundaries',
    '15 / 15',
    'One fixture test and fourteen playground tests',
  ],
  [
    'Browser → bridge → validator proof',
    '1 / 1',
    'Same verified stack; confirmed signatures, account owners, exact commitment bytes',
  ],
  [
    'Format, lint, types, Clippy, SBF, prerender',
    'Passed',
    'Six application routes in seven prerender results',
  ],
] as const

const productionGates = [
  [
    'Release identity',
    'The declared address is a test-only placeholder with no matching deploy key.',
    'Create a governed program identity outside Git, synchronize IDs, and review again.',
  ],
  [
    'Reproducible artifacts',
    'One normal SBF build passed; a two-operator verifiable build is not established.',
    'Produce matching clean builds and compare deployed bytes with the approved hash.',
  ],
  [
    'Migration adversarial coverage',
    'Parser/planner checks exist; malicious legacy accounts are not fully exercised on-validator.',
    'Test wrong owners, discriminators, PDAs, signers, duplicate receipts, and failure invariants.',
  ],
  [
    'Governance and containment',
    'Legacy provider revocation, authority custody, funds, and Git-history decisions remain operator work.',
    'Complete the incident checklist and put program/issuer control behind approved custody.',
  ],
  [
    'Indexer and reconciliation',
    'The website intentionally has no production chain indexer.',
    'Build finalized account reconciliation; treat events as hints, not the source of truth.',
  ],
  [
    'Privacy and evidence truth',
    'Wallets, aggregates, counts, dates, disputes, and history would be public; issuer data can be false.',
    'Define privacy policy, cohort safeguards, canonical salted commitments, and evidence verification.',
  ],
] as const

export function GrowthProgramArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / THE PRODUCT PRIMITIVE</p>
        <h2>
          A growth score is useful only when its rubric, issuer, period, and limits travel with it.
        </h2>
        <p className="article-lede">
          Growth Program V2 is an undeployed, issuer-attested, multi-pillar scorecard and credential
          primitive designed for Solana. An organization defines a versioned rubric, a subject
          consents to participate, and each period becomes an inspectable assessment instead of an
          endlessly overwritten number.
        </p>
        <p>
          The product idea can serve teams, projects, or contributor programs: turn several
          dimensions of progress into a comparable vector, retain the measurement policy that made
          it meaningful, and give the subject a dispute, correction, and exit path. It is not a
          token economy, a decentralized review network, or a universal reputation score.
        </p>
        <ArticleCallout title="THE ONE-SENTENCE CONTRACT" tone="success">
          <p>
            Let an identifiable issuer publish bounded aggregate scorecards under immutable
            rubrics—while subjects co-sign enrollment, can challenge the latest result, and can stop
            future issuance.
          </p>
        </ArticleCallout>
        <p>
          This build began with a repository containing live legacy deployments, not a blank page.
          That changed the order of operations: understand what already existed, minimize the
          evidence retained, contain exposed development credentials without mutating live state,
          and build V2 as a separate replacement.
        </p>
      </section>

      <section id="legacy-audit">
        <p className="eyebrow">02 / WHAT WAS INHERITED</p>
        <h2>
          V1 was already live—and its data model carried prototype assumptions into public state.
        </h2>
        <p>
          The original Anchor program declared the same address on mainnet and devnet. A sanitized
          repository snapshot dated 30 August 2026 records different binaries on the two networks,
          both upgradeable through the same single-key authority. At that point, discriminator
          counting found 115 program-owned mainnet accounts—2 Org and 111 Score matches—and 94
          devnet accounts—29 Org and 55 Score matches.
        </p>
        <p>
          Those counts are a privacy-minimized historical observation, not a fresh RPC feed for this
          page. Names, subject keys, scores, reviews, and raw account payloads were deliberately
          excluded. The public note links the preserved hashes and methodology rather than
          republishing identity-linked records.
        </p>
        <CodeBlock
          code={legacyState}
          label="V1 account shape, selected fields"
          language="Rust"
          sourceHref={`${repository}/tree/${commit}/programs/growth/src/state`}
        />
        <p>
          V1 used floating-point weights and scores, accumulated mutable sums, advanced one level at
          a time, stored a name on the Score account, and attached NFT/Metaplex behavior. It had no
          durable reviewer identity, no per-period assessment record, no explicit subject consent
          lifecycle, and no way for the program to prove that an aggregate reflected honest or
          unique evidence.
        </p>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Concern</th>
                <th scope="col">V1 shape</th>
                <th scope="col">V2 response</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Math</th>
                <td>
                  On-chain <code>f32</code> values and ad hoc averages
                </td>
                <td>Checked 0–10,000 fixed-point integers</td>
              </tr>
              <tr>
                <th scope="row">Policy</th>
                <td>Mutable vectors inside one organization</td>
                <td>Sequential, versioned, bounded rubrics</td>
              </tr>
              <tr>
                <th scope="row">History</th>
                <td>Mutable accumulated Score state</td>
                <td>Monotonic assessment accounts plus a current cache</td>
              </tr>
              <tr>
                <th scope="row">Consent</th>
                <td>Unchecked applicant registration</td>
                <td>Co-signed enrollment and rubric adoption</td>
              </tr>
              <tr>
                <th scope="row">Surface</th>
                <td>NFT metadata and third-party CPIs</td>
                <td>No token, NFT, Metaplex, or external-CPI dependency</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="containment">
        <p className="eyebrow">03 / CONTAINMENT FIRST</p>
        <h2>Removing a secret from HEAD does not revoke it from the world.</h2>
        <p>
          The repository had tracked development signer files and a provider credential. The current
          tree now generates ephemeral test keypairs, removes the fixed endpoint, ignores common
          secret paths, and preserves only sanitized binary, IDL, loader, authority, count, and
          commitment evidence. No transaction, upgrade, authority transfer, account mutation, or
          provider-side change was attempted during this work.
        </p>
        <GrowthContainmentDiagram />
        <ArticleCallout title="OPEN INCIDENT WORK" tone="warning">
          <p>
            Provider-key revocation, signer-role and fund recovery, program/IDL authority custody,
            Git-history cleanup, and hosted secret scanning require authenticated owners and an
            approved transaction plan. The absence of a key file from the latest commit is not
            evidence that an exposed credential is safe.
          </p>
        </ArticleCallout>
        <p>
          This is why V2 is a new program design rather than an in-place upgrade of either V1
          deployment. Legacy state remains an evidence and retirement problem; new code does not
          retroactively make it trustworthy.
        </p>
      </section>

      <section id="v2-contract">
        <p className="eyebrow">04 / THE V2 CONTRACT</p>
        <h2>Separate the issuer, policy, subject lifecycle, history, and provenance.</h2>
        <p>
          V2 replaces one mutable score object with five explicit account roles. Organization
          namespaces the policy and subject paths and stores current authority. Rubric freezes a
          version of the measurement policy. ScoreProfile stores the subject relationship and
          current cache. Assessment preserves one period. LegacyMigrationReceipt marks a canonical
          V1 relationship once, globally.
        </p>
        <GrowthAccountModelDiagram />
        <CodeBlock
          code={v2AccountModel}
          label="Canonical V2 relationships"
          language="text"
          sourceHref={source('v2/README.md', '#accounts')}
        />
        <p>
          Organization PDAs are namespaced by immutable creator plus a 32-byte organization seed, so
          authority rotation cannot move the namespace. Rubrics are sequential and immutable after
          creation except for one-time activation, then immutable thereafter. Assessments use the
          profile and monotonic sequence in their address; a correction therefore cannot occupy or
          rewrite the original result payload, although it marks the old lifecycle status as
          corrected.
        </p>
      </section>

      <section id="score-model">
        <p className="eyebrow">05 / SCORES AND RUBRICS</p>
        <h2>Integer arithmetic makes the policy bounded, deterministic, and testable.</h2>
        <p>
          Every score, weight, coverage value, and threshold uses basis points from 0 to 10,000. A
          rubric can contain at most 16 unique pillars and eight strictly increasing thresholds per
          pillar. Weights must be positive and total exactly 10,000; samples, freshness, and
          coverage are bounded before a result is accepted.
        </p>
        <CodeBlock
          code={rubricValidation}
          label="Rubric validation, condensed"
          language="Rust"
          sourceHref={source('v2/programs/growth_v2/src/logic.rs', '#L46-L113')}
        />
        <CodeBlock
          code={fixedPointScoring}
          label="Checked weighted scoring, condensed"
          language="Rust"
          sourceHref={source('v2/programs/growth_v2/src/logic.rs', '#L123-L210')}
        />
        <p>
          The final weighted score and coverage round half-up once after all products are added.
          Each pillar level is simply the number of thresholds met. The website&apos;s “balanced
          level”—the weakest pillar—is a fixture presentation convention, not a field or rule in the
          on-chain program.
        </p>
        <ArticleCallout title="WHAT THE BOUNDS DO NOT PROVE">
          <p>
            Minimum samples and coverage prove that submitted numbers fit a declared policy. They do
            not prove reviewer uniqueness, evidence quality, fairness, or truth. The issuer can
            still submit a validly encoded false aggregate.
          </p>
        </ArticleCallout>
      </section>

      <section id="lifecycle">
        <p className="eyebrow">06 / CONSENT AND CORRECTIONS</p>
        <h2>Consent is placed at relationship changes—not falsely attached to every score.</h2>
        <p>
          Issuer and subject co-sign enrollment. If the organization activates a new rubric, both
          sign adoption and the profile&apos;s rubric-relative score cache is cleared. Ordinary
          periodic assessment is then issuer-signed only. Saying that every assessment is
          subject-approved would overstate the contract.
        </p>
        <CodeBlock
          code={consentBoundary}
          label="Signer boundaries, selected instruction contexts"
          language="Rust"
          sourceHref={source('v2/programs/growth_v2/src/instructions.rs', '#L345-L520')}
        />
        <CodeBlock
          code={periodGuards}
          label="Monotonic period, freshness, and expiry guards, condensed"
          language="Rust"
          sourceHref={source('v2/programs/growth_v2/src/instructions.rs', '#L498-L626')}
        />
        <GrowthLifecycleDiagram />
        <p>
          A subject may dispute only the latest final assessment. The profile then blocks later
          periods until the issue is resolved. Correction requires both issuer and subject, keeps
          the original period and rubric, marks the target corrected, and writes a new sequence that
          names what it supersedes. Subject revocation and organization retirement stop future
          issuance permanently; neither deletes history.
        </p>
        <CodeBlock
          code={correctionRecord}
          label="A correction is a new co-signed record, condensed"
          language="Rust"
          sourceHref={source('v2/programs/growth_v2/src/instructions.rs', '#L628-L738')}
        />
      </section>

      <section id="authority">
        <p className="eyebrow">07 / AUTHORITY MODEL</p>
        <h2>The program proves which issuer key attested; it cannot make the attestation true.</h2>
        <p>
          An active organization authority creates and activates rubrics, submits assessments,
          administers lifecycle state, and proposes a replacement authority. The recipient key must
          explicitly accept before rotation completes. Pause blocks issuance and allows controlled
          migration work; retirement is terminal.
        </p>
        <p>
          Two-step rotation prevents accidental transfer to a key that cannot sign, but it is not a
          timelock. A compromised current authority can propose and accept an attacker-controlled
          key immediately. Production still needs hardware-backed multisig custody, role policy,
          incident handling, and independent post-change verification.
        </p>
        <ArticleCallout title="ISSUER-ATTESTED, NOT DECENTRALIZED" tone="warning">
          <p>
            The authoritative statement is: “this organization key submitted these bounded
            aggregates under this rubric for this period.” Neither Solana nor the contract verifies
            the off-chain reviewers, raw evidence, or organizational fairness.
          </p>
        </ArticleCallout>
      </section>

      <section id="migration">
        <p className="eyebrow">08 / LEGACY MIGRATION</p>
        <h2>A receipt proves continuity, not historical truth.</h2>
        <p>
          V2 can create one globally unique receipt for a canonical V1 Score account. The
          instruction verifies the legacy program owner, Org and Score discriminators, canonical
          PDAs, stored legacy authority, applicant/subject relationship, current V2 organization,
          active subject, signatures, and nonzero snapshot commitment.
        </p>
        <CodeBlock
          code={migrationBoundary}
          label="The parser skips V1 scores by design"
          language="Rust"
          sourceHref={source('v2/programs/growth_v2/src/logic.rs', '#L213-L314')}
        />
        <p>
          The parser reads only the stable prefix needed to prove provenance. It explicitly skips
          V1&apos;s floating-point scores and sums; none becomes a V2 score. A receipt says the
          consenting subject and issuer continuity were checked against one legacy account and one
          snapshot commitment. It does not certify that the old reviews were accurate.
        </p>
        <p>
          Commitments also need precision. On-chain, V2 rejects only an all-zero 32-byte value. A
          useful confidential commitment needs a canonical per-kind domain, serialization, private
          random salt, storage policy, and verification procedure. Hashing a predictable name or
          score without a salt is dictionary-guessable.
        </p>
      </section>

      <section id="website">
        <p className="eyebrow">09 / THE EVIDENCE WEBSITE</p>
        <h2>Three product stories make the contract legible without pretending to be live data.</h2>
        <p>
          The companion website frames Team Health, Project Maturity, and Contributor Journey as
          synthetic applications of the same contract. Its explorer is fixture-only. It does not
          ingest either V1 deployment, expose legacy identities, connect a wallet, or present a V2
          account as deployed.
        </p>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Fixture story</th>
                <th scope="col">What it demonstrates</th>
                <th scope="col">Boundary</th>
              </tr>
            </thead>
            <tbody>
              {useCases.map(([name, demonstrates, boundary]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td>{demonstrates}</td>
                  <td>{boundary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The UI can rank fixtures only when issuer, rubric, rubric version, and measurement period
          are genuinely comparable. Ranking is a website computation, not an instruction or protocol
          guarantee. The hosted build is currently owner-only; an anonymous request returns 401, so
          it is recorded as a build artifact rather than offered as a public demo.
        </p>
      </section>

      <section id="browser-demo">
        <p className="eyebrow">10 / BROWSER-LOCAL PLAYGROUND</p>
        <h2>The first demo models every state transition without creating a network path.</h2>
        <p>
          The normal <code>/playground</code> route is an in-memory simulator. It derives synthetic
          addresses, models required signers, computes the same fixed-point result, records
          synthetic receipts and events, and lets the visitor inspect before/after state. It has no
          RPC, wallet, signing, transaction sending, automatic persistence, analytics, remote
          storage, or import path.
        </p>
        <CodeBlock
          code={hostedCsp}
          label="Hosted and localhost network policies, condensed"
          language="TypeScript"
          sourceHref={source('website/proxy.ts', '#L12-L31')}
        />
        <p>
          The only export is an explicit, warned JSON download. The hosted route receives a
          <code>connect-src &apos;none&apos;</code> Content Security Policy, so a future frontend
          mistake cannot quietly reach devnet, mainnet, or a remote API from that simulator. A
          devnet option exists only as a locked, unsigned plan.
        </p>
        <ArticleCallout title="A SIMULATOR IS NOT A TRANSACTION" tone="warning">
          <p>
            Browser memory proves product logic and communication boundaries. It does not prove
            account constraints, signatures, loader identity, SBF execution, transaction size, or
            ledger persistence. That required a separate lab.
          </p>
        </ArticleCallout>
      </section>

      <section id="local-validator">
        <p className="eyebrow">11 / LOCAL-VALIDATOR LAB</p>
        <h2>The second demo crosses the real program boundary—and nowhere beyond localhost.</h2>
        <p>
          The <code>/playground/localnet</code> route connects to a loopback bridge at
          <code>127.0.0.1:18999</code>. That bridge owns disposable in-memory issuer and subject
          signers and submits real instructions to a resettable validator at
          <code>127.0.0.1:18899</code>. Hosted use remains locked; there is no remote-RPC override
          or fallback.
        </p>
        <CodeBlock
          code={localDemoCommands}
          label="Run the complete local proof"
          language="shell"
          sourceHref={source('README.md', '#L83-L110')}
        />
        <p>
          Startup builds the current SBF program, checks the generated IDL byte-for-byte against the
          committed canonical copy and hash, resets a dedicated ledger, genesis-loads the exact
          binary through Solana&apos;s upgradeable loader, then exports a manifest. Health checks
          and every write re-verify loader state, ProgramData pointer and authority, deployed bytes,
          program hash, IDL, and local run identity.
        </p>
        <CodeBlock
          code={localIdentityGate}
          label="Artifact identity returned by the bridge, condensed"
          language="JavaScript"
          sourceHref={source('v2/scripts/localnet-bridge.mjs', '#L400-L506')}
        />
        <p>
          The declared program address is intentionally test-only. No matching deployment key is
          assumed to exist, so genesis loading demonstrates real local execution—not the normal
          <code>solana program deploy</code> path. The deterministic payer is public and unsafe
          anywhere outside this disposable ledger.
        </p>
      </section>

      <section id="security-boundaries">
        <p className="eyebrow">12 / DEMO BOUNDARIES</p>
        <h2>The demo fails closed at network, identity, and packet-size boundaries.</h2>
        <GrowthDemoBoundaryDiagram />
        <p>
          Organization creation, rubric creation, and activation are one atomic transaction in the
          browser lab. The bridge builds, signs, serializes, size-checks, and simulates it before
          sending. That creates a tighter demo limit than the program itself.
        </p>
        <CodeBlock
          code={atomicSetup}
          label="Why the browser bridge caps a rubric at six pillars"
          language="text"
          sourceHref={source('v2/docs/LOCAL_DEMO.md', '#L58-L74')}
        />
        <p>
          The on-chain model still accepts up to 16 pillars; the six-pillar bridge cap only protects
          the single atomic setup packet. Solana test-validator&apos;s auxiliary faucet may bind
          <code>0.0.0.0:19001</code> even while RPC is loopback-only, so the runbook also calls for
          a host firewall on untrusted networks.
        </p>
      </section>

      <section id="debugging">
        <p className="eyebrow">13 / WHAT BROKE WHILE BUILDING</p>
        <h2>The important failures turned into explicit gates.</h2>
        <div className="bug-ledger">
          <article>
            <span>01</span>
            <div>
              <h3>Legacy credentials were source problems and operator problems</h3>
              <p>
                Current-tree deletion and ephemeral fixtures reduced future exposure, but they could
                not revoke a provider key, recover live authority, erase forks, or approve chain
                writes. Those steps remain in a separate containment checklist.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>The final program identity was not a deployable identity</h3>
              <p>
                The placeholder address is suitable for deterministic genesis loading but has no
                matching release key. Instead of manufacturing credentials in Git, the release path
                now stops until an approved key ceremony and governance plan exist.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>A verifiable build attempt did not produce evidence</h3>
              <p>
                A normal pinned SBF build passed. A bounded container-based attempt was stopped
                while pulling its image and produced no reproducible artifact, so the note reports
                one local hash rather than calling the binary reproducible.
              </p>
            </div>
          </article>
          <article>
            <span>04</span>
            <div>
              <h3>Seven pillars crossed the transaction packet limit</h3>
              <p>
                The program&apos;s 16-pillar limit was valid at the account layer, but atomic setup
                with seven maximum-shaped pillars serialized to 1,263 bytes. The bridge now rejects
                above six before any partial organization can be created.
              </p>
            </div>
          </article>
          <article>
            <span>05</span>
            <div>
              <h3>A running local lab blocked the one-shot runner</h3>
              <p>
                Startup correctly refused to reuse occupied ports. The existing stack&apos;s health
                endpoint first proved the exact current binary, IDL, and run identity; the validator
                suite and browser proof then ran manually against that verified isolated stack.
              </p>
            </div>
          </article>
          <article>
            <span>06</span>
            <div>
              <h3>Status documentation carried an older IDL hash</h3>
              <p>
                Two review documents still list the pre-local-lab <code>0c25…</code> digest. The
                canonical newline-terminated IDL at the pinned commit hashes to <code>9e658…</code>;
                the build note uses that current artifact and leaves the discrepancy visible.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section id="verification">
        <p className="eyebrow">14 / VERIFIED RESULT</p>
        <h2>The pinned commit runs from scoring logic through a real local browser transaction.</h2>
        <div className="article-metrics" aria-label="Verified Growth Program repository metrics">
          <div>
            <strong>10</strong>
            <span>Rust tests</span>
          </div>
          <div>
            <strong>12</strong>
            <span>validator + planner cases</span>
          </div>
          <div>
            <strong>15</strong>
            <span>website boundary tests</span>
          </div>
          <div>
            <strong>1</strong>
            <span>end-to-end local proof</span>
          </div>
        </div>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Evidence surface</th>
                <th scope="col">Result</th>
                <th scope="col">What was checked</th>
              </tr>
            </thead>
            <tbody>
              {verificationRows.map(([surface, result, detail]) => (
                <tr key={surface}>
                  <th scope="row">{surface}</th>
                  <td>
                    <strong>{result}</strong>
                  </td>
                  <td>{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CodeBlock
          code={verificationCommands}
          label="Repository verification commands"
          language="shell"
          sourceHref={source('v2/README.md', '#validation')}
        />
        <CodeBlock
          code={programArtifact}
          label="Current local-validation program artifact"
          language="text"
          sourceHref={source('security/V2_SECURITY_REVIEW.md', '#L142-L184')}
        />
        <CodeBlock
          code={idlArtifact}
          label="Current canonical IDL artifact"
          language="text"
          sourceHref={source('v2/idl/growth_v2.sha256')}
        />
        <p>
          The browser proof created a maximum-six-pillar organization and rubric, enrolled a
          subject, submitted an assessment, and verified confirmed signatures, four program-owned
          accounts, and exact evidence-commitment bytes. The development-session walkthrough
          separately recorded a four-pillar fixture—94%, 87%, 91%, and 82%—which computed to 88.50%
          weighted score and 91.50% coverage. Those particular values are session evidence, not a
          committed benchmark or public-chain result.
        </p>
      </section>

      <section id="limits">
        <p className="eyebrow">15 / CURRENT TRUTH</p>
        <h2>V2 is implemented and locally validated. It is not deployed or release-ready.</h2>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Gate</th>
                <th scope="col">Current state</th>
                <th scope="col">Required next evidence</th>
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
          V2 has not received a formal external smart-contract audit, privacy/legal review, or
          independent reproducible-build attestation. There is no final program identity, governed
          upgrade authority, production indexer, reconciler, or public live V2 explorer. Mainnet is
          outside this prototype milestone, and V1 must not be overwritten by V2.
        </p>
        <p>
          Public-chain use would make subject wallet keys, profile relationships, timestamps,
          per-pillar aggregates, sample counts, coverage, disputes, revocations, and history
          permanently linkable. Revocation stops future issuance; it does not erase past state.
          Commitments reduce raw-data exposure only when producers use a strong, salted canonical
          scheme.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">16 / FILE GUIDE</p>
        <h2>
          The repository keeps archaeology, replacement code, demos, and release policy apart.
        </h2>
        <CodeBlock
          code={repositoryTree}
          label="Repository map"
          language="text"
          sourceHref={`${repository}/tree/${commit}`}
        />
        <div className="reference-grid">
          <article>
            <p className="eyebrow">LEGACY EVIDENCE</p>
            <h3>
              <a href={source('snapshots/2026-08-30/README.md')} rel="external">
                Sanitized snapshot <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Network binaries, IDLs, hashes, loader facts, safe counts, and omissions.</p>
          </article>
          <article>
            <p className="eyebrow">CONTRACT</p>
            <h3>
              <a href={source('v2/README.md')} rel="external">
                Growth V2 <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Account model, validation commands, local identity, and safety boundary.</p>
          </article>
          <article>
            <p className="eyebrow">REVIEW</p>
            <h3>
              <a href={source('security/V2_SECURITY_REVIEW.md')} rel="external">
                Internal security review <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Threat model, present controls, release blockers, and residual risks.</p>
          </article>
          <article>
            <p className="eyebrow">LOCAL PROOF</p>
            <h3>
              <a href={source('v2/docs/LOCAL_DEMO.md')} rel="external">
                Validator lab runbook <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Exact local identity, artifact gates, loopback bridge, limits, and teardown.</p>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">17 / WHAT IS NEXT</p>
        <h2>The next milestone is release evidence, not more polish on synthetic data.</h2>
        <ol className="article-steps">
          <li>
            <strong>Close the legacy incident boundary.</strong>
            <span>
              Record provider revocation, signer and authority disposition, custody, and Git-history
              decisions.
            </span>
          </li>
          <li>
            <strong>Create a governed release identity.</strong>
            <span>
              Generate it outside Git, synchronize every declared ID, and define program and issuer
              multisig policy.
            </span>
          </li>
          <li>
            <strong>Produce independent reproducible artifacts.</strong>
            <span>
              Match binary, IDL, and client hashes from two clean operators, then compare deployed
              bytes.
            </span>
          </li>
          <li>
            <strong>Finish adversarial validator coverage.</strong>
            <span>
              Exercise malformed migration accounts, lifecycle boundaries, terminal states, events,
              rollback, and size limits.
            </span>
          </li>
          <li>
            <strong>Specify privacy and evidence policy.</strong>
            <span>
              Define issuer accountability, cohort thresholds, consent copy, canonical salted
              commitments, and retention.
            </span>
          </li>
          <li>
            <strong>Build reconciliation before a live explorer.</strong>
            <span>
              Index finalized canonical accounts, survive forks and missed logs, and expose
              provenance without overstating truth.
            </span>
          </li>
        </ol>
      </section>

      <section id="sources">
        <p className="eyebrow">18 / EVIDENCE LEDGER</p>
        <h2>Repository state is primary; the development chat is supplementary.</h2>
        <p>
          All implementation claims and code excerpts above point to public commit{' '}
          <a href={`${repository}/tree/${commit}`} rel="external">
            <code>{commit}</code>
          </a>
          . The shared development session explains the requested sequence and records the
          interactive walkthrough; where its result is not a committed fixture, this note labels it
          as session evidence.
        </p>
        <div className="reference-grid">
          <article>
            <p className="eyebrow">PRIMARY</p>
            <h3>
              <a href={`${repository}/tree/${commit}`} rel="external">
                Pinned Growth repository <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>
              Source, tests, sanitized snapshots, security review, website, and local-validator lab.
            </p>
          </article>
          <article>
            <p className="eyebrow">SUPPLEMENTARY</p>
            <h3>
              <a href={sharedSession} rel="external">
                Development session <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>
              Build intent, implementation chronology, corrections, and interactive walkthrough.
            </p>
          </article>
          <article>
            <p className="eyebrow">OWNER-ONLY ARTIFACT</p>
            <h3>
              <a href={ownerOnlySite} rel="external">
                Companion website <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Currently requires owner authentication; explorer content is synthetic.</p>
          </article>
          <article>
            <p className="eyebrow">LEGACY NETWORKS</p>
            <h3>
              <a href={mainnetExplorer} rel="external">
                Mainnet <span aria-hidden="true">↗</span>
              </a>{' '}
              ·{' '}
              <a href={devnetExplorer} rel="external">
                Devnet <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>
              Legacy V1 address only. This note relies on the dated sanitized snapshot, not a live
              data feed.
            </p>
          </article>
        </div>
      </section>
    </>
  )
}
