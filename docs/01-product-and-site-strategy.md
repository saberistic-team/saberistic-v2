# Product and site strategy

## Product thesis

Saberistic V2 should sell judgment through demonstration. The strongest differentiator is not a long list of technologies or generic development services; it is the ability to recognize when an ambitious prototype is ready for real users and to close the gap when it is not.

That idea connects all three parts of the site:

- **Evidence:** real engineering work in privacy, payments, marketplaces, infrastructure, security, and research.
- **Experiments:** original prototypes that show how Saber thinks and builds.
- **Utility:** a Production Readiness Check that gives a visitor an immediate, concrete assessment.

## Primary audiences

### Founder with a working prototype

They have momentum but cannot tell whether the system is safe, maintainable, observable, or ready for paying users. They need a production-readiness review, a technical plan, or senior implementation help.

### Technical leader with a difficult system

They face reliability, security, architecture, or delivery problems that are not being solved by adding more feature capacity. They need diagnosis and high-leverage intervention.

### Product or innovation team

They need a senior builder to turn an uncertain concept into a credible prototype without creating an architectural dead end.

### Peer, collaborator, or recruiter

They want fast proof of technical range and ownership. The Work, About, evidence links, and prototypes should make that proof easy to audit.

## Positioning

Recommended headline:

> Senior engineering for ambitious products.

Recommended support:

> I help founders and product teams turn promising prototypes into secure, observable, maintainable systems — and step into difficult engineering situations when the path forward is unclear.

This is narrower and more believable than positioning Saberistic as a full-service firm for every product and technology category.

## Offer architecture

V2 should present three offers, in this order:

1. **Prototype to Production** — assess and close the gaps between a working demo and a system that can responsibly serve customers.
2. **Engineering Rescue** — diagnose reliability, security, performance, or delivery problems in a system already under pressure.
3. **Fractional Principal Engineer** — provide senior technical direction and hands-on execution without requiring a full-time leadership hire.

The existing **Architecture Diagnostic — $200** is the accepted paid entry point. Its public CTA is **Start the Architecture Diagnostic**. Do not rename it “Prototype Review,” “Architecture Review,” or “Human Prototype Review” in other surfaces.

## Conversion model

There should be one coherent progression:

1. Visitor encounters a specific problem they recognize.
2. They inspect a prototype, case study, or verified evidence.
3. They run the free Production Readiness Check.
4. They receive the complete result before giving contact details.
5. The result recommends a relevant next step.
6. They request the paid diagnostic, book a call, or send a scoped inquiry.

Readiness results use only `self_serve`, `architecture_diagnostic`, and `engineering_rescue_inquiry`. A visitor may also go directly from a service/About/Contact surface to a separate scoped-inquiry form with `serviceInterest` set to `prototype_to_production`, `engineering_rescue`, or `fractional_principal_engineer`; these are form-routing values, not additional AI result IDs.

Primary CTA language:

- **Check production readiness** when the readiness tool is live.
- **Explore prototypes** as the primary discovery action.
- **Start the Architecture Diagnostic** for high-intent visitors.

Avoid scattering unrelated CTAs such as “learn more,” “get started,” “contact us,” “book a call,” and “request a consultation” across the same page.

## Homepage strategy

The homepage is both a professional landing page and the front door to a changing collection of app prototypes. Recommended order:

1. **Hero:** position, proof hint, readiness CTA, prototypes CTA.
2. **Featured prototypes:** two or three current builds with visible status and a clear “why it exists.”
3. **Production Readiness Check:** an interactive preview or the first question in place, not a static AI badge.
4. **Recognizable situations:** prototype under pressure, system in trouble, team missing senior technical ownership.
5. **Selected proof:** three or four experience cards with honest relationship labels and evidence links.
6. **Offers:** the three services, connected to visitor situations.
7. **Operating approach:** assess, prioritize, de-risk, build, transfer.
8. **About:** a concise founder profile and link to the complete timeline.
9. **Final CTA:** one next action matched to readiness.

Placing prototypes near the top makes the homepage feel alive and gives repeat visitors a reason to return. The professional offer still frames what the experiments demonstrate.

## Prototype editorial standard

Every featured prototype must answer:

- What problem or question prompted it?
- What can a visitor do right now?
- What technical or product decision does it demonstrate?
- What is its current status?
- Is it safe to use with real or sensitive data?
- Is the source public?
- What changed most recently?

