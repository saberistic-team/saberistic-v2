import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  M3EvidenceLanesDiagram,
  M3ServiceBoundaryDiagram,
  PermissionHandshakeDiagram,
  SandboxBoundaryDiagram,
} from '@/components/build-notes/HarnessPermissionedServicesDiagrams'

const commit = 'defbf7bcf72fc72452b4adc81b099f3fc6c523cf'
const implementation = '6a6141d26754da2ed8bd901bb5bd60b25d2b9ce0'
const baseline = '8f18f6dce437a9b580d5aa5f52c42f5ab66f05bd'
const repository = 'https://github.com/saberistic-team/harness-platform'
const source = (path: string, anchor = '') => `${repository}/blob/${commit}/${path}${anchor}`

const milestoneContract = `M3 — Services
├── agent-server: project-owned ACP over WebSocket
│   └── exactly one kernel run per session
├── sandbox-runner: one Docker container per run
│   ├── allowed_paths become non-widening mounts
│   └── network is none unless policy explicitly allows it
├── models: OpenAI-compatible provider adapter
└── TUI: live events + explicit permission ask flow

default evidence lane
├── real loopback WebSocket
├── injected provider HTTP responses
└── injected argv-only Docker executor

outside the default lane
├── live provider call
└── live Docker run`

const m2ToM3 = `M2                                      M3
────────────────────────────────────    ────────────────────────────────────
MCP stdio client                         ACP WebSocket agent service
message-shape ACP package                versioned request + event contract
read-only terminal viewer                interactive approval client
policy decisions in local flows          kernel pauses on correlated asks
tool interfaces                           reviewed host-tool boundaries
Docker dev environment                   manifest-derived run sandbox
FakeModel protocol                        OpenAI-compatible provider adapter
local evidence surfaces                  redacted SQLite + live event stream`

const protocolSurface = `protocol version: harness/acp/1

request methods
├── initialize
├── session/new
├── session/prompt
├── permission/respond
└── session/cancel

server notification
└── session/event { sessionId, seq, event }

advertised M3 capabilities
├── streaming: true       # ordered event notifications
├── permissioning: true
└── sessions: false       # replay/resume is not implemented`

const sessionContract = `connection
├── initialize exactly once
├── at most 32 total sessions per connection by default
└── every session starts in created

session/prompt
├── atomically changes created → running before the first await
├── rejects a concurrent or second prompt
├── clamps requested budgets to manifest limits
├── streams redacted events with monotonic sequence numbers
└── ends completed | failed | canceled

disconnect or cancel
├── deny every pending permission
├── abort the model/tool path cooperatively
└── wait for in-flight cleanup before server shutdown`

const permissionOrdering = `tool.call
policy.decision            effect = ask
permission.requested       single-use permissionId + callId + sessionId
... kernel is paused; the side effect has not run ...
permission.resolved        decision = allow | deny
tool.result

deny paths
├── explicit no
├── invalid or missing terminal response
├── permission timeout
├── session cancellation
├── WebSocket disconnect
└── missing resolver in a headless run`

const sandboxPlan = `manifest + workspace + command
  → compile process.exec, fs.read, fs.write, network
  → canonicalize every allowed_paths source
  → reject traversal, unsafe wildcard, link, device, socket,
    nested filesystem, missing source, or widened directory scope
  → fingerprint selected mount identity, metadata, and tree shape
  → revalidate immediately before spawn
  → build Docker argv

docker run
  --pull never
  --read-only
  --network <none|bridge>
  --cap-drop ALL
  --security-opt no-new-privileges=true
  --pids-limit 128
  --memory 512m
  --cpus 1
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m
  --user <workspace-owner-uid>:<workspace-owner-gid>`

const networkBoundary = `manifest network decision
├── deny → Docker --network none
├── ask → explicit operator decision
│   ├── deny → none
│   └── allow → bridge
├── allow → ordinary Docker bridge
└── subject-pattern map → reject
    Docker cannot express host-specific egress here without widening access`

const providerBoundary = `construction
├── absolute http:// or https:// base URL
├── plaintext only for loopback
├── credentials require HTTPS
└── model, headers, sizes, and timeout are bounded

one completion
├── POST /chat/completions with stream: false
├── messages + tools + provider options normalized to bounded JSON
├── redirect: error
├── request and response size limits
├── caller cancellation + wall-clock timeout
├── tool calls and finish reason cross-checked
└── usage checked or conservatively estimated

no implicit retry loop: one request remains one observable model turn`

