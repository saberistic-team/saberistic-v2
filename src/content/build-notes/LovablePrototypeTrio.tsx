import { ArticleCallout, CodeBlock } from '@/components/build-notes/ArticlePrimitives'
import {
  BorrowedBrainFlowDiagram,
  LastPressFlowDiagram,
  LovableBuildArchitectureDiagram,
  PsychLabFlowDiagram,
} from '@/components/build-notes/LovablePrototypeDiagrams'

const lastPressCommit = '169df55cec710c269ddbf4cfc98a8e41a6d37392'
const psychLabCommit = 'b47cfa4690e389ca5119ded54c509c434f23d583'
const borrowedBrainCommit = 'dadf92f699ff47f95e4f274463ea4b0ed0e8e92b'

const lastPressRepository = 'https://github.com/saberistic-team/the-last-press'
const psychLabRepository = 'https://github.com/saberistic-team/psych-test-forge'
const borrowedBrainRepository = 'https://github.com/saberistic-team/borrowed-thinking-lab'

const lastPressSource = (path: string, anchor = '') =>
  `${lastPressRepository}/blob/${lastPressCommit}/${path}${anchor}`
const psychLabSource = (path: string, anchor = '') =>
  `${psychLabRepository}/blob/${psychLabCommit}/${path}${anchor}`
const borrowedBrainSource = (path: string, anchor = '') =>
  `${borrowedBrainRepository}/blob/${borrowedBrainCommit}/${path}${anchor}`

const sharedStack = `builder loop
Lovable project → GitHub source → Lovable deploy

application shell
React 19 + TanStack Start / Router / Query
Vite + Nitro + TypeScript
Tailwind CSS + Radix UI primitives

shared services, selected per product
Supabase auth + PostgreSQL + Row Level Security
Lovable AI gateway where generation is part of the product
Paddle or Stripe where money enters the system`

const atomicPress = `-- Condensed from press_button(_user_id).
PERFORM public.refill_allowance(_user_id);
SELECT * INTO p FROM public.profiles
  WHERE id = _user_id FOR UPDATE;

PERFORM public.settle_seasons();
SELECT * INTO s FROM public.seasons
  WHERE status IN ('active', 'pending')
  ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END
  LIMIT 1 FOR UPDATE;

new_exp := now() + (s.duration_ms || ' milliseconds')::interval;

UPDATE public.seasons SET
  status = 'active', timer_expires_at = new_exp,
  last_press_at = now(), last_presser_id = _user_id,
  total_presses = total_presses + 1
WHERE id = s.id;

UPDATE public.profiles
  SET presses_remaining = presses_remaining - 1
WHERE id = _user_id;

INSERT INTO public.presses (...)
VALUES (...);`

const realtimeClock = `// The browser smooths the display; the server supplies the clock.
const query = useQuery({
  queryKey: ["game"],
  queryFn: fetchSnapshot,
  refetchInterval: 15_000,
});

useEffect(() => {
  void getServerTime().then((result) => setClockOffset(result.now));
}, []);

const channel = supabase
  .channel("last-person-live-…")
  .on("postgres_changes", { table: "seasons", event: "*" }, invalidate)
  .on("postgres_changes", { table: "presses", event: "INSERT" }, invalidate)
  .subscribe();`

const unsafeProfilePolicy = `GRANT SELECT, UPDATE ON public.profiles TO authenticated;

CREATE POLICY "update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Row ownership is checked, but writable columns are not restricted.
-- The same row contains is_member, banned, and presses_remaining.`

const psychRepairLoop = `const FALLBACK_MODEL = "openai/gpt-5.4";
const MAX_ATTEMPTS = 4;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const model =
    attempt === MAX_ATTEMPTS && requestedModel !== FALLBACK_MODEL
      ? FALLBACK_MODEL
      : requestedModel;
  const temperature = attempt >= 3 ? Math.min(requestedTemperature, 0.2) : requestedTemperature;

  const text = await callModel(messages, model, temperature);
  const candidate = coerceSpec(extractJson(text));
  const { spec, errors } = validateSpec(candidate, { requireVisuals: true });
  if (spec) return { spec, attempts: attempt, history };

  messages.push({ role: "user", content: buildRepairMessage(errors, attempt >= 3) });
}`

