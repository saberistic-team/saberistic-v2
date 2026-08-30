import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  FfiBridgeDiagram,
  LocalStackDiagram,
  TemporalBoundaryDiagram,
  TokenLifecycleDiagram,
} from '@/components/build-notes/TurboPassDiagrams'

const commit = 'f18da5682c80fb1afe08348187e4c2f39bd4714a'
const repository = 'https://github.com/saberistic-team/turbopass'
const source = (path: string, anchor = '') => `${repository}/blob/${commit}/${path}${anchor}`

const legacyServerCommit = '69915521ce22529824cced19c69f83ce100bcea0'
const legacyServer = 'https://github.com/brave-intl/challenge-bypass-server'
const ffiCommit = '450ec6bab8472c95e4ecadf8a3ef9d38f7073fe2'
const ffiRepository = 'https://github.com/brave-intl/challenge-bypass-ristretto-ffi'

const rebuildContract = `keep:
  - documented v1 / v2 / v3 HTTP behavior, with listed gaps
  - PostgreSQL and DynamoDB records
  - token, key, proof, and signature encodings
  - challenge-bypass-ristretto 2.1.0

replace:
  - Go + cgo server runtime → native Rust
  - in-process rotation cron → Temporal Schedule + worker

do_not:
  - redesign the protocol
  - move all state into a new database`

const legacyBridge = `// Condensed control flow—not the cryptographic algorithm.
runtime.LockOSThread()
defer runtime.UnlockOSThread()

result := C.fallible_crypto_call(...)
if result == nil {
    // A second C call must read Rust's thread-local LAST_ERROR
    return wrapLastError()
}`

const directDependency = `[dependencies]
challenge-bypass-ristretto = { version = "=2.1.0", features = ["base64"] }`

const nativeIssue = `let signing_key = decode_signing_key(encoded_signing_key)?;
let signed_tokens = blinded_tokens
    .iter()
    .map(|token| signing_key.sign(token).map_err(CryptoError::Sign))
    .collect::<Result<Vec<_>, _>>()?;

let mut rng = OsRng;
let proof = BatchDLEQProof::new::<Sha512, _>(
    &mut rng,
    blinded_tokens,
    &signed_tokens,
    &signing_key,
)
.map_err(CryptoError::CreateProof)?;`

const cryptoBoundary = `let permit = crypto_slots.acquire_owned().await?;

tokio::task::spawn_blocking(move || {
    // The permit stays with the synchronous work until it really finishes.
    operation().map(|result| (permit, result))
})
.await?`

const publicLifecycle = `# 1. The client blinds a batch locally.

# 2. One synchronous issuance call returns signed tokens + proof.
POST /v1/blindedToken/{type}  # v1
POST /v2/blindedToken/{type}  # v2 and compatible v3 issuance

# 3. The client verifies the proof and unblinds locally.

# 4. One synchronous redemption call per token.
POST /v1/blindedToken/{type}/redemption  # v1 and v2
POST /v3/blindedToken/{type}/redemption  # v3`

const storageSplit = `PostgreSQL
├── v3_issuers       # issuer configuration
├── v3_issuer_keys   # signing and public keys
└── redemptions      # v1 replay records

DynamoDB
├── configured primary table   # v2/v3 writes + reads
└── optional legacy table      # coexistence reads only
    shared item contract:
    ├── id            (partition key, UUID v5)
    ├── issuerId
    ├── preImage
    ├── timestamp
    ├── payload       (S, or NULL when empty)
    ├── TTL           (case-sensitive numeric attribute)
    └── offset`

const conditionalRedemption = `client
    .put_item()
    .table_name(table)
    .set_item(Some(item))
    .condition_expression("attribute_not_exists(id)")
    .return_values_on_condition_check_failure(AllOld)
    .send()
    .await`

const temporalWorkflow = `#[workflow_methods]
impl IssuerRotationWorkflow {
    #[run(name = "turbopass.rotate-issuer-keys.v1")]
    pub async fn run(
        context: &mut WorkflowContext<Self>,
        input: RotationWorkflowInput,
    ) -> WorkflowResult<RotationReport> {
        if input.schema_version != ROTATION_SCHEMA_VERSION {
            return Err(ApplicationFailure::non_retryable(anyhow!(
                "unsupported issuer rotation input schema version"
            )).into());
        }

        let workflow_time = context.workflow_time().ok_or_else(|| {
            ApplicationFailure::non_retryable(anyhow!(
                "Temporal workflow time is unavailable"
            ))
        })?;
        let activity_input = RotationActivityInput {
            rotation_id: context.workflow_id().to_owned(),
            cutoff: DateTime::<Utc>::from(workflow_time),
            mode: input.mode,
        };

        let report = context
            .execute_activity(
                IssuerRotationActivities::rotate_key_horizon,
                activity_input,
                rotation_activity_options(),
            )
            .await?;
        Ok(report)
    }
}`

const rotationTransaction = `for issuer_id in due_issuers {
    let mut transaction = pool.begin().await?;

    // Re-read and lock this issuer inside the retry boundary.
    let issuer = select_issuer_for_update(&mut transaction, issuer_id).await?;
    let missing = recompute_missing_horizon(&mut transaction, &issuer, cutoff).await?;

    for window in missing {
        let pair = generate_key_pair();
        insert_contiguous_key(&mut transaction, &issuer, window, pair).await?;
    }

    transaction.commit().await?;
}`

