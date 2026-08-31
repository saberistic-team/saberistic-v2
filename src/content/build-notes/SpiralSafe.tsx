import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  SpiralDeploymentModesDiagram,
  SpiralMeteringDiagram,
  SpiralRepositoryMapDiagram,
  SpiralSigningCeremonyDiagram,
} from '@/components/build-notes/SpiralSafeDiagrams'

const commits = {
  dotGithub: '88cf033e00758fdb02c519aec0db7a3ca2e76545',
  extension: 'ef797388f9f38a9b5f2879ee62c74bf2714a886e',
  sdk: 'def536cdbef94b3456b89c1e824d131ef17d2bda',
  services: '34ff343bcb5a5f81ecceff7f8ed3102ead53645b',
  specs: '38e34313a3c8046ac567177a49fa79e95f5f8425',
  tokenList: '7bf90dcdb0baa9f75f9ecb89043738e4e022c14f',
  walletAdapter: '2922ba6ea1c0cbfabb5462253ffb982270862490',
  website: 'e6ce502aa29f5d0492809560351968c5e474dc22',
} as const

const repositories = {
  dotGithub: 'https://github.com/Spiral-Safe/.github',
  extension: 'https://github.com/Spiral-Safe/extension',
  sdk: 'https://github.com/Spiral-Safe/sdk',
  services: 'https://github.com/Spiral-Safe/services',
  specs: 'https://github.com/Spiral-Safe/specs',
  tokenList: 'https://github.com/Spiral-Safe/token-list',
  walletAdapter: 'https://github.com/Spiral-Safe/wallet-adapter',
  website: 'https://github.com/Spiral-Safe/website',
} as const

type RepositoryKey = keyof typeof repositories

const source = (repository: RepositoryKey, path: string, anchor = '') =>
  `${repositories[repository]}/blob/${commits[repository]}/${path}${anchor}`

const initialFaultLine = `browser extension prototype
├── generated its own Solana keypair
├── placed secretKey in localStorage
├── moved that key through extension messages
└── advertised wallet methods that were still stubs

Vault service prototype
├── created a server-side key behind a Vault plugin
├── used WebAuthn ceremonies to authorize signing
├── exposed the adapter with broad CORS and no client authorization
└── used one development root token between HTTP and Vault

finding
└── the browser and backend disagreed about who owned the key`

const integrationWaves = `2026-08-30 · core integration
├── extension       05e9b31  backend-mediated Wallet Standard provider
├── sdk             197ab53  authenticated chain-aware HTTP client
├── wallet-adapter  2922ba6  callable Wallet Standard feature routing
├── services        5c80fc5  hardened service, WebAuthn, Raft, Veil baseline
└── specs           bf7bb8b  architecture, runbook, security, verification

2026-08-31 · product and accounting layer
├── extension       ef79738  secure annotated extension demo
├── sdk             def536c  operation-bound completion contract
├── services        34ff343  accounts, billing consoles, recordings, Nitro admission
└── specs           38e3431  reconciled product and quorum documentation`

const custodyContract = `page context
├── may send: account name, chain, public payload bytes
├── may receive: WebAuthn options, address, signed result
└── must never receive: API token, Vault token, wallet private key

extension trusted worker
├── exact allowlisted origin + top-level frame
├── 2 MB request cap + correlated request ID
├── API token in chrome.storage.session
└── ceremony bound to tab, frame, origin, user, chain, operation

service + Vault plugin
├── derive tenant and scopes from authentication
├── bind payload to a random two-minute ceremony
├── require WebAuthn user verification
└── load the chain key inside the plugin only when signing`

const ceremonyContract = `registration
POST /init
→ navigator.credentials.create(options)
→ POST /create { ceremonyId, credential }

signing
POST /signin { chain, operation, payload }
→ navigator.credentials.get(options)
→ POST /complete { chain, operation, ceremonyId, credential }

server invariants
├── registration and signing states are distinct
├── ceremony IDs are random, expiring, and single-use
├── the requested operation must equal the stored operation
├── a nonzero signature-counter regression disables the credential
└── malformed completion consumes the ceremony before validation`

const credentialMap = `API key
└── account + tenant + scopes + username allowlist

WebAuthn assertion
└── one registration or signing ceremony

console session
└── developer or administrator web role + CSRF state

Vault token
└── service workload → Vault; never a browser/client input`

const chainInterface = `type ChainSigner interface {
  Generate() (privateKey []byte, address string, err error)
  Address(privateKey []byte) (string, error)
  Sign(privateKey, payload []byte, operation string) (SignResult, error)
}

solana
├── Ed25519 address
├── legacy transaction signing
└── raw message signing

ethereum
├── secp256k1 + EIP-55 address
└── EIP-191 personal-message signing only`

const usageContract = `request
├── authenticate one-time-reveal API key from stored HMAC digest
├── resolve account, tenant, scopes, users, plan, period
└── reserve active_wallet or transaction_signed usage

Vault fails
└── cancel a newly created reservation

Vault succeeds and stored operation matches
├── commit usage + durable outbox row in PostgreSQL
├── return signature or signed transaction
└── export stable event asynchronously to Metronome

provider boundary
└── Metronome ingest creates no charge until an externally verified
    customer/contract/rate-card → Stripe mapping exists`

