import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  EvidenceSurfacesDiagram,
  GoldenEvidenceDiagram,
  M2CommitChainDiagram,
  McpLifecycleDiagram,
} from '@/components/build-notes/HarnessEvalCredibilityDiagrams'

const commit = '8f18f6dce437a9b580d5aa5f52c42f5ab66f05bd'
const baseline = 'a596fc54af8b4581ac9619d01b6ad364cfde25cb'
const repository = 'https://github.com/saberistic-team/harness-platform'
const source = (path: string, anchor = '') => `${repository}/blob/${commit}/${path}${anchor}`

const milestoneContract = `M2 — Eval credibility
├── one deliberately tiny golden HTTP repository
├── scenario YAML validated by @harness/sdk
├── read-only board over manifests + run reports
├── harness events projected into OpenTelemetry
└── initialize-era MCP client over stdio

boundary rules
├── deterministic test execution uses no external MCP server
├── malformed external data becomes a typed error
├── observability is optional and cannot kill a run
└── network compatibility lives in a separate lane`

const branchChain = `a596fc5  M1 operator-loop baseline
   │
ca9d7b7  golden hello-service
   │
01c8048  SDK-owned scenario DSL
   │
abcfded  read-only web task board
   │
4a61be4  event stream → OpenTelemetry
   │
8f18f6d  hardened MCP stdio client + live lane`

const goldenContract = `GET /health
→ 200 application/json
→ { "status": "ok" }

GET /hello/:name
→ 200 application/json
→ { "greeting": "hello <decoded-and-trimmed-name>" }

unknown path → 404 { "error": "not found" }
wrong method on known path → 405 { "error": "method not allowed" }

runtime: Node 22 · node:http · 127.0.0.1 · zero dependencies
test: start on an ephemeral port → fetch real responses → close`

const scenarioBoundary = `const eventInvariant = z
  .object({ type: z.string().min(1) })
  .passthrough()
  .superRefine((value, context) => {
    if (!isEventType(value.type)) typedError(context)

    for (const [key, expected] of Object.entries(value)) {
      if (key === 'type') continue
      if (!key.startsWith('data.')) typedError(context)
      if (!isScalar(expected)) typedError(context)
    }
  })

export function loadScenario(yamlText: string): Scenario {
  return decodeScenario(parseYamlOrThrowTypedError(yamlText))
}

// The eval runner re-exports this SDK vocabulary instead of forking it.`

const boardBoundary = `request
├── method !== GET
│   └── 405: board is read-only
├── /api/board
│   └── re-read + validate every manifest and report
├── /api/tasks/:id
│   └── task + newest-first reports, or typed 404
├── /api/reports/:file
│   ├── reject traversal-shaped names
│   ├── validate run-report/v1
│   └── invalid artifact → typed 422
└── anything else
    └── typed 404

refresh model: explicit browser refresh
not present: writes · polling · websocket · authentication`

const telemetryMap = `session.created  → start harness.session root span
agent.started    → attach task, agent, and model attributes
model.request    → start harness.model.request child span
model.response   → close child + count turns and tokens
tool.call        → start harness.tool.call child span
tool.result      → close child + count calls and status
budget.warning   → counter + audit event on the root span
policy.decision  → audit event on the root span
error            → exception + audit event
agent.stopped    → status + close the run span`

const telemetryConfig = `# absent: no telemetry object, exporter, or network path
pnpm evals

# explicit local console trace
HARNESS_OTEL=1 pnpm evals

# explicit OTLP/HTTP trace + metric exporters
OTEL_EXPORT_OTLP_ENDPOINT=http://127.0.0.1:4318 pnpm evals`

const mcpStateMachine = `type McpClientState =
  | 'idle'
  | 'starting'
  | 'running'
  | 'initializing'
  | 'initialized'
  | 'closing'
  | 'closed'
  | 'failed'

supported revisions
├── 2025-11-25  advertised
├── 2025-06-18  accepted
└── 2025-03-26  accepted

unknown negotiated revision → MCP_UNSUPPORTED_PROTOCOL_VERSION`

const mcpHandshake = `client                                  subprocess
  │  spawn(shell:false, pipes, restricted env)  │
  ├─────────────────────────────────────────────>│
  │  initialize { version, capabilities, info } │
  ├─────────────────────────────────────────────>│
  │<──────────────────────── result { version }  │
  │  notifications/initialized                  │
  ├─────────────────────────────────────────────>│
  │                                              │
  │  tools/list · tools/call · ping (IDs)        │
  ├─────────────────────────────────────────────>│
  │<──────────── out-of-order responses (IDs)    │
  │<──────────────────── server notifications    │
  │                                              │
  │  stdin.end → wait → SIGTERM → wait → SIGKILL│
  └─────────────────────────────────────────────>│`

