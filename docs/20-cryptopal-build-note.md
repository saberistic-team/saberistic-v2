# CryptoPal Build Note 005

## Outcome

Saberistic now has a source-verified Build Note for CryptoPal: a local demonstrator that moves one
fixed denomination of cUSD from a sender wallet to an email claim and then to a receiver wallet.
The article explains the product as a PayPal-like addressing experience while preserving the much
narrower implementation truth: this is not a PayPal replacement, production payment system,
mainnet application, shielded pool, or general-purpose zero-knowledge protocol.

The public route is:

`/build-notes/cryptopal-wallet-email-wallet/`

The implementation adds:

- a Build Note manifest record with three immutable repository pins;
- an evidence-led article with 18 navigable sections and source-linked code excerpts;
- four accessible, responsive SVG diagrams derived from the original PlantUML and current code;
- the owner-supplied CryptoPal sender screen as a statically dimensioned image with explanatory
  caption and reserved layout space;
- a lazy-loaded, silent 3:20 walkthrough with a purpose-built poster, download link, and
  timestamped visual transcript;
- verification and load-test results separated by evidence class; and
- explicit privacy, custody, interoperability, network, reliability, and production boundaries.

Through the existing manifest, the article also enters the Build Notes index, homepage journal,
RSS feed, sitemap, JSON-LD, analytics event path, fixture static export, and public-route verifier.

## Immutable source set

| Source             | Pinned commit                              | Role                                                                      |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------- |
| CryptoPal          | `55f7f00e55c6e915f7ad85c5669eb7c01fe020c5` | Application, protocol, tests, load harness, explorer, and demo recorder   |
| Original CryptoPal | `de7c055e459167f66f39d56e4feceaa92caf12aa` | 2022 PlantUML, API model, and original receipt/slip/envelope/coupon terms |
| TurboPass          | `f18da5682c80fb1afe08348187e4c2f39bd4714a` | Exact submodule pin providing issuance and authoritative redemption       |

The source URLs are:

