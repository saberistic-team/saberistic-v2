import { DiagramFrame } from './ArticlePrimitives'

function ArrowMarker({ id }: { id: string }) {
  return (
    <marker id={id} markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
      <path className="diagram-arrow" d="M0,0 L8,4 L0,8 Z" />
    </marker>
  )
}

export function LovableBuildArchitectureDiagram() {
  return (
    <DiagramFrame
      description="The three prototypes share a prompt-driven build loop: Lovable turns conversations into source changes, GitHub keeps the inspectable history, and Lovable deploys the application. At runtime, browser UI calls server functions and uses a database or external service only where the product needs durable shared state."
      scrollable
      title="One build loop, several product-shaped runtimes"
    >
      <svg
        aria-labelledby="lovable-build-architecture-title lovable-build-architecture-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 1080 660"
      >
        <title id="lovable-build-architecture-title">
          Shared Lovable prototype build and runtime architecture
        </title>
        <desc id="lovable-build-architecture-desc">
          A builder describes and reviews changes in Lovable. Lovable commits generated source to a
          GitHub repository, then deploys the repository to a web runtime. In production, a browser
          interface calls server or edge functions, which coordinate durable databases, realtime
          channels, AI gateways, or payment services. Browser-local storage remains an option for
          anonymous state that does not need to be shared.
        </desc>
        <defs>
          <ArrowMarker id="lovable-build-arrow" />
        </defs>

        <text className="diagram-label" x="50" y="48">
          BUILD LOOP
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="128"
          rx="2"
          width="260"
          x="50"
          y="78"
        />
        <text className="diagram-label diagram-label--center" x="180" y="118">
          LOVABLE PROJECT
        </text>
        <text className="diagram-detail diagram-detail--center" x="180" y="150">
          prompt · inspect · refine
        </text>
        <text className="diagram-detail diagram-detail--center" x="180" y="178">
          visual feedback loop
        </text>

        <rect className="diagram-shape" height="128" rx="2" width="260" x="410" y="78" />
        <text className="diagram-label diagram-label--center" x="540" y="118">
          GITHUB REPOSITORY
        </text>
        <text className="diagram-detail diagram-detail--center" x="540" y="150">
          generated source + history
        </text>
        <text className="diagram-detail diagram-detail--center" x="540" y="178">
          inspectable outside the builder
        </text>

        <rect className="diagram-shape" height="128" rx="2" width="260" x="770" y="78" />
        <text className="diagram-label diagram-label--center" x="900" y="118">
          LOVABLE DEPLOY
        </text>
        <text className="diagram-detail diagram-detail--center" x="900" y="150">
          build + web runtime
        </text>
        <text className="diagram-detail diagram-detail--center" x="900" y="178">
          custom or lovable.app domain
        </text>

        <path
          className="diagram-line"
          d="M310 142 L402 142"
          markerEnd="url(#lovable-build-arrow)"
        />
        <path
          className="diagram-line"
          d="M670 142 L762 142"
          markerEnd="url(#lovable-build-arrow)"
        />

        <text className="diagram-label" x="50" y="286">
          VISITOR RUNTIME
        </text>

        <rect className="diagram-shape" height="134" rx="2" width="260" x="50" y="316" />
        <text className="diagram-label diagram-label--center" x="180" y="356">
          BROWSER UI
        </text>
        <text className="diagram-detail diagram-detail--center" x="180" y="388">
          React interaction surface
        </text>
        <text className="diagram-detail diagram-detail--center" x="180" y="416">
          anonymous state can stay local
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="134"
          rx="2"
          width="260"
          x="410"
          y="316"
        />
        <text className="diagram-label diagram-label--center" x="540" y="356">
          SERVER FUNCTIONS
        </text>
        <text className="diagram-detail diagram-detail--center" x="540" y="388">
          validate · authorize · mutate
        </text>
        <text className="diagram-detail diagram-detail--center" x="540" y="416">
          secrets stay off the client
        </text>

        <rect className="diagram-shape" height="134" rx="2" width="260" x="770" y="316" />
        <text className="diagram-label diagram-label--center" x="900" y="356">
          SHARED SERVICES
        </text>
        <text className="diagram-detail diagram-detail--center" x="900" y="388">
          database · realtime · AI
        </text>
        <text className="diagram-detail diagram-detail--center" x="900" y="416">
          payments when required
        </text>

        <path
          className="diagram-line"
          d="M310 383 L402 383"
          markerEnd="url(#lovable-build-arrow)"
        />
        <path
          className="diagram-line"
          d="M670 383 L762 383"
          markerEnd="url(#lovable-build-arrow)"
        />
        <path
          className="diagram-line"
          d="M900 206 L900 308"
          markerEnd="url(#lovable-build-arrow)"
        />

        <rect className="diagram-shape" height="90" rx="2" width="260" x="50" y="520" />
        <text className="diagram-label diagram-label--center" x="180" y="556">
          LOCALSTORAGE
        </text>
        <text className="diagram-detail diagram-detail--center" x="180" y="584">
          private, device-bound continuity
        </text>
        <path
          className="diagram-line"
          d="M180 450 L180 512"
          markerEnd="url(#lovable-build-arrow)"
        />

        <text className="diagram-detail diagram-detail--center" x="700" y="555">
          the shared pattern is not a shared backend:
        </text>
        <text className="diagram-detail diagram-detail--center" x="700" y="585">
          each prototype chooses the smallest persistence and authority boundary it needs
        </text>
      </svg>
    </DiagramFrame>
  )
}

