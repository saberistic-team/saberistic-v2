import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  AppendBeforeYieldDiagram,
  CompatibilityRoadmapDiagram,
  KernelBoundaryDiagram,
  LifecycleDiagram,
} from '@/components/build-notes/HarnessRuntimeContractsDiagrams'

const commit = '98924a66628bc66a88093ec6bee05f426f0fea9d'
const head = '6de0fd70086c7a70c69e07da863cf7677b479f22'
const base = '4bf5f68701dee38eecdc0830c4f1be0d937d3942'
const repository = 'https://github.com/saberistic-team/harness-platform'
const source = (path: string, anchor = '') => `${repository}/blob/${commit}/${path}${anchor}`

const milestoneContract = `M6 — Runtime contracts and event vocabulary

ship
├── AgentRuntime.run() → AsyncIterable<AgentEvent>
├── AgentRuntime.steer() and cancel()
├── streaming ModelAdapter
├── narrow injected EventStore
├── compatibility-target Tool and Workspace interfaces
├── MinimalAgentRuntime
└── CompleteModelAdapter for the existing completion API

prove
├── one successful text-only model request
├── deterministic event order
├── durable append before consumer visibility
├── consumer-driven backpressure
├── typed steering and cancellation lifecycle
└── additive coexistence with the M0 loop

defer
├── policy-gated multi-round tool loop
├── tool execution and workspace wiring
├── context-compaction behavior
├── durable store implementation and restart replay
├── live provider proof
└── self-hosted /doctor task`

const runtimeContract = `interface AgentRuntime {
  run(input: RunInput): AsyncIterable<AgentEvent>
  steer(runId: string, content: string): Promise<void>
  cancel(runId: string): Promise<void>
}

interface ModelAdapter {
  stream(request: ModelRequest): AsyncIterable<ModelEvent>
}

interface EventStore {
  append(event: AgentEvent): Promise<void>
  readSession(sessionId: string): AsyncIterable<AgentEvent>
}`

const successfulFlow = `turn.started
message.completed  role=user
model.request
message.delta      role=assistant · sequence=0..n-1 · zero or more
model.response
message.completed  role=assistant
turn.completed     status=completed`

const eventVocabulary = `new in M6
├── turn.started
├── message.delta
├── message.completed
├── steering.queued
├── context.compacted
└── turn.completed

reused without synonyms
├── model.request
├── model.response
├── tool.call
├── policy.decision
└── tool.result

canonical envelope remains v: 1`

const appendProtocol = `eager admission
  1. append + queue turn.started
  2. append + queue the completed user message
  3. wait until the user message is consumed
  4. append + queue model.request
  5. wait until model.request is consumed, then invoke the model

post-admission model boundaries
  1. pull provider output only after consumer demand
  2. map text.delta → one message.delta boundary
     or response.completed → model.response, assistant message, turn completion
  3. for each canonical runtime boundary, await EventStore.append(event)
  4. only after that append succeeds, yield the runtime event

if append fails
  → poison the writer
  → trigger AbortSignal + best-effort iterator close if model was invoked
  → wake the consumer with EventAppendError
  → emit no later observable boundary`

const modelCompatibility = `legacy path                         streaming path
─────────────────────────────────  ─────────────────────────────────
Model.complete(request)             ModelAdapter.stream(request)
        │                                   │
        └── CompleteModelAdapter ───────────┘

completion-only providers emit
└── one response.completed event

stream normalization
├── discard empty text chunks
├── split chunks larger than 1 MiB
├── preserve concatenated text exactly
└── cap the completed message at 16 MiB`

const lifecycleContract = `steering
├── before the sole model boundary
│   └── append steering.queued before steer() resolves
│       and include it in that request
└── after the model boundary
    └── reject with SteeringClosedError; never orphan intent

cancellation
├── active run → coalesce concurrent requests
├── repeated cancel after canceled → no-op
├── iterator return()/throw() → abandonment becomes cancellation
├── forward AbortSignal to the model adapter
├── terminal append failure → EventAppendError + failed tombstone
└── retain a small terminal tombstone for typed later controls`

const taskGate = `id: m6-kernel-contracts
goal: add the compatibility-first runtime, streaming, event, and lifecycle contracts

allowed_paths:
  - packages/events/**
  - packages/kernel/**
  - packages/models/**
  - ARCHITECTURE.md
  - EVENTS.md
  - tasks/m6-kernel-contracts.yaml

permissions:
  network: deny
  git.push: deny

delivery:
  type: pull_request`

