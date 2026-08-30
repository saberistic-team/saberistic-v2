import { DiagramFrame } from './ArticlePrimitives'

export function CryptoPalArchitectureDiagram() {
  return (
    <DiagramFrame
      description="The 2022 PlantUML named four responsibilities. The implementation makes the browser-side secret boundary, durable stores, local email service, and concrete Solana adapter explicit; future chain adapters remain a design seam, not delivered integrations."
      scrollable
      title="Four sketched components became a seven-service local lab"
    >
      <svg
        aria-labelledby="cryptopal-architecture-title cryptopal-architecture-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 1080 720"
      >
        <title id="cryptopal-architecture-title">
          Original CryptoPal component sketch mapped to the implemented local architecture
        </title>
        <desc id="cryptopal-architecture-desc">
          The original HTTP API, Processor, Chain Vault, and ZKP microservice expand into a React
          browser with Rust WebAssembly, a processor API, a Solana vault backed by a local Agave
          validator, TurboPass, PostgreSQL, DynamoDB Local, and Mailpit. Future chain adapters are
          marked as unimplemented.
        </desc>
        <defs>
          <marker
            id="cryptopal-architecture-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>

        <text className="diagram-label" x="44" y="44">
          2022 PLANTUML SKETCH
        </text>
        {[
          ['HTTP API', 'registers requests', 40],
          ['PROCESSOR', 'coordinates transfer', 300],
          ['CHAIN VAULT', 'manages wallets', 560],
          ['ZKP SERVICE', 'processes tokens', 820],
        ].map(([label, detail, x]) => (
          <g key={label}>
            <rect className="diagram-shape" height="92" rx="3" width="210" x={x} y="76" />
            <text className="diagram-label diagram-label--center" x={Number(x) + 105} y="112">
              {label}
            </text>
            <text className="diagram-detail diagram-detail--center" x={Number(x) + 105} y="142">
              {detail}
            </text>
          </g>
        ))}
        <path
          className="diagram-line"
          d="M250 122 L292 122"
          markerEnd="url(#cryptopal-architecture-arrow)"
        />
        <path
          className="diagram-line"
          d="M510 122 L552 122"
          markerEnd="url(#cryptopal-architecture-arrow)"
        />
        <path
          className="diagram-line"
          d="M405 168 C405 222 925 222 925 176"
          markerEnd="url(#cryptopal-architecture-arrow)"
        />

        <line className="diagram-line" x1="40" x2="1040" y1="252" y2="252" />
        <text className="diagram-label" x="44" y="298">
          2026 RUNNABLE DEMONSTRATOR
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="112"
          rx="3"
          width="235"
          x="40"
          y="338"
        />
        <text className="diagram-label diagram-label--center" x="157" y="376">
          REACT + RUST/WASM
        </text>
        <text className="diagram-detail diagram-detail--center" x="157" y="406">
          blind · verify · unblind
        </text>
        <text className="diagram-detail diagram-detail--center" x="157" y="430">
          tab-scoped bearer secrets
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="112"
          rx="3"
          width="235"
          x="315"
          y="338"
        />
        <text className="diagram-label diagram-label--center" x="432" y="376">
          PROCESSOR API
        </text>
        <text className="diagram-detail diagram-detail--center" x="432" y="406">
          custody · state machines
        </text>
        <text className="diagram-detail diagram-detail--center" x="432" y="430">
          SMTP + payout policy
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="112"
          rx="3"
          width="205"
          x="590"
          y="338"
        />
        <text className="diagram-label diagram-label--center" x="692" y="376">
          SOLANA VAULT
        </text>
        <text className="diagram-detail diagram-detail--center" x="692" y="406">
          Agave + SPL pool
        </text>
        <text className="diagram-detail diagram-detail--center" x="692" y="430">
          implemented now
        </text>

        <rect className="diagram-shape" height="112" rx="3" width="205" x="835" y="338" />
        <text className="diagram-label diagram-label--center" x="937" y="376">
          FUTURE VAULTS
        </text>
        <text className="diagram-detail diagram-detail--center" x="937" y="406">
          new adapter + issuer domain
        </text>
        <text className="diagram-detail diagram-detail--center" x="937" y="430">
          not implemented
        </text>

        <path
          className="diagram-line"
          d="M275 394 L307 394"
          markerEnd="url(#cryptopal-architecture-arrow)"
        />
        <path
          className="diagram-line"
          d="M550 394 L582 394"
          markerEnd="url(#cryptopal-architecture-arrow)"
        />
        <path
          className="diagram-line"
          d="M550 356 C645 294 775 294 835 356"
          markerEnd="url(#cryptopal-architecture-arrow)"
          strokeDasharray="7 7"
        />
        <text className="diagram-detail diagram-detail--center" x="700" y="318">
          alternative adapter seam
        </text>
        <path
          className="diagram-line"
          d="M275 430 C380 500 510 500 590 430"
          markerEnd="url(#cryptopal-architecture-arrow)"
        />
        <text className="diagram-detail diagram-detail--center" x="432" y="494">
          signed transaction broadcast
        </text>

        {[
          ['MAILPIT', 'recipient + claim URL', 40],
          ['POSTGRESQL', 'processor + issuer state', 290],
          ['TURBOPASS', 'blind issuer + redemption', 540],
          ['DYNAMODB LOCAL', 'spent-preimage set', 790],
        ].map(([label, detail, x]) => (
          <g key={label}>
            <rect className="diagram-shape" height="90" rx="3" width="210" x={x} y="530" />
            <text className="diagram-label diagram-label--center" x={Number(x) + 105} y="566">
              {label}
            </text>
            <text className="diagram-detail diagram-detail--center" x={Number(x) + 105} y="596">
              {detail}
            </text>
          </g>
        ))}
        <path
          className="diagram-line"
          d="M390 450 L185 522"
          markerEnd="url(#cryptopal-architecture-arrow)"
        />
        <path
          className="diagram-line"
          d="M420 450 L395 522"
          markerEnd="url(#cryptopal-architecture-arrow)"
        />
        <path
          className="diagram-line"
          d="M455 450 L645 522"
          markerEnd="url(#cryptopal-architecture-arrow)"
        />
        <path
          className="diagram-line"
          d="M750 575 L782 575"
          markerEnd="url(#cryptopal-architecture-arrow)"
        />
        <path
          className="diagram-line"
          d="M645 620 C645 654 480 654 480 620"
          markerEnd="url(#cryptopal-architecture-arrow)"
        />
        <text className="diagram-detail diagram-detail--center" x="540" y="680">
          The client-side secret boundary and operational trust stores were absent from the sketch.
        </text>
      </svg>
    </DiagramFrame>
  )
}

