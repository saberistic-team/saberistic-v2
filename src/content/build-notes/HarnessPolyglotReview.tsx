import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  EvidenceGapDiagram,
  RuntimeDecisionGateDiagram,
  TrustedExitGateDiagram,
  TwoPullRequestDeliveryDiagram,
} from '@/components/build-notes/HarnessPolyglotReviewDiagrams'

const commit = '4bf5f68701dee38eecdc0830c4f1be0d937d3942'
const implementation = 'e9308b92a20adc4a49c889e110c58a4571c81a05'
const refreshedHead = '85342e35ecaa2a83a947f3c67dc9ff08133a2b7d'
const hardenedImplementation = 'c5f920f87271b02f241ae39609376c75ee192748'
const hardenedMerge = 'ee759486a2af9abbbe37ac7763b8c9152b794cf8'
const baseline = 'd3b2859a48cfb794472d30805ea91b47dc1086d0'
const repository = 'https://github.com/saberistic-team/harness-platform'
const source = (path: string, anchor = '') => `${repository}/blob/${commit}/${path}${anchor}`

const milestoneContract = `M5 — Polyglot review (conditional)
goal
└── add a second runtime only for a hard, measured,
    attributable M3–M4 bottleneck

evidence found
├── deterministic offline correctness tests
├── golden evaluations and typed event contracts
├── observability seams
├── injected HTTP/process boundaries in M3
└── injected PostgreSQL/object-store boundaries in M4

qualifying evidence not found
├── representative workload or SLO
├── repeated latency percentiles or throughput
├── CPU/memory attribution to a limiting hot path
├── causal separation from I/O, algorithms, and dependencies
└── controlled runtime comparison

decision
└── retain TypeScript on Node ≥ 22; add no runtime or service boundary`

const evidenceLedger = `evidence class                 present?   what it establishes
────────────────────────────  ─────────  ─────────────────────────────────────
offline tests                 yes        deterministic correctness contracts
golden scenarios              yes        behavior against known fixtures
typed events + OTel seams     yes        places where measurement can attach
whole-suite CI duration       yes        elapsed time for the entire command
representative workload       no         no production-shaped demand model
latency percentiles           no         no repeated component distribution
throughput study              no         no sustained work-rate result
CPU / memory attribution      no         no runtime hot-path evidence
runtime comparison            no         no controlled alternative baseline`

const reopeningCriteria = `reopen M5 only when a new task manifest includes

1. workload
   name · environment · repetitions · target/SLO · baseline

2. attribution
   latency percentiles or throughput + CPU and memory evidence

3. causation
   rule out I/O, external dependencies, data structures, algorithms,
   and document the Node-side remedies already attempted

4. boundary economics
   show a specific second runtime materially improves the target after
   build, deployment, security, observability, and ownership costs`

const m5TaskContract = `id: m5-polyglot-review
goal: audit M3–M4 evidence and retain Node unless profiling justifies otherwise

allowed_paths:
  - ARCHITECTURE.md
  - README.md
  - ROADMAP.md
  - tasks/m5-polyglot-review.yaml

permissions:
  fs.read: allow
  fs.write: ask
  network: deny
  git.push: deny

budget:
  max_model_tokens: 60000
  max_tool_calls: 100

delivery:
  type: pull_request`

const m5Delta = `M4 merge
${baseline}
        ↓ separate Step 0 hardening merged first
${hardenedMerge}
        ↓ M5 refreshed head · pull request #4
${refreshedHead}
        ↓ four automated checks green
${commit}
M5 merge

authoritative PR #4 diff
4 files changed · 99 insertions · 8 deletions

runtime source files changed   0
new services                   0
new dependencies               0
new language boundary          0`

const auditFindings = `Step 0 exit-gate audit

1. branch identity
   existing task branches were not necessarily checked out;
   free-form branch metadata could be trusted

2. path scope
   only working-tree status was checked;
   committed changes and writes left by tests could escape

3. failure evidence
   manifest and early Git failures could exit before a report existed

4. policy attribution
   passing decisions and task/session/run provenance were incomplete

5. integrated bootstrap proof
   no deterministic manifest → Pi adapter → edit → tests → report flow`

