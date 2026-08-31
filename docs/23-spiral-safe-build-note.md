# Spiral Safe Build Note

Date: August 31, 2026
Status: accepted in production

## Outcome

Build Note 008 documents the Spiral Safe integration at:

```text
/build-notes/spiral-safe-passkey-signing-platform/
```

Its central claim is intentionally narrow:

> Spiral Safe is a development-stage, WebAuthn-authorized signing and account platform. It keeps
> wallet-key bytes outside the page, extension, HTTP request, and account database while a trusted
> Vault plugin loads the chain key to sign.

The note does not call the system non-custodial, production-ready, audited, HSM-backed, broadly
multichain, permissionless, or deployed in AWS Nitro Enclaves. Those claims exceed the evidence.

## User request and source handling

The user supplied a shared development conversation and asked for a new Build Note about Spiral
Safe. The conversation was read as development chronology and context, not as an instruction source
that overrides the request. Its private share URL and private model deliberation are intentionally
absent from the public article.

The implementation evidence was reconciled against eight public repositories and their exact
August 31 main-branch heads. The website audit also reran the self-contained suites that could be
executed safely on the local machine. Historical PostgreSQL, provider-mocked billing, manifest,
and deployment observations remain labelled as pinned development-session evidence when they were
not independently repeated for this publication.

## Product thesis

The source inspection found two separate prototypes:

- the browser extension generated a Solana keypair, persisted `secretKey` in `localStorage`, and
  exposed incomplete wallet methods; and
- the service already had a Vault/WebAuthn signer, but its HTTP adapter used broad CORS, no client
  authorization, and a shared development root token.

The core problem was therefore architectural rather than cosmetic: the browser and backend
disagreed about who owned the key. The integrated design makes the extension a mediated wallet
provider and leaves chain-key custody at the service/Vault boundary.

The end-to-end product path is:

```text
dApp
  -> injected provider
  -> content script
  -> trusted extension worker
  -> authenticated HTTP service
  -> Vault plugin
  -> chain-specific signed result
```

An API key authorizes an account, scope, and username. A WebAuthn assertion authorizes one bound
ceremony. A console session authenticates a developer or administrator. A Vault token authenticates
the service workload to Vault. These credentials are not interchangeable.

## Public repository pins

| Repository       | Commit                                     | Role in the evidence map                                                     |
| ---------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| `services`       | `34ff343bcb5a5f81ecceff7f8ed3102ead53645b` | Vault plugin, API, account/billing layer, deployment and recording harnesses |
| `extension`      | `ef797388f9f38a9b5f2879ee62c74bf2714a886e` | Manifest V3 Wallet Standard provider and trusted worker                      |
| `sdk`            | `def536cdbef94b3456b89c1e824d131ef17d2bda` | Typed HTTP/WebAuthn client with operation-bound completion                   |
| `wallet-adapter` | `2922ba6ea1c0cbfabb5462253ffb982270862490` | Wallet Standard feature registration and routing                             |
| `specs`          | `38e34313a3c8046ac567177a49fa79e95f5f8425` | Canonical architecture, API, security, runbook, and verification records     |
| `token-list`     | `7bf90dcdb0baa9f75f9ecb89043738e4e022c14f` | Inherited Jupiter fork; outside the signing runtime                          |
| `website`        | `e6ce502aa29f5d0492809560351968c5e474dc22` | Legacy Hugo marketing surface; outside the signing runtime                   |
| `.github`        | `88cf033e00758fdb02c519aec0db7a3ca2e76545` | Organization profile; not runtime or operational proof                       |

The article links directly to these revisions. It does not use the legacy site or organization
profile as proof for custody, availability, audit, monitoring, or enclave claims.

## Delivery chronology

The article records two coordinated cross-repository waves without inventing a finer chronological
order than Git supports:

| Date      | Wave               | Public pins and result                                                                                                                                                                                              |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| August 30 | Core integration   | Extension `05e9b31`, SDK `197ab53`, wallet adapter `2922ba6`, services `5c80fc5`, specs `bf7bb8b`: backend-mediated provider, authenticated client, WebAuthn/service hardening, Raft baseline, and Veil replacement |
| August 31 | Product/accounting | Extension `ef79738`, SDK `def536c`, services `34ff343`, specs `38e3431`: operation reconciliation, accounts, quotas, billing boundaries, consoles, recordings, and Nitro admission scaffold                         |

