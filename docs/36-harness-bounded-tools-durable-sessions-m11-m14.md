# Build Note 020 — Harness M11–M14

## Sources

- Complete shared chat: https://chatgpt.com/s/cx_6aa416702158819198add46d6cabf8ae.
- Public final merge: `fc8b3d9793d90669bc9dbf2f60ec93d62c6be177`.
- M11 PR #12 merge: `a51ffc221c736bfa46da8a24e0f8b6c373180532`.
- M12 PR #13 merge: `6e827ed056662213dbb26487223897330806ac34`.
- M13 PR #14 merge: `7e4d2fac55b28aee163ba5a539607b8e90d113ba`.
- M14 PR #15 merge: final merge above; merged 2026-09-11T14:47:11Z.
- PR #15 CI `34612056768`, CodeQL `34612052712`: success.
- Exact-merge CI `34612211593`, security workflow `34612211992`: success.

## Implementation plan

1. Read the chat and verify the four public PRs and final source.
2. Inspect roadmap, tool registry and isolation identity, provider aliasing,
   runtime steering and compaction, checkpoint parser, SessionEventStore, and tests.
3. Reproduce typecheck and the offline suite without changing Harness source.
4. Create one article with fourteen sections, four responsive flow diagrams,
   four explanatory code blocks, pinned source links and evidence boundaries.
5. Register article metadata, route and existing smoke coverage. Automatic
   index/RSS/sitemap generation stays unchanged.
6. Validate website typecheck, lint, unit tests, static export and browser layout.
7. Publish through existing checks-gated Render deployment and record live evidence.

## Verification and claim boundaries

Publication rerun: `pnpm typecheck` and `pnpm test --maxWorkers=2` passed.
Vitest: 710 passed, 10 skipped; 46 passing files, one skipped file; 38.55s.
No paid/live provider, live Postgres, or Docker daemon test run performed.
M11 edit/test/diff uses DockerWorkspace with an injected executor. Its local
rejection fixtures do exercise temporary filesystem substitutions.
M14 SQLite close/reopen is real; Postgres is a scripted injected contract.
The occupancy metric is a UTF-8 serialized-size estimate, not provider tokenization.
Attestation is an internal WeakMap identity check, not remote/hardware attestation.
M14 reconstructs detached requests and restores terminal sessions. M15 automatic
safe continuation and M16 native TaskAgent integration remain planned in the pin.

The Harness checkout was on the exact merge at test start and afterward. A separate
task switched its branch to M15–M17 and added an untracked manifest during the audit;
tracked source/HEAD remained unchanged. We did not alter or reset that work.

## Website publication

Website typecheck, lint, 19 Build Note unit tests and fixture static export passed.
The export verifies 20 Build Notes and their SEO/feed/sitemap entries. Browser QA
confirmed fourteen sections, four diagrams, desktop rendering and no document
overflow at 390px. Awaiting checks-gated deployment.
