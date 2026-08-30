import { DiagramFrame } from './ArticlePrimitives'

const layerRows = [
  ['L4', 'Product surface', 'Web · TUI · API'],
  ['L3', 'Orchestration', 'Agents · permissions · sessions'],
  ['L2', 'Agent kernel', 'Loop · models · tools · streaming'],
  ['L1', 'Capability adapters', 'MCP · ACP · external tools'],
  ['L0', 'Execution boundary', 'Filesystem · terminal · sandbox'],
] as const

export function InspirationLayersDiagram() {
  return (
    <DiagramFrame
      description="The stack was a planning lens informed by four reference projects. It does not mean those projects were imported into the repository."
      title="The original inspiration stack"
    >
      <svg
        aria-labelledby="inspiration-layers-title inspiration-layers-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 960 500"
      >
        <title id="inspiration-layers-title">Five-layer harness inspiration stack</title>
        <desc id="inspiration-layers-desc">
          Five horizontal layers run from the execution boundary at level zero to the product
          surface at level four.
        </desc>
        {layerRows.map(([level, name, detail], index) => {
          const y = 32 + index * 88
          return (
            <g key={level}>
              <rect
                className={index === 2 ? 'diagram-shape diagram-shape--accent' : 'diagram-shape'}
                height="68"
                rx="2"
                width={800 - index * 44}
                x={80 + index * 22}
                y={y}
              />
              <text className="diagram-label" x={108 + index * 22} y={y + 28}>
                {level} · {name}
              </text>
              <text className="diagram-detail" x={108 + index * 22} y={y + 51}>
                {detail}
              </text>
            </g>
          )
        })}
      </svg>
    </DiagramFrame>
  )
}

const contractConsumers = [
  { label: 'POLICY', x: 70, y: 70 },
  { label: 'SCHEDULER', x: 650, y: 70 },
  { label: 'CLI / UI', x: 70, y: 340 },
  { label: 'AUDIT / EVALS', x: 650, y: 340 },
] as const

export function TaskContractDiagram() {
  return (
    <DiagramFrame
      description="The manifest is intended to become the shared input to policy, scheduling, operator interfaces, and evidence. In M0, the CLI and policy slice are the working part."
      title="One contract, several future consumers"
    >
      <svg
        aria-labelledby="task-contract-title task-contract-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 960 500"
      >
        <title id="task-contract-title">Task manifest fan-out</title>
        <desc id="task-contract-desc">
          A central task manifest connects to policy, scheduler, CLI and UI, and audit and
          evaluation consumers.
        </desc>
        <defs>
          <marker
            id="contract-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>
        {contractConsumers.map((consumer) => (
          <g key={consumer.label}>
            <rect
              className="diagram-shape"
              height="82"
              rx="2"
              width="240"
              x={consumer.x}
              y={consumer.y}
            />
            <text
              className="diagram-label diagram-label--center"
              x={consumer.x + 120}
              y={consumer.y + 48}
            >
              {consumer.label}
            </text>
          </g>
        ))}
        <path className="diagram-line" d="M400 206 L292 149" markerEnd="url(#contract-arrow)" />
        <path className="diagram-line" d="M560 206 L668 149" markerEnd="url(#contract-arrow)" />
        <path className="diagram-line" d="M400 294 L292 341" markerEnd="url(#contract-arrow)" />
        <path className="diagram-line" d="M560 294 L668 341" markerEnd="url(#contract-arrow)" />
        <rect
          className="diagram-shape diagram-shape--accent"
          height="128"
          rx="2"
          width="300"
          x="330"
          y="186"
        />
        <text className="diagram-label diagram-label--center" x="480" y="232">
          TASK MANIFEST
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="262">
          goal · acceptance · paths
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="286">
          permissions · budget · delivery
        </text>
      </svg>
    </DiagramFrame>
  )
}

const sequenceColumns = [
  { label: 'OPERATOR', x: 95 },
  { label: 'KERNEL', x: 330 },
  { label: 'MODEL', x: 565 },
  { label: 'TOOL', x: 800 },
] as const