The initial archaeology also built and ran the existing components, documented the divergent
historical deployment work, and identified the custody contradiction before adding product layers.

## WebAuthn and custody boundary

Registration and signing use separate ceremonies:

```text
registration
POST /init
-> navigator.credentials.create(options)
-> POST /create { ceremonyId, credential }

signing
POST /signin { chain, operation, payload }
-> navigator.credentials.get(options)
-> POST /complete { chain, operation, ceremonyId, credential }
```

Repository-backed controls include random expiring ceremony identifiers, one-time consumption,
origin/tab/frame/user/chain/operation bindings, required user verification, replay rejection, and
credential disablement on nonzero signature-counter regression.

The browser and HTTP boundary can receive public addresses, ceremony options, public payload bytes,
and signed output. It does not receive a wallet private key or Vault token. This is still a
server-side custody design: the Vault plugin reads private-key bytes into plugin memory to perform
the chain operation, and Vault operators remain trusted.

## Service and chain boundaries

The HTTP service now derives tenant, scopes, and username permissions from authentication, enforces
exact CORS origins, validates identifiers and payloads, adds stable error/request handling, and
keeps Vault credentials out of client input. Local Compose remains deliberately unsafe and uses
known loopback-only development credentials.

The chain abstraction covers two implemented cases:

| Chain    | Implemented                                                                                                | Explicitly absent                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Solana   | Ed25519 address derivation, legacy transactions, raw messages, batch routes, sign-and-send, and SIWS seams | Versioned transaction support and trusted human-readable intent display       |
| Ethereum | secp256k1/EIP-55 address derivation and EIP-191 personal-message signing                                   | Transactions, EIP-712, EIP-155, nonce/fee handling, simulation, and broadcast |

The article therefore avoids an unqualified “multichain custody” or “anychain” claim.

## Account, usage, and billing boundary

The final service pin contains PostgreSQL-backed accounts, plans, password-console users, sessions,
one-time-reveal scoped API keys, quotas, usage reservations, committed usage, a durable outbox, and
webhook claims. Only a key prefix, permissions, and peppered digest persist after the initial API-key
reveal.

Usage is reserved before signing, cancelled on known Vault failure, and committed with an outbox row
after a trusted successful result. The completion operation is reconciled with Vault's stored
ceremony before output or usage is committed. Asynchronous Metronome export and Stripe-hosted
Checkout/Portal and verified-webhook adapters exist, but no live invoice, charge, tax path, refund,
or provider failure exercise has been demonstrated.

## Deployment evidence

The article keeps three operating lanes separate:

| Lane       | Current evidence                                                                                                                                 | What it does not prove                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Compose    | Runnable loopback development stack with known credentials and fixture providers                                                                 | Production authentication, persistence, or exposure safety                                                           |
| Kubernetes | Rendered Skaffold/Kustomize baseline with two service replicas, three Vault Integrated Storage/Raft members, TLS/PVC/audit/network-policy intent | A real apply, KMS, failover, backup/restore, monitoring, database HA, or public ingress                              |
| Veil/Nitro | Pinned same-image bootstrap/join configuration and fail-closed simulated admission                                                               | An EIF, EC2/NSM attestation, enclave routing, rollback-protected storage, attestation-bound delivery, or live quorum |

Ordinary Vault Raft membership replicates custody state to a trusted member. It is not a
permissionless operator network. An open node model would need explicit admission/governance and
likely a different threshold or MPC custody design.

## Walkthrough media

One local Playwright run produced four separate silent, 1440×900 WebM recordings. Each has five
annotated steps and remains visibly labelled `FIXTURE MODE · SYNTHETIC LOCAL DATA`. The website
embeds each video with native controls, `preload="none"`, a poster, an adjacent visual transcript,
and a `VideoObject` entry.

