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
    <div className={`spiral-diagram__node spiral-diagram__node--${tone}`}>
      <span>{eyebrow}</span>
      <strong>{children}</strong>
      <small>{detail}</small>
    </div>
  )
}

function Arrow({ label = 'then' }: { label?: string }) {
  return (
    <span aria-hidden="true" className="spiral-diagram__arrow">
      <small>{label}</small>
      <b>→</b>
    </span>
  )
}

export function SpiralRepositoryMapDiagram() {
  return (
    <DiagramFrame
      description="Four repositories contain current client or runtime code. The browser path bundles the wallet adapter into the extension and reaches services; the SDK is an alternative direct client. Specs explains the system, while three other repositories sit outside the signing path."
      scrollable
      title="Eight repositories become one legible system"
    >
      <div
        aria-label="Spiral Safe repository map. In the browser path, the wallet-adapter package is bundled into the extension, which calls the services API and Vault plugin. The SDK is an alternative direct client of services. Specs documents the system. The dot-github profile, token list, and legacy website are outside the runtime."
        className="spiral-diagram spiral-diagram--repositories"
        role="img"
      >
        <section className="spiral-diagram__runtime">
          <p>RUNTIME REQUEST PATH</p>
          <Node detail="feature registration; owns no credentials" eyebrow="PACKAGE">
            wallet-adapter
          </Node>
          <Arrow label="bundled into" />
          <Node detail="provider + trusted worker" eyebrow="BROWSER" tone="accent">
            extension
          </Node>
          <Arrow label="calls" />
          <Node detail="HTTP adapter + Vault plugin + billing" eyebrow="CORE" tone="safe">
            services
          </Node>
        </section>
        <section className="spiral-diagram__alternatives">
          <p>ALTERNATIVE CLIENTS</p>
          <Node detail="typed client of the same services contract" eyebrow="DIRECT API">
            sdk
          </Node>
          <Node detail="standalone page lives inside services/public" eyebrow="DEMO">
            browser client
          </Node>
        </section>
        <section className="spiral-diagram__context">
          <p>SYSTEM CONTEXT</p>
          <Node
            detail="architecture, API, runbook, security, verification"
            eyebrow="CANONICAL MAP"
            tone="accent"
          >
            specs
          </Node>
          <Node
            detail="organization profile; aspirational claims need review"
            eyebrow="NON-RUNTIME"
            tone="warning"
          >
            .github
          </Node>
          <Node detail="inherited Jupiter data fork; not imported by signer" eyebrow="NON-RUNTIME">
            token-list
          </Node>
          <Node detail="legacy Hugo marketing site; separate from demos" eyebrow="NON-RUNTIME">
            website
          </Node>
        </section>
      </div>
    </DiagramFrame>
  )
}

