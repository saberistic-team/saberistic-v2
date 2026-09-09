import { ArticleCallout, CodeBlock, DiagramFrame } from '@/components/build-notes/ArticlePrimitives'

const chat = 'https://chatgpt.com/s/cx_6aa1e22246ec8191a567b03a43f5db37'

function Flow({ title, steps }: { title: string; steps: readonly (readonly [string, string])[] }) {
  return (
    <DiagramFrame title={title} description={steps.map(([name]) => name).join(' → ')} scrollable>
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
              <span>0{index + 1}</span>
              <strong>{name}</strong>
              <small>{detail}</small>
            </div>
          ))}
        </div>
      </div>
    </DiagramFrame>
  )
}

export function LicensingRoadmapArticle() {
  return (
    <>
      <section id="brief">
        <p className="eyebrow">01 / A WEBSITE BECOMES A PRODUCT</p>
        <h2>Start with the checkout. Discover the product hiding before it.</h2>
        <p className="article-lede">
          Convenient Licensing already had a way to buy licensing help. The bigger opportunity was
          helping a visitor understand what they needed before asking them to buy it.
        </p>
        <p>
          This build began as an audit of a Durable website, an embedded checkout, and a replacement
          Astro site. It grew into Licensing Roadmap: a research experience that explains likely
          pathways, documents, fees, and uncertainties, then saves the useful result as a shareable
          guide. From that foundation came fifteen tools for renewals, continuing education,
          prescribing, and working across states.
        </p>
        <ArticleCallout title="What this note records">
          <p>
            This retrospective follows the <a href={chat}>shared development chat</a>, with
            architecture cross-checked against local project documentation. The repositories are
            private. Test totals and live-trial outcomes below are historical reports from that
            chat, not new independent test runs. The tools ended the recorded work on staging; that
            is not a production launch.
          </p>
        </ArticleCallout>
      </section>
      <section id="checkout">
        <p className="eyebrow">02 / PRESERVE THE CONTRACT</p>
        <h2>The same event names do not mean the same analytics.</h2>
        <p>
          The Durable site and future Astro site shared a payment backend but maintained different
          checkout interfaces. Both had the same ten analytics event names. Yet Astro was missing
          historical step names and numbers, route positions, cart details, and attempt counts.
        </p>
        <p>
          The repair preserved Durable’s parameter contract while keeping Astro’s richer
          diagnostics. Currency, value, and items returned to the checkout-start event. Step
          completion included the final review submission. Retry counts followed submission
          outcomes. Most importantly, a throwing analytics helper could no longer prevent the
          redirect to Stripe.
        </p>
        <CodeBlock
          label="Compatibility contract—not copied implementation"
          language="text"
          code={
            'Preserve: step number/name, route position/length, navigation direction\nRestore: currency, value, items, checkout attempt number\nRetain: reason, validation fields, from/to step, action\nProtect: analytics exceptions must never interrupt checkout'
          }
        />
        <p>
          Two copies of global GA/GTM header snippets were also observed on Durable. The embed
          itself did not initialize those integrations. But duplicated HTML did not establish
          duplicated collected events, so the investigation ultimately recommended verifying actual
          collection before changing the header. The GTM noscript fallback was not itself another
          active JavaScript initialization.
        </p>
        <ArticleCallout title="Handoff is not revenue">
          <p>
            A created Stripe Checkout session measures a handoff, not payment. The audited frontend
            implementations did not emit a confirmed-payment purchase event. Analytics parity did
            not close that separate measurement gap.
          </p>
        </ArticleCallout>
      </section>
      <section id="customers">
        <p className="eyebrow">03 / MODEL THE BUSINESS ENTITY</p>
        <h2>A customer is not a checkout attempt.</h2>
        <p>
          When a visitor started checkout twice and paid once, the backend created two customer
          records. One became paid; the abandoned one stayed initiated. This was a data-model
          problem, not an Airtable display bug, affecting both main and self-service bases.
        </p>
        <Flow
          title="Separate identity from transaction history"
          steps={[
            ['Start checkout', 'Create an attempt with its order details.'],
            ['Complete payment', 'The signed webhook handles payment success.'],
            ['Resolve customer', 'Create or reuse a customer by normalized email.'],
            ['Keep history', 'Link the paid attempt; retain unfinished attempts separately.'],
          ]}
        />
        <p>
          Checkout Attempts tables, retry protection, expiration handling, and older-checkout
          compatibility preserved history without treating every abandoned cart as a customer. Email
          normalization was a practical matching rule, not complete identity resolution.
        </p>
        <p>
          This backend change was reported released through develop, staging, and main, with 230
          tests passing and production API checks. No live payment was made during verification.
          Existing duplicate records remained for a separate cleanup.
        </p>
      </section>
      <section id="roadmap">
        <p className="eyebrow">04 / GIVE RESEARCH A DESTINATION</p>
        <h2>Meet a visitor before they are ready to buy.</h2>
        <p>
          The first interaction asked for profession, current licensing state, and destination
          state. Selections started blank, with query parameters for shared or prefilled links.
          Brave Answers researched the route; OpenRouter organized findings into a scannable result.
        </p>
        <p>
          The guide separated likely pathway, requirements, government fees, processing information,
          compact considerations, and sources. Useful but unconfirmed details retained their
          explanations. Repetitive warnings later became small markers and one shared footnote,
          without removing section-specific qualifications.
        </p>
        <p>
          The tool became Licensing Roadmap, with “Find My Licensing Path” as the secondary call to
          action. “Get Started” remained primary. A homepage form, contextual links, and
          guide-to-checkout selection handoff made research useful across the site rather than
          burying it in a menu.
        </p>
      </section>
      <section id="evidence">
        <p className="eyebrow">05 / FROM ANSWERS TO EVIDENCE</p>
        <h2>Save what the model read before saving what it concluded.</h2>
        <p>
          The later experiment switched from synthesized Brave Answers to Brave LLM Context. It
          retained passages, titles, URLs, query provenance, and retrieval timestamps before model
          extraction. Evidence became reusable rather than disappearing behind generated prose.
        </p>
        <Flow
          title="The evidence-first research pipeline"
          steps={[
            ['Discover', 'Brave retrieves relevant source passages.'],
            ['Preserve', 'Store identity, text, provenance, and retrieval time.'],
            ['Structure', 'OpenRouter extracts requirements and conditions.'],
            ['Review', 'Check missing topics, quotations, support, and applicability.'],
          ]}
        />
        <CodeBlock
          label="Conceptual fact contract—not the literal API schema"
          language="text"
          code={
            'fact\n  value: what the source says\n  condition: when it applies\n  status: supported or unresolved\n  evidence: source identity + exact quotation\n\nreview\n  jurisdiction, profession, pathway, applicant conditions\n  support for numbers and dates\n  conflicting evidence and missing topics\n\npublish\n  retain supported facts; withhold unsupported assertions\n  explain unresolved coverage'
          }
        />
        <p>
          Early trials retrieved 93 passages for an NP route and 96 for an RN route. Those counts
          were observations, not quality scores. The results still omitted requirements and left a
          fee unconfirmed. More context improved the input; it did not establish completeness.
        </p>
      </section>
      <section id="completeness">
        <p className="eyebrow">06 / TEST THE OMISSIONS</p>
        <h2>A quotation can be accurate while the guide is incomplete.</h2>
        <p>
          Live review found omitted practice-history and prescribing-related conditions. Another
          trial exposed the need to distinguish an existing multistate license, a single-state
          license, and a change of primary residence. A simple state-to-state answer could hide a
          materially different pathway.
        </p>
        <p>
          The response combined fuller official-source reading, bounded follow-up searches,
          structured eligibility conditions, and a separate review comparing the draft with evidence
          and required topics. Regression cases tested incorrect additions as well as omissions.
        </p>
        <p>
          Topic profiles generalized the work. Renewal research needed first-renewal exceptions,
          recurring versus one-time training, and late or lapsed routes. Prescribing research
          separated professional authority, collaboration, state registration, and federal
          requirements. Nursing compact evidence could not establish prescribing authority.
        </p>
        <ArticleCallout title="A safety boundary, not legal advice" tone="warning">
          <p>
            These are examples of implemented checks, not current licensing instructions. Exact
            quotations, model review flags, and passing tests do not certify legal correctness or
            universal completeness. Visitors still need the responsible board’s current rules and an
            assessment of their circumstances.
          </p>
        </ArticleCallout>
      </section>
      <section id="publishing">
        <p className="eyebrow">07 / RESEARCH ON DEMAND</p>
        <h2>Let actual questions grow the library.</h2>
        <p>
          The goal was not to precompute every profession/state combination. Each valid general
          route received a stable path. A missing guide could start research when visited;
          concurrent visitors shared a job. Completed guides were saved and returned in
          server-rendered HTML.
        </p>
        <CodeBlock
          label="Public route and cache lifecycle"
          language="text"
          code={
            '/license-requirements/registered-nurse/new-york/florida\n\nmissing → bounded job → validated guide → sitemap\nfresh   → serve saved HTML immediately\nstale   → serve prior guide + one background refresh\nfailure → preserve last successful guide and research date\n\npending without a usable result → noindex\nstatus polling / sitemap reads → never start research'
          }
        />
        <p>
          Redis became the persistent guide store, not merely an expiring cache. Results became
          stale after 24 hours without disappearing. Leases, retry backoff, and revision-aware
          storage prevented older deployments from overwriting newer validated research.
          Persistence, capacity, and backups consequently became operational requirements.
        </p>
        <Flow
          title="Publish only after there is something worth reading"
          steps={[
            ['A valid visit', 'Look up the route and enforce shared limits.'],
            ['One research job', 'Track progress; retain any previous guide.'],
            ['Validated result', 'Persist usable content and its research date.'],
            ['Discovery', 'Render HTML and add the canonical guide to the sitemap.'],
          ]}
        />
        <p>
          Vercel request continuation kept work alive after navigation, with recovery after a lease
          expired. This was visit-driven work, not an independently scheduled worker. Public and
          crawler visits could consume budget. Recorded limits were ten attempts per hour per IP
          outside develop and twenty in develop, plus a shared daily cap. There was no exhaustive
          crawler or unrestricted prewarming.
        </p>
        <p>
          Personal residence and compact answers stayed separate from public guide identity.
          Comparison views avoided duplicate indexable articles. Staging remained a nonproduction
          surface: server rendering and sitemap support are capabilities, not proof of search
          indexing or ranking.
        </p>
      </section>
      <section id="tools">
        <p className="eyebrow">08 / FIFTEEN TOOLS, SHARED RESEARCH</p>
        <h2>Different questions should not repeat the same research fifteen times.</h2>
        <p>
          Cost, document, timeline, verification, and compact views could reuse a transfer guide.
          Renewal and CE shared a profession/state result. Multi-state planning used a small
          explicitly selected set of routes rather than researching the country.
        </p>
        <ul>
          <li>
            <strong>Keep a license active:</strong> Renewal Checklist, CE Requirements, Restore My
            License.
          </li>
          <li>
            <strong>Understand authority:</strong> Prescribing &amp; DEA Roadmap, Compact License
            Options, Where Can I Practice?
          </li>
          <li>
            <strong>Prepare the work:</strong> License Cost Planner, Document Checklist, Licensing
            Timeline, License Verification Helper.
          </li>
          <li>
            <strong>Plan a change:</strong> New Job Licensing Checklist, Multi-State Expansion
            Planner, Compare State Requirements.
          </li>
          <li>
            <strong>Find the right institution:</strong> Find My Licensing Board, International
            Education Roadmap.
          </li>
        </ul>
        <p>
          These were specific views over shared research, not fifteen independent chatbots. General
          renewal guidance did not calculate personal deadlines or CE balances. Job-readiness
          guidance did not determine a person’s eligibility to work.
        </p>
      </section>
      <section id="extraction">
        <p className="eyebrow">09 / DIFFICULT SOURCES</p>
        <h2>Diffbot helps read a source. It does not become the authority.</h2>
        <p>
          Brave discovered sources; a bounded direct reader retrieved approved official pages.
          Optional Diffbot extraction became a fallback for selected difficult documents, retaining
          source identity for the application’s own extraction and review.
        </p>
        <p>
          The integration required explicit enablement and a separate daily allowance, with at most
          one fallback call per research job and no automatic retry. Access denials and rejected
          redirects were not routed around. Successful extraction still did not prove every PDF
          table or hidden section had been captured.
        </p>
        <p>
          Shared source caching reduced repeat reading. But it was not a complete fact graph with
          automatic source-to-guide invalidation. Detecting changes, tracing affected claims, and
          re-reviewing dependent guides remained future work.
        </p>
      </section>
      <section id="experience">
        <p className="eyebrow">10 / MAKE THE WORK VISIBLE</p>
        <h2>Research should feel active without pretending to be certain.</h2>
        <p>
          The waiting form became dedicated guide pages with visible stages: checking saved
          research, researching sources, organizing findings, and preparing a guide. Blue icons
          clarified tools and sections; spinners stopped on completion or error. Responsive review
          caught a homepage section needing centered content, balanced cards, and mobile spacing.
        </p>
        <p>
          Headings included the profession and route, not just an arrow between states. Sources,
          dates, expandable checklists, and fee breakdowns gave results structure. Explanatory
          privacy copy moved into the policy. The goal was a useful next step with visible
          conditions, not either a wall of warnings or unjustified certainty.
        </p>
      </section>
      <section id="results">
        <p className="eyebrow">11 / RESULTS AND RELEASE BOUNDARIES</p>
        <h2>Shipping was staged. Evidence needs the same discipline.</h2>
        <p>
          The chat reports these checkpoints. Totals belong to different revisions—and the checkout
          backend is a different repository. They are not additive or independently rerun for this
          note.
        </p>
        <ul>
          <li>
            <strong>334 tests:</strong> checkout analytics parity promoted to staging.
          </li>
          <li>
            <strong>230 tests:</strong> checkout-attempt model released to production; no live
            payment test.
          </li>
          <li>
            <strong>364 tests:</strong> guide pages, progress, persistent storage, and sitemap
            behavior.
          </li>
          <li>
            <strong>380 → 392 → 408 tests:</strong> Context research, structured facts, completeness
            checks, and four reported live route trials.
          </li>
          <li>
            <strong>602 → 623 tests:</strong> expanded tools, saved-result fixes, icons, spinners,
            and responsive improvements.
          </li>
        </ul>
        <p>
          The final chat message records develop-to-staging promotion, passing checks, and
          verification of homepage layout, icons, saved guides, and sitemap behavior. LLM Context
          and Diffbot fallback were enabled there. Production remained unchanged for the
          website/tool rollout.
        </p>
        <p>
          No load benchmark, conversion lift, SEO ranking gain, comprehensive regulatory validation,
          or production tool launch is established. A renewal trial still had partial coverage and
          unconfirmed fields. Those limitations belong beside the success criteria.
        </p>
      </section>
      <section id="next">
        <p className="eyebrow">12 / WHAT REMAINS TO PROVE</p>
        <h2>The next improvement is not simply a bigger prompt.</h2>
        <p>
          The strongest next steps are more human-reviewed routes, explicit coverage and
          incorrect-claim evaluation, source-change dependency tracking, storage recovery checks,
          and measured cost and latency. Production promotion needs its own acceptance checks.
          Existing customer duplicates need a separate migration, and confirmed-payment analytics
          needs a deliberate implementation.
        </p>
        <p>
          The reusable lesson: preserve business contracts, separate identities from attempts, save
          evidence before interpretation, model applicability, reuse research, and publish only what
          the system can support.
        </p>
        <p>
          <a href={chat}>Read the shared build record</a> for decisions, corrections, and releases.
          This article excludes private account identifiers, configuration values, customer data,
          and repository code.
        </p>
      </section>
    </>
  )
}
