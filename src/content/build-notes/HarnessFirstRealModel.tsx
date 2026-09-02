import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  IdentityAuthorityEvolutionDiagram,
  LiveModelDebuggingSequenceDiagram,
  ObservedRealModelRunsDiagram,
  RealModelSmokePathDiagram,
} from '@/components/build-notes/HarnessFirstRealModelDiagrams'

const baseline = 'd14fc13e299a6718d9e8a98ba9e028b320cd5f53'
const repository = 'https://github.com/saberistic-team/harness-platform'
const source = (path: string, anchor = '') => `${repository}/blob/${baseline}/${path}${anchor}`

const experimentBrief = `local field test · 2026-09-02

model label     openai-compatible/qwen3.8:27b-mlx
provider        Ollama · http://127.0.0.1:11434/v1
workspace       Harness repository based on M8 ${baseline.slice(0, 7)}
task            inspect the repository, then return exactly five concise bullets
tool            sandbox_exec with structured argv
workspace       recursively read-only
sandbox network none
writable binds  zero
final result    completed · 3 model turns · 4 tool calls · 18,014 tokens

status          uncommitted local experiment · not M9 · no PR or hosted CI`

const topology = `terminal UI
  │ ACP · ws://127.0.0.1:8765
  ▼
Agent Server
  ├── HTTP /v1/chat/completions ──► Ollama on loopback
  │                                  configured model label
  │                                  non-streaming request · no retry
  │
  └── sandbox_exec ───────────────► one Docker container per command
                                     repository mounted read-only
                                     --network none
                                     zero writable workspace binds
                                     ephemeral writable /tmp`

const smokeRecord = `provider smoke
├── model requests       1
├── model tokens        71
├── tool calls           0
└── response             HARNESS_OLLAMA_OK

placeholder task
├── model requests       1
├── model tokens       232
├── tool calls           0
└── result               asked for a real task

repository-summary prompt without an admitted task
├── model requests       1
├── model tokens       274
├── tool calls           0
└── result               declined to invent repository knowledge`

const taskContract = `goal
  inspect this repository through the policy-enforced read-only sandbox
  and return exactly five concise architecture bullets grounded in read files

permissions
  fs.read       allow
  fs.write      deny
  process.exec  selected direct-argv prefixes allow; everything else deny
  network       deny
  git.push      deny

budget
  max_model_tokens  30,000
  max_tool_calls        30

important
  allowed_paths constrains authoring scope;
  flat fs.read: allow exposed the whole repository read-only`

const guardedArrayFix = `provider tool arguments
└── argv array has own non-enumerable toJSON: undefined
    └── shadows a hostile inherited Array.prototype.toJSON hook

normalizeToolJson
├── accept only an own data property named toJSON
├── require value === undefined
├── require enumerable === false
├── reject accessors, functions, and enumerable variants
├── clone the array and shadow inherited toJSON while serializing
└── remove the temporary guard before returning plain JSON

regressions
├── guarded argv crosses one model tool call
└── executable or enumerable toJSON is rejected before effect`

const timeoutContract = `HARNESS_MODEL_TIMEOUT_MS
├── absent                provider default remains 60,000 ms
├── experiment value      180,000 ms
├── accepted syntax       positive decimal integer, no whitespace
├── maximum               2,147,483,647
├── requires              model ID + base URL
└── invalid configuration fail closed at service startup`

const firstToolLoop = `first completed repository-aware session
├── sed -n 1,180p README.md
├── sed -n 1,200p ARCHITECTURE.md
└── ls -la packages

model response usage
  422 + 2,825 + 6,534 = 9,781 cumulative tokens

observed result
├── 111.174 seconds wall time
├── 3 requested / 3 executed tool calls
├── 3 fresh containers · all exited 0 and were removed
├── network none · 0 writable workspace mounts
├── no truncated tool output
└── budget warning at 82% of the original 12,000-token budget`

