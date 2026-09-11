# Harness M15–M17 Build Note

## Scope and sources

Build Note 021: **Harness M15–M17: safe continuation and an attested native builder**.

- Route: `/build-notes/harness-native-continuation-attestation-m15-m17/`
- [User-provided build chat](https://chatgpt.com/s/cx_6aa4251935fc819187796333c345fe8e)
- [Merged PR #16](https://github.com/saberistic-team/harness-platform/pull/16)
- Audited merge: `cfe7a8032e636d6cc1a114068994e0f1e1c08302`.
- Harness PR CI `34618961874` and CodeQL `34618959852` passed; merge CI `34619120299` and CodeQL `34619119575` passed.

## Implementation

1. Read the shared chat and pinned runtime, session storage, native runner, attestation, CLI gate, tests, and roadmap.
2. Add a twelve-section Git-authored article with three accessible flow diagrams and four code/evidence blocks.
3. Register the note in the existing journal, route component map, unit manifest, and frontend smoke checks.
4. Reuse existing static export, RSS, sitemap, metadata, analytics, and Render deployment. No CMS schema or hosting changes.
5. Format, typecheck, lint, run journal tests, build the fixture export, and inspect desktop/mobile rendering.
6. Publish through checks-gated GitHub/Render and verify the live article, index, RSS, and sitemap.

## Claim boundaries

- M15 continues only a latest safe checkpoint under fenced transactional ownership. Uncertain effects are not automatically replayed.
- The SIGKILL/SQLite recovery test is a real child-process test using a controlled counter tool and FakeModel.
- M16 native integration uses an injected Docker executor and retains its workspace object while reopening SQLite. It is not a live-container process recovery demonstration.
- M17 rejects pre-authored changes and binds input, execution, logs, tree, and patch in a signed report. Verification requires a separately trusted public key.
- Candidate and accepted-patch checks are demonstrated in an independent temporary repository; the implementation's own merge is not claimed as natively authored.
- Live qualification and the first accepted successor builder remain M18 work.

## Reproduced Harness evidence

On September 11, 2026, at the pinned merge:

- `pnpm typecheck`: passed.
- `pnpm test --maxWorkers=2`: 48 files passed, one skipped; 724 tests passed, ten live-Docker tests skipped.
- `pnpm evals`: one of one scenarios passed.

No live-provider, live-Postgres, load, or security-certification claim is made.

## Publication verification

- Website typecheck and lint passed; all 19 journal unit tests passed.
- Fixture export built 37 pages and verified 21 build notes, metadata, RSS, and sitemap.
- Desktop/mobile browser inspection passed; 390px viewport has 390px document width and twelve article sections.
- Live deployment verification pending.
