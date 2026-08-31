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

export function RuntimeDecisionGateDiagram() {
  return (
    <DiagramFrame
      description="M5 starts with repository evidence, not a preferred language. A representative workload must expose a target miss, profiling must attribute the limiting hot path to the runtime, Node-side remedies must fail, and a named foreign-runtime boundary must still improve the target after operational cost. Without that chain, the existing runtime remains."
      scrollable
      title="A second runtime is an evidence-gated exception"
    >
      <div
        aria-label="The M5 runtime decision starts with a production-representative workload, environment, repetitions, service-level target, and baseline. It then requires latency or throughput measurements plus CPU and memory attribution to a limiting hot path. The review must rule out input-output waits, external dependencies, algorithms, data structures, and untried Node remedies. Finally, a specific second-runtime boundary must improve the target after build, deployment, security, observability, and ownership cost. If any gate is missing, TypeScript on Node remains the sole runtime. If all gates pass, a new manifest and architecture review may reopen the boundary."
        className="harness-m3-diagram harness-m3-diagram--service"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node
            detail="workload · environment · repetitions · SLO"
            eyebrow="BASELINE"
            tone="accent"
          >
            Measure the miss
          </Node>
          <Arrow label="profile" />
          <Node detail="latency or throughput · CPU · memory" eyebrow="ATTRIBUTION">
            Locate the hot path
          </Node>
          <Arrow label="exclude" />
          <Node detail="I/O · dependency · algorithm · Node remedies" eyebrow="CAUSATION">
            Prove runtime cost
          </Node>
          <Arrow label="price" />
          <Node detail="build · deploy · secure · observe · own" eyebrow="BOUNDARY" tone="warning">
            Compare total cost
          </Node>
        </div>
        <div className="harness-m3-diagram__decision-grid">
          <section>
            <strong>GATE INCOMPLETE</strong>
            <span>
              Retain TypeScript and keep measuring. Preference is not performance evidence.
            </span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>WHOLE-SUITE TIME ONLY</strong>
            <span>
              A test duration cannot identify which component—or which runtime—limited it.
            </span>
          </section>
          <section>
            <strong>GATE COMPLETE</strong>
            <span>A new task manifest and architecture note may propose one measured seam.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function EvidenceGapDiagram() {
  return (
    <DiagramFrame
      description="The repository had substantial correctness evidence and observability seams, but no representative workload profile or controlled runtime comparison. M5 treats those evidence classes as different things and records an intentionally limited conclusion."
      scrollable
      title="Correctness proof is not runtime-bottleneck proof"
    >
      <div
        aria-label="Three evidence columns. Present evidence includes deterministic offline correctness tests, golden evaluations, typed events, OpenTelemetry seams, injected HTTP and process executors for M3, and injected PostgreSQL and object-store protocol fakes for M4. Missing performance evidence includes a production-representative workload, service-level target, repeated latency percentiles, throughput, CPU or memory profiles, causal attribution, and controlled runtime comparisons. The resulting decision is that there is insufficient evidence to add a runtime; it does not prove Node fastest, optimal, bottleneck-free, or scalable."
        className="harness-m3-diagram harness-m3-diagram--evidence"
        role="img"
      >
        <section>
          <strong>PRESENT</strong>
          <b>Correctness evidence</b>
          <span>
            Offline tests · golden evals · typed events · observability seams · injected protocol
            boundaries.
          </span>
        </section>
        <section className="harness-m3-diagram__danger">
          <strong>ABSENT</strong>
          <b>Qualifying profile</b>
          <span>
            Representative load · SLO · percentiles · throughput · CPU/memory attribution · runtime
            comparison.
          </span>
        </section>
        <section>
          <strong>DECISION</strong>
          <b>Retain Node</b>
          <span>
            Insufficient evidence to open another runtime boundary—not a claim that Node is optimal.
          </span>
        </section>
      </div>
    </DiagramFrame>
  )
}

export function TrustedExitGateDiagram() {
  return (
    <DiagramFrame
      description="The Step 0 audit turned a test runner into an attributable evidence pipeline. The canonical manifest selects one exact branch identity; complete Git deltas are checked around the builder and tests; normal and early failures both leave typed evidence; only an atomically committed report receives a run-recorded receipt."
      scrollable
      title="The hardened exit gate verifies identity, scope, execution, and evidence"
    >
      <div
        aria-label="A canonical tasks slash id YAML manifest derives the exact tasks slash id branch. Local mode checks out that branch; detached continuous integration accepts only a matching head ref, immutable head object ID, and base object ID. The gate samples committed, staged, unstaged, untracked, and relevant ignored changes, including raw bytes, file type, mode, rename endpoints, and Git metadata. It evaluates allowed paths before the optional TaskAgent builder and tests and again afterward. Manifest, Git, policy, builder, test, evidence, and report failures produce structured evidence. A normal run-report version 2 is written by same-directory temporary file, synchronization, and atomic rename; only a committed report contains its run-recorded receipt."
        className="harness-m3-diagram harness-m3-diagram--sandbox"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="tasks/&lt;id&gt;.yaml · immutable digest" eyebrow="CONTRACT" tone="accent">
            Canonical manifest
          </Node>
          <Arrow label="derive" />
          <Node detail="exact branch · head SHA · base SHA" eyebrow="GIT IDENTITY">
            Attested checkout
          </Node>
          <Arrow label="gate twice" />
          <Node detail="pre/post scope · builder · tests · budgets" eyebrow="EXECUTION">
            Bounded work
          </Node>
          <Arrow label="commit" />
          <Node
            detail="typed failure trail · atomic report · receipt"
            eyebrow="EVIDENCE"
            tone="safe"
          >
            run-report/v2
          </Node>
        </div>
        <div className="harness-m3-diagram__support-grid">
          <section>
            <strong>COMPLETE DELTA</strong>
            <span>Committed and working-tree changes are compared before and after execution.</span>
          </section>
          <section>
            <strong>ATTRIBUTED POLICY</strong>
            <span>Allow, ask, and deny events carry task, session, run, action, and subject.</span>
          </section>
          <section>
            <strong>FAILURE IS EVIDENCE</strong>
            <span>
              Early preflight and later report failures cannot disappear as an untyped exit.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function TwoPullRequestDeliveryDiagram() {
  return (
    <DiagramFrame
      description="The audit fix and the M5 decision remained separate changes. Exit-gate hardening merged first. M5 was then refreshed onto that trusted base, reran its four-path gate with 535 tests, passed all four checks, and merged second."
      scrollable
      title="Release order made the hardened gate part of M5 evidence"
    >
      <div
        aria-label="Pull request 3 contains the separate Step 0 exit-gate-hardening task, changes 22 files, and merges as ee75948 after CI and CodeQL. The M5 branch is refreshed on that base, producing head 85342e35. Pull request 4 changes only Architecture, Readme, Roadmap, and the M5 task manifest. Its exit-gate run records 535 of 535 tests, four allowed paths before and after tests, zero violations, and a committed version 2 report. Four automated checks pass, then M5 merges as 4bf5f687. There was no approving human code review, so the evidence is checks-gated delivery rather than peer review."
        className="harness-m3-diagram harness-m3-diagram--permission"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="22 files · +7,908 / −541" eyebrow="PR #3" tone="warning">
            Harden Step 0
          </Node>
          <Arrow label="merge first" />
          <Node detail="ee75948 · trusted base" eyebrow="MAIN">
            Refresh M5
          </Node>
          <Arrow label="fresh gate" />
          <Node detail="4 files · +99 / −8 · 535 tests" eyebrow="PR #4" tone="accent">
            Record decision
          </Node>
          <Arrow label="checks green" />
          <Node detail="4bf5f68 · Node retained" eyebrow="M5 MERGE" tone="safe">
            Close milestone
          </Node>
        </div>
        <div className="harness-m3-diagram__decision-grid">
          <section>
            <strong>SEPARATE DIFFS</strong>
            <span>
              Hardening is not counted as M5 implementation; M5 itself remains four files.
            </span>
          </section>
          <section>
            <strong>FRESH EVIDENCE</strong>
            <span>The M5 head ran on the hardened base instead of inheriting an older result.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>NO PEER-REVIEW CLAIM</strong>
            <span>The public record shows green automated checks, not an approving review.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}
