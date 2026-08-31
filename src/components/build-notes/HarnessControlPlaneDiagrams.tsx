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

export function FencedSchedulingDiagram() {
  return (
    <DiagramFrame
      description="A validated manifest snapshot is admitted idempotently. A worker receives a time-bounded lease and increasing fencing token, heartbeats with the same ownership proof, and may commit a transition only while that proof remains current. Expired leased work returns to the queue; expired running work becomes indeterminate for operator reconciliation."
      scrollable
      title="The scheduler makes worker ownership temporary and provable"
    >
      <div
        aria-label="A task manifest is validated, canonically hashed, and admitted idempotently as a queued run. The scheduler leases the run to one worker with a lease ID, increasing fencing token, and database-clock expiry. Heartbeats extend only that exact live lease. Completion or failure is accepted only from its current owner. If a leased run expires it is requeued. If a running lease expires it becomes indeterminate for an operator to retry or cancel, and all writes from the stale worker are rejected."
        className="harness-m3-diagram harness-m3-diagram--service"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node
            detail="validated · canonical digest · retry-safe"
            eyebrow="ADMISSION"
            tone="accent"
          >
            Manifest snapshot
          </Node>
          <Arrow label="queue" />
          <Node detail="worker · lease ID · increasing fence" eyebrow="SCHEDULER">
            Leased run
          </Node>
          <Arrow label="owner start" />
          <Node detail="current owner heartbeats and writes" eyebrow="EXECUTION" tone="safe">
            Running
          </Node>
          <Arrow label="terminal transition" />
          <Node detail="passed · failed · blocked · canceled" eyebrow="TERMINAL" tone="safe">
            Recorded result
          </Node>
        </div>
        <div className="harness-m3-diagram__decision-grid">
          <section>
            <strong>LEASED EXPIRES → QUEUED</strong>
            <span>
              The run has not crossed the durable start boundary and may be offered to a worker
              again.
            </span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>RUNNING EXPIRES → INDETERMINATE</strong>
            <span>
              An operator checks outside evidence, then retries or cancels with the current row
              version.
            </span>
          </section>
          <section>
            <strong>STALE OWNER → REJECTED</strong>
            <span>
              Worker ID, lease ID, increasing fence, and the storage clock must all still agree.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function ReplaySafetyDiagram() {
  return (
    <DiagramFrame
      description="The kernel awaits durable publication before crossing model and tool boundaries. Restore starts from an explicit sequence cursor, replays committed later events at least once, and closes an interrupted in-flight turn instead of guessing that an uncertain side effect is safe to repeat."
      scrollable
      title="Replay restores evidence, not an illusion of exactly-once execution"
    >
      <div
        aria-label="Before a model call or tool side effect, the kernel awaits durable publication of the preceding event. The session store appends validated events with monotonically increasing sequence numbers. A reconnect asks to restore from an explicit cursor and receives committed events after that cursor with at-least-once delivery. If the prior owner disappeared during an in-flight turn, restore records an interrupted outcome and closes the session rather than automatically re-running the uncertain model or tool operation."
        className="harness-m3-diagram harness-m3-diagram--permission"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="await the durable event boundary" eyebrow="BEFORE EFFECT" tone="accent">
            Publish intent
          </Node>
          <Arrow label="append" />
          <Node detail="validated event · monotonic session seq" eyebrow="POSTGRES">
            Commit stream
          </Node>
          <Arrow label="cursor" />
          <Node detail="later committed events · at least once" eyebrow="RESTORE" tone="safe">
            Replay forward
          </Node>
          <Arrow label="uncertain turn" />
          <Node
            detail="mark interrupted · do not repeat automatically"
            eyebrow="INTERRUPTION"
            tone="warning"
          >
            Stop safely
          </Node>
        </div>
        <div className="harness-m3-diagram__decision-grid">
          <section>
            <strong>COMMITTED HISTORY</strong>
            <span>
              Replay is ordered from an explicit cursor and validates every event again on read.
            </span>
          </section>
          <section>
            <strong>DELIVERY</strong>
            <span>
              Clients must tolerate duplicates because the contract is at least once, not exactly
              once.
            </span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>NO BLIND RETRY</strong>
            <span>
              An interrupted model or tool turn is closed without retry when its outcome is
              uncertain.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function ArtifactAuditDiagram() {
  return (
    <DiagramFrame
      description="Control-plane mutations first enter a transactional outbox; its publisher joins those events to the same canonical stream used by durable sessions. The audit exporter creates deterministic JSONL, writes a content-addressed object, registers immutable metadata, and advances the checkpoint only after storage succeeds."
      scrollable
      title="Artifacts and audit export advance as one ordered evidence chain"
    >
      <div
        aria-label="An event-producing control-plane domain mutation commits a stable event to a transactional outbox. The leased and fenced publisher appends that event to the same validated redacted global stream used by durable session events. The audit exporter filters the canonical stream and creates deterministic newline-delimited JSON. It uploads the content-addressed object to S3-compatible storage, then registers immutable metadata and advances the checkpoint together in PostgreSQL. An empty audit page may advance only its checkpoint to avoid recursive events. A bounded signed URL can later be issued as a bearer capability; the URL is not persisted or logged."
        className="harness-m3-diagram harness-m3-diagram--sandbox"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="event-producing domain mutation" eyebrow="STATE CHANGE" tone="accent">
            Control-plane tx
          </Node>
          <Arrow label="same tx" />
          <Node detail="stable event ID · commit order · at least once" eyebrow="POSTGRES">
            Event outbox
          </Node>
          <Arrow label="publish" />
          <Node
            detail="session + control events · validated · redacted"
            eyebrow="CANONICAL STREAM"
            tone="safe"
          >
            Global cursor
          </Node>
          <Arrow label="export" />
          <Node detail="JSONL object · immutable row · checkpoint" eyebrow="AUDIT" tone="warning">
            Durable segment
          </Node>
        </div>
        <div className="harness-m3-diagram__support-grid">
          <section>
            <strong>CONTENT ADDRESS</strong>
            <span>
              The default key carries the byte digest; conflicting content cannot replace it through
              the service contract.
            </span>
          </section>
          <section>
            <strong>CHECKPOINT ORDER</strong>
            <span>
              The cursor moves only after storage and immutable registry admission both succeed.
            </span>
          </section>
          <section>
            <strong>ACCESS CAPABILITY</strong>
            <span>
              The signed URL is time-bounded but must still be protected like any bearer credential.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function M4DeploymentEvidenceDiagram() {
  return (
    <DiagramFrame
      description="M4 exercises the control path through deterministic offline tests and renders a hardened reference topology. It does not deploy that topology. The base keeps unresolved images and storage settings fail-closed, while a sandbox Job is stored only as a suspended template until a privileged executor overlay is separately reviewed."
      scrollable
      title="Production-shaped manifests are not a production deployment"
    >
      <div
        aria-label="Three evidence lanes. The public repository, pull-request report comment, and CI contain 421 deterministic tests, strict type checking, the M4 task contract, and four green pull-request checks. The reference Kubernetes lane contains control-plane and agent-server Deployments, Postgres and MinIO StatefulSets, health checks, resource limits, persistent claims, secret references, and default-deny network policies. Its sandbox Job exists only as a suspended template inside a ConfigMap and no executor materializes it. The unproven lane includes a real cluster deployment, live PostgreSQL and S3 fault recovery, backups and restore, TLS and identity integration, a functioning Kubernetes sandbox executor, load tests, soak tests, and capacity evidence."
        className="harness-m3-diagram harness-m3-diagram--evidence"
        role="img"
      >
        <section>
          <strong>PUBLIC + OFFLINE</strong>
          <b>421 / 421</b>
          <span>
            Deterministic workspace tests · strict typecheck · public M4 report comment · four green
            PR checks.
          </span>
        </section>
        <section>
          <strong>REFERENCE TOPOLOGY</strong>
          <b>Rendered, not deployed</b>
          <span>
            Default-deny services · persistent stores · health and resource bounds · split secret
            references.
          </span>
        </section>
        <section className="harness-m3-diagram__danger">
          <strong>NOT PROVEN</strong>
          <b>No live scale claim</b>
          <span>
            Cluster rollout · storage disaster recovery · active sandbox executor · load, soak, or
            capacity result.
          </span>
        </section>
      </div>
    </DiagramFrame>
  )
}