const nitroGates = `one pinned source image
├── mode: bootstrap | join
├── pinned source revision + Veil revision
├── unique Raft node ID and advertised addresses
├── shared KMS auto-unseal identity
├── fresh admission window ≤ 30 minutes
└── verification must pass before enrollment hook

three still-missing production boundaries
├── private cross-host L4 routing
├── rollback-protected durable enclave storage
└── attestation-bound manifest, TLS, and KMS delivery

therefore
└── same-image simulation ≠ EIF ≠ live Nitro quorum`

const verificationCommands = `$ npm test                 # extension: 15 / 15
$ npm test                 # sdk: 6 / 6
$ npm test                 # wallet-adapter: 2 / 2
$ npm test                 # services: 45 pass + 1 PostgreSQL skip locally
$ npm run load:test        # harness: 9 / 9
$ npm run recording:test   # recorder: 8 / 8
$ go test ./...            # Vault/chain core: 10 / 10 in pinned Go image
$ go test ./...            # Nitro config renderer: 8 / 8 in pinned Go image
$ npm run build            # extension production bundle passed with warnings
$ npm run build:demo       # extension demo bundle passed with warnings

remote main pins
├── extension       ef797388f9f38a9b5f2879ee62c74bf2714a886e
├── sdk             def536cdbef94b3456b89c1e824d131ef17d2bda
├── services        34ff343bcb5a5f81ecceff7f8ed3102ead53645b
├── specs           38e34313a3c8046ac567177a49fa79e95f5f8425
└── four other repositories pinned in the evidence ledger below`

const repositoryTree = `Spiral-Safe/
├── extension/              # Manifest V3 provider and trusted worker
├── wallet-adapter/         # Wallet Standard registration and feature routing
├── sdk/                    # direct TypeScript HTTP client
├── services/
│   ├── backend.go          # Vault secrets-engine plugin
│   ├── signer.go           # Solana and Ethereum signer boundary
│   ├── src/                # HTTP adapter, consoles, billing runtime
│   ├── migrations/         # PostgreSQL account and usage schema
│   ├── load-test/          # guarded endpoint matrix
│   ├── recording/          # four annotated Playwright flows
│   ├── deploy/             # Kustomize local/production overlays
│   └── nitro/              # pinned Veil same-image admission scaffold
├── specs/docs/             # architecture, API, runbook, security, evidence
├── token-list/             # inherited data fork; outside runtime
├── website/                # legacy Hugo site; outside runtime
└── .github/                # organization profile; outside runtime`

const repositoryRows = [
  ['extension', 'Browser', 'Vault-backed Solana Wallet Standard provider', 'ef79738'],
  ['wallet-adapter', 'Package', 'Feature registration and routing; no credentials', '2922ba6'],
  ['sdk', 'Client', 'Typed bearer-authenticated service contract', 'def536c'],
  ['services', 'Core', 'Vault plugin, HTTP API, billing, deployment, demos', '34ff343'],
  ['specs', 'Evidence', 'Canonical architecture, security, runbook, verification', '38e3431'],
  ['token-list', 'Non-runtime', 'Inherited Jupiter data/tooling fork', '7bf90dc'],
  ['website', 'Non-runtime', 'Legacy Hugo marketing site', 'e6ce502'],
  ['.github', 'Non-runtime', 'Organization profile and license', '88cf033'],
] as const

const chainRows = [
  [
    'Solana',
    'Ed25519; base58 address',
    'Legacy transactions and raw messages',
    'Versioned transactions are rejected; trusted intent display is absent.',
  ],
  [
    'Ethereum',
    'secp256k1; EIP-55 address',
    'EIP-191 personal messages',
    'No transaction signing, EIP-712, EIP-155, nonce, fees, simulation, or broadcast.',
  ],
] as const

const evidenceRows = [
  [
    'Final public Git pins',
    'Eight remote main refs match the commits linked by this note.',
    'Code, tests, manifests, and documented boundaries exist at those exact revisions.',
  ],
  [
    'Fresh no-network rerun',
    '103 tests passed: extension 15, SDK 6, adapter 2, service 45, load 9, recorder 8, Vault/chain Go 10, and Nitro renderer 8; one database test skipped.',
    'Named client, service, harness, recorder, and Go behavior reproduced on one machine; no hosted CI claim.',
  ],
  [
    'Pinned verification record',
    'Full 46/46 service run with ephemeral PostgreSQL, Go plugin checks, rendered manifests, and provider-mocked billing tests are recorded.',
    'Committed session evidence; this site audit did not independently rerun PostgreSQL, Kubernetes, Stripe, or Metronome.',
  ],
  [
    'Fixture walkthrough run',
    'Four 1440×900 recordings, twenty annotated steps, and no recorder warnings.',
    'Product wiring and presentation with a virtual authenticator, fake wallet, fake credentials, and loopback services.',
  ],
  [
    'Live all-route fixture load',
    '260 requests across 26 method/path scenarios with zero unexpected statuses or client errors.',
    'Endpoint/control-plane smoke with negative signing paths—not successful-ceremony throughput or capacity.',
  ],
] as const

