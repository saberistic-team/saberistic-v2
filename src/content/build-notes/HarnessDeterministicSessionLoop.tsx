import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  CanonicalSessionLoopDiagram,
  DurableExecutionFenceDiagram,
  TerminalConvergenceDiagram,
  VersionedContextDiagram,
} from '@/components/build-notes/HarnessDeterministicSessionLoopDiagrams'

const commit = '41af384b6d990c53aefe81e826e59cc33f00c47c'
const head = '8e6bf735a8685f1f1deab63fe691f8df6c434166'
const base = '98924a66628bc66a88093ec6bee05f426f0fea9d'
const currentRoadmapCommit = '9e535b696a742a8aea4b6f1e15a377f3d19a6672'
const repository = 'https://github.com/saberistic-team/harness-platform'
const source = (path: string, anchor = '') => `${repository}/blob/${commit}/${path}${anchor}`
const currentSource = (path: string, anchor = '') =>
  `${repository}/blob/${currentRoadmapCommit}/${path}${anchor}`

const milestoneContract = `M7 — Deterministic minimal session loop

ship
├── one turn with repeated model / pure-tool rounds
├── versioned, immutable message and context snapshots
├── strict model-stream and tool-argument validation
├── tool intent → durable policy → optional permission → execution
├── hard step, cumulative-token, and requested-tool-call budgets
├── per-round model deadlines and cooperative cancellation
└── one terminal-finalization path

preserve
├── append-before-yield and consumer backpressure from M6
├── legacy runAgent()
├── legacy Model.complete() through CompleteModelAdapter
└── additive event decoding

defer
├── operational workspace, file, process, network, or MCP tools
├── live provider evidence
├── multi-turn follow-ups and mid-loop steering
├── context compaction and restart replay
├── exactly-once external effects
└── a CLI or service that self-hosts on this runtime`

const canonicalLoop = `agent.started
turn.started
message.completed  role=user                 revision=1
model.request      contextVersion=1            messageRevision=1
model.response     finishReason=tool_calls
message.completed  role=assistant              revision=2
tool.call          durable intent · no execution yet
policy.decision    allow | ask | deny
permission.requested                         # ask only
permission.resolved                          # ask only
tool.result        after allowed pure execution
message.completed  role=tool                 revision=3
model.request      contextVersion=1            messageRevision=3
message.delta      role=assistant · 0..n
model.response     finishReason=stop
message.completed  role=assistant              revision=4
turn.completed
agent.stopped`

const versionedState = `type VersionedMessageState = Readonly<{
  version: 1
  revision: number
  messages: readonly ChatMessage[]
}>

type VersionedModelContext = Readonly<{
  version: 1
  messageRevision: number
  messages: readonly ChatMessage[]
  tools: readonly ToolDefinition[]
}>

appendMessage(state, message)
  → clones + validates the current snapshot
  → appends a detached frozen message
  → returns revision + 1

buildModelContext(state, tools)
  → returns a detached frozen request snapshot
  → records the exact messageRevision consumed`

const streamContract = `valid provider stream
├── text.delta*                       nonempty · bounded · before tool calls
├── tool.call*                        complete ordered intentions
└── response.completed                first terminal frame ends model pulling

cross-check before canonical tool.call
├── concatenated deltas === completed content, when deltas exist
├── streamed calls === terminal calls by id, name, and JSON value
├── finishReason agrees with tool presence
├── usage counters are safe, finite, and internally consistent
├── call IDs are unique across the turn
└── objects are bounded ordinary data with no accessors or exotic fields

failure
└── RUNTIME_MODEL_STREAM_INVALID → failed terminal path
                                   · no effect from that malformed round`

const toolAdmission = `for each requested tool intention
  1. persist tool.call
  2. find the registered tool
  3. validate a detached JSON argument snapshot

unknown name
  → tool.result { ok: false, code: "TOOL_NOT_FOUND" }
  → tool observation enters context
  → no policy derivation · no permission · no execution

invalid input
  → tool.result { ok: false, code: "TOOL_BAD_INPUT" }
  → tool observation enters context
  → no policy derivation · no permission · no execution`

const executionFence = `durable tool.call
        │
        ▼
validate registered tool + immutable input
        │
        ▼
derive authorization intent
        │
        ▼
require trusted pure boundary · choose allow | ask | deny
        │
        ▼
durable policy.decision
        │
        ├── deny ────────────────→ failed tool.result observation
        │
        └── ask → durable permission.requested
                    → wait for resolver
                    → durable permission.resolved
        │
        ▼ allowed only
execute trusted in-process pure tool
        │
        ▼
durable tool.result → durable tool message → next model context`