const requestBoundGeneration = `const { data: job } = await supabase
  .from("generation_jobs")
  .insert({ creator_id: userId, status: "running", ...request })
  .select("id")
  .single();

// The row persists progress, but this request still owns the work.
const result = await runGenerationJob({
  jobId: job.id,
  userId,
  ...request,
});

return result.ok
  ? { jobId: job.id, testId: result.testId }
  : { jobId: job.id, errors: result.errors };`

const deterministicScoring = `const scoreOf = (id: string, reverse: boolean) => {
  const raw = Number(responses[id]);
  return reverse ? max + min - raw : raw;
};

const values = items.map((item) => scoreOf(item.id, item.reverse_scored));
const score = method === "sum"
  ? values.reduce((a, b) => a + b, 0)
  : values.reduce((a, b) => a + b, 0) / values.length;

const failedItems = attentionChecks
  .filter((item) => Number(responses[item.id]) !== Number(item.expected_answer))
  .map((item) => item.id);

return { score, band: bandFor(score, ranges), failedItems };`

const borrowedStructuredOutput = `export async function generateStructured<T>(
  schema: z.ZodType<T>,
  system: string,
  user: string,
): Promise<T> {
  let lastIssue = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callGateway(messagesFor(system, user, lastIssue));
    const parsed = schema.safeParse(extractJson(raw));
    if (parsed.success) return parsed.data;
    lastIssue = parsed.error.issues
      .slice(0, 6)
      .map((issue) => issue.message)
      .join("; ");
  }
  throw new AiError("The table could not organise its thoughts.", 500);
}`

const borrowedDebate = `// Round 1: independent positions arrive in parallel.
const positions = await Promise.all(
  brainIds.map((brainId) => generatePositionForBrainFn({ data: { ...base, brainId } })),
);

// Round 2: one clerk finds real root disagreements.
const debate = await generateCrossExaminationFn({ data: { ...base, positions } });

// Round 3: each brain can move—or explicitly hold—after hearing the table.
const finalPositions = await Promise.all(
  brainIds.map((brainId) =>
    generateFinalPositionForBrainFn({ data: { ...base, brainId, positions, debate } }),
  ),
);`

const borrowedShareBoundary = `// Anonymous work is device-bound until the user chooses to save.
const KEY = "borrowed-brain:sessions";
window.localStorage.setItem(KEY, JSON.stringify(allSessions));

// A signed-in update identifies the row; ownership is enforced by RLS.
await context.supabase
  .from("decisions")
  .update(patch)
  .eq("id", decisionId);

// Public links use a short, non-cryptographic random suffix.
share_slug =
  shareMode === "private"
    ? null
    : decisionId.slice(0, 8) + Math.random().toString(36).slice(2, 8);`

const verificationCommands = `# The Last Press and Psych Lab
npm ci
npm run build
npm run lint

# Psych Lab also received a separate strict TypeScript check.
npx tsc --noEmit

# Borrowed Brain
bun install --frozen-lockfile
bun run build
bun x tsc --noEmit
bun run lint

# Repository inventory also checked for:
# - LICENSE / package license declarations
# - test scripts and test/spec files
# - hosted CodeQL checks and open alerts
# - live route reachability, separately from source behavior`

