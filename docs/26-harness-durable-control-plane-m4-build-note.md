# Harness Platform M4 durable control-plane build note

## Purpose

Build Note 011 documents Harness Platform Stage 1, Milestone 4 at its exact public merge:

- digest-bound immutable task snapshots and idempotent run scheduling;
- storage-clock leases, fencing tokens, expiry, and operator reconciliation;
- PostgreSQL-backed sessions and cursor-based ACP restore;
- awaited evidence publication before model and tool side effects;
- content-addressed S3-compatible artifacts and immutable registry metadata;
- commit-ordered transactional outbox delivery and deterministic JSONL audit export; and
- a default-deny Kubernetes reference topology that cannot become ready and working until its
  environment placeholders are replaced.

This is a sequel to [24](./24-harness-permissioned-agent-services-m3.md), not a replacement. Build
Note 009 remains historically correct at `defbf7b`, where one permissioned agent session could run
behind a WebSocket service but durable restore, distributed ownership, shared artifacts, and a
control plane were still open. Build Note 011 pins the M4 merge `d3b2859`.

## Source authority

| Source                       | Pin or identity                              | What it supports                                                     |
| ---------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| Harness Platform M4 merge    | `d3b2859a48cfb794472d30805ea91b47dc1086d0`   | Authoritative source, tests, docs, and Kubernetes contract           |
| M4 implementation commit     | `fee081ecb8bc0f353f48c21dfc9e94aa53b8ab83`   | One cohesive task implementation before merge                        |
| M3 comparison boundary       | `defbf7bcf72fc72452b4adc81b099f3fc6c523cf`   | Exact before/after diff                                              |
| Harness pull request         | `#2 — M4: durable control plane and scale`   | Public diff, required checks, and merge chronology                   |
| Public PR run-report comment | `pull/2#issuecomment-5483708809`             | 421 tests, 102 allowed paths, zero path violations, and task session |
| Development conversation     | Reviewed, not linked from the public article | Intent, debugging chronology, and release handoff context only       |

The shared conversation is supplementary. Public implementation claims come from the pinned
repository, public report comment, pull request, or the isolated publication audit. The private
shared-chat URL, ephemeral device authorization code, local paths, and authentication episode are
not public evidence and must not appear in the article.

## Exact repository delta and release chronology

```text
defbf7bcf72fc72452b4adc81b099f3fc6c523cf  M3 merge
  ↓
fee081ecb8bc0f353f48c21dfc9e94aa53b8ab83  M4 implementation
  ↓ PR #2; required checks green
d3b2859a48cfb794472d30805ea91b47dc1086d0  verified M4 merge

102 files changed
12,934 insertions
484 deletions
```

The public PR/Git comparison is authoritative. The development page's `120 files, +2,129/-1,160`
summary described a transient editor session and does not represent the committed M3-to-M4 range.

The M4 implementation task deliberately had `network: deny` and `git.push: deny`, with pull request
as its delivery type. The implementation session therefore stopped before commit and push. A
separate release follow-up normalized trailing whitespace, created `fee081e`, authenticated the
GitHub CLI, pushed the task branch, opened PR #2, waited for CI and CodeQL, and merged only after all
required checks passed at `2026-08-31T19:56:11Z`.

## Editorial spine

The article follows one question: **M3 made the run permission-aware; what does M4 preserve when a
process crashes?**

1. **Ownership becomes temporary and fenced.** A worker gets a lease capability and increasing
   fence, not permanent authority.
2. **Uncertainty becomes a state.** An expired leased run can requeue; an expired running run becomes
   `indeterminate` until an operator reconciles it.
3. **Recovery replays evidence, not effects.** ACP restores committed events after a cursor and
   closes an interrupted nonterminal turn rather than repeating it.
4. **State and events commit together.** A transactional outbox prevents a state change from losing
   its canonical event during a crash.
5. **Artifact metadata is immutable and audit progress is monotonic and ordered.** Object bytes,
   registry metadata, and audit checkpoints form one retry-safe evidence chain.