const protocolColumns = [
  { label: 'SENDER', x: 80 },
  { label: 'PROCESSOR', x: 320 },
  { label: 'TURBOPASS', x: 560 },
  { label: 'EMAIL / RECEIVER', x: 800 },
  { label: 'SOLANA', x: 1040 },
] as const

export function CryptoPalProtocolDiagram() {
  return (
    <DiagramFrame
      description="A sender-side slip breaks the cryptographic wallet-to-email join. A new receiver-side coupon breaks the email-to-wallet join. The processor still operates both paths and the public ledger still shows both pool transfers."
      scrollable
      title="One transfer, two independent blinded-token hops"
    >
      <svg
        aria-labelledby="cryptopal-protocol-title cryptopal-protocol-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 1120 1390"
      >
        <title id="cryptopal-protocol-title">
          CryptoPal wallet-to-email-to-wallet protocol sequence
        </title>
        <desc id="cryptopal-protocol-desc">
          The sender prepares a blinded slip, deposits one cUSD to a Solana pool, verifies and
          unblinds the issued slip, and spends it for an email claim. The recipient prepares a fresh
          blinded coupon, verifies and unblinds it, and spends it for a payout to a chosen Solana
          wallet. Both issuance responses travel through the processor.
        </desc>
        <defs>
          <marker
            id="cryptopal-protocol-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>

        {protocolColumns.map((column) => (
          <g key={column.label}>
            <text className="diagram-label diagram-label--center" x={column.x} y="42">
              {column.label}
            </text>
            <line className="diagram-lifeline" x1={column.x} x2={column.x} y1="64" y2="1352" />
          </g>
        ))}

        <text className="diagram-label" x="28" y="92">
          HOP 1 · WALLET → EMAIL
        </text>
        <rect
          className="diagram-shape diagram-shape--accent"
          height="54"
          rx="3"
          width="190"
          x="18"
          y="116"
        />
        <text className="diagram-detail diagram-detail--center" x="113" y="149">
          create + blind slip locally
        </text>

        <g className="diagram-sequence">
          <line x1="80" x2="320" y1="205" y2="205" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="200" y="190">
            blinded slip + deposit intent
          </text>
          <line x1="80" x2="1040" y1="260" y2="260" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="560" y="245">
            transfer 1 cUSD to pool + deposit memo
          </text>
          <line x1="320" x2="1040" y1="315" y2="315" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="680" y="300">
            load and verify exact confirmed transaction
          </text>
          <line x1="320" x2="560" y1="370" y2="370" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="440" y="355">
            issue blinded slip
          </text>
          <line x1="560" x2="320" y1="425" y2="425" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="440" y="410">
            signed point + public key + batch proof
          </text>
          <line x1="320" x2="80" y1="480" y2="480" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="200" y="465">
            issuance returned
          </text>
        </g>
        <rect
          className="diagram-shape diagram-shape--accent"
          height="66"
          rx="3"
          width="230"
          x="18"
          y="505"
        />
        <text className="diagram-detail diagram-detail--center" x="133" y="533">
          verify key + proof
        </text>
        <text className="diagram-detail diagram-detail--center" x="133" y="557">
          unblind bearer locally
        </text>
        <g className="diagram-sequence">
          <line x1="80" x2="320" y1="610" y2="610" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="200" y="595">
            spend slip on email-bound payload
          </text>
          <line x1="320" x2="560" y1="665" y2="665" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="440" y="650">
            record slip spent once
          </text>
          <line x1="320" x2="800" y1="720" y2="720" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="560" y="705">
            SMTP claim URL with #capability
          </text>
        </g>

        <line className="diagram-line" x1="24" x2="1096" y1="760" y2="760" />
        <text className="diagram-label" x="28" y="800">
          HOP 2 · EMAIL → RECEIVER WALLET
        </text>
        <rect
          className="diagram-shape diagram-shape--accent"
          height="54"
          rx="3"
          width="226"
          x="687"
          y="824"
        />
        <text className="diagram-detail diagram-detail--center" x="800" y="857">
          create + blind coupon locally
        </text>
        <g className="diagram-sequence">
          <line x1="800" x2="320" y1="920" y2="920" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="560" y="905">
            claim capability + blinded coupon
          </text>
          <line x1="320" x2="560" y1="975" y2="975" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="440" y="960">
            issue blinded coupon
          </text>
          <line x1="560" x2="320" y1="1030" y2="1030" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="440" y="1015">
            signed point + public key + batch proof
          </text>
          <line x1="320" x2="800" y1="1085" y2="1085" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="560" y="1070">
            issuance returned
          </text>
        </g>
        <rect
          className="diagram-shape diagram-shape--accent"
          height="66"
          rx="3"
          width="226"
          x="687"
          y="1110"
        />
        <text className="diagram-detail diagram-detail--center" x="800" y="1138">
          verify key + proof
        </text>
        <text className="diagram-detail diagram-detail--center" x="800" y="1162">
          unblind coupon locally
        </text>
        <g className="diagram-sequence">
          <line x1="800" x2="320" y1="1215" y2="1215" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="560" y="1200">
            wallet + preimage + wallet-bound HMAC
          </text>
          <line x1="320" x2="560" y1="1270" y2="1270" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="440" y="1255">
            redeem coupon once
          </text>
          <line x1="320" x2="1040" y1="1325" y2="1325" markerEnd="url(#cryptopal-protocol-arrow)" />
          <text x="680" y="1310">
            custodial payout of 1 cUSD
          </text>
        </g>
      </svg>
    </DiagramFrame>
  )
}

