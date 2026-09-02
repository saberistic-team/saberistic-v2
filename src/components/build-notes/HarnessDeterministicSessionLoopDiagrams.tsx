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

export function CanonicalSessionLoopDiagram() {
  return (
    <DiagramFrame
      description="At M7 merge 41af384, one admitted turn can cross multiple model rounds. Every user, assistant, and tool message advances immutable state; each model request identifies the exact revision it sees; and the run closes with one ordered terminal pair when both terminal appends succeed."
      scrollable
      title="The canonical M7 path completes a two-round tool loop"
    >
      <div
        aria-label="At merge 41af384, the canonical successful M7 sequence starts by persisting agent.started, turn.started, and a completed user message. The runtime then persists model.request before asking the model. In round one, the model emits a tool intention, represented by model.response and a completed assistant message. The runtime persists tool.call, policy.decision, the pure tool result, and a completed tool observation. If the policy decision is ask, permission.requested and permission.resolved are also persisted before execution. The tool observation advances message state and becomes input to a second persisted model.request. In round two, streamed text becomes one or more message.delta events followed by model.response and the completed assistant message. A successful run finally persists turn.completed and agent.stopped in that order. EventStore acknowledgement gates forward progress throughout; consumer backpressure becomes the production and model boundary after admission."
        className="harness-m3-diagram harness-m3-diagram--permission"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="agent.started · turn.started · user message" eyebrow="ADMIT" tone="accent">
            Persist the turn
          </Node>
          <Arrow label="round 1" />
          <Node detail="model.request · tool intent · assistant message" eyebrow="MODEL">
            Ask for the next move
          </Node>
          <Arrow label="observe" />
          <Node
            detail="tool.call · policy · result · tool message"
            eyebrow="PURE TOOL"
            tone="warning"
          >
            Fence the execution
          </Node>
          <Arrow label="round 2" />
          <Node
            detail="text deltas · response · message · terminal pair"
            eyebrow="COMPLETE"
            tone="safe"
          >
            Answer and close
          </Node>
        </div>
        <div aria-label="Sequence detail" className="harness-m3-diagram__support-grid">
          <section>
            <strong>ROUND ONE</strong>
            <span>model.request → model.response: tool_calls → completed assistant message.</span>
          </section>
          <section>
            <strong>EXECUTION FENCE</strong>
            <span>
              tool.call → policy.decision → optional permission pair → tool.result → tool message.
            </span>
          </section>
          <section>
            <strong>ROUND TWO + CLOSE</strong>
            <span>
              model.request → message.delta(s) → model.response: stop → assistant message → terminal
              pair.
            </span>
          </section>
        </div>
        <div aria-label="Legend" className="harness-m3-diagram__decision-grid">
          <section>
            <strong>BLUE · DURABLE ENTRY</strong>
            <span>The run and initial user turn are admitted before model work begins.</span>
          </section>
          <section>
            <strong>AMBER · EFFECT BOUNDARY</strong>
            <span>Validation and durable authorization stand between intent and execution.</span>
          </section>
          <section>
            <strong>GREEN · CLOSED RUN</strong>
            <span>turn.completed precedes agent.stopped when both appends succeed.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function DurableExecutionFenceDiagram() {
  return (
    <DiagramFrame
      description="At M7 merge 41af384, tool intent is durable before any effect. A registered call must survive strict argument validation and a persisted allow or ask resolution before a trusted in-process pure tool may run; invalid, unknown, denied, over-budget, or unpersisted calls cannot execute."
      scrollable
      title="Durable evidence fences every pure-tool execution"
    >
      <div
        aria-label="At merge 41af384, each model tool intention first becomes a persisted tool.call event. The runtime then looks up the registered tool and validates a detached argument snapshot. An unknown tool or invalid arguments produce a typed failed tool.result observation without deriving authorization, asking permission, or executing code. For a valid call, the tool first derives its authorization intent; the runtime then requires the trusted pure marker and chooses the M7 pure-only default or injected policy decision. policy.decision must be persisted before any effect. An allow decision may proceed. An ask decision additionally requires persisted permission.requested and permission.resolved events, and only an allowed resolution proceeds. A deny decision, a missing or failed resolver, or a hard deny does not execute. A permitted tool still runs in process and is not sandboxed. The runtime persists tool.result after execution. If tool.call or policy.decision cannot be appended, execution is prevented. An over-budget intention is recorded but cannot reach policy or execution."
        className="harness-m3-diagram harness-m3-diagram--sandbox"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="persist the model's intent first" eyebrow="DURABLE" tone="accent">
            tool.call
          </Node>
          <Arrow label="validate" />
          <Node detail="registered name · strict detached JSON input" eyebrow="NO EFFECT">
            Admit arguments
          </Node>
          <Arrow label="authorize" />
          <Node
            detail="derive intent · require pure marker · persist allow, ask, or deny"
            eyebrow="POLICY"
            tone="warning"
          >
            policy.decision
          </Node>
          <Arrow label="if allowed" />
          <Node
            detail="run trusted pure code · then persist observation"
            eyebrow="EFFECT + EVIDENCE"
            tone="safe"
          >
            Execute → tool.result
          </Node>
        </div>
        <div aria-label="Decision branches" className="harness-m3-diagram__decision-grid">
          <section className="harness-m3-diagram__danger">
            <strong>UNKNOWN OR INVALID</strong>
            <span>
              Persist a typed failed result; skip policy, permission, and execution entirely.
            </span>
          </section>
          <section>
            <strong>ASK</strong>
            <span>
              Persist permission.requested and permission.resolved; execute only an allowed
              resolution.
            </span>
          </section>
          <section>
            <strong>DENY OR OVER BUDGET</strong>
            <span>
              Deny returns an observation; an over-budget intent goes to budget termination. Neither
              executes.
            </span>
          </section>
        </div>
        <div aria-label="Legend and trust boundary" className="harness-m3-diagram__support-grid">
          <section>
            <strong>BLUE · INTENT</strong>
            <span>The requested action is part of the event record before evaluation.</span>
          </section>
          <section>
            <strong>AMBER · AUTHORIZATION</strong>
            <span>Durable policy and permission evidence gate the side effect.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>TRUST LIMIT</strong>
            <span>
              “Pure” is a trusted in-process marker, not isolation, a sandbox, or a proof of
              harmlessness.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function VersionedContextDiagram() {
  return (
    <DiagramFrame
      description="At M7 merge 41af384, message state and model context use version 1 plus a monotonic revision. Each appended user, assistant, or tool message creates a detached immutable snapshot, so every model.request can name the exact context it consumed."
      scrollable
      title="Versioned snapshots make every model round explainable"
    >
      <div
        aria-label="At merge 41af384, the runtime creates version 1 message state. If prior context contains r messages, its initial revision is r. Appending the new user message creates revision r plus 1. The first model request carries contextVersion 1 and messageRevision r plus 1. Appending the assistant tool-intent message creates revision r plus 2, and appending the tool observation creates revision r plus 3. The second model request therefore identifies context version 1 and revision r plus 3. Versioned state, context, and normalized message and tool payloads are detached, deeply immutable snapshots rather than live references to caller, provider, or tool-owned objects. Request containers and provider options are detached but are not uniformly deep-frozen. The normalizer rejects accessors, cycles, symbols, named array properties, non-finite numbers, excessive depth, excessive node counts, and oversized values. M7 defines a context.compacted event schema but does not compact context."
        className="harness-m3-diagram harness-m3-diagram--service"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node
            detail="prior messages: revision r · append user: r + 1"
            eyebrow="STATE v1"
            tone="accent"
          >
            Admit user message
          </Node>
          <Arrow label="snapshot" />
          <Node detail="contextVersion 1 · messageRevision r + 1" eyebrow="REQUEST ONE">
            Pin exact context
          </Node>
          <Arrow label="append" />
          <Node detail="assistant r + 2 · tool observation r + 3" eyebrow="STATE v1" tone="warning">
            Advance messages
          </Node>
          <Arrow label="snapshot" />
          <Node detail="contextVersion 1 · messageRevision r + 3" eyebrow="REQUEST TWO" tone="safe">
            Pin enriched context
          </Node>
        </div>
        <div aria-label="Snapshot properties" className="harness-m3-diagram__support-grid">
          <section>
            <strong>DETACHED</strong>
            <span>Later caller, provider, or tool mutation cannot rewrite accepted history.</span>
          </section>
          <section>
            <strong>DEEPLY IMMUTABLE</strong>
            <span>
              Messages, tool descriptors, arguments, and results cross as frozen snapshots.
            </span>
          </section>
          <section>
            <strong>REVISION-ADDRESSABLE</strong>
            <span>
              Each model request records the state version and message revision it consumed.
            </span>
          </section>
        </div>
        <div aria-label="Legend and input limits" className="harness-m3-diagram__decision-grid">
          <section>
            <strong>BLUE · FIRST SNAPSHOT</strong>
            <span>The admitted user message establishes the first request revision.</span>
          </section>
          <section>
            <strong>AMBER · OBSERVATION</strong>
            <span>Assistant intent and the tool result each advance message state once.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>REJECTED SHAPES</strong>
            <span>
              Accessors, cycles, symbols, exotic arrays, non-finite values, and excess size.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function TerminalConvergenceDiagram() {
  return (
    <DiagramFrame
      description="At M7 merge 41af384, successful completion, budget exhaustion, cooperative cancellation, model timeout, and non-persistence runtime failures converge on one terminal-finalization path. The path attempts turn.completed before agent.stopped and never retries an uncertain durable append."
      scrollable
      title="Every stop reason converges without inventing duplicate terminals"
    >
      <div
        aria-label="At merge 41af384, an active run may finish as completed, budget_exceeded, canceled, or failed. Normal completion wins after the final assistant-message acknowledgement. Step, token, and tool-call limits are hard budgets; step count defaults to eight model requests, while token and tool-call limits are caller supplied. The warning threshold is fifty percent, and exhaustion may force a final boundary warning. Each model round has a deadline that defaults to sixty seconds. Cancellation, iterator abandonment, and timeout forward AbortSignal and attempt iterator cleanup with a one-hundred-millisecond grace period, but cannot force external code that ignores cancellation. Outcomes other than event-persistence failure enter centralized finalization, which attempts turn.completed and then agent.stopped. A terminal event-construction failure before append may be retried once as a failed outcome. A durable append failure is never retried because the event store may already contain the attempted event. When both appends succeed, exactly one ordered terminal pair is exposed and the runtime retains only a small terminal tombstone."
        className="harness-m3-diagram harness-m3-diagram--permission"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="model rounds · pure tools · backpressure" eyebrow="ACTIVE" tone="accent">
            Run the loop
          </Node>
          <Arrow label="stop reason" />
          <Node
            detail="completed · budget · cancel · timeout · failure"
            eyebrow="CONVERGE"
            tone="warning"
          >
            Finalize once
          </Node>
          <Arrow label="append first" />
          <Node detail="status · usage · requests · calls · revision" eyebrow="TERMINAL">
            turn.completed
          </Node>
          <Arrow label="then append" />
          <Node detail="ordered second boundary · small tombstone" eyebrow="CLOSED" tone="safe">
            agent.stopped
          </Node>
        </div>
        <div aria-label="Stop reasons" className="harness-m3-diagram__decision-grid">
          <section>
            <strong>COMPLETED</strong>
            <span>Wins after the final assistant-message acknowledgement boundary.</span>
          </section>
          <section>
            <strong>BUDGET EXCEEDED</strong>
            <span>Hard step, token, or tool-call accounting stops another unit of work.</span>
          </section>
          <section>
            <strong>CANCELED OR FAILED</strong>
            <span>
              Cancellation, abandonment, timeout, or malformed model output closes the run.
            </span>
          </section>
        </div>
        <div aria-label="Legend and guarantees" className="harness-m3-diagram__support-grid">
          <section>
            <strong>BLUE · ACTIVE WORK</strong>
            <span>One consumer advance gates the next unit of runtime production.</span>
          </section>
          <section>
            <strong>AMBER · COOPERATIVE STOP</strong>
            <span>AbortSignal is forwarded; code that ignores it cannot be force-killed.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>APPEND UNCERTAINTY</strong>
            <span>
              Construction may retry before append; a durable append failure never retries or
              fabricates a pair.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}