6. **Deployment choices fail closed.** Kubernetes topology is inspectable, but unresolved images,
   storage, Secrets, and executor privileges prevent the base from becoming ready as-is.

The required framing is **production-shaped durable control plane**, not production-proven scale.

## Scheduler and state invariants

Task admission validates the complete manifest, canonicalizes its JSON, stores its SHA-256 digest,
and binds it to an admission idempotency key. Repeating the same key and same snapshot returns the
original record; a conflicting snapshot fails. Run scheduling applies the same retry rule.

The state graph is:

```text
queued → leased → running → passed | failed | blocked | canceled
  │        │          │
  │        └ expiry → queued
  └ cancel            └ expiry → indeterminate → queued | canceled
```

Every active worker mutation requires the current run ID, worker ID, opaque lease ID, increasing
fencing token, and unexpired lease. PostgreSQL's clock decides expiry. Queue selection uses priority
descending, queued time ascending, and run ID ascending under `FOR UPDATE SKIP LOCKED`.

The article must preserve the distinction between two expiry cases:

- a run that expired in `leased` has not crossed the start boundary and can return to `queued`;
- a run that expired in `running` may have produced an external effect and becomes `indeterminate`.

Only an optimistic-version operator action can retry or cancel an indeterminate run. Fencing blocks
stale database mutations; it cannot undo an external provider or tool side effect. Those systems
still need their own idempotency key, receipt, reconciliation query, or compensating action.

## Durable session and replay contract

SQLite and PostgreSQL implement the same session-store interface:

- validated events appended through the store contract;
- monotonically increasing per-session sequences;
- a commit-ordered global cursor for audit export;
- owner identity and expiring lease;
- compare-and-set checkpoints; and
- atomic interrupted-session recovery.

PostgreSQL additionally rejects event-row updates and deletes with a trigger. SQLite provides the
append-only behavior through the store API rather than an equivalent database trigger.

ACP `session/restore` accepts an explicit last-seen `afterSeq`. The response pages only committed
events with larger sequence numbers, in ascending order. Delivery is at least once; clients must
deduplicate. A future cursor, wrong workspace/model scope, malformed stream, or another live owner
fails restore.

After the old owner lease expires:

- a terminal `agent.stopped` tail means only row closure was lost, so recovery closes the session as
  completed without manufacturing an event;
- a nonterminal tail atomically appends one `session.restored(outcome=interrupted)` marker and closes
  the session; and
- the incomplete model request, permission, or tool effect is not executed again.

The kernel now awaits durable event publication before model and tool effect boundaries. This
orders evidence before an effect. It does not provide exactly-once external execution; a crash after
the effect but before `tool.result` still requires reconciliation.

## Transactional outbox, artifacts, and audit

Task, run, artifact, and event-producing audit-checkpoint domain mutations insert their typed event
into the PostgreSQL outbox in the same transaction. The empty-page audit bookkeeping case advances
its checkpoint without creating a recursive event. Each outbox item has a stable event ID and a
commit-ordered outbox sequence. The publisher claims one item with a lease and fence, appends it to
the separate global session-event sequence used by audit export, and may redeliver the same ID if
delivery succeeded but its acknowledgement was lost.

Artifact preparation:

1. bounds the body and content type;
2. computes SHA-256 and defaults to a content-derived key;
3. conditionally uploads through an S3-compatible API;
4. reads and hashes existing bytes if the key already exists; and
5. registers immutable metadata in PostgreSQL, whose trigger rejects updates and deletes.

The service defaults to digest-bearing keys and conditional writes, but its preparation interface
also accepts an explicit key. Write-once behavior is therefore an application contract; out-of-band
object mutation or deletion remains an object-store ACL and operator concern.

Audit export reads the already-redacted canonical global event stream, filters out
`audit.exported` and audit-kind `artifact.registered` events, and produces deterministic JSONL.
Other artifact registrations remain evidence. It uploads the object before atomically registering
metadata and advancing the checkpoint in PostgreSQL. A failure after upload may leave an orphan
object, but deterministic retry prevents skipped events. An oversized poison event intentionally
blocks progress and degrades readiness rather than disappearing from the audit trail.