const pressureRun = `cumulative token progression
  502 → 1,083 → 2,782 → 5,274 → 8,701 → 19,932
                                               ▲
                                  12,000 budget crossed

requested calls   17
executed calls    11
denied calls       6
  ├── 2 × sh -c ...
  └── 4 × slash-suffixed ls forms outside the original prefixes

terminal result   budget_exceeded
final response    received from the provider, then discarded by the kernel`

const finalRun = `final user-run session
├── cat README.md
├── cat ARCHITECTURE.md
├── ls -la
└── ls packages services apps

model response usage
  466 + 8,471 + 9,077 = 18,014 cumulative tokens

result
├── completed in 84.329 seconds
├── 3 model turns · 4 requested / 4 executed calls
├── 4 containers exited 0, returned full output, and were removed
├── budget.warning emitted at the first observed crossing: 60% of 30,000
└── exactly five bullets observed in the terminal

separate verification run correction
  594 + 6,488 + 7,080 = 14,162 cumulative tokens
  7,080 was the final response only, not the run total`

const sandboxPlan = `docker run
├── --pull never · --rm · --init · --read-only
├── --network none · --cap-drop ALL
├── --security-opt no-new-privileges=true
├── numeric non-root user
├── 128 PIDs · 512 MiB memory · 1 CPU
├── /tmp = 64 MiB noexec,nosuid,nodev tmpfs
├── /workspace = repository bind, recursively read-only
├── proxy environment values blanked
└── argv entrypoint selected directly; no shell inserted

development exception
└── HARNESS_SANDBOX_TRUST_LOCAL_IMAGE=true
    harness-sandbox:local was a mutable trusted tag, not a pinned release image`

const evidenceLedger = `early smoke database
├── 3 closed sessions · 15 events
├── 71 / 232 / 274 tokens · no tool calls
└── sha256 d759894c4379e7676b4c25cb1991f491081e27584ce40308ee9ab819bbdf2964

task-session database
├── SQLite integrity_check                         ok
├── closed sessions                                 7
├── canonical events                              412
├── tool.call events                               28
├── executed sandboxes                             22
├── policy-denied calls                             6
├── removed containers                             22
├── truncated tool results                          0
└── sha256 a613df5a59c59e0ee41f18ad6f2192a978c96190f7e4fb5d182f820acbf9b8b5`

const localGate = `local exit gate · uncommitted and ignored report
├── status                         passed
├── test files                    42 / 42
├── tests                        669 / 669
├── recorded test command       42.178 seconds
├── changed paths                  7
├── path violations                0
├── head / base                    ${baseline.slice(0, 7)} / ${baseline.slice(0, 7)}
└── report sha256                  24be1c40db5605ee223da051052aac8759661f548bcde14e8fde24bc20df82d6

publication audit of current worktree
├── 669 / 669 tests                 passed
├── strict TypeScript               passed
└── task-manifest validation        passed`

const deliveryTruth = `public repository
├── main / origin/main     ${baseline} · M8 merge
├── latest public PR       #9 · M8
├── latest exact-merge CI  33646021258 · M8
└── latest CodeQL          33646020469 · M8

local experiment branch
├── tasks/ollama-repo-summary
├── 6 modified tracked files + 1 untracked task manifest
├── final snapshot +195 / -1 across 7 paths
├── no remote branch
├── no pull request
├── no hosted CI or CodeQL
└── no published run artifact`

const performanceRows = [
  ['First completed tool loop', '111.174 s', '9,781', '3 / 3', '1.679 s'],
  ['Budget-exceeded run', '96.405 s', '19,932', '17 / 11', '2.724 s'],
  ['Revised verification', '292.827 s', '14,162', '4 / 4', '1.429 s'],
  ['Final user run', '84.329 s', '18,014', '4 / 4', '0.917 s'],
] as const