A prototype without this context is only a screenshot. A thoughtful build note turns it into evidence of product and engineering judgment.

## Trust and evidence

The site should use the canonical public labels from [03](./03-verified-content-and-ai-brief.md) exactly: **Prior employer role**, **Contract role**, **Founder venture**, **Team role**, **Saberistic engagement**, **Sanitized diagnostic**, **Independent project**, **Open-source contribution**, and **Research**.

Do not imply that every organization named was a direct Saberistic client. Do not publish the held metrics and outcome claims listed in [03](./03-verified-content-and-ai-brief.md) until primary evidence or explicit permission exists.

Evidence should appear beside the claim it supports, not on a detached “press” page. Useful evidence includes archived official team pages, public pull requests and commits, maintained packages, published research, and official case studies.

## Voice and visual direction

The tone should be precise, calm, and direct:

- write in the first person when discussing Saber's direct work;
- prefer concrete systems and decisions over adjectives;
- explain uncertainty rather than hiding it;
- use “prototype,” “production,” “security,” and “reliability” only where the page demonstrates what they mean;
- avoid claims such as “world-class,” “cutting-edge,” “best-in-class,” or unqualified scale metrics.

The visual system should feel technical without becoming a terminal theme. Use strong typography, clear status labels, restrained motion, architectural diagrams where they genuinely explain something, and screenshots that show real interfaces. The AI feature should impress through responsiveness and usefulness, not glowing gradients or a chatbot avatar.

### Repository-derived design references

The company GitHub inventory supplies useful visual and interaction references without requiring V2 to copy an entire prototype:

- use the current `agent-web` implementation as the route/content baseline and migration control, not as a reason to carry forward its full repository history or every legacy message;
- borrow BackThen's warmer editorial storytelling, generous typography, and human tone for personal/prototype narratives while keeping all visitor demos synthetic;
- borrow The Last Press's single focal action, strong hierarchy, and restrained live-event motion only where they improve comprehension; do not inherit its dark game/hacker tone, subscription model, or public-profile mechanics;
- borrow Orchestra's guided-brief-to-reviewed-output interaction idea for the Production Readiness Check, never its local high-authority agent/Docker control plane.

Five organization repositories appear to be rapid Lovable exports whose READMEs mainly contain build prompts. They are visual references and prototype evidence, not proof that every described feature exists. Imported commit volume, recent pushes, and generated polish must not become maturity signals in the design.

## Content hierarchy

Use short summaries on the homepage and link to durable detail pages:

- homepage proof card → case study or experience record;
- prototype card → prototype detail/build note;
- service card → service page with fit, deliverables, and non-fit;
- readiness result → methodology and paid diagnostic;
- About summary → full timeline and source links.

This avoids the previous tendency to make the homepage carry every service, technology, credential, and narrative at once.

## MVP scope

### Include

- a refined homepage;
- prototype index and detail routes;
- Work index and verified case-study pages;
- Services, About, Contact, Privacy, Terms, and AI Methodology pages;
- Payload admin and editorial preview;
- Umami tracking for defined events;
- the Production Readiness Check;
- an accessible contact/diagnostic request form;
- SEO metadata, sitemap, robots rules, Open Graph images, and structured data;
- a staging and production deployment.

### Defer

- visitor accounts;
- comments or community features;
- a general-purpose AI chatbot;
- repository, URL, document, or log ingestion;
- automated code analysis;
- newsletter automation;
- a full article publication program;
- one shared monorepo containing every future prototype;
- a custom public analytics dashboard.

## Product success criteria

Qualitative launch criteria:

- a new visitor can explain what Saberistic does after the hero and first content block;
- a skeptical visitor can verify major experience claims without leaving ambiguity about the relationship;
- a visitor can try at least two functioning public prototypes without creating an account, including one polished featured `beta` or `live` experience;
- the readiness check returns a useful deterministic result when the model is unavailable;
- the site feels authored and maintained, not generated from a generic agency template.

Initial behavioral indicators:

- prototype card → prototype detail click-through;
- prototype detail → live app launch rate;
- readiness check start → completion rate;
- result → paid diagnostic CTA rate;
- qualified paid-diagnostic requests and qualified direct service inquiries per month, reported separately;
- repeat prototype sessions within Umami's configured anonymous salt-rotation window, understood as a privacy-preserving directional signal rather than durable identity.

The exact targets should be set after four weeks of clean baseline data rather than invented before launch.
