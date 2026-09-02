import type { ReactNode } from 'react'

import { DiagramFrame } from '@/components/build-notes/ArticlePrimitives'

function Node({
  children,
  detail,
  eyebrow,
  tone = 'default',
}: {
  children: ReactNode
  detail: string
  eyebrow: string
  tone?: 'accent' | 'default' | 'safe' | 'warning'
}) {
  return (
    <div className={`harness-m3-diagram__node harness-m3-diagram__node--${tone}`}>
      <span>{eyebrow}</span>
      <strong>{children}</strong>
      <small>{detail}</small>
    </div>
  )
}

function Arrow({ label = 'then' }: { label?: string }) {
  return (
    <span aria-hidden="true" className="harness-m3-diagram__arrow">
      <small>{label}</small>
      <b>→</b>
    </span>
  )
}

export function WorkspaceCapabilityBoundaryDiagram() {
  return (
    <DiagramFrame
      description="At M8 merge d14fc13, model output reaches filesystem or process authority only through a reviewed tool, the durable M7 policy fence, and a frozen one-operation view of an injected Workspace. No Workspace object enters model context, and M8 supplies no host adapter."
      scrollable
      title="One injected capability separates agent logic from host authority"
    >
      <div
        aria-label="At merge d14fc13, a model sees reviewed tool definitions rather than a Workspace object. A requested workspace tool first crosses the M7 durable tool-intent and policy boundary. After an allowed decision, the kernel creates a frozen restricted Workspace view that grants only the operation declared in the tool's reviewed execution boundary. The model-facing tool calls that view, which delegates to the snapshotted injected Workspace capability. The future LocalWorkspace or DockerWorkspace adapter owns actual host filesystem and process behavior; neither adapter exists in M8. A pure tool receives no Workspace at all."
        className="harness-m3-diagram harness-m3-diagram--sandbox"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="sees bounded definitions · never the Workspace object" eyebrow="MODEL">
            Request a reviewed tool
          </Node>
          <Arrow label="persist" />
          <Node
            detail="tool.call · policy.decision · optional permission"
            eyebrow="M7 FENCE"
            tone="accent"
          >
            Record before effect
          </Node>
          <Arrow label="restrict" />
          <Node
            detail="one declared operation · every sibling rejects"
            eyebrow="M8 VIEW"
            tone="warning"
          >
            Grant least privilege
          </Node>
          <Arrow label="delegate" />
          <Node
            detail="injected contract now · Local/Docker adapters later"
            eyebrow="AUTHORITY"
            tone="safe"
          >
            Invoke Workspace
          </Node>
        </div>
        <div
          aria-label="Capability boundary properties"
          className="harness-m3-diagram__support-grid"
        >
          <section>
            <strong>MODEL-SAFE SURFACE</strong>
            <span>The request context contains reviewed schemas, not operational methods.</span>
          </section>
          <section>
            <strong>DURABLE ADMISSION</strong>
            <span>Intent and authorization still append before a workspace call begins.</span>
          </section>
          <section>
            <strong>CALLER-OWNED LIFECYCLE</strong>
            <span>The caller injects and eventually disposes the operational capability.</span>
          </section>
        </div>
        <div
          aria-label="Shipped and deferred boundary"
          className="harness-m3-diagram__decision-grid"
        >
          <section>
            <strong>SHIPPED IN M8</strong>
            <span>Contract, binding, restricted views, dispatch, and runtime wiring.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>NOT AN ADAPTER</strong>
            <span>No local filesystem, child process, Docker, or implicit host fallback.</span>
          </section>
          <section>
            <strong>TRUST PLACEMENT</strong>
            <span>Only a future adapter or explicit outer boundary may touch host APIs.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function WorkspaceOperationDispatcherDiagram() {
  return (
    <DiagramFrame
      description="M8's dispatcher accepts unknown input, checks exact own data properties, snapshots arguments, invokes one bound method, and validates the returned value. Required, malformed, unknown, and unsupported requests are typed failures; malformed input never reaches an adapter method."
      scrollable
      title="Strict dispatch turns an object boundary into a typed protocol"
    >
      <div
        aria-label="At merge d14fc13, invokeWorkspaceOperation accepts an unknown request. It requires a non-array operation envelope with exact own data properties and one of seven canonical operation names. It copies path, contents, argv, cwd, timeout, and native AbortSignal input before dispatch. bindWorkspace has already captured and bound all seven adapter methods, preventing later replacement of those methods from redirecting the call. The dispatcher invokes exactly the selected method and validates its result: strings for reads and diffs, string arrays for listings, a shape-checked command result for execution, immutable JSON metadata for snapshots, and undefined for writes and disposal. Missing, malformed, unknown, unsupported, or invalid-result branches return typed WorkspaceOperation errors. Invalid input is rejected before any adapter method runs."
        className="harness-m3-diagram harness-m3-diagram--service"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node
            detail="unknown input · exact key set · known operation"
            eyebrow="PARSE"
            tone="accent"
          >
            Admit the envelope
          </Node>
          <Arrow label="snapshot" />
          <Node detail="copy strings and argv · brand native signal" eyebrow="NORMALIZE">
            Detach the request
          </Node>
          <Arrow label="dispatch" />
          <Node detail="one captured receiver-bound method" eyebrow="CAPABILITY" tone="warning">
            Invoke one operation
          </Node>
          <Arrow label="verify" />
          <Node
            detail="typed scalar, list, command, snapshot, or void"
            eyebrow="RESULT"
            tone="safe"
          >
            Normalize the return
          </Node>
        </div>
        <div
          aria-label="Canonical Workspace operations"
          className="harness-m3-diagram__support-grid"
        >
          <section>
            <strong>FILESYSTEM</strong>
            <span>readFile · writeFile · listFiles</span>
          </section>
          <section>
            <strong>PROCESS + REVIEW</strong>
            <span>argv-only execute · diff</span>
          </section>
          <section>
            <strong>LIFECYCLE</strong>
            <span>snapshot · dispose</span>
          </section>
        </div>
        <div aria-label="Dispatcher failure classes" className="harness-m3-diagram__decision-grid">
          <section className="harness-m3-diagram__danger">
            <strong>BEFORE INVOCATION</strong>
            <span>
              Required, malformed, unknown, and unsupported inputs do not call an adapter.
            </span>
          </section>
          <section>
            <strong>AFTER INVOCATION</strong>
            <span>A malformed adapter result becomes a typed boundary failure.</span>
          </section>
          <section>
            <strong>IMPLEMENTATION ERROR</strong>
            <span>
              An adapter&apos;s typed Workspace error remains classified; other errors do not.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function WorkspaceRuntimeAdmissionDiagram() {
  return (
    <DiagramFrame
      description="M8 makes capability availability explicit in both kernel paths. MinimalAgentRuntime advertises a workspace tool only when a Workspace was injected; legacy runAgent keeps string identity and operational authority separate; the M3 Agent Server rejects workspace tools until M9 wires an adapter."
      scrollable
      title="No adapter means no usable workspace tool"
    >
      <div
        aria-label="At merge d14fc13, MinimalAgentRuntime snapshots an optional operational RunInput.workspace. When no capability exists, workspace-bound tools are filtered from advertised model definitions; a manually emitted call still reaches a typed denial and no execution. With a Workspace and explicit permission controller, a reviewed workspace tool can cross policy and receive only its declared operation. The legacy runAgent path preserves RunOptions.workspace as a string used for event and service identity while accepting the separate RunOptions.workspaceCapability object for operations; it continues advertising registered definitions, then denies a workspace call if capability or policy is absent. The M3 Agent Server currently has only string identity, so session admission rejects every workspace-bound tool instead of advertising one that cannot execute. M9 is responsible for LocalWorkspace construction and service lifecycle wiring."
        className="harness-m3-diagram harness-m3-diagram--permission"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="string identity stays transport metadata" eyebrow="IDENTITY">
            Name the workspace
          </Node>
          <Arrow label="separate" />
          <Node detail="optional snapshotted operational object" eyebrow="CAPABILITY" tone="accent">
            Inject authority
          </Node>
          <Arrow label="admit" />
          <Node
            detail="advertise only when injected · permission required"
            eyebrow="RUNTIME"
            tone="warning"
          >
            Gate the tool
          </Node>
          <Arrow label="service" />
          <Node detail="reject until M9 constructs an adapter" eyebrow="FAIL CLOSED" tone="safe">
            Keep Agent Server honest
          </Node>
        </div>
        <div aria-label="Runtime admission branches" className="harness-m3-diagram__decision-grid">
          <section className="harness-m3-diagram__danger">
            <strong>NO WORKSPACE</strong>
            <span>Do not advertise; a forced call receives WORKSPACE_OPERATION_REQUIRED.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>NO PERMISSION CONTROLLER</strong>
            <span>Deny workspace effects with TOOL_PERMISSION_REQUIRED.</span>
          </section>
          <section>
            <strong>CAPABILITY + PERMISSION</strong>
            <span>Preserve durable policy ordering, then grant one reviewed operation.</span>
          </section>
        </div>
        <div aria-label="Compatibility lanes" className="harness-m3-diagram__support-grid">
          <section>
            <strong>MINIMAL RUNTIME</strong>
            <span>RunInput.workspace carries the operational capability.</span>
          </section>
          <section>
            <strong>LEGACY LOOP</strong>
            <span>
              Registered tools stay visible; missing capability or permission denies the call.
            </span>
          </section>
          <section>
            <strong>AGENT SERVER</strong>
            <span>Identity-only admission rejects workspace-bound tools during M8.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function HostImportBoundaryDiagram() {
  return (
    <DiagramFrame
      description="An offline TypeScript-AST fixture scans production sources in packages/kernel and packages/tools for direct filesystem and child-process imports. Those layers must cross @harness/workspace; packages/workspace and explicit trusted outer adapters remain the places where host APIs may later be adapted."
      scrollable
      title="The source tree makes host access visible at the architectural edge"
    >
      <div
        aria-label="At merge d14fc13, an offline TypeScript AST test walks JavaScript-family production source files under packages/kernel/src and packages/tools/src. It detects direct imports, re-exports, import types, literal dynamic imports, and literal require calls for fs, fs/promises, child_process, and their node-prefixed forms. A finding fails the test. Kernel code and model-facing tools instead import and call the @harness/workspace contract. The workspace package, a future adapter, or an explicitly trusted CLI or service boundary may adapt host APIs. The fixture does not claim operating-system isolation, control transitive dependencies, or detect arbitrary computed or eval-based loading; those limits remain distinct from the architecture rule it enforces."
        className="harness-m3-diagram harness-m3-diagram--evidence"
        role="img"
      >
        <section className="harness-m3-diagram__danger">
          <strong>REJECT DIRECT HOST IMPORT</strong>
          <b>kernel / tools</b>
          <span>node:fs · node:fs/promises · node:child_process · aliases</span>
        </section>
        <section>
          <strong>REQUIRE THE CONTRACT</strong>
          <b>@harness/workspace</b>
          <span>typed operations · bound methods · restricted views · validated results</span>
        </section>
        <section>
          <strong>PLACE ADAPTATION OUTSIDE</strong>
          <b>adapter / trusted edge</b>
          <span>LocalWorkspace in M9 · DockerWorkspace in M10 · explicit infrastructure</span>
        </section>
        <div aria-label="AST fixture coverage" className="harness-m3-diagram__support-grid">
          <section>
            <strong>SCANNED</strong>
            <span>TypeScript, TSX, JavaScript, JSX, MTS, CTS, MJS, and CJS source files.</span>
          </section>
          <section>
            <strong>RECOGNIZED</strong>
            <span>Static, re-export, type, literal dynamic-import, and literal require forms.</span>
          </section>
          <section>
            <strong>DEFAULT LANE</strong>
            <span>
              The same test checks known-bad fixtures and the real production source tree.
            </span>
          </section>
        </div>
        <div
          aria-label="Import-guard evidence limits"
          className="harness-m3-diagram__decision-grid"
        >
          <section>
            <strong>WHAT IT PROVES</strong>
            <span>
              Reviewed source does not contain the direct host imports covered by the AST rule.
            </span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>WHAT IT IS NOT</strong>
            <span>
              Not a sandbox, kernel policy, runtime interceptor, or transitive-dependency audit.
            </span>
          </section>
          <section>
            <strong>WHY IT MATTERS</strong>
            <span>
              A direct authority shortcut becomes a test failure instead of hidden architecture
              drift.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}