export function SpiralSigningCeremonyDiagram() {
  return (
    <DiagramFrame
      description="The browser asks the backend to begin a ceremony, invokes WebAuthn locally, and returns the assertion under the original ceremony ID. The Vault plugin checks the stored operation before touching the chain key."
      scrollable
      title="A passkey authorizes a server-bound payload, not a browser key"
    >
      <div
        aria-label="Signing sequence. A dApp sends public transaction or message bytes to the extension provider. The extension worker asks the authenticated service to begin signing. The service asks the Vault plugin to bind the payload and operation to a one-time ceremony. The browser invokes a WebAuthn authenticator. The assertion returns through the extension and service. Vault consumes the ceremony, verifies the assertion and stored operation, then signs. Only the signature or signed bytes return."
        className="spiral-diagram spiral-diagram--ceremony"
        role="img"
      >
        <div className="spiral-diagram__sequence">
          <Node detail="public message or unsigned legacy transaction" eyebrow="01 / REQUEST">
            dApp + provider
          </Node>
          <Arrow label="tab/origin bound" />
          <Node
            detail="session token stays in the trusted worker"
            eyebrow="02 / AUTHORIZE"
            tone="accent"
          >
            extension worker
          </Node>
          <Arrow label="Bearer + JSON" />
          <Node detail="tenant, user, scope, quota, exact origin" eyebrow="03 / GATE">
            HTTP service
          </Node>
          <Arrow label="bind" />
          <Node
            detail="payload + operation + two-minute ceremony ID"
            eyebrow="04 / PREPARE"
            tone="safe"
          >
            Vault plugin
          </Node>
        </div>
        <div className="spiral-diagram__authenticator">
          <span aria-hidden="true">↕</span>
          <Node
            detail="navigator.credentials.get; user verification required"
            eyebrow="LOCAL APPROVAL"
            tone="warning"
          >
            WebAuthn authenticator
          </Node>
          <span aria-hidden="true">↕</span>
        </div>
        <div className="spiral-diagram__return">
          <Node
            detail="consume ID; reject replay or operation mismatch"
            eyebrow="05 / VERIFY"
            tone="safe"
          >
            Vault ceremony state
          </Node>
          <Arrow label="select signer" />
          <Node
            detail="Solana legacy tx/message or Ethereum EIP-191"
            eyebrow="06 / SIGN"
            tone="accent"
          >
            chain-specific key
          </Node>
          <Arrow label="public result" />
          <Node detail="private bytes never enter page, extension, or API" eyebrow="07 / RETURN">
            signature / signed tx
          </Node>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function SpiralMeteringDiagram() {
  return (
    <DiagramFrame
      description="Billing is deliberately wrapped around signing rather than inserted into the cryptographic path. A quota reservation happens first; successful work commits usage and an outbox row; provider delivery happens asynchronously."
      scrollable
      title="Usage accounting fails closed before custody work"
    >
      <div
        aria-label="Billing sequence. An API-key request resolves an account and reserves either active-wallet or transaction usage in PostgreSQL. Rejected subscription, quota, or mapping state stops before Vault. Accepted work reaches Vault. A Vault failure cancels a new reservation. A successful operation commits usage and a durable outbox row in one database statement, returns the result, and later exports stable events through Metronome toward Stripe invoicing."
        className="spiral-diagram spiral-diagram--metering"
        role="img"
      >
        <div className="spiral-diagram__sequence">
          <Node
            detail="account, tenant, scopes, username allowlist"
            eyebrow="01 / RESOLVE"
            tone="accent"
          >
            scoped API key
          </Node>
          <Arrow label="reserve" />
          <Node detail="period + quota + idempotency in PostgreSQL" eyebrow="02 / ACCOUNT">
            usage reservation
          </Node>
          <Arrow label="if accepted" />
          <Node detail="WebAuthn verification and chain signing" eyebrow="03 / CUSTODY" tone="safe">
            Vault operation
          </Node>
          <Arrow label="commit" />
          <Node detail="usage + outbox are durable together" eyebrow="04 / RECORD" tone="accent">
            PostgreSQL
          </Node>
          <Arrow label="async" />
          <Node
            detail="Metronome rating; Stripe collection after mapping"
            eyebrow="05 / EXPORT"
            tone="warning"
          >
            provider pipeline
          </Node>
        </div>
        <div className="spiral-diagram__decision-band">
          <section>
            <strong>REJECT BEFORE VAULT</strong>
            <span>
              Inactive plan, exhausted quota, or unverified provider mapping returns 402/429.
            </span>
          </section>
          <section>
            <strong>VAULT FAILURE</strong>
            <span>A newly created reservation is cancelled; no usage is committed.</span>
          </section>
          <section>
            <strong>COMMIT AMBIGUITY</strong>
            <span>
              The signature is withheld and the reservation remains; stale state underbills rather
              than inventing a charge.
            </span>
          </section>
        </div>
      </div>
    </DiagramFrame>
  )
}

export function SpiralDeploymentModesDiagram() {
  return (
    <DiagramFrame
      description="The repository contains three distinct deployment stories. Compose is disposable onboarding, Kubernetes is a rendered production baseline, and the Veil path is a fail-closed admission scaffold whose three missing infrastructure boundaries prevent a live Nitro quorum."
      scrollable
      title="Do not collapse three deployment modes into one claim"
    >
      <div
        aria-label="Three Spiral Safe deployment modes. Local Compose runs one Vault dev server, one API, and one browser demo with known credentials. Kubernetes describes two API replicas and three Vault Raft members with external PostgreSQL, KMS, TLS, Stripe, and Metronome inputs, but has not been applied to a real cluster. The Veil and Nitro same-image scaffold verifies candidate identity before membership, but lacks cross-host private routing, rollback-protected durable storage, and attestation-bound secret delivery, so no live enclave quorum exists."
        className="spiral-diagram spiral-diagram--deployments"
        role="img"
      >
        <section>
          <p>DISPOSABLE LOCAL</p>
          <Node detail="one dev Vault · one API · one demo" eyebrow="COMPOSE" tone="safe">
            Runnable fixture
          </Node>
          <span>Known root/API credentials, loopback ports, in-memory or demo state.</span>
        </section>
        <section>
          <p>PRODUCTION-INTENT</p>
          <Node
            detail="two APIs · three Vault Raft pods · retained PVCs"
            eyebrow="KUBERNETES"
            tone="accent"
          >
            Rendered baseline
          </Node>
          <span>Needs real TLS, KMS, database, egress, backups, recovery, and apply evidence.</span>
        </section>
        <section>
          <p>HARDWARE EXPERIMENT</p>
          <Node
            detail="one pinned image; bootstrap or join manifest"
            eyebrow="VEIL + NITRO"
            tone="warning"
          >
            Admission scaffold
          </Node>
          <span>
            Not a live quorum: routing, durable storage, and attestation-bound delivery are absent.
          </span>
        </section>
        <div className="spiral-diagram__blocked-band">
          <strong>CONTROLLED MEMBERSHIP, NOT PERMISSIONLESS NODES</strong>
          <span>
            A Vault Raft member receives replicated custody state. Independent operators require an
            authenticated admission, certificate, attestation, governance, and removal protocol.
          </span>
        </div>
      </div>
    </DiagramFrame>
  )
}