const currentTruth = [
  [
    'Provider identity',
    'The server reached a local endpoint configured with the label qwen3.8:27b-mlx.',
    'A configured label is not cryptographic proof of the exact weights or model provenance.',
  ],
  [
    'Repository grounding',
    'The final session read two documents and listed repository roots before returning five bullets.',
    'The event database retains tool observations but not the final text, and no evaluator scored claim quality.',
  ],
  [
    'Read authority',
    'Every executed tool container received the repository as a recursively read-only bind.',
    'Flat fs.read: allow exposed the whole repository; allowed_paths did not restrict reads to seven paths.',
  ],
  [
    'Write authority',
    'The workspace had zero writable bind mounts and fs.write was denied.',
    'The run did not exercise a write attempt, and the container intentionally retained an ephemeral writable /tmp.',
  ],
  [
    'Network boundary',
    'Every tool container ran with Docker network set to none.',
    'The host Agent Server still used loopback HTTP to reach Ollama; this was not whole-process network isolation.',
  ],
  [
    'Process policy',
    'Two shell-form calls and four unmatched ls forms were denied before a container started.',
    'Prefix globs such as ls** are broader and less legible than an executable-aware rule language.',
  ],
  [
    'Budgets',
    'The runtime stopped the 19,932-token session instead of delivering an over-budget answer.',
    'The check happens after a provider response, so provider work can overshoot the configured limit within one turn.',
  ],
  [
    'Sandbox image',
    'The observed containers used the hardened local Docker plan and were removed.',
    'The experiment trusted a mutable local image tag; it did not use a production digest-enforcement path.',
  ],
  [
    'Runtime compatibility',
    'A narrow guarded-array patch and validated 180-second timeout enabled the real-model loop locally.',
    'Those changes remain uncommitted and have no remote review, hosted CI, or CodeQL evidence.',
  ],
  [
    'Performance',
    'Tool execution was a small fraction of the four recorded session wall times.',
    'One user, unknown hardware and warm state, no concurrency, and non-streaming calls make this diagnostic—not a benchmark.',
  ],
] as const

const nextWork = `1  replace broad command-prefix globs with executable-aware rules
2  make the prompt's five-call ceiling a machine-enforced task budget
3  reserve token budget before a turn so one response cannot overshoot dramatically
4  persist a privacy-reviewed final-output artifact or structured digest
5  add an evaluator for five-bullet shape and repository grounding
6  add true provider streaming and time-to-first-token measurement
7  repeat controlled warm/cold and concurrent trials
8  publish the compatibility work through a reviewed pull request`

