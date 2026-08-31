import Image from 'next/image'

import cryptopalLocalDemo from '@/assets/cryptopal-local-demo.webp'
import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  CryptoPalArchitectureDiagram,
  CryptoPalPrivacyDiagram,
  CryptoPalProtocolDiagram,
  CryptoPalStateDiagram,
} from '@/components/build-notes/CryptoPalDiagrams'

const commit = '55f7f00e55c6e915f7ad85c5669eb7c01fe020c5'
const repository = 'https://github.com/saberistic-team/cryptopal'
const source = (path: string, anchor = '') => `${repository}/blob/${commit}/${path}${anchor}`

const continuationUrl = 'https://chatgpt.com/s/cx_6a94d75c52d88191aaf7d3acdd8d44e0'
const recordingPath = '/media/build-notes/cryptopal/cryptopal-private-transfer.cafb08d2.mp4'
const recordingPosterPath =
  '/media/build-notes/cryptopal/cryptopal-private-transfer-poster.b9a20494.webp'

const specCommit = 'de7c055e459167f66f39d56e4feceaa92caf12aa'
const specRepository = 'https://github.com/saberistic/cryptopal-spec'
const specSource = (path: string, anchor = '') =>
  `${specRepository}/blob/${specCommit}/${path}${anchor}`

const turboPassCommit = 'f18da5682c80fb1afe08348187e4c2f39bd4714a'
const turboPassRepository = 'https://github.com/saberistic-team/turbopass'
const turboPassSource = (path: string, anchor = '') =>
  `${turboPassRepository}/blob/${turboPassCommit}/${path}${anchor}`

const originalOverview = `@startuml Overview
actor Sender
entity Chain
collections Cryptopals
actor Receiver

Sender -> Cryptopals: request a deposit with receipts
Cryptopals -> Sender: return deposit ID and chain address
Sender -> Chain: transfer assets and include deposit ID
Cryptopals -> Chain: listen and mark transaction ready
Sender -> Cryptopals: check whether deposit is ready

group Zero-knowledge decoupling: sender wallet ↛ receiver email
  Sender -> Cryptopals: send blinded tokens
  Cryptopals -> Sender: return signed transfer tokens
  Sender -> Cryptopals: transfer slips + receiver email
end

Cryptopals -> Cryptopals: increase receiver balance
Receiver -> Cryptopals: check available balance by email

group Zero-knowledge decoupling: receiver email ↛ receiver wallet
  Receiver -> Cryptopals: send address-transfer envelopes
  Cryptopals -> Receiver: return redemption coupons
  Receiver -> Cryptopals: redeem coupons to receiver wallet
end

Cryptopals -> Chain: send tokens to receiver wallet
@enduml`

const originalComponents = `@startuml
[HTTP API] as api
[Processor] as processor
[Chain Vault] as vault
[ZKP microservice] as zkp

api --> processor : registers requests
processor --> vault : manages wallets
processor --> zkp : processes tokens
@enduml`

const canonicalBindings = `export function depositMemo(depositId: string): string {
  return \`cryptopal:deposit:v1:\${depositId}\`;
}

export function slipPayload(transferId: string, emailHash: string): string {
  return \`cryptopal:slip:v1:\${transferId}:\${emailHash}\`;
}

export function couponPayload(
  genesisHash: string,
  mint: string,
  amountBaseUnits: bigint,
  wallet: string,
): string {
  return \`cryptopal:coupon:v1:solana-local:\${genesisHash}:\${mint}:\${amountBaseUnits}:\${wallet}\`;
}`

const depositTransaction = `const transfer = createTransferCheckedInstruction(
  source,
  mint,
  destination,
  wallet,
  BigInt(config.asset.denominationBaseUnits),
  config.asset.decimals,
  [],
  TOKEN_PROGRAM_ID,
);

const memo = new TransactionInstruction({
  keys: [],
  programId: memoProgramId,
  data: Buffer.from(new TextEncoder().encode(deposit.memo)),
});

const transaction = new Transaction({
  blockhash: latest.blockhash,
  feePayer: wallet,
  lastValidBlockHeight: latest.lastValidBlockHeight,
}).add(transfer, memo);`

const verifyAndUnblind = `export async function verifyAndUnblind(
  seed: Uint8Array,
  expectedBlindedToken: string,
  issuance: Issuance,
  pinnedPublicKey: string,
): Promise<string> {
  if (issuance.publicKey !== pinnedPublicKey) {
    throw new Error("The issuer key changed unexpectedly.");
  }

  const prepared = prepareTokenBatch(seed, 1);
  try {
    if (prepared.blindedTokens[0] !== expectedBlindedToken) {
      throw new Error("Saved preparation data does not match this issuance.");
    }
    return prepared.finalizeIssuance(
      issuance.signedTokens,
      issuance.publicKey,
      issuance.batchProof,
      pinnedPublicKey,
    )[0];
  } finally {
    prepared.free();
  }
}`

const claimCapability = `private deterministicClaimSecret(transferId: string, genesisHash: string): string {
  return createHmac("sha256", this.claimSecretKey)
    .update("cryptopal:claim-secret:v1\\0")
    .update(genesisHash)
    .update("\\0")
    .update(transferId)
    .digest("base64url");
}

private claimUrl(secret: string): string {
  return \`\${publicWebUrl}/#/claim/\${encodeURIComponent(secret)}\`;
}`

const couponRedemption = `const payload = couponPayload(
  binding.vault.genesisHash,
  binding.vault.mint,
  denominationBaseUnits,
  wallet,
);

let payout = await repository.createOrGetPayout({
  id: uuid(),
  tokenHash: sha256Hex(preimageBytes),
  wallet,
  couponPayload: payload,
});

await turboPass.redeem(
  binding.couponIssuerName,
  payload,
  preimage,
  signature,
);`

