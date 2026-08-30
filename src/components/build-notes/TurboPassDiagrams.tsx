import { DiagramFrame } from './ArticlePrimitives'

export function FfiBridgeDiagram() {
  return (
    <DiagramFrame
      description="On a sentinel failure, the legacy bridge needed a second C call on the same native thread to read and clear Rust's thread-local error. TurboPass calls the same cryptography crate directly and receives a normal Rust Result."
      title="The bridge removed—not the cryptography"
    >
      <svg
        aria-labelledby="ffi-bridge-title ffi-bridge-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 960 570"
      >
        <title id="ffi-bridge-title">
          Legacy FFI bridge compared with TurboPass native Rust calls
        </title>
        <desc id="ffi-bridge-desc">
          The legacy path pins a Go goroutine to an operating-system thread, crosses a C interface
          into Rust, and on a sentinel failure makes a second call to read and clear a thread-local
          error. TurboPass calls the same Rust cryptography crate directly and receives a Result.
        </desc>
        <defs>
          <marker id="ffi-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>

        <text className="diagram-label" x="54" y="48">
          BEFORE · GO + CGO + RUST
        </text>
        {[
          ['GO WRAPPER', 'LockOSThread', 55],
          ['C ABI', 'crypto call', 285],
          ['RUST FFI', 'LAST_ERROR on failure', 515],
          ['C ABI', 'read + clear error', 745],
        ].map(([label, detail, x]) => (
          <g key={`${label}-${x}`}>
            <rect className="diagram-shape" height="88" rx="2" width="170" x={x} y="82" />
            <text className="diagram-label diagram-label--center" x={Number(x) + 85} y="118">
              {label}
            </text>
            <text className="diagram-detail diagram-detail--center" x={Number(x) + 85} y="146">
              {detail}
            </text>
          </g>
        ))}
        <path className="diagram-line" d="M225 126 L277 126" markerEnd="url(#ffi-arrow)" />
        <path className="diagram-line" d="M455 126 L507 126" markerEnd="url(#ffi-arrow)" />
        <path className="diagram-line" d="M685 126 L737 126" markerEnd="url(#ffi-arrow)" />
        <text className="diagram-detail diagram-detail--center" x="711" y="104">
          sentinel failure
        </text>
        <path
          className="diagram-line"
          d="M830 180 C830 236 140 236 140 180"
          markerEnd="url(#ffi-arrow)"
        />
        <text className="diagram-detail diagram-detail--center" x="480" y="258">
          failure path stays on one OS thread until read + clear
        </text>

        <line className="diagram-line" x1="55" x2="905" y1="302" y2="302" />
        <text className="diagram-label" x="54" y="350">
          AFTER · TURBOPASS
        </text>
        <rect
          className="diagram-shape diagram-shape--accent"
          height="112"
          rx="2"
          width="260"
          x="150"
          y="388"
        />
        <text className="diagram-label diagram-label--center" x="280" y="430">
          RUST SERVICE
        </text>
        <text className="diagram-detail diagram-detail--center" x="280" y="460">
          direct function call
        </text>
        <rect
          className="diagram-shape diagram-shape--accent"
          height="112"
          rx="2"
          width="300"
          x="550"
          y="388"
        />
        <text className="diagram-label diagram-label--center" x="700" y="430">
          SAME CRYPTO CRATE
        </text>
        <text className="diagram-detail diagram-detail--center" x="700" y="460">
          Result&lt;T, CryptoError&gt;
        </text>
        <path className="diagram-line" d="M410 444 L542 444" markerEnd="url(#ffi-arrow)" />
        <text className="diagram-detail diagram-detail--center" x="480" y="540">
          no C ABI · no cgo · no thread-local error shuttle
        </text>
      </svg>
    </DiagramFrame>
  )
}

const lifecycleColumns = [
  { label: 'CLIENT', x: 100 },
  { label: 'TURBOPASS', x: 420 },
  { label: 'STORE', x: 820 },
] as const

