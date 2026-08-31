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
  tone?: 'accent' | 'blocked' | 'default' | 'safe' | 'warning'
}) {
  return (
    <div className={`growth-diagram__node growth-diagram__node--${tone}`}>
      <span>{eyebrow}</span>
      <strong>{children}</strong>
      <small>{detail}</small>
    </div>
  )
}

function Arrow({ label }: { label: string }) {
  return (
    <span aria-hidden="true" className="growth-diagram__arrow">
      <small>{label}</small>
      <b>→</b>
    </span>
  )
}

export function GrowthSubjectMapDiagram() {
  return (
    <DiagramFrame
      description="The contract does not define what growth means. An Organization, Rubric identity or commitment, evidence policy, and compatible period policy give one bounded score vector its meaning. A subject public key can control a team, project, contributor profile, or physical-asset record; an asset therefore needs a controller wallet and custody policy."
      scrollable
      title="One receipt shape, different subjects"
    >
      <div
        aria-label="A shared policy envelope containing Organization, Rubric identity or commitment, evidence policy, and compatible period policy applies to four possible subject-key families: team controllers, project controllers, contributors, and asset-associated controllers. Every family produces the same bounded score and coverage receipt, but scores are comparable only inside one policy envelope. Physical assets require a controller wallet with custody and rotation rules."
        className="growth-smart-diagram growth-smart-diagram--subject-map"
        role="img"
      >
        <div className="growth-smart-diagram__guardrails">
          <Node
            detail="The comparison boundary that makes a score interpretable"
            eyebrow="POLICY ENVELOPE"
            tone="accent"
          >
            Organization · rubric identity · evidence rules · period policy
          </Node>
        </div>
        <span aria-hidden="true" className="growth-smart-diagram__down-arrow">
          applies to ↓
        </span>
        <div className="growth-smart-diagram__subjects">
          <Node detail="delivery · quality · collaboration" eyebrow="PEOPLE SYSTEM">
            Team
          </Node>
          <Node detail="security · reliability · governance" eyebrow="TECHNICAL SYSTEM">
            Project
          </Node>
          <Node detail="craft · stewardship · mentorship" eyebrow="CONSENTING PERSON">
            Contributor
          </Node>
          <Node
            detail="controller wallet · custody · rotation"
            eyebrow="PHYSICAL SYSTEM"
            tone="safe"
          >
            Asset record
          </Node>
        </div>
        <div className="growth-smart-diagram__receipt-band">
          <strong>Shared receipt</strong>
          <span>score vector · weighted result · coverage · evidence commitment</span>
          <small>
            Compare only within the same Organization, Rubric identity, evidence rules, and
            compatible period policy.
          </small>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function GrowthTelemetryPipelineDiagram() {
  return (
    <DiagramFrame
      description="Proposed architecture, not an implemented repository service: sensors never call the Solana program. Raw telemetry would stay in a governed off-chain evidence system; an adapter would validate it, the issuer would grade bounded aggregates, and Growth v2 would store the declared result and commitment."
      scrollable
      title="Proposed observe, validate, grade, commit pipeline"
    >
      <div
        aria-label="Proposed architecture, not an implemented sensor service. Sensors and inspections would produce timestamped evidence. An off-chain adapter would validate provenance, calibration, gaps, and signatures. An accountable issuer would apply a versioned rubric. Growth version two would store aggregate scores, coverage, period, rubric version, and an evidence commitment. Raw telemetry would remain private off-chain, while the chain cannot prove that sensors or the issuer told the truth."
        className="growth-smart-diagram growth-smart-diagram--pipeline"
        role="img"
      >
        <Node detail="timestamped readings + inspections" eyebrow="01 / OBSERVE">
          Sensors
        </Node>
        <Arrow label="raw evidence" />
        <Node
          detail="provenance · calibration · gaps · signatures"
          eyebrow="02 / VALIDATE"
          tone="warning"
        >
          Proposed adapter
        </Node>
        <Arrow label="bounded inputs" />
        <Node detail="apply one published rubric version" eyebrow="03 / GRADE" tone="accent">
          Accountable issuer
        </Node>
        <Arrow label="signed assessment" />
        <Node detail="aggregates · period · rubric · commitment" eyebrow="04 / COMMIT" tone="safe">
          Growth v2
        </Node>
        <div className="growth-smart-diagram__trust-band">
          <div>
            <strong>OFF CHAIN</strong>
            <span>raw telemetry, calibration records, signatures, exception evidence</span>
          </div>
          <div>
            <strong>ON CHAIN</strong>
            <span>who attested, which policy, which period, bounded aggregates, one hash</span>
          </div>
          <small>
            Integrity boundary: the hash can detect later change; it cannot establish sensor truth.
          </small>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function GrowthDeploymentProofDiagram() {
  return (
    <DiagramFrame
      description="The deployment closed the placeholder-identity gap and established byte and IDL equality checks. It did not establish clean-source provenance: both verifiable builds came from one operator and a dirty worktree based on the earlier local-lab commit."
      scrollable
      title="What the devnet proof chain establishes"
    >
      <div
        aria-label="A source worktree based on commit d944ee7 was dirty during the deployment build. One operator produced two byte-identical verifiable builds in the pinned Anchor container. The resulting executable was deployed to the new devnet program, fetched back byte-identically, and verified alongside a semantically matching published IDL. The deployment manifest was then committed at 3497678. Independent clean-build attestation and multisig custody remain missing."
        className="growth-smart-diagram growth-smart-diagram--proof-chain"
        role="img"
      >
        <Node
          detail="base d944ee7 · worktreeCleanAtBuild: false"
          eyebrow="SOURCE STATE"
          tone="warning"
        >
          Candidate worktree
        </Node>
        <Arrow label="same operator" />
        <Node detail="Anchor 0.31.1 · Solana 2.3.12" eyebrow="BUILD × 2" tone="accent">
          Byte-identical .so
        </Node>
        <Arrow label="deploy" />
        <Node detail="DA9e…DAVE · slot 491039186" eyebrow="DEVNET" tone="safe">
          Executable program
        </Node>
        <Arrow label="read back" />
        <Node detail="dump equals .so · IDL semantic match" eyebrow="CHAIN CHECK" tone="safe">
          Bytes + interface
        </Node>
        <Arrow label="record" />
        <Node detail="public manifest, hashes, signatures, gates" eyebrow="COMMIT 3497678">
          Durable evidence
        </Node>
        <div className="growth-smart-diagram__gap-band">
          <strong>Still missing</strong>
          <span>
            clean signed source pin · independent operator reproduction · approved multisig custody
          </span>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function GrowthEnvironmentLanesDiagram() {
  return (
    <DiagramFrame
      description="Four environments answer four different questions. The hosted product story is synthetic, localhost proves real instruction execution, devnet holds the candidate program and IDL without a live client, and mainnet remains outside this release."
      scrollable
      title="Deployment is not the same as a live product"
    >
      <div
        aria-label="The owner-only hosted website has synthetic fixtures and a network-disabled simulator. The localhost lab performs real writes to an isolated validator. Solana devnet contains the experimental Growth version two program and IDL but has no approved explorer, wallet, or transaction client. Growth version two is not deployed to mainnet."
        className="growth-smart-diagram growth-smart-diagram--lanes"
        role="img"
      >
        <section>
          <Node
            detail="fixtures + browser memory · connect-src none"
            eyebrow="HOSTED"
            tone="accent"
          >
            Product story
          </Node>
          <strong className="growth-smart-diagram__lane-status">NO NETWORK</strong>
          <span>No RPC · wallet · signing · sending</span>
        </section>
        <section>
          <Node detail="loopback bridge + disposable validator" eyebrow="LOCALHOST" tone="safe">
            Real program proof
          </Node>
          <strong className="growth-smart-diagram__lane-status">REAL WRITES</strong>
          <span>Isolated ledger · ephemeral signers</span>
        </section>
        <section>
          <Node detail="program + ProgramData + published IDL" eyebrow="DEVNET" tone="warning">
            Candidate deployed
          </Node>
          <strong className="growth-smart-diagram__lane-status">NO-GO UI</strong>
          <span>No approved explorer or transaction path</span>
        </section>
        <section>
          <Node detail="legacy v1 remains a separate incident" eyebrow="MAINNET" tone="blocked">
            V2 absent
          </Node>
          <strong className="growth-smart-diagram__lane-status">OUT OF SCOPE</strong>
          <span>No v2 deployment · no in-place upgrade</span>
        </section>
      </div>
    </DiagramFrame>
  )
}