const permissionContract = `allow
└── execute only after policy.decision append succeeds

ask
├── persist permission.requested
├── pause without executing
├── resolver allow → persist operator resolution → execute
└── resolver missing, failed, canceled, or deny
    → persist kernel/operator denial when possible → do not execute

run-scoped grant
├── key = action + subject
├── may satisfy a later matching ask in the same run
└── never overrides a later hard deny

no PermissionController
└── a registered pure tool is allowed by runtime.m7.pure`

const runtimeBudgets = `runtime budget                      behavior
──────────────────────────────────  ───────────────────────────────────────────
maxSteps (default 8)                checked before each model request
maxModelTokens (optional)           cumulative prompt + completion usage
maxToolCalls (optional)             counts requested intentions, even invalid

warning threshold                   once per metric at 50% unless forced
over-limit tool intention           tool.call stays durable; no policy/effect
provider token overshoot            response recorded; no next model/tool unit
terminal status                     budget_exceeded

task manifest authoring budget      100,000 model tokens · 200 tool calls
                                    governs development, not runtime defaults`

const cancellationContract = `model wait
├── per-round deadline · default 60,000 ms
├── timeout aborts the request
└── terminal status failed

permission wait / cooperative tool wait
├── cancel, external AbortSignal, or iterator abandonment
└── terminal status canceled

cleanup
├── forward AbortSignal
├── call iterator.return() best-effort
├── wait at most 100 ms for cleanup
└── cannot force code that ignores cancellation

terminal publication
├── turn.completed
└── agent.stopped

append uncertainty
└── never retry a durable append that may already have succeeded`

const taskGate = `id: m7-deterministic-session-loop
goal: deterministic multi-round model and pure-tool execution

allowed_paths:
  - EVENTS.md
  - packages/events/**
  - packages/kernel/**
  - packages/models/**
  - tasks/m7-deterministic-session-loop.yaml

permissions:
  network: deny
  git.push: deny

delivery:
  type: pull_request`

const releaseDelta = `base          ${base}
feature head  ${head}
merge         ${commit}

pull request #6
├── 15 changed files
├── 4,465 insertions
├── 277 deletions
├── 1 implementation commit
└── no dependency or lockfile change`

const verification = `public PR-head evidence · GitHub Actions 33551227339
├── strict TypeScript                         passed
├── test files                               40 / 40
├── workspace tests                          623 / 623
├── M7 runtime cases                          59 / 59
├── golden scenarios                           1 / 1
├── changed paths checked before / after      15 / 15
├── path-policy violations                     0
└── run-report/v2                             passed

post-merge evidence · exact merge ${commit.slice(0, 7)}
├── CI 33551269520                            passed
└── CodeQL workflow 33551268282               passed

unretained local publication audit · exact merge · Node 26.5.0
├── clean-checkout tests                      623 / 623
├── strict TypeScript                         passed
└── golden scenarios                            1 / 1`

const nextRoadmap = `M7       deterministic single-turn session loop              complete
M8–M11  workspace boundary, Local/Docker adapters, five tools planned
M12–M15 steering, compaction, durable replay, restart safety planned
M16–M18 offline runner, authorship attestation, live doctor  planned

later lanes
├── M19–M31  effects, policy, durable sessions, SDK
├── M32–M42  MCP and ACP
├── M43–M58  remote execution, Docker, Kubernetes control plane
├── M59–M66  governed self-release
├── M67–M71  Canvas
└── M72–M76  automation ingress and rehearsal`

const hardeningRecord = `development correction
└── move the M7 patch from a stale pre-M6 checkout
    onto an isolated tree based on exact M6 merge ${base.slice(0, 7)}

adversarial finding 1
├── nested accessor-backed JSON could cross the first normalizer
└── inspect descriptors once; reject accessors, symbols, and exotic arrays

adversarial finding 2
├── terminal event construction could fail before producing a terminal pair
└── centralize finalization; retry only pre-append construction as failed

race hardening
└── exercise cancellation, timeout, iterator cleanup, mutation, and append failure`

