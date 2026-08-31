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

export function M3ServiceBoundaryDiagram() {
  return (
    <DiagramFrame
      description="The interactive client speaks a project-owned JSON-RPC protocol to one agent-server connection. Each session can start one kernel run, which selects a model and exposes only reviewed host or Docker-backed tools. Sanitized events are persisted and streamed from the same boundary."
      scrollable
      title="M3 wraps the local loop in one permissioned service path"
    >
      <div
        aria-label="An interactive terminal client connects over the repository-owned harness ACP version 1 WebSocket protocol to the agent server. The server creates one kernel run per session. The kernel uses either the fake model or an OpenAI-compatible adapter and may invoke a Docker-backed sandbox tool after policy and permission checks. Redacted events go to SQLite and back to the terminal stream."
        className="harness-m3-diagram harness-m3-diagram--service"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="streams events · answers permission asks" eyebrow="CLIENT" tone="accent">
            Interactive TUI
          </Node>
          <Arrow label="harness/acp/1" />
          <Node detail="JSON-RPC over WebSocket · bounded connection" eyebrow="SERVICE">
            agent-server
          </Node>
          <Arrow label="one prompt" />
          <Node detail="budget · policy · typed event loop" eyebrow="EXECUTION" tone="safe">
            Kernel run
          </Node>
          <Arrow label="approved tool" />
          <Node detail="manifest plan · one ephemeral container" eyebrow="BOUNDARY" tone="warning">
            sandbox_exec
          </Node>
        </div>
        <div className="harness-m3-diagram__support-grid">
          <section>
            <strong>MODEL SEAM</strong>
            <span>
              FakeModel by default, or one validated OpenAI-compatible Chat Completions adapter.
            </span>
          </section>
          <section>
            <strong>AUDIT SEAM</strong>
            <span>
              One redacted event is queued for SQLite before the same safe value crosses ACP.
            </span>
          </section>
          <section>
            <strong>DEFERRED</strong>
            <span>Replay, resume, scheduling, Postgres, and distributed artifacts remain M4.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function PermissionHandshakeDiagram() {
  return (
    <DiagramFrame
      description="An ask decision is a pause, not permission. Only one correlated allow response can resume the side effect. Denial, timeout, cancellation, disconnect, EOF, or a missing resolver all converge on the denied result."
      scrollable
      title="Permission asks are a fail-closed state machine"
    >
      <div
        aria-label="A model proposes a tool call. The kernel records the tool call and an ask policy decision, then emits a correlated permission request and pauses. The terminal submits an explicit allow or deny. The server records the resolution and either executes the tool or returns a denied result. Timeout, cancellation, disconnect, end of input, and missing permission resolver all take the deny branch."
        className="harness-m3-diagram harness-m3-diagram--permission"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="arguments are data, not authority" eyebrow="MODEL">
            tool.call
          </Node>
          <Arrow label="decide" />
          <Node detail="allow · ask · deny from compiled manifest" eyebrow="POLICY" tone="accent">
            policy.decision
          </Node>
          <Arrow label="ask pauses" />
          <Node detail="single-use ID · session and scope bound" eyebrow="EVENT" tone="warning">
            permission.requested
          </Node>
          <Arrow label="explicit reply" />
          <Node detail="allow or deny; duplicates rejected" eyebrow="OPERATOR" tone="safe">
            permission.resolved
          </Node>
        </div>
        <div className="harness-m3-diagram__decision-grid">
          <section>
            <strong>ALLOW</strong>
            <span>
              The correlated call may execute; a run-scoped grant can satisfy the matching inner
              sandbox check.
            </span>
          </section>
          <section>
            <strong>DENY</strong>
            <span>
              The tool does not execute and the event trail closes with a denied tool result.
            </span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>FAIL-CLOSED PATHS</strong>
            <span>
              Timeout · cancel · disconnect · EOF · confirmation-reader failure · missing resolver →
              deny.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function SandboxBoundaryDiagram() {
  return (
    <DiagramFrame
      description="The runner first proves that a manifest rule can be represented without widening access. It canonicalizes mount sources and fingerprints their identity, metadata, and tree shape; rechecks them immediately before spawn; builds a fixed Docker argument vector; and verifies ownership before cleanup."
      scrollable
      title="A manifest becomes a Docker plan only when every boundary is representable"
    >
      <div
        aria-label="The task manifest enters the shared policy compiler. Allowed paths are canonicalized, checked for unsafe links and nested mounts, and fingerprinted by identity, metadata, and tree shape. Unrepresentable path or network rules fail before Docker. A validated plan becomes a hardened Docker argument vector. After execution the runner uses its private container ID when available; a fallback name lookup is removable only when its lease label matches. It emits lifecycle evidence only when cleanup is verified."
        className="harness-m3-diagram harness-m3-diagram--sandbox"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="allowed_paths · exec · fs · network" eyebrow="SOURCE" tone="accent">
            Task manifest
          </Node>
          <Arrow label="compile" />
          <Node detail="canonical paths · link checks · metadata fingerprints" eyebrow="PLAN">
            Scope proof
          </Node>
          <Arrow label="recheck" />
          <Node detail="read-only · non-root · limits · network none" eyebrow="ARGV" tone="safe">
            docker run
          </Node>
          <Arrow label="verify" />
          <Node
            detail="owned CID or lease-matched fallback · forced removal"
            eyebrow="CLEANUP"
            tone="warning"
          >
            Container gone
          </Node>
        </div>
        <div className="harness-m3-diagram__support-grid">
          <section>
            <strong>FILESYSTEM</strong>
            <span>
              Read-only workspace; only exact files or explicit directory/** entries can become
              writable.
            </span>
          </section>
          <section>
            <strong>PROCESS</strong>
            <span>
              Non-root UID/GID, dropped capabilities, no-new-privileges, read-only root, bounded
              CPU, memory, and PIDs.
            </span>
          </section>
          <section>
            <strong>NETWORK</strong>
            <span>
              Default none. A flat allow becomes ordinary bridge access; patterned egress is
              rejected rather than approximated.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function M3EvidenceLanesDiagram() {
  return (
    <DiagramFrame
      description="The public repository and CI prove the typed service control path using loopback sockets and injected provider and Docker boundaries. The M3-specific dogfood report is development-session evidence. Real provider, real container, remote TLS, recovery, and capacity evidence are still open."
      scrollable
      title="M3 has strong control-path evidence, not deployment evidence"
    >
      <div
        aria-label="Three evidence lanes. The public default lane has 333 offline tests, strict type checking, one deterministic eval, a loopback WebSocket integration, injected HTTP responses, and an argv-only Docker executor. The development session records a passed M3 task manifest and exit gate, but generated reports are ignored. The unrun lane contains a live provider call, a real Docker sandbox, a remote TLS deployment, replay recovery, load testing, and multi-process persistence."
        className="harness-m3-diagram harness-m3-diagram--evidence"
        role="img"
      >
        <section>
          <strong>PUBLIC + FRESH OFFLINE</strong>
          <b>333 / 333</b>
          <span>
            24 test files · strict typecheck · 1/1 eval · real loopback WebSocket · injected HTTP
            and Docker executor.
          </span>
        </section>
        <section>
          <strong>SESSION EVIDENCE</strong>
          <b>M3 gate passed</b>
          <span>
            The task-specific run passed after pnpm store metadata moved outside the task scope;
            generated reports remain ignored.
          </span>
        </section>
        <section className="harness-m3-diagram__danger">
          <strong>NOT RUN</strong>
          <b>No live stack</b>
          <span>
            Live provider · actual Docker image/run · remote TLS proxy · replay/recovery · soak or
            capacity test.
          </span>
        </section>
      </div>
    </DiagramFrame>
  )
}