export function TokenLifecycleDiagram() {
  return (
    <DiagramFrame
      description="Issuance and redemption are synchronous public API operations. Blinding, proof verification, and unblinding stay on the client; there is no polling ID or Temporal workflow in the request path."
      title="One batch issuance, then one redemption per token"
    >
      <svg
        aria-labelledby="token-lifecycle-title token-lifecycle-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 960 650"
      >
        <title id="token-lifecycle-title">TurboPass token issuance and redemption sequence</title>
        <desc id="token-lifecycle-desc">
          The client blinds tokens locally, sends one issuance request, verifies and unblinds the
          response locally, then sends one redemption request for each token. TurboPass records
          replay state in PostgreSQL for version one or DynamoDB for versions two and three.
        </desc>
        <defs>
          <marker
            id="lifecycle-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>
        {lifecycleColumns.map((column) => (
          <g key={column.label}>
            <text className="diagram-label diagram-label--center" x={column.x} y="38">
              {column.label}
            </text>
            <line className="diagram-lifeline" x1={column.x} x2={column.x} y1="58" y2="610" />
          </g>
        ))}
        <rect
          className="diagram-shape diagram-shape--accent"
          height="58"
          rx="2"
          width="210"
          x="25"
          y="82"
        />
        <text className="diagram-detail diagram-detail--center" x="130" y="116">
          create + blind locally
        </text>
        <g className="diagram-sequence">
          <line x1="100" x2="420" y1="185" y2="185" markerEnd="url(#lifecycle-arrow)" />
          <text x="260" y="171">
            one batch issuance POST
          </text>
          <line x1="420" x2="100" y1="265" y2="265" markerEnd="url(#lifecycle-arrow)" />
          <text x="260" y="251">
            signed tokens + public key + proof
          </text>
        </g>
        <rect
          className="diagram-shape diagram-shape--accent"
          height="76"
          rx="2"
          width="250"
          x="25"
          y="310"
        />
        <text className="diagram-detail diagram-detail--center" x="150" y="340">
          verify proof + unblind
        </text>
        <text className="diagram-detail diagram-detail--center" x="150" y="366">
          sign redemption locally
        </text>
        <g className="diagram-sequence">
          <line x1="100" x2="420" y1="438" y2="438" markerEnd="url(#lifecycle-arrow)" />
          <text x="260" y="424">
            redemption POST × token
          </text>
          <line x1="420" x2="820" y1="500" y2="500" markerEnd="url(#lifecycle-arrow)" />
          <text x="620" y="486">
            conditional replay marker
          </text>
          <line x1="420" x2="100" y1="562" y2="562" markerEnd="url(#lifecycle-arrow)" />
          <text x="260" y="548">
            200 or replay conflict
          </text>
        </g>
        <text className="diagram-detail diagram-detail--center" x="820" y="594">
          Postgres v1 · DynamoDB v2/v3
        </text>
      </svg>
    </DiagramFrame>
  )
}

export function TemporalBoundaryDiagram() {
  return (
    <DiagramFrame
      description="Temporal history contains versioned inputs, aggregate counts, and sanitized failures—not signing keys. Keys persist in PostgreSQL and enter API or worker process memory only when needed."
      title="Durable orchestration with a secret-free history"
    >
      <svg
        aria-labelledby="temporal-boundary-title temporal-boundary-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 960 620"
      >
        <title id="temporal-boundary-title">Temporal issuer rotation trust boundary</title>
        <desc id="temporal-boundary-desc">
          A Temporal schedule starts a deterministic workflow. The workflow executes one bounded
          activity. The activity reads and locks issuer rows, generates missing keys with the native
          cryptography crate, and commits them to PostgreSQL. Only aggregate counts return to
          workflow history.
        </desc>
        <defs>
          <marker
            id="temporal-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>
        <text className="diagram-label" x="50" y="46">
          TEMPORAL HISTORY · SECRET-FREE
        </text>
        <rect className="diagram-shape" height="94" rx="2" width="220" x="60" y="82" />
        <text className="diagram-label diagram-label--center" x="170" y="118">
          SCHEDULE
        </text>
        <text className="diagram-detail diagram-detail--center" x="170" y="146">
          minute / hour · skip overlap
        </text>
        <rect className="diagram-shape" height="94" rx="2" width="260" x="350" y="82" />
        <text className="diagram-label diagram-label--center" x="480" y="118">
          WORKFLOW
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="146">
          mode + deterministic cutoff
        </text>
        <rect className="diagram-shape" height="94" rx="2" width="220" x="680" y="82" />
        <text className="diagram-label diagram-label--center" x="790" y="118">
          REPORT
        </text>
        <text className="diagram-detail diagram-detail--center" x="790" y="146">
          aggregate counts only
        </text>
        <path className="diagram-line" d="M280 129 L342 129" markerEnd="url(#temporal-arrow)" />
        <path className="diagram-line" d="M610 129 L672 129" markerEnd="url(#temporal-arrow)" />

        <line className="diagram-line" x1="50" x2="910" y1="235" y2="235" />
        <text className="diagram-label" x="50" y="282">
          ACTIVITY + DATABASE · SECRETS STAY HERE
        </text>
        <rect
          className="diagram-shape diagram-shape--accent"
          height="104"
          rx="2"
          width="260"
          x="350"
          y="318"
        />
        <text className="diagram-label diagram-label--center" x="480" y="357">
          ROTATION ACTIVITY
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="387">
          clock · RNG · crypto · SQL
        </text>
        <path className="diagram-line" d="M480 176 L480 310" markerEnd="url(#temporal-arrow)" />
        <rect className="diagram-shape" height="92" rx="2" width="240" x="70" y="476" />
        <text className="diagram-label diagram-label--center" x="190" y="512">
          CRYPTO CRATE
        </text>
        <text className="diagram-detail diagram-detail--center" x="190" y="540">
          generate + derive keys
        </text>
        <rect className="diagram-shape" height="92" rx="2" width="240" x="650" y="476" />
        <text className="diagram-label diagram-label--center" x="770" y="512">
          POSTGRESQL
        </text>
        <text className="diagram-detail diagram-detail--center" x="770" y="540">
          lock + contiguous commit
        </text>
        <path className="diagram-line" d="M380 422 L270 470" markerEnd="url(#temporal-arrow)" />
        <path className="diagram-line" d="M580 422 L690 470" markerEnd="url(#temporal-arrow)" />
      </svg>
    </DiagramFrame>
  )
}