export function KernelSequenceDiagram() {
  return (
    <DiagramFrame
      description="The model can return a final answer or request a tool. Every request, response, call, result, warning, and stop becomes a typed event."
      title="The local kernel loop"
    >
      <svg
        aria-labelledby="kernel-sequence-title kernel-sequence-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 960 570"
      >
        <title id="kernel-sequence-title">Kernel model and tool sequence</title>
        <desc id="kernel-sequence-desc">
          The operator gives the kernel a goal. The kernel calls the model, optionally executes a
          tool, returns the tool result to the model, and delivers a final answer with events.
        </desc>
        <defs>
          <marker
            id="sequence-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>
        {sequenceColumns.map((column) => (
          <g key={column.label}>
            <text className="diagram-label diagram-label--center" x={column.x} y="38">
              {column.label}
            </text>
            <line className="diagram-lifeline" x1={column.x} x2={column.x} y1="58" y2="530" />
          </g>
        ))}
        <g className="diagram-sequence">
          <line x1="95" x2="330" y1="100" y2="100" markerEnd="url(#sequence-arrow)" />
          <text x="212" y="88">
            goal + budget
          </text>
          <line x1="330" x2="565" y1="170" y2="170" markerEnd="url(#sequence-arrow)" />
          <text x="448" y="158">
            model.request
          </text>
          <line x1="565" x2="330" y1="240" y2="240" markerEnd="url(#sequence-arrow)" />
          <text x="448" y="228">
            model.response + tool call
          </text>
          <line x1="330" x2="800" y1="310" y2="310" markerEnd="url(#sequence-arrow)" />
          <text x="565" y="298">
            validated tool.call
          </text>
          <line x1="800" x2="330" y1="380" y2="380" markerEnd="url(#sequence-arrow)" />
          <text x="565" y="368">
            tool.result
          </text>
          <line x1="330" x2="565" y1="450" y2="450" markerEnd="url(#sequence-arrow)" />
          <text x="448" y="438">
            result added to context
          </text>
          <line x1="330" x2="95" y1="510" y2="510" markerEnd="url(#sequence-arrow)" />
          <text x="212" y="498">
            final text + event stream
          </text>
        </g>
      </svg>
    </DiagramFrame>
  )
}

export function DogfoodTimelineDiagram() {
  return (
    <DiagramFrame
      description="The most valuable result was not the green check. It was the policy gate refusing a working tree that exceeded its declared scope."
      title="Blocked, corrected, then passed"
    >
      <svg
        aria-labelledby="dogfood-timeline-title dogfood-timeline-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 960 390"
      >
        <title id="dogfood-timeline-title">Dogfooding timeline</title>
        <desc id="dogfood-timeline-desc">
          The first run was blocked by path policy, defects were fixed and the base committed, and a
          later clean run passed forty tests with no policy violations.
        </desc>
        <line className="diagram-line" x1="150" x2="810" y1="120" y2="120" />
        <circle className="diagram-node diagram-node--blocked" cx="170" cy="120" r="18" />
        <circle className="diagram-node diagram-node--work" cx="480" cy="120" r="18" />
        <circle className="diagram-node diagram-node--passed" cx="790" cy="120" r="18" />
        <text className="diagram-label diagram-label--center" x="170" y="180">
          BLOCKED
        </text>
        <text className="diagram-detail diagram-detail--center" x="170" y="212">
          scaffold escaped
        </text>
        <text className="diagram-detail diagram-detail--center" x="170" y="236">
          allowed_paths
        </text>
        <text className="diagram-label diagram-label--center" x="480" y="180">
          CORRECTED
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="212">
          policy truth · types
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="236">
          events · test parser
        </text>
        <text className="diagram-label diagram-label--center" x="790" y="180">
          PASSED
        </text>
        <text className="diagram-detail diagram-detail--center" x="790" y="212">
          0 violations
        </text>
        <text className="diagram-detail diagram-detail--center" x="790" y="236">
          40 / 40 tests
        </text>
        <rect className="diagram-metric" height="66" width="220" x="370" y="286" />
        <text className="diagram-label diagram-label--center" x="480" y="316">
          STRUCTURED EVIDENCE
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="340">
          run-report/v1 · exit code 0
        </text>
      </svg>
    </DiagramFrame>
  )
}
