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
    <div className={`harness-m2-diagram__node harness-m2-diagram__node--${tone}`}>
      <span>{eyebrow}</span>
      <strong>{children}</strong>
      <small>{detail}</small>
    </div>
  )
}

function Arrow({ label = 'then' }: { label?: string }) {
  return (
    <span aria-hidden="true" className="harness-m2-diagram__arrow">
      <small>{label}</small>
      <b>→</b>
    </span>
  )
}

export function M2CommitChainDiagram() {
  return (
    <DiagramFrame
      description="Five task contracts move the milestone from a controlled HTTP calibration target to typed scenarios, inspectable evidence, opt-in telemetry, and finally a real stdio protocol boundary."
      scrollable
      title="M2 builds credibility in five bounded slices"
    >
      <div
        aria-label="Five sequential Harness M2 workstreams: golden HTTP service, SDK scenario language, read-only task board, OpenTelemetry bridge, and hardened MCP stdio client."
        className="harness-m2-diagram harness-m2-diagram--chain"
        role="img"
      >
        <Node detail="SPEC + one-file Node service + 7 checks" eyebrow="01 / CALIBRATE">
          Golden repository
        </Node>
        <Arrow />
        <Node detail="YAML becomes typed public invariants" eyebrow="02 / DESCRIBE" tone="accent">
          Scenario DSL
        </Node>
        <Arrow />
        <Node detail="manifests + reports; invalid files stay visible" eyebrow="03 / OPERATE">
          Task board
        </Node>
        <Arrow />
        <Node
          detail="rooted kernel events become one trace plus counters"
          eyebrow="04 / TRACE"
          tone="safe"
        >
          OpenTelemetry
        </Node>
        <Arrow />
        <Node
          detail="initialize-era JSON-RPC over a child process"
          eyebrow="05 / CONNECT"
          tone="warning"
        >
          MCP stdio
        </Node>
      </div>
    </DiagramFrame>
  )
}