export function CryptoPalPrivacyDiagram() {
  return (
    <DiagramFrame
      description="Blinding prevents two adjacent cryptographic joins. It does not hide the public Solana transfers or prevent the processor, mail service, network, or browser telemetry from correlating timing and identity metadata."
      scrollable
      title="What the two privacy boundaries hide—and what they do not"
    >
      <svg
        aria-labelledby="cryptopal-privacy-title cryptopal-privacy-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 1040 640"
      >
        <title id="cryptopal-privacy-title">
          CryptoPal cryptographic and operational visibility
        </title>
        <desc id="cryptopal-privacy-desc">
          A sender wallet connects publicly to a custodial pool and the pool connects publicly to a
          receiver wallet. Separate blind slip and coupon hops protect the adjacent wallet-to-email
          and email-to-wallet cryptographic joins. The processor, email service, and network can
          still correlate metadata.
        </desc>
        <defs>
          <marker
            id="cryptopal-privacy-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>

        <text className="diagram-label" x="40" y="48">
          CRYPTOGRAPHIC VIEW
        </text>
        {[
          ['SENDER WALLET', 'public on-chain address', 35],
          ['BLIND SLIP HOP', 'wallet ↛ email join', 280],
          ['EMAIL CLAIM', 'one-time capability', 525],
          ['BLIND COUPON HOP', 'email ↛ wallet join', 770],
        ].map(([label, detail, x], index) => (
          <g key={label}>
            <rect
              className={
                index === 1 || index === 3 ? 'diagram-shape diagram-shape--accent' : 'diagram-shape'
              }
              height="104"
              rx="3"
              width="215"
              x={x}
              y="84"
            />
            <text className="diagram-label diagram-label--center" x={Number(x) + 107} y="124">
              {label}
            </text>
            <text className="diagram-detail diagram-detail--center" x={Number(x) + 107} y="156">
              {detail}
            </text>
          </g>
        ))}
        <path
          className="diagram-line"
          d="M250 136 L272 136"
          markerEnd="url(#cryptopal-privacy-arrow)"
        />
        <path
          className="diagram-line"
          d="M495 136 L517 136"
          markerEnd="url(#cryptopal-privacy-arrow)"
        />
        <path
          className="diagram-line"
          d="M740 136 L762 136"
          markerEnd="url(#cryptopal-privacy-arrow)"
        />
        <rect className="diagram-shape" height="104" rx="3" width="215" x="770" y="232" />
        <text className="diagram-label diagram-label--center" x="877" y="272">
          RECEIVER WALLET
        </text>
        <text className="diagram-detail diagram-detail--center" x="877" y="304">
          public on-chain address
        </text>
        <path
          className="diagram-line"
          d="M877 188 L877 224"
          markerEnd="url(#cryptopal-privacy-arrow)"
        />

        <line className="diagram-line" x1="40" x2="1000" y1="382" y2="382" />
        <text className="diagram-label" x="40" y="428">
          OBSERVABLE OR TRUSTED OUTSIDE THE BLINDING CLAIM
        </text>
        {[
          ['SOLANA', 'sender → pool and pool → receiver are public', 35],
          ['PROCESSOR', 'custody, timing, IP and adjacent operations', 355],
          ['EMAIL', 'recipient mailbox and full claim URL', 675],
        ].map(([label, detail, x]) => (
          <g key={label}>
            <rect
              className="diagram-node diagram-node--work"
              height="104"
              rx="3"
              width="290"
              x={x}
              y="466"
            />
            <text className="diagram-label diagram-label--center" x={Number(x) + 145} y="506">
              {label}
            </text>
            <text className="diagram-detail diagram-detail--center" x={Number(x) + 145} y="538">
              {detail}
            </text>
          </g>
        ))}
        <text className="diagram-detail diagram-detail--center" x="520" y="616">
          Unlinkable bearers are not anonymous operations, confidential transfers, or proof of
          reserves.
        </text>
      </svg>
    </DiagramFrame>
  )
}