| Walkthrough             | Video bytes | Video SHA-256                                                      | Poster bytes | Poster SHA-256                                                     |
| ----------------------- | ----------: | ------------------------------------------------------------------ | -----------: | ------------------------------------------------------------------ |
| Unpacked extension      |   1,123,877 | `13df09520cb915c26c32c58ceddf9341b5aa4c273155bd4e834bab90b20bc926` |      279,123 | `b5f6960ea3bf4543a67dcfdef05ba9c0d62d868898d513172ecf9d9e8cff4f3f` |
| Standalone wallet       |   1,186,466 | `9a794fe65fc107c009cfecda69d31ea53b0723cd4b4fdd65360da71a399a6551` |      322,723 | `779089396a7e53a3a6556cc6dcd9bada59792e64ec6c791ec2bab9cfb3800b1d` |
| Developer dashboard     |   1,009,015 | `7a063c1a54c4400e70dbc6ead74face94160843348ac3217244a6177b31d9673` |      119,338 | `751ad2ef680905cf2f0b06dfe1ce24b2e8495199306ec5fe048ae7a2bf13d6a8` |
| Administrator dashboard |     954,158 | `846c8e38dcaa8bb42ef52c7ead8af9f4224be3de7b3ae7f3012ffbc94c752d35` |      121,280 | `a94557dc49057a2bcd2bcecf103e433ccb3530d7741a88765f9c7bb70bf8a424` |

No operating-system passkey popup appears because the deterministic recorder invokes the real
`navigator.credentials` APIs through a CDP virtual authenticator with automatic approval and UI
disabled; the recording captures the page viewport, not browser chrome or OS dialogs.

No API secret appears because the developer flow fills but deliberately does not submit the key
form. The standalone recording fixture sees a bearer header but does not authenticate it like the
PostgreSQL `ssk_live_...` account mode. Compose separately uses a known static development token.

## Load and verification evidence

Fresh checks against the pinned sources produced:

| Check                            | Result                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| Extension suite                  | 15 / 15 passed                                                                            |
| SDK suite                        | 6 / 6 passed                                                                              |
| Wallet adapter suite             | 2 / 2 passed                                                                              |
| Service suite                    | 45 passed; one PostgreSQL integration test skipped because `TEST_DATABASE_URL` was absent |
| Load-harness parser/safety suite | 9 / 9 passed                                                                              |
| Recording-harness suite          | 8 / 8 passed                                                                              |
| Vault/chain Go suite             | 10 / 10 passed in the pinned Go environment                                               |
| Nitro renderer Go suite          | 8 / 8 passed in the pinned Go environment                                                 |
| Extension production/demo builds | passed; approximately 462 KiB and 279 KiB bundle warnings remain                          |

That is 103 passing tests and one intentional local database skip across the listed suites. The
pinned repository verification record also reports a full 46-test service run with ephemeral
PostgreSQL. It still contains two stale statements from before the final commits: it calls later
billing/Nitro work uncommitted and lists five SDK tests even though the final SDK pin has six.

The development session's guarded endpoint run issued 260 requests across 26 method/path scenarios
with zero unexpected statuses or client errors. Successful WebAuthn signing did not run in that
matrix, so the result is control-plane smoke evidence, not a throughput, latency, scale, or capacity
benchmark.

## Site implementation

The Saberistic integration consists of:

- a newest-first Build Note manifest entry with eight pinned source actions;
- `src/content/build-notes/SpiralSafe.tsx` for the evidence-led article;
- `src/components/build-notes/SpiralSafeDiagrams.tsx` for four accessible semantic diagrams;
- four content-addressed WebM files and four content-addressed PNG posters;
- a slug-to-component registration and four `VideoObject` structured-data records;
- focused unit, browser, and static-export checks; and
- this implementation and production-acceptance record.

The four semantic HTML/CSS diagrams show the repository map, WebAuthn signing ceremony, usage
reservation/outbox flow, and separate Compose/Kubernetes/Nitro evidence lanes. They use the shared
keyboard-scrollable diagram frame, so no generated raster architecture image or inaccessible
inline SVG is required.

