import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  CompiledPolicyDiagram,
  GoldenScenarioDiagram,
  OperatorLoopDiagram,
  SqliteEvidenceDiagram,
} from '@/components/build-notes/HarnessOperatorLoopDiagrams'

const commit = 'a596fc54af8b4581ac9619d01b6ad364cfde25cb'
const repository = 'https://github.com/saberistic-team/harness-platform'
const source = (path: string, anchor = '') => `${repository}/blob/${commit}/${path}${anchor}`

const milestoneContract = `M1 — Operator loop
├── CI: test + typecheck + evals + harness exit gate
├── read-only terminal session/event viewer
├── first deterministic golden-kernel scenario
├── SQLite persistence for session evidence
├── CI-provided deliverables.pullRequest value
└── process.exec rule compiler

implementation shape
├── 5 task manifests (CI and PR evidence share one task)
├── 5 task commits + 1 documentation commit
└── generated reports and SQLite stay outside Git history`

const branchChain = `88ef2f4  M0 public baseline
   │
261cc88  m1-sessions-sqlite
   │
6d86d0a  m1-exec-rules
   │
5ec9d93  m1-eval-scenarios
   │
be8b298  m1-ci-gate + PR delivery input
   │
702bfd7  m1-tui-viewer
   │
a596fc5  ROADMAP + AGENTS documentation`

const sqliteSchema = `CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  task_id TEXT,
  status TEXT NOT NULL CHECK (
    status IN ('active', 'closed', 'archived')
  ),
  created_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE events (
  session_id TEXT NOT NULL REFERENCES sessions (session_id),
  seq INTEGER NOT NULL,
  event_id TEXT NOT NULL,
  at TEXT NOT NULL,
  actor TEXT,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (session_id, seq)
);`

const evidenceWrite = `const wire = serializeEvent(event)
deserializeEvent(wire) // validate before disk
const obj = JSON.parse(wire)

const row = this.db.prepare(
  'SELECT COALESCE(MAX(seq), -1) + 1 AS next ' +
  'FROM events WHERE session_id = ?'
).get(this.sessionId)

this.db.prepare(
  'INSERT INTO events ' +
  '(session_id, seq, event_id, at, actor, type, payload) ' +
  'VALUES (?, ?, ?, ?, ?, ?, ?)'
).run(
  this.sessionId,
  row.next,
  obj.eventId,
  obj.at,
  obj.actor ?? null,
  obj.type,
  wire,
)

// Reads pass payload through deserializeEvent again.`

const viewerCommands = `# List newest sessions and their event counts.
node apps/tui/bin/view.js list

# Render one stored event stream, or emit raw JSON frames.
node apps/tui/bin/view.js show --session sess-…
node apps/tui/bin/view.js show --session sess-… --raw

# Render report metadata, deliverables, and decoded events.
node apps/tui/bin/view.js report tasks/runs/<report>.json`

const goldenScenario = `id: kernel-0001-golden
uses_tasks:
  - kernel-0001
script:
  - content: >
      Serialization of every kernel event is implemented
      and round-trips cleanly.
expect:
  run:
    status: completed
    steps: 1
    toolCalls: 0
    textContains: round-trips
    emittedBudgetWarning: false
  events:
    - type: session.created
    - type: agent.started
      data.taskId: kernel-0001
      data.model: fake-model/v1
    - type: model.request
    - type: model.response
      data.finishReason: stop
    - type: agent.stopped
      data.status: completed`

const evalResult = `$ pnpm evals
✓ kernel-0001-golden
  task: kernel-0001
  status: completed
  steps: 1 · tool calls: 0
  events: 5 · tokens: 37

1/1 scenarios passed`

const compiledRules = `const execDecision = compileRules(manifest.permissions).decide(
  'process.exec',
  args.testCommand ?? DEFAULT_TEST_COMMAND,
)

// Matching contract
// 1. most-specific matching pattern wins
// 2. equal specificity: deny > ask > allow
// 3. configured subject map, no match or fallback: deny
// 4. action with no rule: ask

if (execDecision.effect === 'deny') {
  outcome = 'blocked'
  push(createEvent(
    'policy.decision',
    {
      action: 'process.exec',
      subject: args.testCommand ?? DEFAULT_TEST_COMMAND,
      effect: 'deny',
      reason: execDecision.reason,
    },
    eventOpts(),
  ))
}

// Current M1 caveat: headless "ask" also reaches execution.`

