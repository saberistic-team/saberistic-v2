import type { ReactNode } from 'react'

import { DiagramFrame } from '@/components/build-notes/ArticlePrimitives'

function DiagramNode({
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

function DiagramArrow({ label = 'then' }: { label?: string }) {
  return (
    <span aria-hidden="true" className="growth-diagram__arrow">
      <small>{label}</small>
      <b>→</b>
    </span>
  )
}

export function GrowthContainmentDiagram() {
  return (
    <DiagramFrame
      description="The safe sequence was observation, privacy-minimized preservation, containment, and only then a fresh replacement. Deleting secrets from the current tree did not complete the external incident response."
      scrollable
      title="Contain before rebuilding"
    >
      <div
        aria-label="Legacy mainnet and devnet deployments lead to a sanitized snapshot, then open operator containment actions, then an undeployed Growth version two release path."
        className="growth-diagram growth-diagram--flow"
        role="img"
      >
        <DiagramNode
          detail="Different binaries; upgradeable; single-key authority"
          eyebrow="LEGACY V1"
          tone="warning"
        >
          Mainnet + devnet
        </DiagramNode>
        <DiagramArrow label="observe" />
        <DiagramNode
          detail="Binaries, IDLs, counts, hashes—no raw scores or names"
          eyebrow="READ ONLY"
          tone="accent"
        >
          Sanitized snapshot
        </DiagramNode>
        <DiagramArrow label="contain" />
        <DiagramNode
          detail="Provider revocation, signer recovery, custody, history"
          eyebrow="OPERATOR WORK"
          tone="blocked"
        >
          Actions still open
        </DiagramNode>
        <DiagramArrow label="replace" />
        <DiagramNode
          detail="New account model; tested locally; no external deployment"
          eyebrow="GROWTH V2"
          tone="safe"
        >
          Fresh release path
        </DiagramNode>
      </div>
    </DiagramFrame>
  )
}

export function GrowthAccountModelDiagram() {
  return (
    <DiagramFrame
      description="Every relationship is explicit and indexable. Rubric policy and assessment result payloads are immutable; assessment lifecycle status and the profile's current cache can change."
      scrollable
      title="The v2 account graph"
    >
      <div
        aria-label="An organization namespaces two sibling account paths: versioned rubrics, and subject score profiles. Each score profile anchors monotonic assessment records that reference a rubric. A separate one-time migration receipt links legacy provenance without importing legacy scores."
        className="growth-diagram growth-diagram--account-model"
        role="img"
      >
        <div className="growth-diagram__account-root">
          <DiagramNode
            detail="creator namespace · authority · status · active rubric"
            eyebrow="ROOT PDA"
            tone="accent"
          >
            Organization
          </DiagramNode>
          <span aria-hidden="true">namespaces both paths ↓</span>
        </div>
        <div className="growth-diagram__account-children">
          <section>
            <p>ORGANIZATION + SEQUENTIAL VERSION</p>
            <DiagramNode
              detail="policy immutable after one-time activation"
              eyebrow="POLICY SIBLING"
            >
              Rubric 1…n
            </DiagramNode>
          </section>
          <section>
            <p>ORGANIZATION + SUBJECT</p>
            <DiagramNode
              detail="consent · lifecycle · current cache"
              eyebrow="SUBJECT SIBLING"
              tone="safe"
            >
              ScoreProfile
            </DiagramNode>
            <DiagramArrow label="profile + sequence" />
            <DiagramNode
              detail="immutable result · disputed/corrected status"
              eyebrow="HISTORY CHILD"
            >
              Assessment 1…n
            </DiagramNode>
          </section>
        </div>
        <div className="growth-diagram__receipt">
          <DiagramNode
            detail="one canonical v1 score → one receipt; provenance only"
            eyebrow="OPTIONAL BRIDGE"
            tone="warning"
          >
            LegacyMigrationReceipt
          </DiagramNode>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function GrowthLifecycleDiagram() {
  return (
    <DiagramFrame
      description="The issuer can attest, but it cannot silently enroll a subject or replace an old result payload. Dispute and correction update the old record's lifecycle status; the corrected result is a new account. Revocation and retirement are terminal."
      scrollable
      title="Consent, history, and correction"
    >
      <div
        aria-label="Issuer and subject co-sign enrollment. The issuer submits an assessment whose result payload is immutable. The subject may change its status to disputed. A correction requires both signatures, changes the old status to corrected, and creates a new assessment that supersedes it. Subject revocation and organization retirement are terminal exits."
        className="growth-diagram growth-diagram--lifecycle"
        role="img"
      >
        <div className="growth-diagram__signers">
          <DiagramNode
            detail="defines rubric and submits aggregates"
            eyebrow="SIGNER"
            tone="accent"
          >
            Issuer
          </DiagramNode>
          <span aria-hidden="true">+</span>
          <DiagramNode
            detail="consents to enrollment and rubric adoption"
            eyebrow="SIGNER"
            tone="safe"
          >
            Subject
          </DiagramNode>
        </div>
        <DiagramArrow label="co-sign" />
        <DiagramNode detail="profile binds organization + subject" eyebrow="ENROLL">
          ScoreProfile
        </DiagramNode>
        <DiagramArrow label="period" />
        <DiagramNode detail="final, monotonic, non-overlapping" eyebrow="ASSESS">
          Assessment #n
        </DiagramNode>
        <div className="growth-diagram__fork">
          <DiagramNode
            detail="subject commitment marks latest result"
            eyebrow="CHALLENGE"
            tone="warning"
          >
            Dispute
          </DiagramNode>
          <DiagramNode detail="new dual-signed record supersedes #n" eyebrow="RESOLVE" tone="safe">
            Correction #n+1
          </DiagramNode>
          <DiagramNode
            detail="revoked subject or retired organization"
            eyebrow="TERMINAL"
            tone="blocked"
          >
            Stop issuance
          </DiagramNode>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function GrowthDemoBoundaryDiagram() {
  return (
    <DiagramFrame
      description="The hosted surface is intentionally unable to touch a chain. Real instructions exist only in the separate loopback lab, where disposable signers and an isolated validator are started and stopped together."
      scrollable
      title="Two demos, two different guarantees"
    >
      <div
        aria-label="The owner-only hosted website contains a fixture explorer and in-memory simulator with no network path. A separate localhost website talks to a loopback-only bridge with in-memory signers, which submits real transactions to an isolated Solana validator containing the genesis-loaded test program. Devnet and mainnet are outside both demo paths and remain blocked."
        className="growth-diagram growth-diagram--boundaries"
        role="img"
      >
        <section>
          <p>HOSTED / OWNER-ONLY</p>
          <DiagramNode detail="synthetic records only" eyebrow="READ">
            Fixture explorer
          </DiagramNode>
          <DiagramArrow label="or" />
          <DiagramNode detail="browser memory · connect-src none" eyebrow="MODEL" tone="accent">
            Contract simulator
          </DiagramNode>
          <div className="growth-diagram__boundary-label">No RPC · no wallet · no signing</div>
        </section>
        <section>
          <p>LOCALHOST / REAL WRITES</p>
          <DiagramNode detail="rubric UI + account inspector" eyebrow="BROWSER" tone="accent">
            Localnet workbench
          </DiagramNode>
          <DiagramArrow label="127.0.0.1" />
          <DiagramNode detail="ephemeral keys · artifact checks" eyebrow="BRIDGE" tone="warning">
            Sign + verify
          </DiagramNode>
          <DiagramArrow label="RPC" />
          <DiagramNode
            detail="genesis-loaded test identity · disposable ledger"
            eyebrow="CHAIN"
            tone="safe"
          >
            Isolated validator
          </DiagramNode>
        </section>
        <div className="growth-diagram__blocked-band">
          <strong>DEVNET + MAINNET</strong>
          <span>no v2 deployment · no fallback · release gates remain closed</span>
        </div>
      </div>
    </DiagramFrame>
  )
}