const hardenedPipeline = `canonical tasks/<id>.yaml
  → derive exact tasks/<id> branch
  → local: select that branch
    CI: verify head ref + immutable head SHA + immutable base SHA
  → attest repository, Git metadata, manifest, HEAD, and merge base
  → sample committed + staged + unstaged + untracked + relevant ignored delta
  → enforce allowed_paths before builder
  → optional TaskAgent builder (upstream Pi adapter or injected test agent)
  → re-attest identity and enforce scope
  → parse one approved test executable plus argv; never invoke a shell
  → stop ordinary descendants and enforce scope again
  → persist causal events
  → atomically commit run-report/v2 and its run.recorded receipt`

const ciTuple = `pnpm harness run tasks/m5-polyglot-review.yaml \\
  --ci-head-ref tasks/m5-polyglot-review \\
  --head-sha 85342e35ecaa2a83a947f3c67dc9ff08133a2b7d \\
  --base-ref ee759486a2af9abbbe37ac7763b8c9152b794cf8`

const reportExcerpt = `{
  "schema": "run-report/v2",
  "status": "passed",
  "branch": "tasks/m5-polyglot-review",
  "policy": {
    "changedPathsOk": true,
    "changedPaths": [
      "ARCHITECTURE.md",
      "README.md",
      "ROADMAP.md",
      "tasks/m5-polyglot-review.yaml"
    ],
    "violations": []
  },
  "tests": {
    "command": "pnpm test",
    "exitCode": 0,
    "ok": true,
    "durationMs": 16940
  },
  "git": {
    "mode": "ci",
    "headSha": "85342e35ecaa2a83a947f3c67dc9ff08133a2b7d",
    "baseSha": "ee759486a2af9abbbe37ac7763b8c9152b794cf8",
    "preTest":  { "policyPaths": 4 },
    "postTest": { "policyPaths": 4 }
  },
  "deliverables": { "reportWritten": true }
}`

const adversarialMatrix = `surface                    hardened behavior
─────────────────────────  ──────────────────────────────────────────────────
manifest path/mutation     canonical regular file; digest checked during run
branch and base            exact identity; immutable CI tuple; metadata recheck
committed or ignored write included in the sampled task delta
rename/copy                source and destination both enter policy evaluation
clean filters/file mode    raw bytes, type, and executable mode checked directly
shell chaining             command parsed as one executable + argv; operators fail
builder edits then throws  mutation still audited before structured failure
test writes after success  post-test scope gate can still block delivery
evidence path/symlink      reserved outputs; unsafe links and inode swaps rejected
report write failure       typed failure, verified fallback, or in-memory evidence
policy events              allow/ask/deny carry task, session, run, and subject`

const releaseSequence = `pull request #3 — M0 exit-gate hardening
├── implementation: ${hardenedImplementation}
├── merge:          ${hardenedMerge}
├── public diff:    22 files · +7,908 / −541
└── CI + CodeQL:    green

pull request #4 — M5 conditional polyglot review
├── implementation: ${implementation}
├── refreshed head: ${refreshedHead}
├── merge:          ${commit}
├── public diff:    4 files · +99 / −8
└── exit gate + CodeQL analyses: four green checks`

const verification = `public PR-head evidence · GitHub Actions 33446082649
├── strict TypeScript                  passed
├── test files                         36 / 36
├── offline correctness tests          535 / 535
├── golden scenarios                   1 / 1
├── changed paths before tests         4
├── changed paths after tests          4
├── path-policy violations             0
├── run-report/v2                      passed · reportWritten=true
└── automated PR checks                4 / 4 green

independent publication audit · exact merge · Node 22.19.0
├── clean-checkout tests               535 / 535
├── strict TypeScript                  exit 0
└── golden scenarios                   1 / 1`