const currentTruth = [
  [
    'Session scope',
    'One admitted turn may make multiple sequential model requests and execute multiple registered pure-tool intentions.',
    'There is no general multi-turn follow-up manager, mid-loop steering channel, or production CLI/service path on MinimalAgentRuntime.',
  ],
  [
    'State',
    'Every user, assistant, and tool message advances a version-1 immutable snapshot; each request names the revision it consumed.',
    'M7 does not compact context, load a prior durable checkpoint, or resume a half-finished turn after restart.',
  ],
  [
    'Model boundary',
    'FakeModel and local adapters prove strict text/tool stream validation, aggregation, ordering, deadlines, and failure semantics offline.',
    'No live model provider, provider retry policy, billing-grade token counter, or provider cancellation compliance was exercised.',
  ],
  [
    'Tool boundary',
    'Unknown and invalid calls cannot reach authorization or execution; valid calls require durable intent and authorization first.',
    'Only WeakMap-registered pure tools are in scope. No file, process, workspace, network, secret, MCP, or remote tool is exposed.',
  ],
  [
    'Purity',
    'The registry makes the executable set explicit and testable, and M7 passes an AbortSignal into each trusted implementation.',
    'The pure marker is a trusted in-process capability—not a sandbox, proof of no side effects, or defense against malicious tool code.',
  ],
  [
    'Durability',
    'Intent, policy, and any permission resolution append before execution; observable events append before yield.',
    'EventStore remains injected and tested in memory. A tool.result append can fail after an effect, so M7 does not promise exactly-once execution.',
  ],
  [
    'Budgets',
    'Steps, cumulative reported tokens, and requested tool calls have explicit stopping boundaries and durable warnings.',
    'A provider response can overshoot the remaining token allowance before reporting usage; the runtime prevents the next unit of work.',
  ],
  [
    'Cancellation',
    'Model, permission, and cooperative tool waits receive cancellation; cleanup is bounded and terminal publication is centralized.',
    'External code that ignores AbortSignal cannot be force-killed, and a failed terminal append can leave no complete terminal pair.',
  ],
  [
    'Verification',
    'Public head CI and a local exact-merge publication checkout passed 623 tests, strict types, and one deterministic golden scenario.',
    'Those are correctness checks—not load, throughput, latency, capacity, live-provider, or production-durability evidence.',
  ],
] as const

export function HarnessDeterministicSessionLoopArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / MILESTONE CONTRACT</p>
        <h2>
          M7 turns one durable request into a loop that can reason, act, observe, and continue.
        </h2>
        <p className="article-lede">
          M6 established the narrow runtime boundary: append events before exposing them, let the
          consumer control progress, and keep lifecycle outcomes typed. M7 spends those semantics on
          the first complete agent turn—multiple model rounds joined by strictly admitted,
          policy-fenced pure-tool calls and immutable observations.
        </p>
        <p>
          The milestone is deliberately smaller than “an autonomous coding agent.” It proves the
          control loop itself. A model can request a registered pure function, the runtime can
          validate and authorize it, its result can enter the next context revision, and the model
          can finish—all without giving model output a direct path to files, processes, the network,
          or a live provider.
        </p>
        <CodeBlock
          code={milestoneContract}
          label="Stage 1 / Milestone 7 contract (condensed)"
          language="text"
          sourceHref={source('tasks/m7-deterministic-session-loop.yaml')}
        />
        <ArticleCallout title="M7 RUNS A LOOP; IT DOES NOT SELF-HOST HARNESS" tone="warning">
          <p>
            M7 proves one turn with repeated model and pure-tool rounds. It does not yet give the
            runtime operational workspace tools, durable restart recovery, general follow-up turns,
            context compaction, MCP, live-provider evidence, or a Harness CLI/service entry point.
          </p>
        </ArticleCallout>
      </section>

      <section id="session-loop">
        <p className="eyebrow">02 / MULTI-ROUND LOOP</p>
        <h2>A tool result is not an endpoint; it becomes the next model observation.</h2>
        <p>
          The canonical test uses two model requests. The first asks for a pure tool. The runtime
          records the assistant intention, validates and fences the call, executes only after an
          allowed decision is durable, stores the result, and appends a typed tool message. The
          second request receives that observation and produces the final answer.
        </p>
        <CanonicalSessionLoopDiagram />
        <CodeBlock
          code={canonicalLoop}
          label="Canonical successful two-round order"
          language="text"
          sourceHref={source('EVENTS.md')}
        />
        <p>
          Zero or more assistant deltas may appear before each completed response. Calls are
          processed sequentially, not in parallel. <code>agent.started</code> and{' '}
          <code>agent.stopped</code> bookend exactly one <code>turn.started</code> and one{' '}
          <code>turn.completed</code> outcome when terminal appends succeed. A text-only answer is
          the same structure with the tool segment omitted.
        </p>
      </section>

      <section id="versioned-state">
        <p className="eyebrow">03 / VERSIONED CONTEXT</p>
        <h2>Every request can name the exact immutable message history it consumed.</h2>
        <p>
          M7 introduces explicit version-one message state and model context. A prior context starts
          at a revision equal to its validated message count. Appending the new user message,
          assistant intention, tool observation, and final assistant response advances the revision
          one step at a time. Each <code>model.request</code> records both{' '}
          <code>contextVersion</code> and <code>messageRevision</code>.
        </p>
        <VersionedContextDiagram />
        <CodeBlock
          code={versionedState}
          label="Versioned state and request snapshot contract (condensed TypeScript)"
          language="typescript"
          sourceHref={source('packages/kernel/src/state.ts')}
        />
        <p>
          These are detached deep snapshots, not frozen wrappers around caller-owned references. The
          normalizer rejects getters and setters, symbols, cycles, named properties on arrays,
          non-finite numbers, excessive depth, excessive node counts, and values over their byte
          bounds. That hardening prevents a model, consumer, permission callback, or tool from
          mutating the data that a later boundary believes it authorized.
        </p>
        <ArticleCallout title="CONTEXT.COMPACTED STILL DESCRIBES FUTURE BEHAVIOR" tone="note">
          <p>
            The event schema exists, but M7 never produces a compacted context or summary. Message
            history grows within its limits for this turn; compaction remains a later milestone.
          </p>
        </ArticleCallout>
      </section>

      <section id="stream-validation">
        <p className="eyebrow">04 / MODEL STREAM INTEGRITY</p>
        <h2>
          Provider output must agree with itself before it can become an executable intention.
        </h2>
        <p>
          The model protocol now has three frames: text delta, complete tool call, and completed
          response. The runtime aggregates text, buffers tool intentions, and cross-checks both
          against the terminal response. It rejects a missing terminal, text after tool calls,
          mismatched content, mismatched call arrays, reused IDs, impossible finish reasons,
          malformed usage, accessor-backed values, and oversized structures. The first{' '}
          <code>response.completed</code> ends model pulling, so a provider frame queued after it is
          not inspected or described as a duplicate-terminal rejection.
        </p>
        <CodeBlock
          code={streamContract}
          label="M7 provider-stream admission"
          language="text"
          sourceHref={source('packages/kernel/src/runtime.ts')}
        />
        <p>
          The existing completion API remains usable. <code>CompleteModelAdapter</code> emits each
          already-complete tool intention followed by one terminal response; it does not fabricate
          token deltas. Native adapters keep their real stream. The entire M7 verification lane uses
          FakeModel or local deterministic adapters—never a production model endpoint.
        </p>
      </section>

      <section id="tool-admission">
        <p className="eyebrow">05 / TOOL ADMISSION</p>
        <h2>Unknown and invalid calls become observations, never authorization questions.</h2>
        <p>
          The canonical <code>tool.call</code> event means “the model requested this intent,” not
          “the runtime already executed it.” After that intent is durable, the runtime resolves the
          registered definition and validates a detached argument snapshot. Only a known call with
          valid input can reach policy.
        </p>
        <CodeBlock
          code={toolAdmission}
          label="Unknown and invalid tool branches"
          language="text"
          sourceHref={source('packages/kernel/src/runtime.ts')}
        />
        <p>
          A typed failed result is intentionally returned to the conversation. The model may recover
          in a later round instead of losing the entire turn. Tool exceptions and invalid tool
          outputs follow the same observation pattern with their own error codes, while an
          unpersisted intent cannot progress at all.
        </p>
      </section>

      <section id="execution-fence">
        <p className="eyebrow">06 / DURABLE EXECUTION FENCE</p>
        <h2>The intent and the authorization record exist before the effect begins.</h2>
        <p>
          M7 extends M6&apos;s append-before-yield discipline across the tool boundary. It stores
          the requested call, validates input, lets the tool derive its authorization intent,
          requires the trusted pure marker, and then chooses the built-in or injected decision. It
          stores <code>policy.decision</code> and any interactive permission resolution before
          invoking the implementation. If any pre-effect append fails, execution is prevented.
        </p>
        <DurableExecutionFenceDiagram />
        <CodeBlock
          code={executionFence}
          label="Policy-before-effect sequence"
          language="text"
          sourceHref={source('packages/kernel/src/runtime.ts')}
        />
        <ArticleCallout title="THE INTENT IS DURABLE BEFORE THE EFFECT" tone="success">
          <p>
            A later audit can distinguish what the model requested, what policy decided, what an
            operator resolved, and what the tool returned. The runtime never treats execution as
            evidence that authorization must have happened.
          </p>
        </ArticleCallout>
        <ArticleCallout title="PURE IS A TRUSTED BOUNDARY, NOT A SANDBOX" tone="warning">
          <p>
            Executable M7 tools must carry the registry&apos;s WeakMap-backed pure marker, but they
            still run in the Harness process. That marker is an explicit trust decision—not static
            proof, operating-system isolation, or permission to expose arbitrary third-party code.
          </p>
        </ArticleCallout>
      </section>

      <section id="permissions">
        <p className="eyebrow">07 / PERMISSION SEMANTICS</p>
        <h2>Allow, ask, and deny remain explicit even when the tool is pure.</h2>
        <p>
          A valid pure call can be allowed, denied, or paused for a resolver. When no permission
          controller is supplied, a registry-marked pure tool receives the built-in{' '}
          <code>runtime.m7.pure</code> allow decision. An ask path persists the request before
          waiting and persists its resolution before executing. A hard deny cannot be overridden. A
          missing or failed resolver fails closed. Resolver decisions are attributed to the
          operator; synthetic denials remain attributed to the kernel.
        </p>
        <CodeBlock
          code={permissionContract}
          label="Permission and run-scoped grant behavior"
          language="text"
          sourceHref={source('packages/kernel/src/runtime.ts')}
        />
        <p>
          An allowed ask may create a run-scoped grant keyed by action and subject, so a later
          matching call does not ask twice. The cache is deliberately smaller than a global
          approval: it ends with the run, and a later hard deny still wins.
        </p>
      </section>

      <section id="budgets">
        <p className="eyebrow">08 / HARD BUDGETS</p>
        <h2>The loop stops at model-round, reported-token, and requested-call boundaries.</h2>
        <p>
          Runtime budgets are part of execution control, not advisory telemetry. Steps are checked
          before a model request; requested tool intentions count even when unknown or invalid; and
          prompt plus completion usage accumulates across rounds. Warnings are durable and normally
          appear once per metric after the 50-percent threshold.
        </p>
        <CodeBlock
          code={runtimeBudgets}
          label="Runtime budget semantics versus task authoring budget"
          language="text"
          sourceHref={source('packages/kernel/src/runtime.ts')}
        />
        <p>
          The remaining token allowance is passed to the next request, but the provider reports
          actual usage only after producing a response. That response can overshoot the remaining
          allowance; M7 records it and blocks the next model or tool unit. An exactly-at-limit stop
          response may complete, while an exactly-at-limit tool response cannot start another
          effect.
        </p>
      </section>

      <section id="cancellation">
        <p className="eyebrow">09 / CANCELLATION AND DEADLINES</p>
        <h2>All stop reasons converge; the runtime cannot force non-cooperative work to stop.</h2>
        <p>
          Every model round gets its own deadline, defaulting to 60 seconds. Cancellation can arrive
          through the runtime control, a caller signal, or iterator abandonment. The runtime
          forwards <code>AbortSignal</code> through model, permission, and tool waits, asks an
          active iterator to return, and gives cleanup 100 milliseconds before finalization
          continues.
        </p>
        <TerminalConvergenceDiagram />
        <CodeBlock
          code={cancellationContract}
          label="Cancellation, timeout, cleanup, and terminal publication"
          language="text"
          sourceHref={source('packages/kernel/src/runtime.ts')}
        />
        <p>
          Successful completion, budget exhaustion, cancellation, timeout, and other failures share
          one finalizer. It attempts <code>turn.completed</code> before <code>agent.stopped</code>.
          A pre-append event-construction failure may retry once as a failed outcome. A durable
          append is never retried because the store may already have accepted it. Persistence
          failure can therefore leave an incomplete terminal pair.
        </p>
      </section>

      <section id="task-gate">
        <p className="eyebrow">10 / MACHINE-READABLE SCOPE</p>
        <h2>The development task allowed runtime, event, and model work—and denied the network.</h2>
        <p>
          The M7 manifest limits the change to <code>EVENTS.md</code>, the events, kernel, and
          models packages, plus the task itself. Network and Git push are denied, commands are
          allowlisted, and the delivery target is a pull request. Its 100,000-model-token and
          200-tool-call authoring budget governs the development agent, not applications using the
          runtime.
        </p>
        <CodeBlock
          code={taskGate}
          label="M7 task manifest (abridged)"
          language="yaml"
          sourceHref={source('tasks/m7-deterministic-session-loop.yaml')}
        />
        <p>
          The retained PR-head report checks the path boundary both before and after tests. All 15
          changed paths remained inside the manifest and the report records zero violations.
        </p>
      </section>

      <section id="delivery">
        <p className="eyebrow">11 / DELIVERY CHRONOLOGY</p>
        <h2>One implementation commit merged quickly, then its automated evidence finished.</h2>
        <p>
          Pull request #6 was created at 19:44:06 UTC on September 1, 2026 and merged 27 seconds
          later as{' '}
          <a href={`${repository}/commit/${commit}`} rel="external">
            <code>{commit.slice(0, 7)}</code>
          </a>
          . The displayed PR CI and CodeQL runs had started but had not finished when the merge
          happened. Both later passed on feature head{' '}
          <a href={`${repository}/commit/${head}`} rel="external">
            <code>{head.slice(0, 7)}</code>
          </a>
          , and separate push workflows passed on the exact merge.
        </p>
        <CodeBlock
          code={releaseDelta}
          label="Authoritative M7 release boundary"
          language="text"
          sourceHref={`${repository}/pull/6/files`}
        />
        <div className="article-metrics" aria-label="Harness M7 public change summary">
          <div>
            <strong>15</strong>
            <span>changed files</span>
          </div>
          <div>
            <strong>4,465</strong>
            <span>insertions</span>
          </div>
          <div>
            <strong>277</strong>
            <span>deletions</span>
          </div>
          <div>
            <strong>1</strong>
            <span>implementation commit</span>
          </div>
        </div>
        <ArticleCallout title="MERGED FIRST, SUBSEQUENTLY VERIFIED" tone="warning">
          <p>
            The public chronology does not support “checks-gated.” No human approval is visible. A
            Copilot review posted after merge with “changes recommended” and a low-severity docs
            mismatch. Its visible comment notes missing optional <code>taskId</code> on{' '}
            <code>agent.started</code> and required <code>agentId</code> on{' '}
            <code>agent.stopped</code>; its summary also mentions optional runtime identity on the{' '}
            <code>tool.call</code> row. Those catalog gaps remain visible on current main.
          </p>
        </ArticleCallout>
      </section>

      <section id="verification">
        <p className="eyebrow">12 / VERIFIED RESULT</p>
        <h2>Adversarial tests exercise the loop’s boundaries, not its capacity.</h2>
        <p>
          PR-head CI subsequently passed 623 tests across 40 files, strict TypeScript, one golden
          scenario, and the two-sided path gate. The pull-request description identifies 59 M7
          runtime cases. They cover multiple rounds, unknown and invalid tools, execution failure,
          malformed streams, mutable and accessor-backed values, permission and model waits,
          cancellation races, deadlines, budgets, append failures, and single-terminal behavior.
        </p>
        <p>
          The development chronology also records two material corrections before that release. An
          early patch was moved from a stale pre-M6 checkout onto an isolated tree based on exact M6
          merge <code>{base.slice(0, 7)}</code>. Adversarial review then found a nested
          accessor-backed JSON gap and a terminal-event construction edge; the final source and
          tests harden both boundaries.
        </p>
        <CodeBlock
          code={hardeningRecord}
          label="M7 development and adversarial-hardening record"
          language="text"
        />
        <p>
          For this publication I created a clean detached checkout of exact merge{' '}
          <code>{commit.slice(0, 7)}</code> under Node 26.5.0. With loopback sockets available, it
          reproduced 623/623 tests, strict TypeScript, and 1/1 golden scenario. This confirms the
          article pin; it does not add a new release, provider run, or operating benchmark. The
          command output is an unretained local publication record, not a public Harness artifact.
        </p>
        <CodeBlock code={verification} label="M7 verification ledger" language="text" />
        <div className="article-metrics" aria-label="Harness M7 verification summary">
          <div>
            <strong>623 / 623</strong>
            <span>workspace tests</span>
          </div>
          <div>
            <strong>40 / 40</strong>
            <span>test files</span>
          </div>
          <div>
            <strong>59 / 59</strong>
            <span>M7 runtime cases</span>
          </div>
          <div>
            <strong>0</strong>
            <span>path violations</span>
          </div>
        </div>
        <ArticleCallout title="59 RUNTIME TESTS ARE NOT A LOAD TEST" tone="warning">
          <p>
            The CI report&apos;s <code>tests.durationMs: 18741</code>, Vitest&apos;s wall time, and
            the publication run&apos;s duration are single verification timings. They do not measure
            model latency, tool throughput, concurrent sessions, memory, capacity, or production
            performance.
          </p>
        </ArticleCallout>
      </section>

      <section id="evidence-artifact">
        <p className="eyebrow">13 / EVIDENCE ARTIFACT</p>
        <h2>The retained gate artifact attests the feature head and has a finite lifetime.</h2>
        <p>
          Workflow{' '}
          <a href={`${repository}/actions/runs/33551227339`} rel="external">
            33551227339
          </a>{' '}
          uploaded <code>gate-evidence-33551227339</code>. Its JSON report pins head{' '}
          <code>{head.slice(0, 7)}</code>, base <code>{base.slice(0, 7)}</code>, 623 passing tests,
          both 15-path decisions, zero violations, and <code>run-report/v2</code> status passed. The
          artifact is retention-bound rather than version-controlled evidence.
        </p>
        <p>
          The report has seven serialized run events. Its accompanying SQLite file contains five
          events and still marks the session active; the final delivered and run-recorded events
          exist only in the JSON report. This note therefore does not call that database a closed
          terminal session log. Exact-merge CI, the public source pin, and the unretained local
          checkout are separate evidence lanes.
        </p>
        <p>
          Both CodeQL analysis jobs completed successfully. GitHub&apos;s{' '}
          <a href={`${repository}/pull/6/checks?check_run_id=100001054681`} rel="external">
            separate PR differential result
          </a>{' '}
          was nevertheless inconclusive because one default-setup configuration was missing, so this
          article makes no “zero vulnerabilities” claim.
        </p>
      </section>

      <section id="limits">
        <p className="eyebrow">14 / CURRENT TRUTH</p>
        <h2>M7 proves local control semantics while leaving operational authority closed.</h2>
        <div
          aria-label="Harness M7 verified and unverified boundaries"
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
          The precise claim is{' '}
          <strong>
            a deterministic, append-fenced, single-turn multi-round loop proven offline with
            FakeModel and registered pure tools
          </strong>
          . It is not a production tool runner, isolated executor, durable resume engine, live model
          integration, multi-user service, or self-hosted Harness.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">15 / FILE GUIDE</p>
        <h2>
          The loop, state, model protocol, evidence, and release contract are all inspectable.
        </h2>
        <div className="file-guide">
          <article>
            <h3>Runtime and immutable state</h3>
            <ul>
              <li>
                <a href={source('packages/kernel/src/runtime.ts')} rel="external">
                  packages/kernel/src/runtime.ts
                </a>{' '}
                — multi-round orchestration, tool and permission fences, budgets, cancellation,
                stream validation, and terminal publication.
              </li>
              <li>
                <a href={source('packages/kernel/src/state.ts')} rel="external">
                  packages/kernel/src/state.ts
                </a>{' '}
                — versioned, detached message state and model-context snapshots.
              </li>
              <li>
                <a href={source('packages/kernel/src/run.ts')} rel="external">
                  packages/kernel/src/run.ts
                </a>{' '}
                — permission and bounded JSON contracts shared with the legacy path.
              </li>
            </ul>
          </article>
          <article>
            <h3>Events and tool boundary</h3>
            <ul>
              <li>
                <a href={source('packages/events/src/schemas.ts')} rel="external">
                  packages/events/src/schemas.ts
                </a>{' '}
                — additive runtime identities, state revisions, tool messages, cumulative usage, and
                step-budget warnings.
              </li>
              <li>
                <a href={source('EVENTS.md')} rel="external">
                  EVENTS.md
                </a>{' '}
                — canonical model/tool loop and permission ordering; its summary table retains the
                post-merge identity-field mismatch described above.
              </li>
              <li>
                <a href={source('packages/tools/src/tool.ts')} rel="external">
                  packages/tools/src/tool.ts
                </a>{' '}
                — the pre-existing trusted registration marker that bounds M7 to pure tools.
              </li>
            </ul>
          </article>
          <article>
            <h3>Model compatibility</h3>
            <ul>
              <li>
                <a href={source('packages/models/src/model.ts')} rel="external">
                  packages/models/src/model.ts
                </a>{' '}
                — provider-neutral messages, calls, usage, context revisions, and stream vocabulary.
              </li>
              <li>
                <a href={source('packages/models/src/model-adapter.ts')} rel="external">
                  packages/models/src/model-adapter.ts
                </a>{' '}
                — legacy completion-to-stream tool-intention adaptation.
              </li>
              <li>
                <a href={source('packages/models/src/fake-model.ts')} rel="external">
                  packages/models/src/fake-model.ts
                </a>{' '}
                — deterministic offline responses used by the proof lane.
              </li>
            </ul>
          </article>
          <article>
            <h3>Behavioral proof and scope</h3>
            <ul>
              <li>
                <a href={source('packages/kernel/test/runtime.test.ts')} rel="external">
                  packages/kernel/test/runtime.test.ts
                </a>{' '}
                — 59 expanded runtime cases covering success, validation, persistence, policy,
                budgets, cancellation, and races.
              </li>
              <li>
                <a href={source('packages/kernel/test/state.test.ts')} rel="external">
                  packages/kernel/test/state.test.ts
                </a>{' '}
                — revision, detachment, immutability, and hostile-object coverage.
              </li>
              <li>
                <a href={source('tasks/m7-deterministic-session-loop.yaml')} rel="external">
                  tasks/m7-deterministic-session-loop.yaml
                </a>{' '}
                — acceptance criteria, allowed paths, permissions, authoring budget, and PR
                delivery.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">16 / WHAT IS NEXT</p>
        <h2>The current roadmap turns this local loop into a governed self-hosting platform.</h2>
        <p>
          A documentation-only follow-up first described M8 through M12. The current public roadmap
          has since decomposed that work through M76. That later planning does not enlarge what M7
          shipped; it makes the remaining boundaries smaller and reviewable.
        </p>
        <CodeBlock
          code={nextRoadmap}
          label="Current post-M7 roadmap (condensed)"
          language="text"
          sourceHref={currentSource('ROADMAP.md')}
        />
        <ol className="next-list">
          <li>
            <span>01</span>
            <div>
              <h3>M8–M11 — bound the workspace and its first five tools</h3>
              <p>
                Define an enforced Workspace contract, add trusted local and disposable Docker
                adapters, then expose only the five bounded development tools in the plan.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>M12–M15 — make interaction and continuity explicit</h3>
              <p>
                Generalize steering and follow-up turns, implement context accounting and
                compaction, wire durable replay, and prove restart-safe continuation.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>M16–M18 — earn self-hosting</h3>
              <p>
                Integrate the native kernel offline, attest authorship and evidence, then prove a
                live cutover rather than declaring self-hosting from unit tests.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>M19–M76 — expand effects and operations in governed lanes</h3>
              <p>
                Policy, durable sessions, MCP/ACP, remote execution, container control planes,
                Kubernetes, self-release, Canvas, and automation each retain their own gates.
              </p>
            </div>
          </li>
        </ol>
        <ArticleCallout title="THE ORDERING FENCE IS NOW THE COMPATIBILITY CONTRACT" tone="success">
          <p>
            Later tools may become operational and later sessions may become durable. They should
            still preserve M7&apos;s central rule: recorded intent and authorization precede an
            effect, and the resulting observation is an immutable input to the next model round.
          </p>
        </ArticleCallout>
      </section>

      <section id="sources">
        <p className="eyebrow">17 / EVIDENCE LEDGER</p>
        <h2>
          Repository and delivery claims resolve to public evidence; local reproduction is labeled.
        </h2>
        <ul className="source-list">
          <li>
            <a href={`${repository}/commit/${commit}`} rel="external">
              M7 merge <code>{commit.slice(0, 7)}</code>
            </a>{' '}
            — the exact public source pin for this article.
          </li>
          <li>
            <a href={`${repository}/pull/6`} rel="external">
              Pull request #6 — deterministic minimal session loop
            </a>{' '}
            — authoritative 15-file diff, one-commit history, merge chronology, checks, and
            post-merge automated review.
          </li>
          <li>
            <a href={source('tasks/m7-deterministic-session-loop.yaml')} rel="external">
              M7 task contract
            </a>{' '}
            and{' '}
            <a href={source('EVENTS.md')} rel="external">
              event-order record
            </a>{' '}
            — acceptance, scope, permissions, multi-round order, and permission semantics.
          </li>
          <li>
            <a href={`${repository}/actions/runs/33551227339`} rel="external">
              PR-head CI and gate artifact
            </a>{' '}
            and{' '}
            <a href={`${repository}/actions/runs/33551224665`} rel="external">
              PR CodeQL workflow
            </a>{' '}
            — subsequently successful checks on <code>{head.slice(0, 7)}</code>, with the CodeQL
            differential caveat stated above.
          </li>
          <li>
            <a href={`${repository}/actions/runs/33551269520`} rel="external">
              Exact-merge CI
            </a>{' '}
            and{' '}
            <a href={`${repository}/actions/runs/33551268282`} rel="external">
              exact-merge CodeQL workflow
            </a>{' '}
            — separate successful push workflows on <code>{commit.slice(0, 7)}</code>.
          </li>
          <li>
            <a href={`${repository}/pull/6#pullrequestreview-5082400995`} rel="external">
              Post-merge Copilot review
            </a>{' '}
            — one unresolved low-severity documentation/schema catalog mismatch; no human approval
            is visible.
          </li>
          <li>
            Unretained local publication audit — a clean detached checkout of the exact merge
            reproduced 623/623 tests, strict TypeScript, and 1/1 golden scenario under Node 26.5.0.
            The shared development conversation supplied chronology and intent only; it is
            intentionally not published as implementation evidence.
          </li>
        </ul>
      </section>
    </>
  )
}