export function GoldenEvidenceDiagram() {
  return (
    <DiagramFrame
      description="The golden service and scenario language are two complementary calibration assets. Today’s one committed scenario still drives the FakeModel kernel; it does not yet modify or execute the hello-service repository."
      scrollable
      title="A specification and a scenario are not yet the same eval"
    >
      <div
        aria-label="A golden HTTP repository supplies a stable external contract and seven standalone checks. Separately, scenario YAML passes through the SDK validator into the deterministic FakeModel kernel, producing events and a run summary. A future task-to-repository evaluator must connect the two lanes."
        className="harness-m2-diagram harness-m2-diagram--golden"
        role="img"
      >
        <section>
          <p>GOLDEN TARGET LANE</p>
          <Node detail="observable HTTP behavior under 500 lines" eyebrow="CONTRACT" tone="accent">
            SPEC.md
          </Node>
          <Arrow label="pins" />
          <Node detail="node:http · no dependencies · loopback" eyebrow="TARGET">
            hello-service
          </Node>
          <Arrow label="checks" />
          <Node detail="status, content type, parsed JSON" eyebrow="OFFLINE" tone="safe">
            7 / 7
          </Node>
        </section>
        <section>
          <p>COMMITTED EVAL LANE</p>
          <Node detail="script + run/event/report expectations" eyebrow="INPUT">
            Scenario YAML
          </Node>
          <Arrow label="validate" />
          <Node
            detail="known events · scalar data paths · typed errors"
            eyebrow="SDK"
            tone="accent"
          >
            loadScenario
          </Node>
          <Arrow label="run" />
          <Node detail="FakeModel + real kernel → five events" eyebrow="CURRENT" tone="safe">
            1 / 1 scenario
          </Node>
        </section>
        <div className="harness-m2-diagram__gap">
          <strong>OPEN CONNECTION</strong>
          <span>No committed scenario yet edits or judges the hello-service target.</span>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function EvidenceSurfacesDiagram() {
  return (
    <DiagramFrame
      description="The board and telemetry bridge have independent inputs. The board pulls manifests and reports from files. The opt-in bridge projects a complete, rooted kernel event stream; the current CLI exit-gate sequence lacks that root and creates no telemetry."
      scrollable
      title="Two evidence views keep their source boundaries explicit"
    >
      <div
        aria-label="In the first lane, task manifests and run-report files feed the read-only board, which revalidates each file and exposes typed errors. In the second lane, a complete kernel event lifecycle from session.created through agent.stopped feeds EventBridge, which creates spans and counters only when enabled. The current CLI stream is not rooted, so it produces no telemetry."
        className="harness-m2-diagram harness-m2-diagram--surfaces"
        role="img"
      >
        <div className="harness-m2-diagram__surface-lane">
          <Node detail="task YAML · run-report JSON · typed failures" eyebrow="BOARD SOURCE">
            Manifests + reports
          </Node>
          <Arrow label="read" />
          <section>
            <p>PULL-BASED OPERATOR VIEW</p>
            <Node detail="GET only · manual refresh · no websocket" eyebrow="APPS/WEB" tone="safe">
              Read-only board
            </Node>
            <span>Invalid manifests and reports remain visible as typed items.</span>
          </section>
        </div>
        <div className="harness-m2-diagram__surface-lane">
          <Node detail="session.created through agent.stopped" eyebrow="TRACE SOURCE" tone="accent">
            Rooted kernel events
          </Node>
          <Arrow label="project" />
          <section>
            <p>OPT-IN OBSERVABILITY VIEW</p>
            <Node
              detail="session root · model/tool children · counters"
              eyebrow="PACKAGES/OTEL"
              tone="warning"
            >
              EventBridge
            </Node>
            <span>
              Off by default; requires a rooted event stream. The current CLI exit-gate stream is
              not rooted.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function McpLifecycleDiagram() {
  return (
    <DiagramFrame
      description="The client owns process startup, the initialize-era handshake, correlated newline-delimited JSON-RPC, bounded failures, and staged shutdown. Offline MCP tests backed by a hostile fixture stay in default CI; the official reference server belongs to a separate compatibility lane."
      scrollable
      title="The stdio adapter treats a subprocess as an untrusted protocol peer"
    >
      <div
        aria-label="The Harness MCP client spawns a server with shell disabled and a restricted environment, sends initialize and initialized, correlates ping and tool requests with responses, parses notifications independently, then closes stdin and escalates to process-group signals if required. Nineteen offline MCP tests, backed by a hostile fixture, run in the default lane, while an integrity-locked official reference server is reserved for a scheduled or manual lane."
        className="harness-m2-diagram harness-m2-diagram--mcp"
        role="img"
      >
        <div className="harness-m2-diagram__sequence">
          <Node detail="shell:false · piped stdio · allowlisted env" eyebrow="START" tone="accent">
            Spawn process
          </Node>
          <Arrow label="request" />
          <Node detail="negotiate one of three accepted revisions" eyebrow="HANDSHAKE">
            initialize
          </Node>
          <Arrow label="notify" />
          <Node detail="client becomes ready only after the write" eyebrow="READY" tone="safe">
            initialized
          </Node>
          <Arrow label="correlate" />
          <Node detail="ping · tools/list · tools/call" eyebrow="WORK">
            JSON-RPC map
          </Node>
          <Arrow label="contain" />
          <Node
            detail="stdin close → TERM → KILL by process group"
            eyebrow="SHUTDOWN"
            tone="warning"
          >
            Close once
          </Node>
        </div>
        <div className="harness-m2-diagram__lanes">
          <section>
            <strong>DEFAULT CI</strong>
            <span>
              19 offline MCP tests backed by a hostile local fixture; no external reference server.
            </span>
          </section>
          <section>
            <strong>COMPATIBILITY LANE</strong>
            <span>
              Manual/Monday workflow; frozen lock; scripts disabled; exact Everything package.
            </span>
          </section>
          <section>
            <strong>VERSION BOUNDARY</strong>
            <span>2025-11-25 initialize-era now; 2026-07-28 stateless lifecycle later.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}