export function LovablePrototypeTrioArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / THREE SHIPPED PROTOTYPES</p>
        <h2>The same build loop produced three very different authority problems.</h2>
        <p className="article-lede">
          The Last Press, Psych Lab, and Borrowed Brain are not mockups. Each is a deployed React
          product with authentication, persistent data, and a real interaction loop. Their public
          repositories also show why “deployed” and “ready to launch” are different claims.
        </p>
        <p>
          I audited each repository at one immutable commit, installed its locked dependencies in a
          fresh clone, ran the available build and static checks, inspected its security signals,
          and then tested only the live behaviors reported here. Source inspection establishes how
          the code is designed; live observation establishes only what the deployed page actually
          showed during the audit.
        </p>
        <div className="reference-grid">
          <article>
            <p className="eyebrow">GLOBAL GAME</p>
            <h3>The Last Press</h3>
            <p>One shared countdown, scarce presses, realtime resets, and a last-presser winner.</p>
          </article>
          <article>
            <p className="eyebrow">AUTHORING SYSTEM</p>
            <h3>Psych Lab</h3>
            <p>AI-assisted questionnaire drafting with deterministic participant scoring.</p>
          </article>
          <article>
            <p className="eyebrow">DECISION TOOL</p>
            <h3>Borrowed Brain</h3>
            <p>Fourteen reasoning lenses interrogate and debate one consequential choice.</p>
          </article>
        </div>
        <ArticleCallout title="Prototype is a delivery stage, not a safety argument" tone="warning">
          <p>
            All three production builds passed. Separate strict TypeScript checks passed for Psych
            Lab and Borrowed Brain; one was not recorded for The Last Press. None of the
            repositories contains an automated test suite or declares an open-source license, and
            all three lint runs fail heavily. Those facts do not erase the product work; they define
            the next gate.
          </p>
        </ArticleCallout>
      </section>

      <section id="shared-pattern">
        <p className="eyebrow">02 / THE SHARED PATTERN</p>
        <h2>
          Lovable accelerated the shell. Product-specific boundaries still had to be designed.
        </h2>
        <p>
          The repositories share a recognizable generated foundation: React 19, TanStack Start,
          Router and Query, Vite, Nitro, Tailwind CSS, Radix-derived components, Supabase clients
          and auth middleware, plus Lovable’s build and deployment configuration. That commonality
          made navigation, forms, responsive surfaces, server functions, and cloud wiring fast to
          assemble.
        </p>
        <LovableBuildArchitectureDiagram />
        <CodeBlock code={sharedStack} label="Shared architecture, condensed" language="text" />
        <p>
          The pattern is not a shared backend. The Last Press puts game authority in PostgreSQL;
          Psych Lab treats an AI-produced questionnaire as an artifact that must validate before
          use; Borrowed Brain keeps an anonymous decision on-device and makes cloud persistence
          optional. The scaffolding repeats. The source of truth does not.
        </p>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Layer</th>
                <th scope="col">Shared choice</th>
                <th scope="col">Where the products diverge</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Interface</th>
                <td>React 19, TanStack Router, Tailwind, Radix primitives</td>
                <td>Live game, creator studio, or staged decision chamber</td>
              </tr>
              <tr>
                <th scope="row">Server boundary</th>
                <td>TanStack server functions and validated inputs</td>
                <td>Atomic SQL, AI artifact generation, or structured debate calls</td>
              </tr>
              <tr>
                <th scope="row">Persistence</th>
                <td>Supabase where shared state is needed</td>
                <td>
                  Authoritative game state, creator/respondent records, or optional saved decisions
                </td>
              </tr>
              <tr>
                <th scope="row">Commerce</th>
                <td>Provider SDK behind a server boundary</td>
                <td>Paddle membership, Stripe plans/marketplace, or none</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="last-press">
        <p className="eyebrow">03 / THE LAST PRESS</p>
        <h2>The database owns the button. Nothing durable owns the moment the clock expires.</h2>
        <p className="article-lede">
          The public UI calls the game <em>The Last Person</em>: everyone watches one global timer,
          an eligible player spends a scarce press to reset it, and the most recent presser wins
          when time reaches zero. Free accounts receive one monthly press; membership adds ten.
          Paddle supplies subscription checkout, webhooks, cancellation, and the customer portal—not
          game state authority.
        </p>
        <LastPressFlowDiagram />
        <p>
          The strongest implementation choice is the press itself. The authenticated server function
          calls one <code>SECURITY DEFINER</code> PL/pgSQL function. That function refills and locks
          the player row, checks bans, allowance, and a two-second rate limit, settles any
          already-expired season, locks the chosen season, resets its expiration, decrements the
          allowance, updates season participation, and appends the press record inside one database
          transaction.
        </p>
        <CodeBlock
          code={atomicPress}
          label="Atomic press transaction, condensed"
          language="sql"
          sourceHref={lastPressSource(
            'supabase/migrations/20260823215551_dbaccefd-31cb-459c-a792-08c1ff4a3717.sql',
            '#L199-L257',
          )}
        />
        <p>
          Browsers do not decrement a canonical timer. They fetch season timestamps, correct local
          clock drift from a server-time function, render a smooth local countdown, poll every
          fifteen seconds, and invalidate the query when Supabase Realtime reports a season change
          or press.
        </p>
        <CodeBlock
          code={realtimeClock}
          label="Server-clock and realtime convergence, condensed"
          language="tsx"
          sourceHref={lastPressSource('src/hooks/useGame.ts', '#L47-L76')}
        />
        <ArticleCallout title="Live observation: the season did not close itself" tone="warning">
          <p>
            During the live audit, the only active season remained at <code>00:00:00</code> with
            “Time’s up. Settling…” roughly six days and seventeen hours after its only press; season
            history still called it “Running now.” The repository explains the stall: settlement is
            invoked lazily by the next press or manually by an admin, and no scheduled executor or
            durable worker calls it at the expiration timestamp.
          </p>
        </ArticleCallout>
        <p>
          A second boundary is more serious than a display defect. The owner-only profile policy
          limits <em>which row</em> a signed-in user may update, but the table grant does not limit
          <em>which columns</em>. The same row contains membership, ban state, and remaining
          presses. Direct Supabase access can therefore bypass the intended server functions.
        </p>
        <CodeBlock
          code={unsafeProfilePolicy}
          label="Owner-only row, unrestricted profile columns"
          language="sql"
          sourceHref={lastPressSource(
            'supabase/migrations/20260823215551_dbaccefd-31cb-459c-a792-08c1ff4a3717.sql',
            '#L25-L46',
          )}
        />
        <p>
          The mobile audit also reproduced a 422-pixel document inside a 390-pixel viewport,
          clipping the giant timer. On <code>/players/Saber</code>, “Closest press” rendered
          <code>Infinity:NaN:NaN:NaN</code>. The pinned profile code checks whether any presses
          exist, then applies <code>Math.min</code> to the subset with positive remaining time; if
          all values are zero, that subset is empty and <code>Math.min(...[])</code> returns
          infinity.
        </p>
        <ArticleCallout title="Launch recommendation" tone="warning">
          <p>
            Do not launch this game publicly yet. Add an idempotent scheduled settlement path,
            remove direct profile-column updates from ordinary users, fix the two reproduced mobile
            failures, and cover simultaneous presses, expiry, allowance, billing transitions, and
            responsive layouts with tests before inviting real competition.
          </p>
        </ArticleCallout>
      </section>

      <section id="psych-lab">
        <p className="eyebrow">04 / PSYCH LAB</p>
        <h2>AI authors the instrument; fixed code scores the person.</h2>
        <p className="article-lede">
          Psych Lab lets a creator describe an established instrument or a new construct, generate a
          questionnaire specification, review the draft, publish it behind a join code, collect
          responses, and sell plans or marketplace access through Stripe. The important design
          choice is that participant answers never return to the authoring model.
        </p>
        <PsychLabFlowDiagram />
        <p>
          Questionnaire generation streams a potentially large JSON response from the Lovable AI
          gateway. Before the result can become a test, deterministic coercion normalizes mechanical
          shape errors, Zod and cross-field checks validate the complete contract, and targeted
          repair messages feed exact failures back to the model. There are at most four drafting
          attempts; later attempts lower the temperature and the final attempt escalates to GPT-5.4
          when the creator selected another model.
        </p>
        <CodeBlock
          code={psychRepairLoop}
          label="Four-stage validation and repair loop, condensed"
          language="ts"
          sourceHref={psychLabSource('src/lib/llm.server.ts', '#L266-L346')}
        />
        <p>
          “Human edit” is narrower than a full psychometric editor at this commit. Creators can
          review every item, scoring band, interpretation, and the full JSON; they can override
          visual style and marketplace metadata, regenerate art direction, import a revised valid
          JSON spec, and choose whether to publish. The Test Detail page does not expose inline
          editing for every question even though a validated <code>saveTestSpec</code> server
          function exists.
        </p>
        <p>
          Once a respondent submits answers, ordinary TypeScript validates scale bounds, applies
          reverse scoring, aggregates by sum or mean, maps scores into declared bands, and evaluates
          attention checks. The model does not diagnose, rank, or reinterpret that person at
          runtime.
        </p>
        <CodeBlock
          code={deterministicScoring}
          label="Participant scoring stays deterministic, condensed"
          language="ts"
          sourceHref={psychLabSource('src/lib/scoring.ts', '#L45-L113')}
        />
        <p>
          Supabase stores tests, attempts, generation jobs, usage meters, subscriptions, listings,
          premium reports, creator earnings, and audit data under RLS. Stripe checkout and signed
          webhooks update plans, one-time report access, add-on credits, marketplace earnings,
          refunds, and disputes through a server-only connector gateway.
        </p>
        <p>
          The <code>generation_jobs</code> table makes progress visible, but it does not make
          execution durable. The initiating server request inserts a running row and then directly
          awaits the whole AI job. There is no queue consumer or background worker to resume an
          interrupted run.
        </p>
        <CodeBlock
          code={requestBoundGeneration}
          label="A persisted job still runs inside the request, condensed"
          language="ts"
          sourceHref={psychLabSource('src/lib/generation.functions.ts', '#L17-L58')}
        />
        <ArticleCallout title="Six open high-severity CodeQL alerts" tone="warning">
          <p>
            The hosted JavaScript/TypeScript analysis job completed successfully, but the repository
            still had six open alerts classified high: one biased-cryptographic-random finding in
            the LLM utility and five URL/tag/sanitization findings in the test-icon renderer. A
            green analysis job means the scan ran; it does not mean the alert set is empty.
          </p>
        </ArticleCallout>
        <ArticleCallout title="Launch recommendation" tone="warning">
          <p>
            Do not launch Psych Lab publicly yet. Resolve and retest all six high alerts, move long
            AI jobs to a durable worker with idempotent accounting, add golden scoring and schema
            suites, and independently review licensing, clinical-language, privacy, billing, and
            marketplace abuse boundaries. The product shape is convincing; the safety case is not
            complete.
          </p>
        </ArticleCallout>
      </section>

      <section id="borrowed-brain">
        <p className="eyebrow">05 / BORROWED BRAIN</p>
        <h2>A staged argument produces a decision board, not a decision.</h2>
        <p className="article-lede">
          Borrowed Brain contains fourteen authored reasoning lenses and six preset councils. A user
          enters one decision, adds optional context, seats two to five brains or accepts an AI
          recommendation, answers one question from each brain, watches a three-round debate, and
          receives a board of agreements, root disagreements, assumptions, strongest arguments, the
          least reversible mistake, and a smallest next action.
        </p>
        <BorrowedBrainFlowDiagram />
        <p>
          Each brain is more than a tone prompt. Its source record defines priorities, beliefs,
          decision rules, characteristic questions, blind spots, conditions for changing its mind,
          numeric tendencies, and a time horizon. The orchestrator requests JSON for a named schema,
          extracts it defensively, validates it with Zod, and gives one repair attempt with a
          compact account of the failed fields.
        </p>
        <CodeBlock
          code={borrowedStructuredOutput}
          label="Schema-checked AI output with one retry, condensed"
          language="ts"
          sourceHref={borrowedBrainSource('src/lib/ai.server.ts', '#L51-L90')}
        />
        <p>
          The debate is intentionally staged. Round one asks each brain independently, in parallel.
          Round two asks a clerk to identify genuine disagreements by assumption, risk tolerance,
          time horizon, probability, values, opportunity cost, or definition of success. Round three
          gives every brain the transcript and records whether the argument actually changed its
          mind.
        </p>
        <CodeBlock
          code={borrowedDebate}
          label="Three-round debate orchestration, condensed"
          language="tsx"
          sourceHref={borrowedBrainSource('src/routes/d.$sessionId.debate.tsx', '#L88-L154')}
        />
        <p>
          An anonymous session lives in <code>localStorage</code>, so the core flow does not require
          an account. Signing in is required only to save to Supabase, revisit a decision, record
          the eventual outcome, or share a redacted/full board. That is a thoughtful conversion
          boundary, but the cloud mutations depend on RLS for ownership rather than also filtering
          by
          <code>user_id</code>, and public share slugs use <code>Math.random</code> rather than a
          cryptographically strong token.
        </p>
        <CodeBlock
          code={borrowedShareBoundary}
          label="Local-first session and optional cloud sharing, condensed"
          language="ts"
          sourceHref={borrowedBrainSource('src/lib/decisions.functions.ts', '#L247-L338')}
        />
        <ArticleCallout title="Publication boundary" tone="warning">
          <p>
            Publish only the bounded, sample-data demonstration linked with this note. Do not invite
            real or sensitive decisions yet. Before that use, add automated orchestration and
            redaction tests, use explicit ownership predicates as defense in depth, replace share
            slugs with cryptographic random tokens, test abuse/rate limits, and validate the
            professional-safety guidance with adversarial decisions.
          </p>
        </ArticleCallout>
      </section>

      <section id="ai-boundaries">
        <p className="eyebrow">06 / AI BOUNDARIES</p>
        <h2>The useful question is not “does it use AI?” but “what may the model decide?”</h2>
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Model role</th>
                <th scope="col">Model is not authoritative for</th>
                <th scope="col">Control after generation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">The Last Press</th>
                <td>None in the game loop</td>
                <td>Timer, allowance, winner, membership</td>
                <td>PostgreSQL locks and provider webhooks</td>
              </tr>
              <tr>
                <th scope="row">Psych Lab</th>
                <td>Drafts a questionnaire artifact</td>
                <td>Participant answers and scores</td>
                <td>Coercion, Zod, repair, review, deterministic arithmetic</td>
              </tr>
              <tr>
                <th scope="row">Borrowed Brain</th>
                <td>Asks, argues, revises, synthesizes</td>
                <td>The user’s final choice or professional advice</td>
                <td>Zod schemas, explicit uncertainty, user-authored decision</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Psych Lab draws the cleanest boundary: AI can help author the measuring instrument, but a
          respondent’s result is reproduced from fixed code. Borrowed Brain necessarily leaves more
          judgment inside the model, so it compensates with distinct worldviews, explicit
          assumptions, confidence, change-of-mind records, and a final “You decide” step. Those are
          useful design constraints, not evidence that model output is true.
        </p>
        <ArticleCallout title="Structured output reduces shape risk, not epistemic risk">
          <p>
            Zod can prove that a confidence value is between zero and one hundred. It cannot prove
            the underlying recommendation is wise, a questionnaire is valid for a population, or a
            safety note is sufficient. Each product still needs domain review proportional to the
            consequence of getting the answer wrong.
          </p>
        </ArticleCallout>
      </section>

      <section id="data-boundaries">
        <p className="eyebrow">07 / DATA AND MONEY</p>
        <h2>Every durable row is a promise about authority, privacy, and recovery.</h2>
        <dl className="article-definitions">
          <div>
            <dt>The Last Press</dt>
            <dd>
              Public profiles, seasons, press history, and realtime state make the game observable.
              The atomic RPC is the right mutation boundary; the broad profile UPDATE grant is not.
              Paddle records membership state, but a timer executor must close seasons independently
              of viewer traffic.
            </dd>
          </div>
          <div>
            <dt>Psych Lab</dt>
            <dd>
              Creator identity, generated specs, participant attempts, usage, subscriptions,
              purchases, and earnings share one Supabase domain. Stripe’s signed webhook is the
              money authority; generation-job rows should be paired with resumable execution before
              users depend on them.
            </dd>
          </div>
          <div>
            <dt>Borrowed Brain</dt>
            <dd>
              Anonymous work remains on one device. Supabase receives it only after an authenticated
              save, and sharing has four disclosure modes. That minimizes collection, but
              share-token entropy, redaction, and RLS ownership need explicit tests.
            </dd>
          </div>
        </dl>
        <p>
          The shared Supabase template is productive because auth, RLS, Realtime, JSONB, and
          generated types arrive together. It is also easy to mistake “RLS is enabled” for “the data
          boundary is correct.” Policies, grants, server-function filters, public views, and storage
          of sensitive free text must be reviewed as one system.
        </p>
      </section>

      <section id="verification">
        <p className="eyebrow">08 / INDEPENDENT VERIFICATION</p>
        <h2>All three compile. None has earned a green release gate.</h2>
        <CodeBlock
          code={verificationCommands}
          label="Fresh-clone audit procedure"
          language="shell"
        />
        <div className="article-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Evidence</th>
                <th scope="col">The Last Press</th>
                <th scope="col">Psych Lab</th>
                <th scope="col">Borrowed Brain</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Pinned commit</th>
                <td>
                  <code>{lastPressCommit.slice(0, 7)}</code>
                </td>
                <td>
                  <code>{psychLabCommit.slice(0, 7)}</code>
                </td>
                <td>
                  <code>{borrowedBrainCommit.slice(0, 7)}</code>
                </td>
              </tr>
              <tr>
                <th scope="row">Production build</th>
                <td>Pass</td>
                <td>Pass</td>
                <td>Pass</td>
              </tr>
              <tr>
                <th scope="row">Strict TypeScript</th>
                <td>Not separately recorded</td>
                <td>Pass</td>
                <td>Pass</td>
              </tr>
              <tr>
                <th scope="row">Repository tests</th>
                <td>None found</td>
                <td>None found</td>
                <td>None found</td>
              </tr>
              <tr>
                <th scope="row">Lint</th>
                <td>529 problems: 523 errors, 6 warnings</td>
                <td>1,372 problems: 1,362 errors, 10 warnings</td>
                <td>374 problems: 368 errors, 6 warnings</td>
              </tr>
              <tr>
                <th scope="row">Declared OSS license</th>
                <td>None</td>
                <td>None</td>
                <td>None</td>
              </tr>
              <tr>
                <th scope="row">CodeQL</th>
                <td>Hosted analysis passed</td>
                <td>Hosted analysis passed; 6 open high alerts</td>
                <td>Hosted analysis passed; public alert list required authentication</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ArticleCallout title="What the live checks proved—and did not" tone="warning">
          <p>
            The Last Press check reproduced the stale expired season, the narrow-screen overflow,
            and the malformed closest-press display. Psych Lab redirected from its Lovable address
            to
            <a href="https://getpsychlab.app" rel="external">
              {' '}
              getpsychlab.app
            </a>
            , where the home, Explore, Take, and Auth routes loaded; three public questionnaires
            were listed and code
            <code>QGTW9H</code> opened a 21-item PEAI introduction without browser-console errors.
            Borrowed Brain and its Brains, Roundtables, Decisions, and Auth routes returned HTML
            200, while a deliberate unknown route returned 404. These observations prove
            reachability and visible entry flows—not correct scoring, authentication, billing,
            privacy, AI behavior, or exploit resistance.
          </p>
        </ArticleCallout>
      </section>

      <section id="launch-gates">
        <p className="eyebrow">09 / LAUNCH GATES</p>
        <h2>Turn the most important assumptions into required evidence.</h2>
        <ol className="article-steps">
          <li>
            <span>01</span>
            <strong>Declare how each repository may be used, modified, and redistributed.</strong>
          </li>
          <li>
            <span>02</span>
            <strong>
              Add automated unit, integration, and browser tests around each product’s authority
              path.
            </strong>
          </li>
          <li>
            <span>03</span>
            <strong>
              Make typecheck, lint, tests, build, and unresolved security alerts merge gates.
            </strong>
          </li>
          <li>
            <span>04</span>
            <strong>
              Give timer settlement and long AI generation durable, idempotent executors with
              recovery.
            </strong>
          </li>
          <li>
            <span>05</span>
            <strong>
              Audit RLS, grants, share tokens, public projections, and webhook replay behavior.
            </strong>
          </li>
          <li>
            <span>06</span>
            <strong>
              Re-run mobile, accessibility, privacy, billing, abuse, and domain-specific safety
              reviews.
            </strong>
          </li>
        </ol>
        <p>
          “No public launch” is not a verdict on whether the prototypes are worth continuing. It is
          a sequencing decision: preserve the fast product learning, then add evidence where users
          would otherwise be asked to trust a timer, a psychological result, or consequential
          advice.
        </p>
      </section>

      <section id="files">
        <p className="eyebrow">10 / PINNED SOURCE MAP</p>
        <h2>The claims above stay attached to inspectable files.</h2>
        <div className="reference-grid">
          <article>
            <p className="eyebrow">THE LAST PRESS</p>
            <h3>
              <a href={`${lastPressRepository}/tree/${lastPressCommit}`} rel="external">
                Commit {lastPressCommit.slice(0, 7)} <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <ul>
              <li>
                <a href={lastPressSource('src/hooks/useGame.ts')} rel="external">
                  Realtime client and server-clock sync
                </a>
              </li>
              <li>
                <a href={lastPressSource('src/lib/game.functions.ts')} rel="external">
                  Authenticated game server functions
                </a>
              </li>
              <li>
                <a
                  href={lastPressSource('src/routes/players.$username.tsx', '#L59-L67')}
                  rel="external"
                >
                  Empty closest-press reduction
                </a>
              </li>
              <li>
                <a
                  href={lastPressSource('src/routes/api/public/payments/webhook.ts')}
                  rel="external"
                >
                  Paddle membership webhooks
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">PSYCH LAB</p>
            <h3>
              <a href={`${psychLabRepository}/tree/${psychLabCommit}`} rel="external">
                Commit {psychLabCommit.slice(0, 7)} <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <ul>
              <li>
                <a href={psychLabSource('src/lib/llm.server.ts')} rel="external">
                  AI stream, model policy, and repair loop
                </a>
              </li>
              <li>
                <a href={psychLabSource('src/lib/spec-coerce.ts')} rel="external">
                  Mechanical spec coercion
                </a>
              </li>
              <li>
                <a href={psychLabSource('src/lib/spec.ts')} rel="external">
                  Zod and cross-field contract
                </a>
              </li>
              <li>
                <a href={psychLabSource('src/lib/scoring.ts')} rel="external">
                  Deterministic participant scoring
                </a>
              </li>
            </ul>
          </article>
          <article>
            <p className="eyebrow">BORROWED BRAIN</p>
            <h3>
              <a href={`${borrowedBrainRepository}/tree/${borrowedBrainCommit}`} rel="external">
                Commit {borrowedBrainCommit.slice(0, 7)} <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <ul>
              <li>
                <a href={borrowedBrainSource('src/lib/brains.ts')} rel="external">
                  Fourteen brains and six councils
                </a>
              </li>
              <li>
                <a href={borrowedBrainSource('src/lib/orchestration.server.ts')} rel="external">
                  Questions, debate, board, and tests
                </a>
              </li>
              <li>
                <a href={borrowedBrainSource('src/lib/session-store.ts')} rel="external">
                  Anonymous local sessions
                </a>
              </li>
              <li>
                <a href={borrowedBrainSource('src/lib/decisions.functions.ts')} rel="external">
                  Save, review, sharing, and redaction
                </a>
              </li>
            </ul>
          </article>
        </div>
        <ul className="source-list">
          <li>
            <a href="https://the-last-press.lovable.app" rel="external">
              The Last Press held/degraded deployment, retained as review evidence
            </a>
          </li>
          <li>
            <a href="https://psych-test-forge.lovable.app" rel="external">
              Psych Lab held/degraded deployment and canonical redirect, retained as review evidence
            </a>
          </li>
          <li>
            <a href="https://borrowed-thinking-lab.lovable.app" rel="external">
              Borrowed Brain live deployment
            </a>
          </li>
          <li>
            <a
              href="https://github.com/saberistic-team/the-last-press/actions/runs/33176703937/job/98867087606"
              rel="external"
            >
              The Last Press CodeQL analysis
            </a>
          </li>
          <li>
            <a
              href="https://github.com/saberistic-team/psych-test-forge/actions/runs/33294323618/job/99211278084"
              rel="external"
            >
              Psych Lab CodeQL analysis
            </a>
          </li>
          <li>
            <a
              href="https://github.com/saberistic-team/borrowed-thinking-lab/actions/runs/33319414030/job/99278651888"
              rel="external"
            >
              Borrowed Brain CodeQL analysis
            </a>
          </li>
        </ul>
        <p className="article-source-note">
          Repository claims in this note come from the three pinned public commits and fresh-clone
          checks. Live claims are explicitly labeled observations from the deployed URLs. A passing
          build or hosted scanner is reported as exactly that; it is not promoted into proof of
          correctness, security, psychometric validity, or production readiness.
        </p>
      </section>

      <section id="next">
        <p className="eyebrow">11 / WHAT I WOULD KEEP</p>
        <h2>Fast prototyping is most valuable when it reveals the next hard boundary.</h2>
        <p>
          I would keep the Last Press database transaction, Psych Lab’s separation between AI
          authoring and deterministic scoring, and Borrowed Brain’s local-first path plus explicit
          debate structure. Those are product-shaped decisions, not generic generated scaffolding.
        </p>
        <p>
          I would also keep the audit posture: pin the source, reproduce the build, test the live
          path, read the policies, inspect the worker boundary, and preserve the difference between
          “I saw it load” and “I proved it safe.” Lovable made three ambitious ideas tangible
          quickly. The next milestone is to make their most consequential promises enforceable.
        </p>
        <p className="article-lede">
          The shared lesson is simple: use the prototype to discover where authority belongs, then
          make that boundary survive races, retries, refreshes, adversaries, and time.
        </p>
      </section>
    </>
  )
}