const ciWorkflow = `jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm evals
      - run: >-
          pnpm harness run tasks/kernel-0001.yaml
          --branch "\${{ github.head_ref }}"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: gate-evidence-\${{ github.run_id }}
          path: tasks/runs/`

const deliveryEvidence = `const supplied = (
  args.prUrl ?? process.env.HARNESS_PULL_REQUEST_URL ?? ''
).trim()

deliverables: {
  pullRequest:
    supplied.length > 0
      ? supplied
      : outcome === 'passed'
        ? \`branch: \${branch}\`
        : undefined,
  reportPath,
  sessionId,
  artifacts: sessionId ? ['tasks/runs/sessions.sqlite'] : [],
}`

const verification = `$ pnpm install --frozen-lockfile
# 18 workspaces · lockfile accepted

$ pnpm typecheck
# exit 0

$ pnpm test
Test Files  10 passed (10)
Tests       80 passed (80)

$ pnpm evals
1/1 scenarios passed

$ for task in tasks/*.yaml; do pnpm harness validate "$task"; done
# 6/6 manifests valid: kernel-0001 + five M1 tasks

$ pnpm harness run tasks/kernel-0001.yaml --branch tasks/kernel-0001
# passed · JSON report + SQLite session · 2 events

$ node apps/tui/bin/view.js list
$ node apps/tui/bin/view.js show --session <session-id>
$ node apps/tui/bin/view.js report <report>
# every command exited 0 against the generated evidence`

const publicCommits = [
  {
    href: `${repository}/commit/261cc889b071277985b5186990935a16fc71001c`,
    id: '261cc88',
    text: 'SQLite sessions, CLI event persistence, and report session identifiers.',
  },
  {
    href: `${repository}/commit/6d86d0a02781bd143d781805f323d4ec6535c9fc`,
    id: '6d86d0a',
    text: 'Compiled process rules and one decision table for CLI enforcement.',
  },
  {
    href: `${repository}/commit/5ec9d93e1533c3bc74773231115fc4682a35c896`,
    id: '5ec9d93',
    text: 'Scenario DSL, deterministic runner, and the first golden-kernel case.',
  },
  {
    href: `${repository}/commit/be8b298fe08906a8e74d960f8583b42ba6807b4c`,
    id: 'be8b298',
    text: 'GitHub Actions exit gate and caller-supplied pull-request evidence.',
  },
  {
    href: `${repository}/commit/702bfd715bfa37cf38668833912f78e3887e4eeb`,
    id: '702bfd7',
    text: 'Terminal list, show, and report views over the new evidence.',
  },
  {
    href: `${repository}/commit/${commit}`,
    id: 'a596fc5',
    text: 'Public roadmap and repository map updated for the completed milestone.',
  },
] as const

const currentTruth = [
  [
    'Required CI',
    'The workflow is green, but main currently has no branch protection or ruleset.',
    'Enable a rule that requires the gate job before merge.',
  ],
  [
    'PR path scope',
    'changedPaths reads Git status. A clean CI checkout reports zero changed paths.',
    'Compare the pull-request head against an explicit trusted base commit.',
  ],
  [
    'Task branches',
    'Branch names are created or recorded; checkout and one-PR-per-task are not fully enforced.',
    'Verify the checked-out ref and delivery relationship instead of trusting a label.',
  ],
  [
    'Session durability',
    'SQLite assumes one writer; passed sessions remain active; persistence failure does not fail the gate.',
    'Use transactional sequence allocation, close sessions, and define whether evidence is mandatory.',
  ],
  [
    'Viewer safety',
    'Commands expose no writes, but show opens the database through a schema-initializing read/write helper.',
    'Open an existing database in strict read-only mode for every viewer path.',
  ],
  [
    'Permission ask',
    'The compiler returns ask safely, but the current headless CLI only blocks deny and executes ask.',
    'Make headless ask block unless an explicit approval artifact exists.',
  ],
  [
    'Evaluation depth',
    'One scripted FakeModel turn checks five events; no provider, tools, or golden repository is exercised.',
    'Land the M2 calibration repository, SDK-owned DSL, and representative scenarios.',
  ],
  [
    'Platform scope',
    'Web, agent server, sandbox runner, and control plane remain placeholders; MCP is types only.',
    'Keep M1 described as a local operator loop, not a production agent platform.',
  ],
] as const

