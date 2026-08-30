import { DiagramFrame } from './ArticlePrimitives'

export function OperatorLoopDiagram() {
  return (
    <DiagramFrame
      description="Each milestone task starts as a manifest, changes a task branch, passes the exit gate, and leaves a report plus session evidence for an operator or CI to inspect. The loop is real; pull-request diff scoping is still future work."
      scrollable
      title="The operator loop closes around evidence"
    >
      <svg
        aria-labelledby="operator-loop-title operator-loop-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 960 620"
      >
        <title id="operator-loop-title">Harness Platform M1 operator loop</title>
        <desc id="operator-loop-desc">
          A task manifest leads to implementation on a task branch, then to the exit gate. The gate
          writes a run report and SQLite session. A terminal viewer and continuous integration
          expose that evidence to the operator, who starts the next task.
        </desc>
        <defs>
          <marker
            id="operator-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>

        <text className="diagram-label" x="54" y="50">
          ONE TASK · ONE CONTRACT · ONE EVIDENCE TRAIL
        </text>
        {[
          ['01', 'TASK MANIFEST', 'goal · paths · policy', 55, 100],
          ['02', 'TASK BRANCH', 'implementation + tests', 375, 100],
          ['03', 'EXIT GATE', 'scope · exec · test', 695, 100],
          ['04', 'REPORT + SESSION', 'JSON + SQLite events', 695, 330],
          ['05', 'OPERATOR VIEW', 'viewer · CI artifact', 375, 330],
          ['06', 'NEXT DECISION', 'accept · fix · continue', 55, 330],
        ].map(([step, label, detail, x, y]) => (
          <g key={String(step)}>
            <rect
              className={step === '04' ? 'diagram-shape diagram-shape--accent' : 'diagram-shape'}
              height="116"
              rx="2"
              width="230"
              x={x}
              y={y}
            />
            <text className="diagram-detail" x={Number(x) + 18} y={Number(y) + 28}>
              {step}
            </text>
            <text
              className="diagram-label diagram-label--center"
              x={Number(x) + 115}
              y={Number(y) + 62}
            >
              {label}
            </text>
            <text
              className="diagram-detail diagram-detail--center"
              x={Number(x) + 115}
              y={Number(y) + 91}
            >
              {detail}
            </text>
          </g>
        ))}
        <path className="diagram-line" d="M285 158 L367 158" markerEnd="url(#operator-arrow)" />
        <path className="diagram-line" d="M605 158 L687 158" markerEnd="url(#operator-arrow)" />
        <path className="diagram-line" d="M810 216 L810 322" markerEnd="url(#operator-arrow)" />
        <path className="diagram-line" d="M695 388 L613 388" markerEnd="url(#operator-arrow)" />
        <path className="diagram-line" d="M375 388 L293 388" markerEnd="url(#operator-arrow)" />
        <path
          className="diagram-line"
          d="M170 330 C170 276 170 276 170 224"
          markerEnd="url(#operator-arrow)"
        />
        <text className="diagram-detail diagram-detail--center" x="480" y="520">
          local task loop: five manifests · five branches · five generated reports
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="552">
          public CI: one regression workflow + uploaded gate evidence
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="584">
          not yet: committed PR diff → allowed_paths comparison
        </text>
      </svg>
    </DiagramFrame>
  )
}