Signed SigV4 URLs are bounded bearer capabilities. The signing secret remains server-side, but the
URL contains an access-key identifier and may include a session token. Full URLs must not be stored
in registry rows, events, reports, or logs.

## Kubernetes truth boundary

The raw-Kustomize base renders 32 objects:

- two namespaces;
- two Deployments;
- four Services;
- two single-replica StatefulSets;
- nine NetworkPolicies;
- four PodDisruptionBudgets;
- two ResourceQuotas;
- two LimitRanges;
- three ServiceAccounts;
- one HorizontalPodAutoscaler; and
- one ConfigMap containing the sandbox Job template.

No Secret object is rendered. Five `example.invalid` image sentinels and two
`REPLACE_STORAGE_CLASS` placeholders remain. The reference PostgreSQL and MinIO stores are
persistent but not highly available; a PDB prevents voluntary eviction of the only replica but does
not provide failover.

Applying the base may create partial resources whose workloads remain Pending or enter image-pull
failure. The accurate boundary is that the base cannot become a ready, working deployment as-is—not
that Kubernetes cannot accept any of its manifests.

Workloads are non-root, have read-only roots, drop all capabilities, disable service-account token
mounts, use runtime-default seccomp, declare resources, and start behind default-deny networking.
Those controls still depend on the target cluster's admission policy and CNI enforcement.

The sandbox does not run. Its suspended Job is YAML stored in a ConfigMap. No runtime consumes it,
no Job is materialized, no Role/RoleBinding grants creation, and no trusted system stages a
workspace PVC. A future executor overlay must implement and test all four responsibilities.

## Debugging ledger

The private development record supports these failure discoveries, grouped by boundary rather than
strict chronology, while the public source remains the final authority:

1. make policy/permission publication awaitable before tool effects, and avoid falsely closing the
   session during cleanup so lease expiry can restore a nonterminal turn as `interrupted`;
2. add cursor restore and a shared session-store contract;
3. add owner leases, heartbeat, fencing, and database-clock expiry;
4. quarantine uncertain running work instead of reporting false completion;
5. replace non-atomic state/event writes with a transactional outbox;
6. replace a proposed homegrown database transport with the maintained `pg` driver and bounded
   acquisition queue;
7. make artifact conflicts verify bytes instead of trusting object metadata;
8. make audit checkpoint advancement atomic with immutable registry admission, while filtering out
   `audit.exported` and audit-kind `artifact.registered` events so export cannot feed itself; other
   artifact registrations remain evidence;
9. degrade readiness on outbox or audit failure and recover only after successful work;
10. bound HTTP concurrency and pipelining pressure; and
11. keep image, storage, Secret, sandbox-executor, and egress choices fail-closed in Kubernetes.

## Article and diagram implementation

The website implementation adds:

- `src/content/build-notes/HarnessControlPlane.tsx` — the 13-section evidence-led article;
- `src/components/build-notes/HarnessControlPlaneDiagrams.tsx` — four semantic diagrams;
- a newest-first Build Note 011 record in `src/lib/build-notes.ts`;
- the article import and slug mapping in the shared dynamic route;
- focused unit and browser acceptance; and
- this implementation, verification, and production record.

The diagrams explain:

1. idempotent admission → fenced lease → running owner → expiry/reconciliation;
2. durable publication → committed event stream → cursor replay → interrupted closure;
3. control-plane transaction → outbox → canonical stream → content-addressed JSONL, checkpoint, and
   signed access;
   and
4. public/offline proof → rendered reference topology → unproven live operations.

Each diagram has a complete `aria-label`, visible caption, and named keyboard-scrollable frame. The
article remains a Server Component and adds no article-specific JavaScript. It reuses the existing
M3 semantic-diagram styles, avoiding overlap with the separate in-progress readiness stylesheet
work.

## Claim controls

The following wording is required:

