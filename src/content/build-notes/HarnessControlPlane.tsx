import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  ArtifactAuditDiagram,
  FencedSchedulingDiagram,
  M4DeploymentEvidenceDiagram,
  ReplaySafetyDiagram,
} from '@/components/build-notes/HarnessControlPlaneDiagrams'

const commit = 'd3b2859a48cfb794472d30805ea91b47dc1086d0'
const implementation = 'fee081ecb8bc0f353f48c21dfc9e94aa53b8ab83'
const baseline = 'defbf7bcf72fc72452b4adc81b099f3fc6c523cf'
const repository = 'https://github.com/saberistic-team/harness-platform'
const source = (path: string, anchor = '') => `${repository}/blob/${commit}/${path}${anchor}`

const milestoneContract = `M4 — Control plane & scale
├── services/control-plane
│   ├── digest-bound task snapshots + durable run state
│   ├── leases, heartbeats, fencing, and reconciliation
│   ├── transactional event outbox
│   └── artifact registry + automatic audit export
├── durable storage
│   ├── PostgreSQL: tasks, runs, sessions, events, checkpoints
│   └── S3-compatible objects: outputs, reports, audit JSONL
├── ACP session restore
│   ├── explicit last-seen sequence cursor
│   └── interrupted work closes without replaying effects
└── Kubernetes reference topology
    ├── control plane + agent server
    ├── Postgres + MinIO reference stores
    └── isolated, suspended sandbox Job template

default evidence lane
├── deterministic offline tests
└── injected PostgreSQL and S3 protocol fakes

not claimed
├── a live cluster deployment
├── exactly-once external side effects
└── load, soak, or capacity evidence`

const m3ToM4 = `M3                                      M4
────────────────────────────────────    ─────────────────────────────────────
one run owned by one connection          durable task and run ownership
local SQLite session log                 PostgreSQL or SQLite session store
sessions capability: false               ACP cursor restore when durable store exists
fire event observer                       awaited durable publication
local audit stream                        transactional outbox + JSONL export
files named by a process                  immutable object registry + SHA-256
Docker-per-run plan                       Kubernetes service topology contract
connection lifecycle is authority          graceful cancel + lease-expiry restore
no distributed run recovery                run lease expiry + operator reconciliation`

const deliveryBoundary = `M3 merge
defbf7bcf72fc72452b4adc81b099f3fc6c523cf
        ↓ one task contract · one implementation commit · one PR
fee081ecb8bc0f353f48c21dfc9e94aa53b8ab83
        ↓ pull request #2 · all required checks green
d3b2859a48cfb794472d30805ea91b47dc1086d0
M4 merge

authoritative public diff
102 files changed · 12,934 insertions · 484 deletions`

const schedulingContract = `admit(manifest, admissionKey)
  → validate TaskManifest
  → canonical JSON + SHA-256 digest
  → insert immutable snapshot or return the identical retry

schedule(task, admissionKey)
  → queued
  → lease(workerId, leaseId, fencingToken, expiresAt)
  → running after an owner-checked start
  → passed | failed | blocked | canceled

expiry
  leased  → queued
  running → indeterminate

operator reconciliation
  indeterminate → queued | canceled

every worker mutation must match
runId + workerId + leaseId + fencingToken + unexpired storage-clock lease`

const stateMachine = `queued ──claim──▶ leased ──start──▶ running ──complete──▶ passed
  │                 │                         ├──────────▶ failed
  │                 └──lease expires──▶ queued├──────────▶ blocked
  └──cancel────────────────────────────▶ canceled
                                            │
                         running lease expires
                                            ▼
                                      indeterminate
                                       │         │
                                retry  │         │ cancel
                                       ▼         ▼
                                     queued   canceled`

const restoreContract = `session/restore {
  sessionId,
  afterSeq,   // last durable sequence the client has seen
  limit
}

response {
  status: completed | interrupted,
  replayedFromSeq,
  replayedThroughSeq,
  replayedEvents,
  hasMore
}

guarantee
├── replay only committed events where seq > afterSeq
├── ascending order, at-least-once delivery
├── active owner lease must expire before takeover
├── terminal agent.stopped closes bookkeeping without a fake event
└── nonterminal tail appends one interrupted marker and closes;
    it never repeats the uncertain model request, permission, or tool effect`