export function HarnessOperatorLoopArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / MILESTONE CONTRACT</p>
        <h2>The foundation could judge a run. M1 made the judgment operable.</h2>
        <p className="article-lede">
          Stage 1, Milestone 1 closes the first local operator loop: define a task, run its gate,
          retain typed evidence, inspect the result, and repeat the same proof in continuous
          integration.
        </p>
        <p>
          M0 ended with useful contracts but a mostly momentary result. Sessions lived in memory,
          the TUI was a placeholder, evaluations were a directory, and no hosted workflow ran the
          harness against itself. M1 did not add a live coding model or distributed services. It
          made the existing kernel and exit gate observable enough to dogfood.
        </p>
        <CodeBlock
          code={milestoneContract}
          label="Stage 1 / Milestone 1 scope"
          language="text"
          sourceHref={source('ROADMAP.md', '#L16-L29')}
        />
        <ArticleCallout title="Six roadmap bullets, five dogfooded tasks">
          <p>
            CI and the CI-provided pull-request field landed together in <code>m1-ci-gate</code>.
            The other four deliverables each have their own manifest. The public repository
            therefore contains five M1 task contracts, not six—and no pull request was created
            during the recorded session.
          </p>
        </ArticleCallout>
      </section>

      <section id="m0-to-m1">
        <p className="eyebrow">02 / FROM FOUNDATION TO LOOP</p>
        <h2>The shared stage plan separates kernel, operator plane, protocols, and isolation.</h2>
        <p>
          The planning model used Pi, OpenCode, Goose, and OpenHands as architectural references,
          not literal nested dependencies. M0 established the Pi-like center: model protocol, kernel
          loop, tools, events, task schema, policy decisions, and a local exit gate. This M1 moves
          into the operator plane—sessions, policy compilation, evaluation, a terminal view, and CI.
        </p>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Layer in the plan</th>
                <th>Public state at M1</th>
                <th>Later proof</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Minimal kernel</th>
                <td>Typed local loop, FakeModel, tools, budgets, events.</td>
                <td>Live provider adapter after sandbox and eval credibility.</td>
              </tr>
              <tr>
                <th scope="row">Operator plane</th>
                <td>SQLite sessions, compiled policy, eval runner, viewer, CI.</td>
                <td>Web task board, telemetry, approvals, restore.</td>
              </tr>
              <tr>
                <th scope="row">Protocol membrane</th>
                <td>MCP and ACP TypeScript shapes only.</td>
                <td>Live MCP client and ACP server.</td>
              </tr>
              <tr>
                <th scope="row">Execution substrate</th>
                <td>Local CLI; service packages still report not ready.</td>
                <td>Per-run container, scoped mounts, default-deny network.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          This ordering preserves the bootstrapping rule from the plan: the current version builds
          the next version on a task branch, produces reviewable evidence, and leaves the previous
          version intact until the change is accepted. M1 implements a local approximation of that
          cycle; verified pull-request delivery and an isolated sandbox are still ahead.
        </p>
      </section>

      <section id="dogfood-chain">
        <p className="eyebrow">03 / FIVE DOGFOODED TASKS</p>
        <h2>Each capability was built through the contract it was improving.</h2>
        <p>
          The Pi session created a manifest and task branch for each workstream, ran tests and the
          exit gate, generated a report, then continued from that branch. The five implementation
          branches formed one linear chain and were fast-forwarded into <code>main</code>. A final
          documentation commit marked M1 complete.
        </p>
        <CodeBlock code={branchChain} label="Public M0 → M1 commit chain" language="text" />
        <ol className="commit-list">
          {publicCommits.map((item) => (
            <li key={item.id}>
              <a href={item.href} rel="external">
                <code>{item.id}</code>
              </a>
              <span>{item.text}</span>
            </li>
          ))}
        </ol>
        <p>
          From the M0 baseline to the verified M1 commit, the chain changes 41 files and adds 40
          tests. The generated <code>tasks/runs/*.json</code> reports and SQLite databases are
          intentionally ignored, so the public source proves the implementation and manifests—not
          the five private local run artifacts described by the development transcript.
        </p>
        <OperatorLoopDiagram />
      </section>

      <section id="sqlite-evidence">
        <p className="eyebrow">04 / DURABLE EVENT EVIDENCE</p>
        <h2>SQLite turns a run’s event stream into something the next process can inspect.</h2>
        <p>
          <code>packages/sessions</code> now uses Node’s built-in <code>node:sqlite</code>. A
          session row owns identity and lifecycle state; an events table stores an ordered sequence
          of wire payloads. The API validates a frame through the existing event decoder before
          insertion and after retrieval, so malformed JSON, unknown versions, and unknown event
          types remain typed failures.
        </p>
        <CodeBlock
          code={sqliteSchema}
          label="Session evidence schema (condensed)"
          language="sql"
          sourceHref={source('packages/sessions/src/sqlite.ts', '#L32-L54')}
        />
        <CodeBlock
          code={evidenceWrite}
          label="Validate → sequence → append"
          language="typescript"
          sourceHref={source('packages/sessions/src/sqlite.ts', '#L79-L131')}
        />
        <p>
          The exit gate emits <code>task.updated</code> and <code>run.recorded</code>, persists
          those same frames, then places the generated session identifier and database path in{' '}
          <code>run-report/v1</code>. The JSON report also carries the wire strings, so it remains
          inspectable even when SQLite persistence fails.
        </p>
        <SqliteEvidenceDiagram />
        <ArticleCallout title="Durable is not yet mandatory" tone="warning">
          <p>
            This is an append-oriented API with a documented one-writer assumption, not an immutable
            database. Sequence allocation uses <code>MAX(seq) + 1</code>; the CLI never closes a
            successful session; and a persistence failure adds <code>SESS_PERSIST_FAILED</code> to
            the report without turning a passed gate into a failure. M1 makes evidence persistent
            when the write succeeds, but it does not yet make durable evidence a merge invariant.
          </p>
        </ArticleCallout>
      </section>

      <section id="operator-view">
        <p className="eyebrow">05 / OPERATOR VIEW</p>
        <h2>The “TUI” is intentionally a small terminal evidence viewer.</h2>
        <p>
          <code>apps/tui</code> replaces its placeholder with <code>harness-view</code>. The command
          lists stored sessions, shows ordered events with stable columns, or opens a JSON report
          and renders its metadata, deliverables, and decoded event stream. ANSI color is enabled
          only for an appropriate terminal and can be disabled; the formatting layer itself is pure
          and golden-testable.
        </p>
        <CodeBlock
          code={viewerCommands}
          label="Operator commands"
          language="shell"
          sourceHref={source('apps/tui/src/view.ts', '#L183-L224')}
        />
        <dl className="article-definitions">
          <div>
            <dt>list</dt>
            <dd>Session ID, task, status, event count, and creation time.</dd>
          </div>
          <div>
            <dt>show</dt>
            <dd>One stored stream, with range and raw-frame options.</dd>
          </div>
          <div>
            <dt>report</dt>
            <dd>Validated run metadata, delivery fields, and embedded event evidence.</dd>
          </div>
        </dl>
        <p>
          “Read-only” describes the command surface: it offers no mutation or execution command. It
          is not a full-screen interactive terminal application, and the <code>show</code> path
          currently opens SQLite through the schema-initializing read/write helper. A strict
          read-only database connection would make the implementation match the product claim more
          closely.
        </p>
      </section>

      <section id="golden-eval">
        <p className="eyebrow">06 / FIRST GOLDEN EVALUATION</p>
        <h2>The first eval checks observable behavior, not private kernel structure.</h2>
        <p>
          The new runner loads a task manifest and a YAML scenario, scripts <code>FakeModel</code>,
          fixes timestamps and identifiers, then calls the real <code>runAgent</code> kernel. Event
          assertions use the documented <code>data.&lt;path&gt;</code> shape and match an ordered
          subsequence. Unknown event types and malformed invariant keys fail during scenario
          decoding.
        </p>
        <CodeBlock
          code={goldenScenario}
          label="evals/scenarios/kernel-0001-golden.yaml"
          language="yaml"
          sourceHref={source('evals/scenarios/kernel-0001-golden.yaml')}
        />
        <GoldenScenarioDiagram />
        <CodeBlock code={evalResult} label="Independent evaluation result" language="text" />
        <ArticleCallout title="Calibration seed, not eval credibility" tone="warning">
          <p>
            This one scenario uses one scripted model response, no tools, no live provider, and no
            checked-out golden repository. CI runs it without <code>--report</code>, so optional
            report assertions are not exercised there. It proves that the deterministic kernel
            contract can be measured. M2 owns representative repositories, the SDK-level DSL, and
            enough cases to support broader quality claims.
          </p>
        </ArticleCallout>
      </section>

      <section id="rule-compiler">
        <p className="eyebrow">07 / POLICY RULE COMPILER</p>
        <h2>Manifest patterns now become one reusable decision table.</h2>
        <p>
          M0 rescanned permission strings at each decision. M1 adds <code>compileGlob</code> and{' '}
          <code>compileRules</code>. Each pattern produces an anchored regular-expression source and
          lazily caches its matcher on first use. The longest matching pattern wins; equal lengths
          prefer deny over ask over allow. A configured subject map without a match or fallback is
          closed by default.
        </p>
        <CodeBlock
          code={compiledRules}
          label="Compiled decision contract"
          language="typescript"
          sourceHref={source('packages/policy/src/rules.ts', '#L72-L178')}
        />
        <CompiledPolicyDiagram />
        <p>
          The CLI now asks this compiled table whether its test command may execute. That resolves
          the policy-layer design question; it does not create a process, filesystem, or network
          sandbox. The future sandbox runner is still responsible for enforcing those operating
          system boundaries.
        </p>
        <ArticleCallout title="The documented ask rule is not implemented yet" tone="warning">
          <p>
            <code>SECURITY.md</code> says a headless <code>ask</code> must block unless
            pre-approved. The public CLI only blocks <code>deny</code>; <code>ask</code> currently
            falls through to <code>spawnSync</code>. Successful allow decisions also do not emit{' '}
            <code>policy.decision</code> events. Those are correctness gaps, not properties of the
            compiler itself.
          </p>
        </ArticleCallout>
      </section>

      <section id="ci-gate">
        <p className="eyebrow">08 / CONTINUOUS INTEGRATION</p>
        <h2>GitHub Actions now runs the same evidence path on Node 22.</h2>
        <p>
          One <code>gate</code> job installs from the frozen lockfile, typechecks the workspace,
          runs all tests, runs the first eval, executes <code>kernel-0001</code> through the
          harness, and uploads <code>tasks/runs</code> even after a failed step. Because the harness
          uses <code>pnpm test</code> as its default quality command, the 80-test suite runs once as
          a direct workflow step and once inside the exit gate.
        </p>
        <CodeBlock
          code={ciWorkflow}
          label=".github/workflows/ci.yaml (condensed)"
          language="yaml"
          sourceHref={source('.github/workflows/ci.yaml')}
        />
        <p>
          The hosted{' '}
          <a
            href="https://github.com/saberistic-team/harness-platform/actions/runs/33318967658"
            rel="external"
          >
            CI run at the verified commit
          </a>{' '}
          is green on Node 22. Its{' '}
          <a
            href="https://github.com/saberistic-team/harness-platform/actions/runs/33318967658/artifacts/9734317042"
            rel="external"
          >
            evidence artifact
          </a>{' '}
          contains a JSON report and SQLite database. The workflow log proves 80 passing tests; the
          JSON report omits those numeric totals because ANSI output defeated its summary parser.
        </p>
        <ArticleCallout title="Green workflow ≠ required merge gate" tone="warning">
          <p>
            An August 30 repository audit found no protection on <code>main</code> and no ruleset.
            The job runs and passes, but GitHub does not currently require it before merge. The
            workflow comment correctly tells the operator to enable branch protection; that external
            setting is still the manual step that makes the roadmap wording true.
          </p>
        </ArticleCallout>
        <p>
          There is a second boundary: the CLI’s <code>changedPaths()</code> reads only{' '}
          <code>git status --porcelain</code>. On a clean CI checkout it sees no dirty paths, even
          though the pull request may contain committed changes. Tests and evals exercise the PR
          code, but <code>allowed_paths</code> does not yet compare the PR diff to a base commit.
          This is a regression gate—not a complete per-PR scope gate.
        </p>
      </section>

      <section id="pull-request-evidence">
        <p className="eyebrow">09 / DELIVERY EVIDENCE</p>
        <h2>The report records a supplied pull-request value and refuses to invent one.</h2>
        <p>
          A pull-request workflow constructs its own GitHub URL and passes it through{' '}
          <code>HARNESS_PULL_REQUEST_URL</code>. Local callers can use <code>--pr-url</code>. The
          CLI trims and records that non-empty string; when none exists, a passing run records a
          branch label instead.
        </p>
        <CodeBlock
          code={deliveryEvidence}
          label="Report delivery selection (condensed)"
          language="typescript"
          sourceHref={source('apps/cli/src/run.ts', '#L246-L275')}
        />
        <p>
          This is honest about absence, but it is not proof that the string names a real pull
          request. The field accepts any non-empty value, and the recorded development URLs such as{' '}
          <code>/pull/123</code> were simulations. The public repository had no pull requests at
          verification time. The schema field is camelCase <code>deliverables.pullRequest</code>,
          despite the earlier roadmap shorthand <code>pull_request</code>.
        </p>
      </section>

      <section id="closed-loop">
        <p className="eyebrow">10 / THE COMPLETED LOOP</p>
        <h2>The milestone’s value is composition, not any one package.</h2>
        <p>
          A manifest now drives the local gate. The gate makes a compiled command decision, checks
          the current working tree, runs the quality command, serializes a report, and attempts to
          persist the same event evidence in SQLite. The terminal viewer reads that result. The eval
          runner independently checks the kernel’s observable contract. GitHub Actions composes all
          of those pieces and retains the generated artifacts.
        </p>
        <CodeBlock
          code={`task YAML
   ↓
harness validate / run
   ├── branch label
   ├── dirty working-tree path check
   ├── compiled process.exec decision
   └── pnpm test
          ↓
run-report/v1 JSON + SQLite session
          ↓
harness-view + CI artifact

parallel: scenario YAML + FakeModel → kernel → event invariants`}
          label="M1 implemented data flow"
          language="text"
        />
        <p className="article-lede">
          M0 made the harness capable of saying “passed,” “failed,” or “blocked.” M1 gives that
          answer a memory, a viewer, a calibration case, and a hosted place to run.
        </p>
      </section>

      <section id="debugging">
        <p className="eyebrow">11 / WHAT BROKE</p>
        <h2>The most useful failures tested the boundaries being built.</h2>
        <div className="bug-ledger">
          <article>
            <span>01</span>
            <div>
              <h3>Generated evidence correctly blocked its own task.</h3>
              <p>
                Reusing a temporary repository left run artifacts outside the next manifest’s scope.
                A later CI simulation redirected <code>out.txt</code> inside the repository and was
                blocked again. Fresh fixtures and output outside the worktree fixed the tests; the
                policy gate was doing its job.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Human-readable YAML was not automatically valid YAML.</h3>
              <p>
                Acceptance bullets beginning with Markdown backticks failed parsing, and a dotted
                scenario identifier violated the declared kebab-case schema. The manifests were
                rewritten and the scenario became <code>kernel-0001-golden</code>.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>A pretty shell pipeline hid a failed check.</h3>
              <p>
                An early TUI verification printed success because the pipeline returned{' '}
                <code>tail</code>’s status. The session caught the false positive and reran using
                pipeline status inspection, proving typecheck exit zero and 80 passing tests.
              </p>
            </div>
          </article>
          <article>
            <span>04</span>
            <div>
              <h3>Deterministic rendering exposed small interface mistakes.</h3>
              <p>
                The viewer initially had an invalid terminal import, unchecked arguments, spacing
                mismatches, and a fixture that expected an event it had never created. Pure render
                functions made each correction narrow and testable.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section id="verification">
        <p className="eyebrow">12 / VERIFIED RESULT</p>
        <h2>The public commit passes locally and in hosted CI.</h2>
        <div className="article-metrics" aria-label="Verified Harness Platform M1 metrics">
          <div>
            <strong>5</strong>
            <span>M1 task manifests</span>
          </div>
          <div>
            <strong>80 / 80</strong>
            <span>tests passing</span>
          </div>
          <div>
            <strong>1 / 1</strong>
            <span>golden scenarios</span>
          </div>
          <div>
            <strong>2</strong>
            <span>gate events persisted</span>
          </div>
        </div>
        <CodeBlock
          code={verification}
          label="Independent repository verification"
          language="text"
        />
        <p>
          I reran the locked repository checks from a fresh clone at <code>a596fc5</code>. The host
          globally signs commits, which initially broke seven CLI test fixtures that create
          temporary repositories; disabling inherited signing for that verification command—not
          changing project code—produced the 80/80 result. The canonical GitHub Actions run passed
          in a clean Node 22 environment. A{' '}
          <a
            href="https://github.com/saberistic-team/harness-platform/actions/runs/33318966742"
            rel="external"
          >
            CodeQL run
          </a>{' '}
          is also green, and the API audit found zero open CodeQL alerts.
        </p>
        <p>
          The independent harness run produced one valid JSON report and a SQLite session with two
          events; <code>harness-view list</code>, <code>show</code>, and <code>report</code> all
          returned zero against that evidence. The public CI artifact independently exposes the same
          two-file shape.
        </p>
      </section>

      <section id="limits">
        <p className="eyebrow">13 / CURRENT TRUTH</p>
        <h2>M1 is an inspectable local operator loop, not a production agent platform.</h2>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Boundary</th>
                <th>What exists now</th>
                <th>Next proof</th>
              </tr>
            </thead>
            <tbody>
              {currentTruth.map(([boundary, current, next]) => (
                <tr key={boundary}>
                  <th scope="row">{boundary}</th>
                  <td>{current}</td>
                  <td>{next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ArticleCallout title="Documentation drift is evidence too" tone="warning">
          <p>
            <code>ROADMAP.md</code> and <code>AGENTS.md</code> describe the new M1 state, while
            parts of <code>README.md</code> and <code>ARCHITECTURE.md</code> still describe M0 or
            place the TUI later. The implementation is ahead of those pages. Updating them—and
            fixing the headless <code>ask</code> contradiction in <code>SECURITY.md</code>—should be
            treated as correctness work, not editorial cleanup.
          </p>
        </ArticleCallout>
      </section>

      <section id="files">
        <p className="eyebrow">14 / FILE GUIDE</p>
        <h2>Where to follow the operator loop.</h2>
        <div className="file-guide">
          <article>
            <p className="eyebrow">CONTRACT + GATE</p>
            <h3>Start with the task boundary</h3>
            <ul>
              <li>
                <a href={source('ROADMAP.md', '#L16-L29')} rel="external">
                  M1 roadmap contract
                </a>
              </li>
              <li>
                <a href={source('tasks/m1-ci-gate.yaml')} rel="external">
                  CI task manifest
                </a>
              </li>
              <li>
                <a href={source('apps/cli/src/run.ts')} rel="external">
                  Exit-gate composition
                </a>
              </li>
              <li>
                <a href={source('.github/workflows/ci.yaml')} rel="external">
                  Hosted workflow
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">EVIDENCE</p>
            <h3>Follow a stored run</h3>
            <ul>
              <li>
                <a href={source('packages/sessions/src/sqlite.ts')} rel="external">
                  SQLite session store
                </a>
              </li>
              <li>
                <a href={source('packages/sdk/src/run-report.ts')} rel="external">
                  Run-report schema
                </a>
              </li>
              <li>
                <a href={source('apps/tui/src/view.ts')} rel="external">
                  Viewer commands
                </a>
              </li>
              <li>
                <a href={source('apps/tui/src/render.ts')} rel="external">
                  Pure event renderer
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">EVALUATION</p>
            <h3>Follow the golden kernel</h3>
            <ul>
              <li>
                <a href={source('evals/runner/scenario.ts')} rel="external">
                  M1 scenario schema
                </a>
              </li>
              <li>
                <a href={source('evals/runner/execute.ts')} rel="external">
                  Deterministic executor
                </a>
              </li>
              <li>
                <a href={source('evals/runner/expect.ts')} rel="external">
                  Observable invariant matcher
                </a>
              </li>
              <li>
                <a href={source('evals/scenarios/kernel-0001-golden.yaml')} rel="external">
                  First scenario
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">POLICY</p>
            <h3>Follow a command decision</h3>
            <ul>
              <li>
                <a href={source('packages/policy/src/rules.ts')} rel="external">
                  Rule compiler
                </a>
              </li>
              <li>
                <a href={source('packages/policy/test/rules.test.ts')} rel="external">
                  Compiler semantics tests
                </a>
              </li>
              <li>
                <a href={source('tasks/m1-exec-rules.yaml')} rel="external">
                  Compiler task contract
                </a>
              </li>
              <li>
                <a href={source('SECURITY.md')} rel="external">
                  Intended security boundary
                </a>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">15 / WHAT IS NEXT</p>
        <h2>M2 should make the evidence representative—and tighten what M1 exposed.</h2>
        <ol className="next-list">
          <li>
            <span>01</span>
            <strong>
              Require the hosted gate with a branch ruleset and compare the real PR diff.
            </strong>
          </li>
          <li>
            <span>02</span>
            <strong>
              Block headless ask, close sessions, and decide whether persistence is mandatory.
            </strong>
          </li>
          <li>
            <span>03</span>
            <strong>
              Calibrate against the hello-service golden repository with the DSL in the SDK.
            </strong>
          </li>
          <li>
            <span>04</span>
            <strong>Add the minimal web task board and end-to-end OpenTelemetry wiring.</strong>
          </li>
          <li>
            <span>05</span>
            <strong>Exercise one live MCP client in a separately network-gated CI job.</strong>
          </li>
        </ol>
        <p className="article-lede">
          The harness can now leave evidence about itself. The next milestone is to make that
          evidence difficult to fool, broad enough to compare, and required where it matters.
        </p>
      </section>

      <section id="sources">
        <p className="eyebrow">PRIMARY SOURCES</p>
        <h2>Evidence used for this note.</h2>
        <ul className="source-list">
          <li>
            <a href={`${repository}/tree/${commit}`} rel="external">
              Harness Platform at verified M1 commit {commit.slice(0, 7)}
            </a>
          </li>
          <li>
            <a href={source('ROADMAP.md', '#L16-L29')} rel="external">
              Public M1 contract and M2 roadmap
            </a>
          </li>
          <li>
            <a
              href="https://github.com/saberistic-team/harness-platform/actions/runs/33318967658"
              rel="external"
            >
              Hosted Node 22 CI run
            </a>
          </li>
          <li>
            <a
              href="https://github.com/saberistic-team/harness-platform/actions/runs/33318967658/artifacts/9734317042"
              rel="external"
            >
              Uploaded gate evidence artifact
            </a>
          </li>
          <li>
            <a
              href="https://github.com/saberistic-team/harness-platform/actions/runs/33318966742"
              rel="external"
            >
              Hosted CodeQL run
            </a>
          </li>
          <li>
            <a href="https://nodejs.org/docs/latest-v22.x/api/sqlite.html" rel="external">
              Node 22 SQLite API documentation
            </a>
          </li>
          <li>
            <a
              href="https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches"
              rel="external"
            >
              GitHub protected-branch and required-check documentation
            </a>
          </li>
        </ul>
        <p className="article-source-note">
          The user-supplied Pi transcript and shared planning conversation establish development
          chronology, intent, and the recorded local experiments. Public source at the pinned
          commit, hosted workflow output, and an independent fresh-clone audit establish the
          implementation claims. Simulated pull-request URLs and gitignored local reports are not
          presented as public delivery evidence.
        </p>
      </section>
    </>
  )
}
