import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  HostImportBoundaryDiagram,
  WorkspaceCapabilityBoundaryDiagram,
  WorkspaceOperationDispatcherDiagram,
  WorkspaceRuntimeAdmissionDiagram,
} from '@/components/build-notes/HarnessWorkspaceCapabilityDiagrams'

const commit = 'd14fc13e299a6718d9e8a98ba9e028b320cd5f53'
const head = 'fa8da7f95d4d25e121ff709349c420b7206ec626'
const implementation = 'b6ce9773f8ee228f360e74aef5506ca8096f8689'
const base = '9e535b696a742a8aea4b6f1e15a377f3d19a6672'
const repository = 'https://github.com/saberistic-team/harness-platform'
const source = (path: string, anchor = '') => `${repository}/blob/${commit}/${path}${anchor}`

const milestoneContract = `M8 — Enforced workspace capability boundary

ship
├── one canonical Workspace contract in @harness/workspace
├── strict operation request and result dispatch
├── snapshotted, receiver-bound injected capabilities
├── frozen one-operation views for reviewed tools
├── capability-aware admission across both kernel paths
├── fail-closed Agent Server admission without an adapter
└── an offline host-import boundary for kernel and tools

preserve
├── M7 durable intent → policy → optional permission → effect order
├── legacy string workspace identity in runAgent events
├── the lexical WorkspacePathScope helper as a separate seed
└── typed tool observations for boundary failures

defer
├── LocalWorkspace and host path/link/race enforcement to M9
├── DockerWorkspace and resource isolation to M10
├── the five canonical development tools to M11
├── service lifecycle wiring and automatic disposal
└── live model, host-I/O, load, and production security proof`

const lexicalBoundary = `WorkspacePathScope                  Workspace
────────────────────────────────  ───────────────────────────────────────
root: absolute lexical identity   no host root or implementation selector
resolvePath(requested)            readFile(path)
                                  writeFile(path, contents)
                                  listFiles(path)
                                  execute({ argv, cwd?, timeoutMs?, signal? })
                                  diff()
                                  snapshot()
                                  dispose()

openWorkspace(root)
└── resolves lexical paths under root
    · performs no read, write, or process operation
    · does not become the capability supplied to a tool`

const workspaceContract = `export interface Workspace {
  readFile(path: string): Promise<string>
  writeFile(path: string, contents: string): Promise<void>
  listFiles(path: string): Promise<string[]>
  execute(command: {
    argv: readonly [string, ...string[]]
    cwd?: string
    timeoutMs?: number
    signal?: AbortSignal
  }): Promise<CommandResult>
  diff(): Promise<string>
  snapshot(): Promise<WorkspaceSnapshot>
  dispose(): Promise<void>
}

WORKSPACE_CAPABILITIES = [
  'readFile', 'writeFile', 'listFiles', 'execute',
  'diff', 'snapshot', 'dispose',
]`

const dispatcherContract = `invokeWorkspaceOperation(workspace, unknownRequest)
  → require a non-array object and an exact own-key set
  → require one canonical operation name
  → reject accessors, symbols, exotic arrays, and malformed fields
  → copy caller-owned request data
  → brand + compose a supplied native AbortSignal
  → invoke exactly one captured, receiver-bound method
  → validate and detach the operation-specific result

typed failures
├── WORKSPACE_OPERATION_REQUIRED
├── WORKSPACE_OPERATION_MALFORMED
├── WORKSPACE_OPERATION_UNKNOWN
└── WORKSPACE_OPERATION_UNSUPPORTED`

const leastPrivilegeContract = `const runWorkspace = bindWorkspace(callerWorkspace)
// all seven methods captured and receiver-bound synchronously

const readOnlyView = restrictWorkspace(runWorkspace, 'readFile')

await readOnlyView.readFile('README.md')  // delegates
await readOnlyView.listFiles('.')         // typed unsupported error
await readOnlyView.writeFile('x', 'y')    // typed unsupported error
await readOnlyView.execute({ argv: ['sh'] }) // typed unsupported error

// the frozen facade prevents method replacement through this reference;
// the adapter's own internal state remains shared and caller-owned`

const runtimeInjection = `MinimalAgentRuntime
├── RunInput.workspace?: Workspace
├── snapshotRunInput() binds the capability before the run begins
├── no Workspace → omit workspace tools from model definitions
├── Workspace + reviewed tool + PermissionController
│   └── durable intent/policy → one-operation view → execution
└── forced workspace call without capability or permission
    └── typed denial · no workspace invocation

pure tool
└── receives no Workspace object, even when the run has one`

const toolBoundary = `type ToolExecutionBoundary =
  | { kind: 'pure' }
  | {
      kind: 'workspace'
      access: 'read'
      capability: 'readFile' | 'listFiles' | 'diff' | 'snapshot'
      root: string
    }
  | { kind: 'sandbox'; root: string }

M8 model-facing surface
├── no new canonical tool names
├── existing read_file → injected Workspace.readFile
├── result remains capped at 128 KiB after the adapter returns it
└── fs.read / fs.list / fs.write / process.exec / git.diff remain M11`