const persistenceBoundary = `before model request
  await publish(model.request)
  → then call model

before tool side effect
  await publish(tool.call)
  await publish(policy.decision)
  await publish(permission.resolved when required)
  → then invoke tool

if durable publication fails
  abort the run
  do not cross the effect boundary

This orders evidence before an effect.
It does not make an external effect exactly once.`

const artifactContract = `artifact bytes
  → bound size and content type
  → SHA-256 digest
  → conditional S3-compatible put
  → hash existing bytes on a conflict
  → immutable PostgreSQL metadata

audit export
  redacted canonical events
  → deterministic newline-delimited JSON
  → content-addressed object
  → upload object
  → commit immutable registry row + checkpoint in one DB transaction
  → for a non-empty export, enqueue artifact.registered + audit.exported
  → for bookkeeping-only input, emit neither recursive event

download
  → bounded SigV4 URL response
  → never store the URL in events, reports, registry, or logs`

const kubernetesContract = `infra/kubernetes/
├── harness namespace
│   ├── control-plane Deployment ×2 + Service + PDB
│   ├── agent-server Deployment ×2 + Service + PDB + HPA
│   ├── Postgres StatefulSet ×1 + PVC
│   ├── MinIO StatefulSet ×1 + PVC
│   └── default-deny plus explicit service paths
└── harness-sandboxes namespace
    ├── Restricted Pod Security + quota + limits
    ├── service account with token automount disabled
    ├── deny-all networking
    └── ConfigMap containing a suspended Job template

fail-closed base
├── five example.invalid image sentinels
├── two REPLACE_STORAGE_CLASS placeholders
├── example Secrets excluded from rendered output
└── no executor, Job materialization RBAC, or workspace staging`

const verification = `$ git checkout d3b2859a48cfb794472d30805ea91b47dc1086d0

$ pnpm test
Test Files  32 passed (32)
Tests       421 passed (421)

$ pnpm typecheck
# exit 0

$ kubectl kustomize infra/kubernetes
# exit 0 · 32 rendered objects · 0 Secret objects

public M4 report comment
├── status: passed
├── changed paths: 102
├── path-policy violations: 0
└── tests: 421 / 421`

const currentTruth = [
  [
    'Task admission',
    'Validated manifests are stored as digest-bound immutable snapshots; matching retries are idempotent and conflicting reuse fails.',
    'The service does not decide product priority, tenant quota, or which task should be admitted by organizational policy.',
  ],
  [
    'Run ownership',
    'Leases use worker identity, lease identity, an increasing fencing token, and the storage clock; stale mutations are rejected.',
    'An indeterminate run still needs operator reconciliation and side-effect-specific evidence before retry.',
  ],
  [
    'Session restore',
    'PostgreSQL and SQLite share cursor-based committed-event replay; interrupted nonterminal work closes without automatic re-execution.',
    'Delivery is at least once, not exactly once, and clients must deduplicate repeated events.',
  ],
  [
    'Artifacts',
    'Objects are size-bounded, digest-recorded, and conditionally written; service-generated keys are hash-addressed and registry rows are immutable.',
    'Durability still depends on a correctly operated object store, retention policy, backup plan, and access controls.',
  ],
  [
    'Audit export',
    'Deterministic JSONL advances its checkpoint only after the object and metadata are durable; outbox delivery is ordered and retryable.',
    'Redaction is a bounded process guard, not general DLP, and a signed URL remains a bearer capability.',
  ],
  [
    'Kubernetes',
    'The repository renders a default-deny, resource-bounded reference topology with separate secret contracts and persistent stores.',
    'The base cannot become ready as-is, single-node storage is not HA, and the sandbox executor does not exist yet.',
  ],
  [
    'Authorization',
    'Non-loopback startup requires a configured bearer token; every non-health route requires it, and TLS remains an external gateway requirement.',
    'Health endpoints are public, and the control-plane token is one broad trust domain, not tenant-aware or route-scoped authorization.',
  ],
  [
    'Operational evidence',
    'An isolated audit of the exact merge passed 421 deterministic tests, type checking, and manifest rendering; a pre-commit public task-report comment records 102 allowed paths with zero violations, and merge CI and CodeQL passed.',
    'No real PostgreSQL/MinIO fault test, cluster apply, multi-pod E2E, load test, soak test, chaos test, or capacity number exists.',
  ],
] as const