export function LastPressFlowDiagram() {
  return (
    <DiagramFrame
      description="Each press is a server-authoritative transaction: lock the active season and player profile, enforce cooldown and allowance, reset the deadline, and append the press. Realtime lets browsers converge, but an expired season still needs code to invoke settlement—and the audited build has no independent scheduler."
      scrollable
      title="The server owns each press; nothing independently wakes settlement"
    >
      <svg
        aria-labelledby="last-press-flow-title last-press-flow-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 1120 700"
      >
        <title id="last-press-flow-title">The Last Press authoritative round flow</title>
        <desc id="last-press-flow-desc">
          Player browsers send press commands while a server-time endpoint corrects their display
          clocks. A PostgreSQL function locks the active season and player profile, checks the
          cooldown and remaining allowance, resets the shared deadline, and appends the press in one
          transaction. The committed season and press rows are broadcast through realtime. When the
          timer expires, settlement can choose the last presser, but only another press or an admin
          action invokes the current settlement code; there is no independent scheduled executor.
        </desc>
        <defs>
          <ArrowMarker id="last-press-arrow" />
        </defs>

        <text className="diagram-label" x="45" y="48">
          COMMANDS
        </text>
        <rect className="diagram-shape" height="112" rx="2" width="230" x="45" y="82" />
        <text className="diagram-label diagram-label--center" x="160" y="122">
          PLAYER BROWSERS
        </text>
        <text className="diagram-detail diagram-detail--center" x="160" y="154">
          press intent
        </text>
        <text className="diagram-detail diagram-detail--center" x="160" y="178">
          never the final count
        </text>

        <rect className="diagram-shape" height="112" rx="2" width="230" x="45" y="244" />
        <text className="diagram-label diagram-label--center" x="160" y="284">
          CLOCK + REALTIME
        </text>
        <text className="diagram-detail diagram-detail--center" x="160" y="316">
          server-time correction
        </text>
        <text className="diagram-detail diagram-detail--center" x="160" y="340">
          committed updates only
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="274"
          rx="2"
          width="300"
          x="390"
          y="82"
        />
        <text className="diagram-label diagram-label--center" x="540" y="124">
          SERVER MUTATION
        </text>
        <text className="diagram-detail diagram-detail--center" x="540" y="162">
          1 · lock season + profile
        </text>
        <text className="diagram-detail diagram-detail--center" x="540" y="196">
          2 · cooldown + allowance
        </text>
        <text className="diagram-detail diagram-detail--center" x="540" y="230">
          3 · reset ends_at + append press
        </text>
        <line className="diagram-line" x1="430" x2="650" y1="254" y2="254" />
        <text className="diagram-detail diagram-detail--center" x="540" y="288">
          one committed result
        </text>
        <text className="diagram-detail diagram-detail--center" x="540" y="320">
          serializes racing clients
        </text>

        <path className="diagram-line" d="M275 138 L382 138" markerEnd="url(#last-press-arrow)" />
        <path className="diagram-line" d="M275 300 L382 300" markerEnd="url(#last-press-arrow)" />

        <rect className="diagram-shape" height="132" rx="2" width="270" x="805" y="82" />
        <text className="diagram-label diagram-label--center" x="940" y="122">
          ROUND RECORD
        </text>
        <text className="diagram-detail diagram-detail--center" x="940" y="154">
          season · ends_at · last presser
        </text>
        <text className="diagram-detail diagram-detail--center" x="940" y="182">
          database source of truth
        </text>
        <path className="diagram-line" d="M690 148 L797 148" markerEnd="url(#last-press-arrow)" />

        <rect
          className="diagram-shape diagram-shape--accent"
          height="112"
          rx="2"
          width="270"
          x="805"
          y="274"
        />
        <text className="diagram-label diagram-label--center" x="940" y="314">
          REALTIME EVENT
        </text>
        <text className="diagram-detail diagram-detail--center" x="940" y="346">
          broadcast committed state
        </text>
        <text className="diagram-detail diagram-detail--center" x="940" y="370">
          all clients converge
        </text>
        <path className="diagram-line" d="M940 214 L940 266" markerEnd="url(#last-press-arrow)" />
        <path
          className="diagram-line"
          d="M805 330 C690 420 285 430 168 204"
          markerEnd="url(#last-press-arrow)"
        />

        <rect className="diagram-shape" height="108" rx="2" width="300" x="390" y="460" />
        <text className="diagram-label diagram-label--center" x="540" y="500">
          TIMER EXPIRES
        </text>
        <text className="diagram-detail diagram-detail--center" x="540" y="532">
          last presser can become winner
        </text>
        <text className="diagram-detail diagram-detail--center" x="540" y="556">
          settlement must be invoked
        </text>
        <path
          className="diagram-line"
          d="M805 180 C730 350 620 390 560 452"
          markerEnd="url(#last-press-arrow)"
        />

        <rect
          className="diagram-node diagram-node--blocked"
          height="108"
          rx="2"
          width="340"
          x="735"
          y="460"
        />
        <text className="diagram-label diagram-label--center" x="905" y="500">
          NO SCHEDULED EXECUTOR
        </text>
        <text className="diagram-detail diagram-detail--center" x="905" y="532">
          next press / admin must wake it
        </text>
        <text className="diagram-detail diagram-detail--center" x="905" y="556">
          expired season can remain open
        </text>
        <path
          className="diagram-line"
          d="M690 514 L727 514"
          markerEnd="url(#last-press-arrow)"
          strokeDasharray="8 7"
        />

        <text className="diagram-detail diagram-detail--center" x="560" y="642">
          the atomic press transaction is sounder than the lifecycle around it: expiry needs an
          independent, idempotent scheduled settlement path
        </text>
      </svg>
    </DiagramFrame>
  )
}