const failureContract = `bounded input
├── 4 MiB maximum newline-delimited stdout frame
├── 16 KiB retained stderr tail
└── 1,000 remembered IDs for late timed-out responses

typed terminal failures
├── spawn / premature exit / stream / write
├── malformed or uncorrelated JSON-RPC
├── unsupported protocol revision
└── initialize timeout and close timeout

typed precondition failures
├── call before start → MCP_NOT_STARTED
└── call before initialize → MCP_NOT_INITIALIZED; retry is valid

recoverable request failures
├── JSON-RPC tool error
└── ordinary request timeout → cancel + ignore late reply`

const compatibilityLane = `name: mcp live stdio
on:
  workflow_dispatch:
  schedule:
    - cron: "17 3 * * 1"

default pull-request / push lane
└── 19 offline MCP tests · hostile fixture · no reference server

scheduled / manual compatibility lane
├── exact-pinned GitHub Actions, pnpm 10.34.5, Node 22.23.2
├── frozen dedicated lockfile; lifecycle scripts disabled
├── fetch first, then install offline
└── @modelcontextprotocol/server-everything@2026.8.18
    └── initialize → 13 tools → echo → ping`

const verification = `$ pnpm install --frozen-lockfile --ignore-scripts
# 19 workspace projects · lockfile accepted

$ pnpm typecheck
# exit 0

$ pnpm test
Test Files  15 passed (15)
Tests       123 passed (123)

$ pnpm evals
1/1 scenarios passed

$ node --test  # inside hello-service
tests 7 · pass 7 · fail 0

$ for task in tasks/m2-*.yaml; do pnpm harness validate "$task"; done
# 5/5 M2 manifests valid

$ pnpm harness run tasks/m2-mcp-stdio.yaml --branch tasks/m2-mcp-stdio
# status passed · 123/123 · zero changed-path violations

$ pnpm --filter @harness/mcp test:live
protocol 2025-11-25 · 13 tools · echo + ping passed`

const publicCommits = [
  {
    href: `${repository}/commit/ca9d7b7cb6e019e1132abea3d4d880da11fb3f23`,
    id: 'ca9d7b7',
    text: 'A zero-dependency golden HTTP repository, written contract, and seven loopback checks.',
  },
  {
    href: `${repository}/commit/01c804859d709780dcb8364f3df430e96feb9fc9`,
    id: '01c8048',
    text: 'Scenario YAML, typed invariants, and parse failures moved into the shared SDK.',
  },
  {
    href: `${repository}/commit/abcfded1de9a7b1f11091157472fd23cd8fc7cf8`,
    id: 'abcfded',
    text: 'A GET-only local task board over validated manifests and generated reports.',
  },
  {
    href: `${repository}/commit/4a61be487337c3aeb66a78fa136d3fadff36db50`,
    id: '4a61be4',
    text: 'One event bridge tested on rooted kernel runs, plus incomplete exit-gate CLI wiring.',
  },
  {
    href: `${repository}/commit/${commit}`,
    id: '8f18f6d',
    text: 'The hardened stdio lifecycle, 19 offline MCP tests, and locked compatibility lane.',
  },
] as const

const currentTruth = [
  [
    'Golden target',
    'The hello-service has a stable spec and seven real-wire checks.',
    'It sits outside the pnpm workspace, and no committed scenario currently changes or judges it.',
  ],
  [
    'Evaluation breadth',
    'The SDK owns a better language for run, report, and event invariants.',
    'Default CI still runs one deterministic FakeModel scenario with one turn and no tool call.',
  ],
  [
    'Task board',
    'Every request revalidates local files and exposes invalid artifacts instead of hiding them.',
    'It is a local manual-refresh viewer, not an authenticated or real-time control plane.',
  ],
  [
    'Telemetry',
    'A rooted kernel stream becomes tested spans and counters; the eval runner supplies that lifecycle.',
    'The CLI sequence still lacks the session envelope; concurrency and the collector metrics pipeline also remain open.',
  ],
  [
    'MCP transport',
    'The stdio client owns a defensive initialize-era subprocess lifecycle.',
    'It is not wired into the kernel tool registry; remote transports, reconnection, policy mapping, and audit mapping remain future work.',
  ],
  [
    'Live compatibility',
    'A locked local rerun negotiated 2025-11-25, found 13 tools, called echo, and pinged.',
    'The scheduled/manual workflow is configured but has no public GitHub run yet.',
  ],
  [
    'Protocol future',
    'The adapter accepts three initialize-era revisions through 2025-11-25.',
    'The breaking 2026-07-28 stateless lifecycle needs a separate adapter; this client does not silently claim it.',
  ],
  [
    'Platform boundary',
    'M0–M2 form a useful local harness with evidence and one external protocol client.',
    'The ACP service, per-run container sandbox, live provider, and interactive approvals are M3 work.',
  ],
] as const

export function HarnessEvalCredibilityArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / MILESTONE CONTRACT</p>
        <h2>M1 made a run inspectable. M2 makes the evidence more credible.</h2>
        <p className="article-lede">
          Stage 1, Milestone 2 adds a controlled target, one shared evaluation vocabulary, two
          evidence surfaces, and a real external protocol boundary—while keeping the default gate
          deterministic and free of live service dependencies.
        </p>
        <p>
          The owner-supplied development conversation records a handoff after work with Pi, Ollama,
          and a local Qwen model stopped during M2. It does not contain the terminal failure or a
          reliable root cause. The repository and branch state place the work that Codex resumed in
          the final MCP stdio slice. I do not attribute the stop to the model, memory pressure, MCP,
          or any other unrecorded cause.
        </p>
        <CodeBlock
          code={milestoneContract}
          label="Stage 1 / Milestone 2 scope"
          language="text"
          sourceHref={source('ROADMAP.md', '#L31-L46')}
        />
        <ArticleCallout title="Production-shaped, not a production service">
          <p>
            “Hardened” describes the new stdio client’s typed lifecycle, framing, timeouts, process
            cleanup, and hostile-fixture coverage. It is not deployed, remotely reachable, or yet
            connected to the kernel’s internal tool registry.
          </p>
        </ArticleCallout>
      </section>

      <section id="m1-to-m2">
        <p className="eyebrow">02 / FROM M1 TO M2</p>
        <h2>The operator loop had evidence, but little calibration or interoperability.</h2>
        <p>
          At the M1 pin, the harness could persist events, render them in a terminal, run one
          FakeModel scenario, compile process policy, and repeat the exit gate in CI. Its own note
          called that scenario a calibration seed rather than eval credibility. The web app was a
          placeholder, no telemetry connected the event stream to standard tooling, and{' '}
          <code>packages/mcp</code> exported wire schemas without a live client.
        </p>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Boundary</th>
                <th>M1 at {baseline.slice(0, 7)}</th>
                <th>M2 at {commit.slice(0, 7)}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Calibration</th>
                <td>One scripted kernel case.</td>
                <td>Golden HTTP target plus the existing kernel scenario.</td>
              </tr>
              <tr>
                <th scope="row">Scenario contract</th>
                <td>Eval-runner-owned YAML decoder.</td>
                <td>SDK-owned schemas and typed errors.</td>
              </tr>
              <tr>
                <th scope="row">Operator surface</th>
                <td>Terminal viewer.</td>
                <td>Terminal viewer plus local GET-only board.</td>
              </tr>
              <tr>
                <th scope="row">Observability</th>
                <td>Harness event stream only.</td>
                <td>Optional OpenTelemetry projection.</td>
              </tr>
              <tr>
                <th scope="row">MCP</th>
                <td>Validated message shapes.</td>
                <td>Live initialize-era stdio client.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The important design choice is additive. M2 does not replace the event stream with traces,
          the report with a dashboard, or the deterministic fixture with a network dependency. It
          adds standard views and one explicit live-compatibility lane around the same local core.
        </p>
      </section>

      <section id="dogfood-chain">
        <p className="eyebrow">03 / FIVE DOGFOODED TASKS</p>
        <h2>Each credibility claim arrived through its own manifest and linear commit.</h2>
        <p>
          M2 is a five-commit chain from the verified M1 baseline. Each slice has a committed task
          contract with goal, acceptance criteria, path scope, permissions, budget, and delivery
          shape. The task branches were fast-forwarded into <code>main</code>; there were no public
          pull requests in this sequence.
        </p>
        <CodeBlock code={branchChain} label="Public M1 → M2 commit chain" language="text" />
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
          Git records 52 changed files, 5,949 insertions, and 261 deletions from M1 to M2. The
          development chat’s smaller file and line summary does not match that committed range, so
          this note uses the public Git diff. Generated <code>tasks/runs/*.json</code> files and the
          SQLite database remain intentionally ignored; the hosted gate uploads its own evidence
          artifact instead.
        </p>
        <M2CommitChainDiagram />
      </section>

      <section id="golden-repository">
        <p className="eyebrow">04 / GOLDEN REPOSITORY</p>
        <h2>The first calibration target is small enough to know exactly what “correct” means.</h2>
        <p>
          <code>hello-service</code> is a one-file <code>node:http</code> service with no runtime
          dependency. Its <code>SPEC.md</code> fixes the public behavior before an evaluator
          attempts a change: loopback binding, response codes, content type, JSON shape, URL
          decoding, and the distinction between an unknown path and a disallowed method.
        </p>
        <CodeBlock
          code={goldenContract}
          label="hello-service observable contract (condensed)"
          language="text"
          sourceHref={source('evals/golden-repositories/hello-service/SPEC.md', '#L10-L53')}
        />
        <p>
          Its standalone test starts the real server on an ephemeral loopback port and uses{' '}
          <code>fetch</code> to check seven outcomes. That is stronger than unit-testing the handler
          in isolation and intentionally weaker than pretending one toy service represents a
          production repository corpus.
        </p>
        <ArticleCallout
          title="The golden target is not in the default workspace suite"
          tone="warning"
        >
          <p>
            The seven checks pass independently, but <code>hello-service</code> is outside the pnpm
            workspace and the hosted 123-test lane does not run them. More importantly, the one
            committed eval scenario still drives the FakeModel kernel; it does not edit, execute, or
            judge this repository yet.
          </p>
        </ArticleCallout>
        <GoldenEvidenceDiagram />
      </section>

      <section id="scenario-dsl">
        <p className="eyebrow">05 / SHARED SCENARIO LANGUAGE</p>
        <h2>YAML becomes typed public invariants before the runner sees it.</h2>
        <p>
          M1’s scenario decoder lived beside the eval runner. M2 moves the vocabulary into{' '}
          <code>@harness/sdk</code>, next to task-manifest and run-report validation. A scenario can
          assert run status, step and tool counts, final text, budget warnings, ordered event
          subsequences, and an optional exit-gate report status.
        </p>
        <CodeBlock
          code={scenarioBoundary}
          label="Scenario boundary (condensed)"
          language="typescript"
          sourceHref={source('packages/sdk/src/scenario-dsl.ts', '#L32-L206')}
        />
        <p>
          Unknown event types, keys outside <code>type</code> and <code>data.&lt;path&gt;</code>,
          non-scalar expectations, empty <code>expect</code> blocks, and invalid YAML all become a{' '}
          <code>ScenarioParseError</code>. The old eval import surface survives as a re-export, so
          moving ownership does not fork the language or break callers.
        </p>
        <ArticleCallout title="Observable contracts survive refactors">
          <p>
            Event and run-summary assertions describe behavior outside the kernel. They avoid
            pinning a private function layout, which lets implementation internals change without
            rewriting every scenario. Credibility now needs more representative scenarios, not
            deeper coupling to the current kernel.
          </p>
        </ArticleCallout>
      </section>

      <section id="task-board">
        <p className="eyebrow">06 / READ-ONLY TASK BOARD</p>
        <h2>The web surface exposes evidence without becoming a second source of truth.</h2>
        <p>
          <code>apps/web</code> is deliberately plain Node. Each request re-reads task YAML and run
          JSON from disk, validates both through the SDK, groups reports by task, and sorts each
          report list newest first. Invalid manifests and reports appear in dedicated typed arrays;
          they are never silently dropped from the operator’s view.
        </p>
        <CodeBlock
          code={boardBoundary}
          label="Local board request contract"
          language="text"
          sourceHref={source('apps/web/src/serve.ts', '#L9-L129')}
        />
        <p>
          The HTML page and four JSON endpoints are GET-only. Report names cannot contain a slash or
          traversal segment, unknown objects return 404, malformed reports return 422, and any
          non-GET request returns 405. There is no framework, database, mutation endpoint, polling,
          or websocket. “Refresh” means pull the latest files again.
        </p>
        <ArticleCallout title="A viewer, not the M4 control plane" tone="warning">
          <p>
            The board has no authentication, scheduling, task mutation, live run stream, or hosted
            deployment contract. It is a local operator view over artifacts the harness already
            produces—not a claim that distributed task management has shipped.
          </p>
        </ArticleCallout>
      </section>

      <section id="telemetry">
        <p className="eyebrow">07 / OPENTELEMETRY</p>
        <h2>The typed event stream can now speak a standard observability dialect.</h2>
        <p>
          <code>EventBridge</code> is the only module that knows both harness events and
          OpenTelemetry. On a complete kernel stream, <code>session.created</code> starts the root
          span, model requests and tool calls become children, and <code>agent.stopped</code> closes
          the run. Kernel budget and error events attach to that root; policy, task, and run events
          do the same only when they arrive while a root is active. Four counters track model turns,
          model tokens, tool calls, and budget warnings.
        </p>
        <CodeBlock
          code={telemetryMap}
          label="Harness event → telemetry projection"
          language="text"
          sourceHref={source('packages/otel/src/bridge.ts', '#L13-L217')}
        />
        <p>
          The{' '}
          <a href={source('evals/run.ts', '#L117-L147')} rel="external">
            eval runner
          </a>{' '}
          feeds the complete kernel lifecycle into this bridge, so it creates the root and child
          spans above. The{' '}
          <a href={source('apps/cli/src/run.ts', '#L137-L167')} rel="external">
            CLI wiring reaches the same bridge
          </a>{' '}
          but its exit-gate sequence begins with <code>task.updated</code> and never emits{' '}
          <code>agent.stopped</code>. Without <code>session.created</code>, no active root exists,
          so that CLI sequence currently creates no spans or counters. The shared wiring is present;
          an end-to-end CLI trace is not.
        </p>
        <p>
          This still avoids a telemetry-only event model and keeps the original serialized stream
          authoritative. Observer failures are swallowed deliberately: a broken exporter must not
          turn a valid harness run into a failed run.
        </p>
        <CodeBlock
          code={telemetryConfig}
          label="Telemetry stays absent until a sink is selected"
          language="shell"
          sourceHref={source('packages/otel/src/telemetry.ts', '#L65-L169')}
        />
        <p>
          Telemetry is fully off unless the operator opts in. With no environment switch, no
          telemetry instance is created. <code>HARNESS_OTEL=1</code> selects console spans; an OTLP
          endpoint selects HTTP exporters for traces and metrics; an injected exporter and reader
          keep tests in memory. The pinned collector is behind{' '}
          <a href={source('infra/docker/docker-compose.yml', '#L6-L18')} rel="external">
            the <code>otel</code> Compose profile
          </a>{' '}
          and can be started explicitly with{' '}
          <code>
            docker compose -f infra/docker/docker-compose.yml --profile otel up otel-collector
          </code>
          .
        </p>
        <ArticleCallout
          title="Trace support is broader than the bundled collector proof"
          tone="warning"
        >
          <p>
            The in-memory tests prove span shape, status, and counters from a rooted kernel event
            stream. The CLI still prints an export summary after flushing its unrooted exit-gate
            stream, even though that path produces no spans or counters. The committed{' '}
            <a href={source('infra/otel-collector/config.yaml', '#L13-L30')} rel="external">
              collector configuration
            </a>{' '}
            exposes only a traces pipeline, this audit did not boot the Compose service, and one{' '}
            <code>activeSession</code> means a single bridge should not be presented as
            concurrent-run tracing.
          </p>
        </ArticleCallout>
        <EvidenceSurfacesDiagram />
      </section>

      <section id="mcp-stdio">
        <p className="eyebrow">08 / MCP STDIO BOUNDARY</p>
        <h2>The final slice turns message shapes into a defensive subprocess protocol.</h2>
        <p>
          Before M2 finished, <code>@harness/mcp</code> could validate a few wire envelopes but
          could not launch an MCP server. <code>McpStdioClient</code> now owns process startup,
          initialize-era negotiation, newline-delimited JSON-RPC, request correlation, tool
          discovery and calls, notification delivery, timeouts, failure fan-out, and shutdown.
        </p>
        <CodeBlock
          code={mcpStateMachine}
          label="Lifecycle and revision boundary"
          language="typescript"
          sourceHref={`${repository}/tree/${commit}/packages/mcp/src`}
        />
        <p>
          Startup uses <code>shell: false</code>, piped stdio, a dedicated POSIX process group, and
          a small allowlist of launch-safe environment variables unless the caller deliberately
          supplies a complete environment. That matters because a child tool server is a new trust
          boundary; it should not inherit arbitrary tokens merely because the parent process has
          them.
        </p>
        <CodeBlock
          code={mcpHandshake}
          label="Initialize-era stdio sequence"
          language="text"
          sourceHref={source('packages/mcp/src/stdio-client.ts')}
        />
        <p>
          Each request receives a monotonic JSON-RPC identifier and a timeout. Responses may arrive
          out of order because the pending map owns correlation. Fragmented stdout waits for a
          newline; coalesced output becomes individual frames. Server notifications take a separate
          observer path, and observer exceptions cannot corrupt request handling. The client answers
          server <code>ping</code> requests and rejects other server-initiated methods with JSON-RPC{' '}
          <code>-32601</code>.
        </p>
        <CodeBlock
          code={failureContract}
          label="Bounded transport and failure contract"
          language="text"
          sourceHref={source('packages/mcp/src/stdio-client.ts')}
        />
        <p>
          Ordinary request timeout is recoverable: the client drops the pending entry, sends a
          cancellation notification when possible, remembers that identifier, and ignores the late
          response. Initialize timeout is terminal because the negotiated state is unknowable.
          Closing is idempotent and escalates from stdin EOF to <code>SIGTERM</code> and then{' '}
          <code>SIGKILL</code> if the process group refuses to exit.
        </p>
        <McpLifecycleDiagram />
      </section>

      <section id="credibility-loop">
        <p className="eyebrow">09 / TWO VERIFICATION LANES</p>
        <h2>Determinism and real compatibility no longer have to compromise each other.</h2>
        <p>
          Nineteen offline MCP tests, backed by a repository-local hostile fixture, cover envelope
          validation, fragmented and coalesced frames, concurrent out-of-order replies, server
          requests, asynchronous observer failure, JSON-RPC errors, late responses, initialize and
          close races, a broken stdin, secret-shaped environment variables, malformed messages,
          crashes, spawn errors, and an unsupported revision. Once dependencies are installed, test
          execution needs no registry or external MCP reference server.
        </p>
        <CodeBlock
          code={compatibilityLane}
          label="Self-contained tests + network-gated compatibility lane"
          language="yaml"
          sourceHref={source('.github/workflows/mcp-live.yaml', '#L1-L59')}
        />
        <p>
          The separate workflow is manual or scheduled for Monday at 03:17 UTC. It never runs in the
          default pull-request or push lane. Its actions, Node, pnpm, and Everything
          reference-server version are exact-pinned. It fetches the locked graphs, switches to
          offline installation, disables lifecycle scripts, verifies the installed package identity,
          starts it in a temporary directory with a scrubbed environment, discovers tools, calls
          read-only <code>echo</code>, and pings.
        </p>
        <ArticleCallout title="Configured does not mean hosted proof has run" tone="warning">
          <p>
            There is no public GitHub run for <code>mcp-live</code> yet. The successful 13-tool,
            echo, and ping result in this note comes from an independent local run against the
            committed lock—not from the default CI job or a scheduled Actions result.
          </p>
        </ArticleCallout>
        <p>
          This separation follows the 2025 MCP stdio transport: one client-launched subprocess,
          newline-delimited JSON-RPC over stdin/stdout, and logs on stderr. The repository supports
          the initialize family through <code>2025-11-25</code>. MCP’s breaking{' '}
          <a href="https://blog.modelcontextprotocol.io/posts/2026-07-28/" rel="external">
            2026-07-28 stateless lifecycle
          </a>{' '}
          removes that handshake, so the repository names it as a future compatibility adapter
          instead of silently approximating it here.
        </p>
      </section>

      <section id="debugging">
        <p className="eyebrow">10 / WHAT BROKE</p>
        <h2>The handoff exposed the difference between a type surface and a process boundary.</h2>
        <p>
          The shared conversation says only that the local Pi/Qwen work stopped during M2 and asks
          Codex to complete it. Because no failing command or stack trace is present, there is no
          defensible story about a single original bug. The repository does show why the final slice
          was qualitatively harder: it crosses asynchronous process startup, bidirectional streams,
          protocol negotiation, concurrency, timeouts, process groups, and shutdown races.
        </p>
        <ol className="article-steps">
          <li>
            <span>01</span>
            <div>
              <h3>A schema could not own lifecycle</h3>
              <p>
                Valid JSON-RPC shapes did not say when a request was legal, whether initialization
                won a close race, or how a child crash rejects every outstanding operation.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>A stream could not be treated as one message</h3>
              <p>
                One stdout chunk may contain half a frame or several frames. The implementation
                needed a bounded newline buffer before schema validation and routing.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>A timeout could not poison later work</h3>
              <p>
                The client had to reject the caller, cancel when possible, remember the abandoned
                identifier, ignore its late response, and keep unrelated pending requests intact.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>A passing fixture could not prove ecosystem compatibility</h3>
              <p>
                That required one pinned official server—but in a lane whose network and supply
                chain cannot make every pull request nondeterministic.
              </p>
            </div>
          </li>
        </ol>
        <p>
          The test suite became the failure ledger. Instead of claiming those races are impossible,
          it forces each one and asserts the public state or typed error that follows.
        </p>
      </section>

      <section id="verification">
        <p className="eyebrow">11 / VERIFIED RESULT</p>
        <h2>The public gate, a disposable clone, and the live fixture prove different things.</h2>
        <p>
          GitHub’s{' '}
          <a
            href="https://github.com/saberistic-team/harness-platform/actions/runs/33408149721"
            rel="external"
          >
            CI run at the pinned commit
          </a>{' '}
          passed strict typecheck, 15 Vitest files with 123 tests, the one golden-kernel scenario,
          the canonical exit gate, and evidence upload. The parallel{' '}
          <a
            href="https://github.com/saberistic-team/harness-platform/actions/runs/33408152006"
            rel="external"
          >
            CodeQL run
          </a>{' '}
          also passed.
        </p>
        <CodeBlock
          code={verification}
          label="Independent verification at 8f18f6d"
          language="shell"
        />
        <div className="article-metrics" aria-label="Harness M2 verification summary">
          <div>
            <strong>123 / 123</strong>
            <span>workspace tests</span>
          </div>
          <div>
            <strong>7 / 7</strong>
            <span>golden HTTP checks</span>
          </div>
          <div>
            <strong>1 / 1</strong>
            <span>kernel scenario</span>
          </div>
          <div>
            <strong>13 tools</strong>
            <span>locked live fixture</span>
          </div>
        </div>
        <p>
          I repeated typecheck, the full suite, the eval, every M2 manifest validation, and the M2
          exit gate from a disposable clone of <code>{commit.slice(0, 7)}</code>. M2 adds 43 tests
          to the workspace suite—7 SDK, 12 web, 5 OpenTelemetry, and 19 MCP—and another 7 standalone
          hello-service checks. Hosted CI proves the 123 workspace tests, not a combined “130-test”
          lane.
        </p>
        <ArticleCallout title="Evidence classification" tone="success">
          <p>
            Public Git proves the five commits and source. Hosted Actions proves 123 tests,
            typecheck, one eval, the exit gate, and CodeQL. The disposable audit proves the seven
            standalone service checks and repeats the main lane. The live 13-tool result is a local
            compatibility check until the scheduled/manual workflow gets its first public run.
          </p>
        </ArticleCallout>
      </section>

      <section id="limits">
        <p className="eyebrow">12 / CURRENT TRUTH</p>
        <h2>M2 makes stronger evidence possible; it does not finish the platform.</h2>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Area</th>
                <th>What is true now</th>
                <th>What remains</th>
              </tr>
            </thead>
            <tbody>
              {currentTruth.map(([area, now, next]) => (
                <tr key={area}>
                  <th scope="row">{area}</th>
                  <td>{now}</td>
                  <td>{next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The largest boundary is execution. MCP tool descriptions, annotations, inputs, and outputs
          remain untrusted protocol data. <code>@harness/mcp</code> is not imported by the kernel or
          internal tool registry, and no M3 sandbox or approval flow stands behind a discovered
          tool. M2 proves the transport can behave; it does not authorize that transport to act.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">13 / FILE GUIDE</p>
        <h2>The milestone stays readable because each boundary has one obvious home.</h2>
        <div className="file-guide">
          <article>
            <h3>Golden target</h3>
            <ul>
              <li>
                <a href={source('evals/golden-repositories/hello-service/SPEC.md')} rel="external">
                  <code>SPEC.md</code>
                </a>{' '}
                pins observable behavior.
              </li>
              <li>
                <a
                  href={source('evals/golden-repositories/hello-service/server.mjs')}
                  rel="external"
                >
                  <code>server.mjs</code>
                </a>{' '}
                is the zero-dependency target.
              </li>
              <li>
                <a
                  href={source('evals/golden-repositories/hello-service/test/hello.test.mjs')}
                  rel="external"
                >
                  <code>hello.test.mjs</code>
                </a>{' '}
                drives the real wire.
              </li>
            </ul>
          </article>
          <article>
            <h3>Evaluation language</h3>
            <ul>
              <li>
                <a href={source('packages/sdk/src/scenario-dsl.ts')} rel="external">
                  <code>scenario-dsl.ts</code>
                </a>{' '}
                owns schemas and typed failures.
              </li>
              <li>
                <a href={source('evals/runner/scenario.ts')} rel="external">
                  <code>evals/runner/scenario.ts</code>
                </a>{' '}
                preserves the old import surface.
              </li>
            </ul>
          </article>
          <article>
            <h3>Evidence surfaces</h3>
            <ul>
              <li>
                <a href={source('apps/web/src/board.ts')} rel="external">
                  <code>board.ts</code>
                </a>{' '}
                reads and validates artifacts.
              </li>
              <li>
                <a href={source('apps/web/src/serve.ts')} rel="external">
                  <code>serve.ts</code>
                </a>{' '}
                enforces the GET-only HTTP boundary.
              </li>
              <li>
                <a href={source('packages/otel/src/bridge.ts')} rel="external">
                  <code>bridge.ts</code>
                </a>{' '}
                maps events into spans and metrics.
              </li>
            </ul>
          </article>
          <article>
            <h3>MCP boundary</h3>
            <ul>
              <li>
                <a href={source('packages/mcp/src/protocol.ts')} rel="external">
                  <code>protocol.ts</code>
                </a>{' '}
                owns revision and envelope validation.
              </li>
              <li>
                <a href={source('packages/mcp/src/stdio-client.ts')} rel="external">
                  <code>stdio-client.ts</code>
                </a>{' '}
                owns transport and process lifecycle.
              </li>
              <li>
                <a href={source('.github/workflows/mcp-live.yaml')} rel="external">
                  <code>mcp-live.yaml</code>
                </a>{' '}
                isolates network compatibility.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">14 / WHAT IS NEXT</p>
        <h2>M3 moves from credible local evidence to contained services.</h2>
        <ol className="next-list">
          <li>
            <span>01</span>
            <div>
              <h3>Connect MCP through the harness boundary</h3>
              <p>
                Adapt discovered tools into the internal registry, map every execution through
                policy and audit events, add reconnection and remote transports, and implement the
                2026-07-28 lifecycle separately.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Make the golden repository participate</h3>
              <p>
                Add task-to-repository scenarios that edit and verify the calibration target, then
                expand to representative tools, failures, and provider-backed runs.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Build the execution substrate</h3>
              <p>
                M3 owns the ACP agent server, one isolated container per run, scoped mounts,
                default-deny networking, a provider adapter, and interactive approval flows.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Turn configured lanes into retained public evidence</h3>
              <p>
                Run the scheduled MCP workflow, retain its artifact and logs, add the standalone
                golden checks to an explicit CI lane, and make merge protection enforce the gate.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section id="sources">
        <p className="eyebrow">15 / EVIDENCE LEDGER</p>
        <h2>Conversation for chronology; pinned source and reruns for claims.</h2>
        <ul className="source-list">
          <li>
            <a href={`${repository}/tree/${commit}`} rel="external">
              Harness Platform at <code>{commit.slice(0, 7)}</code>
            </a>{' '}
            is the public source pin for every implementation statement.
          </li>
          <li>
            <a href={`${repository}/compare/${baseline}...${commit}`} rel="external">
              M1 → M2 comparison
            </a>{' '}
            proves the five-commit, 52-file milestone range.
          </li>
          <li>
            <a
              href="https://github.com/saberistic-team/harness-platform/actions/runs/33408149721"
              rel="external"
            >
              Hosted CI run 33408149721
            </a>{' '}
            proves the default lane at the pin; its{' '}
            <a
              href="https://github.com/saberistic-team/harness-platform/actions/runs/33408149721/artifacts/9763998676"
              rel="external"
            >
              gate evidence artifact
            </a>{' '}
            contains the generated report and SQLite file. GitHub reports that the artifact expires
            on November 29, 2026, so the durable proof is the run record and pinned source rather
            than that download alone.
          </li>
          <li>
            <a
              href="https://github.com/saberistic-team/harness-platform/actions/runs/33408152006"
              rel="external"
            >
              CodeQL run 33408152006
            </a>{' '}
            is the security-analysis result at the same commit.
          </li>
          <li>
            <a
              href="https://modelcontextprotocol.io/specification/2025-11-25/basic/transports"
              rel="external"
            >
              MCP 2025-11-25 transport specification
            </a>{' '}
            defines the stdio framing and subprocess relationship implemented here.
          </li>
          <li>
            <a href="https://blog.modelcontextprotocol.io/posts/2026-07-28/" rel="external">
              MCP 2026-07-28 release note
            </a>{' '}
            explains the breaking stateless lifecycle that remains outside this adapter.
          </li>
        </ul>
        <p className="article-source-note">
          The owner-supplied shared conversation establishes who resumed the work and the order of
          the handoff. It is not treated as proof for file counts, test results, or protocol
          behavior. Those claims come from the pinned repository, hosted checks, and the independent
          verification recorded above.
        </p>
      </section>
    </>
  )
}
