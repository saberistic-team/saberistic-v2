import Link from 'next/link'
import { ArticleCallout, CodeBlock, DiagramFrame } from '@/components/build-notes/ArticlePrimitives'

const repo = 'https://github.com/saberistic-team/harness-platform'
const commit = 'cfe7a8032e636d6cc1a114068994e0f1e1c08302'
const source = (path: string) => repo + '/blob/' + commit + '/' + path

function Flow({
  title,
  description,
  steps,
}: {
  title: string
  description: string
  steps: readonly (readonly [string, string])[]
}) {
  return (
    <DiagramFrame title={title} description={description} scrollable>
      <div className="harness-m3-diagram" style={{ minWidth: '38rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '0.75rem',
          }}
        >
          {steps.map(([name, detail], i) => (
            <div
              key={name}
              className="harness-m3-diagram__node harness-m3-diagram__node--accent"
              style={{ minWidth: 0 }}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              <strong>{name}</strong>
              <small>{detail}</small>
            </div>
          ))}
        </div>
      </div>
    </DiagramFrame>
  )
}

export function HarnessNativeBuilderArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / FROM SAVED STATE TO ACCOUNTABLE WORK</p>
        <h2>Can the agent continue—and prove which changes it made?</h2>
        <p className="article-lede">
          M14 could reconstruct a saved request, but deliberately refused to resume uncertain
          interrupted work. M15–M17 move the boundary forward: continue from an explicitly safe
          checkpoint, run the native kernel behind the trusted task gate, and bind its output to
          verifiable authorship evidence.
        </p>
        <p>
          The three milestones were delivered together in <a href={repo + '/pull/16'}>PR #16</a>,
          merged on September 11, 2026 as <code>cfe7a80</code>. This note follows that pinned
          revision and the{' '}
          <a href="https://chatgpt.com/s/cx_6aa4251935fc819187796333c345fe8e">shared build chat</a>,
          not later changes on main.
        </p>
        <ArticleCallout title="Implemented, with an explicit qualification">
          <p>
            The roadmap marks all three milestones implemented with an offline gate. This builds the
            mechanism for the next live self-hosted change. It does not prove that M17 authored
            itself, qualify its own revision as the successor builder, or complete M18.
          </p>
        </ArticleCallout>
      </section>
      <section id="safe">
        <p className="eyebrow">02 / M15 — SAFE MEANS BEFORE NEW INTENT</p>
        <h2>A stored checkpoint is not automatically permission to retry.</h2>
        <p>
          M15 adds a <code>safe</code> runtime checkpoint phase before the next model round. It
          captures the original session state, agent identity, tool definitions, and workspace
          snapshot. A model or summary checkpoint is different: it marks a region where execution
          may have begun, so it cannot authorize an automatic retry.
        </p>
        <CodeBlock
          label="Continuation admission—not a generic retry loop"
          language="text"
          sourceHref={source('packages/kernel/src/runtime.ts')}
          code={
            'safe checkpoint is the last committed boundary\n  + same run / session / turn / model\n  + same tool definitions and workspace snapshot\n  + expired previous owner, fresh replacement owner\n  + matching checkpoint revision and durable cursor\n  = eligible for a fenced continuation\n\nmodel intent or uncertain effect after that boundary\n  = interrupted / indeterminate; do not execute again automatically'
          }
        />
        <p>
          The runtime validates executable capabilities before consuming the checkpoint. A changed
          tool definition or workspace snapshot rejects continuation. The continuation restores
          prior messages, usage, counters, call identities, grants, warnings, steering, and
          compaction state instead of accepting a replacement conversation from the caller.
        </p>
        <p>
          This continues the original run and turn. It does not emit a second agent-start event,
          turn-start event, or initial user message. A later follow-up is still a separate concept:
          new work after a completed turn.
        </p>
      </section>
      <section id="fencing">
        <p className="eyebrow">03 / M15 — ONE OWNER TAKES OVER</p>
        <h2>Make the ownership change part of the durable transaction.</h2>
        <p>
          SQLite and Postgres implement continuation under their storage transaction or row lock.
          Admission checks the expected owner metadata and checkpoint revision, requires an expired
          lease and a different owner, and requires the safe checkpoint cursor to be the current
          event tail.
        </p>
        <Flow
          title="Fenced continuation of the same logical turn"
          description="A takeover changes ownership and records continuation together; a competing or stale owner cannot simply resume the same boundary."
          steps={[
            ['Inspect checkpoint', 'Require matching identity, tools, workspace, and safe phase.'],
            ['Claim under lock', 'Check expired lease, revision, metadata, and current cursor.'],
            [
              'Record takeover',
              'Append runtime.continued and advance owner and checkpoint cursor.',
            ],
            [
              'Continue the turn',
              'Restore saved state without repeating start events or prior work.',
            ],
          ]}
        />
        <p>
          <code>runtime.continued</code> is appended in the same transaction that replaces the
          expired owner and advances the checkpoint cursor. A competing recovery attempt loses that
          claim; the former owner can no longer append under its old identity.
        </p>
        <p>
          If work is indeterminate, the recovery path records an interrupted outcome rather than
          guessing. It also avoids closing a competing owner’s healthy session merely because
          another claimant lost. Cancellation during safe recovery completes the original turn as
          canceled without requesting the model.
        </p>
      </section>
      <section id="crashes">
        <p className="eyebrow">04 / M15 — TEST THE CRASH BOUNDARIES</p>
        <h2>The interesting test is what does not run twice.</h2>
        <p>
          The continuation suite walks both sides of the scenario’s event appends: before commit,
          and after commit but before acknowledgement. It also injects failure before and after the
          tool effect. Only a latest safe checkpoint is resumable; other outcomes must make no
          additional model request and leave the effect count unchanged.
        </p>
        <p>
          A separate fixture kills an actual child process with SIGKILL after a committed tool
          round. A file counter has already advanced from zero to one. The parent reopens SQLite,
          continues with a replacement owner, and verifies the counter stays at one. There is one
          tool call and two model requests across the session—not a duplicated tool effect.
        </p>
        <CodeBlock
          label="The real-process fixture’s observable result"
          language="text"
          sourceHref={source('packages/kernel/test/continuation.test.ts')}
          code={
            'child: tool increments counter → counter = 1\nchild: commit safe boundary → SIGKILL\nparent: reopen SQLite → claim continuation\nparent: finish next model round\n\ncounter remains 1\none tool.call across the session\ntwo model.request events across the session'
          }
        />
        <ArticleCallout title="Scope of the crash evidence">
          <p>
            The real process-death test uses a controlled counter tool and FakeModel. The broader
            failure matrix covers the deterministic scenario’s boundaries, not every possible
            external service or filesystem workload. This is meaningful recovery evidence, not
            universal exactly-once execution.
          </p>
        </ArticleCallout>
      </section>
      <section id="runner">
        <p className="eyebrow">05 / M16 — THE KERNEL BECOMES A TASK AGENT</p>
        <h2>Keep branch control outside the model’s five tools.</h2>
        <p>
          The native TaskAgent path now sits behind the existing bootstrap and exit gate. The
          trusted CLI validates the manifest, selects the exact task branch, checks scope, invokes
          the builder, applies its returned patch, runs exit tests, and records a structured report.
        </p>
        <Flow
          title="Native builder inside the trusted task workflow"
          description="The model works through the existing five tools; the surrounding CLI owns repository preparation, patch application, tests, and evidence."
          steps={[
            [
              'Trusted preflight',
              'Manifest, clean input, exact tasks/<id> branch, write approval.',
            ],
            ['Native runtime', 'MinimalAgentRuntime with five tools in DockerWorkspace.'],
            ['Return the patch', 'Verify unchanged host/control inputs, then apply scoped output.'],
            [
              'Exit gate',
              'Run tests, verify generated tree, persist evidence and seal the report.',
            ],
          ]}
        />
        <p>
          <code>createNativeTaskAgent()</code> requires an immutable image digest and the Docker
          workspace selector. There is no local fallback. It copies tracked input and the manifest
          overlay into a temporary source tree, compiles manifest permissions, and uses a
          SQLite-backed event store.
        </p>
        <p>
          The model still receives only the M11 development tools. It does not gain a sixth tool to
          create branches, stage files, commit, push, or merge. Those operations belong to trusted
          workflow code and human review.
        </p>
        <p>
          Bootstrap defaults to the offline native path. Upstream Pi remains available through
          explicit legacy selection. The default native model is FakeModel; selecting a native image
          alone does not turn the command into a live-model developer. That limitation matters when
          interpreting “self-host runner.”
        </p>
      </section>
      <section id="integration">
        <p className="eyebrow">06 / M16 — ONE END-TO-END OFFLINE FIXTURE</p>
        <h2>Edit, test, restart, return a patch—without touching main.</h2>
        <p>
          The integration fixture begins with a temporary repository containing an old text file and
          a task manifest. FakeModel writes the new text, invokes a test command, asks for a diff,
          and finishes. The trusted exit test independently checks the resulting host file.
        </p>
        <p>
          Assertions verify the task branch, unchanged main reference, one test execution inside the
          protocol fixture, four model requests, one continuation event, unique event IDs, and a
          passing <code>run-report/v2</code>. A manifest write rule set to ask is resolved by the
          trusted run’s explicit approval.
        </p>
        <p>
          The deliberate native restart closes and reopens SQLite and creates a new runtime while
          retaining the workspace object in the integration process. Docker execution is an injected
          protocol fixture. The separate M15 SIGKILL test supplies real process-death evidence;
          these are distinct tests, not a claim that a real Docker-backed builder survived a
          complete process loss here.
        </p>
        <p>
          The important delivered integration is that model work now feeds the existing gate and
          reviewable patch path. Live-provider behavior and a deployed image still need their own
          qualification.
        </p>
      </section>
      <section id="authorship">
        <p className="eyebrow">07 / M17 — A BUILDER NAME IS NOT PROVENANCE</p>
        <h2>Do not let a run claim a patch that was already there.</h2>
        <p>
          A free-form builder name in a report cannot establish authorship. M17 registers native
          TaskAgent identities and associates returned results with their exact agent instance. A
          result carrying a convincing name but lacking that trusted association is not sufficient.
        </p>
        <p>
          Before model invocation, the native gate rejects pre-existing source changes even if they
          are inside allowed paths. The one permitted exception is the attested manifest control
          overlay. Independent fixtures seed source as unstaged, staged, and committed changes; all
          three are blocked with <code>NATIVE_PREAUTHORED_INPUT</code>, before any model request.
        </p>
        <p>
          During the run, the gate checks that the builder source identity and manifest digest have
          not changed, and that the host tree still matches its pre-builder snapshot. After patch
          application, generated paths must remain in scope and the manifest overlay must remain
          unchanged. Exit tests cannot silently alter the attested generated tree and still produce
          a passing report.
        </p>
        <ArticleCallout title="Separate control input from generated source">
          <p>
            The manifest explains what the builder may do. It is recorded as an explicit input, not
            counted as proof that the model authored the task itself. Pre-existing implementation
            edits are rejected rather than folded into an apparently honest output.
          </p>
        </ArticleCallout>
      </section>
      <section id="attestation">
        <p className="eyebrow">08 / M17 — BIND THE EVIDENCE CHAIN</p>
        <h2>Record the inputs, runtime, workspace, events, and output together.</h2>
        <CodeBlock
          label="native-builder/v1 — evidence field guide"
          language="text"
          sourceHref={source('apps/cli/src/native-attestation.ts')}
          code={
            'Entrypoint       MinimalAgentRuntime.TaskAgent/v1\nBuilder revision content digest of selected platform TS sources + lockfile\nControl input    manifest digest and input base SHA\nExecution        model, image digest, workspace/session/run identities\nSnapshots        initial/generated workspace and pre/post-builder Git state\nOutput           generated Git tree and canonical patch digest\nAudit            runtime event log and workspace lifecycle log digests'
          }
        />
        <p>
          The builder revision is a content digest of the selected TypeScript source trees and
          lockfile—not merely a branch name, and not a hash of every byte in the repository.
          Generated tree capture uses a separate Git index so the verifier does not stage the user’s
          working index. Canonical patches disable external diff and text-conversion behavior.
        </p>
        <Flow
          title="The authorship evidence chain"
          description="The gate binds controlled input to recorded execution and output. Later acceptance verification checks the candidate against that signed record."
          steps={[
            ['Clean base + manifest', 'Record explicit control input and pre-builder state.'],
            ['Registered native run', 'Bind runtime, model, image, workspace, and event evidence.'],
            ['Generated output', 'Capture tree, canonical patch, snapshots, and log digests.'],
            ['Signed report', 'Seal the complete report after tests and tree verification.'],
          ]}
        />
        <p>
          The report is sealed with Ed25519 after tests and final tree verification. The signing key
          belongs to the trusted gate and is not passed to the model or workspace. The
          implementation supports an explicit signing key; without one it generates a process-local
          authority.
        </p>
        <p>
          A signature binds the report to a key. It does not independently establish that the key or
          builder is trustworthy. Portable verification must use a separately pinned public key, not
          accept the key embedded in the report as its own trust root.
        </p>
      </section>
      <section id="acceptance">
        <p className="eyebrow">09 / M17 — VERIFY THE CANDIDATE AND ACCEPTED PATCH</p>
        <h2>A valid report must still match the code being reviewed.</h2>
        <p>
          <code>harness verify-native</code> validates the report, trusted signature, retained
          artifact digests, candidate tree, and canonical patch. If an accepted commit and its base
          are supplied, their patch must match the attested patch exactly.
        </p>
        <CodeBlock
          label="Verifier command shape—replace these example paths and refs"
          language="text"
          sourceHref={source('apps/cli/src/main.ts')}
          code={
            'harness verify-native tasks/runs/example-report.json \\\n  --trusted-key trusted-builder-public.pem \\\n  --candidate candidate-ref \\\n  --accepted accepted-ref \\\n  --accepted-base accepted-base-ref'
          }
        />
        <p>
          The tests cover a candidate matching the generated tree, a changed report, a tampered
          patch artifact, and a rebased or squashed patch on top of unrelated upstream work. The
          accepted tree can differ from the candidate tree because its base changed; the exact patch
          must not.
        </p>
        <p>
          A human conflict edit breaks patch equivalence and is rejected with a direction to return
          that work to the builder. The successful verifier returns{' '}
          <code>native-acceptance/v1</code> evidence linking candidate, accepted commit, base,
          trees, and patch.
        </p>
        <p>
          This verifier exists as a read-only command. Passing PR CI for the M17 implementation is
          not the same as proving that this repository merge itself was generated by the attested
          native path. The candidate/accepted binding demonstrated here belongs to the independent
          temporary-repository fixture.
        </p>
      </section>
      <section id="results">
        <p className="eyebrow">10 / RESULTS AND EVIDENCE LANES</p>
        <h2>724 tests, with real and simulated boundaries identified.</h2>
        <p>
          The build chat reports 724 passing tests, typecheck, evaluations, and the exit gate.
          During this publication, typecheck, the full offline suite, and evaluations were
          reproduced on the pinned merge.
        </p>
        <ul>
          <li>
            <strong>Offline suite:</strong> 724 passed; ten live-Docker tests remain skipped.
          </li>
          <li>
            <strong>Continuation:</strong> deterministic append/effect failure injection, competing
            ownership, cancellation, and a real child-process SIGKILL with SQLite reopen.
          </li>
          <li>
            <strong>Native runner:</strong> FakeModel, a Docker protocol executor fixture, a
            temporary Git repository, and an independent exit test.
          </li>
          <li>
            <strong>Authorship:</strong> seeded-source rejection, signed report/artifact checks,
            candidate matching, patch-equivalent acceptance, and rejection of human conflict edits.
          </li>
          <li>
            <strong>Postgres:</strong> injected transaction contracts, not a live database trial.
          </li>
        </ul>
        <p>
          <a href={repo + '/actions/runs/34618961874'}>PR CI</a> and{' '}
          <a href={repo + '/actions/runs/34618959852'}>PR CodeQL</a> passed. The exact merge also
          passed <a href={repo + '/actions/runs/34619120299'}>CI</a> and{' '}
          <a href={repo + '/actions/runs/34619119575'}>CodeQL</a>.
        </p>
        <p>
          No paid model call, live Docker image qualification, live Postgres deployment, load
          benchmark, or security certification is claimed by these results. “Offline gate
          implemented” is the correct milestone status.
        </p>
      </section>
      <section id="files">
        <p className="eyebrow">11 / FOLLOW THE IMPLEMENTATION</p>
        <h2>Read recovery first, then the gate, then the verifier.</h2>
        <ul>
          <li>
            <a href={source('packages/kernel/src/runtime.ts')}>Runtime</a> and{' '}
            <a href={source('packages/kernel/src/checkpoint.ts')}>checkpoint schema</a>: safe phase,
            continuation validation, restored state.
          </li>
          <li>
            <a href={source('packages/sessions/src/runtime-event-store.ts')}>SessionEventStore</a>{' '}
            and <a href={source('packages/sessions/src/store.ts')}>storage contract</a>:
            transactional takeover and interrupted recovery.
          </li>
          <li>
            <a href={source('packages/kernel/test/continuation.test.ts')}>Continuation tests</a>:
            append crash matrix, ownership races, cancellation, and SIGKILL.
          </li>
          <li>
            <a href={source('apps/cli/src/native-agent.ts')}>Native TaskAgent</a>: five tools,
            isolated workspace, SQLite session, and returned evidence.
          </li>
          <li>
            <a href={source('apps/cli/src/run.ts')}>Trusted gate</a>: clean-input checks, patch
            application, tests, and sealing.
          </li>
          <li>
            <a href={source('apps/cli/src/native-attestation.ts')}>Attestation and verifier</a>,
            with <a href={source('apps/cli/test/native.test.ts')}>independent native fixtures</a>.
          </li>
          <li>
            <a href={source('skills/platform-builder/SKILL.md')}>Updated builder operating guide</a>{' '}
            and <a href={source('ROADMAP.md')}>pinned roadmap</a>: native workflow and the remaining
            live gate.
          </li>
        </ul>
      </section>
      <section id="next">
        <p className="eyebrow">12 / M18 MUST EARN THE NEXT CLAIM</p>
        <h2>A mechanism for proving authorship is not self-authorship.</h2>
        <p>
          The next planned milestone uses a real model through the attested native path to add{' '}
          <code>harness doctor</code> to the project’s own CLI. It needs its own clean task, branch,
          safe restart, evidence, independent verification, human review, and merge.
        </p>
        <p>
          Only after that gate is accepted does the resulting M18 candidate become the first
          qualified successor builder. The M17 revision that performed the work does not silently
          qualify itself. That separation keeps the self-hosting claim tied to a concrete authored
          change.
        </p>
        <p>
          M15–M17 supply the prerequisites: a narrow safe continuation point, a native task path
          inside the trusted gate, and an independently verifiable link from clean inputs to
          accepted output.
        </p>
        <p>
          Read the{' '}
          <Link href="/build-notes/harness-bounded-tools-durable-sessions-m11-m14/">
            M11–M14 foundation
          </Link>{' '}
          or the{' '}
          <a href="https://chatgpt.com/s/cx_6aa4251935fc819187796333c345fe8e">M15–M17 build chat</a>{' '}
          for the decisions leading here.
        </p>
      </section>
    </>
  )
}