export function PsychLabFlowDiagram() {
  return (
    <DiagramFrame
      description="Psych Lab uses AI to draft a questionnaire specification, then mechanically coerces and validates it with Zod, repairing failures before a human edits and publishes. Respondent answers stay beyond that authoring boundary: reverse scoring, bands, attention checks, and results are deterministic arithmetic rather than a new model judgment."
      scrollable
      title="AI writes the instrument; it does not judge the respondent"
    >
      <svg
        aria-labelledby="psych-lab-flow-title psych-lab-flow-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 1160 730"
      >
        <title id="psych-lab-flow-title">Psych Lab authoring and respondent flow</title>
        <desc id="psych-lab-flow-desc">
          A creator prompt is sent through a streaming AI gateway. Returned JSON is extracted,
          mechanically coerced, and validated against a Zod schema. Validation errors trigger
          targeted repair attempts. A human then edits and approves the draft before publication
          behind a join code or marketplace listing. On the other side of a clear AI boundary,
          respondent answers are scored with fixed arithmetic, reverse scoring, bands, and attention
          checks. Respondent answers never return to the AI authoring path.
        </desc>
        <defs>
          <ArrowMarker id="psych-lab-arrow" />
        </defs>

        <text className="diagram-label" x="42" y="45">
          AI-ASSISTED AUTHORING
        </text>
        <rect
          className="diagram-shape"
          height="290"
          rx="2"
          strokeDasharray="9 8"
          width="672"
          x="32"
          y="66"
        />

        <rect className="diagram-shape" height="104" rx="2" width="182" x="55" y="102" />
        <text className="diagram-label diagram-label--center" x="146" y="141">
          PROMPT
        </text>
        <text className="diagram-detail diagram-detail--center" x="146" y="172">
          established or novel
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="104"
          rx="2"
          width="182"
          x="278"
          y="102"
        />
        <text className="diagram-label diagram-label--center" x="369" y="141">
          AI STREAM
        </text>
        <text className="diagram-detail diagram-detail--center" x="369" y="172">
          one JSON spec
        </text>

        <rect className="diagram-shape" height="104" rx="2" width="182" x="501" y="102" />
        <text className="diagram-label diagram-label--center" x="592" y="137">
          COERCE
        </text>
        <text className="diagram-detail diagram-detail--center" x="592" y="166">
          repair mechanical shape
        </text>
        <text className="diagram-detail diagram-detail--center" x="592" y="190">
          before judgment
        </text>

        <path className="diagram-line" d="M237 154 L270 154" markerEnd="url(#psych-lab-arrow)" />
        <path className="diagram-line" d="M460 154 L493 154" markerEnd="url(#psych-lab-arrow)" />

        <rect
          className="diagram-shape diagram-shape--accent"
          height="102"
          rx="2"
          width="254"
          x="246"
          y="238"
        />
        <text className="diagram-label diagram-label--center" x="373" y="276">
          ZOD CONTRACT
        </text>
        <text className="diagram-detail diagram-detail--center" x="373" y="307">
          items · scales · bands · visuals
        </text>
        <text className="diagram-detail diagram-detail--center" x="373" y="331">
          valid → draft
        </text>
        <path
          className="diagram-line"
          d="M592 206 C592 230 520 250 508 274"
          markerEnd="url(#psych-lab-arrow)"
        />

        <rect
          className="diagram-node diagram-node--work"
          height="102"
          rx="2"
          width="150"
          x="525"
          y="238"
        />
        <text className="diagram-label diagram-label--center" x="600" y="276">
          REPAIR
        </text>
        <text className="diagram-detail diagram-detail--center" x="600" y="307">
          targeted errors
        </text>
        <text className="diagram-detail diagram-detail--center" x="600" y="331">
          up to 4 drafts
        </text>
        <path className="diagram-line" d="M500 288 L517 288" markerEnd="url(#psych-lab-arrow)" />
        <path
          className="diagram-line"
          d="M600 238 C600 218 430 220 391 214"
          markerEnd="url(#psych-lab-arrow)"
        />
        <text className="diagram-detail" x="505" y="275">
          invalid
        </text>

        <line className="diagram-lifeline" x1="728" x2="728" y1="54" y2="684" />
        <text className="diagram-label" transform="rotate(90 746 196)" x="746" y="196">
          AI STOPS HERE
        </text>

        <rect className="diagram-shape" height="112" rx="2" width="350" x="770" y="102" />
        <text className="diagram-label diagram-label--center" x="945" y="141">
          HUMAN EDIT + APPROVAL
        </text>
        <text className="diagram-detail diagram-detail--center" x="945" y="173">
          review every item and interpretation
        </text>
        <text className="diagram-detail diagram-detail--center" x="945" y="198">
          publish → join code / listing
        </text>
        <path
          className="diagram-line"
          d="M500 319 C610 372 700 190 762 170"
          markerEnd="url(#psych-lab-arrow)"
        />

        <text className="diagram-label" x="42" y="432">
          RESPONDENT PATH · NO MODEL CALL
        </text>

        <rect className="diagram-shape" height="118" rx="2" width="240" x="45" y="470" />
        <text className="diagram-label diagram-label--center" x="165" y="509">
          JOIN + ANSWER
        </text>
        <text className="diagram-detail diagram-detail--center" x="165" y="541">
          anonymous device identity
        </text>
        <text className="diagram-detail diagram-detail--center" x="165" y="566">
          voluntary Likert responses
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="118"
          rx="2"
          width="300"
          x="365"
          y="470"
        />
        <text className="diagram-label diagram-label--center" x="515" y="509">
          FIXED SCORING
        </text>
        <text className="diagram-detail diagram-detail--center" x="515" y="541">
          reverse · sum / mean · bands
        </text>
        <text className="diagram-detail diagram-detail--center" x="515" y="566">
          deterministic attention checks
        </text>

        <rect className="diagram-shape" height="118" rx="2" width="360" x="760" y="470" />
        <text className="diagram-label diagram-label--center" x="940" y="509">
          RESULT
        </text>
        <text className="diagram-detail diagram-detail--center" x="940" y="541">
          numeric bands + pre-written text
        </text>
        <text className="diagram-detail diagram-detail--center" x="940" y="566">
          optional paid report / history
        </text>

        <path className="diagram-line" d="M285 529 L357 529" markerEnd="url(#psych-lab-arrow)" />
        <path className="diagram-line" d="M665 529 L752 529" markerEnd="url(#psych-lab-arrow)" />

        <rect
          className="diagram-node diagram-node--passed"
          height="68"
          rx="2"
          width="705"
          x="225"
          y="632"
        />
        <text className="diagram-label diagram-label--center" x="578" y="661">
          PRIVACY BOUNDARY
        </text>
        <text className="diagram-detail diagram-detail--center" x="578" y="687">
          respondent answers never cross back into the AI authoring lane
        </text>
      </svg>
    </DiagramFrame>
  )
}