const localCommands = `# Start PostgreSQL, DynamoDB Local, Temporal, API, worker, and schedules.
make compose-up

# Run one complete virtual user through each v1/v2/v3 lifecycle.
make loadtest-smoke

# Run the default one-minute mixed lifecycle load.
make loadtest

# Exercise a 32-token batch with RFC 9497 redemption derivation.
TOKEN_BATCH_SIZE=32 TOKEN_DERIVATION=rfc9497 make loadtest`

const repositoryTree = `turbopass/
├── src/
│   ├── api.rs              # compatible routes + bounded native crypto
│   ├── crypto.rs           # thin policy over the upstream crate
│   ├── storage.rs          # PostgreSQL + DynamoDB contracts
│   ├── rotation.rs         # workflow, activity, retries, schedules
│   └── bin/
│       ├── api.rs
│       ├── worker.rs
│       ├── schedule.rs
│       └── load-client.rs  # test-only native client helper
├── migrations/             # repeatable create-if-missing SQL baseline
├── infra/dynamodb/         # local table initialization
├── loadtest/               # Artillery scenarios + processor
├── compose.yaml            # complete disposable topology
└── docs/
    ├── RESEARCH.md
    ├── ARCHITECTURE.md
    └── COMPATIBILITY.md`

const verification = `$ cargo test --all-features --locked
# 56 total: 49 library + 3 load-client + 2 schedule + 2 worker

$ cargo fmt --all -- --check
# exit 0

$ cargo clippy --all-targets --all-features --locked -- -D warnings
# exit 0

$ cargo check --all-targets --no-default-features --locked
# exit 0`

const compatibilityRows = [
  ['HTTP', 'v1/v2/v3 paths, JSON fields, status codes, trailing slash, auth, limits'],
  ['Crypto', 'same crate/version, encodings, proof behavior, derivation order, identity rejection'],
  ['PostgreSQL', 'existing issuer, key, and v1 redemption tables; year-one sentinel normalized'],
  ['DynamoDB', 'same UUID derivation, attributes, TTL, conditional insertion, fallback reads'],
  [
    'Rotation',
    'same key-window semantics, now with locks, bounded retries, and poisoned-issuer isolation',
  ],
] as const

const productionGates = [
  [
    'Temporal maturity',
    'Rust SDK 0.7.0 is Public Preview and pinned exactly.',
    'Replay captured histories, version workflow behavior, then canary the worker separately.',
  ],
  [
    'Real infrastructure',
    'The development session records a complete local pass, but the public repository commits no service logs or load report.',
    'Repeat against production-shaped managed services, credentials, limits, and failure modes.',
  ],
  [
    'PostgreSQL baseline',
    'The migration creates final tables when absent; it does not backfill older issuer tables or validate an existing same-named schema.',
    'Audit and rehearse the exact schema, confirm any backfill, and pre-apply DDL or grant first-run migration rights.',
  ],
  [
    'DynamoDB cutover',
    'A legacy-table read and primary-table conditional write cannot be atomic across two tables.',
    'Fence and drain legacy writers, verify every writer targets the primary table, then enable TurboPass writes.',
  ],
  [
    'Kafka / Avro',
    'The legacy schema and generated Go field name disagree.',
    'Capture authoritative registry subjects and real messages before porting the consumer.',
  ],
  [
    'Cryptographic assurance',
    'Selected vectors and compatibility tests provide preservation evidence, not a differential proof or independent audit.',
    'Run Go-versus-Rust tests, retain the upstream caveat, and obtain review appropriate to production risk.',
  ],
  [
    'Performance',
    'The repository contains a load harness but no committed capacity report.',
    'Save reproducible reports and production-shaped batch distributions before publishing numbers.',
  ],
  [
    'Observability',
    'Core metrics exist, but TurboPass does not reproduce every legacy database/crypto histogram and operation counter.',
    'Map dashboards and alerts to the new metric contract before canarying traffic or rotation.',
  ],
] as const