- **Production-shaped**, not production-proven.
- **Cursor-based replay-safe restore**, not exactly-once execution.
- **At-least-once event delivery**, not exactly-once delivery.
- **Lease-fenced writes using the storage clock**, not proof that outside effects are fenced.
- **Content-addressed, write-once-through-service artifact contract**, not proof that operators or
  out-of-band credentials cannot mutate the object store.
- **Deterministic redacted JSONL**, not general DLP or tamper-proof storage.
- **Reference Kubernetes topology**, not a live deployment.
- **Suspended Job template in a ConfigMap**, not a functioning sandbox scheduler.
- **Single-replica reference stores**, not HA.
- **No retained load, soak, chaos, latency, throughput, or capacity result**.
- **One broad control-plane bearer-token trust domain**, not tenant or route-level authorization.

The article must not publish the shared ChatGPT URL, device authorization code, credentials,
absolute local paths, or private authentication chronology.

## Independent source verification

An isolated checkout of `d3b2859` passed:

- 421/421 tests across 32 files;
- strict TypeScript type checking; and
- `kubectl kustomize infra/kubernetes`, producing 32 objects and zero Secret objects.

The generated M4 report is intentionally ignored by Git, but its complete JSON was preserved in a
public PR comment. It records:

- status `passed`;
- 102 changed paths;
- zero changed-path policy violations;
- 421/421 tests; and
- two task/run lifecycle events plus the SQLite session artifact.

Hosted checks passed on both the pull-request head and merge. The durable merge runs are CI
`33433272360` and CodeQL `33433264809`. The article links the public release evidence without
claiming that static analysis proves the absence of vulnerabilities.

PostgreSQL tests use scripted protocol fakes, S3 tests use an injected transport, HTTP tests use a
real local socket with in-memory storage, restore coverage is primarily SQLite-backed, and
Kubernetes evidence is rendering only. Those boundaries must remain visible beside the counts.

## Website verification plan

Before publication:

1. Run the focused Build Notes unit test.
2. Run both TypeScript checks, lint, and formatting verification.
3. Run the entire unit suite, Payload build, and fixture-backed Static Site export.
4. Require the generic export verifier to discover the new card and validate its canonical,
   article metadata, JSON-LD, timestamp, RSS, and sitemap entries.
5. Run the focused Playwright M4 route acceptance plus the full public smoke lane.
6. Stage only M4 files; preserve the unrelated readiness changes in the working tree.
7. Push the implementation commit and require GitHub CI and CodeQL to pass.
8. Wait for Render's `checksPass` Static Site deployment of that exact commit.
9. Verify the custom-domain article, metadata, structured data, feed, sitemap, CDN cache, and
   security headers.
10. Record the exact website commits, run IDs, Render deploy IDs, page count, and production
    acceptance below.

## Production acceptance

The article, diagrams, metadata, route registration, and focused tests are implemented. Full
verification, website commits, hosted checks, checks-gated Render deployment, and production
acceptance remain pending.

## Remaining Harness release gates

M4 does not change the production decision. Before calling the platform deployed or scalable, it
still needs:

1. reviewed immutable images, real external Secrets, encrypted storage, and an environment overlay;
2. one-shot migrations and distinct least-privilege runtime database roles;
3. HA or managed PostgreSQL/object storage with backups, retention, and restore drills;
4. TLS/service-mesh transport plus verified CNI NetworkPolicy enforcement;
5. a sandbox executor with narrow namespace RBAC, trusted workspace staging, safe substitution, and
   cleanup evidence;
6. scoped workload identity, authorization, and tenant boundaries instead of one global token;
7. destination-specific provider and S3 egress;
8. real PostgreSQL/MinIO, multi-replica, crash, lease-expiry, and cluster-admission tests;
9. external-effect idempotency and operator reconciliation playbooks;
10. retained load, soak, latency, throughput, chaos, and HPA evidence; and
11. independent security, DLP, and dependency review.

M5's polyglot work remains conditional on an actual M3–M4 profile showing a measured runtime
bottleneck.