const releaseDelta = `base          ${base}
PR head       ${head}
merge         ${commit}

pull request #5
├── 15 changed files
├── 2,546 insertions
├── 12 deletions
├── 3 implementation commits
└── no dependency or lockfile change`

const verification = `public PR-head evidence · GitHub Actions 33449593023
├── strict TypeScript                         passed
├── test files                               39 / 39
├── offline tests                            568 / 568
├── golden scenarios                          1 / 1
├── allowed paths before and after tests     15
├── path-policy violations                    0
├── run-report/v2                            passed
└── PR-head checks                            4 / 4 green

post-merge evidence · exact merge ${commit.slice(0, 7)}
├── CI 33449750084                           passed
└── CodeQL 33449749513                       passed

independent publication audit · exact merge · Node 24.18.0
├── clean-checkout tests                     568 / 568
├── strict TypeScript                        passed
└── golden scenarios                          1 / 1`

const roadmap = `M6  runtime contracts + event vocabulary      complete
M7  deterministic multi-round session loop   planned
M8  bounded workspace + five tools           planned
M9  steering, follow-ups + compaction         planned
M10 durable replay + restart                  planned
M11 offline kernel-backed self-host runner    planned
M12 live self-hosted Harness doctor           planned`

const currentTruth = [
  [
    'Runtime scope',
    'MinimalAgentRuntime owns one text-only model request, message/context state, canonical event publication, and lifecycle controls.',
    'It does not run tools, make policy decisions, execute a multi-round loop, or replace runAgent().',
  ],
  [
    'Durability order',
    'Every observable event is appended through a serialized per-run writer before it can be yielded.',
    'M6 injects an EventStore interface; it does not add a production database, restart continuation, or replay engine.',
  ],
  [
    'Streaming',
    'Consumer advancement bounds both event delivery and the next pull from the model adapter.',
    'The completion adapter cannot invent provider deltas, and no live provider was exercised.',
  ],
  [
    'Steering',
    'Steering durably linearized before the sole request joins that request; later steering receives a typed rejection.',
    'Follow-up turns and steering between multiple model rounds remain future work.',
  ],
  [
    'Cancellation',
    'Active cancellation coalesces, abandonment attempts one canceled terminal append, and AbortSignal is forwarded at the model boundary when invoked.',
    'A terminal append can fail with EventAppendError and a failed tombstone; a remote provider may also ignore the signal.',
  ],
  [
    'Event vocabulary',
    'M6 validates new turn, message, steering, compaction, and terminal variants while preserving the existing envelope and tool-event names.',
    'context.compacted is a schema contract only; M6 does not choose, generate, or apply summaries.',
  ],
  [
    'Verification',
    'The exact merge passes 568 offline tests, strict type checking, one golden scenario, CI, and CodeQL.',
    'The counts and whole-suite duration are correctness evidence, not load, latency, capacity, or production-readiness evidence.',
  ],
  [
    'Delivery review',
    'The author merged after automated CI and CodeQL checks passed on the PR head; the exact merge passed post-merge checks.',
    'There was no approving review, so the accurate label is checks-gated and author-merged—not peer-reviewed.',
  ],
] as const

export function HarnessRuntimeContractsArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / MILESTONE CONTRACT</p>
        <h2>M6 makes the smallest agent run observable by construction.</h2>
        <p className="article-lede">
          Harness Platform already had a deterministic agent loop, policy, tools, sessions, and a
          growing control plane. M6 starts a compatibility-first migration toward a Pi-like kernel:
          one runtime contract owns model invocation, message state, event publication, steering,
          and cancellation—without pretending the self-hosting journey is finished.
        </p>
        <p>
          The milestone deliberately proves one successful, text-only request. That narrow slice is
          where ordering promises can be made precise: a caller knows the run identity before
          consumption begins; every event is stored before it is seen; the consumer controls when
          the model may advance; and late control requests fail with typed semantics instead of
          silently becoming orphaned intent.
        </p>
        <CodeBlock
          code={milestoneContract}
          label="Stage 1 / Milestone 6 contract (condensed)"
          language="text"
          sourceHref={source('tasks/m6-kernel-contracts.yaml')}
        />
        <ArticleCallout title="M6 IS A CONTRACT LAYER, NOT A SELF-HOSTED AGENT" tone="warning">
          <p>
            M6 does not execute tools, resolve permissions, compact context, resume after restart,
            call a live provider, or run Harness&apos;s own <code>/doctor</code> task. It
            establishes the runtime and event boundaries those later milestones need.
          </p>
        </ArticleCallout>
      </section>

      <section id="roadmap-boundary">
        <p className="eyebrow">02 / ROADMAP BOUNDARY</p>
        <h2>The roadmap was decomposed before the implementation was allowed to grow.</h2>
        <p>
          The development record first explored a larger minimal kernel: model invocation, messages,
          a tool loop, policy, steering, compaction, persistence, and eventually a self-hosted task.
          That is too much semantic surface for one credible milestone. The work was split into M6
          through M12 so each boundary can earn its own tests and release record.
        </p>
        <CodeBlock code={roadmap} label="M6–M12 implementation sequence" language="text" />
        <p>
          Only M6 in that sequence is public and complete. M7 through M12 remain roadmap intent
          until each has its own implementation and evidence. The public M6 task, pull request,
          source, and checks are the authority for this note.
        </p>
      </section>

      <section id="kernel-boundary">
        <p className="eyebrow">03 / KERNEL OWNERSHIP</p>
        <h2>The runtime owns orchestration, then injects every effectful boundary.</h2>
        <p>
          <code>MinimalAgentRuntime</code> owns the caller-known run, session, and turn identities;
          a snapshot of caller input; the in-memory message view used for the request; event
          validation and publication; and the active/terminal lifecycle. Model behavior and event
          persistence enter through narrow ports.
        </p>
        <p>
          Policy, provider credentials, concrete workspace operations, scheduling, UI, and
          side-effect enforcement remain outside. <code>Tool</code> and operational{' '}
          <code>Workspace</code> are compatibility targets in M6, not a route by which the model can
          touch the host.
        </p>
        <KernelBoundaryDiagram />
        <CodeBlock
          code={runtimeContract}
          label="M6 public runtime ports (condensed TypeScript)"
          language="typescript"
          sourceHref={source('packages/kernel/src/runtime.ts')}
        />
      </section>

      <section id="event-vocabulary">
        <p className="eyebrow">04 / EVENT VOCABULARY</p>
        <h2>The completed message is replay truth; deltas are delivery detail.</h2>
        <p>
          A successful run produces a deterministic boundary order. Assistant deltas may be absent,
          but the completed assistant message is always present. That distinction matters because a
          completion-only provider cannot supply genuine token chunks, while a future replay still
          needs one authoritative message.
        </p>
        <CodeBlock
          code={successfulFlow}
          label="Canonical successful M6 event order"
          language="text"
          sourceHref={source('EVENTS.md')}
        />
        <p>
          The event package adds strict schemas for turn start, message delta/completion, queued
          steering, context compaction, and turn completion. Existing model and tool event names
          remain canonical; M6 does not introduce competing synonyms. The envelope stays at version
          one so current readers retain compatibility.
        </p>
        <CodeBlock
          code={eventVocabulary}
          label="Additive event vocabulary"
          language="text"
          sourceHref={source('packages/events/src/schemas.ts')}
        />
        <ArticleCallout title="CONTEXT.COMPACTED IS A CONTRACT, NOT AN IMPLEMENTATION" tone="note">
          <p>
            The schema requires a durable summary and fewer messages; optional before/after token
            counts must be paired and decrease. M6 does not decide when to compact, call a
            summarizer, or rewrite runtime context. Those behaviors remain planned.
          </p>
        </ArticleCallout>
      </section>

      <section id="append-before-yield">
        <p className="eyebrow">05 / DURABILITY ORDER</p>
        <h2>An event cannot become observable before its append succeeds.</h2>
        <p>
          The important M6 invariant is not merely that events are eventually stored. The per-run
          writer serializes normal production with external steering and cancellation, awaits the
          injected store, and only then places the event at the consumer boundary. This makes the
          visible stream a prefix of the accepted evidence rather than a faster, less trustworthy
          side channel.
        </p>
        <p>
          Admission is the deliberate exception to demand-driven production: the runtime eagerly
          appends and queues <code>turn.started</code> plus the completed user message. After the
          consumer accepts that pair, it appends <code>model.request</code> and waits for the caller
          to consume that boundary before invoking the model. Consumer-driven model backpressure
          begins after those durable admission boundaries.
        </p>
        <AppendBeforeYieldDiagram />
        <CodeBlock
          code={appendProtocol}
          label="Append-before-yield and failure protocol"
          language="text"
          sourceHref={source('packages/kernel/src/runtime.ts')}
        />
        <p>
          Backpressure follows the same discipline. Advancing the async iterator permits one event
          to reach the caller and, when appropriate, one more pull from the model. Tests assert that
          a stalled consumer does not let the producer race ahead. A provider{' '}
          <code>text.delta</code> becomes one <code>message.delta</code>; provider{' '}
          <code>response.completed</code> is never persisted or yielded itself, but drives the
          separately persisted <code>model.response</code>, completed assistant message, and turn
          completion. If persistence fails, the writer is poisoned, the consumer receives a typed
          append error, and no later boundary is exposed. If the model has already been invoked, its
          abort signal is triggered; an admission failure occurs before there is a provider request
          to cancel.
        </p>
        <ArticleCallout title="APPEND BEFORE YIELD" tone="success">
          <p>
            The order is the feature: validate → append → yield → wait for the next consumer pull. A
            fast stream that publishes first and repairs evidence later would violate the M6
            contract.
          </p>
        </ArticleCallout>
      </section>

      <section id="model-adapter">
        <p className="eyebrow">06 / MODEL COMPATIBILITY</p>
        <h2>Streaming arrives without deleting the completion-only model API.</h2>
        <p>
          M6 adds <code>ModelAdapter.stream()</code> with only two provider-side event forms:{' '}
          <code>text.delta</code> and <code>response.completed</code>. The existing{' '}
          <code>Model.complete()</code> contract remains available.{' '}
          <code>CompleteModelAdapter</code> bridges it by emitting one terminal response; it does
          not fabricate a token stream that the provider never produced.
        </p>
        <CodeBlock
          code={modelCompatibility}
          label="Completion and streaming compatibility boundary"
          language="text"
          sourceHref={source('packages/models/src/model-adapter.ts')}
        />
        <p>
          The deterministic fake model implements both paths. Empty chunks disappear, chunks over
          one MiB are split without changing their concatenation, and the final text remains bounded
          by the completed-message schema. For M6, a valid terminal response is successful text, no
          tool calls, and <code>finishReason: &quot;stop&quot;</code>.
        </p>
        <ArticleCallout title="ONE TEXT-ONLY REQUEST, ZERO TOOL EXECUTION" tone="warning">
          <p>
            Tool calls may still exist as terminal model response data, but the M6 runtime rejects
            them. The policy-gated, multi-round tool loop belongs to M7; the bounded workspace and
            first five tools belong to M8.
          </p>
        </ArticleCallout>
      </section>

      <section id="lifecycle">
        <p className="eyebrow">07 / STEERING AND CANCELLATION</p>
        <h2>Controls linearize against one explicit request boundary.</h2>
        <p>
          <code>run()</code> synchronously registers the run and snapshots input before returning
          its async iterable. That lets a caller use its own run ID to steer or cancel even before
          the first <code>next()</code>. Early steering is appended before <code>steer()</code>
          resolves and joins the sole model request. Steering after that boundary receives{' '}
          <code>SteeringClosedError</code>; the runtime never acknowledges intent it cannot apply.
        </p>
        <LifecycleDiagram />
        <CodeBlock
          code={lifecycleContract}
          label="M6 lifecycle semantics"
          language="text"
          sourceHref={source('packages/kernel/src/runtime.ts')}
        />
        <p>
          Cancellation coalesces while active. A consumer that calls <code>return()</code> or{' '}
          <code>throw()</code> is treated as abandoning the run, so the runtime still attempts to
          persist a canceled terminal event even when that event will not be observed by the same
          iterator. Small terminal tombstones retain just enough identity to distinguish duplicate,
          missing, and already-terminal controls.
        </p>
      </section>

      <section id="compatibility">
        <p className="eyebrow">08 / ADDITIVE MIGRATION</p>
        <h2>The old loop and the new contract coexist on purpose.</h2>
        <p>
          Replacing a working loop while redefining its persistence and lifecycle semantics would
          turn every regression into an attribution problem. M6 instead exports the new runtime
          beside <code>runAgent()</code>, keeps <code>Model.complete()</code>, and adapts legacy
          models through one named bridge. No dependency or lockfile changes were needed.
        </p>
        <CompatibilityRoadmapDiagram />
        <p>
          This creates a migration seam: existing callers keep the M0 path; new focused tests can
          harden the M6 path; M7 can add the deterministic tool loop without smuggling workspace or
          provider behavior into this milestone. Compatibility is a temporary architecture strategy,
          not a claim that both paths should exist forever.
        </p>
      </section>

      <section id="task-gate">
        <p className="eyebrow">09 / MACHINE-READABLE SCOPE</p>
        <h2>The task admitted runtime contracts, events, model adaptation, and their proof.</h2>
        <p>
          The canonical manifest limited changes to three packages, two architecture documents, and
          the task itself. Network and push were denied; tests remained offline; delivery was a pull
          request. That scope prevented the contract milestone from absorbing provider setup,
          storage deployment, or future tool implementations.
        </p>
        <CodeBlock
          code={taskGate}
          label="M6 task manifest (abridged)"
          language="yaml"
          sourceHref={source('tasks/m6-kernel-contracts.yaml')}
        />
        <p>
          Pull request #5 confirms the gate: 15 paths before tests, the same 15 paths afterward, and
          zero policy violations. The public diff contains the manifest, docs, event schemas and
          tests, model contracts and tests, and the runtime plus its focused test file—nothing
          outside the allowed surface.
        </p>
      </section>

      <section id="delivery">
        <p className="eyebrow">10 / CHECKS-GATED DELIVERY</p>
        <h2>Three implementation commits crossed one verified pull request.</h2>
        <p>
          The release first introduced streaming model contracts, then corrected delta
          normalization, then added the minimal runtime and event vocabulary. The final head{' '}
          <a href={`${repository}/commit/${head}`} rel="external">
            <code>{head.slice(0, 7)}</code>
          </a>{' '}
          passed the manifest exit gate and CodeQL before pull request #5 merged as{' '}
          <a href={`${repository}/commit/${commit}`} rel="external">
            <code>{commit.slice(0, 7)}</code>
          </a>
          .
        </p>
        <CodeBlock
          code={releaseDelta}
          label="Authoritative M6 release boundary"
          language="text"
          sourceHref={`${repository}/pull/5/files`}
        />
        <div className="article-metrics" aria-label="Harness M6 public change summary">
          <div>
            <strong>15</strong>
            <span>changed files</span>
          </div>
          <div>
            <strong>2,546</strong>
            <span>insertions</span>
          </div>
          <div>
            <strong>12</strong>
            <span>deletions</span>
          </div>
          <div>
            <strong>3</strong>
            <span>implementation commits</span>
          </div>
        </div>
        <ArticleCallout title="CHECKS-GATED, NOT PEER-REVIEWED" tone="warning">
          <p>
            The PR record contains no approving review. Its only review entry says the automated
            reviewer could not run because its quota was exhausted. The supported claim is that the
            author merged after CI and CodeQL passed—not that another engineer approved the code.
          </p>
        </ArticleCallout>
      </section>

      <section id="verification">
        <p className="eyebrow">11 / VERIFIED RESULT</p>
        <h2>The tests attack ordering and lifecycle—not throughput.</h2>
        <p>
          PR-head CI passed 568 offline tests across 39 files, strict TypeScript, one golden
          scenario, and the M6 manifest gate. The report recorded <code>run-report/v2</code>, all 15
          paths before and after tests, zero violations, and a successful report write. The exact
          merge then passed separate main-branch CI and CodeQL.
        </p>
        <p>
          For publication, I also checked out the exact merge in a separate temporary clone under
          Node 24.18.0 and reproduced 568/568 tests, strict TypeScript, and the golden scenario.
          That independent run verifies the pin used by this article; it does not create a new
          Harness release or a live infrastructure test.
        </p>
        <CodeBlock code={verification} label="M6 verification ledger" language="text" />
        <div className="article-metrics" aria-label="Harness M6 verification summary">
          <div>
            <strong>568 / 568</strong>
            <span>offline tests</span>
          </div>
          <div>
            <strong>39 / 39</strong>
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
          The new diff adds 33 focused cases: 15 runtime cases, six event-schema cases, seven fake
          streaming-model cases, four completion-adapter cases, and one delta-normalization case.
          They cover exact event order, append failure, one model pull per consumer advance,
          steering, cancellation, iterator abandonment, input snapshots, strict variants, size
          normalization, and typed invalid, duplicate, missing, and terminal controls.
        </p>
        <ArticleCallout title="THE 17.377-SECOND CI FIELD IS NOT A BENCHMARK" tone="warning">
          <p>
            The retained report records <code>tests.durationMs: 17377</code> for the complete test
            command. It is execution evidence for one CI attempt—not model latency, event-store
            throughput, concurrency capacity, load-test output, or a performance improvement.
          </p>
        </ArticleCallout>
      </section>

      <section id="evidence-artifact">
        <p className="eyebrow">12 / EVIDENCE ARTIFACT</p>
        <h2>The retained report attests the PR head, not the merge commit.</h2>
        <p>
          PR workflow{' '}
          <a href={`${repository}/actions/runs/33449593023`} rel="external">
            33449593023
          </a>{' '}
          uploaded <code>gate-evidence-33449593023</code>. Its JSON report pins head{' '}
          <code>{head.slice(0, 7)}</code>, base <code>{base.slice(0, 7)}</code>, the passing tests,
          15-path pre/post policy snapshots, zero violations, seven serialized report events, and{' '}
          <code>reportWritten: true</code>.
        </p>
        <p>
          That artifact expires on November 29, 2026; it is uploaded CI evidence, not a permanent
          Git artifact. Its SQLite file has five persisted events and still marks the session
          active, while the JSON includes the final delivered and run-recorded events. This note
          therefore does not describe the SQLite file as a closed terminal log. Separate post-merge
          workflows attest the exact merge commit.
        </p>
      </section>

      <section id="limits">
        <p className="eyebrow">13 / CURRENT TRUTH</p>
        <h2>M6 has strong local semantics and deliberately incomplete system behavior.</h2>
        <div
          aria-label="Harness M6 verified and unverified boundaries"
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
          The accurate description is{' '}
          <strong>a compatibility-first runtime contract for one text-only request</strong>. It is
          not self-hosting, an autonomous tool runner, durable restart recovery, a production event
          store, a provider integration, or a load-tested service.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">14 / FILE GUIDE</p>
        <h2>The runtime, vocabulary, adapters, and proof each have an inspectable home.</h2>
        <div className="file-guide">
          <article>
            <h3>Runtime and architecture</h3>
            <ul>
              <li>
                <a href={source('packages/kernel/src/runtime.ts')} rel="external">
                  packages/kernel/src/runtime.ts
                </a>{' '}
                — public contracts, MinimalAgentRuntime, serialized writer, stream, controls, and
                typed runtime errors.
              </li>
              <li>
                <a href={source('ARCHITECTURE.md')} rel="external">
                  ARCHITECTURE.md
                </a>{' '}
                — ownership, compatibility, persistence, streaming, and lifecycle boundaries.
              </li>
              <li>
                <a href={source('tasks/m6-kernel-contracts.yaml')} rel="external">
                  tasks/m6-kernel-contracts.yaml
                </a>{' '}
                — acceptance criteria, allowed paths, permissions, budgets, and PR delivery.
              </li>
            </ul>
          </article>
          <article>
            <h3>Events and replay truth</h3>
            <ul>
              <li>
                <a href={source('packages/events/src/schemas.ts')} rel="external">
                  packages/events/src/schemas.ts
                </a>{' '}
                — strict event variants and bounded message, delta, steering, and compaction data.
              </li>
              <li>
                <a href={source('EVENTS.md')} rel="external">
                  EVENTS.md
                </a>{' '}
                — canonical successful order, append-before-yield rule, and replay guidance.
              </li>
              <li>
                <a href={source('packages/events/test/events.test.ts')} rel="external">
                  packages/events/test/events.test.ts
                </a>{' '}
                — serialization stability and invalid-variant coverage.
              </li>
            </ul>
          </article>
          <article>
            <h3>Model boundary</h3>
            <ul>
              <li>
                <a href={source('packages/models/src/model.ts')} rel="external">
                  packages/models/src/model.ts
                </a>{' '}
                — shared request and bounded streaming event contracts.
              </li>
              <li>
                <a href={source('packages/models/src/model-adapter.ts')} rel="external">
                  packages/models/src/model-adapter.ts
                </a>{' '}
                — completion-to-stream compatibility adapter.
              </li>
              <li>
                <a href={source('packages/models/src/fake-model.ts')} rel="external">
                  packages/models/src/fake-model.ts
                </a>{' '}
                — deterministic completion and streaming fake with normalized chunks.
              </li>
            </ul>
          </article>
          <article>
            <h3>Behavioral proof</h3>
            <ul>
              <li>
                <a href={source('packages/kernel/test/runtime.test.ts')} rel="external">
                  packages/kernel/test/runtime.test.ts
                </a>{' '}
                — ordering, backpressure, failure, steering, cancellation, abandonment, snapshots,
                and typed-control cases.
              </li>
              <li>
                <a href={source('packages/models/test/model-adapter.test.ts')} rel="external">
                  packages/models/test/model-adapter.test.ts
                </a>{' '}
                — request forwarding, completion adaptation, failure, and cancellation coverage.
              </li>
              <li>
                <a href={`${repository}/pull/5`} rel="external">
                  Pull request #5
                </a>{' '}
                — authoritative diff, three-commit history, checks, and merge record.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">15 / WHAT IS NEXT</p>
        <h2>The next milestone should spend these semantics on a real tool loop.</h2>
        <ol className="next-list">
          <li>
            <span>01</span>
            <div>
              <h3>M7 — deterministic session loop</h3>
              <p>
                Add multiple model rounds, canonical tool requests, durable policy intent before
                side effects, tool results, and bounded terminal conditions without weakening
                append-before-yield.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>M8 — bounded workspace and five tools</h3>
              <p>
                Wire only <code>fs.read</code>, <code>fs.list</code>, <code>fs.write</code>,{' '}
                <code>process.exec</code>, and <code>git.diff</code> through explicit policy and
                workspace boundaries.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>M9–M10 — continuity</h3>
              <p>
                Generalize steering and follow-ups, implement compaction, then prove replay and
                restart from durable evidence rather than in-memory state.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>M11–M12 — self-hosting proof</h3>
              <p>
                Run an offline task through the new kernel, then complete a live self-hosted Harness
                doctor task with retained evidence and explicit provider/infrastructure gates.
              </p>
            </div>
          </li>
        </ol>
        <ArticleCallout title="THE EVENT ORDER IS NOW A DESIGN CONSTRAINT" tone="success">
          <p>
            Future milestones can add tools, turns, compaction, and replay. They should not trade
            away the M6 promise that accepted evidence precedes observation and that controls have
            explicit, typed lifecycle outcomes.
          </p>
        </ArticleCallout>
      </section>

      <section id="sources">
        <p className="eyebrow">16 / EVIDENCE LEDGER</p>
        <h2>Every shipped claim resolves to the public merge, task, pull request, or check run.</h2>
        <ul className="source-list">
          <li>
            <a href={`${repository}/commit/${commit}`} rel="external">
              M6 merge <code>{commit.slice(0, 7)}</code>
            </a>{' '}
            — the public source pin for the runtime, events, model adapters, tests, and docs.
          </li>
          <li>
            <a href={`${repository}/pull/5`} rel="external">
              Pull request #5 — M6 runtime contracts and event vocabulary
            </a>{' '}
            — authoritative 15-file diff, implementation commits, checks, and merge chronology.
          </li>
          <li>
            <a href={source('tasks/m6-kernel-contracts.yaml')} rel="external">
              M6 task contract
            </a>{' '}
            and{' '}
            <a href={source('ARCHITECTURE.md')} rel="external">
              architecture record
            </a>{' '}
            — acceptance, ownership, compatibility, lifecycle, and explicit deferrals.
          </li>
          <li>
            <a href={`${repository}/actions/runs/33449593023`} rel="external">
              PR-head CI and gate evidence
            </a>{' '}
            and{' '}
            <a href={`${repository}/actions/runs/33449591341`} rel="external">
              PR CodeQL
            </a>{' '}
            — 568 tests, strict types, one golden scenario, 15-path policy evidence, and four green
            checks on <code>{head.slice(0, 7)}</code>.
          </li>
          <li>
            <a href={`${repository}/actions/runs/33449750084`} rel="external">
              Exact-merge CI
            </a>{' '}
            and{' '}
            <a href={`${repository}/actions/runs/33449749513`} rel="external">
              CodeQL
            </a>{' '}
            — separate successful checks on <code>{commit.slice(0, 7)}</code> after merge.
          </li>
          <li>
            Publication audit — a clean temporary checkout of the exact merge reproduced 568/568
            offline tests, strict TypeScript, and 1/1 golden scenario. The private development
            conversation supplied chronology and roadmap intent only; it is intentionally not
            published as implementation evidence.
          </li>
        </ul>
      </section>
    </>
  )
}