export function SqliteEvidenceDiagram() {
  return (
    <DiagramFrame
      description="The CLI validates every serialized event before SQLite write and again after read. A report references the session, while the terminal viewer can render either source. The current store assumes one writer and leaves successful sessions active."
      scrollable
      title="One event stream, two inspectable artifacts"
    >
      <svg
        aria-labelledby="sqlite-evidence-title sqlite-evidence-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 960 650"
      >
        <title id="sqlite-evidence-title">SQLite session evidence flow</title>
        <desc id="sqlite-evidence-desc">
          The exit-gate CLI emits task-updated and run-recorded events. Wire validation protects a
          SQLite sessions table and ordered events table. The JSON report stores the same event
          strings and the session identifier. The terminal viewer reads reports or stored sessions.
        </desc>
        <defs>
          <marker
            id="sqlite-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>

        <rect className="diagram-shape" height="104" rx="2" width="210" x="50" y="82" />
        <text className="diagram-label diagram-label--center" x="155" y="123">
          EXIT-GATE CLI
        </text>
        <text className="diagram-detail diagram-detail--center" x="155" y="153">
          event strings
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="104"
          rx="2"
          width="250"
          x="355"
          y="82"
        />
        <text className="diagram-label diagram-label--center" x="480" y="123">
          WIRE BOUNDARY
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="153">
          validate on write + read
        </text>

        <rect className="diagram-shape" height="104" rx="2" width="210" x="700" y="82" />
        <text className="diagram-label diagram-label--center" x="805" y="123">
          SQLITE
        </text>
        <text className="diagram-detail diagram-detail--center" x="805" y="153">
          one writer per file
        </text>
        <path className="diagram-line" d="M260 134 L347 134" markerEnd="url(#sqlite-arrow)" />
        <path className="diagram-line" d="M605 134 L692 134" markerEnd="url(#sqlite-arrow)" />

        <rect className="diagram-shape" height="114" rx="2" width="250" x="680" y="255" />
        <text className="diagram-label diagram-label--center" x="805" y="296">
          sessions
        </text>
        <text className="diagram-detail diagram-detail--center" x="805" y="326">
          id · task · status
        </text>
        <text className="diagram-detail diagram-detail--center" x="805" y="350">
          current CLI leaves active
        </text>

        <rect className="diagram-shape" height="114" rx="2" width="250" x="680" y="416" />
        <text className="diagram-label diagram-label--center" x="805" y="457">
          events
        </text>
        <text className="diagram-detail diagram-detail--center" x="805" y="487">
          session + sequence
        </text>
        <text className="diagram-detail diagram-detail--center" x="805" y="511">
          serialized payload
        </text>
        <path className="diagram-line" d="M805 186 L805 247" markerEnd="url(#sqlite-arrow)" />
        <path className="diagram-line" d="M805 369 L805 408" markerEnd="url(#sqlite-arrow)" />

        <rect
          className="diagram-shape diagram-shape--accent"
          height="116"
          rx="2"
          width="250"
          x="355"
          y="255"
        />
        <text className="diagram-label diagram-label--center" x="480" y="296">
          RUN REPORT
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="326">
          events[] + sessionId
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="350">
          branch / supplied PR string
        </text>
        <path className="diagram-line" d="M260 166 L347 278" markerEnd="url(#sqlite-arrow)" />

        <rect className="diagram-shape" height="116" rx="2" width="250" x="50" y="416" />
        <text className="diagram-label diagram-label--center" x="175" y="457">
          HARNESS-VIEW
        </text>
        <text className="diagram-detail diagram-detail--center" x="175" y="487">
          list · show · report
        </text>
        <text className="diagram-detail diagram-detail--center" x="175" y="511">
          read-only commands
        </text>
        <path className="diagram-line" d="M355 326 L175 408" markerEnd="url(#sqlite-arrow)" />
        <path
          className="diagram-line"
          d="M680 473 C570 570 360 570 300 500"
          markerEnd="url(#sqlite-arrow)"
        />

        <text className="diagram-detail diagram-detail--center" x="480" y="613">
          generated database and reports are CI artifacts / local files, not tracked source
        </text>
      </svg>
    </DiagramFrame>
  )
}