const payoutReservation = `INSERT INTO cryptopal_payouts
  (id, token_hash, wallet, coupon_payload, status)
VALUES ($1, $2, $3, $4, 'REDEEMING')
ON CONFLICT (token_hash) DO NOTHING;

SELECT ...
FROM cryptopal_payouts
WHERE token_hash = $1
FOR UPDATE;

-- A replay may reuse the exact same payout only.
if (row.wallet !== input.wallet || row.coupon_payload !== input.couponPayload) {
  throw conflict("COUPON_ALREADY_REDEEMED", "coupon is bound to another payout");
}`

const chainAdapter = `export interface SolanaVaultService {
  readonly memoProgramId: string;
  bootstrap(): Promise<VaultBootstrap>;
  currentGenesisHash(): Promise<string>;
  health(): Promise<void>;
  faucet(wallet: string): Promise<FaucetResult>;
  verifyDeposit(input: {
    signature: string;
    expectedMemo: string;
    expectedMint: string;
    expectedPoolTokenAccount: string;
    expectedAmountBaseUnits: bigint;
    expectedDecimals: number;
  }): Promise<DepositVerification>;
  preparePayout(wallet: string): Promise<PreparedPayout>;
  submitPreparedPayout(
    prepared: PreparedPayout,
  ): Promise<"CONFIRMED" | "PENDING" | "EXPIRED">;
}`

const localStack = `git submodule update --init --recursive
docker compose up --build

# Browser UI       http://localhost:3000
# Processor API    http://127.0.0.1:3001
# Mailpit inbox    http://localhost:8025
# Solana JSON-RPC  http://127.0.0.1:8899`

const demoRecorderCommands = `docker compose up --build --detach
npm ci
npx playwright install chromium
npm run demo:video

# Optional: watch the annotated run at a slower pace.
CRYPTOPAL_DEMO_SLOW_MO=300 npm run demo:video -- --headed`

const verificationCommands = `$ npm --workspace apps/api test
# 3 files · 14 tests passed

$ npm --workspace apps/web test
# 2 files · 13 tests passed

$ cargo test --manifest-path crates/client-crypto/Cargo.toml --locked
# 6 tests passed

$ npm run check && npm run build
# both TypeScript workspaces passed; production build completed`

const loadCommands = `npm run load:smoke          # 20 read-only virtual users
npm run load:protocol:solo  # one full journey for debugging
npm run load:protocol       # 10 independent full journeys
npm run load:idempotency    # concurrent replay assertions`

const protocolTerms = [
  [
    'Receipt',
    'The sender-side blinded point presented before the deposit; implemented as a slip issuance request.',
  ],
  [
    'Slip',
    'The unblinded, one-use bearer that authorizes one exact transfer ID and normalized-email hash.',
  ],
  [
    'Envelope',
    'The receiver-side fresh blinded point; implemented as a coupon issuance request behind the claim capability.',
  ],
  [
    'Coupon',
    'The unblinded, one-use bearer bound to chain, genesis, mint, denomination, and destination wallet.',
  ],
] as const

const limitRows = [
  [
    'Custody',
    'The processor controls the pool and payout key.',
    'No proof of reserves, solvency, escrow, or willingness to pay.',
  ],
  [
    'On-chain privacy',
    'Two blind-token hops remove adjacent cryptographic joins.',
    'Solana still publishes sender → pool and pool → receiver transfers; amount and timing can correlate them.',
  ],
  [
    'Metadata',
    'The bearer payload omits the other side of each hop.',
    'Processor, SMTP, reverse proxy, IP logs, and browser telemetry may correlate activity.',
  ],
  [
    'Issuer trust',
    'The browser verifies a batch-DLEQ proof against the configured key.',
    'That expected key comes from the same processor; no independent global key manifest prevents per-client tagging.',
  ],
  [
    'Value model',
    'One pass authorizes exactly 1 cUSD.',
    'No arbitrary amount, change, denomination hiding, refund, dispute, or recovery workflow.',
  ],
  [
    'Network scope',
    'The chain boundary is isolated behind an interface and issuer domain.',
    'Only a resettable local Solana/Agave ledger and classic SPL token are implemented.',
  ],
  [
    'Operational safety',
    'State machines, row locks, unique constraints, and stable signed bytes make common retries converge.',
    'The email and chain submission paths still need production outboxes, reconciliation, rate limits, and abuse controls.',
  ],
  [
    'Cryptographic assurance',
    'The implementation reuses TurboPass and the pinned Ristretto crate.',
    'It is unaudited demonstrator code, not a standardized Privacy Pass deployment or production security claim.',
  ],
] as const

const nextSteps = [
  'Publish and authenticate one globally shared issuer-key manifest outside the issuing processor.',
  'Move pool custody to reviewed KMS/HSM or threshold controls, add reconciliation, and define refunds and recovery.',
  'Add a transactional outbox for SMTP and payout work, then test crash windows around submission and confirmation.',
  'Create a second chain adapter only after specifying finality, asset policy, canonical wallet encoding, and replay domains.',
  'Run production-shaped, retained benchmarks with pre-funded wallets, multiple denominations, and metadata defenses.',
  'Complete independent protocol, cryptographic, dependency, and application security reviews before real-value use.',
] as const