const productionGates = [
  [
    'Human authorization',
    'Software and virtual authenticators exercise the ceremony.',
    'Run physical Touch ID, Windows Hello, passkey, and security-key matrices across supported browsers.',
  ],
  [
    'Signing intent',
    'WebAuthn binds an opaque payload and operation.',
    'Decode, simulate, apply policy, and show a trusted human-readable recipient, amount, program, fee, and nonce.',
  ],
  [
    'Identity and recovery',
    'Password consoles, scoped keys, and account-local roles exist.',
    'Add OIDC/SSO, MFA, forced reset, credential recovery, delegated approvals, and centralized abuse controls.',
  ],
  [
    'Billing',
    'Stripe/Metronome adapters, webhooks, mapping gates, quotas, and outbox exist.',
    'Prove sandbox Checkout through invoice and collection, reconcile mappings, decide tax, and test provider failure.',
  ],
  [
    'Kubernetes and Vault',
    'Skaffold/Kustomize describe a three-node Raft baseline.',
    'Apply to a real cluster; test TLS, KMS, failover, backups, restore, upgrades, monitoring, and database HA.',
  ],
  [
    'Nitro quorum',
    'Pinned Veil image and strict bootstrap/join admission scaffold exist.',
    'Implement routing, durable anti-rollback storage, attestation-bound delivery, then run EIF/EC2/NSM and quorum tests.',
  ],
  [
    'Release assurance',
    'Local tests and dated dependency scans are recorded.',
    'Add core CI, SBOMs, provenance, signed releases, license review, penetration testing, and an external custody audit.',
  ],
] as const

const debugRows = [
  [
    'The key lived on both sides of the architecture',
    'The original extension generated a local key while the backend already owned a Vault key. Integration began by deleting that disagreement, not by polishing either UI.',
  ],
  [
    'Redirect following hid the load result',
    'Automatic redirects erased the status the endpoint matrix intended to inspect. The harness now preserves redirects and classifies exact expected outcomes.',
  ],
  [
    'Concurrent probes reused one-use ceremony state',
    'The load runner needed a fresh ceremony identifier per request because replay protection is part of the contract, not noise to disable for testing.',
  ],
  [
    'Correct CORS rejection looked like a failure',
    'A console login probe without the exact Origin correctly returned 403. The load expectation changed; the security boundary did not.',
  ],
  [
    'Completion lost the requested operation',
    'The SDK and service now carry transaction versus message through completion and compare it with Vault’s stored ceremony before returning output or committing usage.',
  ],
  [
    'A deterministic demo hid persuasive security moments',
    'Virtual WebAuthn removes operating-system UI, and the key form intentionally stops before secret reveal. Those are safer recordings, but they require explicit explanation.',
  ],
] as const

const recordings = [
  {
    description:
      'The actual unpacked Manifest V3 extension, Wallet Standard demo, trusted worker, browser WebAuthn calls, and deterministic fixture signing.',
    id: 'extension-demo',
    poster: '/media/build-notes/spiral-safe/extension-demo-poster.b5f6960e.png',
    source: '/media/build-notes/spiral-safe/extension-demo.13df0952.webm',
    steps: [
      'Configure the trusted worker with loopback-only fixture settings.',
      'Discover the extension through Wallet Standard.',
      'Register through navigator.credentials.create and a virtual authenticator.',
      'Authorize a deterministic message signature.',
      'Authorize a deterministic legacy Solana transaction signature.',
    ],
    title: 'Actual unpacked extension demo',
  },
  {
    description:
      'The real standalone page selects Ethereum, registers a fixture wallet, prepares an EIP-191 message, and returns a deterministic signature.',
    id: 'standalone-wallet',
    poster: '/media/build-notes/spiral-safe/standalone-wallet-poster.77908939.png',
    source: '/media/build-notes/spiral-safe/standalone-wallet.9a794fe6.webm',
    steps: [
      'Review the backend custody boundary.',
      'Select the Ethereum message-signing demonstration.',
      'Register the deterministic fixture wallet.',
      'Prepare a clearly synthetic message.',
      'Complete navigator.credentials.get and show the fixture signature.',
    ],
    title: 'Standalone wallet page',
  },
  {
    description:
      'The actual developer login and console routes show onboarding, masked key lifecycle, scoped-key creation fields, and seeded usage.',
    id: 'developer-dashboard',
    poster: '/media/build-notes/spiral-safe/developer-dashboard-poster.751ad2ef.png',
    source: '/media/build-notes/spiral-safe/developer-dashboard.7a063c1a.webm',
    steps: [
      'Sign in with a clearly fake fixture account.',
      'Review the seeded developer overview.',
      'Open scoped API-key management.',
      'Fill—but deliberately do not submit—the synthetic key form.',
      'Inspect active-wallet and transaction usage against fixture limits.',
    ],
    title: 'Developer dashboard',
  },
  {
    description:
      'The actual administrator routes show tenant selection, policy state, account usage, and outbox delivery state with synthetic records.',
    id: 'admin-dashboard',
    poster: '/media/build-notes/spiral-safe/admin-dashboard-poster.a94557dc.png',
    source: '/media/build-notes/spiral-safe/admin-dashboard.846c8e38.webm',
    steps: [
      'Sign in through the actual administrator route with fixture credentials.',
      'Review the synthetic system posture.',
      'Open the tenant directory.',
      'Inspect a clearly labeled seeded account.',
      'Review pending and delivered usage-outbox state.',
    ],
    title: 'Admin dashboard',
  },
] as const

