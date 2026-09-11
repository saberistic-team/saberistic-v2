import Link from 'next/link'
import { ArticleCallout, CodeBlock, DiagramFrame } from '@/components/build-notes/ArticlePrimitives'

const repo = 'https://github.com/saberistic-team/harness-platform'
const commit = 'fc8b3d9793d90669bc9dbf2f60ec93d62c6be177'
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
          {steps.map(([name, detail], index) => (
            <div
              key={name}
              className="harness-m3-diagram__node harness-m3-diagram__node--accent"
              style={{ minWidth: 0 }}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{name}</strong>
              <small>{detail}</small>
            </div>
          ))}
        </div>
      </div>
    </DiagramFrame>
  )
}

export function HarnessDurableSessionsArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / FOUR MILESTONES, ONE SESSION</p>
        <h2>A useful agent needs more than a place to run commands.</h2>
        <p className="article-lede">
          M9 and M10 gave Harness explicit local and Docker workspaces. M11–M14 make that foundation
          useful for longer development sessions: five bounded tools, steering between requests,
          compacted context without erased history, and durable checkpoints that can reconstruct
          what the model was about to receive.
        </p>
        <p>
          The development request was direct: implement the four roadmap milestones as written. The
          important refinement came at the mutation boundary. Instead of promising race-safe model
          writes into a changing host tree, M11 requires the reviewed isolated Docker capability for
          writes and process execution. Local model access remains read-only.
        </p>
        <p>
          This note follows four merged pull requests, ending at{' '}
          <a href={repo + '/commit/' + commit}>
            <code>fc8b3d9</code>
          </a>
          . The{' '}
          <a href="https://chatgpt.com/s/cx_6aa416702158819198add46d6cabf8ae">shared build chat</a>{' '}
          provides the brief and final decision; the pinned source, tests, and hosted checks provide
          the implementation evidence.
        </p>
        <ArticleCallout title="The headline—and its limit">
          <p>
            710 offline tests passed, reproduced during publication, and all four milestones are
            merged. M14 restores completed sessions for follow-up turns and reconstructs saved
            requests. It does not automatically resume uncertain interrupted work: that remains M15.
          </p>
        </ArticleCallout>
      </section>

      <section id="tools">
        <p className="eyebrow">02 / M11 — EXACTLY FIVE TOOLS</p>
        <h2>A small capability surface is easier to reason about.</h2>
        <p>
          The native development registry exposes exactly <code>fs.read</code>, <code>fs.list</code>
          , <code>fs.write</code>, <code>process.exec</code>, and <code>git.diff</code>. These are
          the policy and audit identities, not friendly labels for a second hidden set of model
          powers. The old read-file and sandbox-execution seams are migrated behind the canonical
          contract.
        </p>
        <ul>
          <li>
            <code>fs.read</code> reads bounded workspace content.
          </li>
          <li>
            <code>fs.list</code> lists bounded workspace paths.
          </li>
          <li>
            <code>fs.write</code> writes bounded UTF-8 text within the workspace scope.
          </li>
          <li>
            <code>process.exec</code> accepts an argument array and bounded execution settings.
          </li>
          <li>
            <code>git.diff</code> returns the bounded difference from the initial workspace
            snapshot.
          </li>
        </ul>
        <p>
          The new registry enforces strict input objects. A write with an extra field, a shell-style
          command object instead of <code>argv</code>, and out-of-scope paths all fail rather than
          being silently interpreted. The tool layer caps write text and serialized outputs at 128
          KiB; process requests accept at most 128 arguments and a timeout of at most 30 seconds,
          subject to tighter workspace limits.
        </p>
        <CodeBlock
          label="Conceptual calls through the native registry"
          language="json"
          sourceHref={source('packages/tools/src/development.ts')}
          code={
            '{"name":"fs.read","arguments":{"path":"fixture.txt"}}\n{"name":"fs.write","arguments":{"path":"fixture.txt","contents":"new"}}\n{"name":"process.exec","arguments":{"argv":["node","test.js"],"timeoutMs":10000}}\n{"name":"git.diff","arguments":{}}'
          }
        />
        <p>
          “Argv-only” means the runner does not interpolate a command string through a shell. It
          does not make arbitrary programs harmless; policy, workspace scope, execution limits, and
          isolation remain necessary. Similarly, the diff tool is not permission to branch, commit,
          or mutate Git metadata.
        </p>
      </section>

      <section id="isolation">
        <p className="eyebrow">03 / M11 — REMOVE HOST MUTATION AUTHORITY</p>
        <h2>Resolve the race by refusing the unsafe capability.</h2>
        <p>
          A path can look valid during a check and refer somewhere different by the time a mutation
          happens. The build’s answer was not another optimistic path check. Native model writes and
          process calls require an internally attested <code>DockerWorkspace</code>. Local and
          forged capabilities fail with <code>WORKSPACE_ISOLATION_REQUIRED</code> before effects.
        </p>
        <Flow
          title="Model mutation crosses an explicit authority boundary"
          description="The five-tool interface still depends on policy and a reviewed workspace. Local inspection is allowed; local model mutation is not."
          steps={[
            ['Model call', 'Canonical tool name and strict arguments.'],
            ['Policy and scope', 'Persist the decision; restrict workspace authority.'],
            ['Isolation check', 'Writes and processes require the attested Docker adapter.'],
            [
              'Bounded effect',
              'Update the copied tree or run isolated argv; retain typed results.',
            ],
          ]}
        />
        <p>
          The attestation is an in-process identity check backed by a WeakMap of reviewed method
          references. Trusted binding and restriction can preserve it; replacing an attested method
          invalidates it. Setting a property or copying a prototype is not enough. This is not
          cryptographic or hardware attestation, and it assumes the host integration code is
          trusted.
        </p>
        <p>
          The Docker adapter carries forward M10’s bounded copied text tree, without mounting the
          source repository. Changes belong to that isolated state and can be returned as a patch.
          The local developer API still exists; it has not been promoted into model mutation
          authority.
        </p>
        <p>
          The <a href={source('packages/kernel/test/development-tools.test.ts')}>M11 fixture</a>{' '}
          drives all five tools with FakeModel. It verifies an allowed edit, one test command, a
          diff, four invalid attempts, and an unchanged host fixture. Separate ordinary, symlink,
          hard-link, and parent-substitution cases verify local mutation rejection, untouched victim
          files, and zero process execution.
        </p>
        <ArticleCallout title="What the Docker fixture actually proves">
          <p>
            The M11 gate uses DockerWorkspace with an injected executor and a copied-tree protocol.
            It is a deterministic test of wiring, scope, and authority—not evidence that a real
            Docker daemon executed those particular calls. Live-Docker coverage is a separate lane.
          </p>
        </ArticleCallout>
      </section>

      <section id="aliases">
        <p className="eyebrow">04 / PROVIDER NAMES ARE NOT POLICY NAMES</p>
        <h2>Translate at the wire, not throughout the system.</h2>
        <p>
          Some function-calling providers do not accept dots in tool names. The OpenAI-compatible
          adapter builds aliases only in a detached provider request, including prior assistant tool
          calls, and translates returned names back. Policy and persisted events retain canonical
          dotted names.
        </p>
        <CodeBlock
          label="The adapter’s reversible name boundary"
          language="text"
          sourceHref={source('packages/models/src/openai-compatible.ts')}
          code={
            'policy / runtime:  fs.read\nprovider request:  harness_66732e72656164\nprovider response: harness_66732e72656164\npolicy / audit:    fs.read\n\nReject alias collisions, excessive alias length,\nand unrecognized harness_ aliases.'
          }
        />
        <p>
          This avoids making authorization depend on a provider-specific spelling. It also keeps
          replayed tool history compatible with later provider requests without changing the audit
          vocabulary.
        </p>
      </section>

      <section id="steering">
        <p className="eyebrow">05 / M12 — STEER AT A SAFE BOUNDARY</p>
        <h2>“I received your message” and “the model used it” are different events.</h2>
        <p>
          Steering can arrive while a model request or tool is running. M12 appends{' '}
          <code>steering.queued</code> through the injected EventStore before <code>steer()</code>{' '}
          resolves. A serialized queue preserves accepted invocation order. The content is
          incorporated only at the next safe model-request boundary, recorded by{' '}
          <code>steering.applied</code>.
        </p>
        <Flow
          title="Steering waits for the next model request"
          description="Acknowledge durable acceptance first. Never splice new messages into an in-flight request."
          steps={[
            ['Request A running', 'Its message snapshot remains immutable.'],
            ['Steering arrives', 'Append queued messages in FIFO order; then acknowledge.'],
            ['Current work settles', 'The tool or model phase reaches the next boundary.'],
            ['Request B built', 'Apply accepted messages and record their IDs and revision.'],
          ]}
        />
        <p>
          The concurrency fixture queues “model A” and “model B” during the model phase, then “tool
          A” and “tool B” during tool execution. The first request does not contain the new
          steering. The second contains all four in order.
        </p>
        <p>
          Cancellation has explicit ordering too. A steering append already in progress finishes and
          remains recorded even if cancellation wins. Later steering is rejected once cancellation
          becomes visible. Accepted steering during a final model response causes another round;
          otherwise completion wins at its serialized terminal boundary. The invariant is one
          terminal outcome per turn, not a race between duplicate success and cancellation events.
        </p>
      </section>

      <section id="followups">
        <p className="eyebrow">06 / M12 — A NEW TURN, NOT A REWRITTEN PAST</p>
        <h2>Follow-up work inherits the session without replacing it.</h2>
        <p>
          A follow-up gets a new run and turn identity on the same logical session. It inherits
          original messages, pending steering, accumulated usage, and applicable defaults. Prior
          tool-call intentions and observations remain in the conversation.
        </p>
        <p>
          The runtime rejects a second active turn for the same session, a reused turn ID, a
          replacement context, or a different EventStore for an in-memory follow-up. The test
          serializes the existing event history before the follow-up and verifies that its prefix is
          byte-for-byte unchanged afterward.
        </p>
        <p>
          In-process continuity arrives here. Cross-restart storage comes in M14. Keeping those
          delivery stages separate matters: a runtime registry is not a durable database just
          because its API can read a session.
        </p>
      </section>

      <section id="context">
        <p className="eyebrow">07 / M13 — TWO DIFFERENT LIMITS</p>
        <h2>Context occupancy is not the cumulative token budget.</h2>
        <p>
          The hard model-token budget records how much usage the session has accumulated. Context
          occupancy asks whether the next request fits the configured window, including tool
          definitions, system text, and reserved output. Compaction can reduce occupancy; it cannot
          refund prior model usage.
        </p>
        <p>
          The implemented occupancy algorithm is <code>utf8-upper-bound/v1</code>: it uses the UTF-8
          byte length of serialized messages, tools, and system text as a conservative estimate.
          Although event fields call these units tokens, this is not an exact provider tokenizer or
          a measurement of a provider’s internal prompt. That distinction belongs in the
          explanation.
        </p>
        <CodeBlock
          label="Two ledgers with different jobs"
          language="text"
          sourceHref={source('packages/kernel/src/context.ts')}
          code={
            'Per-request admission\n  estimated occupancy + reserved output <= configured window\n\nSession budget\n  previous usage + task-model usage + summary-model usage\n  must stay within the configured hard budget\n\nCompaction reduces the first quantity.\nIt does not reset the second.'
          }
        />
        <p>
          The context policy specifies the window, compaction threshold, retained tail length, and
          output reservation. Accounting emits evidence before an oversized request is admitted. The
          next output limit is bounded by the remaining model budget and the context reservation.
        </p>
      </section>

      <section id="compaction">
        <p className="eyebrow">08 / M13 — PRESERVE ORIGINALS, CHANGE THE VIEW</p>
        <h2>A summary is a checkpoint, not an eraser.</h2>
        <p>
          At the configured threshold, the runtime summarizes an older prefix and retains a recent
          tail. It adjusts the boundary so assistant tool intentions are not separated from their
          observations. Original history remains intact; the next model request uses preserved
          system messages, a versioned summary, and the tail.
        </p>
        <Flow
          title="Compaction creates a smaller request view"
          description="The original message state and revision remain available while the effective model context changes."
          steps={[
            ['Original history', 'Keep the append-only message sequence.'],
            ['Select prefix and tail', 'Do not split tool intentions from observations.'],
            ['Summarize the prefix', 'No tools; ordinary deadline and usage accounting.'],
            ['Commit the view', 'Append summary/tail evidence and build a smaller request.'],
          ]}
        />
        <p>
          The version-one compaction state records summary text, the original tail index, and the
          revision summarized. <code>context.checkpoint</code> persists the summary and immutable
          tail; <code>context.compacted</code> records before/after counts. The new view must
          actually reduce message count and estimated occupancy.
        </p>
        <p>
          Summary generation is real model work: normal deadlines, stream validation, and
          hard-budget accounting apply. An empty or failed summary produces{' '}
          <code>RUNTIME_SUMMARY_FAILED</code>. A prefix that cannot be summarized within bounds, a
          non-reducing result, or a retained tail that still cannot fit produces{' '}
          <code>RUNTIME_CONTEXT_OVERFLOW</code>. No failure path is permission to discard originals.
        </p>
        <p>
          The <a href={source('packages/kernel/test/context.test.ts')}>four compaction tests</a>{' '}
          cover reconstruction, failure, summary usage exhausting the budget, and overflow. One
          fixture records 110 tokens for the summary and 23 for the next answer: the terminal usage
          is 133, not 23. Another proves a failed summary does not commit a destructive replacement.
        </p>
      </section>

      <section id="persistence">
        <p className="eyebrow">09 / M14 — GIVE THE PORT STORAGE SEMANTICS</p>
        <h2>Append and read become a durable session contract.</h2>
        <p>
          <code>SessionEventStore</code> connects the kernel’s EventStore port to the existing
          SessionStore implementations. It binds to one session and owner, snapshots each event
          before returning control, and preserves the event ID instead of regenerating it during
          delivery.
        </p>
        <ul>
          <li>
            <strong>Ordering:</strong> storage assigns per-session sequence cursors; reads advance
            through ordered pages.
          </li>
          <li>
            <strong>Identical redelivery:</strong> the same event identity and payload do not create
            a second event.
          </li>
          <li>
            <strong>Conflicting redelivery:</strong> reused identity with different content produces{' '}
            <code>SESS_EVENT_CONFLICT</code>.
          </li>
          <li>
            <strong>Checkpoint compare-and-swap:</strong> writes use the expected revision and
            cannot silently overwrite a newer checkpoint.
          </li>
          <li>
            <strong>Owner fencing:</strong> the storage transaction checks the current owner before
            accepting effects, including checkpoint saves.
          </li>
        </ul>
        <p>
          The adapter serializes its own appends. An older identical checkpoint redelivery cannot
          rewind the current cursor. A stale owner is not allowed to write merely because it holds
          an old revision or is retrying an apparently identical operation.
        </p>
        <p>
          This is event-delivery idempotency and checkpoint concurrency control. It is not a claim
          that every arbitrary external tool effect has become exactly-once.
        </p>
      </section>

      <section id="checkpoints">
        <p className="eyebrow">10 / M14 — SAVE THE NEXT REQUEST</p>
        <h2>A checkpoint needs enough state to explain the next action.</h2>
        <p>
          Durable adapters opt in with checkpoint version one. The runtime emits checkpoints at
          model boundaries—including summary requests—and terminal outcomes. The payload retains
          more than the latest assistant message.
        </p>
        <CodeBlock
          label="Runtime checkpoint v1 — field guide"
          language="text"
          sourceHref={source('packages/kernel/src/checkpoint.ts')}
          code={
            'Identity: runId, sessionId, turnId, phase, sessionTurns\nHistory: versioned messageState and original revision\nModel: identity, system/options, output limit, timeout\nAccounting: usage, modelRequests, toolCalls, transcript bytes\nControl: seen call IDs, grants, warnings, pending steering\nContext: compaction state, context policy, budget\nNext step: detached nextRequest for model/summary phases\nTerminal: terminalStatus instead of nextRequest'
          }
        />
        <Flow
          title="Reconstruction stops before execution"
          description="Storage establishes identity and ordering; request reconstruction returns data without repeating model or tool work."
          steps={[
            ['Runtime boundary', 'Create a versioned snapshot of the next request.'],
            ['Durable store', 'Append event; fence owner and compare checkpoint revision.'],
            ['Close and reopen', 'Read the same ordered events and checkpoint.'],
            ['Reconstruct', 'Return the detached request—do not execute it automatically.'],
          ]}
        />
        <p>
          The parser validates identities, usage consistency, turns, message state, compaction
          cursors, phase-specific fields, and a 16 MiB serialized bound. A future version raises{' '}
          <code>RUNTIME_CHECKPOINT_VERSION</code>; malformed content raises{' '}
          <code>RUNTIME_CHECKPOINT_INVALID</code>. There is no fallback that guesses how an unknown
          checkpoint should behave.
        </p>
        <p>
          <code>reconstructModelRequest()</code> is pure. The SQLite test compares each
          reconstructed request with the request captured by FakeModel, excluding its transient
          AbortSignal. “Exact request” here means the detached runtime request—not a guaranteed
          identical provider response, network exchange, or future model execution.
        </p>
      </section>

      <section id="recovery">
        <p className="eyebrow">11 / M14 IS NOT M15</p>
        <h2>Finished sessions can continue. Uncertain effects must not be repeated.</h2>
        <p>
          The SQLite reopen test restores a completed session into a fresh runtime, then starts a
          new follow-up. Prior messages and tool history survive, as do saved system instructions
          and provider options when the caller does not replace them. Compaction checkpoints retain
          the original history as well as the summarized view.
        </p>
        <p>
          <code>restoreSession()</code> requires a committed terminal checkpoint matched by the
          terminal event. Missing or interrupted history is rejected with{' '}
          <code>RUNTIME_CHECKPOINT_INTERRUPTED</code>. Reconstructing what the next request would
          have been does not establish whether an interrupted request or process already had an
          effect.
        </p>
        <ArticleCallout title="The next recovery gate" tone="warning">
          <p>
            M15 remains planned in this pinned revision. It must distinguish a safe continuation
            point from an indeterminate model/tool effect and inject crashes around those
            boundaries. M14 deliberately does not silently replay possibly completed work.
          </p>
        </ArticleCallout>
        <p>
          M16 likewise remains the planned integration of the native kernel into a task-manifest
          runner. These four milestones do not establish that the kernel authored itself, replace
          the entire builder workflow, or complete the later self-hosting gates.
        </p>
      </section>

      <section id="results">
        <p className="eyebrow">12 / RESULTS WITH THEIR EVIDENCE LANES</p>
        <h2>710 passing tests—and what those tests actually exercised.</h2>
        <p>
          During publication, typecheck and the full offline suite were rerun against the M14
          merge’s tracked source. The result was <strong>710 passed, 10 skipped</strong>, across 46
          passing test files and one skipped file. No live provider, Postgres server, or Docker
          daemon was invoked for this reproduction.
        </p>
        <ul>
          <li>
            <strong>M11:</strong> five development-tool fixtures cover the copied-tree
            edit/test/diff path and local mutation rejection cases.
          </li>
          <li>
            <strong>M12:</strong> runtime fixtures cover model/tool-phase steering, concurrent FIFO
            order, immutable follow-up history, and cancellation ordering.
          </li>
          <li>
            <strong>M13:</strong> four context fixtures cover summary/tail reconstruction, failure,
            budget charging, and overflow.
          </li>
          <li>
            <strong>M14:</strong> three durable-replay fixtures exercise real SQLite close/reopen,
            exact detached requests, compaction state, version rejection, and terminal follow-ups.
          </li>
          <li>
            <strong>Postgres:</strong> fourteen session-store tests include the new adapter and
            owner-fenced checkpoint contracts using a scripted injected database.
          </li>
          <li>
            <strong>Live Docker:</strong> ten tests are deliberately skipped by the default suite;
            their existence is not a passing live result for this note.
          </li>
        </ul>
        <p>
          The final PR’s retained exit report also records 710 passing tests and no allowed-path
          violations. Hosted <a href={repo + '/actions/runs/34612211593'}>CI on the exact merge</a>{' '}
          passed, as did its <a href={repo + '/actions/runs/34612211992'}>CodeQL workflow</a>. PR
          #15’s own CI and CodeQL checks passed before merge.
        </p>
        <p>
          These are deterministic correctness and contract checks, not a load benchmark, security
          certification, live-Postgres qualification, or proof of exactly-once recovery under
          arbitrary process failure.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">13 / READ THE IMPLEMENTATION</p>
        <h2>Follow the capability into the session store.</h2>
        <ul>
          <li>
            <a href={source('packages/tools/src/development.ts')}>Development tools</a>: canonical
            registry, strict parameters, mutation guard, and output bounds.
          </li>
          <li>
            <a href={source('packages/workspace/src/isolation.ts')}>Workspace isolation identity</a>
            : internal attestation and trusted-view inheritance.
          </li>
          <li>
            <a href={source('packages/models/src/openai-compatible.ts')}>Provider adapter</a>:
            detached aliases and canonical-name restoration.
          </li>
          <li>
            <a href={source('packages/kernel/src/runtime.ts')}>Runtime</a>: steering, follow-up
            admission, compaction, and checkpoint boundaries.
          </li>
          <li>
            <a href={source('packages/kernel/src/context.ts')}>Context</a> and{' '}
            <a href={source('packages/kernel/src/checkpoint.ts')}>checkpoint schema</a>: effective
            message views and pure request reconstruction.
          </li>
          <li>
            <a href={source('packages/sessions/src/runtime-event-store.ts')}>SessionEventStore</a>:
            serialized delivery, durable cursors, and checkpoint revisions.
          </li>
          <li>
            <a href={source('EVENTS.md')}>Event contract</a> and{' '}
            <a href={source('ROADMAP.md')}>pinned roadmap</a>: implemented milestones and explicit
            remaining gates.
          </li>
        </ul>
        <p>
          Merge sequence: <a href={repo + '/pull/12'}>M11 / PR #12 / a51ffc2</a>, then{' '}
          <a href={repo + '/pull/13'}>M12 / PR #13 / 6e827ed</a>,{' '}
          <a href={repo + '/pull/14'}>M13 / PR #14 / 7e4d2fa</a>, and{' '}
          <a href={repo + '/pull/15'}>M14 / PR #15 / fc8b3d9</a>. All four were merged on September
          11, 2026. Source links in this article are pinned to the final merge, not a moving main
          branch.
        </p>
      </section>

      <section id="next">
        <p className="eyebrow">14 / THE NEXT HONEST STEP</p>
        <h2>The session is inspectable. Recovery must now earn its authority.</h2>
        <p>
          M11–M14 connect capability control, interactive direction, context management, and durable
          state. The model sees a small tool surface; operators can steer without rewriting
          in-flight requests; summaries do not erase originals; and persistence can reproduce the
          next request without guessing.
        </p>
        <p>
          The next milestone has a narrower and harder job: prove which interrupted work may safely
          continue, without repeating uncertain effects. After that comes the native task-runner
          integration and its own evidence. Each new layer should preserve the same rule: a passing
          test or saved checkpoint grants only the capability it actually proves.
        </p>
        <p>
          For the foundation, read{' '}
          <Link href="/build-notes/harness-local-docker-workspace-adapters-m9-m10/">
            Harness M9–M10: local and Docker workspaces
          </Link>
          . For the requested scope and the mutation-safety decision, see the{' '}
          <a href="https://chatgpt.com/s/cx_6aa416702158819198add46d6cabf8ae">M11–M14 build chat</a>
          .
        </p>
      </section>
    </>
  )
}