const currentTruth = [
  [
    'Runtime decision',
    'M5 found no qualifying M3–M4 profile and retained TypeScript on Node ≥22 without adding a runtime, package dependency, service, or FFI boundary.',
    'It does not prove Node fastest, optimal, bottleneck-free, scalable, or permanently preferred.',
  ],
  [
    'Correctness evidence',
    'The exact merge passes 535 deterministic offline tests in 36 files, strict type checking, and one golden scenario.',
    'Those checks do not exercise a production provider, Docker daemon, PostgreSQL, S3 service, Kubernetes cluster, or representative load.',
  ],
  [
    'Git identity',
    'Local runs select the exact task branch; detached CI requires a matching branch label, immutable head SHA, and immutable base SHA.',
    'The installed Git executable, accepted base object database, and pre-existing repository configuration remain trusted inputs.',
  ],
  [
    'Path scope',
    'The gate samples committed and working-tree changes, relevant ignored paths, raw tracked bytes, type, mode, and rename/copy endpoints before and after work.',
    'A sampled host workspace is not an atomic filesystem snapshot; a concurrent privileged writer remains outside the guarantee.',
  ],
  [
    'Pi bootstrap',
    'A production adapter targets upstream Pi without a shell, in offline-startup non-interactive mode, with a fixed file-tool set and streamed budget evidence.',
    'Deterministic tests use an injected agent and a spawned Pi-protocol fixture; they do not prove an installed Pi binary or live model provider.',
  ],
  [
    'Process containment',
    'Approved test commands are parsed into one executable plus arguments, ordinary descendants are terminated, and the path gate runs again afterward.',
    'Daemonized or new-session descendants—and Windows descendants beyond the direct child—require preventive container isolation.',
  ],
  [
    'Run evidence',
    'Normal outcomes use coherent run-report/v2; early manifest/Git failures use a strict preflight report; atomic commit and run.recorded distinguish durable reports.',
    'The M5 report is an uploaded CI artifact, not a committed repository file or permanent evidence archive.',
  ],
  [
    'Delivery review',
    'The hardening and M5 pull requests merged only after their automated CI and CodeQL checks succeeded.',
    'The public PR record contains no approving human review, so this is checks-gated delivery rather than independently peer-reviewed code.',
  ],
] as const

export function HarnessPolyglotReviewArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / MILESTONE DECISION</p>
        <h2>M5&apos;s most important output is a boundary it did not add.</h2>
        <p className="article-lede">
          Harness Platform reached its conditional polyglot review with plenty of correctness
          evidence and no profile that attributed a production-shaped bottleneck to Node. The
          engineering result was restraint: keep TypeScript on Node ≥ 22, record what evidence is
          missing, and make the decision explicitly reversible.
        </p>
        <p>
          That is not a consolation prize. A second runtime adds build systems, dependency and
          supply-chain policy, deployment images, observability joins, incident ownership, data
          contracts, and often a serialization or FFI seam. M5 required those costs to buy a
          measured improvement. The repository could not make that case, so it refused the change.
        </p>
        <CodeBlock
          code={milestoneContract}
          label="Stage 1 / Milestone 5 outcome (condensed)"
          language="text"
          sourceHref={source('tasks/m5-polyglot-review.yaml')}
        />
        <ArticleCallout title="INSUFFICIENT EVIDENCE IS NOT A NODE VICTORY" tone="warning">
          <p>
            The defensible claim is <strong>no qualifying profile was found</strong>. M5 did not
            benchmark Node against Rust, Go, Python, or another runtime; it did not prove that Node
            is optimal, fastest, or free of bottlenecks.
          </p>
        </ArticleCallout>
      </section>

      <section id="profile-gate">
        <p className="eyebrow">02 / WHAT COUNTS AS EVIDENCE</p>
        <h2>A green test suite can locate a regression. It cannot locate a runtime bottleneck.</h2>
        <p>
          M3 tests the OpenAI-compatible provider and Docker-plan boundaries with injected HTTP and
          process executors. M4 tests PostgreSQL and S3-compatible behavior with injected protocol
          fakes. Golden scenarios, typed events, and OpenTelemetry bridges make behavior observable
          and refactorable. Those are valuable correctness and instrumentation contracts.
        </p>
        <p>
          None of them supplies a representative demand model, a service-level target, repeated
          latency percentiles, sustained throughput, or CPU and memory attribution. Even the elapsed
          time of <code>pnpm test</code> mixes hundreds of tests, process startup, temporary
          repositories, SQLite work, local sockets, and test-runner overhead. It cannot identify a
          production component, much less prove that its runtime is the constraint.
        </p>
        <CodeBlock code={evidenceLedger} label="M3–M4 evidence classification" language="text" />
        <EvidenceGapDiagram />
      </section>

      <section id="decision">
        <p className="eyebrow">03 / CONDITIONAL LANGUAGE GATE</p>
        <h2>The architecture asks for causation before it pays for polyglotism.</h2>
        <p>
          A slow endpoint may wait on a model provider, database lock, object store, network hop,
          algorithm, data structure, garbage collector, or CPU-bound loop. Rewriting the component
          before attributing the delay can preserve the real bottleneck while adding a new one at
          the boundary between runtimes.
        </p>
        <p>
          The recorded M5 gate therefore moves from workload to attribution, from attribution to
          attempted remedies, and only then to total boundary cost. A reference implementation in
          another language or a team preference is not a substitute for any step.
        </p>
        <RuntimeDecisionGateDiagram />
        <CodeBlock
          code={reopeningCriteria}
          label="Evidence required to reopen the runtime decision"
          language="text"
          sourceHref={source('ARCHITECTURE.md', '#m5-decision--retain-typescriptnode')}
        />
      </section>

      <section id="m5-contract">
        <p className="eyebrow">04 / MACHINE-READABLE DECISION</p>
        <h2>The review itself ran as a four-path task contract.</h2>
        <p>
          M5 was not a broad refactor disguised as an architecture review. Its manifest allowed
          exactly four paths: the architecture decision, project status, roadmap, and the manifest
          itself. Network and Git push remained denied, filesystem writes required approval, model
          and tool budgets were finite, and the delivery type was a pull request.
        </p>
        <CodeBlock
          code={m5TaskContract}
          label="M5 task contract (abridged)"
          language="yaml"
          sourceHref={source('tasks/m5-polyglot-review.yaml')}
        />
        <p>
          The public M5 diff confirms that boundary: four changed files, 99 insertions, eight
          deletions, and no runtime source, dependency, package, service, or deployment seam. The
          implementation began at{' '}
          <a href={`${repository}/commit/${implementation}`} rel="external">
            <code>{implementation.slice(0, 7)}</code>
          </a>
          , was refreshed after the exit-gate fix, and merged at{' '}
          <a href={`${repository}/commit/${commit}`} rel="external">
            <code>{commit.slice(0, 7)}</code>
          </a>
          .
        </p>
        <CodeBlock
          code={m5Delta}
          label="Authoritative M5 release boundary"
          language="text"
          sourceHref={`${repository}/pull/4/files`}
        />
        <div className="article-metrics" aria-label="Harness M5 public change summary">
          <div>
            <strong>4</strong>
            <span>changed files</span>
          </div>
          <div>
            <strong>99</strong>
            <span>insertions</span>
          </div>
          <div>
            <strong>8</strong>
            <span>deletions</span>
          </div>
          <div>
            <strong>0</strong>
            <span>new runtimes</span>
          </div>
        </div>
      </section>

      <section id="step-zero-audit">
        <p className="eyebrow">05 / STEP 0 AUDIT</p>
        <h2>The language review exposed a more urgent problem: the exit gate trusted too much.</h2>
        <p>
          After the first M5 decision pass, the development record returned to Step 0&apos;s
          original promise: take one task manifest, modify its branch, run tests, and produce a
          structured report. The repository already had the directory structure, events, fake model,
          policy, and reports. The missing part was whether that end-to-end result could be trusted
          under an adversarial change.
        </p>
        <CodeBlock
          code={auditFindings}
          label="Five exit-gate gaps found during the Step 0 audit"
          language="text"
          sourceHref={source('tasks/m0-exit-gate-hardening.yaml')}
        />
        <ol className="article-steps">
          <li>
            <span>01</span>
            <div>
              <h3>Branch labels could describe state they did not prove</h3>
              <p>
                Existing task branches were not always selected, unrelated branches could pass, and
                a caller-supplied label could stand in for the checked-out commit. The fix derives
                one branch from the canonical manifest and verifies the Git identity.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>A clean worktree could hide an out-of-scope commit</h3>
              <p>
                Status-only scope checking saw staged, unstaged, and untracked work but not the
                committed delta from the task base. It also did not check again after tests. The new
                gate evaluates the complete sampled delta on both sides of execution.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>The earliest failures could escape without evidence</h3>
              <p>
                Invalid manifests and Git preflight errors occurred before normal report
                construction. A strict preflight artifact now records those attempts; later stages
                use <code>run-report/v2</code> with an ordered failure trail.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Policy decisions needed causal identity</h3>
              <p>
                Allow, ask, and deny outcomes now carry task, session, run, action, subject, effect,
                and reason. The report validator rejects current events whose attribution does not
                match the attempt.
              </p>
            </div>
          </li>
          <li>
            <span>05</span>
            <div>
              <h3>The Pi-shaped bootstrap existed only as pieces</h3>
              <p>
                The hardening task added one <code>TaskAgent</code> seam and a production upstream
                Pi adapter, then proved manifest → branch → adapter → edit → tests → report with an
                injected agent and a spawned protocol fixture in the offline lane.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section id="exit-gate">
        <p className="eyebrow">06 / TRUSTED EXIT GATE</p>
        <h2>The fix binds identity, scope, execution, and the final evidence receipt.</h2>
        <p>
          The audit fixes were intentionally isolated in their own task and{' '}
          <a href={`${repository}/pull/3`} rel="external">
            pull request #3
          </a>
          . Local operation now creates or selects exactly <code>tasks/&lt;id&gt;</code>. Detached
          CI accepts one trusted tuple: branch label, checked-out head object ID, and base object
          ID. The manifest is rechecked as a canonical regular file with the same digest throughout
          the run.
        </p>
        <CodeBlock
          code={hardenedPipeline}
          label="Hardened manifest-to-report pipeline"
          language="text"
          sourceHref={source('apps/cli/src/run.ts')}
        />
        <TrustedExitGateDiagram />
        <p>
          Scope now includes committed changes relative to the verified base, staged and unstaged
          entries, ordinary untracked files, relevant ignored writes, raw tracked bytes, file type,
          executable mode, and both ends of a rename or copy. The same policy runs before and after
          the builder and tests. Evidence paths are reserved regardless of a broad manifest glob.
        </p>
        <CodeBlock
          code={ciTuple}
          label="Immutable CI identity supplied to the M5 gate"
          language="shell"
          sourceHref={source('.github/workflows/ci.yaml')}
        />
        <ArticleCallout title="THE TESTED PI FLOW IS AN ADAPTER CONTRACT" tone="note">
          <p>
            The production adapter launches upstream Pi without a shell, requests offline startup
            and non-interactive JSON protocol mode, and exposes a fixed file-tool set. Deterministic
            tests inject an agent and spawn a Pi-protocol fixture. They prove Harness composition
            and streaming protocol handling—not the installed Pi binary, a live model provider, or
            the provenance of the original repository bootstrap.
          </p>
        </ArticleCallout>
      </section>

      <section id="report-v2">
        <p className="eyebrow">07 / ATTESTABLE RUN EVIDENCE</p>
        <h2>A pass now has to agree with its branch, delta, tests, failures, and receipt.</h2>
        <p>
          Historical <code>run-report/v1</code> remains readable for old UI and eval data, but it is
          not accepted as current gate evidence. A normal attempt uses <code>run-report/v2</code>,
          which requires a run ID, exact task branch, coherent policy result, Git attestation,
          current event attribution, and <code>reportWritten</code>. An invalid manifest or early
          Git failure uses <code>run-preflight-report/v1</code> because a complete normal identity
          cannot yet be trusted.
        </p>
        <CodeBlock
          code={reportExcerpt}
          label="M5 CI run-report/v2 fields (condensed)"
          language="json"
          sourceHref={`${repository}/actions/runs/33446082649`}
        />
        <p>
          The normal report is written to a same-directory temporary file, synchronized, and
          atomically renamed. Its serialized events include one matching <code>run.recorded</code>
          receipt only for the path whose bytes were committed. If the preferred write fails, the
          runner records that failure and verifies a fallback; if every destination fails, it may
          return validated in-memory evidence, but it cannot claim delivery or exit successfully.
        </p>
        <ArticleCallout title="THE CI ARTIFACT IS UPLOADED, NOT COMMITTED" tone="warning">
          <p>
            GitHub Actions run <code>33446082649</code> uploaded the JSON report and SQLite session
            as <code>gate-evidence-33446082649</code>. The public run and pull request establish the
            check result, but the generated artifact is not part of the Git tree and should not be
            treated as a permanent evidence archive.
          </p>
        </ArticleCallout>
      </section>

      <section id="adversarial">
        <p className="eyebrow">08 / ADVERSARIAL HARDENING</p>
        <h2>Every new guarantee attracted a bypass attempt.</h2>
        <p>
          The first five fixes established the shape of a trustworthy gate. The longer hardening
          pass then attacked the assumptions underneath it: path normalization, Git plumbing,
          filesystem identity, command parsing, process cleanup, streaming budgets, and evidence
          persistence. This is why the companion diff is much larger than M5 itself.
        </p>
        <CodeBlock
          code={adversarialMatrix}
          label="Adversarial cases and the final behavior"
          language="text"
          sourceHref={source('apps/cli/test/run.test.ts')}
        />
        <p>
          Two legitimate repository artifacts also exposed the danger of an overbroad detector: a
          checked-in MCP fixture under a <code>node_modules</code>-shaped path and Vitest&apos;s
          hashed cache. The final rules narrow operational exemptions instead of either blocking
          known fixtures or ignoring an entire class of task-created files.
        </p>
        <p>
          The gate also treats failure trails as ordered evidence. If tests fail and the final scope
          check finds an illegal write, both survive. If a builder edits the repository and then
          throws, the mutation is still audited. If evidence persistence or report commit fails, a
          previous success cannot remain the terminal claim.
        </p>
      </section>

      <section id="delivery">
        <p className="eyebrow">09 / TWO CHECKS-GATED PULL REQUESTS</p>
        <h2>Hardening merged first; M5 had to prove itself on the stronger base.</h2>
        <p>
          Pull request #3 merged the Step 0 hardening as <code>{hardenedMerge.slice(0, 7)}</code>.
          The M5 branch was then refreshed to <code>{refreshedHead.slice(0, 7)}</code>, so its new
          run report was produced by the hardened gate rather than inherited from the earlier
          implementation attempt. Pull request #4 merged only after the exit gate and three CodeQL
          statuses were green.
        </p>
        <TwoPullRequestDeliveryDiagram />
        <CodeBlock
          code={releaseSequence}
          label="Dependency-safe public release sequence"
          language="text"
          sourceHref={`${repository}/pull/4`}
        />
        <div className="article-metrics" aria-label="Harness exit-gate and M5 delivery summary">
          <div>
            <strong>2</strong>
            <span>separate pull requests</span>
          </div>
          <div>
            <strong>22</strong>
            <span>hardening files</span>
          </div>
          <div>
            <strong>4</strong>
            <span>M5 files</span>
          </div>
          <div>
            <strong>4 / 4</strong>
            <span>M5 checks green</span>
          </div>
        </div>
        <p>
          This is checks-gated delivery, not a peer-review claim. The public PR record shows
          successful automated analysis and merge chronology but no approving human review.
        </p>
      </section>

      <section id="verification">
        <p className="eyebrow">10 / VERIFIED RESULT</p>
        <h2>The final evidence supports the decision process and the gate—not performance.</h2>
        <p>
          The M5 PR-head workflow ran on Node 22 with a frozen lockfile, passed strict TypeScript,
          all 535 deterministic tests in 36 files, the golden scenario, and the hardened M5 exit
          gate. Its report recorded the same four allowed paths before and after tests, no
          violations, the verified head and base objects, and a committed report receipt.
        </p>
        <p>
          A separate publication audit cloned the exact merge at <code>{commit.slice(0, 7)}</code>,
          installed the frozen lockfile under Node 22.19.0, and reproduced 535/535 tests, a clean
          strict typecheck, and the one golden scenario. This validates the repository state used by
          the article without turning the website task into a new Harness release.
        </p>
        <CodeBlock code={verification} label="M5 verification ledger" language="text" />
        <div className="article-metrics" aria-label="Harness M5 verification summary">
          <div>
            <strong>535 / 535</strong>
            <span>offline tests</span>
          </div>
          <div>
            <strong>36 / 36</strong>
            <span>test files</span>
          </div>
          <div>
            <strong>1 / 1</strong>
            <span>golden scenarios</span>
          </div>
          <div>
            <strong>0</strong>
            <span>path violations</span>
          </div>
        </div>
        <p>
          The PR-head{' '}
          <a href={`${repository}/actions/runs/33446082649`} rel="external">
            exit-gate run
          </a>{' '}
          and{' '}
          <a href={`${repository}/actions/runs/33446079925`} rel="external">
            CodeQL workflow
          </a>{' '}
          passed before merge. The later <code>main</code>{' '}
          <a href={`${repository}/actions/runs/33446274628`} rel="external">
            CI run
          </a>{' '}
          and{' '}
          <a href={`${repository}/actions/runs/33446274799`} rel="external">
            CodeQL run
          </a>{' '}
          also passed; by workflow design, the task-specific exit gate belongs to the PR branch and
          is skipped on the main push.
        </p>
        <ArticleCallout title="THE 16.94-SECOND RUN IS NOT A BENCHMARK" tone="warning">
          <p>
            <code>durationMs: 16940</code> measures the complete test command in one CI attempt. It
            is useful report evidence that the command finished, not latency, throughput, capacity,
            or comparative runtime evidence. Calling it a benchmark would violate the decision M5
            just recorded.
          </p>
        </ArticleCallout>
      </section>

      <section id="limits">
        <p className="eyebrow">11 / CURRENT TRUTH</p>
        <h2>M5 closes a roadmap decision while keeping its trust boundaries visible.</h2>
        <div
          aria-label="Harness M5 verified and unverified boundaries"
          className="article-table-wrap"
          role="region"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Surface</th>
                <th scope="col">What the evidence supports</th>
                <th scope="col">What remains open</th>
              </tr>
            </thead>
            <tbody>
              {currentTruth.map(([surface, proven, open]) => (
                <tr key={surface}>
                  <th scope="row">{surface}</th>
                  <td>{proven}</td>
                  <td>{open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The accurate description is <strong>evidence-gated single-runtime architecture</strong>{' '}
          with a hardened, sampled host exit gate. It is not a Node performance result, an atomic
          filesystem monitor, a security boundary against privileged concurrent writers, a live Pi
          provider test, or preventive containment for untrusted code.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">12 / FILE GUIDE</p>
        <h2>The decision, gate, evidence, and residual trust each have an inspectable home.</h2>
        <div className="file-guide">
          <article>
            <h3>M5 decision record</h3>
            <ul>
              <li>
                <a href={source('tasks/m5-polyglot-review.yaml')} rel="external">
                  tasks/m5-polyglot-review.yaml
                </a>{' '}
                — acceptance, four allowed paths, permissions, budgets, and pull-request delivery.
              </li>
              <li>
                <a
                  href={source('ARCHITECTURE.md', '#m5-decision--retain-typescriptnode')}
                  rel="external"
                >
                  ARCHITECTURE.md
                </a>{' '}
                — the no-go decision, its limits, and exact reopening criteria.
              </li>
              <li>
                <a href={source('ROADMAP.md', '#m5--polyglot-review-conditional')} rel="external">
                  ROADMAP.md
                </a>{' '}
                — the completed conditional milestone without a runtime addition.
              </li>
            </ul>
          </article>
          <article>
            <h3>Branch and scope gate</h3>
            <ul>
              <li>
                <a href={source('apps/cli/src/git.ts')} rel="external">
                  apps/cli/src/git.ts
                </a>{' '}
                — exact branch preparation, CI attestation, Git metadata, and complete sampled delta
                collection.
              </li>
              <li>
                <a href={source('apps/cli/src/run.ts')} rel="external">
                  apps/cli/src/run.ts
                </a>{' '}
                — ordered preflight, scope, builder, test, evidence, and report transitions.
              </li>
              <li>
                <a href={source('.github/workflows/ci.yaml')} rel="external">
                  .github/workflows/ci.yaml
                </a>{' '}
                — branch-derived manifest selection and the trusted CI head/base tuple.
              </li>
            </ul>
          </article>
          <article>
            <h3>Bootstrap and evidence contracts</h3>
            <ul>
              <li>
                <a href={source('apps/cli/src/bootstrap.ts')} rel="external">
                  apps/cli/src/bootstrap.ts
                </a>{' '}
                — the manifest-to-TaskAgent-to-exit-gate composition.
              </li>
              <li>
                <a href={source('apps/cli/src/pi-agent.ts')} rel="external">
                  apps/cli/src/pi-agent.ts
                </a>{' '}
                — shell-free upstream Pi process and streaming budget adapter.
              </li>
              <li>
                <a href={source('packages/sdk/src/run-report.ts')} rel="external">
                  packages/sdk/src/run-report.ts
                </a>{' '}
                — current normal and preflight schemas plus coherence validation.
              </li>
              <li>
                <a href={source('packages/events/src/schemas.ts')} rel="external">
                  packages/events/src/schemas.ts
                </a>{' '}
                — attributed policy, error, task, and run-receipt events.
              </li>
            </ul>
          </article>
          <article>
            <h3>Adversarial proof and limits</h3>
            <ul>
              <li>
                <a href={source('apps/cli/test/run.test.ts')} rel="external">
                  apps/cli/test/run.test.ts
                </a>{' '}
                — failure evidence, post-test scope, manifest mutation, report, and process cases.
              </li>
              <li>
                <a href={source('apps/cli/test/git.test.ts')} rel="external">
                  apps/cli/test/git.test.ts
                </a>{' '}
                — branch, base, raw-byte, ignored-path, mode, metadata, and hardlink cases.
              </li>
              <li>
                <a href={source('apps/cli/test/bootstrap.test.ts')} rel="external">
                  apps/cli/test/bootstrap.test.ts
                </a>{' '}
                — injected TaskAgent and spawned Pi-protocol integration coverage.
              </li>
              <li>
                <a href={source('SECURITY.md')} rel="external">
                  SECURITY.md
                </a>{' '}
                — trusted Git/host inputs, sampled-workspace limits, and Docker isolation boundary.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">13 / WHAT WOULD REOPEN THE GATE</p>
        <h2>The next runtime discussion should begin with a workload, not a language.</h2>
        <ol className="next-list">
          <li>
            <span>01</span>
            <div>
              <h3>Name the production-shaped demand</h3>
              <p>
                Define the operation mix, payloads, concurrency, environment, repetitions, and an
                explicit latency, throughput, cost, or memory target.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Retain raw profiles and repeatable results</h3>
              <p>
                Store profiler output, test configuration, timestamps, environment identity, and
                result artifacts so another run can challenge the attribution.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Fix the cheapest cause first</h3>
              <p>
                Test batching, backpressure, caching, data structures, algorithms, database and
                object-store behavior, provider latency, and Node-native remedies before a rewrite.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Propose one narrow boundary</h3>
              <p>
                If attribution survives, compare one specific seam and include serialization,
                deploy, supply-chain, observability, on-call, and ownership cost in the result.
              </p>
            </div>
          </li>
          <li>
            <span>05</span>
            <div>
              <h3>Move untrusted building into preventive isolation</h3>
              <p>
                The host exit gate is a detective control over repeated samples. Use the Docker
                sandbox-runner when concurrent writers, child processes, host secrets, or network
                access must be prevented rather than discovered afterward.
              </p>
            </div>
          </li>
        </ol>
        <ArticleCallout title="THE DECISION IS REVERSIBLE BY DESIGN" tone="success">
          <p>
            M5 does not ban another language. It makes the proposer bring a reproducible profile, a
            causal explanation, a bounded runtime seam, and a total-cost improvement. New evidence
            can reopen the gate; enthusiasm alone cannot.
          </p>
        </ArticleCallout>
      </section>

      <section id="sources">
        <p className="eyebrow">14 / EVIDENCE LEDGER</p>
        <h2>Public implementation claims resolve to two pull requests and one pinned merge.</h2>
        <ul className="source-list">
          <li>
            <a href={`${repository}/commit/${commit}`} rel="external">
              M5 merge <code>{commit.slice(0, 7)}</code>
            </a>{' '}
            — the source pin for the final decision, hardened base, tests, and documentation.
          </li>
          <li>
            <a href={`${repository}/pull/4`} rel="external">
              Pull request #4 — M5 conditional polyglot review
            </a>{' '}
            — authoritative four-file diff, check results, and merge chronology.
          </li>
          <li>
            <a href={source('tasks/m5-polyglot-review.yaml')} rel="external">
              M5 task contract
            </a>{' '}
            and{' '}
            <a
              href={source('ARCHITECTURE.md', '#m5-decision--retain-typescriptnode')}
              rel="external"
            >
              architecture decision
            </a>{' '}
            — the evidence threshold, no-go result, limitations, and reopening criteria.
          </li>
          <li>
            <a href={`${repository}/pull/3`} rel="external">
              Pull request #3 — Step 0 exit-gate hardening
            </a>{' '}
            — the separate 22-file trust-gate change prompted by the audit in the same development
            record.
          </li>
          <li>
            <a href={`${repository}/actions/runs/33446082649`} rel="external">
              M5 pull-request evidence run
            </a>{' '}
            — 535 tests, 36 files, one golden scenario, four pre/post policy paths, zero violations,
            and the uploaded <code>run-report/v2</code> artifact.
          </li>
          <li>
            Publication audit — an independent clean checkout of the exact merge under Node 22.19.0
            reproduced all 535 tests, strict TypeScript, and the golden scenario. The private
            development conversation supplied chronology and audit prompts only; it is intentionally
            not published as implementation evidence.
          </li>
        </ul>
      </section>
    </>
  )
}