export function CryptoPalArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / THE PRODUCT IDEA</p>
        <h2>What if a wallet could pay an email address without learning the next wallet?</h2>
        <p className="article-lede">
          CryptoPal turns one local cUSD deposit into a one-time email claim, then lets the
          recipient withdraw to a different wallet. Two fresh blinded bearer credentials keep the
          sender wallet, email address, and receiver wallet out of one cryptographic identity chain.
        </p>
        <p>
          The easiest product analogy is “PayPal with crypto”: the sender addresses a person by
          email instead of asking for a chain address. That analogy explains the interaction, not
          the product maturity. This milestone is a fixed-value, local-only privacy demonstrator. It
          does not implement PayPal’s accounts, buyer protection, disputes, compliance, recovery,
          risk system, or operational guarantees.
        </p>
        <ArticleCallout title="THE ONE-SENTENCE CONTRACT" tone="success">
          <p>
            Deposit exactly <strong>1 cUSD</strong> from one local Solana wallet, deliver a one-time
            email claim, and redeem exactly <strong>1 cUSD</strong> to another wallet through two
            independently blinded TurboPass passes.
          </p>
        </ArticleCallout>
        <p>
          This is useful as a protocol laboratory for gifts, reimbursements, rewards, or onboarding
          flows where the sender knows an email address but should not need the receiver’s wallet in
          advance. The privacy goal is narrower: remove the direct cryptographic join at each
          handoff. It is not to make public chain activity or service metadata disappear.
        </p>
      </section>

      <section id="scope">
        <p className="eyebrow">02 / WHAT SHIPPED</p>
        <h2>The noun “anychain” became a boundary; Solana became the first implementation.</h2>
        <p>
          The build uses a disposable Agave validator, one classic SPL Token mint called cUSD, six
          decimals, and one denomination of <code>1_000_000</code> base units. A React wallet UI
          carries the flow. Rust compiled to WebAssembly owns client-side blinding, proof
          verification, unblinding, and bearer authorization. A TypeScript processor coordinates
          TurboPass, PostgreSQL, SMTP, and a custodial Solana vault.
        </p>
        <div className="article-metrics" aria-label="CryptoPal milestone scope">
          <div>
            <strong>1</strong>
            <span>implemented chain</span>
          </div>
          <div>
            <strong>1 cUSD</strong>
            <span>fixed denomination</span>
          </div>
          <div>
            <strong>2</strong>
            <span>independent blind hops</span>
          </div>
          <div>
            <strong>7</strong>
            <span>long-running local services</span>
          </div>
        </div>
        <CodeBlock
          code={localStack}
          label="Complete disposable local lab"
          language="shell"
          sourceHref={source('README.md', '#L29-L61')}
        />
        <ArticleCallout title="DEMO SAFETY BOUNDARY" tone="warning">
          <p>
            The faucet, deterministic vault and mint keys, browser burner wallet, shared Mailpit
            inbox, and resettable ledger are deliberate development conveniences. The repository
            says not to point this stack at mainnet or give it assets of value.
          </p>
        </ArticleCallout>
      </section>

      <section id="original-sketch">
        <p className="eyebrow">03 / FROM THE 2022 SPEC</p>
        <h2>The original PlantUML already contained the important two-hop insight.</h2>
        <p>
          The 2022 repository was an API and sequence sketch, not a complete cryptographic
          specification. Its overview named two separate “zero knowledge decoupling” groups: sender
          wallet to receiver email, then receiver email to receiver wallet. That is the key idea I
          preserved. I normalized spelling, wording, and PlantUML delimiters below while retaining
          every step in the original flow.
        </p>
        <CodeBlock
          code={originalOverview}
          label="Original protocol sequence, step-preserving normalization"
          language="PlantUML"
          sourceHref={specSource('http/uml/overview.plantuml', '#L1-L24')}
        />
        <p>
          The object sketch also named <code>Key</code>, <code>Issuer</code>, and{' '}
          <code>Redemption</code>. The runnable system sharpens those nouns into two
          domain-separated issuers, browser-held bearer material, and an authoritative spent-token
          set inside TurboPass.
        </p>
        <dl className="article-definitions">
          {protocolTerms.map(([term, definition]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{definition}</dd>
            </div>
          ))}
        </dl>
        <p>
          One blind credential could not satisfy both arrows. Reusing the sender’s slip at payout
          would join email handling to the receiver wallet. The implementation therefore makes the
          “envelope” a new preparation and the coupon a new bearer under a separate issuer domain.
        </p>
      </section>

      <section id="architecture">
        <p className="eyebrow">04 / ARCHITECTURE</p>
        <h2>Four PlantUML boxes became a complete, inspectable local system.</h2>
        <CodeBlock
          code={originalComponents}
          label="Original component model"
          language="PlantUML"
          sourceHref={specSource('components.plantuml', '#L1-L10')}
        />
        <CryptoPalArchitectureDiagram />
        <p>
          The React application and Rust/Wasm module are not cosmetic frontend details; they are a
          security boundary. The processor may see a blinded point during issuance and a bearer
          preimage during redemption, but the browser keeps the seed and blind that connect those
          moments. PostgreSQL owns the product state machines. TurboPass owns issuance and the
          authoritative spent-preimage record, backed by PostgreSQL and DynamoDB Local. Mailpit
          makes the email handoff visible without contacting a real mailbox.
        </p>
        <p>
          Temporal is intentionally absent from CryptoPal’s request path. The pinned TurboPass
          project can use Temporal for issuer-key rotation, but this demo creates bounded 30-day
          issuer windows and does not run a rotation worker. “Built with TurboPass” must not be
          misread as “every TurboPass operational component runs here.”
        </p>
      </section>

      <section id="local-demo">
        <p className="eyebrow">05 / THE INTERACTION</p>
        <h2>The interface makes an invisible protocol legible.</h2>
        <p>
          The sender screen presents one fixed transfer as four concrete steps: fund a burner
          wallet, lock one cUSD in the pool, prepare and verify the private slip, then deliver the
          email. It also puts “Local Solana” and “Demo only · not for real funds” in the primary
          frame. That wording matters because a polished wallet screen can otherwise imply economic
          safety the protocol does not provide.
        </p>
        <figure className="article-image">
          <Image
            alt="CryptoPal local demo showing a one cUSD wallet-to-email transfer and its four-step progress rail"
            height={2000}
            sizes="(max-width: 760px) 100vw, 880px"
            src={cryptopalLocalDemo}
            width={1930}
          />
          <figcaption>
            <strong>Owner-supplied CryptoPal sender screen</strong>
            <span>
              This screenshot documents the local interface and safety copy. It is not evidence of a
              completed payout; the browser walkthrough and test results provide that separately.
            </span>
          </figcaption>
        </figure>
        <ol className="article-steps">
          <li>
            <span>01</span>
            <div>
              <h3>Fund a disposable sender</h3>
              <p>The local faucet adds SOL for fees and local cUSD with no real-world value.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Prepare before depositing</h3>
              <p>The browser creates a fresh slip seed and sends only its blinded point.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Prove the exact deposit</h3>
              <p>The wallet submits one checked token transfer plus the processor’s memo.</p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Hand off by email</h3>
              <p>The verified slip authorizes one email-bound transfer and one stable claim URL.</p>
            </div>
          </li>
        </ol>
        <h3>Watch the complete local transfer</h3>
        <p>
          The final recorder turns the protocol into one continuous, caption-led walkthrough. It
          opens the exact message in Mailpit, follows the real delivered claim link, creates a
          different receiver wallet only after the claim opens, and finishes in a new RPC-backed
          local explorer. The player is deliberately lazy: its poster loads with the article, while
          the video waits until a visitor presses play.
        </p>
        <figure className="article-video">
          <video
            aria-describedby="cryptopal-private-transfer-caption cryptopal-private-transfer-transcript-summary"
            aria-label="CryptoPal local private-transfer walkthrough"
            controls
            height={900}
            playsInline
            poster={recordingPosterPath}
            preload="none"
            width={1440}
          >
            <source src={recordingPath} type="video/mp4" />
            <p>
              Your browser cannot play this recording.{' '}
              <a download href={recordingPath}>
                Download the MP4 video
              </a>
              .
            </p>
          </video>
          <figcaption id="cryptopal-private-transfer-caption">
            <strong>CryptoPal local privacy demo · silent · 3:20</strong>
            <span>
              One cUSD moves from a sender wallet through the shared pool and an email-delivered
              claim into a fresh receiver wallet.{' '}
              <a download href={recordingPath}>
                Download the 8.5 MiB MP4
              </a>
              .
            </span>
          </figcaption>
        </figure>
        <details className="article-details article-transcript">
          <summary id="cryptopal-private-transfer-transcript-summary">
            Visual transcript for the silent recording
          </summary>
          <div>
            <p>
              There is no voice or audio track. These chapters describe the visible actions, chapter
              cards, and privacy captions.
            </p>
            <ol>
              <li>
                <time dateTime="PT0S">00:00–00:30</time>
                <span>
                  The overview frames the route as wallet → private pool → email → wallet. A sender
                  burner wallet connects and receives local SOL plus 10 demo cUSD.
                </span>
              </li>
              <li>
                <time dateTime="PT30S">00:30–00:55</time>
                <span>
                  The browser prepares a blinded slip, approves a 1 cUSD deposit, and shows the
                  sender-to-pool transaction confirmed on the disposable local ledger.
                </span>
              </li>
              <li>
                <time dateTime="PT55S">00:55–01:15</time>
                <span>
                  The browser verifies the issuer proof and unblinds the slip locally before any
                  recipient email is chosen.
                </span>
              </li>
              <li>
                <time dateTime="PT1M15S">01:15–01:40</time>
                <span>
                  The sender enters the synthetic recipient, authorizes the handoff, and the UI
                  states that the email address is not written to Solana.
                </span>
              </li>
              <li>
                <time dateTime="PT1M40S">01:40–02:05</time>
                <span>
                  The run selects that exact message in the local Mailpit inbox and opens its real
                  one-time claim link.
                </span>
              </li>
              <li>
                <time dateTime="PT2M5S">02:05–02:25</time>
                <span>
                  The claim is inspected without spending it. Only then is the sender disconnected
                  and a fresh receiver burner-wallet key selected.
                </span>
              </li>
              <li>
                <time dateTime="PT2M25S">02:25–02:50</time>
                <span>
                  A second blinded coupon is created, verified, unblinded, bound to the receiver
                  wallet at redemption, and exchanged for 1 cUSD.
                </span>
              </li>
              <li>
                <time dateTime="PT2M50S">02:50–03:20</time>
                <span>
                  The local explorer verifies both parsed Solana transactions and the final 9 / 0 /
                  1 cUSD balances for sender, pool, and receiver.
                </span>
              </li>
            </ol>
          </div>
        </details>
        <CodeBlock
          code={demoRecorderCommands}
          label="Reproduce the annotated local recording"
          language="shell"
          sourceHref={source('tests/demo/README.md', '#L26-L50')}
        />
        <p>
          This is a fail-closed recorder, not a loose screen macro. It refuses proxy environments or
          non-loopback web, Mailpit, claim, and Solana endpoints; chooses a unique synthetic
          recipient; checks the exact delivered message; and treats wallet and signature query
          values as hints until RPC verification succeeds. It retries only the identical bound slip
          after the exact <code>502 TURBOPASS_UNAVAILABLE</code> response and polls the same coupon
          idempotently for payout.
        </p>
        <p>
          The disposable Agave validator also moved to 128 ticks per slot so its recent-transaction
          cache retains the sender hop through the intentionally slow three-minute recording. That
          is a local observability setting, not a Solana production recommendation.{' '}
          <a href={source('tests/demo/README.md', '#L52-L72')} rel="external">
            Read the recorder’s evidence and safety contract
          </a>
          .
        </p>
        <ArticleCallout title="WHAT THIS RECORDING PROVES" tone="warning">
          <p>
            The continuous run uses one browser profile but two distinct wallet keys. It
            demonstrates the complete local flow and wallet-key separation—not browser, device, IP,
            timing, amount, or mail-metadata anonymity. The public chain hops remain visible and the
            pool remains custodial.
          </p>
        </ArticleCallout>
      </section>

      <section id="hop-one">
        <p className="eyebrow">06 / HOP ONE · WALLET → EMAIL</p>
        <h2>A Solana signature is accepted only after the processor reconstructs its meaning.</h2>
        <p>
          The browser first creates a deposit intent with one blinded slip point. The response pins
          a pool token account, mint, amount, and memo. The wallet then constructs a
          <code>transferChecked</code> instruction and a Memo instruction in the same transaction.
        </p>
        <CodeBlock
          code={depositTransaction}
          label="Checked SPL transfer plus deposit memo"
          language="TypeScript"
          sourceHref={source('apps/web/src/lib/solana.ts', '#L34-L89')}
        />
        <p>
          The processor does not trust the browser’s “confirmed” message. It loads the transaction
          from Solana and checks success, confirmation, exact memo, exactly one checked transfer,
          expected mint and decimals, sender signer and source account, destination pool account,
          exact amount, and token-balance deltas. A previously used chain signature or blinded-token
          hash cannot be assigned to another deposit.
        </p>
        <p>
          Only then does TurboPass evaluate the blinded point under the slip issuer. The browser
          reconstructs its prepared point, requires the returned issuer key to equal the configured
          key, verifies the batch-DLEQ proof, and unblinds locally.
        </p>
        <CodeBlock
          code={verifyAndUnblind}
          label="Browser verification before unblinding, condensed"
          language="TypeScript"
          sourceHref={source('apps/web/src/lib/privacyPass.ts', '#L21-L83')}
        />
        <p>
          To send the value, the processor normalizes and hashes the email address and returns an
          exact payload. The browser HMAC-authorizes that payload with the slip bearer, so changing
          the transfer ID or email hash invalidates the authorization. TurboPass&apos;s separate
          spent-preimage record prevents a second redemption.
        </p>
        <CodeBlock
          code={canonicalBindings}
          label="Domain-separated canonical payloads"
          language="TypeScript"
          sourceHref={source('apps/api/src/canonical.ts', '#L74-L105')}
        />
      </section>

      <section id="hop-two">
        <p className="eyebrow">07 / HOP TWO · EMAIL → WALLET</p>
        <h2>The claim hands over capability, then a fresh coupon breaks the second join.</h2>
        <p>
          After the slip is spent, the processor derives an unpredictable 256-bit capability from a
          server secret, transfer ID, and current chain genesis. The derivation is deterministic so
          an email retry reproduces the same URL without storing the raw capability; PostgreSQL
          stores only its SHA-256 hash.
        </p>
        <CodeBlock
          code={claimCapability}
          label="Retry-stable claim capability"
          language="TypeScript"
          sourceHref={source('apps/api/src/processor.ts', '#L140-L175')}
        />
        <p>
          The secret appears after <code>#</code> in the single-page application URL. Browsers do
          not include a fragment in the initial HTTP request, so the web server receives the page
          request without the capability. The application still uses it afterward, and the mailbox,
          browser, extensions, clipboard, or client telemetry can expose it. Possession of that URL
          is the claim authentication model.
        </p>
        <p>
          The recipient creates new preparation material—never the sender’s slip—and asks for a
          coupon under the coupon issuer. After verifying and unblinding, the recipient authorizes a
          payload containing the exact Solana genesis, mint, amount, and destination wallet. The
          public redemption request carries only the wallet, bearer preimage, and HMAC. It does not
          carry the email, claim ID, claim secret, or transfer ID.
        </p>
        <CodeBlock
          code={couponRedemption}
          label="Wallet-bound coupon redemption, condensed"
          language="TypeScript"
          sourceHref={source('apps/api/src/processor.ts', '#L486-L563')}
        />
        <CryptoPalProtocolDiagram />
      </section>

      <section id="zkp-precision">
        <p className="eyebrow">08 / WHAT “ZKP” MEANS HERE</p>
        <h2>The proof checks one relationship; blinding provides the unlinkability.</h2>
        <p>
          The original sketch called the token processor a ZKP microservice. More precisely,
          TurboPass returns a non-interactive batch discrete-log equality proof. The browser uses it
          to check that the issuer evaluated the blinded point consistently with the expected
          Ristretto public key. It does not prove the processor has funds, followed a business rule,
          sent an email, or paid a recipient.
        </p>
        <p>
          The privacy property comes from the client choosing a secret and blinding scalar, sending
          only a blinded group element, verifying the result, and unblinding locally. At later
          redemption, the issuer sees the bearer preimage and redemption authenticator but cannot
          use the cryptographic transcript alone to match them to the earlier blinded point.
          Repeating that construction with fresh randomness creates the second boundary.
        </p>
        <CryptoPalPrivacyDiagram />
        <ArticleCallout title="PROTOCOL TERMINOLOGY" tone="warning">
          <p>
            This is not a SNARK, arithmetic circuit, mixer, shielded pool, confidential transfer, or
            proof of custody. It uses RFC 9497 base-mode components with TurboPass’s custom
            batch-DLEQ transcript and redemption encoding; it is not a wire-compatible RFC 9497
            VOPRF or RFC 9578 Privacy Pass implementation.
          </p>
        </ArticleCallout>
      </section>

      <section id="browser-boundary">
        <p className="eyebrow">09 / THE BROWSER BOUNDARY</p>
        <h2>Private preparation data stays in the tab, but browser storage is not a vault.</h2>
        <p>
          The Rust crate wraps the same Ristretto primitives used by TurboPass and compiles them to
          WebAssembly. Its batch object keeps derived preimages and blinds in Wasm memory and
          zeroizes secret Rust values on drop. TypeScript receives blinded points, final bearer
          strings, and authorizations—but it also creates and temporarily persists the sensitive
          32-byte deterministic preparation seed. The page stores that state in tab-scoped{' '}
          <code>sessionStorage</code> so it can survive navigation through the flow.
        </p>
        <p>
          The application compares the current local chain genesis before restoring a session. A
          validator reset invalidates old preparations, claim capabilities, issuer names, and payout
          payloads rather than letting credentials minted against one pool incarnation spend from a
          new one.
        </p>
        <ArticleCallout title="HONEST-BUT-CURIOUS ASSUMPTION">
          <p>
            The expected issuer keys arrive from the processor’s own <code>/config</code> endpoint.
            That catches a key change during one issuance, but it is not an independent public
            commitment. A malicious issuer could assign a unique key to one client and tag the
            issuance. Production needs an authenticated global manifest pinned independently from
            the issuer.
          </p>
        </ArticleCallout>
      </section>

      <section id="retry-safety">
        <p className="eyebrow">10 / STATE + IDEMPOTENCY</p>
        <h2>One-use money movement needs convergence at every retry boundary.</h2>
        <p>
          Three explicit state machines separate chain observation, email availability, coupon
          issuance, and payout submission. PostgreSQL row locks and unique hashes choose one owner
          for each transition. TurboPass remains the authoritative one-use gate for bearer
          preimages.
        </p>
        <CryptoPalStateDiagram />
        <CodeBlock
          code={payoutReservation}
          label="One payout row per coupon preimage, condensed"
          language="SQL + TypeScript"
          sourceHref={source('apps/api/src/repository.ts', '#L486-L535')}
        />
        <p>
          The payout path prepares and stores serialized, signed Solana transaction bytes before
          submission. A retry rebroadcasts the same bytes and signature. If the blockhash expires, a
          row-locked comparison replaces only the still-current prepared transaction. Once the chain
          confirms, later equivalent requests return the recorded signature; a changed wallet
          conflicts.
        </p>
        <p>
          Email delivery is intentionally at-least-once. A retry may put another copy of the same
          message into Mailpit, but deterministic capability derivation makes the claim URL stable.
          Production still needs an outbox and delivery reconciliation because stable content does
          not make an SMTP side effect transactional with PostgreSQL.
        </p>
      </section>

      <section id="anychain">
        <p className="eyebrow">11 / THE “ANYCHAIN” SEAM</p>
        <h2>The adapter is real; multi-chain support is future work.</h2>
        <p>
          The processor depends on a chain-vault interface for bootstrapping, health, faucet funds,
          independent deposit verification, payout preparation, and prepared-transaction submission.
          That is the right starting seam for another chain. It is not proof that another chain can
          be added by changing a URL.
        </p>
        <CodeBlock
          code={chainAdapter}
          label="Current Solana vault contract"
          language="TypeScript"
          sourceHref={source('apps/api/src/types.ts', '#L166-L187')}
        />
        <p>
          A second implementation would need its own finality rule, asset and token-account policy,
          canonical address encoding, exact deposit interpretation, fee model, transaction
          replacement behavior, and recovery model. Chain identity, asset, denomination, protocol
          version, and hop must also enter distinct issuer names and payload domains so a pass from
          one network cannot be replayed on another.
        </p>
        <ArticleCallout title="CURRENT NETWORK CLAIM" tone="warning">
          <p>
            CryptoPal currently implements <code>solana-local</code> only: one resettable Agave
            ledger, one classic SPL mint, and one fixed amount. “Anychain” describes the target
            architecture, not a delivered compatibility matrix.
          </p>
        </ArticleCallout>
      </section>

      <section id="debugging">
        <p className="eyebrow">12 / WHAT BROKE WHILE BUILDING</p>
        <h2>The difficult bugs sat at tool and trust boundaries.</h2>
        <div className="bug-ledger">
          <article>
            <span>01</span>
            <div>
              <h3>Wasm was both generated and accidentally ignored</h3>
              <p>
                An initial <code>wasm-pack</code> attempt failed and a later attempt succeeded.
                Separately, a blanket ignore rule hid the generated browser package. The repository
                now explicitly allowlists the checked-in Wasm output so Docker and normal frontend
                builds do not require Rust.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Strict Rust checks exposed cleanup work</h3>
              <p>
                Clippy initially failed. The warnings were fixed instead of muted, then format,
                locked tests, and strict Clippy passed. The generated Wasm was ultimately verified
                against the Rust API.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>A proof is meaningless against an untrusted key</h3>
              <p>
                The client originally needed a stronger expected-key check. The final flow compares
                the issuance key with configuration, reconstructs the original blinded point, then
                verifies before unblinding. The independent-manifest limitation remains explicit.
              </p>
            </div>
          </article>
          <article>
            <span>04</span>
            <div>
              <h3>Interoperability language was too broad</h3>
              <p>
                Documentation was corrected to describe RFC 9497 components plus a custom TurboPass
                transcript—not a standards-compatible VOPRF or a generic zero-knowledge system.
              </p>
            </div>
          </article>
          <article>
            <span>05</span>
            <div>
              <h3>Local orchestration still behaves like a system</h3>
              <p>
                Persistent volumes had to be reset while iterating, and port 3000 was already in use
                during the final walkthrough, so the browser run moved to port 3300. An initial
                automation step timed out; after inspecting the current page state, the walkthrough
                continued without weakening the protocol assertions.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section id="verification">
        <p className="eyebrow">13 / VERIFIED REPOSITORY RESULT</p>
        <h2>The pinned public commit builds and its committed checks pass.</h2>
        <div className="article-metrics" aria-label="Verified CryptoPal repository metrics">
          <div>
            <strong>89</strong>
            <span>tracked paths</span>
          </div>
          <div>
            <strong>33 / 33</strong>
            <span>non-load tests passing</span>
          </div>
          <div>
            <strong>551</strong>
            <span>web modules built</span>
          </div>
          <div>
            <strong>3</strong>
            <span>durable state machines</span>
          </div>
        </div>
        <CodeBlock
          code={verificationCommands}
          label="Independent verification at the pinned commit"
          language="text"
        />
        <p>
          I independently cloned public commit <code>{commit.slice(0, 7)}</code>. The API suite
          passed 14 tests in three files, the browser-helper suite passed 13 tests in two files, and
          the Rust/Wasm crate passed six tests: 33 non-load tests with zero failures. Both
          TypeScript workspaces typechecked and the production web build completed.
        </p>
        <p>
          The build produced a 161.80 kB Wasm asset (61.25 kB gzip) and a 747.75 kB main JavaScript
          bundle (236.12 kB gzip). Vite’s over-500 kB warning is a real performance follow-up: the
          wallet and Solana dependency tree should be split or modernized before treating this UI as
          a production frontend.
        </p>
        <ArticleCallout title="FULL BROWSER WALKTHROUGH" tone="success">
          <p>
            Commit <code>{commit.slice(0, 7)}</code> adds the reproducible Playwright recorder and
            local explorer. The supplied 3:20 WebM follows the exact Mailpit message and its real
            claim link, then verifies distinct wallet keys, both confirmed transactions, and final 9
            / 0 / 1 cUSD balances. Its SHA-256 is{' '}
            <code>a3c427d7a8864458539ba1c76ff7456c05eb294008f0ac5cf04ab191b23e82be</code>. The site
            serves a smaller H.264 transcode of the same recording; the original recording and
            generated correlation report remain outside the CryptoPal repository.
          </p>
        </ArticleCallout>
      </section>

      <section id="load-testing">
        <p className="eyebrow">14 / LOAD + REPLAY TESTING</p>
        <h2>The load harness exercises journeys and races, not a headline TPS number.</h2>
        <p>
          The repository commits three guarded Artillery profile files exposed through four run
          commands. Every target must be loopback; redirects, proxies, a non-loopback processor
          target, or a non-loopback Solana RPC returned by <code>/config</code> stop the run.
          Stateful users create independent wallets, obtain faucet funds, touch the real local
          validator, issue and redeem through TurboPass, send SMTP to Mailpit, use the
          browser-compatible Wasm, and verify the receiver balance on-chain.
        </p>
        <CodeBlock
          code={loadCommands}
          label="Committed local load profiles"
          language="shell"
          sourceHref={source('tests/load/README.md', '#L11-L70')}
        />
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Recorded profile</th>
                <th>Observed result</th>
                <th>What it establishes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Read smoke</th>
                <td>20 users; 40/40 requests; zero failures; aggregate p95 and p99 about 7 ms.</td>
                <td>Local health/config shape and a quick dependency-read latency regression.</td>
              </tr>
              <tr>
                <th scope="row">Full protocol</th>
                <td>
                  10/10 independent users; 90/90 HTTP requests; zero failed users; aggregate p95
                  about 1.2 s and p99 about 1.3 s; final balances verified.
                </td>
                <td>
                  A conservative local end-to-end regression through chain, crypto, SMTP, and
                  stores.
                </td>
              </tr>
              <tr>
                <th scope="row">Idempotency</th>
                <td>
                  A four-way deposit reservation produced one HTTP 201 and three expected 409s; four
                  post-success replays at each remaining critical boundary returned identical stable
                  results.
                </td>
                <td>Documented duplicate behavior after success plus one real reservation race.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ArticleCallout title="LOAD-EVIDENCE BOUNDARY" tone="warning">
          <p>
            Those numbers come from the recorded local development session. No Artillery result JSON
            is committed, so the exact observations have no retained, independently auditable result
            artifact and must not be treated as a capacity benchmark. The idempotency profile races
            only initial deposit reservation while it is in flight; deposit confirmation, transfer
            completion, coupon issuance, and payout are four concurrent <em>post-success</em>{' '}
            replays, not winner/loser transition races.
          </p>
        </ArticleCallout>
      </section>

      <section id="limits">
        <p className="eyebrow">15 / CURRENT TRUTH</p>
        <h2>Private bearer handoffs do not make the whole payment private or production-ready.</h2>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Boundary</th>
                <th>What exists</th>
                <th>What must not be inferred</th>
              </tr>
            </thead>
            <tbody>
              {limitRows.map(([boundary, exists, notProved]) => (
                <tr key={boundary}>
                  <th scope="row">{boundary}</th>
                  <td>{exists}</td>
                  <td>{notProved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The single-user demonstration is especially easy to correlate by amount and timing. Two
          cryptographic blind spots can coexist with obvious operational linkage. A production
          privacy design would need batching, randomized delay, relays, separated logs and duties,
          telemetry controls, and potentially an on-chain shielded or escrow construction—depending
          on the actual threat model.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">16 / FILE GUIDE</p>
        <h2>Where to follow the implementation.</h2>
        <div className="file-guide">
          <article>
            <p className="eyebrow">START WITH THE CONTRACT</p>
            <h3>Protocol and safety</h3>
            <ul>
              <li>
                <a href={source('README.md')} rel="external">
                  Repository overview and local walkthrough
                </a>
              </li>
              <li>
                <a href={source('docs/PROTOCOL.md')} rel="external">
                  Exact two-hop protocol
                </a>
              </li>
              <li>
                <a href={source('docs/SECURITY.md')} rel="external">
                  Security and privacy limitations
                </a>
              </li>
              <li>
                <a href={source('docs/ARCHITECTURE.md')} rel="external">
                  Component and trust architecture
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">FOLLOW THE REQUEST PATH</p>
            <h3>Processor and Solana</h3>
            <ul>
              <li>
                <a href={source('apps/api/src/processor.ts')} rel="external">
                  Protocol coordinator and state transitions
                </a>
              </li>
              <li>
                <a href={source('apps/api/src/solana.ts')} rel="external">
                  Independent deposit verification and payouts
                </a>
              </li>
              <li>
                <a href={source('apps/api/src/repository.ts')} rel="external">
                  PostgreSQL row locks and retry state
                </a>
              </li>
              <li>
                <a href={source('apps/api/src/canonical.ts')} rel="external">
                  Canonical identity and bearer payloads
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">FOLLOW THE PRIVATE MATERIAL</p>
            <h3>Browser and Rust/Wasm</h3>
            <ul>
              <li>
                <a href={source('apps/web/src/lib/privacyPass.ts')} rel="external">
                  Browser preparation, proof verification, and authorization
                </a>
              </li>
              <li>
                <a href={source('crates/client-crypto/src/lib.rs')} rel="external">
                  Rust/Wasm secret-handling wrapper
                </a>
              </li>
              <li>
                <a href={source('apps/web/src/pages/ClaimPage.tsx')} rel="external">
                  Recipient coupon and redemption flow
                </a>
              </li>
              <li>
                <a href={source('tests/load/README.md')} rel="external">
                  Load, loopback guards, and replay semantics
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">TRACE THE LINEAGE</p>
            <h3>Spec and token service</h3>
            <ul>
              <li>
                <a href={specSource('http/uml/overview.plantuml')} rel="external">
                  Original 2022 sequence sketch
                </a>
              </li>
              <li>
                <a href={specSource('zkp/objects.plantuml')} rel="external">
                  Original key, issuer, and redemption objects
                </a>
              </li>
              <li>
                <a href={turboPassSource('docs/ARCHITECTURE.md')} rel="external">
                  TurboPass architecture
                </a>
              </li>
              <li>
                <a href={turboPassSource('docs/COMPATIBILITY.md')} rel="external">
                  TurboPass compatibility boundaries
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">REPRODUCE THE WALKTHROUGH</p>
            <h3>Recorder and live evidence</h3>
            <ul>
              <li>
                <a href={source('tests/demo/README.md')} rel="external">
                  Recording contract, commands, and evidence limits
                </a>
              </li>
              <li>
                <a href={source('tests/demo/record-demo.mjs')} rel="external">
                  Playwright journey and verification report
                </a>
              </li>
              <li>
                <a href={source('apps/web/src/pages/LocalExplorerPage.tsx')} rel="external">
                  RPC-backed balances and parsed transactions
                </a>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">17 / WHAT IS NEXT</p>
        <h2>Move from a privacy demonstration to a threat-modelled payment system.</h2>
        <ol className="next-list">
          {nextSteps.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
        <p>
          The best next milestone is not another chain logo. It is an independently authenticated
          issuer manifest, durable side-effect workers, custody and reconciliation controls, and
          retained end-to-end evidence. Once those contracts exist, a second chain adapter can test
          whether “anychain” is genuinely architectural rather than aspirational.
        </p>
      </section>

      <section id="sources">
        <p className="eyebrow">18 / EVIDENCE LEDGER</p>
        <h2>Three immutable source pins, one supplied recording, and one session record.</h2>
        <ul className="source-list">
          <li>
            <a href={`${repository}/tree/${commit}`} rel="external">
              CryptoPal implementation at {commit.slice(0, 7)}
            </a>{' '}
            — the runnable local application, protocol, tests, load harness, local explorer, and
            reproducible demo recorder.
          </li>
          <li>
            <a href={`${specRepository}/tree/${specCommit}`} rel="external">
              Original CryptoPal spec at {specCommit.slice(0, 7)}
            </a>{' '}
            — the 2022 PlantUML and API sketches.
          </li>
          <li>
            <a href={`${turboPassRepository}/tree/${turboPassCommit}`} rel="external">
              TurboPass at {turboPassCommit.slice(0, 7)}
            </a>{' '}
            — the exact submodule commit providing issuance and spent-token enforcement.
          </li>
          <li>
            The owner-supplied screenshot documents the interface. The owner-supplied WebM is the
            17,119,896-byte source recording with SHA-256{' '}
            <code>a3c427d7a8864458539ba1c76ff7456c05eb294008f0ac5cf04ab191b23e82be</code>. This page
            serves an 8,916,669-byte H.264 delivery copy with SHA-256{' '}
            <code>cafb08d2f0d0a718db3f3556416ee234a98075fd2155ed0fc0da10491c5d8e03</code>.
          </li>
          <li>
            <a href={continuationUrl} rel="external">
              Shared implementation continuation
            </a>{' '}
            — supplementary session evidence for the recorder chronology and the stated demo
            boundaries, not a substitute for the pinned code or independently rerun checks.
          </li>
          <li>
            The recorder’s ignored JSON report intentionally correlates the synthetic email, both
            wallets, Mailpit message, and transaction signatures to audit this one local run. It is
            not published here. Load observations still have no retained Artillery result artifact
            and remain labelled as session evidence.
          </li>
        </ul>
      </section>
    </>
  )
}
