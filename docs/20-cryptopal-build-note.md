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
- verification and load-test results separated by evidence class; and
- explicit privacy, custody, interoperability, network, reliability, and production boundaries.

Through the existing manifest, the article also enters the Build Notes index, homepage journal,
RSS feed, sitemap, JSON-LD, analytics event path, fixture static export, and public-route verifier.

## Immutable source set

| Source             | Pinned commit                              | Role                                                                      |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------- |
| CryptoPal          | `e41f72319ca5b7d0bd6a5cc3de0ac46bf9f91d4d` | Runnable local application, protocol, tests, and load harness             |
| Original CryptoPal | `de7c055e459167f66f39d56e4feceaa92caf12aa` | 2022 PlantUML, API model, and original receipt/slip/envelope/coupon terms |
| TurboPass          | `f18da5682c80fb1afe08348187e4c2f39bd4714a` | Exact submodule pin providing issuance and authoritative redemption       |

The source URLs are:

- [CryptoPal](https://github.com/saberistic-team/cryptopal);
- [original CryptoPal spec](https://github.com/saberistic/cryptopal-spec); and
- [TurboPass](https://github.com/saberistic-team/turbopass).

The supplied sender-screen image is presentation evidence only. The implementation task is the
source of the browser walkthrough and observed local load results. Because that task did not commit
a video or machine-readable Artillery result, the article labels those claims as session evidence
rather than repository-verifiable results.

The shared ChatGPT link supplied with the request was not used as an independent factual source
because its contents were not retrievable in the build environment. The accessible Codex task,
public repositories, and owner-supplied image provided the required evidence without weakening the
source standard.

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

## Repository verification

Independent verification at CryptoPal commit `e41f723` produced:

| Check                  | Result                                              |
| ---------------------- | --------------------------------------------------- |
| API tests              | 3 files, 14 tests passed                            |
| Web helper tests       | 2 files, 13 tests passed                            |
| Rust client-crypto     | 6 tests passed                                      |
| Total non-load tests   | 33 passed, zero failed                              |
| TypeScript             | Both API and web workspaces passed                  |
| Production web build   | Passed; 550 modules transformed                     |
| Wasm asset             | 161.80 kB; 61.25 kB gzip                            |
| Main JavaScript bundle | 737.17 kB; 233.31 kB gzip; Vite over-500 kB warning |

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

1. Add the immutable Build Note manifest record and article route.
2. Add the four diagrams, supplied screen, image styles, and source-linked prose.
3. Extend unit coverage for metadata bounds, three repository pins, article truth statements,
   code blocks, and accessible diagrams.
4. Add the route to public browser smoke coverage.
5. Run formatting, focused Build Note tests, site type checks, full root verification, Payload
   production build, fixture static export, and export verifier.
6. Inspect the generated public page for title, screenshot, SVG count, source destinations,
   canonical metadata, RSS, and sitemap inclusion.
7. Publish through the existing checks-gated GitHub and Render Static Site workflow.
8. Verify the production route, record the website commit, CI/CodeQL result, Render deployment,
   generated route count, and public acceptance below.

No Payload schema or prototype record is required. Build Notes remain the intentionally narrow
Git-authored exception defined by ADR-020, while Payload continues to own general editorial content.

## Production acceptance

Production evidence will be appended after the checks-gated website release completes. Required
acceptance is:

- the new route returns HTTP 200 from the Render Static Site;
- the route exposes its canonical URL and all three pinned repository actions;
- four diagram regions and the supplied interface image render without layout instability;
- Build Notes index, homepage journal, RSS, and sitemap contain the new note;
- CI and CodeQL pass at the released website commit; and
- the live page preserves the local-demo, session-evidence, privacy, custody, and Solana-only
  boundaries.

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
