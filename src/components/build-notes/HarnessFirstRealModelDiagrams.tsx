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

export function RealModelSmokePathDiagram() {
  return (
    <DiagramFrame
      description="In an uncommitted local worktree based on M8 merge d14fc13, a loopback Ollama endpoint answered a non-streaming OpenAI-compatible request from the Agent Server. ACP carried one turn into the kernel, and the terminal UI rendered the resulting events. This first smoke path completed without a tool call."
      scrollable
      title="The first real-model smoke test crossed the complete conversational path"
    >
      <div
        aria-label="In an uncommitted local worktree based on Harness M8 merge d14fc13, Ollama listened on the loopback interface and served the selected local model. The OpenAI-compatible adapter issued a non-streaming request and translated the completed response for Harness. The Agent Server accepted an ACP session and passed one user turn into the kernel. The kernel appended the run and message events that the terminal user interface rendered. The observed smoke test completed one turn with a text answer and no tool request. It demonstrates that these local components communicated in this run; it is not committed or continuous-integration evidence."
        className="harness-m3-diagram harness-m3-diagram--service"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="loopback endpoint · selected local model" eyebrow="OLLAMA" tone="accent">
            Answer a model request
          </Node>
          <Arrow label="adapt" />
          <Node detail="translate the OpenAI-compatible response" eyebrow="MODEL ADAPTER">
            Normalize the response
          </Node>
          <Arrow label="ACP" />
          <Node detail="Agent Server admits one user turn" eyebrow="SESSION" tone="warning">
            Enter the kernel loop
          </Node>
          <Arrow label="render" />
          <Node detail="durable events become visible output" eyebrow="TERMINAL UI" tone="safe">
            Show the answer
          </Node>
        </div>
        <div aria-label="Observed smoke-path layers" className="harness-m3-diagram__support-grid">
          <section>
            <strong>LOCAL PROVIDER</strong>
            <span>Network traffic stayed on the machine&apos;s loopback interface.</span>
          </section>
          <section>
            <strong>PROTOCOL BRIDGES</strong>
            <span>
              A non-streaming OpenAI-compatible request fed the server; ACP carried the client
              session.
            </span>
          </section>
          <section>
            <strong>VISIBLE RECORD</strong>
            <span>Kernel events, not raw provider frames, drove the terminal presentation.</span>
          </section>
        </div>
        <div
          aria-label="First smoke-test evidence limits"
          className="harness-m3-diagram__decision-grid"
        >
          <section>
            <strong>OBSERVED</strong>
            <span>One prompt reached a real local model and returned one text response.</span>
          </section>
          <section>
            <strong>NO TOOL EFFECT</strong>
            <span>The model did not request a tool in this first successful turn.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>LOCAL WORKTREE ONLY</strong>
            <span>Based on d14fc13; neither committed nor verified by CI.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function IdentityAuthorityEvolutionDiagram() {
  return (
    <DiagramFrame
      description="The experiment separated naming a workspace from granting an effect. The --workspace flag supplied session metadata only. A task-backed session loaded the manifest, while server configuration injected the built-in sandbox_exec tool; permitted calls then crossed policy into a Docker-backed, read-only workspace."
      scrollable
      title="A workspace name became useful only after explicit authority was attached"
    >
      <div
        aria-label="In the uncommitted local worktree based on d14fc13, starting the client with the --workspace option supplied a workspace string for identity and event metadata. That string did not create filesystem or process authority, so it could not make a workspace-bound tool execute. Starting a task-backed session loaded its manifest, and separate trusted Agent Server configuration enabled the reserved built-in sandbox_exec tool. The manifest's process, filesystem, and network rules governed that tool. Policy evaluated each requested action before effect, then a Docker-backed workspace supplied read-only repository authority to an approved operation. The container received direct argument-vector execution rather than a shell command. The model interacted with the reviewed tool interface, not with the Docker adapter or Workspace object."
        className="harness-m3-diagram harness-m3-diagram--sandbox"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node detail="--workspace labels session and events" eyebrow="IDENTITY">
            Name the workspace
          </Node>
          <Arrow label="admit" />
          <Node
            detail="sandbox configuration and manifest required"
            eyebrow="SERVICE + TASK"
            tone="accent"
          >
            Register reviewed sandbox tool
          </Node>
          <Arrow label="authorize" />
          <Node detail="record and evaluate before execution" eyebrow="POLICY" tone="warning">
            Gate the requested effect
          </Node>
          <Arrow label="restrict" />
          <Node detail="Docker-backed repository mounted read-only" eyebrow="AUTHORITY" tone="safe">
            Run one bounded operation
          </Node>
        </div>
        <div
          aria-label="Identity and authority distinctions"
          className="harness-m3-diagram__decision-grid"
        >
          <section className="harness-m3-diagram__danger">
            <strong>FLAG ALONE</strong>
            <span>
              A workspace string is metadata, not permission or an operational capability.
            </span>
          </section>
          <section>
            <strong>SERVICE + TASK + POLICY</strong>
            <span>
              The task supplies rules, the server supplies the tool, and policy decides each
              request.
            </span>
          </section>
          <section>
            <strong>READ-ONLY EFFECT</strong>
            <span>
              The observed Docker path could inspect the mounted repository, not modify it.
            </span>
          </section>
        </div>
        <div aria-label="Authority ownership" className="harness-m3-diagram__support-grid">
          <section>
            <strong>MODEL</strong>
            <span>Chooses a reviewed tool and supplies structured arguments.</span>
          </section>
          <section>
            <strong>HARNESS</strong>
            <span>Persists intent, applies policy, and narrows the operation.</span>
          </section>
          <section>
            <strong>TRUSTED OUTER CODE</strong>
            <span>Constructs the Docker authority and owns its lifecycle.</span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function LiveModelDebuggingSequenceDiagram() {
  return (
    <DiagramFrame
      description="The real provider exposed three integration boundaries in order: guarded argv arrays failed compatibility normalization, a narrow non-enumerable undefined toJSON shim restored that boundary, the default 60-second model deadline then expired, and a validated 180-second override finally allowed a complete tool loop."
      scrollable
      title="The first tool loop emerged through three bounded corrections"
    >
      <div
        aria-label="The uncommitted local experiment based on d14fc13 reached its successful tool loop through a specific debugging sequence. First, the guarded argument-vector array was rejected while crossing an OpenAI-compatibility normalization boundary. The local patch added only an undefined, non-enumerable toJSON compatibility property, preserving normal array enumeration and avoiding a broad serializer bypass. The next run reached the local model but exceeded the default 60-second model timeout. A separately parsed and validated 180-second override replaced that deadline for the experiment. With both corrections present, the model emitted a structured direct-argv tool request, policy admitted it, the Docker-backed read-only operation returned an observation, and the model completed its answer. These local changes were not committed or CI-verified."
        className="harness-m3-diagram harness-m3-diagram--permission"
        role="img"
      >
        <div className="harness-m3-diagram__path">
          <Node
            detail="guarded argument-vector array rejected"
            eyebrow="FAILURE ONE"
            tone="warning"
          >
            Compatibility boundary
          </Node>
          <Arrow label="narrow fix" />
          <Node detail="undefined · non-enumerable · toJSON" eyebrow="CORRECTION" tone="accent">
            Preserve guarded argv
          </Node>
          <Arrow label="retry" />
          <Node
            detail="default model deadline expires at 60 seconds"
            eyebrow="FAILURE TWO"
            tone="warning"
          >
            Timeout becomes visible
          </Node>
          <Arrow label="validate 180s" />
          <Node detail="direct argv → policy → observation → answer" eyebrow="OBSERVED" tone="safe">
            Complete the tool loop
          </Node>
        </div>
        <div
          aria-label="Why each correction stayed narrow"
          className="harness-m3-diagram__support-grid"
        >
          <section>
            <strong>ARRAY COMPATIBILITY</strong>
            <span>The shim addressed one serializer expectation without making it enumerable.</span>
          </section>
          <section>
            <strong>DEADLINE CONFIGURATION</strong>
            <span>
              The longer timeout crossed a validation boundary instead of accepting any value.
            </span>
          </section>
          <section>
            <strong>TOOL PROTOCOL</strong>
            <span>The recovered call used structured argv and returned a tool observation.</span>
          </section>
        </div>
        <div
          aria-label="Debugging evidence boundaries"
          className="harness-m3-diagram__decision-grid"
        >
          <section>
            <strong>FAILURES RETAINED</strong>
            <span>
              Compatibility and timeout failures are part of the experiment&apos;s result.
            </span>
          </section>
          <section>
            <strong>SUCCESS RETRIED</strong>
            <span>The completed loop depended on both local corrections.</span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>NOT A RELEASE</strong>
            <span>
              The worktree behavior does not establish a merged or regression-tested contract.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function ObservedRealModelRunsDiagram() {
  return (
    <DiagramFrame
      description="Three local runs established progressively stronger evidence: a 9,781-token tool loop completed under a 12k hard budget; a 19,932-token run exceeded that budget after 17 requested tools, 11 executions, and six denials; and an 18,014-token run completed four of four tools under a 30k hard budget. These are worktree observations, not reliability, security, or performance proof."
      scrollable
      title="Three runs separate conversational success from safe tool-use success"
    >
      <div
        aria-label="The uncommitted local worktree based on d14fc13 recorded three relevant real-model outcomes. The first run completed a tool loop with 9,781 reported tokens under a 12-thousand-token hard run budget, and all three requested tools executed. The second run accumulated 19,932 reported tokens before terminating as budget exceeded under the 12-thousand-token hard budget; the model requested 17 tools, 11 executed, and six were denied, including a shell-form sh -c request. The hard budget stops work at the runtime's checked boundaries and is not a model context-window size or a promise that one provider response cannot overshoot it. The final run completed with 18,014 reported tokens under a 30-thousand-token hard run budget, and all four requested tools executed using permitted direct argument vectors against the read-only Docker-mounted repository. Together these runs show live non-streaming provider compatibility, policy denials, budget termination, and completed read-only tool loops. They do not prove determinism, general task quality, write safety, hostile-container isolation, load capacity, latency, cost, or production readiness."
        className="harness-m3-diagram harness-m3-diagram--evidence"
        role="img"
      >
        <section>
          <strong>12K HARD BUDGET</strong>
          <b>9,781 tokens</b>
          <span>Completed tool loop · three requested · three executed.</span>
        </section>
        <section className="harness-m3-diagram__danger">
          <strong>12K HARD BUDGET</strong>
          <b>19,932 tokens</b>
          <span>Budget exceeded · 17 requested · 11 executed · six denied.</span>
        </section>
        <section>
          <strong>30K HARD BUDGET</strong>
          <b>18,014 tokens</b>
          <span>Successful run · four requested · four executed · direct argv.</span>
        </section>
        <div
          aria-label="What the local runs demonstrate"
          className="harness-m3-diagram__support-grid"
        >
          <section>
            <strong>PROVIDER PATH</strong>
            <span>
              A real non-streaming Ollama response crossed adapter, ACP, kernel, and terminal
              layers.
            </span>
          </section>
          <section>
            <strong>DENIAL PATH</strong>
            <span>The attempted shell command did not reach the Docker effect.</span>
          </section>
          <section>
            <strong>OBSERVATION LOOP</strong>
            <span>Permitted tool results returned to the model before its final response.</span>
          </section>
        </div>
        <div
          aria-label="What the local runs do not demonstrate"
          className="harness-m3-diagram__decision-grid"
        >
          <section className="harness-m3-diagram__danger">
            <strong>NOT REPRODUCIBILITY</strong>
            <span>
              No committed fixture, CI lane, or repeatability sample supports these results.
            </span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>NOT CAPACITY EVIDENCE</strong>
            <span>
              The 12k and 30k values are hard run budgets, not context-window sizes, load tests, or
              latency measurements.
            </span>
          </section>
          <section className="harness-m3-diagram__danger">
            <strong>NOT PRODUCTION PROOF</strong>
            <span>
              No write path, hostile workload, remote provider, or deployment was validated.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}