export function LocalStackDiagram() {
  return (
    <DiagramFrame
      description="The Compose environment exercises the real public API through Artillery while a test-only Rust client helper owns blinding secrets. PostgreSQL, DynamoDB Local, and Temporal provide the three state boundaries."
      title="The disposable end-to-end stack"
    >
      <svg
        aria-labelledby="local-stack-title local-stack-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 960 600"
      >
        <title id="local-stack-title">TurboPass Docker Compose development topology</title>
        <desc id="local-stack-desc">
          Artillery coordinates lifecycle traffic and calls a private Rust load client. Public
          requests reach the TurboPass API, which uses PostgreSQL and DynamoDB Local. The Temporal
          service and reconciled Schedule start workflows processed by the rotation worker, which
          updates PostgreSQL; the one-shot schedule reconciler exits.
        </desc>
        <defs>
          <marker id="stack-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>
        {[
          ['ARTILLERY', 'HTTP orchestration', 50, 70, 220],
          ['RUST LOAD CLIENT', 'blind · verify · unblind', 50, 230, 220],
          ['TURBOPASS API', 'compatible public routes', 365, 70, 240],
          ['ROTATION WORKER', 'Temporal activity', 365, 390, 240],
          ['TEMPORAL', 'schedules + histories', 690, 390, 220],
          ['POSTGRESQL', 'issuers · keys · v1 replay', 690, 70, 220],
          ['DYNAMODB LOCAL', 'v2/v3 replay', 690, 230, 220],
        ].map(([label, detail, x, y, width]) => (
          <g key={label}>
            <rect
              className={
                label === 'TURBOPASS API' ? 'diagram-shape diagram-shape--accent' : 'diagram-shape'
              }
              height="94"
              rx="2"
              width={width}
              x={x}
              y={y}
            />
            <text
              className="diagram-label diagram-label--center"
              x={Number(x) + Number(width) / 2}
              y={Number(y) + 38}
            >
              {label}
            </text>
            <text
              className="diagram-detail diagram-detail--center"
              x={Number(x) + Number(width) / 2}
              y={Number(y) + 67}
            >
              {detail}
            </text>
          </g>
        ))}
        <path className="diagram-line" d="M270 117 L357 117" markerEnd="url(#stack-arrow)" />
        <path className="diagram-line" d="M160 164 L160 222" markerEnd="url(#stack-arrow)" />
        <path className="diagram-line" d="M605 117 L682 117" markerEnd="url(#stack-arrow)" />
        <path
          className="diagram-line"
          d="M605 150 C650 150 650 277 682 277"
          markerEnd="url(#stack-arrow)"
        />
        <path className="diagram-line" d="M800 390 L800 332" markerEnd="url(#stack-arrow)" />
        <path className="diagram-line" d="M690 437 L613 437" markerEnd="url(#stack-arrow)" />
        <path
          className="diagram-line"
          d="M485 390 C485 210 650 210 690 164"
          markerEnd="url(#stack-arrow)"
        />
        <rect className="diagram-metric" height="64" width="360" x="300" y="520" />
        <text className="diagram-label diagram-label--center" x="480" y="548">
          ONE COMMAND · DISPOSABLE STATE
        </text>
        <text className="diagram-detail diagram-detail--center" x="480" y="570">
          make compose-up → make loadtest-smoke
        </text>
      </svg>
    </DiagramFrame>
  )
}