const compatibilityContract = `streaming MinimalAgentRuntime
└── RunInput.workspace = operational Workspace capability

legacy runAgent
├── RunOptions.workspace = stable string identity for events/transports
├── RunOptions.workspaceCapability = separate operational Workspace
└── registered definitions remain visible; missing capability/policy denies use

both paths
├── snapshot bound methods before model work
├── require an injected capability for workspace tools
├── require explicit permission for workspace effects
├── pass only a restricted view into the tool
└── leave disposal to the caller`

const serverAdmission = `M3 Agent Server admission at M8

session request
├── workspace = string identity
└── requested host tools
    ├── pure boundary       → may be admitted
    ├── sandbox boundary    → existing reviewed checks apply
    └── workspace boundary → reject session
                              "operational Workspace adapter is required"

reason
└── the service cannot advertise a workspace tool it cannot execute

M9
└── constructs and lifecycle-manages an explicit LocalWorkspace adapter`

const importBoundary = `production roots scanned
├── packages/kernel/src
└── packages/tools/src

forbidden direct modules
├── node:fs             · fs
├── node:fs/promises    · fs/promises
└── node:child_process  · child_process

AST forms recognized
├── static import and re-export
├── import type
├── literal dynamic import(...)
└── literal require(...)

allowed authority edges
├── packages/workspace adapter layer
└── explicit trusted CLI/service infrastructure`

const hardeningRecord = `initial implementation  ${implementation.slice(0, 7)}
initial CI              33645319615
result                  657 / 658 tests passed

failure
└── a duck-typed or revoked AbortSignal could cross the dispatcher
    · structural checks were not a native-platform brand check

correction               ${head.slice(0, 7)}
├── call the intrinsic AbortSignal.prototype.aborted getter
├── compose the accepted signal with AbortSignal.any
├── preserve future cancellation
└── reject impostors before Workspace.execute is invoked

final PR-head CI         658 / 658 passed`

const taskGate = `id: m8-workspace-capability-boundary
goal: enforce the operational filesystem and process capability boundary

allowed_paths:
  - packages/workspace/**
  - packages/tools/**
  - packages/kernel/**
  - services/agent-server/src/connection.ts
  - services/agent-server/test/agent-server.test.ts
  - pnpm-lock.yaml
  - ARCHITECTURE.md
  - ROADMAP.md
  - README.md
  - tasks/m8-workspace-capability-boundary.yaml

permissions:
  network: deny
  git.push: deny

delivery:
  type: pull_request`

const releaseDelta = `base                 ${base}
implementation       ${implementation}
Node 22 correction   ${head}
merge                ${commit}

pull request #9
├── 19 changed files
├── 2,642 insertions
├── 446 deletions
├── 2 feature-branch commits
└── final-head CI and CodeQL green before merge`

const verification = `public final-head evidence · ${head.slice(0, 7)}
├── strict TypeScript                         passed
├── test files                                42 / 42
├── repository tests                         658 / 658
├── golden scenarios                           1 / 1
├── changed paths checked before / after      19 / 19
├── path-policy violations                     0
├── CI run                            33645737911
└── CodeQL workflow                   33645731987

exact-merge evidence · ${commit.slice(0, 7)}
├── CI                                 33646021258 · passed
├── CodeQL                            33646020469 · passed
└── clean local audit · Node 24.18.0
    ├── tests                                  658 / 658
    ├── strict TypeScript                     passed
    └── golden scenarios                        1 / 1`

const artifactRecord = `gate-evidence-33645737911
├── artifact ID     9852721940
├── feature head    ${head}
├── base            ${base}
├── digest          sha256:353da9de5303c8196a217785652f411ad778c4aa4350796a5db03bbe2dd8f431
├── expires         2026-12-01
├── report          run-report/v2 · passed
├── tests           658 passed · 18,609 ms recorded whole-suite time
├── paths           19 before + 19 after · zero violations
├── JSON events     7 · includes delivered + run.recorded
└── SQLite events   5 · session remains active`

const nextRoadmap = `M8   canonical Workspace capability boundary                complete
M9   trusted developer LocalWorkspace                        planned
M10  disposable DockerWorkspace                              planned
M11  fs.read · fs.list · fs.write · process.exec · git.diff  planned
M12  steering and follow-up turns                            planned
M13  context accounting and compaction                       planned
M14  durable replay and checkpoints                          planned
M15  restart-safe continuation                               planned
M16  offline kernel-backed self-host runner                  planned
M17  authorship and evidence attestation                     planned
M18  live self-host doctor                                   planned`