export function GoldenScenarioDiagram() {
  return (
    <DiagramFrame
      description="The first scenario loads kernel-0001, scripts one FakeModel response, fixes clocks and IDs, runs the real kernel, and checks the observable event stream as an ordered subsequence. It is a deterministic calibration seed—not broad model evaluation."
      scrollable
      title="The first eval measures the kernel contract"
    >
      <svg
        aria-labelledby="golden-scenario-title golden-scenario-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 960 610"
      >
        <title id="golden-scenario-title">Golden kernel evaluation pipeline</title>
        <desc id="golden-scenario-desc">
          Scenario YAML and the kernel task manifest enter a deterministic runner. A scripted fake
          model, fixed timestamps, and counting identifiers drive the real kernel. Five events and a
          run summary are checked against public invariants.
        </desc>
        <defs>
          <marker
            id="golden-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>

        <text className="diagram-label" x="54" y="48">
          INPUTS
        </text>
        <rect className="diagram-shape" height="102" rx="2" width="260" x="55" y="82" />
        <text className="diagram-label diagram-label--center" x="185" y="122">
          SCENARIO YAML
        </text>
        <text className="diagram-detail diagram-detail--center" x="185" y="153">
          script + observable invariants
        </text>
        <rect className="diagram-shape" height="102" rx="2" width="260" x="55" y="232" />
        <text className="diagram-label diagram-label--center" x="185" y="272">
          TASK MANIFEST
        </text>
        <text className="diagram-detail diagram-detail--center" x="185" y="303">
          goal + budget
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="252"
          rx="2"
          width="280"
          x="370"
          y="82"
        />
        <text className="diagram-label diagram-label--center" x="510" y="128">
          GOLDEN RUNNER
        </text>
        <text className="diagram-detail diagram-detail--center" x="510" y="169">
          FakeModel · one scripted turn
        </text>
        <text className="diagram-detail diagram-detail--center" x="510" y="202">
          fixed clock · counting IDs
        </text>
        <line className="diagram-line" x1="405" x2="615" y1="225" y2="225" />
        <text className="diagram-label diagram-label--center" x="510" y="264">
          REAL KERNEL
        </text>
        <text className="diagram-detail diagram-detail--center" x="510" y="295">
          runAgent(options)
        </text>
        <path className="diagram-line" d="M315 133 L362 133" markerEnd="url(#golden-arrow)" />
        <path className="diagram-line" d="M315 283 L362 283" markerEnd="url(#golden-arrow)" />

        <rect className="diagram-shape" height="102" rx="2" width="240" x="705" y="82" />
        <text className="diagram-label diagram-label--center" x="825" y="122">
          EVENT STREAM
        </text>
        <text className="diagram-detail diagram-detail--center" x="825" y="153">
          five typed events
        </text>
        <rect className="diagram-shape" height="102" rx="2" width="240" x="705" y="232" />
        <text className="diagram-label diagram-label--center" x="825" y="272">
          RUN SUMMARY
        </text>
        <text className="diagram-detail diagram-detail--center" x="825" y="303">
          1 step · 0 tools · 37 tokens
        </text>
        <path className="diagram-line" d="M650 133 L697 133" markerEnd="url(#golden-arrow)" />
        <path className="diagram-line" d="M650 283 L697 283" markerEnd="url(#golden-arrow)" />

        <rect
          className="diagram-shape diagram-shape--accent"
          height="112"
          rx="2"
          width="580"
          x="190"
          y="412"
        />
        <text className="diagram-label diagram-label--center" x="480" y="453">
          INVARIANT CHECKER
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="484">
          run status + exact counts + ordered event subsequence
        </text>
        <path
          className="diagram-line"
          d="M825 334 C825 382 690 396 635 408"
          markerEnd="url(#golden-arrow)"
        />
        <path
          className="diagram-line"
          d="M825 184 C825 366 685 390 620 408"
          markerEnd="url(#golden-arrow)"
        />
        <text className="diagram-detail diagram-detail--center" x="480" y="575">
          1 / 1 scenario passed · no provider · no network · no golden repository yet
        </text>
      </svg>
    </DiagramFrame>
  )
}

