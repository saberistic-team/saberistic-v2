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

export function KernelBoundaryDiagram() {
  return (
    <DiagramFrame
      description="M6 gives the runtime one narrow job: admit and snapshot a run, assemble its message context, make one text-only model request, and publish its lifecycle. Models and event storage remain injected ports; policy, tools, workspaces, credentials, and durable infrastructure remain outside."
      scrollable
      title="M6 draws a narrow kernel boundary"
    >
      <div
        aria-label="The MinimalAgentRuntime owns synchronous run admission and input snapshotting, message and context state, one text-only model request, ordered event publication, cancellation, and a small terminal tombstone. It receives a ModelAdapter and an EventStore port from the caller. M6 does not provide a durable store implementation, provider credentials, policy decisions, workspace operations, context compaction, replay, or tool execution. Tool and Workspace remain compatibility targets for later milestones."
        className="harness-m3-diagram harness-m3-diagram--sandbox"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node
            detail="register run · copy caller-owned input"
            eyebrow="RUNTIME OWNS"
            tone="accent"
          >
            Admit + snapshot
          </Node>
          <Arrow label="assemble" />
          <Node detail="messages · context · queued steering" eyebrow="RUNTIME OWNS">
            Turn state
          </Node>
          <Arrow label="request once" />
          <Node detail="one text-only request · no tool loop" eyebrow="RUNTIME OWNS">
            Model boundary
          </Node>
          <Arrow label="publish" />
          <Node detail="ordered events · cancel · tombstone" eyebrow="RUNTIME OWNS" tone="safe">
            Lifecycle
          </Node>
        </div>
        <div className="harness-m3-diagram__support-grid">
          <section>
            <strong>INJECTED MODEL PORT</strong>
            <span>ModelAdapter streams typed text deltas and one completed response.</span>
          </section>
          <section>
            <strong>INJECTED EVENT PORT</strong>
            <span>EventStore accepts ordered boundaries; M6 adds no durable backend.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>OUTSIDE M6</strong>
            <span>
              Policy · tool execution · workspace operations · credentials · replay · compaction.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function AppendBeforeYieldDiagram() {
  return (
    <DiagramFrame
      description="The runtime eagerly appends and queues the turn-start and user-message admission pair. After the consumer acknowledges that pair, the runtime appends model.request and waits for the consumer to acknowledge it before invoking the model. Provider output is then mapped into canonical runtime boundaries; every such boundary is appended before yield."
      scrollable
      title="Append before yield makes evidence part of control flow"
    >
      <div
        aria-label="During eager admission, the runtime appends and queues turn.started and the completed user message without waiting for iterator demand. It waits for the user message to be consumed, then appends and queues model.request, and does not invoke the model until the consumer acknowledges that request event. In the post-admission path, a consumer advance permits the next provider output. A text delta maps to one canonical message.delta event. The provider's response.completed event is not persisted or yielded itself; it ends model pulling and drives the separately persisted sequence model.response, completed assistant message, and turn.completed. Every canonical runtime boundary must be accepted by EventStore before it may be yielded, and each consumer advance gates further work. If append fails after model invocation, the runtime triggers the forwarded AbortSignal and attempts best-effort iterator cleanup; a provider may ignore the signal. The consumer receives a typed event-append error and no later boundary is exposed. This is an ordering contract over an injected EventStore, not a new durable database implementation."
        className="harness-m3-diagram harness-m3-diagram--permission"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="post-admission consumer advance" eyebrow="BACKPRESSURE" tone="accent">
            next()
          </Node>
          <Arrow label="permit output" />
          <Node
            detail="delta → message.delta · terminal → response/message/turn"
            eyebrow="RUNTIME MAP"
          >
            Canonical boundary
          </Node>
          <Arrow label="await" />
          <Node
            detail="ordered append must acknowledge first"
            eyebrow="EVENTSTORE PORT"
            tone="warning"
          >
            Accept boundary
          </Node>
          <Arrow label="only then" />
          <Node detail="release the persisted event to caller" eyebrow="ASYNC ITERATOR" tone="safe">
            Yield
          </Node>
        </div>
        <div className="harness-m3-diagram__support-grid">
          <section>
            <strong>EAGER ADMISSION</strong>
            <span>Append and queue turn.started plus the completed user message first.</span>
          </section>
          <section>
            <strong>REQUEST BOUNDARY</strong>
            <span>Append model.request; invoke the model only after the consumer accepts it.</span>
          </section>
          <section>
            <strong>STEADY STATE</strong>
            <span>Each advance accepts one runtime event and gates any further work.</span>
          </section>
        </div>
        <div className="harness-m3-diagram__decision-grid">
          <section>
            <strong>CONSUMER STALLS</strong>
            <span>The runtime does not pull the next model event ahead of demand.</span>
          </section>
          <section>
            <strong>APPEND SUCCEEDS</strong>
            <span>The same ordered event may cross the public iterator boundary.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>APPEND FAILS</strong>
            <span>Trigger AbortSignal, best-effort close, and prevent later boundaries.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function LifecycleDiagram() {
  return (
    <DiagramFrame
      description="The runtime registers an active run before asynchronous production, accepts steering only before its sole model boundary, and funnels active cancellation or iterator abandonment into one attempted canceled terminal append. A failed terminal append rejects with a typed error and leaves a failed tombstone."
      scrollable
      title="Steering and cancellation close around one request boundary"
    >
      <div
        aria-label="The runtime synchronously registers an active run and snapshots its input. Steering submitted before the model request boundary is appended before steer returns and becomes part of the sole model request. Once that boundary has passed, steering is closed and a late steering attempt receives a typed rejection instead of creating an orphaned event. Repeated cancellation requests while active coalesce and attempt one canceled turn-completed append. AbortSignal is forwarded at the model boundary when the model has been invoked. Returning or throwing from the consumer iterator is treated as abandonment through the same cancellation path. If the canceled terminal append fails, the control rejects with EventAppendError and the runtime retains a failed tombstone. Completed, canceled, or failed runs retain only small tombstones, not replay state. M6 makes one text-only request and executes zero tools."
        className="harness-m3-diagram harness-m3-diagram--service"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="register synchronously · snapshot input" eyebrow="ACTIVE RUN" tone="accent">
            Admission
          </Node>
          <Arrow label="before boundary" />
          <Node detail="append before steer() returns" eyebrow="EARLY STEERING">
            Queue context
          </Node>
          <Arrow label="close steering" />
          <Node
            detail="one text request · zero tool execution"
            eyebrow="SOLE BOUNDARY"
            tone="warning"
          >
            Invoke model
          </Node>
          <Arrow label="finish once" />
          <Node detail="completed · canceled · failed metadata" eyebrow="TERMINAL" tone="safe">
            Small tombstone
          </Node>
        </div>
        <div className="harness-m3-diagram__decision-grid">
          <section className="harness-m3-diagram__danger">
            <strong>LATE STEERING</strong>
            <span>Reject with a typed steering-closed error; do not append an orphan.</span>
          </section>
          <section>
            <strong>ACTIVE CANCEL</strong>
            <span>
              Coalesce calls; forward abort at the model boundary; attempt terminal append.
            </span>
          </section>
          <section>
            <strong>ITERATOR ABANDONED</strong>
            <span>
              Return or throw follows cancellation; append failure leaves a failed tombstone.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function CompatibilityRoadmapDiagram() {
  return (
    <DiagramFrame
      description="M6 adds a streaming runtime beside the existing surface instead of replacing it. A completion-only model can cross the new boundary through CompleteModelAdapter; the tool loop, bounded workspace, compaction, replay, and self-hosted runner stay assigned to M7–M12."
      scrollable
      title="Compatibility now, self-hosting in later milestones"
    >
      <div
        aria-label="The existing runAgent function and Model complete method remain available. CompleteModelAdapter can wrap a completion-only Model and expose the M6 streaming ModelAdapter contract, which MinimalAgentRuntime consumes. M6 is complete only as an additive runtime-contract and event-vocabulary layer with one text-only request and no tool execution. M7 plans the deterministic session and tool loop. M8 plans the bounded workspace and five tools. M9 plans follow-ups and context compaction. M10 plans durable replay and restart. M11 plans an offline kernel-backed self-host runner. M12 plans a live self-hosted harness doctor task. M7 through M12 are planned, not implemented by M6."
        className="harness-m3-diagram harness-m3-diagram--permission"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="one request · ordered events · no tools" eyebrow="M6 COMPLETE" tone="safe">
            MinimalAgentRuntime
          </Node>
          <Arrow label="calls" />
          <Node detail="streaming boundary" eyebrow="M6 PORT" tone="accent">
            ModelAdapter.stream()
          </Node>
          <Arrow label="optional bridge" />
          <Node detail="adapts a completion-only model" eyebrow="M6 ADAPTER">
            CompleteModelAdapter
          </Node>
          <Arrow label="delegates" />
          <Node detail="completion-only model contract remains" eyebrow="KEPT" tone="safe">
            Model.complete()
          </Node>
        </div>
        <div className="harness-m3-diagram__support-grid">
          <section>
            <strong>LEGACY LANE · KEPT</strong>
            <span>runAgent() → Model.complete()</span>
          </section>
          <section>
            <strong>NATIVE M6 LANE</strong>
            <span>MinimalAgentRuntime → streaming ModelAdapter</span>
          </section>
          <section>
            <strong>OPTIONAL M6 BRIDGE</strong>
            <span>MinimalAgentRuntime → CompleteModelAdapter → Model.complete()</span>
          </section>
        </div>
        <div className="harness-m3-diagram__decision-grid">
          <section>
            <strong>M6 · COMPLETE</strong>
            <span>Additive runtime contracts, model stream, event vocabulary, and lifecycle.</span>
          </section>
          <section>
            <strong>M7–M9 · PLANNED</strong>
            <span>
              M7 deterministic loop · M8 bounded workspace + five tools · M9 follow-ups +
              compaction.
            </span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>M10–M12 · PLANNED</strong>
            <span>M10 replay · M11 offline runner · M12 live self-hosted doctor.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}