const currentTruth = [
  [
    'Contract',
    'One canonical interface defines seven operational filesystem, process, review, snapshot, and lifecycle methods.',
    'M8 supplies no LocalWorkspace, DockerWorkspace, host implementation selector, or automatic fallback.',
  ],
  [
    'Lexical scope',
    'The existing openWorkspace helper retains an absolute lexical root and rejects a resolved path outside it.',
    'It is not an operational implementation and does not by itself prove symlink, hard-link, descriptor-race, or adapter safety.',
  ],
  [
    'Binding',
    'The runtime captures and receiver-binds all seven methods, then freezes the facade before model work.',
    'The adapter object and its internal state remain trusted and shared; binding is not isolation from malicious implementation code.',
  ],
  [
    'Dispatch',
    'Known operations receive copied, strictly shaped requests and checked results; invalid input fails before invocation.',
    'Not every string or adapter output has a byte limit at this generic layer; arbitrary adapter errors become generic kernel tool failures.',
  ],
  [
    'Tool authority',
    'A workspace tool receives a frozen view delegating only its declared operation after durable policy and permission.',
    'M8 adds no five-tool development surface, and the restricted JavaScript object is not an operating-system sandbox.',
  ],
  [
    'read_file',
    'The legacy read_file seam delegates I/O through injected Workspace.readFile and checks its returned text size.',
    'Its 128-KiB check happens after the read; it forwards no cancellation signal, forwards path shapes to the adapter, and strips extra keys despite a stricter schema.',
  ],
  [
    'Service path',
    'Agent Server rejects workspace-bound tools while it has only a string workspace identity.',
    'The M3 service cannot execute M8 workspace tools until M9 creates and manages a real adapter.',
  ],
  [
    'Import guard',
    'An offline AST fixture found no covered direct filesystem or child-process import in kernel/tools production sources.',
    'It is not runtime interception, dependency analysis, or proof against computed loading, eval, globals, or malicious packages.',
  ],
  [
    'Verification',
    'Final-head and exact-merge automation passed 658 tests, strict types, one golden scenario, and CodeQL.',
    'No live host adapter, model provider, load, latency, throughput, capacity, penetration, or production-isolation test ran.',
  ],
  [
    'Review and delivery',
    'Green final-head checks preceded merge and exact-merge CI plus CodeQL passed afterward.',
    'Main was unprotected, no human approval is visible, and Copilot changes-recommended findings remain unresolved in the merge.',
  ],
] as const

export function HarnessWorkspaceCapabilityArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / MILESTONE CONTRACT</p>
        <h2>M8 does not open the workspace. It decides where that authority is allowed to live.</h2>
        <p className="article-lede">
          M7 proved that recorded intent and authorization can stand before a tool effect. M8 gives
          future filesystem and process effects one explicit place to enter that loop: an injected,
          snapshotted <code>Workspace</code> capability whose operations can be narrowed before a
          model-facing tool receives them.
        </p>
        <p>
          The milestone is architecture made executable. Kernel and tool code can no longer reach
          the covered host modules directly without failing the offline import gate; model context
          never receives the Workspace object; and the service refuses to promise a tool when it has
          no adapter. The deliberately missing piece is equally important: M8 defines authority
          without implementing local or container-backed authority.
        </p>
        <CodeBlock
          code={milestoneContract}
          label="Stage 1 / Milestone 8 contract (condensed)"
          language="text"
          sourceHref={source('tasks/m8-workspace-capability-boundary.yaml')}
        />
        <ArticleCallout title="M8 DEFINES AUTHORITY; IT DOES NOT IMPLEMENT THE HOST" tone="warning">
          <p>
            The M8 proof lanes use deterministic fake Workspace objects. There is no{' '}
            <code>LocalWorkspace</code>, <code>DockerWorkspace</code>, live host-I/O proof, or
            production workspace selector in this merge.
          </p>
        </ArticleCallout>
      </section>

      <section id="boundary">
        <p className="eyebrow">02 / AUTHORITY BOUNDARY</p>
        <h2>The agent receives a verb; trusted outer code supplies the authority behind it.</h2>
        <p>
          A model sees a reviewed tool name and JSON schema. If it asks for that tool, the M7 loop
          first records the intention and the policy decision. Only an allowed workspace call can
          receive a capability view, and that view exposes one declared operation rather than the
          full injected object. This keeps provider language, policy identity, and operational
          authority in separate layers.
        </p>
        <WorkspaceCapabilityBoundaryDiagram />
        <CodeBlock
          code={lexicalBoundary}
          label="Lexical path scope versus operational capability"
          language="text"
          sourceHref={source('packages/workspace/src/index.ts')}
        />
        <p>
          The older <code>openWorkspace()</code> helper still resolves lexical paths against an
          absolute root. M8 renames that shape conceptually as <code>WorkspacePathScope</code> so it
          cannot be mistaken for something that reads, writes, executes, snapshots, or disposes. A
          future adapter may reuse its logic, but the helper alone is not a security boundary
          against links or filesystem races.
        </p>
      </section>

      <section id="workspace-contract">
        <p className="eyebrow">03 / WORKSPACE CONTRACT</p>
        <h2>Seven methods describe what an operational workspace may eventually do.</h2>
        <p>
          <code>@harness/workspace</code> now owns the canonical interface. The kernel re-exports
          these types for compatibility instead of maintaining a second definition. Paths remain
          transport-neutral strings, commands are argument vectors rather than shell strings, and
          snapshots carry an identifier, timestamp, and optional JSON metadata.
        </p>
        <CodeBlock
          code={workspaceContract}
          label="Canonical Workspace surface (condensed TypeScript)"
          language="typescript"
          sourceHref={source('packages/workspace/src/index.ts')}
        />
        <p>
          The contract intentionally does not expose a host root, provider name, or implementation
          selector. That prevents model-facing code from branching on “local versus Docker” and
          keeps those choices at the launch boundary. It also means the interface alone does not
          promise containment, atomic writes, bounded output, or cleanup; adapters must earn those
          properties in later milestone gates.
        </p>
      </section>

      <section id="operation-dispatch">
        <p className="eyebrow">04 / STRICT OPERATION DISPATCH</p>
        <h2>Both sides of an adapter call are treated as untrusted data shapes.</h2>
        <p>
          <code>invokeWorkspaceOperation()</code> accepts <code>unknown</code>, selects one of the
          seven canonical names, and validates the exact request shape before it touches the
          adapter. Paths and contents must be strings; <code>argv</code> must contain a nonempty
          program followed only by strings; timeouts are nonnegative safe integers; and an optional
          signal must be a native <code>AbortSignal</code>.
        </p>
        <WorkspaceOperationDispatcherDiagram />
        <CodeBlock
          code={dispatcherContract}
          label="Workspace operation admission and return validation"
          language="text"
          sourceHref={source('packages/workspace/src/index.ts')}
        />
        <p>
          Results are checked too. File reads and diffs must return strings, listings must be dense
          string arrays, command results must have the declared exit/output shape, snapshot metadata
          must be detached JSON, and write/dispose must resolve to <code>undefined</code>. Typed
          Workspace errors thrown by an implementation remain typed; malformed returns do not get
          laundered into success. Snapshot metadata has structural, cycle, depth, and array-count
          checks, but no total byte cap; <code>createdAt</code> is checked only as a nonempty
          string.
        </p>
      </section>

      <section id="least-privilege">
        <p className="eyebrow">05 / LEAST-PRIVILEGE VIEWS</p>
        <h2>The run snapshots all methods; each tool receives only one.</h2>
        <p>
          <code>bindWorkspace()</code> reads all seven methods synchronously, receiver-binds them,
          and freezes the resulting facade. Replacing a method on the caller-owned object after the
          run begins cannot redirect the captured capability. The implementation&apos;s own receiver
          and internal state remain shared, which is necessary for a real adapter and why binding
          must not be described as sandboxing.
        </p>
        <CodeBlock
          code={leastPrivilegeContract}
          label="Binding once and granting one operation"
          language="typescript"
          sourceHref={source('packages/workspace/src/index.ts')}
        />
        <p>
          <code>restrictWorkspace()</code> builds another frozen facade. Its selected method
          delegates through the strict dispatcher; every sibling method rejects with{' '}
          <code>WORKSPACE_OPERATION_UNSUPPORTED</code> without consulting the underlying adapter.
          This is object-capability least privilege inside the process, not operating-system
          isolation from code that already has ambient authority.
        </p>
        <ArticleCallout title="THE TOOL GETS ONE OPERATION, NOT THE WORKSPACE" tone="success">
          <p>
            A reviewed <code>readFile</code> tool cannot use the supplied context to list, write,
            execute, diff, snapshot, or dispose. A separate reviewed boundary would be required for
            each different operation.
          </p>
        </ArticleCallout>
      </section>

      <section id="runtime-injection">
        <p className="eyebrow">06 / RUNTIME INJECTION</p>
        <h2>Capability presence changes what the model is allowed to see.</h2>
        <p>
          <code>MinimalAgentRuntime</code> accepts an optional operational Workspace on{' '}
          <code>RunInput</code> and binds it while snapshotting the run. Its model context includes
          a workspace-bound tool definition only when that capability exists. Pure tools continue to
          appear without one and receive no Workspace in their execution context.
        </p>
        <WorkspaceRuntimeAdmissionDiagram />
        <CodeBlock
          code={runtimeInjection}
          label="Capability-aware model-tool admission"
          language="text"
          sourceHref={source('packages/kernel/src/runtime.ts')}
        />
        <p>
          Absence is defended twice. Filtering prevents normal advertisement; if a model adapter
          nevertheless emits a call for a registered workspace tool, the runtime records its intent
          and returns a typed required-capability denial without invoking Workspace. A capability
          without a permission controller also fails closed—M8 does not inherit the pure-tool
          auto-allow rule for filesystem or process authority.
        </p>
      </section>

      <section id="tool-boundaries">
        <p className="eyebrow">07 / REVIEWED TOOL BOUNDARIES</p>
        <h2>M8 routes one legacy read seam; it does not quietly ship the M11 tool surface.</h2>
        <p>
          Tool execution boundaries are normalized into frozen WeakMap-held records. The workspace
          variant accepts only reviewed read operations—<code>readFile</code>,{' '}
          <code>listFiles</code>, <code>diff</code>, or <code>snapshot</code>—plus nonempty root
          metadata. Write and execute exist on the generic Workspace contract but cannot be named by
          this M8 model-facing boundary.
        </p>
        <CodeBlock
          code={toolBoundary}
          label="Reviewed boundaries and the actual M8 tool surface"
          language="typescript"
          sourceHref={source('packages/tools/src/tool.ts')}
        />
        <p>
          The pre-existing <code>read_file</code> tool now calls injected{' '}
          <code>Workspace.readFile</code> rather than importing the host filesystem. It retains its
          <code>fs.read</code> authorization intent and checks that returned UTF-8 content is no
          more than 128 KiB after the adapter has already returned it. That check does not bound the
          underlying read. <code>readFile</code> also has no signal parameter, and this tool does
          not forward its execution-context signal, so a non-cooperative adapter may continue after
          the runtime is canceled. The planned canonical dotted tools do not arrive until M11, when
          adapter containment and bounded process semantics exist beneath them.
        </p>
        <ArticleCallout title="ROOT IS REVIEW METADATA IN M8" tone="warning">
          <p>
            The tool boundary stores a nonempty <code>root</code>, but the M8 dispatcher does not
            use it to contain a path. The injected adapter remains responsible for path, link, and
            race safety. Until M9 supplies that adapter, the metadata is not operational
            enforcement.
          </p>
        </ArticleCallout>
      </section>

      <section id="compatibility">
        <p className="eyebrow">08 / IDENTITY AND CAPABILITY</p>
        <h2>The legacy loop keeps a workspace name without confusing it for authority.</h2>
        <p>
          Earlier event and service contracts use a string workspace identity. Removing or
          repurposing that field would rewrite their meaning. M8 therefore gives legacy{' '}
          <code>runAgent</code> a separate <code>workspaceCapability</code> option while the newer
          runtime&apos;s <code>RunInput.workspace</code> becomes the operational object.
        </p>
        <CodeBlock
          code={compatibilityContract}
          label="Workspace identity and capability across both kernel paths"
          language="text"
          sourceHref={source('packages/kernel/src/run.ts')}
        />
        <p>
          Both paths apply the same substantive boundary: capture the capability, require a reviewed
          tool marker, derive authorization only after valid arguments, persist policy before the
          effect, and pass a one-operation view. The caller that created the Workspace remains
          responsible for disposal; a completed run does not silently destroy a capability it may
          not own exclusively. Their advertisement differs: MinimalAgentRuntime filters out
          workspace definitions when capability is absent, while legacy <code>runAgent</code> keeps
          registered definitions visible and denies the requested call at execution admission.
        </p>
      </section>

      <section id="server-admission">
        <p className="eyebrow">09 / FAIL-CLOSED SERVICE ADMISSION</p>
        <h2>The Agent Server refuses a workspace tool it cannot honestly execute.</h2>
        <p>
          The M3 WebSocket service still receives a string workspace identity and has no operational
          adapter lifecycle. Before M8, it could review a workspace-root marker for the legacy host
          reader. After M8 removed direct host I/O from that tool, admitting it would advertise a
          function whose required capability was absent.
        </p>
        <CodeBlock
          code={serverAdmission}
          label="Agent Server admission between M8 and M9"
          language="text"
          sourceHref={source('services/agent-server/src/connection.ts')}
        />
        <ArticleCallout title="NO ADAPTER, NO ADVERTISED SERVICE TOOL" tone="success">
          <p>
            Session admission now rejects a workspace execution boundary with a typed unsafe-tool
            error. M9 must construct, inject, and dispose <code>LocalWorkspace</code> explicitly
            before the service can expose that capability again.
          </p>
        </ArticleCallout>
      </section>

      <section id="import-boundary">
        <p className="eyebrow">10 / HOST-IMPORT GUARD</p>
        <h2>A direct filesystem shortcut now leaves a failing architectural trace.</h2>
        <p>
          An offline fixture parses JavaScript-family production sources under kernel and tools with
          the TypeScript AST. It recognizes static imports, re-exports, import types, literal
          dynamic imports, and literal <code>require</code> calls for the Node filesystem and
          child-process module names. The test also refuses symlinked source entries while walking
          those trees.
        </p>
        <HostImportBoundaryDiagram />
        <CodeBlock
          code={importBoundary}
          label="Covered source roots, module names, and syntax forms"
          language="text"
          sourceHref={source('packages/workspace/test/import-boundary.test.ts')}
        />
        <p>
          The real M8 tree passes with no covered imports in either production root. That is useful
          architectural enforcement, but its scope matters: it is a test, not a runtime interceptor;
          it does not analyze transitive packages or prove that computed loading, globals, eval, or
          malicious code lack ambient process authority. Docker isolation remains later work.
        </p>
      </section>

      <section id="hardening">
        <p className="eyebrow">11 / ABORTSIGNAL HARDENING</p>
        <h2>
          The first green-looking design failed on the project&apos;s actual Node 22 boundary.
        </h2>
        <p>
          Initial CI on <code>{implementation.slice(0, 7)}</code> stopped at 657 of 658 tests. A
          structurally plausible or revoked signal could cross normalization until platform code
          touched its native internal slots. That made the boundary depend on duck typing precisely
          where cancellation identity must be trustworthy.
        </p>
        <CodeBlock
          code={hardeningRecord}
          label="From failing Node 22 signal case to final head"
          language="text"
          sourceHref={`${repository}/actions/runs/33645319615`}
        />
        <p>
          The follow-up invokes the intrinsic <code>AbortSignal.prototype.aborted</code> getter as a
          brand check, then uses <code>AbortSignal.any</code> to create an unshadowed platform
          signal that still tracks future aborts. Duck-typed and revoked candidates now fail with a
          typed malformed-operation error before <code>Workspace.execute</code> is called.
          Final-head CI passed all 658 tests.
        </p>
      </section>

      <section id="task-gate">
        <p className="eyebrow">12 / MACHINE-READABLE SCOPE</p>
        <h2>
          The task could change the capability seam, but it could not use the network or push.
        </h2>
        <p>
          The M8 manifest permits workspace, tool, and kernel packages; the narrow Agent Server
          admission files; the lockfile; three architecture/status documents; and the task itself.
          Its command allowlist includes offline installation, targeted package tests, the full
          suite, types, evals, validation, and the Harness exit gate. Network and Git push remain
          denied to the development agent.
        </p>
        <CodeBlock
          code={taskGate}
          label="M8 task manifest (abridged)"
          language="yaml"
          sourceHref={source('tasks/m8-workspace-capability-boundary.yaml')}
        />
        <p>
          The retained report checks all 19 changed paths both before and after tests and records
          zero violations. Its 100,000-model-token and 200-tool-call limits govern the
          task-authoring run; they are not runtime defaults or evidence about Workspace throughput.
        </p>
      </section>

      <section id="delivery">
        <p className="eyebrow">13 / DELIVERY CHRONOLOGY</p>
        <h2>Final-head automation was green before merge; repository rules did not require it.</h2>
        <p>
          Pull request #9 opened at 14:56:25 UTC on September 2, 2026 from initial implementation{' '}
          <a href={`${repository}/commit/${implementation}`} rel="external">
            <code>{implementation.slice(0, 7)}</code>
          </a>
          . The failing signal case produced a second commit{' '}
          <a href={`${repository}/commit/${head}`} rel="external">
            <code>{head.slice(0, 7)}</code>
          </a>
          . Final-head CI and CodeQL completed successfully before the PR merged at 15:02:58 UTC as{' '}
          <a href={`${repository}/commit/${commit}`} rel="external">
            <code>{commit.slice(0, 7)}</code>
          </a>
          .
        </p>
        <CodeBlock
          code={releaseDelta}
          label="Authoritative M8 release boundary"
          language="text"
          sourceHref={`${repository}/pull/9/files`}
        />
        <p>
          Main was unprotected and no human approval is visible. The accurate statement is that
          green final-head checks preceded this merge and separate workflows reverified the exact
          merge—not that branch protection or peer review compelled the sequence. The lockfile
          changes connect existing workspace packages; the M8 diff adds no external dependency.
        </p>
        <ArticleCallout title="GREEN BEFORE MERGE, NOT HUMAN-APPROVED" tone="warning">
          <p>
            Automation establishes reproducible checks. It does not substitute for an approving
            reviewer or turn an unprotected branch into a governed merge queue.
          </p>
        </ArticleCallout>
      </section>

      <section id="verification">
        <p className="eyebrow">14 / VERIFIED RESULT</p>
        <h2>Public head and merge workflows agree on the offline result.</h2>
        <p>
          Final-head CI passed strict TypeScript, 658 tests across 42 files, and one golden kernel
          scenario. The exit gate checked the 19-path diff before and after the suite with zero
          violations. Both CodeQL jobs passed, and its differential result reported no new alert in
          changed code. Exact-merge CI and CodeQL then passed independently.
        </p>
        <CodeBlock
          code={verification}
          label="Public and independently reproduced M8 verification"
          language="text"
          sourceHref={`${repository}/actions/runs/33645737911`}
        />
        <p>
          A clean local publication checkout of the exact merge reproduced 658 of 658 tests, strict
          types, and one of one eval under Node 24.18.0 with the project install reporting pnpm
          11.15.1. That local run is unretained supporting evidence. None of these lanes constructed
          a host adapter or measured filesystem safety, capacity, latency, or throughput.
        </p>
        <ArticleCallout title="658 TESTS ARE NOT A WORKSPACE LOAD TEST" tone="warning">
          <p>
            The suite proves deterministic contracts and failure paths with fake capabilities. Its
            wall-clock duration does not establish production performance, contention behavior,
            cancellation latency, or isolation under hostile workloads.
          </p>
        </ArticleCallout>
      </section>

      <section id="evidence-artifact">
        <p className="eyebrow">15 / EVIDENCE ARTIFACT</p>
        <h2>The retained gate artifact belongs to the feature head and expires.</h2>
        <p>
          Final-head workflow{' '}
          <a href={`${repository}/actions/runs/33645737911`} rel="external">
            33645737911
          </a>{' '}
          uploaded <code>gate-evidence-33645737911</code>. Its <code>run-report/v2</code> pins{' '}
          <code>{head.slice(0, 7)}</code> against base <code>{base.slice(0, 7)}</code>, records the
          658-test result, both path checks, zero violations, and a passed outcome. It is not the
          exact-merge workflow and is retention-bound until December 1, 2026.
        </p>
        <CodeBlock
          code={artifactRecord}
          label="Retained PR-head artifact record"
          language="text"
          sourceHref={`${repository}/actions/runs/33645737911/artifacts/9852721940`}
        />
        <p>
          The JSON report contains seven serialized events, including delivery and{' '}
          <code>run.recorded</code>. Its SQLite companion contains five events and still marks the
          session active, so this note does not call that database a closed terminal log. The report
          field <code>18,609 ms</code> is whole-suite timing produced by one CI run—not a benchmark.
        </p>
      </section>

      <section id="limits">
        <p className="eyebrow">16 / CURRENT TRUTH</p>
        <h2>
          M8 narrows authority in code while leaving the dangerous implementation work visible.
        </h2>
        <div
          aria-label="Harness M8 verified and unverified boundaries"
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
            an injected and least-privilege Workspace protocol, enforced in the kernel/tool source
            architecture and proven offline with deterministic fake adapters
          </strong>
          . It is not a safe local executor, disposable sandbox, complete development-tool surface,
          live service capability, or production security certification.
        </p>
        <ArticleCallout title="TWO AUTOMATED REVIEW FINDINGS REMAIN OPEN" tone="warning">
          <p>
            Copilot&apos;s changes-recommended review observed that <code>read_file</code> forwards
            absolute and traversal-shaped paths for the adapter to reject rather than failing at the
            tool layer. Its suppressed review note also identified that the Zod object is not
            strict, so extra call keys are stripped even though the advertised JSON Schema says{' '}
            <code>additionalProperties: false</code>. Neither issue was changed by the final signal
            fix or the merge.
          </p>
        </ArticleCallout>
      </section>

      <section id="files">
        <p className="eyebrow">17 / FILE GUIDE</p>
        <h2>
          The contract, dispatch, runtime wiring, source guard, and open review are inspectable.
        </h2>
        <div className="file-guide">
          <article>
            <h3>Capability contract</h3>
            <ul>
              <li>
                <a href={source('packages/workspace/src/index.ts')} rel="external">
                  packages/workspace/src/index.ts
                </a>{' '}
                — lexical scope, canonical interface, typed errors, binding, restriction, dispatch,
                result normalization, and signal branding.
              </li>
              <li>
                <a href={source('packages/workspace/test/workspace.test.ts')} rel="external">
                  packages/workspace/test/workspace.test.ts
                </a>{' '}
                — capability capture, hostile shapes, operation dispatch, restricted views,
                snapshots, results, and cancellation cases.
              </li>
            </ul>
          </article>
          <article>
            <h3>Kernel integration</h3>
            <ul>
              <li>
                <a href={source('packages/kernel/src/runtime.ts')} rel="external">
                  packages/kernel/src/runtime.ts
                </a>{' '}
                — streaming-runtime snapshot, conditional advertisement, permission, restricted
                execution, and typed failure wiring.
              </li>
              <li>
                <a href={source('packages/kernel/src/run.ts')} rel="external">
                  packages/kernel/src/run.ts
                </a>{' '}
                — separate legacy identity/capability inputs with the same effect fence.
              </li>
            </ul>
          </article>
          <article>
            <h3>Tool and service boundary</h3>
            <ul>
              <li>
                <a href={source('packages/tools/src/tool.ts')} rel="external">
                  packages/tools/src/tool.ts
                </a>{' '}
                — normalized pure, read-only workspace, and sandbox execution markers.
              </li>
              <li>
                <a href={source('packages/tools/src/fs-tools.ts')} rel="external">
                  packages/tools/src/fs-tools.ts
                </a>{' '}
                — injected <code>read_file</code>, returned-text limit, and the path/schema review
                findings described above.
              </li>
              <li>
                <a href={source('services/agent-server/src/connection.ts')} rel="external">
                  services/agent-server/src/connection.ts
                </a>{' '}
                — fail-closed admission until a service adapter exists.
              </li>
            </ul>
          </article>
          <article>
            <h3>Architecture gate and delivery</h3>
            <ul>
              <li>
                <a href={source('packages/workspace/test/import-boundary.test.ts')} rel="external">
                  packages/workspace/test/import-boundary.test.ts
                </a>{' '}
                — AST fixtures and real-tree scan for covered direct host imports.
              </li>
              <li>
                <a href={source('tasks/m8-workspace-capability-boundary.yaml')} rel="external">
                  tasks/m8-workspace-capability-boundary.yaml
                </a>{' '}
                — acceptance criteria, scope, offline commands, authoring budget, and PR delivery.
              </li>
              <li>
                <a
                  href={source('ARCHITECTURE.md', '#m8-workspace-capability-boundary')}
                  rel="external"
                >
                  ARCHITECTURE.md
                </a>{' '}
                — delivered boundary, ownership, server state, and M9 handoff.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">18 / WHAT IS NEXT</p>
        <h2>The next three milestones turn a safe-shaped port into usable, bounded authority.</h2>
        <p>
          M8 deliberately lands before implementation because every later adapter and tool can now
          target one contract. M9 must build trusted local behavior with path, link, race, I/O,
          cancellation, diff, snapshot, and lifecycle gates. M10 must make Docker the default native
          selector without an automatic local fallback. M11 can then expose exactly five development
          tools through the same durable policy loop.
        </p>
        <CodeBlock
          code={nextRoadmap}
          label="Post-M8 self-hosting sequence (condensed)"
          language="text"
          sourceHref={source('ROADMAP.md')}
        />
        <ol className="next-list">
          <li>
            <span>01</span>
            <div>
              <h3>M9 — make trusted local access explicit</h3>
              <p>
                Implement <code>LocalWorkspace</code> with escape and link defenses, bounded I/O,
                argv-only execution, cancellation, snapshots, and an explicit developer-only
                selector.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>M10 — put the default authority in a disposable container</h3>
              <p>
                Adapt the existing sandbox runner, deny network and host credentials by default,
                bound resources and outputs, export only reviewed artifacts, and destroy the run.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>M11 — expose exactly five development verbs</h3>
              <p>
                Add <code>fs.read</code>, <code>fs.list</code>, <code>fs.write</code>,{' '}
                <code>process.exec</code>, and <code>git.diff</code>; migrate away the legacy seams
                instead of accumulating aliases.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>M12–M18 — earn continuity and self-hosting</h3>
              <p>
                Steering, compaction, replay, restart safety, offline integration, authorship
                attestation, and one live doctor each retain a separate evidence gate.
              </p>
            </div>
          </li>
        </ol>
        <ArticleCallout title="THE CAPABILITY PORT IS NOW A COMPATIBILITY CONTRACT" tone="success">
          <p>
            Local, Docker, and later remote implementations can change isolation and lifecycle
            without teaching model-facing tools how to reach the host. They still owe M7&apos;s
            durable authorization ordering and M8&apos;s narrowed operational view.
          </p>
        </ArticleCallout>
      </section>

      <section id="sources">
        <p className="eyebrow">19 / EVIDENCE LEDGER</p>
        <h2>Implementation, delivery, review, and reproduction claims resolve separately.</h2>
        <ul className="source-list">
          <li>
            <a href={`${repository}/commit/${commit}`} rel="external">
              M8 merge <code>{commit.slice(0, 7)}</code>
            </a>{' '}
            — exact public implementation pin for this article.
          </li>
          <li>
            <a href={`${repository}/pull/9`} rel="external">
              Pull request #9 — enforce workspace capability boundary
            </a>{' '}
            — 19-file diff, two feature commits, timestamps, checks, and review state.
          </li>
          <li>
            <a href={source('tasks/m8-workspace-capability-boundary.yaml')} rel="external">
              M8 task contract
            </a>{' '}
            and{' '}
            <a
              href={source('ROADMAP.md', '#m8--enforced-workspace-capability-boundary-complete')}
              rel="external"
            >
              delivered roadmap entry
            </a>{' '}
            — acceptance, scope, permissions, gate, explicit deferrals, and M9 handoff.
          </li>
          <li>
            <a href={`${repository}/actions/runs/33645319615`} rel="external">
              Initial-head CI
            </a>{' '}
            — the 657/658 Node 22 failure that prompted the native AbortSignal follow-up{' '}
            <a href={`${repository}/commit/${head}`} rel="external">
              <code>{head.slice(0, 7)}</code>
            </a>
            .
          </li>
          <li>
            <a href={`${repository}/actions/runs/33645737911`} rel="external">
              Final-head CI and gate artifact
            </a>{' '}
            and{' '}
            <a href={`${repository}/actions/runs/33645731987`} rel="external">
              final-head CodeQL
            </a>{' '}
            — successful pre-merge automation on <code>{head.slice(0, 7)}</code>.
          </li>
          <li>
            <a href={`${repository}/actions/runs/33646021258`} rel="external">
              Exact-merge CI
            </a>{' '}
            and{' '}
            <a href={`${repository}/actions/runs/33646020469`} rel="external">
              exact-merge CodeQL
            </a>{' '}
            — successful post-merge workflows on <code>{commit.slice(0, 7)}</code>.
          </li>
          <li>
            <a href={`${repository}/pull/9#discussion_r3915507350`} rel="external">
              Copilot path-validation finding
            </a>{' '}
            and the review&apos;s suppressed non-strict-Zod finding — unresolved automated review
            notes in the exact merge; no human approval is visible.
          </li>
          <li>
            Clean local publication audit — an unretained exact-merge checkout reproduced 658/658
            tests, strict TypeScript, and 1/1 golden scenario under Node 24.18.0. The shared build
            conversation informed chronology and intent but is not published as implementation
            evidence.
          </li>
        </ul>
      </section>
    </>
  )
}