export function CryptoPalStateDiagram() {
  return (
    <DiagramFrame
      description="The original Key–Issuer–Redemption object sketch became two domain-separated issuers, three durable processor state machines, unique hashes and signatures, and TurboPass's authoritative spent-preimage record."
      scrollable
      title="Retry safety is part of the protocol, not an HTTP afterthought"
    >
      <svg
        aria-labelledby="cryptopal-state-title cryptopal-state-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 1080 740"
      >
        <title id="cryptopal-state-title">
          CryptoPal issuers, state machines, and replay controls
        </title>
        <desc id="cryptopal-state-desc">
          Separate slip and coupon issuer domains lead into deposit, email transfer, and payout
          state machines. Unique chain signatures, claim hashes, token hashes, and the TurboPass
          spent set make retries converge on one result.
        </desc>
        <defs>
          <marker
            id="cryptopal-state-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>

        <text className="diagram-label" x="40" y="44">
          DOMAIN-SEPARATED ISSUERS
        </text>
        <rect
          className="diagram-shape diagram-shape--accent"
          height="82"
          rx="3"
          width="460"
          x="40"
          y="76"
        />
        <text className="diagram-label diagram-label--center" x="270" y="108">
          SLIP ISSUER
        </text>
        <text className="diagram-detail diagram-detail--center" x="270" y="137">
          version · genesis · mint · 1 cUSD · slip
        </text>
        <rect
          className="diagram-shape diagram-shape--accent"
          height="82"
          rx="3"
          width="460"
          x="580"
          y="76"
        />
        <text className="diagram-label diagram-label--center" x="810" y="108">
          COUPON ISSUER
        </text>
        <text className="diagram-detail diagram-detail--center" x="810" y="137">
          version · genesis · mint · 1 cUSD · coupon
        </text>

        {[
          {
            label: 'DEPOSIT',
            nodes: ['AWAITING_CHAIN', 'ISSUING', 'ISSUED'],
            note: 'signature + blinded-token hash',
            y: 246,
          },
          {
            label: 'EMAIL CLAIM',
            nodes: ['AWAITING_SLIP', 'AVAILABLE', 'COUPON_ISSUING', 'COUPON_ISSUED'],
            note: 'email + capability hashes',
            y: 390,
          },
          {
            label: 'PAYOUT',
            nodes: ['REDEEMING', 'SUBMITTING', 'CONFIRMED'],
            note: 'coupon hash + signed tx bytes',
            y: 534,
          },
        ].map((row) => {
          const startX = row.nodes.length === 4 ? 250 : 330
          const gap = row.nodes.length === 4 ? 190 : 220
          const width = row.nodes.length === 4 ? 160 : 180
          return (
            <g key={row.label}>
              <text className="diagram-label" x="40" y={row.y + 38}>
                {row.label}
              </text>
              <text className="diagram-detail" x="40" y={row.y + 68}>
                {row.note}
              </text>
              {row.nodes.map((node, index) => {
                const x = startX + index * gap
                return (
                  <g key={node}>
                    <rect
                      className="diagram-shape"
                      height="76"
                      rx="3"
                      width={width}
                      x={x}
                      y={row.y}
                    />
                    <text
                      className="diagram-label diagram-label--center"
                      x={x + width / 2}
                      y={row.y + 45}
                    >
                      {node}
                    </text>
                    {index === row.nodes.length - 1 ? null : (
                      <path
                        className="diagram-line"
                        d={`M${x + width} ${row.y + 38} L${startX + (index + 1) * gap - 8} ${row.y + 38}`}
                        markerEnd="url(#cryptopal-state-arrow)"
                      />
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}
        <rect
          className="diagram-node diagram-node--passed"
          height="66"
          rx="3"
          width="440"
          x="320"
          y="654"
        />
        <text className="diagram-label diagram-label--center" x="540" y="682">
          TURBOPASS SPENT-PREIMAGE SET
        </text>
        <text className="diagram-detail diagram-detail--center" x="540" y="706">
          authoritative one-use gate
        </text>
      </svg>
    </DiagramFrame>
  )
}