export function CompiledPolicyDiagram() {
  return (
    <DiagramFrame
      description="Manifest rules become reusable matchers with most-specific-wins and deny-over-ask-over-allow tie-breaking. The CLI consumes the decision table today; process and network isolation remain a future sandbox-runner responsibility."
      scrollable
      title="Policy is compiled once, then enforced elsewhere"
    >
      <svg
        aria-labelledby="compiled-policy-title compiled-policy-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 960 630"
      >
        <title id="compiled-policy-title">Compiled Harness policy decisions</title>
        <desc id="compiled-policy-desc">
          Permission patterns from a task manifest are translated into anchored matchers. A command
          is matched by specificity, with deny winning a tie. The resulting allow, ask, or deny
          decision feeds the current CLI and a future sandbox runner.
        </desc>
        <defs>
          <marker
            id="policy-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>

        <rect className="diagram-shape" height="174" rx="2" width="260" x="45" y="76" />
        <text className="diagram-label diagram-label--center" x="175" y="115">
          MANIFEST RULES
        </text>
        <text className="diagram-detail" x="75" y="153">
          pnpm test* → allow
        </text>
        <text className="diagram-detail" x="75" y="185">
          git push* → deny
        </text>
        <text className="diagram-detail" x="75" y="217">
          * → deny
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="174"
          rx="2"
          width="300"
          x="350"
          y="76"
        />
        <text className="diagram-label diagram-label--center" x="500" y="115">
          COMPILE RULES
        </text>
        <text className="diagram-detail diagram-detail--center" x="500" y="153">
          anchored pattern matcher
        </text>
        <text className="diagram-detail diagram-detail--center" x="500" y="185">
          most specific pattern wins
        </text>
        <text className="diagram-detail diagram-detail--center" x="500" y="217">
          ties: deny › ask › allow
        </text>

        <rect className="diagram-shape" height="174" rx="2" width="220" x="695" y="76" />
        <text className="diagram-label diagram-label--center" x="805" y="115">
          DECISION
        </text>
        <text className="diagram-detail diagram-detail--center" x="805" y="157">
          allow
        </text>
        <text className="diagram-detail diagram-detail--center" x="805" y="189">
          ask
        </text>
        <text className="diagram-detail diagram-detail--center" x="805" y="221">
          deny
        </text>
        <path className="diagram-line" d="M305 163 L342 163" markerEnd="url(#policy-arrow)" />
        <path className="diagram-line" d="M650 163 L687 163" markerEnd="url(#policy-arrow)" />

        <rect className="diagram-shape" height="120" rx="2" width="330" x="95" y="350" />
        <text className="diagram-label diagram-label--center" x="260" y="392">
          CLI · M1
        </text>
        <text className="diagram-detail diagram-detail--center" x="260" y="423">
          blocks deny · runs allow
        </text>
        <text className="diagram-detail diagram-detail--center" x="260" y="449">
          currently also runs ask
        </text>

        <rect className="diagram-shape" height="120" rx="2" width="330" x="535" y="350" />
        <text className="diagram-label diagram-label--center" x="700" y="392">
          SANDBOX RUNNER · M3
        </text>
        <text className="diagram-detail diagram-detail--center" x="700" y="423">
          process + filesystem + network
        </text>
        <text className="diagram-detail diagram-detail--center" x="700" y="449">
          enforcement boundary
        </text>
        <path
          className="diagram-line"
          d="M780 250 C735 300 410 300 305 342"
          markerEnd="url(#policy-arrow)"
        />
        <path
          className="diagram-line"
          d="M825 250 C825 298 760 314 720 342"
          markerEnd="url(#policy-arrow)"
        />

        <text className="diagram-detail diagram-detail--center" x="480" y="535">
          unknown action → ask · unmatched subject without fallback → deny
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="570">
          compilation decides; it does not create an operating-system sandbox
        </text>
      </svg>
    </DiagramFrame>
  )
}