export function HarnessControlPlaneArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / MILESTONE CONTRACT</p>
        <h2>M3 made the agent loop permission-aware. M4 asks what survives a crash.</h2>
        <p className="article-lede">
          Harness Platform M4 turns one connection-owned run into a durable control-plane path:
          digest-bound task snapshots, fenced worker leases, PostgreSQL session replay,
          content-addressed artifacts, automatic audit export, and a fail-closed Kubernetes
          topology.
        </p>
        <p>
          The important word is <strong>durable</strong>, not distributed. The release defines how
          state advances when workers retry, disappear, reconnect, or disagree. It refuses to call
          an uncertain tool outcome successful and refuses to make a stale worker authoritative
          again. That is the control-plane foundation needed before a real cluster can safely add
          scale.
        </p>
        <CodeBlock
          code={milestoneContract}
          label="Stage 1 / Milestone 4 contract (condensed)"
          language="text"
          sourceHref={source('tasks/m4-control-plane.yaml')}
        />
        <ArticleCallout title="PRODUCTION-SHAPED, NOT PRODUCTION-PROVEN" tone="warning">
          <p>
            PostgreSQL and S3 behavior is exercised through injected offline protocol fakes. The
            Kubernetes base renders and passes structural checks, but it was not applied to a live
            cluster. M4 exercises the implemented state machine and simulated failure-handling
            contracts; it does not publish a capacity, availability, or isolation result.
          </p>
        </ArticleCallout>
      </section>

      <section id="m3-to-m4">
        <p className="eyebrow">02 / FROM SERVICE TO CONTROL PLANE</p>
        <h2>The kernel stays small while ownership moves into durable infrastructure.</h2>
        <p>
          M3 wrapped the kernel in one permissioned WebSocket service. Its session belonged to one
          connection, its audit history lived locally, and its advertised replay capability was
          false. That was honest and sufficient for a single process. It was not enough for a worker
          pool in which a process can die after producing evidence but before updating its
          bookkeeping—or after beginning an external effect whose result is unknown.
        </p>
        <CodeBlock code={m3ToM4} label="Boundary shift from M3 to M4" language="text" />
        <p>
          M4 does not move policy or tool execution into the scheduler. The control plane owns
          task/run admission, state, leases, artifacts, audit progress, and run reconciliation. The
          agent server owns durable session ownership, ACP restore, and the permissioned kernel
          session. Both use the typed event stream as the evidence contract, and both can share
          PostgreSQL without collapsing into one service.
        </p>
      </section>

      <section id="delivery">
        <p className="eyebrow">03 / CHECKS-GATED DELIVERY</p>
        <h2>One task contract became one checks-gated public merge.</h2>
        <p>
          The implementation was committed as{' '}
          <a href={`${repository}/commit/${implementation}`} rel="external">
            <code>{implementation.slice(0, 7)}</code>
          </a>
          , submitted through{' '}
          <a href={`${repository}/pull/2`} rel="external">
            pull request #2
          </a>
          , and merged into public <code>main</code> at{' '}
          <a href={`${repository}/commit/${commit}`} rel="external">
            <code>{commit.slice(0, 7)}</code>
          </a>
          . The task contract intentionally denied network access and Git push during
          implementation; commit, hosted checks, and merge happened only in the explicit release
          follow-up.
        </p>
        <CodeBlock
          code={deliveryBoundary}
          label="Authoritative Git release boundary"
          language="text"
          sourceHref={`${repository}/compare/${baseline}...${commit}`}
        />
        <div className="article-metrics" aria-label="Harness M4 public change summary">
          <div>
            <strong>102</strong>
            <span>changed files</span>
          </div>
          <div>
            <strong>12,934</strong>
            <span>insertions</span>
          </div>
          <div>
            <strong>484</strong>
            <span>deletions</span>
          </div>
          <div>
            <strong>1 PR</strong>
            <span>merged delivery</span>
          </div>
        </div>
        <p>
          These figures come from the public pull request and Git comparison. The development
          page&apos;s smaller editor summary measured a transient working session, not the committed
          M3-to-M4 range, so it is not used as release evidence.
        </p>
      </section>

      <section id="scheduling">
        <p className="eyebrow">04 / FENCED SCHEDULING</p>
        <h2>A worker holds a temporary capability, not permanent ownership.</h2>
        <p>
          Admission validates the complete task manifest, canonicalizes it, hashes it, and stores
          the immutable snapshot beside a caller-supplied idempotency key. Repeating the same
          admission returns the same record. Reusing the key for different bytes is a conflict.
          Scheduling applies the same rule to a run, so a lost HTTP response cannot create a second
          logical task or run by accident.
        </p>
        <CodeBlock
          code={schedulingContract}
          label="Admission, lease, and reconciliation contract"
          language="text"
          sourceHref={source('services/control-plane/src/scheduler.ts')}
        />
        <p>
          A claim returns a worker ID, opaque lease ID, expiry, and monotonically increasing fencing
          token. Start, heartbeat, and completion require all four ownership values and a still-live
          lease. PostgreSQL evaluates expiry with its own clock. That prevents two machines with
          skewed clocks from independently deciding that they own the same run, while the fencing
          token prevents the old owner from committing after a takeover.
        </p>
        <CodeBlock
          code={stateMachine}
          label="Legal run-state transitions (condensed)"
          language="text"
          sourceHref={source('services/control-plane/src/state.ts')}
        />
        <p>
          The most important transition is the least optimistic one. An expired <em>leased</em> run
          has not crossed the durable start boundary and is safe to requeue under the worker
          protocol. An expired <em>running</em> run may already have crossed an external boundary,
          so it becomes <code>indeterminate</code>. Only an operator, using the current row version,
          can retry or cancel it.
        </p>
        <FencedSchedulingDiagram />
        <ArticleCallout title="FENCING PROTECTS THE DATABASE, NOT THE OUTSIDE WORLD" tone="warning">
          <p>
            A stale worker cannot update canonical Harness state. It may still have called a model,
            payment API, repository host, or another external system. Those effects need their own
            idempotency keys, reconciliation evidence, or compensating action before an operator
            retries the run.
          </p>
        </ArticleCallout>
      </section>

      <section id="durable-sessions">
        <p className="eyebrow">05 / DURABLE SESSIONS AND REPLAY</p>
        <h2>Recovery replays committed history and refuses to invent a successful turn.</h2>
        <p>
          The sessions package now exposes one store contract with SQLite and PostgreSQL
          implementations. Both validate events on write and read, append through the store
          contract, assign monotonically increasing per-session sequences, lease the active owner,
          and paginate by an explicit last-seen cursor. PostgreSQL additionally rejects event-row
          updates and deletes with a trigger. When a durable store is configured, the agent server
          can advertise ACP session replay without making its transport the source of truth.
        </p>
        <CodeBlock
          code={restoreContract}
          label="ACP restore semantics (condensed)"
          language="text"
          sourceHref={source('services/agent-server/src/connection.ts')}
        />
        <p>
          If an active session&apos;s owner lease is still valid, another connection cannot restore
          it. After expiry, recovery inspects the durable tail. A terminal{' '}
          <code>agent.stopped</code> means only the row-close bookkeeping was lost, so the session
          closes as completed. For a nonterminal tail, recovery atomically appends one{' '}
          <code>session.restored</code> event with outcome <code>interrupted</code> and closes the
          session. The uncertain turn is never executed again during restore.
        </p>
        <CodeBlock
          code={persistenceBoundary}
          label="Evidence-before-effect ordering"
          language="text"
          sourceHref={source('packages/kernel/src/run.ts')}
        />
        <p>
          This required changing event observation from fire-and-forget to awaitable publication at
          model and tool boundaries. A persistence failure now stops the loop before the next side
          effect. Replayed committed events are delivered at least once, so clients still
          deduplicate by event ID and sequence; recovery is not an exactly-once claim.
        </p>
        <ReplaySafetyDiagram />
      </section>

      <section id="artifacts">
        <p className="eyebrow">06 / ARTIFACTS, OUTBOX, AND AUDIT</p>
        <h2>State commits with an ordered outbox; evidence publishes later.</h2>
        <p>
          Task, run, artifact, and event-producing audit-checkpoint domain mutations enqueue their
          typed event in the same PostgreSQL transaction. The empty-page audit bookkeeping case
          advances its checkpoint without creating a recursive event. The outbox assigns a stable
          event ID and commit-ordered outbox sequence. Its publisher later appends the event to the
          global session-event sequence used by audit export. If delivery succeeds but
          acknowledgement is lost, the sink may see that same event ID again and must treat it as an
          idempotent retry.
        </p>
        <CodeBlock
          code={artifactContract}
          label="Artifact and audit evidence chain"
          language="text"
          sourceHref={source('services/control-plane/src/artifacts.ts')}
        />
        <p>
          Artifact uploads are size-bounded and write-once through the service contract. A
          default-generated key carries the SHA-256 digest; a conditional-write conflict causes the
          registry to read and hash the existing object rather than trust object metadata.
          PostgreSQL rejects updates and deletes to artifact rows. Out-of-band object mutation
          remains an ACL and operator concern. The audit exporter reads the already-redacted
          canonical event stream, produces deterministic JSONL segments, uploads the object, and
          then commits the registry entry and stream checkpoint together.
        </p>
        <ArtifactAuditDiagram />
        <ArticleCallout title="A SIGNED URL IS STILL A SECRET" tone="warning">
          <p>
            The service returns bounded SigV4 download URLs without exposing the signing secret, but
            the complete URL is a bearer capability and necessarily exposes an access-key
            identifier; temporary credentials may also add a session token. M4 keeps full URLs out
            of events, reports, registry rows, and logs. Gateways and clients must do the same.
          </p>
        </ArticleCallout>
      </section>

      <section id="kubernetes">
        <p className="eyebrow">07 / KUBERNETES TOPOLOGY</p>
        <h2>The base refuses readiness while critical environment choices remain placeholders.</h2>
        <p>
          Docker Compose remains a local-development aid. The M4 deployment contract is raw
          Kustomize: two application services, two persistent reference stores, separate service
          accounts, health probes, resource bounds, disruption budgets, topology spreading, two
          namespaces, Restricted Pod Security, and default-deny ingress and egress with only the
          required service paths reopened.
        </p>
        <CodeBlock
          code={kubernetesContract}
          label="Reference topology and deliberate deployment blockers"
          language="text"
          sourceHref={source('infra/kubernetes/README.md')}
        />
        <p>
          Applying the base may create partial resources, but it cannot become a ready, working
          deployment as-is: five workload images point to <code>example.invalid</code> sentinels,
          both persistent stores require an unresolved storage class, and the four example Secret
          files are excluded from rendered output. The reference Postgres and MinIO StatefulSets
          each have one replica; their disruption budgets do not turn them into highly available
          services.
        </p>
        <p>
          The sandbox path is even more explicit. Kustomize stores a suspended Job template inside a
          ConfigMap; it does not create a Job. No M4 process reads that ConfigMap, no Role or
          RoleBinding grants Job creation, and no trusted component stages workspace PVCs. A future
          executor must validate every image, command, mount, deadline, workspace, and network
          choice before it can materialize and unsuspend a run.
        </p>
        <M4DeploymentEvidenceDiagram />
      </section>

      <section id="debugging">
        <p className="eyebrow">08 / WHAT BROKE</p>
        <h2>The review kept turning “durable” nouns into ordered failure behavior.</h2>
        <p>
          The shared development record is useful for chronology, not authority. The public commit,
          tests, public task-report comment, and pull request establish what shipped. The
          development record shows why the final design is more conservative than the first
          implementation.
        </p>
        <ol className="article-steps">
          <li>
            <span>01</span>
            <div>
              <h3>Publishing an event did not initially block the side effect</h3>
              <p>
                A synchronous observer shape could begin persistence and continue into a model or
                tool call. M4 made the boundary awaitable so a failed durable append stops execution
                before the effect. Cleanup must then leave the session active rather than falsely
                close it; lease expiry lets restore record the nonterminal turn as interrupted.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>A dead running worker could not safely return to the queue</h3>
              <p>
                Requeueing would imply nothing happened. Running lease expiry now produces{' '}
                <code>indeterminate</code>, preserving uncertainty until an operator examines the
                external system and chooses retry or cancel.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Worker clocks were not a safe ownership oracle</h3>
              <p>
                Lease checks moved into storage-clock predicates and every active worker mutation
                gained a fencing token. A late heartbeat or completion from an old owner cannot
                advance the canonical row.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>State and events could diverge between two writes</h3>
              <p>
                An event emitted after committing state could be lost during a crash. The fix was a
                transactional outbox with stable IDs and commit order. A proposed homegrown database
                transport was replaced with the maintained <code>pg</code> driver and bounded pool
                behavior.
              </p>
            </div>
          </li>
          <li>
            <span>05</span>
            <div>
              <h3>Audit retries could skip or mislabel evidence</h3>
              <p>
                Object bytes, registry metadata, sequence range, and checkpoint now form one
                idempotent chain. The checkpoint moves only after object upload and the atomic
                registry/checkpoint commit, and a conflicting completion or artifact key must match
                exactly. The exporter filters out <code>audit.exported</code> and audit-kind{' '}
                <code>artifact.registered</code> events; other artifact registrations remain
                evidence, so export cannot recursively feed itself.
              </p>
            </div>
          </li>
          <li>
            <span>06</span>
            <div>
              <h3>A green readiness endpoint could hide a dead background path</h3>
              <p>
                Outbox publication and audit draining now mark readiness unhealthy immediately on
                failure and healthy only after recovery. Connection and request concurrency are
                bounded so HTTP pipelining cannot create an unbounded work queue.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section id="verification">
        <p className="eyebrow">09 / VERIFIED RESULT</p>
        <h2>
          The committed evidence validates deterministic contracts, not a deployed service level.
        </h2>
        <p>
          At the exact public merge, an isolated source verification passed all 421 tests in 32
          files, strict TypeScript, and a complete Kustomize render. The render produced 32 objects
          and no Secret objects. The generated M4 JSON is intentionally Git-ignored, but its full
          contents were preserved in a public pull-request comment: 421 tests, all 102 changed paths
          inside policy, and zero violations.
        </p>
        <CodeBlock code={verification} label="Verification at the M4 merge" language="shell" />
        <div className="article-metrics" aria-label="Harness M4 verification summary">
          <div>
            <strong>421 / 421</strong>
            <span>workspace tests</span>
          </div>
          <div>
            <strong>32 / 32</strong>
            <span>test files</span>
          </div>
          <div>
            <strong>0</strong>
            <span>path violations</span>
          </div>
          <div>
            <strong>4</strong>
            <span>green PR checks</span>
          </div>
        </div>
        <p>
          Pull request #2 passed four checks: the{' '}
          <a href={`${repository}/actions/runs/33433105988`} rel="external">
            exit-gate workflow
          </a>
          , a separate CodeQL status check, and the Actions and JavaScript/TypeScript analysis jobs
          in the{' '}
          <a href={`${repository}/actions/runs/33433099031`} rel="external">
            CodeQL workflow
          </a>
          . The verified merge followed only after all required checks were green.
        </p>
        <ArticleCallout title="WHAT THE 421 TESTS DO NOT DO" tone="warning">
          <p>
            The default lane is deliberately deterministic and offline. PostgreSQL and S3 boundaries
            use injected fakes; there is no live database/object-store failover, real Kubernetes
            apply, cross-pod recovery, external provider retry, load, soak, or chaos run. Passing
            unit and integration contracts is not a capacity benchmark.
          </p>
        </ArticleCallout>
      </section>

      <section id="limits">
        <p className="eyebrow">10 / CURRENT TRUTH</p>
        <h2>M4 is a durable control-plane contract with deliberately unproven operations.</h2>
        <div
          aria-label="Harness M4 verified and unverified boundaries"
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
          The accurate description is <strong>production-shaped durable control plane</strong>. It
          is not a production Kubernetes deployment, a multi-tenant authorization system, an
          exactly-once executor, a highly available storage platform, or evidence of throughput at
          scale.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">11 / FILE GUIDE</p>
        <h2>Each durable boundary has one inspectable home.</h2>
        <div className="file-guide">
          <article>
            <h3>Scheduling and state</h3>
            <ul>
              <li>
                <a href={source('services/control-plane/src/scheduler.ts')} rel="external">
                  services/control-plane/src/scheduler.ts
                </a>{' '}
                — typed admission, claims, heartbeats, completion, cancellation, and reconciliation.
              </li>
              <li>
                <a href={source('services/control-plane/src/state.ts')} rel="external">
                  services/control-plane/src/state.ts
                </a>{' '}
                — the legal run-state transition graph.
              </li>
              <li>
                <a href={source('services/control-plane/src/postgres.ts')} rel="external">
                  services/control-plane/src/postgres.ts
                </a>{' '}
                — storage-clock fences, transactions, artifacts, checkpoints, and outbox rows.
              </li>
            </ul>
          </article>
          <article>
            <h3>Sessions and effects</h3>
            <ul>
              <li>
                <a href={source('packages/sessions/src/store.ts')} rel="external">
                  packages/sessions/src/store.ts
                </a>{' '}
                — shared durable-session and event-log contract.
              </li>
              <li>
                <a href={source('packages/sessions/src/postgres.ts')} rel="external">
                  packages/sessions/src/postgres.ts
                </a>{' '}
                — append-only PostgreSQL sessions, sequences, owner leases, and atomic recovery.
              </li>
              <li>
                <a href={source('services/agent-server/src/connection.ts')} rel="external">
                  services/agent-server/src/connection.ts
                </a>{' '}
                — ACP cursor restore and interrupted-session closure.
              </li>
              <li>
                <a href={source('packages/kernel/src/run.ts')} rel="external">
                  packages/kernel/src/run.ts
                </a>{' '}
                — awaited evidence-before-model/tool ordering.
              </li>
            </ul>
          </article>
          <article>
            <h3>Artifacts and audit</h3>
            <ul>
              <li>
                <a href={source('services/control-plane/src/artifacts.ts')} rel="external">
                  services/control-plane/src/artifacts.ts
                </a>{' '}
                — conditional object writes and immutable registry behavior.
              </li>
              <li>
                <a href={source('services/control-plane/src/audit.ts')} rel="external">
                  services/control-plane/src/audit.ts
                </a>{' '}
                — deterministic JSONL projection, splitting, and checkpoint progression.
              </li>
              <li>
                <a href={source('services/control-plane/src/outbox.ts')} rel="external">
                  services/control-plane/src/outbox.ts
                </a>{' '}
                — ordered, fenced, at-least-once publication.
              </li>
              <li>
                <a href={source('services/control-plane/src/s3.ts')} rel="external">
                  services/control-plane/src/s3.ts
                </a>{' '}
                — bounded S3-compatible requests and SigV4 download capabilities.
              </li>
            </ul>
          </article>
          <article>
            <h3>Deployment and proof</h3>
            <ul>
              <li>
                <a href={`${repository}/tree/${commit}/infra/kubernetes`} rel="external">
                  infra/kubernetes/
                </a>{' '}
                — reference services, stores, policies, resource limits, and suspended sandbox
                contract.
              </li>
              <li>
                <a href={source('tasks/m4-control-plane.yaml')} rel="external">
                  tasks/m4-control-plane.yaml
                </a>{' '}
                — scope, permissions, acceptance, and delivery policy.
              </li>
              <li>
                <a href={`${repository}/pull/2#issuecomment-5483708809`} rel="external">
                  Pull request #2 run-report comment
                </a>{' '}
                — public copy of the generated 421-test and path-policy result; the local JSON is
                intentionally ignored.
              </li>
              <li>
                <a href={source('SECURITY.md')} rel="external">
                  SECURITY.md
                </a>{' '}
                — capability, storage, replay, transport, and remaining trust boundaries.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">12 / WHAT IS NEXT</p>
        <h2>The next milestone is operational proof, not another architecture noun.</h2>
        <ol className="next-list">
          <li>
            <span>01</span>
            <div>
              <h3>Build a real environment overlay</h3>
              <p>
                Supply reviewed immutable images, external Secrets, encrypted storage classes, TLS,
                narrowly scoped egress, and target-cluster admission checks.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Separate migration power from runtime power</h3>
              <p>
                Run one-shot migrations, give control plane and agent server independent
                least-privilege roles, and prove backup plus restore for PostgreSQL and artifacts.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Implement the Kubernetes executor</h3>
              <p>
                Add narrowly scoped namespace RBAC, trusted workspace staging, exact template
                substitution, run-specific network policy, cleanup evidence, and denial tests.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Exercise real failure</h3>
              <p>
                Run PostgreSQL and S3 integration tests, kill owners between every durable/effect
                boundary, force outbox and audit recovery, and test multi-replica takeover.
              </p>
            </div>
          </li>
          <li>
            <span>05</span>
            <div>
              <h3>Make external effects reconcilable</h3>
              <p>
                Carry provider idempotency keys where available, store effect receipts, and define
                operator playbooks for every indeterminate tool class.
              </p>
            </div>
          </li>
          <li>
            <span>06</span>
            <div>
              <h3>Earn the word scale</h3>
              <p>
                Only after security review, scoped service identity, observability, and restore
                drills should the project publish retained load, soak, chaos, and capacity results.
              </p>
            </div>
          </li>
        </ol>
        <ArticleCallout title="M5 REMAINS CONDITIONAL">
          <p>
            The roadmap adds another language only if M3–M4 profiling produces a measured reason. A
            durable control plane is not itself evidence that the TypeScript implementation is the
            bottleneck.
          </p>
        </ArticleCallout>
      </section>

      <section id="sources">
        <p className="eyebrow">13 / EVIDENCE LEDGER</p>
        <h2>Every public claim resolves to a pinned source or named evidence class.</h2>
        <ul className="source-list">
          <li>
            <a href={`${repository}/commit/${commit}`} rel="external">
              M4 merge <code>{commit.slice(0, 7)}</code>
            </a>{' '}
            — the source pin for every implementation claim in this note.
          </li>
          <li>
            <a href={`${repository}/pull/2`} rel="external">
              Pull request #2
            </a>{' '}
            — authoritative diff, checks, and merge chronology.
          </li>
          <li>
            <a href={source('tasks/m4-control-plane.yaml')} rel="external">
              M4 task contract
            </a>{' '}
            — accepted scope, guarantees, offline test lane, permissions, and delivery boundary.
          </li>
          <li>
            <a href={`${repository}/pull/2#issuecomment-5483708809`} rel="external">
              Public run-report comment
            </a>{' '}
            — the full generated report: 421 tests, 102 changed paths, zero policy violations, and
            task-session metadata. The corresponding local JSON is intentionally Git-ignored.
          </li>
          <li>
            <a href={source('ARCHITECTURE.md')} rel="external">
              Architecture
            </a>
            ,{' '}
            <a href={source('EVENTS.md')} rel="external">
              event ordering
            </a>
            ,{' '}
            <a href={source('SECURITY.md')} rel="external">
              security contract
            </a>
            , and{' '}
            <a href={source('infra/kubernetes/README.md')} rel="external">
              Kubernetes operations guide
            </a>{' '}
            — repository-owned explanations of the boundaries shown here.
          </li>
          <li>
            Publication audit — an isolated verification of the pinned merge, used for the 421-test,
            typecheck, rendered-object, and no-Secret results. The private development conversation
            supplied chronology only and is intentionally not linked as public implementation
            evidence.
          </li>
        </ul>
      </section>
    </>
  )
}