export function SpiralSafeArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / THE PRODUCT</p>
        <h2>
          Authorize a remote wallet with a passkey—without putting its private key in the browser.
        </h2>
        <p className="article-lede">
          Spiral Safe is a development-stage, WebAuthn-authorized signing and account platform. A
          dApp can discover a Solana wallet, ask a browser authenticator to approve a bound signing
          ceremony, and receive signed bytes while the chain key remains behind a Vault plugin.
        </p>
        <p>
          The finished development pass spans eight repositories: the extension and Wallet Standard
          adapter, a direct SDK, the HTTP and Vault services, account and usage storage, developer
          and administrator consoles, deployment scaffolds, demos, and a canonical evidence map. It
          is a coherent prototype now. It is not an audited custody or billing product.
        </p>
        <ArticleCallout title="THE ONE-SENTENCE CONTRACT" tone="success">
          <p>
            Let an authenticated application request a chain-specific signature, require a
            user-verifying WebAuthn ceremony for the exact operation, and keep wallet-key bytes out
            of the page, extension, HTTP request, and account database.
          </p>
        </ArticleCallout>
        <p>
          “Keeps keys out of the browser” is narrower than “non-custodial.” The Vault plugin still
          loads private-key bytes in process memory to sign, and Vault operators remain part of the
          trusted computing base. This note uses the narrower claim throughout.
        </p>
      </section>

      <section id="archaeology">
        <p className="eyebrow">02 / THE ARCHAEOLOGY RUN</p>
        <h2>The first deliverable was a trustworthy map of what already existed.</h2>
        <p>
          I began by cloning every public repository in the Spiral Safe organization and retaining
          its independent Git history. The first pass built the extension, SDK, adapter, legacy Hugo
          site, and token-list tooling; started the Vault plugin, Express adapter, and browser demo;
          exercised a bounded <code>/check</code> probe; and documented the existing Nitro-oriented
          branch.
        </p>
        <p>
          That work mattered because the organization profile, website, issue roadmap, extension,
          and backend described overlapping versions of the product. The runtime was not one
          monorepo with one authoritative boundary. It was a set of experiments that had to be
          reconciled before new features could be trusted.
        </p>
        <CodeBlock
          code={integrationWaves}
          label="Two coordinated cross-repository delivery waves"
          language="text"
          sourceHref={`${repositories.specs}/commit/${commits.specs}`}
        />
        <p>
          The exact final main-branch heads were checked again for this article. The core
          repositories do not currently publish hosted CI workflows, so a public commit proves the
          source is present—not that every recorded command ran on GitHub infrastructure.
        </p>
      </section>

      <section id="fault-line">
        <p className="eyebrow">03 / THE FAULT LINE</p>
        <h2>The browser and backend disagreed about who owned the key.</h2>
        <p>
          The extension prototype generated a Solana key inside the browser, stored its secret in
          local storage, transported it through extension messages, and exposed methods that were
          not fully implemented. Separately, the service prototype already placed a key behind a
          Vault secrets-engine plugin and used WebAuthn, but its HTTP boundary had no application
          authorization and relied on a development root token.
        </p>
        <CodeBlock
          code={initialFaultLine}
          label="The two inherited custody stories"
          language="text"
          sourceHref={`${repositories.specs}/blob/${commits.specs}/docs/SECURITY.md`}
        />
        <p>
          This was not a one-function bug. Making the extension “work with the backend” meant
          replacing its custody model, completing Wallet Standard behavior, defining the browser
          bridge, authenticating the HTTP service, binding concurrent ceremonies, and preserving a
          chain-neutral seam inside the Vault plugin.
        </p>
        <ArticleCallout title="WHAT WAS REMOVED" tone="warning">
          <p>
            The current extension no longer generates, receives, stores, or transmits a wallet
            private key. That does not turn Vault storage into an HSM or remove trust in the service
            operator; it relocates custody to one explicit server boundary.
          </p>
        </ArticleCallout>
      </section>

      <section id="repository-map">
        <p className="eyebrow">04 / EIGHT REPOSITORIES</p>
        <h2>Four repositories contain current client or runtime code.</h2>
        <SpiralRepositoryMapDiagram />
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Repository</th>
                <th scope="col">Layer</th>
                <th scope="col">Role</th>
                <th scope="col">Pin</th>
              </tr>
            </thead>
            <tbody>
              {repositoryRows.map(([name, layer, role, pin]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td>{layer}</td>
                  <td>{role}</td>
                  <td>
                    <code>{pin}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          A request does not traverse all four. The browser path bundles the wallet adapter into the
          extension and calls the service; a direct SDK client calls the same service contract
          without the extension.
        </p>
        <p>
          The token list is an inherited Jupiter data fork and is not imported by the signer. The
          Hugo website is separate from both current demos. The organization profile contains
          aspirational production language. The specs repository is the canonical map, but two of
          its inventory sentences still describe the state immediately before the final pushes; this
          note therefore pins the final remote heads instead of repeating those stale counts.
        </p>
      </section>

      <section id="custody-boundary">
        <p className="eyebrow">05 / THE CUSTODY BOUNDARY</p>
        <h2>
          The page handles intent; the trusted worker handles credentials; Vault handles keys.
        </h2>
        <p>
          The injected provider runs in the page’s JavaScript world and speaks a versioned bridge to
          an isolated content script. The extension service worker then checks the browser-reported
          top-level tab, frame, and exact origin before it calls the service. Public configuration
          may return to the page, but the bearer token and ceremony bindings do not.
        </p>
        <CodeBlock
          code={custodyContract}
          label="Browser-to-Vault trust contract"
          language="text"
          sourceHref={source('extension', 'README.md', '#security-boundary')}
        />
        <p>
          The API token and non-secret pending ceremony state live in trusted-context-only browser
          session storage. That allows a Manifest V3 worker to suspend during a passkey prompt
          without writing those values to durable page-visible storage. Session storage reduces
          persistence; it is not a hardware secret store.
        </p>
        <p>
          Backend and RPC URLs are also reduced to their origins before page-facing inspection,
          because provider credentials are sometimes embedded in URL paths. The full endpoints
          remain available only to the worker that performs network requests.
        </p>
      </section>

      <section id="webauthn">
        <p className="eyebrow">06 / THE WEBAUTHN BRIDGE</p>
        <h2>Every signature is a two-part ceremony with server-owned continuity.</h2>
        <SpiralSigningCeremonyDiagram />
        <CodeBlock
          code={ceremonyContract}
          label="Registration and signing contract"
          language="text"
          sourceHref={source('services', 'backend.go')}
        />
        <p>
          The plugin generates a random, two-minute ceremony ID and stores the operation and payload
          behind it. Completion consumes that ID before it validates attacker-controlled credential
          data, preventing replay at the cost of making a malformed or cancelled completion
          non-retryable. Concurrent tabs receive independent ceremony state instead of racing one
          mutable user slot.
        </p>
        <p>
          User verification is required. A cryptographic software authenticator covers the complete
          server-side lifecycle, including replay, user-verification, ceremony-binding, and
          signature-counter regression cases. Physical Touch ID, Windows Hello, synchronized
          passkeys, roaming security keys, and a full browser matrix remain separate release gates.
        </p>
      </section>

      <section id="service-hardening">
        <p className="eyebrow">07 / SERVICE HARDENING</p>
        <h2>Four credentials now have four different jobs.</h2>
        <CodeBlock
          code={credentialMap}
          label="Do not collapse these credentials"
          language="text"
          sourceHref={source('services', 'docs/BILLING.md', '#trust-and-data-flow')}
        />
        <p>
          Production account mode authenticates a high-entropy API key, then derives the account,
          tenant, scopes, and non-empty username allowlist on the server. The caller cannot select
          another tenant in the request body. Unauthorized scope or username is rejected before
          Vault. Console sessions never act as wallet API bearer credentials, and Vault tokens are
          workload credentials rather than client input.
        </p>
        <p>
          The HTTP adapter now has exact CORS origins, identifier and base64 validation, a decoded
          payload limit, request IDs, stable error mappings, timeouts, security headers, and bounded
          process-local rate limiting. Kubernetes mode exchanges a service-account JWT for a
          short-lived, engine-scoped Vault token and refreshes it before lease expiry.
        </p>
        <ArticleCallout title="LOCAL MODE IS INTENTIONALLY UNSAFE" tone="warning">
          <p>
            Compose still uses Vault dev mode, a known root token, a known API token, fixture plans,
            and seeded console credentials on loopback. It is an onboarding and test environment,
            not a small production deployment.
          </p>
        </ArticleCallout>
      </section>

      <section id="chain-seam">
        <p className="eyebrow">08 / CHAIN-SPECIFIC SIGNING</p>
        <h2>A reusable ceremony does not make every chain operation safe by default.</h2>
        <p>
          The Go plugin now selects a <code>ChainSigner</code> for key generation, address
          derivation, and operation-specific signing. WebAuthn and storage code stay shared, while
          each chain owns its parser, signature encoding, and supported-operation boundary.
        </p>
        <CodeBlock
          code={chainInterface}
          label="Chain signer boundary, condensed"
          language="Go + text"
          sourceHref={source('services', 'signer.go', '#L23-L45')}
        />
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Chain</th>
                <th scope="col">Key / address</th>
                <th scope="col">Implemented</th>
                <th scope="col">Boundary</th>
              </tr>
            </thead>
            <tbody>
              {chainRows.map(([chain, key, implemented, boundary]) => (
                <tr key={chain}>
                  <th scope="row">{chain}</th>
                  <td>{key}</td>
                  <td>{implemented}</td>
                  <td>{boundary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          A panic boundary turns malformed Solana parser input into a normal signing error rather
          than losing the Vault plugin process. Ethereum proves the abstraction with one EIP-191
          message path. It does not establish “anychain” custody, Ethereum transaction support, or a
          generic safety policy for future chains.
        </p>
      </section>

      <section id="account-billing">
        <p className="eyebrow">09 / THE ACCOUNT AND BILLING LAYER</p>
        <h2>Reserve usage before custody work; export it after a trusted result.</h2>
        <p>
          PostgreSQL now owns accounts, plans, password-derived console users, keyed session-token
          hashes, scoped API-key hashes, quotas, usage reservations, committed usage, an outbox, and
          Stripe webhook claims. A newly created API key’s plaintext is revealed once; only its
          non-secret prefix, scope, user allowlist, and peppered digest persist.
        </p>
        <SpiralMeteringDiagram />
        <CodeBlock
          code={usageContract}
          label="Reserve, sign, commit, export"
          language="text"
          sourceHref={source('services', 'src/app.ts', '#L500-L628')}
        />
        <p>
          The first successful action for a wallet in a billing period commits one active-wallet
          unit. Only successful transaction completion commits a transaction unit; message
          signatures do not. Idempotency keys prevent duplicate accounting, and the service compares
          the requested completion operation with the value returned from Vault before exposing
          output or charging usage.
        </p>
        <p>
          Stripe Checkout and Customer Portal helpers, signature-verified webhooks, and asynchronous
          Metronome export are implemented. They have not produced a live invoice or collected a
          charge. Production also fails closed until an administrator attests the current
          Metronome-customer, contract/rate-card, and Stripe-customer mapping for each account.
        </p>
      </section>

      <section id="infrastructure">
        <p className="eyebrow">10 / THREE DEPLOYMENT STORIES</p>
        <h2>
          Runnable Compose, rendered Kubernetes, and Nitro admission are different evidence levels.
        </h2>
        <SpiralDeploymentModesDiagram />
        <p>
          The production Kustomize overlay describes two service replicas and three Vault
          StatefulSet members using Integrated Storage/Raft, retained data and audit volumes, TLS,
          anti-affinity, a disruption budget, Kubernetes authentication, restricted pod security,
          and NetworkPolicies. The production profile deletes the local browser client.
        </p>
        <p>
          PostgreSQL, KMS workload identity, ingress, public TLS, provider egress, StorageClass,
          recovery-key custody, snapshots, monitoring, and backup/restore remain operator inputs.
          The manifests were rendered during the development session; they were not applied to a
          real production cluster.
        </p>
        <ArticleCallout title="WHY NOT CONSUL?">
          <p>
            The design uses Vault Integrated Storage so Raft owns custody-state replication without
            adding Consul as a second distributed system. A new member must be authenticated and
            trusted because it receives replicated Vault data.
          </p>
        </ArticleCallout>
      </section>

      <section id="veil-nitro">
        <p className="eyebrow">11 / VEIL AND NITRO ENCLAVES</p>
        <h2>One image can describe bootstrap and join—but it still cannot form a real quorum.</h2>
        <p>
          The historical Nitriding build path was replaced with a pinned Veil revision. One
          Linux/amd64 image can render either a bootstrap or join configuration from a strict,
          short-lived manifest. The enrollment script verifies nonce-bound PCR, TLS-certificate,
          source, and image expectations before it may call an external enrollment hook, then checks
          that the candidate appears as the expected Raft voter with healthy Autopilot state.
        </p>
        <CodeBlock
          code={nitroGates}
          label="Same-image admission and its missing boundaries"
          language="text"
          sourceHref={source('services', 'nitro/README')}
        />
        <p>
          The local simulation proves that one source image can render distinct node identities and
          controlled <code>retry_join</code> configuration. The enrollment test uses mock verifier,
          hook, peer-list, and Autopilot responses. No EIF was created, no enclave ran on EC2, and
          no live PCR, NSM, KMS, storage, cross-host route, or quorum behavior was demonstrated.
        </p>
        <p>
          “Anyone can run a node” is incompatible with ordinary Vault Raft replication: membership
          grants a node custody-state access. A genuinely open operator network needs an explicit
          admission and governance protocol—and potentially threshold or MPC custody rather than a
          shared Vault database.
        </p>
      </section>

      <section id="recordings">
        <p className="eyebrow">12 / FOUR ANNOTATED WALKTHROUGHS</p>
        <h2>The videos show product wiring—not hardware, cloud, billing, or capacity proof.</h2>
        <p>
          One final Playwright run produced four separate 1440×900 recordings. Each one contains
          five highlighted steps, a title and explanation overlay, a machine-readable timeline, and
          a permanent <strong>FIXTURE MODE · SYNTHETIC LOCAL DATA</strong> badge. They exercise real
          product code around named substitutes.
        </p>
        <div className="spiral-recording-grid">
          {recordings.map((recording) => (
            <article className="spiral-recording" key={recording.id}>
              <figure className="article-video">
                <video
                  aria-describedby={`${recording.id}-caption ${recording.id}-transcript-summary`}
                  aria-label={`${recording.title} fixture walkthrough`}
                  controls
                  height={900}
                  playsInline
                  poster={recording.poster}
                  preload="none"
                  width={1440}
                >
                  <source src={recording.source} type="video/webm" />
                  <p>
                    Your browser cannot play this recording.{' '}
                    <a download href={recording.source}>
                      Download the WebM video
                    </a>
                    .
                  </p>
                </video>
                <figcaption id={`${recording.id}-caption`}>
                  <strong>{recording.title}</strong>
                  <span>
                    {recording.description}{' '}
                    <a download href={recording.source}>
                      Download the WebM
                    </a>
                    .
                  </span>
                </figcaption>
              </figure>
              <details className="article-details article-transcript">
                <summary id={`${recording.id}-transcript-summary`}>
                  Visual transcript for this silent fixture recording
                </summary>
                <div>
                  <p>There is no narration or audio track. The five visible chapters are:</p>
                  <ol>
                    {recording.steps.map((step, index) => (
                      <li key={step}>
                        <span className="article-transcript__index">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            </article>
          ))}
        </div>
        <ArticleCallout title="WHY THERE IS NO WEBAUTHN POPUP">
          <p>
            The extension and standalone recordings call the real{' '}
            <code>navigator.credentials.create()</code> and <code>get()</code> APIs, but Playwright
            supplies a CDP virtual authenticator with automatic approval and its UI disabled. The
            recorder captures the page viewport, not Chrome or operating-system dialogs. This
            validates ceremony wiring, not the physical passkey experience.
          </p>
        </ArticleCallout>
        <ArticleCallout title="WHY THERE IS NO API SECRET" tone="warning">
          <p>
            The developer flow fills a synthetic key name and scope, then stops before submission so
            a one-time secret cannot enter video, screenshots, or trace. The fixture sees a bearer
            header; it does not prove production API-key authentication. Local Compose uses a known
            development token; PostgreSQL account mode is the path that authenticates{' '}
            <code>ssk_live_…</code> keys.
          </p>
        </ArticleCallout>
      </section>

      <section id="load-testing">
        <p className="eyebrow">13 / LOAD AND ENDPOINT COVERAGE</p>
        <h2>
          The harness covers every route while refusing to masquerade as a capacity benchmark.
        </h2>
        <p>
          The guarded runner distinguishes safe probes from mutation scenarios, requires an explicit
          token, refuses remote targets and remote plaintext tokens without separate opt-ins,
          observes redirects instead of following them, and creates a unique ceremony ID for every
          request. Its parser and safety contract pass nine fresh tests at the pinned service
          commit.
        </p>
        <div className="article-metrics" aria-label="Spiral Safe load and recording evidence">
          <div>
            <strong>26</strong>
            <span>method/path scenarios</span>
          </div>
          <div>
            <strong>260</strong>
            <span>fixture requests</span>
          </div>
          <div>
            <strong>0</strong>
            <span>unexpected outcomes</span>
          </div>
          <div>
            <strong>9 / 9</strong>
            <span>harness contract tests</span>
          </div>
        </div>
        <p>
          The final session result was 260 requests across 26 method/path scenarios with zero
          unexpected statuses or client errors. Wallet mutation cases use successful{' '}
          <code>/init</code> plus expected negative or missing-user completion paths. The run does
          not measure successful WebAuthn-signing throughput, sustained capacity, multi-replica
          contention, soak behavior, or production latency.
        </p>
        <ArticleCallout title="SAFE CONCLUSION" tone="success">
          <p>
            Every current HTTP surface has a bounded expected-status probe. The result is useful
            control-plane smoke evidence; it is not a benchmark and does not establish how many real
            signing ceremonies the system can serve.
          </p>
        </ArticleCallout>
      </section>

      <section id="debugging">
        <p className="eyebrow">14 / WHAT BROKE</p>
        <h2>The difficult bugs lived at boundaries, not inside the happy-path signature.</h2>
        <div className="debug-list">
          {debugRows.map(([title, detail], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{title}</h3>
                <p>{detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="verification">
        <p className="eyebrow">15 / VERIFIED RESULT</p>
        <h2>
          The exact public pins reproduce the self-contained suites and keep external evidence
          labeled.
        </h2>
        <div className="article-metrics" aria-label="Fresh Spiral Safe repository verification">
          <div>
            <strong>15 / 15</strong>
            <span>extension tests</span>
          </div>
          <div>
            <strong>6 / 6</strong>
            <span>SDK tests</span>
          </div>
          <div>
            <strong>2 / 2</strong>
            <span>wallet-adapter tests</span>
          </div>
          <div>
            <strong>45 + 1</strong>
            <span>service pass + DB skip</span>
          </div>
        </div>
        <CodeBlock
          code={verificationCommands}
          label="Fresh site-audit commands and final remote pins"
          language="shell + text"
          sourceHref={`${repositories.specs}/blob/${commits.specs}/docs/VERIFICATION.md`}
        />
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Evidence class</th>
                <th scope="col">Observed result</th>
                <th scope="col">Safe conclusion</th>
              </tr>
            </thead>
            <tbody>
              {evidenceRows.map(([evidence, result, conclusion]) => (
                <tr key={evidence}>
                  <th scope="row">{evidence}</th>
                  <td>{result}</td>
                  <td>{conclusion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Across the current pinned suites, 103 tests passed and one PostgreSQL integration test
          skipped. The fresh service run intentionally had no <code>TEST_DATABASE_URL</code>, so 45
          service tests passed; the pinned verification record preserves the earlier full 46-test
          run against an ephemeral PostgreSQL database. Its SDK count of five predates the final
          operation-binding test; the final SDK pin now passes six.
        </p>
        <p>
          The extension production and demo bundles also build. Webpack reports non-blocking size
          warnings—462 KiB for the injected production bundle and 279 KiB for the demo bundle. That
          is a real performance debt, not a reason to hide a passing build behind a green checkmark.
        </p>
      </section>

      <section id="limits">
        <p className="eyebrow">16 / CURRENT TRUTH</p>
        <h2>The system is integrated and demonstrable. Production custody remains gated.</h2>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Gate</th>
                <th scope="col">Current evidence</th>
                <th scope="col">Required next proof</th>
              </tr>
            </thead>
            <tbody>
              {productionGates.map(([gate, current, required]) => (
                <tr key={gate}>
                  <th scope="row">{gate}</th>
                  <td>{current}</td>
                  <td>{required}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          WebAuthn currently approves an opaque challenge. There is no trusted transaction display,
          policy engine, wallet recovery, multi-credential management, or complete result-recovery
          protocol if a valid signature response is lost. A compromised allowlisted dApp can still
          choose confusing bytes for the user to approve.
        </p>
        <p>
          There has been no independent custody, billing, or security audit; no penetration test; no
          production PostgreSQL recovery drill; no live Stripe charge; no real Kubernetes apply; and
          no Nitro enclave quorum. Until those gates close, use disposable devnet keys and test
          messages only.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">17 / FILE GUIDE</p>
        <h2>
          The final system keeps custody, product, deployment, and evidence surfaces inspectable.
        </h2>
        <CodeBlock
          code={repositoryTree}
          label="Organization map"
          language="text"
          sourceHref={`${repositories.specs}/tree/${commits.specs}`}
        />
        <div className="reference-grid">
          <article>
            <p className="eyebrow">ARCHITECTURE</p>
            <h3>
              <a href={source('specs', 'docs/ARCHITECTURE.md')} rel="external">
                Trust boundaries and flows <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Browser, account, billing, Vault, Kubernetes, and Veil boundaries in one map.</p>
          </article>
          <article>
            <p className="eyebrow">EXTENSION</p>
            <h3>
              <a href={source('extension', 'README.md')} rel="external">
                Wallet Standard integration <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Trusted-worker design, unpacked demo, supported methods, and production notes.</p>
          </article>
          <article>
            <p className="eyebrow">ACCOUNTING</p>
            <h3>
              <a href={source('services', 'docs/BILLING.md')} rel="external">
                API keys, usage, and billing <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>PostgreSQL, quotas, idempotency, Checkout, webhooks, and outbox semantics.</p>
          </article>
          <article>
            <p className="eyebrow">NITRO</p>
            <h3>
              <a href={source('services', 'nitro/README')} rel="external">
                Veil admission boundary <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Same-image manifest, verification order, membership checks, and missing gates.</p>
          </article>
          <article>
            <p className="eyebrow">RECORDINGS</p>
            <h3>
              <a href={source('services', 'recording/README.md')} rel="external">
                Annotated walkthrough contract <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Four real product surfaces, deterministic substitutes, redaction, and timelines.</p>
          </article>
          <article>
            <p className="eyebrow">SECURITY</p>
            <h3>
              <a href={source('specs', 'docs/SECURITY.md')} rel="external">
                Release blockers <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Current controls, threat assumptions, residual risks, and production gates.</p>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">18 / WHAT IS NEXT</p>
        <h2>The next milestone should prove one real boundary at a time.</h2>
        <ol className="next-list">
          <li>
            <span>01</span>
            <p>
              Record a desktop-level physical-authenticator run against the real Vault backend,
              covering registration, message, legacy transaction, batch, send, and SIWS.
            </p>
          </li>
          <li>
            <span>02</span>
            <p>
              Decode and simulate supported transactions, bind a canonical human-readable intent to
              approval, and add a reviewed policy surface before any real asset.
            </p>
          </li>
          <li>
            <span>03</span>
            <p>
              Run a Stripe/Metronome sandbox account from Checkout through usage events, invoice,
              collection, reconciliation, refund, provider failure, and a deliberate tax decision.
            </p>
          </li>
          <li>
            <span>04</span>
            <p>
              Apply the Kubernetes baseline in a disposable cloud-real cluster and exercise KMS,
              Raft joins, failover, snapshots, restore, upgrades, database HA, and restrictive
              egress.
            </p>
          </li>
          <li>
            <span>05</span>
            <p>
              Keep the Nitro experiment blocked until private cross-host routing, rollback-protected
              durable storage, and attestation-bound runtime delivery exist—then test a real quorum.
            </p>
          </li>
        </ol>
      </section>

      <section id="sources">
        <p className="eyebrow">19 / EVIDENCE LEDGER</p>
        <h2>
          The article is pinned to final public source and labels session artifacts separately.
        </h2>
        <ul className="source-list">
          {(Object.keys(repositories) as RepositoryKey[]).map((repository) => (
            <li key={repository}>
              <a href={`${repositories[repository]}/commit/${commits[repository]}`} rel="external">
                {repositories[repository].replace('https://github.com/', '')}@
                {commits[repository].slice(0, 7)} <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
          <li>
            <a href="https://www.w3.org/TR/webauthn-3/" rel="external">
              W3C Web Authentication: Level 3 <span aria-hidden="true">↗</span>
            </a>
          </li>
          <li>
            <a
              href="https://developer.hashicorp.com/vault/docs/concepts/integrated-storage"
              rel="external"
            >
              HashiCorp Vault Integrated Storage <span aria-hidden="true">↗</span>
            </a>
          </li>
          <li>
            <a
              href="https://github.com/Amnesic-Systems/veil/tree/2b8c06ca651e09b21832f6fc4ae2605371386f76"
              rel="external"
            >
              Pinned Veil revision 2b8c06c <span aria-hidden="true">↗</span>
            </a>
          </li>
          <li>
            <a
              href="https://docs.aws.amazon.com/enclaves/latest/user/set-up-attestation.html"
              rel="external"
            >
              AWS Nitro Enclaves attestation guide <span aria-hidden="true">↗</span>
            </a>
          </li>
        </ul>
        <p className="article-source-note">
          The shared development conversation supplied chronology and the final local recording
          manifest. Repository claims were checked against the public pins above. The four embedded
          WebMs are ignored development-session artifacts published here with explicit fixture
          labeling; their recorder source, flow definitions, and boundaries are committed in{' '}
          <code>services</code>. No private conversation URL, credential, trace, or private model
          deliberation is published.
        </p>
      </section>
    </>
  )
}