export function TurboPassArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / THE REBUILD BRIEF</p>
        <h2>I started with “the per-thread bridge thingy.”</h2>
        <p className="article-lede">
          I had worked on Brave’s Challenge Bypass server before, and I remembered a constraint at
          the boundary between its Go service and Rust Ristretto implementation. I did not remember
          the precise mechanism. That uncertainty became the first research task—not a license to
          rewrite the cryptography.
        </p>
        <p>
          The brief was deliberately conservative: create a new repository, preserve the documented
          deployed API and storage contract—with explicit gaps—use the same Rust cryptography
          directly, and move issuer-key rotation into Temporal’s Rust SDK. The existing server clone
          would remain untouched.
        </p>
        <CodeBlock code={rebuildContract} label="The implementation contract" language="yaml" />
        <ArticleCallout title="The thesis">
          <p>
            TurboPass changes the execution boundary and the rotation machinery. It does not claim a
            new token protocol. The strongest result is that the cryptographic behavior stayed
            pinned while the accidental Go/cgo constraint disappeared.
          </p>
        </ArticleCallout>
      </section>

      <section id="archaeology">
        <p className="eyebrow">02 / REPOSITORY ARCHAEOLOGY</p>
        <h2>The real system was wider than “a server backed by DynamoDB.”</h2>
        <p>
          I traced behavior at legacy server commit <code>{legacyServerCommit.slice(0, 7)}</code>,
          rather than treating the original Privacy Pass sample as the current contract. Brave’s
          fork had accumulated three HTTP generations, PostgreSQL issuer and key state, two
          redemption stores, authentication, metrics, Kafka/Avro paths, and two rotation loops.
        </p>
        <p>
          My prior familiarity with the repository is also public: in{' '}
          <a
            href="https://github.com/brave-intl/challenge-bypass-server/commit/3b20a67128d97a0eb093cdb6c8deb3d4e3798a9f"
            rel="external"
          >
            upstream commit <code>3b20a67</code>
          </a>
          , I hoisted issuer retrieval out of the redemption-item loop. That establishes a specific
          earlier contribution to the server; it does not imply authorship of the FFI, replay
          design, or this Temporal architecture.
        </p>
        <p>
          That changed the architecture immediately. “Use the same DynamoDB” was only partly true:
          DynamoDB held v2/v3 replay records, while PostgreSQL held issuers, signing keys, and v1
          redemption records. Moving all of that state would have broken direct coexistence with the
          Go service and required a separate replication and cutover plan.
        </p>
        <div className="reference-grid">
          <article>
            <p className="eyebrow">BEHAVIORAL BASELINE</p>
            <h3>
              <a href={`${legacyServer}/tree/${legacyServerCommit}`} rel="external">
                Challenge Bypass Server <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>
              Routes, handlers, storage queries, environment names, rotation jobs, and edge cases.
            </p>
          </article>
          <article>
            <p className="eyebrow">BRIDGE BASELINE</p>
            <h3>
              <a href={`${ffiRepository}/tree/${ffiCommit}`} rel="external">
                Ristretto FFI <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>
              The Rust C exports, Go wrappers, thread-local error slot, and exact direct crate pin.
            </p>
          </article>
          <article>
            <p className="eyebrow">CRYPTOGRAPHIC BASELINE</p>
            <h3>
              <a
                href="https://github.com/brave-intl/challenge-bypass-ristretto/tree/v2.1.0"
                rel="external"
              >
                Ristretto 2.1.0 <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>
              The unchanged signing, proof, encoding, derivation, and verification implementation.
            </p>
          </article>
          <article>
            <p className="eyebrow">ORCHESTRATION BASELINE</p>
            <h3>
              <a href="https://github.com/temporalio/sdk-rust" rel="external">
                Temporal Rust SDK <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>Durable workflow/activity execution and Schedules, with a Public Preview caveat.</p>
          </article>
        </div>
        <ArticleCallout title="Research rule">
          <p>
            Where the remembered explanation, development transcript, and public repository
            differed, pinned source behavior won. The resulting research, architecture, and
            compatibility notes are committed beside the implementation.
          </p>
        </ArticleCallout>
      </section>

      <section id="ffi-bridge">
        <p className="eyebrow">03 / THE BRIDGE</p>
        <h2>The thread restriction belonged to error transport, not Ristretto.</h2>
        <p>
          The Rust FFI crate stores its latest error in a <code>thread_local! LAST_ERROR</code>{' '}
          slot. On a sentinel failure, an exported operation can set that slot and Go makes a
          separate C call to retrieve and clear the message. A goroutine is not guaranteed to resume
          on the same operating-system thread between those calls.
        </p>
        <p>
          The Go wrapper therefore pins each fallible operation with{' '}
          <code>runtime.LockOSThread</code> and later unlocks it. The pinned FFI version contains 38
          such lock/unlock pairs across 38 exported Go crypto wrapper operations. Batch issuance can
          cross that boundary repeatedly for signing and proof work; rotation crosses it for key
          generation, serialization, and public-key derivation.
        </p>
        <CodeBlock
          code={legacyBridge}
          label="Condensed legacy bridge control flow"
          language="Go"
          sourceHref={`${ffiRepository}/blob/${ffiCommit}/lib.go#L241-L252`}
        />
        <FfiBridgeDiagram />
        <ArticleCallout title="Precise correction" tone="warning">
          <p>
            The wrappers are constrained per operation. The cryptographic objects are not proven to
            be globally thread-bound, and the design does not serialize all callers behind one
            global lock. Saying “Ristretto only works on one thread” would be inaccurate.
          </p>
        </ArticleCallout>
        <p>
          The two-call mechanism is visible in the pinned{' '}
          <a href={`${ffiRepository}/blob/${ffiCommit}/src/lib.rs#L27-L55`} rel="external">
            Rust error slot and accessors
          </a>
          , the{' '}
          <a href={`${ffiRepository}/blob/${ffiCommit}/lib.go#L36-L43`} rel="external">
            Go error retrieval helper
          </a>
          , and the{' '}
          <a href={`${ffiRepository}/blob/${ffiCommit}/lib.go#L241-L352`} rel="external">
            representative thread-pinned wrappers
          </a>
          .
        </p>
      </section>

      <section id="native-rust">
        <p className="eyebrow">04 / THE NATIVE BOUNDARY</p>
        <h2>Removing the bridge meant calling the same crate directly.</h2>
        <p>
          TurboPass pins <code>challenge-bypass-ristretto</code> to exactly 2.1.0—the version used
          behind the legacy FFI package. Normal Rust <code>Result</code> values now carry errors.
          There is no C ABI, cgo transition, opaque FFI ownership wrapper, finalizer, or
          thread-local error shuttle in the service path.
        </p>
        <CodeBlock
          code={directDependency}
          label="Cargo.toml"
          language="TOML"
          sourceHref={source('Cargo.toml', '#L21-L28')}
        />
        <CodeBlock
          code={nativeIssue}
          label="Native signing and batch-proof construction"
          language="Rust"
          sourceHref={source('src/crypto.rs', '#L119-L148')}
        />
        <p>
          “Direct” does not mean “unbounded.” Curve work is synchronous and CPU-heavy, so the API
          moves it onto Tokio’s blocking pool behind a semaphore sized to advertised host
          parallelism. A timed-out request cannot cancel curve work already running; its permit
          stays attached until that operation actually finishes.
        </p>
        <CodeBlock
          code={cryptoBoundary}
          label="Bounded synchronous cryptography"
          language="Rust"
          sourceHref={source('src/api.rs', '#L346-L382')}
        />
        <ArticleCallout title="What remained unchanged" tone="success">
          <p>
            Token and key encodings, Ristretto/SHA-512 behavior, batch DLEQ proof construction and
            verification, legacy-first redemption derivation, RFC 9497 HashToGroup/finalization
            fallback, identity-point rejection, and the upstream random-key implementation all
            remain delegated to the pinned crate.
          </p>
        </ArticleCallout>
      </section>

      <section id="token-lifecycle">
        <p className="eyebrow">05 / TOKEN LIFECYCLE</p>
        <h2>Blinding stays local; issuance and redemption are synchronous.</h2>
        <p>
          After an issuer exists, there are two kinds of public request and no polling ID. The
          client creates and blinds tokens locally, then sends one batch issuance request. TurboPass
          returns the signed blinded tokens, public key, and batch proof in the response. The client
          verifies that proof, unblinds locally, and constructs the redemption signature.
        </p>
        <CodeBlock code={publicLifecycle} label="Public API lifecycle" language="HTTP" />
        <p>
          Redemption is one request per token. A 32-token batch therefore uses one issuance call
          followed by 32 redemption calls. Temporal does not participate in any of them; it rotates
          the issuer keys that the API later reads.
        </p>
        <TokenLifecycleDiagram />
        <dl className="article-definitions">
          <div>
            <dt>v1 / v2 duplicate</dt>
            <dd>A replay is a conflict and returns HTTP 409.</dd>
          </div>
          <div>
            <dt>v3 same binding</dt>
            <dd>The same token and payload are idempotent and return HTTP 200.</dd>
          </div>
          <div>
            <dt>v3 changed binding</dt>
            <dd>Reusing the token for a different payload returns HTTP 409.</dd>
          </div>
          <div>
            <dt>Test-helper routes</dt>
            <dd>
              <code>/prepare</code> and <code>/complete</code> belong to the private load helper,
              not the public TurboPass API.
            </dd>
          </div>
        </dl>
      </section>

      <section id="compatibility">
        <p className="eyebrow">06 / COMPATIBILITY CONTRACT</p>
        <h2>Compatibility meant observable behavior, not similar endpoint names.</h2>
        <p>
          The implementation targets the documented v1, v2, and v3 route bodies, statuses, optional
          trailing slashes, production bearer authentication, the 1 MiB request-body limit, and the
          60-second request timeout. It also preserves a non-obvious route: v3 issuance still uses
          the compatible v2 blinded-token endpoint, then v3 has its own redemption endpoint. The
          decoder and Kafka gaps below remain explicit exceptions.
        </p>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Boundary</th>
                <th>Preserved contract</th>
              </tr>
            </thead>
            <tbody>
              {compatibilityRows.map(([boundary, contract]) => (
                <tr key={boundary}>
                  <th scope="row">{boundary}</th>
                  <td>{contract}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Reproducing behavior exposed server bugs that could be repaired without changing the wire
          or protocol. A v3 issuer with zero keys could be skipped forever because{' '}
          <code>MAX(end_at)</code> returned NULL. A NULL <code>last_rotated_at</code> could starve
          legacy issuers. The Go service wrote an omitted expiry as SQL year one while treating that
          value as “no expiry” elsewhere.
        </p>
        <div className="bug-ledger">
          <article>
            <span>01</span>
            <div>
              <h3>Zero-key issuers self-heal</h3>
              <p>
                Rotation starts at the greatest of <code>valid_from</code>, the activity cutoff, and
                any historical horizon instead of backfilling expired windows.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Legacy expiry semantics are normalized</h3>
              <p>
                Existing year-one timestamps become no-expiry at the read boundary; new writes use
                SQL NULL.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>Rotation cannot allocate an absurd horizon</h3>
              <p>
                A configured <code>buffer + overlap</code> above 4096 keys fails that issuer before
                allocation or cryptographic work exhausts the worker.
              </p>
            </div>
          </article>
          <article>
            <span>04</span>
            <div>
              <h3>“Overlap” keeps its legacy meaning</h3>
              <p>
                It creates additional contiguous key windows. Renaming it to mean overlapping time
                intervals would break deployed behavior.
              </p>
            </div>
          </article>
        </div>
        <ArticleCallout title="Known narrow gap" tone="warning">
          <p>
            Go’s JSON decoder accepts case-insensitive field names and duplicate known fields with
            the last value winning. TurboPass accepts the documented lowercase names and rejects
            duplicates. Normal clients use the documented form, but this remains a deliberate edge
            difference rather than a hidden claim of byte-for-byte decoder equivalence.
          </p>
        </ArticleCallout>
      </section>

      <section id="storage">
        <p className="eyebrow">07 / STORAGE + REPLAY</p>
        <h2>PostgreSQL owns keys; DynamoDB stores v2/v3 replay markers.</h2>
        <p>
          TurboPass applies repeatable create-if-missing compatibility SQL, then uses the
          legacy-compatible table and attribute contract. That allows Go and Rust processes to
          observe the same issuer horizon during a canary instead of creating two systems of record.
        </p>
        <CodeBlock code={storageSplit} label="Preserved persistence split" language="text" />
        <p>
          DynamoDB replay prevention is not a read-then-write transaction. In one table and Region,
          a conditional <code>PutItem</code> with <code>attribute_not_exists(id)</code> admits one
          writer for that exact partition key while the marker exists. On a conditional failure, the
          existing payload distinguishes an equivalent v3 binding from reuse against a different
          payload. Multi-Region Global Table behavior would require separate validation.
        </p>
        <CodeBlock
          code={conditionalRedemption}
          label="Conditional replay-marker insertion"
          language="Rust"
          sourceHref={source('src/storage.rs', '#L956-L991')}
        />
        <ArticleCallout title="DynamoDB TTL is not immediate deletion">
          <p>
            <code>TTL</code> is a case-sensitive numeric attribute. DynamoDB’s sweeper is
            asynchronous, so an expired item can remain present and therefore remain redeemed until
            deletion; after physical deletion, the same key can be accepted again. For an issuer
            without an expiry, the compatible fallback is six calendar months, so token/key
            acceptance must end sooner or retention must change. The local initializer only attempts
            TTL enablement and tolerates failure; production must verify both enablement and the
            complete retention invariant.
          </p>
        </ArticleCallout>
        <p>
          Reads try the configured primary table and fall back to the legacy table only after a
          miss. Before a primary write, TurboPass performs a strongly consistent legacy read so a
          historical token cannot simply be replayed into the new table. The read and write cannot
          be atomic across two tables: a legacy writer can land after the pre-read. The cutover must
          fence and drain legacy writers, verify every writer uses the primary table, and only then
          enable TurboPass writes.
        </p>
      </section>

      <section id="temporal-boundary">
        <p className="eyebrow">08 / TEMPORAL’S JOB</p>
        <h2>Temporal owns rotation, not the public request path.</h2>
        <p>
          One Rust codebase produces three operational processes. <code>turbopass-api</code> serves
          compatible HTTP and metrics. <code>turbopass-worker</code> runs the rotation workflow and
          activity. <code>turbopass-schedule</code> is a one-shot reconciler that creates or updates
          stable Schedules, then exits.
        </p>
        <p>
          The v3 horizon schedule runs every minute; legacy v1/v2 rotation and v3 pruning run
          hourly. Both use overlap policy <code>Skip</code>, so a tick that overlaps a running sweep
          is discarded rather than queued; recovery relies on a later horizon-reconciliation run.
          The catch-up window is one interval and failures do not pause future runs, so outages are
          not an unlimited backlog. Each action starts a short workflow instead of growing an
          endless history or coupling API startup to a cron loop.
        </p>
        <CodeBlock
          code={temporalWorkflow}
          label="A deliberately small deterministic workflow"
          language="Rust"
          sourceHref={source('src/rotation.rs', '#L470-L508')}
        />
        <TemporalBoundaryDiagram />
        <ArticleCallout title="Private keys do not belong in workflow history" tone="success">
          <p>
            Workflow inputs contain a schema version and rotation mode. Outputs contain the rotation
            ID, cutoff, and aggregate counters. Database work, wall-clock reads, randomness, and key
            generation happen in the activity. Signing keys persist in PostgreSQL and enter API or
            worker process memory; only secret-free inputs, aggregate outputs, and sanitized
            failures cross the Temporal history boundary.
          </p>
        </ArticleCallout>
      </section>

      <section id="rotation-activity">
        <p className="eyebrow">09 / RETRY-SAFE ROTATION</p>
        <h2>The transaction—not the workflow—is the idempotency boundary.</h2>
        <p>
          Temporal activities are at-least-once. A worker can commit work and lose its response,
          causing the activity to run again. Rotation is safe because each issuer is re-read and
          locked inside its own PostgreSQL transaction, then the missing horizon is recomputed
          before any insert.
        </p>
        <CodeBlock
          code={rotationTransaction}
          label="Condensed per-issuer activity boundary"
          language="Rust"
          sourceHref={source('src/storage.rs', '#L679-L705')}
        />
        <p>
          For the same effective cutoff and unchanged issuer state, a committed issuer transaction
          is normally a no-op on retry; otherwise the retry recomputes and fills only the newly
          missing horizon. That issuer’s uncommitted inserts roll back. An activity attempt can
          still commit earlier issuers before a later retryable failure, so counters from the final
          successful attempt can omit work committed earlier. A poisoned issuer does not roll back
          healthy issuers or pruning, but the final sweep returns a non-retryable activity error,
          the workflow fails, and no report is returned. Transient database failures receive a
          bounded six-attempt policy with capped backoff.
        </p>
        <ol className="article-steps">
          <li>
            <span>01</span>
            <div>
              <h3>Discover due IDs without carrying secrets</h3>
              <p>The activity scans candidates and processes each issuer independently.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Lock and re-evaluate</h3>
              <p>Another worker’s committed horizon becomes visible before this attempt writes.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Generate contiguous windows</h3>
              <p>
                Native Rust creates missing keys and derives public keys inside the transaction.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Commit once, report aggregates</h3>
              <p>PostgreSQL is the key source of truth; Temporal receives only safe counters.</p>
            </div>
          </li>
        </ol>
        <ArticleCallout title="One subtle clock decision">
          <p>
            The workflow’s deterministic timestamp is a lower bound. When the activity actually
            runs, it clamps that cutoff forward to the later wall-clock time. That avoids
            backfilling short key windows that already expired while waiting in the task queue,
            without reading a nondeterministic clock in workflow code.
          </p>
        </ArticleCallout>
      </section>

      <section id="full-stack">
        <p className="eyebrow">10 / COMPLETE LOCAL STACK</p>
        <h2>The second pass turned separate services into one reproducible system.</h2>
        <p>
          The initial implementation passed Rust checks and a disposable PostgreSQL/API smoke test,
          but local DynamoDB and Temporal integration were still gates. I then added a Compose
          environment containing PostgreSQL, DynamoDB Local and its initializer, Temporal’s dev
          server, the API, worker, one-shot scheduler, native load client, and Artillery.
        </p>
        <LocalStackDiagram />
        <CodeBlock
          code={localCommands}
          label="Bring up and exercise the system"
          language="shell"
          sourceHref={source('loadtest/README.md', '#L29-L55')}
        />
        <p>
          The core stack binds development ports to loopback and persists three Docker volumes. The
          scheduler exiting successfully is expected: its job is to reconcile the two Schedules,
          while the API and worker keep running. Development credentials and the Temporal dev server
          make this a disposable integration environment—not a production deployment file.
        </p>
        <ArticleCallout title="Migration order matters" tone="warning">
          <p>
            The API applies the embedded SQL migration before it opens its listeners; the worker
            does not. Production order is migration-capable API, then worker, then Schedule
            reconciliation. The SQL creates final tables when absent; it does not backfill older
            issuer tables, repair a conflicting shape, or validate existing columns, indexes, and
            types. Audit the exact baseline, confirm any backfill, and rehearse privileged DDL
            against a snapshot first. Schedule create then update is also two RPCs, not an atomic
            concurrent-installer guarantee.
          </p>
        </ArticleCallout>
        <CodeBlock
          code={repositoryTree}
          label="Public repository map"
          language="text"
          sourceHref={`${repository}/tree/${commit}`}
        />
      </section>

      <section id="load-testing">
        <p className="eyebrow">11 / LIFECYCLE LOAD TESTING</p>
        <h2>Artillery drives HTTP; Rust keeps the client cryptography real.</h2>
        <p>
          A useful load test had to do more than hit health endpoints. Each virtual user creates an
          issuer, blinds tokens, requests issuance, verifies the batch proof, unblinds, signs a
          redemption payload, and redeems every token. The three scenarios cover the actual v1, v2,
          and v3-compatible route combinations.
        </p>
        <p>
          I did not reimplement the client cryptography in JavaScript. A test-only Rust helper uses
          the same pinned crate, keeps original token and blinding state in memory, and exposes a
          one-use opaque handle. Handles expire after five minutes and are consumed on completion.
          Compose publishes the helper to the host only on <code>127.0.0.1</code>; it is also
          reachable to Artillery on the private Compose network. It must never become a public
          service.
        </p>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Lifecycle</th>
                <th>Create</th>
                <th>Issue</th>
                <th>Redeem</th>
                <th>Replay store</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">v1</th>
                <td>
                  <code>POST /v1/issuer</code>
                </td>
                <td>
                  <code>POST /v1/blindedToken/:type</code>
                </td>
                <td>
                  <code>POST /v1/…/redemption</code>
                </td>
                <td>PostgreSQL</td>
              </tr>
              <tr>
                <th scope="row">v2</th>
                <td>
                  <code>POST /v2/issuer</code>
                </td>
                <td>
                  <code>POST /v2/blindedToken/:type</code>
                </td>
                <td>
                  <code>POST /v1/…/redemption</code>
                </td>
                <td>DynamoDB</td>
              </tr>
              <tr>
                <th scope="row">v3</th>
                <td>
                  <code>POST /v3/issuer</code>
                </td>
                <td>
                  <code>POST /v2/blindedToken/:type</code>
                </td>
                <td>
                  <code>POST /v3/…/redemption</code>
                </td>
                <td>DynamoDB</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ArticleCallout title="What the session established—and what it did not" tone="warning">
          <p>
            The recorded development run completed v1/v2/v3 smoke lifecycles with zero failed
            virtual users, and a three-token batch using the RFC 9497 HashToGroup/finalization
            redemption derivation issued and redeemed all three tokens. This stays inside the legacy
            JSON/base64 API; it is not a claim of standardized Privacy Pass wire compatibility. No
            performance report is committed, so this is session-recorded functional evidence—not a
            public throughput, latency, or scalability result.
          </p>
        </ArticleCallout>
      </section>

      <section id="verification">
        <p className="eyebrow">12 / VERIFIED RESULT</p>
        <h2>What public source and the recorded development session substantiate.</h2>
        <div className="article-metrics" aria-label="Verified TurboPass repository metrics">
          <div>
            <strong>37</strong>
            <span>tracked files</span>
          </div>
          <div>
            <strong>3</strong>
            <span>runtime processes</span>
          </div>
          <div>
            <strong>9</strong>
            <span>Compose services</span>
          </div>
          <div>
            <strong>56 / 56</strong>
            <span>Rust tests passing</span>
          </div>
        </div>
        <CodeBlock
          code={verification}
          label="Consolidated independent repository verification"
          language="text"
        />
        <p>
          I independently cloned public commit <code>{commit.slice(0, 7)}</code> and reran its
          locked checks. The same SHA also has a passing{' '}
          <a
            href="https://github.com/saberistic-team/turbopass/actions/runs/33315724086"
            rel="external"
          >
            hosted CI run
          </a>{' '}
          and{' '}
          <a
            href="https://github.com/saberistic-team/turbopass/actions/runs/33315725207"
            rel="external"
          >
            CodeQL setup run
          </a>
          . Separately, the private development record reports the complete Compose stack becoming
          healthy, both Schedules being created, workflow and activity pollers running, PostgreSQL
          receiving v1 redemption state, and DynamoDB receiving v2/v3 state. Those service logs and
          load reports are not committed, so this is session evidence rather than independently
          reproducible evidence at the public SHA.
        </p>
        <p>
          Before the full stack existed, a narrower PostgreSQL/API smoke test confirmed the
          migration ledger, v1 and v3 issuer creation, one v1 key, the expected three-key v3
          horizon, and zero discontinuities between v3 windows. Those checks were useful because
          they inspected durable state rather than trusting only HTTP 200 responses.
        </p>
        <ArticleCallout title="One public commit, two implementation phases">
          <p>
            The repository was pushed after the server/rotation phase and the full-stack/load-test
            phase were complete. The public history therefore contains one consolidated initial
            commit, not a commit-by-commit replay of the development conversation.
          </p>
        </ArticleCallout>
      </section>

      <section id="production-gates">
        <p className="eyebrow">13 / CURRENT TRUTH</p>
        <h2>A complete local system is not yet a production migration.</h2>
        <p>
          TurboPass is a working compatibility implementation with an end-to-end local harness. Its
          remaining risks sit at rollout boundaries: SDK maturity, production histories, SQL
          baselines, two-table coexistence, an ambiguous Kafka schema, metric migration,
          cryptographic review, and workload evidence.
        </p>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Gate</th>
                <th>Current evidence</th>
                <th>Required next proof</th>
              </tr>
            </thead>
            <tbody>
              {productionGates.map(([gate, current, next]) => (
                <tr key={gate}>
                  <th scope="row">{gate}</th>
                  <td>{current}</td>
                  <td>{next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ArticleCallout title="Temporal risk control" tone="warning">
          <p>
            The official Rust SDK still describes itself as Public Preview, and v0.7.0 does not
            promise compatibility across releases. TurboPass pins every Temporal crate to exactly
            0.7.0, commits the lockfile, isolates SDK types, and keeps the workflow small. Captured
            history replay and a separately canaried worker remain release requirements.
          </p>
        </ArticleCallout>
        <p>
          The upstream cryptography project also describes its security contract as work in progress
          and not audited. Reuse avoids an accidental protocol fork; it does not create a new
          security assurance. Any move toward RFC 9578 or the{' '}
          <a
            href="https://datatracker.ietf.org/doc/draft-ietf-privacypass-batched-tokens/"
            rel="external"
          >
            active batched-token Internet-Draft
          </a>{' '}
          belongs in a new protocol version because their ciphersuites and binary framing are not
          transparent replacements for this deployed JSON/base64 Ristretto API.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">14 / FILE GUIDE</p>
        <h2>Where to read the implementation.</h2>
        <div className="file-guide">
          <article>
            <p className="eyebrow">START WITH THE WHY</p>
            <h3>Research and contracts</h3>
            <ul>
              <li>
                <a href={source('docs/RESEARCH.md')} rel="external">
                  Research findings
                </a>
              </li>
              <li>
                <a href={source('docs/ARCHITECTURE.md')} rel="external">
                  Architecture contract
                </a>
              </li>
              <li>
                <a href={source('docs/COMPATIBILITY.md')} rel="external">
                  Compatibility and rollout
                </a>
              </li>
              <li>
                <a href={source('README.md')} rel="external">
                  Operator quick start
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">REQUEST PATH</p>
            <h3>Follow a token</h3>
            <ul>
              <li>
                <a href={source('src/api.rs')} rel="external">
                  HTTP routes and handlers
                </a>
              </li>
              <li>
                <a href={source('src/crypto.rs')} rel="external">
                  Native cryptography boundary
                </a>
              </li>
              <li>
                <a href={source('src/storage.rs')} rel="external">
                  PostgreSQL and DynamoDB
                </a>
              </li>
              <li>
                <a href={source('migrations/0001_legacy_compatible_schema.sql')} rel="external">
                  Compatibility migration
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">BACKGROUND WORK</p>
            <h3>Follow a rotation</h3>
            <ul>
              <li>
                <a href={source('src/rotation.rs')} rel="external">
                  Workflow, activity, retries
                </a>
              </li>
              <li>
                <a href={source('src/bin/worker.rs')} rel="external">
                  Worker lifecycle
                </a>
              </li>
              <li>
                <a href={source('src/bin/schedule.rs')} rel="external">
                  Schedule reconciliation
                </a>
              </li>
              <li>
                <a href={source('src/domain.rs')} rel="external">
                  Secret-redacting domain types
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">PROVE THE LIFECYCLE</p>
            <h3>Run the local stack</h3>
            <ul>
              <li>
                <a href={source('compose.yaml')} rel="external">
                  Compose topology
                </a>
              </li>
              <li>
                <a href={source('loadtest/lifecycle.yml')} rel="external">
                  Artillery scenarios
                </a>
              </li>
              <li>
                <a href={source('loadtest/processor.cjs')} rel="external">
                  Lifecycle orchestration
                </a>
              </li>
              <li>
                <a href={source('src/bin/load-client.rs')} rel="external">
                  Native client helper
                </a>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">15 / WHAT IS NEXT</p>
        <h2>The next milestone is migration evidence, not more architecture.</h2>
        <ol className="next-list">
          <li>
            <span>01</span>
            <strong>
              Capture representative Go responses and run differential HTTP contract tests.
            </strong>
          </li>
          <li>
            <span>02</span>
            <strong>
              Replay real Temporal histories before changing the pinned SDK or workflow commands.
            </strong>
          </li>
          <li>
            <span>03</span>
            <strong>
              Exercise production-shaped PostgreSQL and DynamoDB limits, failures, and table
              cutover.
            </strong>
          </li>
          <li>
            <span>04</span>
            <strong>
              Resolve the authoritative Kafka/Avro schema from deployed registry evidence.
            </strong>
          </li>
          <li>
            <span>05</span>
            <strong>
              Commit reproducible load reports before making capacity or latency claims.
            </strong>
          </li>
        </ol>
        <p className="article-lede">
          The breakthrough was locating the boundary precisely: the same cryptography called
          directly, the same state kept where it belongs, and rotation made explicit, retryable, and
          observable.
        </p>
      </section>

      <section id="sources">
        <p className="eyebrow">PRIMARY SOURCES</p>
        <h2>Evidence used for this note.</h2>
        <ul className="source-list">
          <li>
            <a href={`${repository}/tree/${commit}`} rel="external">
              TurboPass at verified commit {commit.slice(0, 7)}
            </a>
          </li>
          <li>
            <a href={`${legacyServer}/tree/${legacyServerCommit}`} rel="external">
              Brave Challenge Bypass behavioral baseline
            </a>
          </li>
          <li>
            <a href={`${ffiRepository}/tree/${ffiCommit}`} rel="external">
              Brave Ristretto FFI bridge baseline
            </a>
          </li>
          <li>
            <a
              href="https://github.com/brave-intl/challenge-bypass-ristretto/tree/v2.1.0"
              rel="external"
            >
              Unchanged challenge-bypass-ristretto 2.1.0 crate
            </a>
          </li>
          <li>
            <a href="https://github.com/temporalio/sdk-rust" rel="external">
              Official Temporal Rust SDK repository
            </a>
          </li>
          <li>
            <a href="https://github.com/temporalio/sdk-rust/releases/tag/v0.7.0" rel="external">
              Temporal Rust SDK v0.7.0 release
            </a>
          </li>
          <li>
            <a href="https://docs.temporal.io/schedule" rel="external">
              Temporal Schedules documentation
            </a>
          </li>
          <li>
            <a
              href="https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html"
              rel="external"
            >
              DynamoDB PutItem API
            </a>
          </li>
          <li>
            <a href="https://www.rfc-editor.org/rfc/rfc9497.html" rel="external">
              RFC 9497: VOPRFs
            </a>
          </li>
          <li>
            <a href="https://www.rfc-editor.org/rfc/rfc9578.html" rel="external">
              RFC 9578: Privacy Pass issuance protocol
            </a>
          </li>
          <li>
            <a
              href="https://datatracker.ietf.org/doc/draft-ietf-privacypass-batched-tokens/"
              rel="external"
            >
              IETF batched-token Internet-Draft
            </a>
          </li>
        </ul>
        <p className="article-source-note">
          The user-supplied Codex and shared ChatGPT conversations establish the implementation
          chronology and recorded local integration results. Public source links above establish the
          code and upstream behavior. This note summarizes outcomes and observable evidence; it does
          not reproduce private model deliberation.
        </p>
      </section>
    </>
  )
}