export function HarnessFirstRealModelArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / FIELD TEST</p>
        <h2>The first real model did not validate the happy path. It found the seams.</h2>
        <p className="article-lede">
          A local Qwen model eventually crossed Harness&apos;s provider, agent loop, policy, and
          Docker sandbox boundaries, inspected the repository, and returned the requested
          five-bullet architecture summary. Getting there exposed three things deterministic fakes
          had not: a guarded-array compatibility mismatch, a provider deadline too short for local
          inference, and a token budget that could be crossed inside one response.
        </p>
        <p>
          This is a field note about dogfooding, not a new milestone announcement. The experiment
          ran from a dirty local branch based on public M8 merge <code>{baseline.slice(0, 7)}</code>
          . Its seven-path patch has not been committed, pushed, reviewed, or exercised by hosted
          CI. Calling it M9 would erase the most important fact in the record: the live run taught
          us what must be hardened before the behavior becomes a release.
        </p>
        <CodeBlock code={experimentBrief} label="Observed experiment boundary" language="text" />
        <ArticleCallout title="LOCAL FIELD NOTE — NOT M9 OR A RELEASE" tone="warning">
          <p>
            Public Harness still ends at the M8 capability contract. The local experiment reused the
            earlier Docker-backed <code>sandbox_exec</code> path; it did not implement the planned
            M9 <code>LocalWorkspace</code> adapter.
          </p>
        </ArticleCallout>
      </section>

      <section id="topology">
        <p className="eyebrow">02 / TWO COMMUNICATION PLANES</p>
        <h2>Model inference and tool execution crossed different trust boundaries.</h2>
        <p>
          The terminal spoke ACP to Agent Server on one loopback socket. Agent Server sent
          non-streaming OpenAI-compatible HTTP requests to Ollama on another. When the model asked
          for <code>sandbox_exec</code>, Harness authorized a structured argument vector and
          launched one fresh offline container for that command. “Network denied” therefore means
          the tool container had no network—not that the entire experiment stopped using sockets.
        </p>
        <RealModelSmokePathDiagram />
        <CodeBlock code={topology} label="Observed local topology" language="text" />
      </section>

      <section id="smoke">
        <p className="eyebrow">03 / INFERENCE BEFORE AGENCY</p>
        <h2>A real response proved provider connectivity, not repository access.</h2>
        <p>
          The first smoke returned <code>HARNESS_OLLAMA_OK</code> after one 71-token model request
          and no tool call. A placeholder task then received the right refusal: there was no task to
          perform. When asked to summarize the repository without an admitted task or tool, the
          model again behaved correctly and said it had not been given repository content.
        </p>
        <p>
          That sequence clarified a frequently blurred boundary. Passing <code>--workspace .</code>
          identifies and scopes a session; it does not inject files into context and it does not
          grant filesystem or process authority. Repository-aware behavior begins only when the
          service admits a task, advertises a reviewed tool, and can execute the approved effect.
        </p>
        <IdentityAuthorityEvolutionDiagram />
        <CodeBlock code={smokeRecord} label="Three no-tool smoke sessions" language="text" />
      </section>

      <section id="task-contract">
        <p className="eyebrow">04 / TASK CONTRACT</p>
        <h2>The successful run began with an explicit read-only contract.</h2>
        <p>
          The local <code>ollama-repo-summary</code> task asked the model to inspect the repository
          before answering, denied writes and sandbox network, and allowed a small family of direct
          read commands. The final hard limits were 30,000 model tokens and 30 requested tool calls.
          “Exactly five bullets” and “at most five useful calls” remained prompt instructions; only
          the manifest limits were machine-enforced.
        </p>
        <CodeBlock code={taskContract} label="Local task manifest (condensed)" language="yaml" />
        <ArticleCallout title="ALLOWED_PATHS WAS NOT A READ ALLOWLIST" tone="warning">
          <p>
            The seven <code>allowed_paths</code> governed source-change scope and any potential
            writable mounts. Because <code>fs.read</code> was flat-allowed, the sandbox received the
            entire repository as one recursively read-only bind.
          </p>
        </ArticleCallout>
      </section>

      <section id="guarded-arrays">
        <p className="eyebrow">05 / FIRST FAILURE</p>
        <h2>
          The model produced a tool call, then a defensive array guard met a stricter boundary.
        </h2>
        <p>
          Ollama&apos;s first repository-aware request did reach tool intention, but the kernel
          stopped it with <code>MODEL_INVALID_RESPONSE</code>: the arguments were not accepted as
          bounded JSON. The OpenAI-compatible adapter deliberately put an own, non-enumerable
          <code>toJSON: undefined</code> property on decoded arrays to shadow any inherited
          <code>Array.prototype.toJSON</code> hook. The older normalizer rejected every named array
          property, including that guard.
        </p>
        <p>
          The local fix is intentionally narrow. It recognizes only that inert shape, maintains the
          guard while serializing cloned arrays, and removes it before returning provider-neutral
          JSON. Executable, accessor-backed, or enumerable variants still fail before a tool can
          run.
        </p>
        <LiveModelDebuggingSequenceDiagram />
        <CodeBlock
          code={guardedArrayFix}
          label="Guarded-array compatibility rule (local, uncommitted)"
          language="text"
        />
      </section>

      <section id="timeout">
        <p className="eyebrow">06 / SECOND FAILURE</p>
        <h2>Two runs hit the same 60-second wall before any tool executed.</h2>
        <p>
          With array normalization repaired, the next two sessions ended after 60.011 and 60.009
          seconds with <code>MODEL_TIMEOUT</code>. The provider adapter already supported a
          constructor-level deadline, but Agent Server exposed no configuration for it. The local
          patch adds <code>HARNESS_MODEL_TIMEOUT_MS</code> at the service boundary and keeps the
          existing 60-second default when it is absent.
        </p>
        <CodeBlock
          code={timeoutContract}
          label="Provider timeout admission (local, uncommitted)"
          language="text"
        />
        <p>
          The experiment used 180 seconds. That is not a recommendation for every model; it is a
          validated escape hatch for a local model whose observed responses sometimes took longer
          than one minute.
        </p>
      </section>

      <section id="first-loop">
        <p className="eyebrow">07 / FIRST COMPLETE TOOL LOOP</p>
        <h2>Three read operations finally closed the reason–act–observe loop.</h2>
        <p>
          After both compatibility corrections, the model read the first parts of
          <code>README.md</code> and <code>ARCHITECTURE.md</code>, then listed
          <code>packages</code>. Each request crossed the model-facing tool schema, the durable
          policy fence, and the sandbox planner before Docker saw it. Each ran in a separate
          container and returned an observation for the next model turn.
        </p>
        <CodeBlock
          code={firstToolLoop}
          label="First successful repository-aware run"
          language="text"
        />
        <p>
          This 9,781-token session is the first evidence that the local model could use the
          repository tool loop, not merely answer through the provider bridge. It is still one
          observed session, not repeatability proof.
        </p>
      </section>

      <section id="policy-budget">
        <p className="eyebrow">08 / USEFUL FAILURE</p>
        <h2>The next run showed policy holding while the budget failed late.</h2>
        <p>
          A less-directed rerun requested 17 tool calls. Harness denied two shell-form
          <code>sh -c</code> requests and four slash-suffixed <code>ls</code> forms before Docker
          started, while 11 direct commands were executed. The model recovered from those denials by
          trying allowed argument vectors. That is stronger evidence than a prompt-only “do not use
          a shell” instruction: the disallowed effect did not run.
        </p>
        <CodeBlock code={pressureRun} label="12,000-token budget pressure run" language="text" />
        <p>
          The runtime checks cumulative usage after a provider response arrives. The last response
          moved the run from 8,701 to 19,932 tokens, so the kernel recorded
          <code>budget_exceeded</code> and withheld that answer. The budget is an enforcement
          boundary, but it is not a reservation that prevents provider work from crossing the line
          within one turn.
        </p>
      </section>

      <section id="final-run">
        <p className="eyebrow">09 / FINAL OBSERVED RESULT</p>
        <h2>The tuned run completed with four reads and five visible bullets.</h2>
        <p>
          After raising the hard limits and allowing the needed direct command forms, the
          user&apos;s final run completed in three model turns. Four commands inspected the two
          architecture documents and repository roots. All four containers exited successfully,
          produced untruncated observations, and were removed.
        </p>
        <ObservedRealModelRunsDiagram />
        <CodeBlock
          code={finalRun}
          label="Final run and corrected token accounting"
          language="text"
        />
        <ArticleCallout title="7,080 WAS ONE RESPONSE, NOT ONE RUN" tone="note">
          <p>
            An intermediate chat summary described a successful run as using <strong>7,080</strong>{' '}
            tokens. The durable per-response usage is 594 + 6,488 + 7,080 ={' '}
            <strong>14,162 cumulative</strong>. The final user run is a separate 18,014-token
            session.
          </p>
        </ArticleCallout>
      </section>

      <section id="sandbox">
        <p className="eyebrow">10 / SANDBOX BOUNDARY</p>
        <h2>The observed tool effects were disposable, offline, and workspace-read-only.</h2>
        <p>
          The existing sandbox path translated each admitted argument vector into a bounded Docker
          plan. The container did not receive a shell, host credentials, network, Linux
          capabilities, or a writable repository mount. Its root filesystem was read-only and its
          deliberately writable <code>/tmp</code> was ephemeral and constrained.
        </p>
        <CodeBlock code={sandboxPlan} label="Observed Docker plan (condensed)" language="text" />
        <p>
          The test used <code>harness-sandbox:local</code> with the explicit local-image trust
          override. The inspected image had a content identity at that moment, but the task selected
          a mutable tag rather than enforcing a reviewed digest. Container hardening and cleanup are
          useful evidence; they are not a production isolation certificate.
        </p>
      </section>

      <section id="durable-evidence">
        <p className="eyebrow">11 / DURABLE RECORD</p>
        <h2>The event log proves effects and budgets better than it proves the final prose.</h2>
        <p>
          Two local SQLite stores survive the interaction. The smaller smoke record contains three
          closed no-tool sessions. The task database passed SQLite integrity checking and records
          seven closed sessions, 412 canonical events, 28 tool intentions, 22 executed sandboxes,
          six denials, and cleanup for every started container. Full local paths, identifiers, and
          stdout remain unpublished because the database also contains machine-specific detail.
        </p>
        <CodeBlock
          code={evidenceLedger}
          label="Redacted local event-store ledger"
          language="text"
        />
        <ArticleCallout title="THE FINAL FIVE BULLETS ARE NOT IN SQLITE" tone="warning">
          <p>
            The database retains requests, responses, usage, tool inputs, observations, policy, and
            sandbox lifecycle events, but not the ACP prompt or final response text. The shared chat
            and terminal observation establish that five bullets appeared; the durable record cannot
            reproduce or independently grade their wording.
          </p>
        </ArticleCallout>
      </section>

      <section id="performance">
        <p className="eyebrow">12 / PERFORMANCE OBSERVATION</p>
        <h2>Inference dominated the recorded wall time, but four runs are not a benchmark.</h2>
        <p>
          Docker tool time was under three seconds in each listed session while end-to-end wall time
          ranged from 84 to 293 seconds. That makes local inference the likely dominant component in
          these observations. It does not isolate hardware, prompt growth, scheduling, model warm
          state, or other causes well enough to compare systems.
        </p>
        <div
          aria-label="Observed real-model session timings"
          className="article-table-wrap"
          role="region"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Session</th>
                <th scope="col">Wall time</th>
                <th scope="col">Tokens</th>
                <th scope="col">Tools requested / run</th>
                <th scope="col">Tool time</th>
              </tr>
            </thead>
            <tbody>
              {performanceRows.map(([run, wall, tokens, tools, toolTime]) => (
                <tr key={run}>
                  <th scope="row">{run}</th>
                  <td>{wall}</td>
                  <td>{tokens}</td>
                  <td>{tools}</td>
                  <td>{toolTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ArticleCallout title="THIS WAS DIAGNOSTIC, NOT A LOAD TEST" tone="warning">
          <p>
            There was one local user, no recorded hardware profile, no controlled warm/cold runs, no
            concurrency, no throughput sample, no cost measurement, and no time-to-first-token
            because the adapter used non-streaming requests. The numbers explain this debugging
            session; they do not predict capacity.
          </p>
        </ArticleCallout>
      </section>

      <section id="verification">
        <p className="eyebrow">13 / LOCAL VERIFICATION</p>
        <h2>
          The changed worktree passes locally, with a clear split between retained and rerun proof.
        </h2>
        <p>
          The task&apos;s local exit gate produced an ignored report after one earlier gate
          correctly rejected a runtime SQLite file inside the repository. The passed report records
          669 tests across 42 files and zero scope violations. It does not contain a typecheck
          result. For this publication, the current worktree separately reproduced all 669 tests,
          strict TypeScript, and manifest validation.
        </p>
        <CodeBlock code={localGate} label="Local verification ledger" language="text" />
        <p>
          The experiment server ran under Node 24.18.0 while the project and hosted workflows target
          Node 22. That difference is disclosed rather than treated as cross-version proof.
        </p>
      </section>

      <section id="delivery">
        <p className="eyebrow">14 / DELIVERY TRUTH</p>
        <h2>The public commit is the baseline, not the experiment.</h2>
        <p>
          Public <code>main</code>, local <code>main</code>, and the local experiment branch all
          point to M8 merge <code>{baseline.slice(0, 7)}</code>. The guarded-array, timeout,
          regression, and task-manifest changes sit only in the working tree. The newest public PR,
          CI, and CodeQL records all belong to M8, so they can verify the baseline but not this
          experiment patch.
        </p>
        <CodeBlock
          code={deliveryTruth}
          label="Publication boundary at audit time"
          language="text"
        />
        <ArticleCallout title="BASELINE COMMIT, NOT VERIFIED EXPERIMENT COMMIT" tone="warning">
          <p>
            The article header labels <code>{baseline.slice(0, 7)}</code> as the baseline. No commit
            yet contains the final seven-path experiment snapshot, and there is no public run
            artifact to link as a substitute.
          </p>
        </ArticleCallout>
      </section>

      <section id="limits">
        <p className="eyebrow">15 / CURRENT TRUTH</p>
        <h2>
          One useful agent run is evidence of integration, not evidence of general reliability.
        </h2>
        <div
          aria-label="First real-model field-test evidence boundaries"
          className="article-table-wrap"
          role="region"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Surface</th>
                <th scope="col">What was observed</th>
                <th scope="col">What remains unproven</th>
              </tr>
            </thead>
            <tbody>
              {currentTruth.map(([surface, observed, open]) => (
                <tr key={surface}>
                  <th scope="row">{surface}</th>
                  <td>{observed}</td>
                  <td>{open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The precise claim is{' '}
          <strong>
            one local model completed a repository-grounded, policy-gated, read-only Docker tool
            loop after two narrow compatibility changes
          </strong>
          . This is not a deterministic quality result, load test, security certification, model
          provenance proof, production deployment, or released Harness capability.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">16 / FILE GUIDE</p>
        <h2>
          The public baseline is inspectable; the experiment delta is described, not linked as
          release code.
        </h2>
        <div className="file-guide">
          <article>
            <h3>Agent loop and model boundary</h3>
            <ul>
              <li>
                <a href={source('packages/kernel/src/run.ts')} rel="external">
                  packages/kernel/src/run.ts
                </a>{' '}
                — public M8 bounded-JSON and legacy agent loop baseline; locally changed for guarded
                arrays.
              </li>
              <li>
                <a href={source('packages/models/src/openai-compatible.ts')} rel="external">
                  packages/models/src/openai-compatible.ts
                </a>{' '}
                — provider normalization, guarded arrays, non-streaming completion request, usage,
                and timeout behavior.
              </li>
            </ul>
          </article>
          <article>
            <h3>Service configuration</h3>
            <ul>
              <li>
                <a href={source('services/agent-server/src/config.ts')} rel="external">
                  services/agent-server/src/config.ts
                </a>{' '}
                — public provider-registry baseline; locally changed to validate and forward the
                optional model timeout.
              </li>
              <li>
                <a href={source('services/agent-server/src/cli.ts')} rel="external">
                  services/agent-server/src/cli.ts
                </a>{' '}
                — CLI environment help updated only in the uncommitted worktree.
              </li>
            </ul>
          </article>
          <article>
            <h3>Sandbox and policy</h3>
            <ul>
              <li>
                <a href={source('services/sandbox-runner/src/plan.ts')} rel="external">
                  services/sandbox-runner/src/plan.ts
                </a>{' '}
                — policy compilation, Docker arguments, read-only mounts, and resource limits.
              </li>
              <li>
                <a href={source('services/sandbox-runner/src/runner.ts')} rel="external">
                  services/sandbox-runner/src/runner.ts
                </a>{' '}
                — output limits, Docker client lifecycle, cancellation, and deterministic cleanup.
              </li>
              <li>
                <a href={source('services/agent-server/src/sandbox-tool.ts')} rel="external">
                  services/agent-server/src/sandbox-tool.ts
                </a>{' '}
                — strict argument-vector tool schema and policy-before-run handoff.
              </li>
            </ul>
          </article>
          <article>
            <h3>Tests and task</h3>
            <ul>
              <li>
                <a href={source('packages/kernel/test/run-agent.test.ts')} rel="external">
                  packages/kernel/test/run-agent.test.ts
                </a>{' '}
                — public loop tests; two guarded-array regressions exist only in the local delta.
              </li>
              <li>
                <code>tasks/ollama-repo-summary.yaml</code> — untracked task contract used for the
                final experiment; there is no honest public source link yet.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="next">
        <p className="eyebrow">17 / WHAT IS NEXT</p>
        <h2>Turn a successful field test into a reviewable, repeatable capability.</h2>
        <p>
          The next work is less glamorous than the first five-bullet answer and more valuable:
          narrow the process rule language, close budget overshoot, retain a privacy-reviewed final
          output record, evaluate grounding, measure streaming behavior, and publish the actual
          compatibility delta through review.
        </p>
        <CodeBlock code={nextWork} label="Field-test follow-up sequence" language="text" />
        <ol className="next-list">
          <li>
            <span>01</span>
            <div>
              <h3>Make policy intent machine-legible</h3>
              <p>
                Replace broad prefixes such as <code>ls**</code> with executable-aware rules and
                move the five-call expectation from prose into an enforced budget.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Make the answer part of the evidence story</h3>
              <p>
                Persist a privacy-reviewed output artifact or digest and add a structured evaluator
                for shape, citations, and support from observed files.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Measure the provider instead of narrating four timings</h3>
              <p>
                Add streaming, time-to-first-token, controlled warm/cold trials, and concurrent
                sessions before making latency or capacity decisions.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Ship the patch before naming the capability</h3>
              <p>
                Commit the seven-path delta, open a pull request, retain the gate artifact, and let
                hosted CI, CodeQL, and review establish a public evidence pin.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section id="sources">
        <p className="eyebrow">18 / EVIDENCE LEDGER</p>
        <h2>
          Public baseline, local runtime evidence, and observed terminal output remain distinct.
        </h2>
        <ul className="source-list">
          <li>
            <a href={`${repository}/tree/${baseline}`} rel="external">
              Harness M8 baseline <code>{baseline.slice(0, 7)}</code>
            </a>{' '}
            — exact public source tree underneath the local experiment, not a commit containing its
            changes.
          </li>
          <li>
            <a href={`${repository}/pull/9`} rel="external">
              M8 pull request #9
            </a>
            ,{' '}
            <a href={`${repository}/actions/runs/33646021258`} rel="external">
              exact-merge CI
            </a>
            , and{' '}
            <a href={`${repository}/actions/runs/33646020469`} rel="external">
              exact-merge CodeQL
            </a>{' '}
            — public evidence for the baseline only.
          </li>
          <li>
            Local worktree audit — seven changed paths, guarded-array and provider-timeout diffs,
            task-manifest validation, 669/669 tests, and strict TypeScript; no commit, remote
            branch, or hosted check exists for this snapshot.
          </li>
          <li>
            Redacted local SQLite audit — integrity check, event chronology, model usage, policy
            decisions, sandbox lifecycle, output truncation, and cleanup counts. The source database
            is withheld because it includes local paths, identifiers, and command output.
          </li>
          <li>
            Owner-supplied shared build conversation and terminal record — chronology, operator
            intent, and manual confirmation that the final response contained five bullets. It is
            not used as a substitute for implementation, CI, or durable-output evidence.
          </li>
        </ul>
      </section>
    </>
  )
}