const auditBoundary = `untrusted tool/model value
  → bounded JSON normalization
  → redact credential-shaped keys and inline token patterns
  → schema round-trip the copied harness event
  → append safe event to SQLite
  → emit the same safe event over ACP with sequence number

redaction failure
  → abort the session
  → emit sanitized EVENT_REDACTION_FAILED

This is a deterministic process-boundary guard, not general DLP.`

const verification = `$ git checkout defbf7bcf72fc72452b4adc81b099f3fc6c523cf

$ pnpm test
Test Files  24 passed (24)
Tests       333 passed (333)

$ pnpm typecheck
# exit 0

$ pnpm evals
kernel-0001-golden · 1 step · 5 events · 37 tokens
1/1 scenarios passed

$ pnpm harness validate tasks/m3-services.yaml
valid task manifest: m3-services

public post-merge CI
├── frozen install
├── strict typecheck
├── 333 tests
├── 1/1 golden eval
└── canonical kernel-0001 exit gate`

const currentTruth = [
  [
    'ACP transport',
    'The repository owns a bounded JSON-RPC-over-WebSocket contract and tests it through a real loopback socket.',
    'ACP is project-owned, not proof of compatibility with an external agent-protocol ecosystem.',
  ],
  [
    'Session lifecycle',
    'A session accepts one atomic kernel run; cancellation, duplicate prompts, limits, and shutdown are explicit.',
    'Replay, resume, reconnection, distributed ownership, and scheduling remain M4.',
  ],
  [
    'Permissioning',
    'Ask decisions pause and require one correlated allow; all missing or interrupted responses deny.',
    'There is no multi-party approval policy, delegated operator identity, or remote authorization service.',
  ],
  [
    'Sandbox plan',
    'The manifest becomes a fail-closed Docker argument vector with mount, identity, resource, and cleanup checks.',
    'The default suite injects an executor. It does not launch a real image or prove Docker-daemon isolation.',
  ],
  [
    'Provider adapter',
    'Fifty focused tests cover mapping, hostile payloads, bounds, errors, cancellation, and credential handling.',
    'No live provider was called; model-token streaming and automatic retries are deliberately absent.',
  ],
  [
    'Audit stream',
    'Redacted events are ordered into local SQLite and the live ACP stream from the same service boundary.',
    'The redactor is not general DLP, and local SQLite is not a durable distributed audit service.',
  ],
  [
    'Remote exposure',
    'Loopback is the default; non-loopback binding requires a token and an explicit plaintext acknowledgement.',
    'The service itself does not terminate TLS, and query-token logging must be controlled by the proxy.',
  ],
  [
    'Operational evidence',
    'Hosted CI, CodeQL, fresh offline checks, and one task-specific development gate passed.',
    'There is no live Docker/provider smoke, remote deployment proof, load test, soak test, or capacity number.',
  ],
] as const

export function HarnessPermissionedServicesArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / MILESTONE CONTRACT</p>
        <h2>M3 puts a permissioned service boundary around the agent loop.</h2>
        <p className="article-lede">
          The local kernel can now run behind a typed WebSocket service, pause before side effects,
          accept one correlated operator decision, select a real provider adapter, and route a
          policy-authorized command into a manifest-derived Docker plan.
        </p>
        <p>
          The milestone is not “the agent is now safe in production.” It is a narrower and more
          useful result: the control path from interactive client to model, policy, tool, audit
          event, and cleanup is explicit enough to test adversarially. Live provider calls, live
          containers, remote TLS, session recovery, and capacity evidence remain outside this
          release.
        </p>
        <CodeBlock
          code={milestoneContract}
          label="Stage 1 / Milestone 3 contract (condensed)"
          language="text"
          sourceHref={source('tasks/m3-services.yaml')}
        />
        <ArticleCallout title="One acronym, one local meaning">
          <p>
            <strong>ACP</strong> here means the repository’s own small agent/client protocol,
            versioned as <code>harness/acp/1</code>. The note does not claim interoperability with a
            third-party protocol that happens to use the same initials.
          </p>
        </ArticleCallout>
      </section>

      <section id="m2-to-m3">
        <p className="eyebrow">02 / FROM M2 TO M3</p>
        <h2>M2 made evidence credible. M3 makes one run remotely operable.</h2>
        <p>
          M2 ended with a local kernel, a read-only board, opt-in telemetry, and a hardened MCP
          subprocess client. It deliberately stopped before a long-lived agent service, interactive
          permission negotiation, provider HTTP, or contained execution. M3 adds those seams without
          moving scheduling into the kernel or replacing the typed event stream.
        </p>
        <CodeBlock code={m2ToM3} label="Boundary shift from M2 to M3" language="text" />
        <p>
          The architectural constraint still matters: the kernel remains a library that consumes a
          model, tool registry, budget, policy callbacks, and an event observer. WebSocket, terminal
          interaction, Docker, provider credentials, and SQLite stay outside it. That keeps the loop
          testable and lets each boundary fail without becoming a private kernel feature.
        </p>
        <M3ServiceBoundaryDiagram />
      </section>

      <section id="delivery">
        <p className="eyebrow">03 / ONE CHECKS-GATED DELIVERY</p>
        <h2>
          The whole permission handshake landed as one task contract and one checks-gated pull
          request.
        </h2>
        <p>
          Unlike M1 and M2’s branch chains, M3 is one cohesive implementation commit because the
          server, kernel, sandbox, provider adapter, and TUI share a single permission and execution
          boundary. Commit{' '}
          <a href={`${repository}/commit/${implementation}`} rel="external">
            <code>{implementation.slice(0, 7)}</code>
          </a>{' '}
          was merged through{' '}
          <a href={`${repository}/pull/1`} rel="external">
            pull request #1
          </a>{' '}
          into public <code>main</code> at <code>{commit.slice(0, 7)}</code>.
        </p>
        <div className="article-metrics" aria-label="Harness M3 public change summary">
          <div>
            <strong>65</strong>
            <span>changed files</span>
          </div>
          <div>
            <strong>13,615</strong>
            <span>insertions</span>
          </div>
          <div>
            <strong>352</strong>
            <span>deletions</span>
          </div>
          <div>
            <strong>1 PR</strong>
            <span>merged delivery</span>
          </div>
        </div>
        <p>
          Those numbers come from the public Git comparison from{' '}
          <a href={`${repository}/compare/${baseline}...${commit}`} rel="external">
            M2 to the M3 merge
          </a>
          . The shared development page’s “157 files” summary does not match the committed range, so
          it is not used as release evidence.
        </p>
      </section>

      <section id="acp-service">
        <p className="eyebrow">04 / ACP WEBSOCKET SERVICE</p>
        <h2>A connection negotiates once; a session runs once; events stream in order.</h2>
        <p>
          <code>@harness/acp</code> now owns both the wire schemas and a bounded WebSocket client.
          Initialization requires the exact protocol version plus streaming and permissioning
          capabilities. The server advertises its model names and explicitly reports session replay
          as unavailable.
        </p>
        <CodeBlock
          code={protocolSurface}
          label="Project-owned ACP v1 surface"
          language="text"
          sourceHref={source('packages/acp/src/protocol.ts')}
        />
        <p>
          Requests and responses are strict JSON-RPC objects with bounded UTF-8 fields. The
          transport caps frames, pending requests, queued inbound messages, sessions per connection,
          and the time a created-but-unused session may live. Binary frames, unknown methods,
          invalid event envelopes, duplicate initialization, and unsupported capabilities become
          typed failures.
        </p>
        <CodeBlock
          code={sessionContract}
          label="Agent-server session state (condensed)"
          language="text"
          sourceHref={source('services/agent-server/src/connection.ts')}
        />
        <ArticleCallout title="Streaming means events, not model tokens" tone="warning">
          <p>
            M3 streams ordered <code>session/event</code> notifications. The provider adapter sends
            <code>stream: false</code> to Chat Completions, and the prompt result intentionally does
            not replay the event history. Token streaming and session replay are separate future
            capabilities.
          </p>
        </ArticleCallout>
      </section>

      <section id="permission-loop">
        <p className="eyebrow">05 / PERMISSION HANDSHAKE</p>
        <h2>An ask is now a real pause between intent and side effect.</h2>
        <p>
          Before this milestone, a headless CLI path could execute an <code>ask</code> decision even
          though the security contract said explicit approval was required. M3 moves authorization
          into the kernel’s tool-call path. The policy compiler returns <code>allow</code>,{' '}
          <code>ask</code>, or <code>deny</code>; only <code>ask</code> creates a permission record
          and suspends execution.
        </p>
        <CodeBlock
          code={permissionOrdering}
          label="Canonical permission event order"
          language="text"
          sourceHref={source('EVENTS.md')}
        />
        <p>
          A permission ID is single-use and bound to the session, tool call, action, subject, and
          scope. Duplicate or stale responses are rejected. A run-scoped allow is cached only for
          that matching action and subject, which lets the inner sandbox check reuse an approval
          without turning it into a global grant. A hard deny is never overridable.
        </p>
        <PermissionHandshakeDiagram />
      </section>

      <section id="interactive-tui">
        <p className="eyebrow">06 / INTERACTIVE TUI</p>
        <h2>The viewer becomes a protocol client without becoming a permissive shell.</h2>
        <p>
          <code>harness-view connect</code> validates a <code>ws://</code> or <code>wss://</code>
          endpoint, rejects embedded URL credentials, requires TLS for non-loopback hosts,
          negotiates ACP, creates a session, streams events, and prompts when a permission request
          arrives. Only an explicit <code>y</code> or <code>yes</code> is approval. Non-interactive
          input, EOF, invalid input, confirmation-reader errors, and cancellation all deny.
        </p>
        <CodeBlock
          code={`function isExplicitAllow(answer) {
  if (answer === undefined) return false
  const normalized = answer.trim().toLowerCase()
  return normalized === 'y' || normalized === 'yes'
}

// A non-interactive terminal returns false before reading stdin.`}
          label="Fail-closed terminal confirmation (abridged)"
          language="typescript"
          sourceHref={source('apps/tui/src/interactive.ts')}
        />
        <p>
          The client also checks the stream instead of trusting presentation order. Sequence gaps,
          duplicate event IDs, a permission resolution that disagrees with the submitted decision,
          more than one terminal event, or a final result that conflicts with{' '}
          <code>agent.stopped</code> closes the session as a protocol failure. Terminal control
          characters and connection secrets are sanitized before rendering.
        </p>
      </section>

      <section id="sandbox">
        <p className="eyebrow">07 / DOCKER-PER-RUN BOUNDARY</p>
        <h2>The sandbox refuses rules Docker cannot express without widening them.</h2>
        <p>
          The runner does not invent policy. It compiles the same manifest rules as the rest of the
          harness, asks when required, and converts the effective decisions into an execution plan.
          Exact files and explicit <code>directory/**</code> entries may become writable mounts;
          traversal, absolute paths, unsafe wildcards, links, devices, sockets, nested filesystems,
          missing sources, and directory shapes that would authorize unnamed descendants fail before
          Docker is called.
        </p>
        <CodeBlock
          code={sandboxPlan}
          label="Manifest-to-container plan (condensed)"
          language="shell"
          sourceHref={source('services/sandbox-runner/src/plan.ts')}
        />
        <p>
          The workspace itself is recursively read-only. Writable submounts cannot contain nested
          mounts. The runner fingerprints their identity, metadata, and tree shape, revalidates
          immediately before spawn, rejects root-owned workspaces, isolates the Docker client
          configuration, accepts only a local Unix socket, and does not forward host environment
          secrets or mount the Docker socket into the container.
        </p>
        <CodeBlock
          code={networkBoundary}
          label="Network decision without false precision"
          language="text"
          sourceHref={source('services/sandbox-runner/src/plan.ts')}
        />
        <p>
          Cleanup is part of the result, not a best-effort afterthought. The runner uses its private
          container-ID file when available. If that proof is missing or invalid, a deterministic
          name lookup is removable only when the private lease label matches. The runner emits{' '}
          <code>sandbox.started</code> only after Docker returns with an owned container identifier,
          and <code>sandbox.stopped</code> only after removal is verified. Cleanup uncertainty
          becomes a typed error and deliberately omits the stopped event.
        </p>
        <SandboxBoundaryDiagram />
        <ArticleCallout title="A plan is not a proven production sandbox" tone="warning">
          <p>
            The Docker tests inject an argv-only executor; the default lane never launches a
            container. No reviewed image digest is committed. The Docker daemon, selected image,
            host kernel, and absence of a more privileged concurrent workspace mutator remain
            trusted assumptions.
          </p>
        </ArticleCallout>
      </section>

      <section id="model-adapter">
        <p className="eyebrow">08 / PROVIDER MODEL ADAPTER</p>
        <h2>“OpenAI-compatible” becomes a bounded translation layer, not a fetch wrapper.</h2>
        <p>
          <code>OpenAICompatibleModel</code> implements the existing model protocol without making
          the kernel provider-aware. It normalizes messages, tools, provider options, token limits,
          tool-call arguments, finish reasons, and usage. The service reads credentials only at its
          process boundary; keys, organization IDs, and project IDs never enter ACP requests,
          manifests, events, or sandbox environments.
        </p>
        <CodeBlock
          code={providerBoundary}
          label="OpenAI-compatible request boundary (condensed)"
          language="text"
          sourceHref={source('packages/models/src/openai-compatible.ts')}
        />
        <p>
          The adapter bounds JSON depth and node count, message and tool arrays, request and
          response bytes, stream chunks, identifiers, headers, and endpoint length. It refuses
          plaintext credentials, redirects, legacy <code>function_call</code> responses, malformed
          tool JSON, duplicate call IDs, contradictory finish reasons, and inconsistent usage
          totals. Provider errors are converted to sanitized typed failures with a retained request
          ID when safe.
        </p>
        <ArticleCallout title="Fifty focused adapter tests, zero live provider calls">
          <p>
            The provider suite injects HTTP behavior, so it stays offline. That proves translation,
            bounds, cancellation, and error behavior—not account authentication, endpoint-specific
            quirks, throughput, pricing, or service reliability.
          </p>
        </ArticleCallout>
      </section>

      <section id="audit-boundary">
        <p className="eyebrow">09 / REDACTION AND AUDIT</p>
        <h2>The value persisted to SQLite is the value allowed onto the wire.</h2>
        <p>
          Tool arguments and results are model-controlled data. Before an event crosses the service
          boundary, the event package makes a non-mutating copy, replaces credential-shaped fields
          and common inline secrets, bounds recursive traversal, and round-trips the candidate
          through the event schema. The agent server then starts the SQLite append and emits that
          same safe object as the next ACP notification.
        </p>
        <CodeBlock
          code={auditBoundary}
          label="One safe event for persistence and transport"
          language="text"
          sourceHref={source('packages/events/src/redact.ts')}
        />
        <p>
          Persistence and transport failures abort the session rather than silently dropping audit
          history. With sandboxing enabled, the SQLite file must live outside the mounted workspace,
          so even a broad reviewed path rule cannot hand the container its own audit database.
        </p>
      </section>

      <section id="debugging">
        <p className="eyebrow">10 / WHAT BROKE</p>
        <h2>The hard bugs lived between correct components.</h2>
        <p>
          The shared development record is most useful as chronology: it shows the implementation
          repeatedly passing a focused slice and then failing where two boundaries met. The public
          source, tests, and merged commit remain the authority for what ultimately shipped.
        </p>
        <ol className="article-steps">
          <li>
            <span>01</span>
            <div>
              <h3>Headless ask was not actually fail-closed</h3>
              <p>
                The pre-M3 CLI could execute an ask decision. The fix moved permission resolution
                into the kernel contract, so a missing resolver now denies instead of inheriting an
                interface-specific shortcut.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>“Allow for this run” was not cached for the inner boundary</h3>
              <p>
                The sandbox could prompt twice when it rechecked the same approved{' '}
                <code>process.exec</code> action and subject. A run-scoped key now suppresses only
                that duplicate process ask; filesystem and network decisions remain independent.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Canceling a prompt could leave permission evidence dangling</h3>
              <p>
                Cancellation now resolves every pending permission as deny, aborts cooperatively,
                closes late-opening sockets, and waits for tool cleanup before shutdown finishes.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>A correct path at planning time could change before spawn</h3>
              <p>
                Symlinks, hard links, nested mounts, and identity changes forced a second
                synchronous validation immediately before Docker plus conservative rejection of
                shapes that cannot be represented exactly.
              </p>
            </div>
          </li>
          <li>
            <span>05</span>
            <div>
              <h3>Audit code could itself fail on hostile values</h3>
              <p>
                Deep, cyclic, proxy-backed, BigInt, or oversized tool values could break event
                generation after a side effect. JSON normalization, depth/node/byte limits, and a
                sanitized fatal audit error now close that gap.
              </p>
            </div>
          </li>
          <li>
            <span>06</span>
            <div>
              <h3>The harness blocked its own package-manager metadata</h3>
              <p>
                The first M3 exit-gate attempt saw <code>.pnpm-store/v11/index.db</code> outside the
                manifest scope. The solution redirected pnpm’s store metadata to temporary storage;
                it did not widen <code>allowed_paths</code> to make the gate pass.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section id="verification">
        <p className="eyebrow">11 / VERIFIED RESULT</p>
        <h2>Three evidence classes answer three different questions.</h2>
        <p>
          At the exact public merge commit, a fresh source checkout passed all 333 tests in 24
          files, strict TypeScript, the one deterministic golden scenario, and the M3 manifest
          validator. The suite includes a real loopback WebSocket integration while provider and
          Docker behavior stay behind injected offline boundaries.
        </p>
        <CodeBlock code={verification} label="Verification at the M3 merge" language="shell" />
        <div className="article-metrics" aria-label="Harness M3 verification summary">
          <div>
            <strong>333 / 333</strong>
            <span>workspace tests</span>
          </div>
          <div>
            <strong>24 / 24</strong>
            <span>test files</span>
          </div>
          <div>
            <strong>1 / 1</strong>
            <span>golden scenario</span>
          </div>
          <div>
            <strong>2 workflows</strong>
            <span>CI + CodeQL green</span>
          </div>
        </div>
        <p>
          The public{' '}
          <a href={`${repository}/actions/runs/33419713684`} rel="external">
            post-merge CI run
          </a>{' '}
          repeated frozen installation, typecheck, all tests, the golden eval, and the canonical
          <code>kernel-0001</code> exit gate. The parallel{' '}
          <a href={`${repository}/actions/runs/33419713633`} rel="external">
            CodeQL run
          </a>{' '}
          passed. That scan is useful evidence, not a claim that vulnerabilities are impossible.
        </p>
        <ArticleCallout title="The task-specific report is session evidence" tone="warning">
          <p>
            The M3 development run and pull-request body record a passing{' '}
            <code>pnpm harness run tasks/m3-services.yaml</code> with 333 tests and no changed-path
            violation. Generated <code>tasks/runs/*.json</code> files are intentionally ignored, so
            the exact report is not a durable public artifact. The post-merge hosted job runs the
            canonical kernel task, not the M3 task manifest.
          </p>
        </ArticleCallout>
        <M3EvidenceLanesDiagram />
      </section>

      <section id="limits">
        <p className="eyebrow">12 / CURRENT TRUTH</p>
        <h2>The service boundary is implemented; the operating system around it is not.</h2>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Surface</th>
                <th>What the evidence supports</th>
                <th>What remains open</th>
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
          The right description is <strong>permissioned local agent service boundary</strong>. It is
          not yet a hosted multi-tenant control plane, a production container isolation service, a
          provider benchmark, or a replay-safe distributed agent platform.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">13 / FILE GUIDE</p>
        <h2>The code is large, but each trust boundary has one obvious home.</h2>
        <div className="file-guide">
          <article>
            <h3>Protocol and service</h3>
            <ul>
              <li>
                <a href={source('packages/acp/src/protocol.ts')} rel="external">
                  packages/acp/src/protocol.ts
                </a>{' '}
                — strict JSON-RPC methods, results, events, and bounds.
              </li>
              <li>
                <a href={source('services/agent-server/src/connection.ts')} rel="external">
                  services/agent-server/src/connection.ts
                </a>{' '}
                — one-run sessions, permissions, persistence, and event streaming.
              </li>
              <li>
                <a href={source('services/agent-server/src/websocket.ts')} rel="external">
                  services/agent-server/src/websocket.ts
                </a>{' '}
                — frame, queue, authorization hook, origin, and close behavior.
              </li>
            </ul>
          </article>
          <article>
            <h3>Execution boundary</h3>
            <ul>
              <li>
                <a href={source('services/sandbox-runner/src/mounts.ts')} rel="external">
                  services/sandbox-runner/src/mounts.ts
                </a>{' '}
                — canonicalization, non-widening patterns, and fingerprints.
              </li>
              <li>
                <a href={source('services/sandbox-runner/src/plan.ts')} rel="external">
                  services/sandbox-runner/src/plan.ts
                </a>{' '}
                — policy enforcement and Docker argv construction.
              </li>
              <li>
                <a href={source('services/sandbox-runner/src/runner.ts')} rel="external">
                  services/sandbox-runner/src/runner.ts
                </a>{' '}
                — lifecycle, cancellation, ownership, and cleanup verification.
              </li>
            </ul>
          </article>
          <article>
            <h3>Model and operator</h3>
            <ul>
              <li>
                <a href={source('packages/models/src/openai-compatible.ts')} rel="external">
                  packages/models/src/openai-compatible.ts
                </a>{' '}
                — provider translation, bounds, errors, and credential hygiene.
              </li>
              <li>
                <a href={source('apps/tui/src/interactive.ts')} rel="external">
                  apps/tui/src/interactive.ts
                </a>{' '}
                — connect flow, stream validation, prompt decisions, and cancellation.
              </li>
              <li>
                <a href={source('packages/events/src/redact.ts')} rel="external">
                  packages/events/src/redact.ts
                </a>{' '}
                — deterministic process-boundary redaction.
              </li>
            </ul>
          </article>
          <article>
            <h3>Contracts and proof</h3>
            <ul>
              <li>
                <a href={source('tasks/m3-services.yaml')} rel="external">
                  tasks/m3-services.yaml
                </a>{' '}
                — scope, permissions, budget, and acceptance.
              </li>
              <li>
                <a href={source('SECURITY.md')} rel="external">
                  SECURITY.md
                </a>{' '}
                — trusted inputs, container assumptions, and remote transport limits.
              </li>
              <li>
                <a href={source('EVENTS.md')} rel="external">
                  EVENTS.md
                </a>{' '}
                — permission and sandbox lifecycle ordering.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">14 / WHAT IS NEXT</p>
        <h2>M4 has to turn a safe local session into a recoverable system.</h2>
        <ol className="next-list">
          <li>
            <span>01</span>
            <div>
              <h3>Make session ownership durable</h3>
              <p>
                Move session and event state from file-local SQLite to Postgres with replay-safe
                ownership, idempotent resume, and explicit recovery after process failure.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Schedule work without dissolving Git truth</h3>
              <p>
                Add the control plane, task-state copy, artifact registry, and signed object-storage
                access while keeping the reviewed manifest authoritative.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Prove the real operating lanes</h3>
              <p>
                Retain evidence from a reviewed image, real Docker cleanup, a live provider, remote
                TLS, failure injection, and bounded load before making isolation or capacity claims.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Export an audit trail that survives the service</h3>
              <p>
                Project the append-only event stream into durable object storage without creating a
                second mutable truth or leaking model/tool secrets.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section id="sources">
        <p className="eyebrow">15 / EVIDENCE LEDGER</p>
        <h2>Conversation for chronology; pinned source and reruns for claims.</h2>
        <p>
          The owner-supplied shared conversation establishes the development order, audit findings,
          and the package-store failure. Its private URL and private model deliberation are not part
          of this public note. Claims about shipped behavior come from the pinned Git tree, its
          tests, the merged pull request, hosted checks, and fresh read-only verification.
        </p>
        <ul className="source-list">
          <li>
            <a href={`${repository}/commit/${commit}`} rel="external">
              Public M3 merge commit <code>{commit.slice(0, 7)}</code>
            </a>
          </li>
          <li>
            <a href={`${repository}/compare/${baseline}...${commit}`} rel="external">
              Public M2 → M3 comparison
            </a>
          </li>
          <li>
            <a href={`${repository}/pull/1`} rel="external">
              Pull request #1 — M3: permissioned agent services
            </a>
          </li>
          <li>
            <a href={`${repository}/actions/runs/33419713684`} rel="external">
              Post-merge CI run
            </a>
          </li>
          <li>
            <a href={`${repository}/actions/runs/33419713633`} rel="external">
              Post-merge CodeQL run
            </a>
          </li>
          <li>
            <a href={source('ARCHITECTURE.md')} rel="external">
              Architecture contract at the pinned merge
            </a>
          </li>
          <li>
            <a href={source('SECURITY.md')} rel="external">
              Security model at the pinned merge
            </a>
          </li>
        </ul>
      </section>
    </>
  )
}