- [CryptoPal](https://github.com/saberistic-team/cryptopal);
- [original CryptoPal spec](https://github.com/saberistic/cryptopal-spec); and
- [TurboPass](https://github.com/saberistic-team/turbopass).

The supplied sender-screen image is presentation evidence. The supplied WebM is a local-run
artifact, while commit `55f7f00` contains the code that can reproduce it. The shared implementation
continuation was read as supplementary session context, never as a replacement for the pinned code
or independently rerun checks. No Artillery result JSON is retained, so the load observations remain
session evidence rather than repository-verifiable benchmarks.

## Product and protocol contract

CryptoPal's bounded milestone contract is:

1. Create a fresh blinded slip preparation in the sender browser.
2. Deposit exactly `1_000_000` base units of a six-decimal classic SPL token named cUSD into a
   custodial pool on a resettable local Agave ledger.
3. Independently verify the confirmed checked transfer, its memo, authority, mint, amount, accounts,
   and balance changes.
4. Issue a blinded slip through TurboPass; verify the issuer key and batch-DLEQ proof; unblind in
   Rust/Wasm in the browser.
5. Bind that slip to one transfer ID and the SHA-256 hash of a normalized email address.
6. Spend the slip once and send a deterministic, unpredictable claim capability by local SMTP.
7. Create a fresh, independent blinded coupon preparation in the recipient browser.
8. Verify and unblind the coupon, bind it to chain genesis, mint, denomination, and destination
   wallet, then spend it once.
9. Prepare, persist, submit, and confirm one custodial payout of 1 cUSD to that wallet.

The two blinded-token hops solve different adjacent joins:

```text
sender wallet ── blind slip ──> email claim ── fresh blind coupon ──> receiver wallet
```

One credential reused across both stages would allow the email handling step and payout wallet to
share a bearer identity. The second fresh preparation is therefore essential, not decorative.

## Original PlantUML mapping

The original repository contained three relevant PlantUML artifacts:

- `components.plantuml`: HTTP API → Processor → Chain Vault, plus the Processor → ZKP service;
- `http/uml/overview.plantuml`: Sender, Chain, CryptoPal, Receiver, and two explicitly labelled
  zero-knowledge decoupling groups; and
- `zkp/objects.plantuml`: Key owns Issuer; Issuer aggregates Redemption.

The original overview uses `@@startuml` and `@@enduml` and misspells several labels. The article
shows a spelling-, wording-, and delimiter-normalized sequence while retaining every original step
and linking to the immutable file. It does not present the normalized sequence as verbatim text.

Original terms map to the implementation as follows:

| Original term | Current meaning                                                                |
| ------------- | ------------------------------------------------------------------------------ |
| Receipt       | Sender-side blinded point used for slip issuance                               |
| Slip          | Unblinded one-use bearer bound to transfer ID and normalized-email hash        |
| Envelope      | Fresh receiver-side blinded point used for coupon issuance                     |
| Coupon        | Unblinded one-use bearer bound to chain, asset, amount, and destination wallet |

The article's architecture diagram maps the four original boxes to the current React + Rust/Wasm
browser, processor API, local Solana vault, TurboPass, PostgreSQL, DynamoDB Local, and Mailpit. A
future-vault box branches from the processor through a dashed adapter seam and explicitly says “not
implemented.” The browser's direct signed-transaction broadcast and TurboPass's PostgreSQL state
path are also shown.

## What “ZKP” means

The article deliberately narrows the original ZKP label:

- TurboPass provides a non-interactive batch proof of equality of discrete logarithms, allowing the
  browser to verify that the issuer evaluated the blinded point consistently with the expected
  Ristretto public key.
- The unlinkability property comes from blind issuance, client-held preparation material, local
  unblinding, and fresh independent credentials at each hop.
- The proof does not establish pool solvency, custody safety, email delivery, payment, policy
  compliance, or honest application behavior.

The system is not described as:

- a SNARK or arithmetic circuit;
- a mixer, shielded pool, or confidential transfer;
- a proof of custody or proof of reserves;
- a wire-compatible RFC 9497 VOPRF; or
- an RFC 9578 Privacy Pass deployment.

It uses RFC 9497 base-mode components with TurboPass's custom batch-DLEQ transcript, encodings, and
redemption format.

## Privacy and trust boundaries

The article distinguishes the cryptographic claim from operational observability:

| Boundary         | What the build does                                                                          | What remains visible or trusted                                        |
| ---------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Wallet → email   | Blind slip breaks the direct issuance/redemption join                                        | Processor sees both adjacent operations and may correlate metadata     |
| Email → wallet   | Fresh blind coupon omits claim and transfer identifiers from payout                          | Processor still operates claim and payout; SMTP knows the mailbox      |
| Public chain     | Bearer payloads do not expose the email                                                      | Solana publishes sender → pool and pool → receiver transfers           |
| Issuer key       | Browser checks the proof against the `/config` key                                           | Same processor supplies that key; a malicious issuer could tag clients |
| Browser material | TypeScript stores the deterministic seed; derived blinds/preimages live in Wasm while active | Browser compromise, extensions, clipboard, or stolen claim URL remain  |
| Custody          | Processor state and retries are explicit                                                     | Processor controls pool funds and payout; no solvency proof            |

The claim capability is encoded after the URL fragment marker, so it is not sent in the initial
page request. This reduces routine server-log exposure but does not make the secret invisible to
the browser environment or mailbox.

## State and replay safety

The runnable protocol defines three durable state machines:

```text
Deposit:  AWAITING_CHAIN → ISSUING → ISSUED
Transfer: AWAITING_SLIP → AVAILABLE → COUPON_ISSUING → COUPON_ISSUED
Payout:   REDEEMING → SUBMITTING → CONFIRMED
```

Safety mechanisms include:

- unique deposit signatures and blinded-token hashes;
- a SHA-256 claim-capability identifier instead of the raw capability;
- one payout row per coupon-preimage hash;
- row-locked compare-and-transition logic in PostgreSQL;
- TurboPass's authoritative spent-preimage set;
- stable deterministic claim URLs for email retry;
- persisted serialized signed payout bytes before Solana submission; and
- row-locked replacement of an expired-blockhash transaction only when the stored signature still
  matches the caller's prior transaction.

This makes documented duplicates converge, but it does not make SMTP or chain submission fully
transactional. Production still needs outboxes, workers, reconciliation, terminal/retryable error
classification, and operational recovery.

## “Anychain” boundary

The current processor uses a vault interface for:

- bootstrap and health;
- current chain genesis;
- demo faucet funding;
- independent deposit verification;
- payout preparation; and
- prepared-transaction submission.

That interface is a credible adapter seam, but only `solana-local` exists. A second chain needs an
explicit definition of finality, canonical address encoding, supported asset behavior, fee policy,
deposit semantics, payout replacement, and recovery. Chain, genesis, asset, denomination, protocol
version, and hop must remain in separate issuer and payload domains. The article therefore uses
“anychain” as product direction, never as delivered compatibility.

## Visual implementation

Four deterministic inline SVG diagrams are source-controlled in
`src/components/build-notes/CryptoPalDiagrams.tsx`:

1. original component sketch → implemented local architecture;
2. complete wallet → email → wallet protocol sequence;
3. hidden cryptographic joins versus visible operational metadata; and
4. issuer domains, state machines, and retry gates.

Every SVG includes a unique accessible `<title>` and `<desc>`. Wide diagrams sit in
keyboard-focusable, horizontally scrollable regions. Labels are real SVG text rather than text
flattened into images. The owner-supplied screenshot is imported statically through `next/image`,
which preserves intrinsic dimensions and prevents layout shift. Its caption distinguishes UI
evidence from a successful execution result.

## Recorded demo evidence

Commit `55f7f00` adds a reproducible Playwright recorder and an RPC-backed local explorer. The
recording covers one continuous local journey:

1. connect and fund a disposable sender wallet;
2. prepare a blinded slip and deposit 1 cUSD into the shared pool;
3. verify the issuer proof and unblind locally;
4. authorize a synthetic-email handoff;
5. select the exact Mailpit message and follow its real claim link;
6. open the claim without spending it, disconnect the sender, and create a distinct receiver key;
7. issue, verify, unblind, and redeem a fresh receiver coupon; and
8. show both parsed Solana transactions plus the final sender / pool / receiver balances of
   9 / 0 / 1 cUSD.

The supplied artifact is a silent 3:20.04, 1440×900, 25 fps VP8 WebM:

- size: `17,119,896` bytes;
- SHA-256: `a3c427d7a8864458539ba1c76ff7456c05eb294008f0ac5cf04ab191b23e82be`;
- one video stream and no audio, caption, or narration track.

For browser delivery, the website stores a same-resolution H.264 fast-start transcode of the same
recording, reducing the transfer by 47.9%:

- size: `8,916,669` bytes;
- SHA-256: `cafb08d2f0d0a718db3f3556416ee234a98075fd2155ed0fc0da10491c5d8e03`;
- poster: `33,050` bytes, 1440×900 WebP, SHA-256
  `b9a204945a12f120db4ffce1d6e58b929827d5217c9f7f2bf9a7feaf3e63d978`.

The native player uses `controls`, `playsInline`, explicit dimensions, the poster, and
`preload="none"`; it never autoplays. Because the source is silent, an adjacent timestamped visual
transcript describes every chapter instead of presenting a misleading empty caption track. The
content-addressed files receive immutable CDN caching, and the standalone Payload image explicitly
copies the shared public directory so the article works in both site variants.
The article JSON-LD adds a `VideoObject` with the content URL, poster, dimensions, duration, file
size, delivery hash, and transcript accessibility feature alongside the existing `BlogPosting`.

The continuous run uses one browser profile with two different wallet keys. It establishes a
complete local flow and wallet-key separation, not browser, device, IP, timing, amount, or
mail-metadata anonymity. The generated JSON report deliberately correlates the synthetic email,
both wallets, Mailpit message, and transaction signatures to audit that run, so it remains ignored
and is not published with the note.

The recorder refuses proxy environments and non-loopback web, Mailpit, claim, or Solana targets. It
uses a unique synthetic recipient, selects that exact inbox message, retries only an identical slip
after the exact `502 TURBOPASS_UNAVAILABLE` condition, and polls the same coupon idempotently. Query
parameters are treated as hints until live RPC verifies the accounts, transactions, and token
deltas. The disposable validator uses 128 ticks per slot so the sender transaction remains in its
recent-status cache during the deliberately slow recording; that is a local demo accommodation, not
a production Solana recommendation.

## Repository verification

Independent verification at CryptoPal commit `55f7f00` produced:

| Check                  | Result                                              |
| ---------------------- | --------------------------------------------------- |
| API tests              | 3 files, 14 tests passed                            |
| Web helper tests       | 2 files, 13 tests passed                            |
| Rust client-crypto     | 6 tests passed                                      |
| Total non-load tests   | 33 passed, zero failed                              |
| TypeScript             | Both API and web workspaces passed                  |
| Production web build   | Passed; 551 modules transformed                     |
| Wasm asset             | 161.80 kB; 61.25 kB gzip                            |
| Main JavaScript bundle | 747.75 kB; 236.12 kB gzip; Vite over-500 kB warning |

The bundle warning remains a documented performance follow-up rather than being hidden by the
passing build.

## Load and replay evidence

The public repository commits three guarded Artillery profile files exposed through four run
commands: read smoke, one-user protocol debug, ten-user protocol regression, and
replay/idempotency behavior. They refuse non-loopback HTTP or Solana targets, redirects, and proxy
environments. The stateful profiles exercise the actual local validator, TurboPass, PostgreSQL,
DynamoDB Local, SMTP/Mailpit, browser-compatible Wasm, and final on-chain balance checks.

The implementation session recorded:

| Profile       | Observed session result                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| Read smoke    | 20 users, 40/40 requests, zero failures, aggregate p95/p99 approximately 7 ms                               |
| Full protocol | 10/10 independent users, 90/90 requests, zero failed users, p95 about 1.2 s, p99 about 1.3 s, balances pass |
| Idempotency   | 4-way deposit race: one 201 + three expected 409; four stable post-success replays per later boundary       |

Evidence precision matters:

- no Artillery JSON result is committed, so the exact observations have no retained, independently
  auditable result artifact and must not be treated as a capacity benchmark;
- only initial deposit reservation is raced while in flight; and
- deposit confirmation, transfer completion, coupon issuance, and payout are four concurrent
  replays after the successful transition, not winner/loser in-flight races.

## Recorded implementation corrections

The article preserves the important build failures and corrections:

1. An initial `wasm-pack` attempt failed and a later attempt succeeded.
2. Strict Clippy separately failed, was fixed rather than suppressed, and passed; generated Wasm
   was ultimately verified against the Rust API.
3. A broad `.gitignore` pattern hid the generated Wasm package until an explicit allowlist was
   added.
4. Browser issuer-key verification was hardened while retaining the independent-manifest caveat.
5. Issuer retention was bounded for the disposable demo rather than implying a live rotation
   system.
6. Documentation stopped claiming generic ZKP or VOPRF interoperability.
7. Persistent local volumes were reset while iterating.
8. Port 3000 was occupied during the final walkthrough, so the run used port 3300.
9. The initial browser-automation step timed out; after inspecting the current page state, the
   walkthrough continued without weakening the protocol assertions.

## Implementation plan and acceptance gates

The website release sequence is:

1. Update the CryptoPal pin to the recorder commit and incorporate the remaining shared-session
   evidence without treating chat prose as code proof.
2. Add the H.264 delivery asset, WebP poster, native player, visual transcript, provenance hashes,
   and explicit privacy boundary.
3. Copy shared media into the static export and standalone Payload image, then add immutable Render
   caching and an explicit same-origin CSP media policy.
4. Extend unit and export coverage for the new pin, player semantics, transcript, exact media size
   and hash, Docker public assets, and Blueprint headers.
5. Run formatting, focused tests, site type checks, full root verification, Payload production
   build, fixture static export, and export verifier.
6. Publish through the existing checks-gated GitHub and Render Static Site workflow.
7. Verify the production article and media response, then record the website commit, CI/CodeQL
   result, Render deployment, generated route count, and public acceptance below.

No Payload schema or prototype record is required. Build Notes remain the intentionally narrow
Git-authored exception defined by ADR-020, while Payload continues to own general editorial content.

## Production acceptance

Production acceptance completed on August 30, 2026.

The article shipped in website feature commit `1a23ef5`. Its first clean GitHub CI run exposed a
real packaging gap that the warm local Next.js workspace had masked: root TypeScript did not know
the `.webp` static-image module before Next generated its local type file. Follow-up commit
`3d5ea1e` added the source-controlled declaration. The same root typecheck and lint then passed
locally, and the replacement clean release gates completed successfully:

- CI run `33326503438` passed install, root and static-site typechecks, lint, 163 active automated
  tests, the Payload production build, and the fixture static export;
- CodeQL run `33326503034` passed both Actions and JavaScript/TypeScript analysis; and
- Render Static Site deploy `dep-daa6t8n10e5c73bjntl0` built commit `3d5ea1e`, fetched reviewed
  Payload content revision `2e8da5a6f350` with five prototypes, generated 23 static pages, verified
  static SEO and brand assets plus five Build Notes and five prototype routes, and reported the site
  live at 1:58:08 PM EDT.

Public acceptance at
`https://saberistic.com/build-notes/cryptopal-wallet-email-wallet/` confirmed:

- the production route returns HTTP 200 with the expected page title, H1, and canonical URL;
- all three immutable repository pins and the article's source-linked code references are present;
- four accessible inline SVG diagrams and the statically dimensioned owner-supplied image render;
- the page emits no browser console errors or warnings;
- the homepage journal, Build Notes index, RSS feed, and sitemap all contain the CryptoPal slug; and
- the local-demo, session-evidence, privacy, custody, interoperability, and Solana-only boundaries
  remain visible in the public output.

## Next CryptoPal engineering work

1. Authenticate and independently pin a globally shared issuer-key manifest.
2. Add reviewed custody, reconciliation, withdrawal policy, proof-of-reserve expectations, refunds,
   recovery, rate limiting, abuse controls, and compliance decisions.
3. Add transactional outboxes and workers for email and payout side effects, plus crash-window and
   reconciliation tests.
4. Retain machine-readable end-to-end and replay results and introduce true in-flight transition
   races at every state boundary.
5. Split or modernize the current Solana wallet bundle before a production web target.
6. Specify and implement one additional chain adapter only after its finality, asset, address,
   replay, and recovery model is explicit.
7. Complete independent protocol, cryptographic, dependency, and application security review before
   using real funds.