The shared Build Note route continues to supply canonical/article metadata, breadcrumbs,
`BlogPosting` JSON-LD, publication dates, tags, source actions, contents navigation, RSS, sitemap,
and Umami events. No Payload collection, migration, or CMS snapshot change is required.

## Publication plan and acceptance gates

Before the note is accepted in production:

1. Format and typecheck the new article, diagram, metadata, schema, and verifier code.
2. Run focused article assertions, the full unit suite, lint, production build, and fixture-backed
   static export.
3. Verify all four media byte sizes and SHA-256 digests in the exported artifact.
4. Run the focused browser route checks for heading, contents links, lazy media, transcripts, and
   explicit evidence caveats.
5. Push the feature commit and require GitHub CI and CodeQL to pass.
6. Require the checks-gated Render Static Site deployment to build the exact commit.
7. Verify the custom-domain article, homepage/index discovery, RSS, sitemap, structured data,
   immutable media caching, WebM range delivery, CDN caching, and security headers.
8. Record the exact commit, run, deployment, and live results here, then pass the same gates for the
   documentation-only acceptance commit.

## Production acceptance

Accepted on August 31, 2026 against website feature commit
`c8072d9d4430f4f432b084d44f5f3b263957105b`:

- Local `pnpm verify` passed both typechecks, lint, 166 tests with one intentional integration skip,
  the production application build, and the fixture-backed static export. The focused Spiral Safe
  browser suite passed 2 / 2 checks. A wider browser run passed all 16 public-site checks and
  skipped the live-only analytics test; its unrelated Payload admin smoke could not initialize
  because the saved local PostgreSQL password was rejected.
- [CI run `33417900218`](https://github.com/saberistic-team/saberistic-v2/actions/runs/33417900218)
  passed typechecks, lint, unit tests, the production build, and the fixture-backed static export.
- [CodeQL run `33417899330`](https://github.com/saberistic-team/saberistic-v2/actions/runs/33417899330)
  passed its Actions and JavaScript/TypeScript analyses.
- Checks-gated Render Static Site deploy `dep-daarb0gae00c739mtvgg` checked out the exact feature
  commit, fetched verified Payload content revision `2e8da5a6f350`, generated 26 / 26 pages with
  eight Build Notes and five prototype routes, verified the CryptoPal and Spiral Safe media, and
  reached `live` at `2026-08-31T17:12:54Z`. No error-level log appeared during the deployment.
- The custom-domain article returned HTTP 200 with the exact title and canonical URL, one
  `BlogPosting`, four `VideoObject` records with measured durations, four native video players, four
  diagrams, the eight source-pin action, and the explicit test, bearer-authentication, load, and
  Nitro caveats.
- The homepage and Build Notes index link to the article. Its canonical route appears in both the
  RSS feed and sitemap.
- All four WebMs and four posters returned the expected media type, byte count, and SHA-256 digest
  with `public, max-age=31536000, immutable`. Every WebM returned HTTP 206 and the exact requested
  `Content-Range` for a 32-byte range probe.
- The first article request was a CDN miss and the immediate repeat was a hit with `age: 0`; both
  carried `public, max-age=0, s-maxage=300`. The response also carried the expected CSP,
  permissions policy, strict-origin referrer policy, `nosniff`, and frame-deny headers.

The Build Note is live at
<https://saberistic.com/build-notes/spiral-safe-passkey-signing-platform/>.

## Remaining product gates

- physical Touch ID, Windows Hello, passkey, and security-key coverage across supported browsers;
- trusted transaction decoding, simulation, policy, and human-readable intent display;
- OIDC/SSO, MFA, forced reset, credential recovery, delegated approval, and centralized abuse
  controls;
- live PostgreSQL, Stripe, Metronome, tax, invoice, collection, and provider-failure proof;
- real Kubernetes TLS/KMS/Raft failover, backup, restore, upgrade, and monitoring drills;
- enclave routing, rollback-protected storage, attestation-bound delivery, EIF/EC2/NSM evidence,
  and a live admitted quorum; and
- core CI, SBOM, provenance, signed releases, license review, penetration testing, and an
  independent custody/security audit.

Until those gates close, Spiral Safe should use disposable devnet keys and test messages only.