export function BorrowedBrainFlowDiagram() {
  return (
    <DiagramFrame
      description="A session begins with a concrete problem and constraints, then interrogates the premise before five lenses form independent positions. Cross-examination forces the positions to answer one another, after which final positions feed a decision board. Anonymous sessions remain on the device; signing in can optionally save the same session to Supabase."
      scrollable
      title="Five independent positions become one inspectable decision"
    >
      <svg
        aria-labelledby="borrowed-brain-flow-title borrowed-brain-flow-desc"
        className="diagram-svg"
        role="img"
        viewBox="0 0 1160 720"
      >
        <title id="borrowed-brain-flow-title">
          Borrowed Brain deliberation and persistence flow
        </title>
        <desc id="borrowed-brain-flow-desc">
          The user defines a problem and constraints, answers interrogation questions, and receives
          five independent positions. Those positions cross-examine one another, revise into final
          positions, and populate a decision board that preserves agreements, disagreements, risks,
          and next moves. An anonymous user stores the session in browser local storage. An
          authenticated user may instead save it to Supabase for durable cross-device access.
        </desc>
        <defs>
          <ArrowMarker id="borrowed-brain-arrow" />
        </defs>

        <rect className="diagram-shape" height="108" rx="2" width="210" x="35" y="78" />
        <text className="diagram-label diagram-label--center" x="140" y="117">
          SETUP
        </text>
        <text className="diagram-detail diagram-detail--center" x="140" y="148">
          problem · stakes · limits
        </text>
        <text className="diagram-detail diagram-detail--center" x="140" y="172">
          desired decision
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="108"
          rx="2"
          width="230"
          x="300"
          y="78"
        />
        <text className="diagram-label diagram-label--center" x="415" y="117">
          INTERROGATION
        </text>
        <text className="diagram-detail diagram-detail--center" x="415" y="148">
          expose assumptions
        </text>
        <text className="diagram-detail diagram-detail--center" x="415" y="172">
          sharpen the question
        </text>

        <rect className="diagram-shape" height="108" rx="2" width="270" x="585" y="78" />
        <text className="diagram-label diagram-label--center" x="720" y="117">
          INDEPENDENT POSITIONS
        </text>
        <text className="diagram-detail diagram-detail--center" x="720" y="148">
          five lenses answer alone
        </text>
        <text className="diagram-detail diagram-detail--center" x="720" y="172">
          no shared draft to anchor on
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="108"
          rx="2"
          width="210"
          x="915"
          y="78"
        />
        <text className="diagram-label diagram-label--center" x="1020" y="117">
          CROSS-EXAM
        </text>
        <text className="diagram-detail diagram-detail--center" x="1020" y="148">
          challenge evidence
        </text>
        <text className="diagram-detail diagram-detail--center" x="1020" y="172">
          answer objections
        </text>

        <path
          className="diagram-line"
          d="M245 132 L292 132"
          markerEnd="url(#borrowed-brain-arrow)"
        />
        <path
          className="diagram-line"
          d="M530 132 L577 132"
          markerEnd="url(#borrowed-brain-arrow)"
        />
        <path
          className="diagram-line"
          d="M855 132 L907 132"
          markerEnd="url(#borrowed-brain-arrow)"
        />

        <text className="diagram-label diagram-label--center" x="720" y="244">
          FIVE LENSES · SEPARATE FIRST PASSES
        </text>
        {[
          ['1', 520],
          ['2', 620],
          ['3', 720],
          ['4', 820],
          ['5', 920],
        ].map(([label, x]) => (
          <g key={String(label)}>
            <circle className="diagram-node diagram-node--work" cx={Number(x)} cy="292" r="34" />
            <text className="diagram-label diagram-label--center" x={x} y="299">
              {label}
            </text>
          </g>
        ))}
        <path
          className="diagram-line"
          d="M720 186 L720 250"
          markerEnd="url(#borrowed-brain-arrow)"
        />
        <path
          className="diagram-line"
          d="M954 292 C1012 284 1030 226 1024 194"
          markerEnd="url(#borrowed-brain-arrow)"
        />

        <rect className="diagram-shape" height="110" rx="2" width="300" x="175" y="390" />
        <text className="diagram-label diagram-label--center" x="325" y="430">
          FINAL POSITIONS
        </text>
        <text className="diagram-detail diagram-detail--center" x="325" y="462">
          revised after challenge
        </text>
        <text className="diagram-detail diagram-detail--center" x="325" y="486">
          preserve real disagreement
        </text>

        <rect
          className="diagram-shape diagram-shape--accent"
          height="110"
          rx="2"
          width="350"
          x="565"
          y="390"
        />
        <text className="diagram-label diagram-label--center" x="740" y="430">
          DECISION BOARD
        </text>
        <text className="diagram-detail diagram-detail--center" x="740" y="462">
          agreements · tensions · risks
        </text>
        <text className="diagram-detail diagram-detail--center" x="740" y="486">
          options + next move
        </text>

        <path
          className="diagram-line"
          d="M1020 186 C1020 332 432 330 342 382"
          markerEnd="url(#borrowed-brain-arrow)"
        />
        <path
          className="diagram-line"
          d="M475 445 L557 445"
          markerEnd="url(#borrowed-brain-arrow)"
        />

        <text className="diagram-label" x="55" y="582">
          PERSISTENCE CHOICE
        </text>
        <rect className="diagram-shape" height="92" rx="2" width="360" x="205" y="606" />
        <text className="diagram-label diagram-label--center" x="385" y="641">
          ANONYMOUS · LOCALSTORAGE
        </text>
        <text className="diagram-detail diagram-detail--center" x="385" y="672">
          private to this browser and device
        </text>

        <rect className="diagram-shape" height="92" rx="2" width="360" x="635" y="606" />
        <text className="diagram-label diagram-label--center" x="815" y="641">
          OPTIONAL ACCOUNT · SUPABASE
        </text>
        <text className="diagram-detail diagram-detail--center" x="815" y="672">
          durable, authenticated cross-device save
        </text>

        <path
          className="diagram-line"
          d="M700 500 C630 552 490 560 420 598"
          markerEnd="url(#borrowed-brain-arrow)"
        />
        <path
          className="diagram-line"
          d="M780 500 C800 548 810 570 812 598"
          markerEnd="url(#borrowed-brain-arrow)"
        />
      </svg>
    </DiagramFrame>
  )
}
