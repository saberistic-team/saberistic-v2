# OpenRouter Production Readiness Check implementation

## Product contract

The feature answers one bounded question:

> Given the visitor's declared controls and constraints, what readiness level is defensible, what blocks the next level, and what should they do first?

It is not a security audit, code review, compliance assessment, certification, or general chatbot.

Visitor promise:

> Answer a few architecture questions. Get a readiness level, hard blockers, unknowns, a 48-hour plan, and a two-week production plan.

Trust line:

> Scored by explicit controls. Explained by AI.

The complete result appears before any lead form.

## Experience flow

1. Choose an example profile or start a custom assessment.
2. Complete five short sections using controlled choices.
3. Optionally add one 500-character symptom description.
4. The client submits a normalized manifest to the server.
5. The server validates input, applies abuse and sensitive-data checks, and calculates the immutable policy result.
6. OpenRouter writes a concise explanation constrained by that result.
7. The server validates the model JSON and business invariants.
8. Fixed React components render the scorecard and plan.
9. The visitor may download the result or explicitly request a human review.

Progress labels may say `validating answers`, `checking production gates`, `tailoring the plan`, and `validating the report`. Do not display chain-of-thought or pretend that ordinary network delay is hidden reasoning.

## Input boundary

The MVP accepts:

- enums, booleans, small bounded counts, and explicit `unknown` choices;
- at most one optional symptom field, normalized and limited to 500 characters;
- no file, code, log, repository, URL, document, credential, customer record, or pasted architecture description.

Visible warning:

> Do not paste source code, credentials, logs, customer data, client names, or confidential project details.

Reject or redact likely secrets, access tokens, private keys, email addresses, phone numbers, and unusually code-like or log-like text. OpenRouter's sensitive-information guardrail is defense in depth, not a replacement for the application check.

## Assessment sections

1. **Stage and architecture** — users, environments, dependencies, and failure impact.
2. **Identity and data** — authentication, authorization, tenancy, data sensitivity, and deletion.
3. **Delivery** — source control, review, tests, dependency handling, and deploy process.
4. **Operations** — monitoring, alerting, backups, restore tests, rollback, and runbooks.
5. **Risk boundaries** — secrets, rate limits, payments, AI/tool autonomy, and near-term load.

Each answer option maps to stable control IDs. UI text can change without changing those IDs.

## Deterministic policy engine

### Versioned artifacts

Keep these in Git:

```text
src/lib/readiness/
  questions.v1.ts
  controls.v1.ts
  blockers.v1.ts
  score.v1.ts
  report-schema.v1.ts
  prompt.v1.ts
  examples.v1.ts
  __fixtures__/
  __tests__/
```

Use an explicit version such as `2026-09-01.1` in every result. A report must be reproducible from a policy version and normalized manifest without invoking a model.

### Control evaluation

Each answer evaluates one or more controls as:

- `pass = 1`
- `partial = 0.5`
- `unknown = 0`
- `fail = 0`
- `not_applicable` removes the control from the denominator only when policy explicitly allows it.

Controls have integer weights from 1 to 3 based on consequence, not implementation effort. Normalize weighted scores into five dimensions:

- security;
- reliability;
- maintainability;
- data/privacy;
- operability.

The overall numeric score is the weighted aggregate. Also show completeness separately, because an `unknown` is not the same evidence as a confirmed failure even though neither earns readiness credit.

Calculate with integer half-points so binary floating-point behavior cannot move a boundary. Convert the exact weighted ratio to a 0–100 score and round half up to the nearest whole integer before assigning a band; display that same integer. Apply hard-blocker caps after the score band is selected. Golden tests must cover values immediately below, exactly at, and immediately above 44.5, 64.5, and 84.5 so every possible result maps to one level.

### Baseline readiness bands

Use these as the starting policy, then validate with golden cases:

| Level | Score range | Additional gate |
|---|---:|---|
| `demo_only` | 0–44 | Any critical blocker also caps here |
| `internal_beta` | 45–64 | No uncontained critical-risk behavior |
| `limited_production` | 65–84 | No critical blockers; major blockers explicitly bounded |
| `production_candidate` | 85–100 | No critical or major blockers, at least 90% weighted completeness, and no unknown weight-3 control |

The label is a directional candidate state, never a certification.

### Hard-blocker examples

Rules are explicit predicates. Examples to test and refine:

- a publicly reachable app handling accounts without server-side authorization → cap at `demo_only`;
- production secrets in client code or source control → cap at `demo_only`;
- sensitive/customer data with no backup and restore path → cap at `demo_only`;
- payments without verified webhooks and idempotency → cap below `limited_production`;
- autonomous AI/tool actions with material impact and no approval boundary → cap at `demo_only`;
- public mutation endpoints with neither authentication nor rate limiting → cap at `demo_only`;
- production deployment with no rollback and high failure impact → cap below `production_candidate`;
- backup configured but never restored → major blocker; it does not count as proven recovery.

Every blocker contains a stable rule ID, severity, evidence answer IDs, rationale template, verification step, and the maximum level it permits.

### Deterministic fallback report

Before calling OpenRouter, generate a complete template-based report from the policy result:

- readiness level and dimension scores;
- blockers sorted by severity and dependency;
- unknowns and exact verification actions;
- confirmed strengths;
- a policy-authored 48-hour checklist;
- a policy-authored two-week checklist;
- “do not optimize yet” items;
- mapped next step.

If the model times out, fails privacy routing, returns invalid JSON, or exhausts budget, return this report. The feature must remain useful when AI is unavailable.

## OpenRouter role

OpenRouter receives only:

- normalized choices using human-readable labels;
- the deterministic level, scores, blockers, unknowns, and strengths;
- a fixed catalog of allowed actions and CTA identifiers;
- the optional symptom text only after local sensitive-data checks.

The model may:

- explain why a blocker matters;
- tailor ordering and wording to the declared stage;
- turn fixed actions into concise 48-hour and two-week plans;
- choose from approved “do not optimize yet” guidance;
- write a short executive summary.

The model may not:

- change scores, severities, blocker IDs, readiness level, or CTA ID;
- introduce facts about the visitor's system;
- claim inspection of code, infrastructure, or compliance evidence;
- recommend destructive commands or collect additional sensitive data;
- invoke tools, browse the web, or fetch URLs.

## Request configuration

Use a dedicated server-side OpenRouter key and a pinned primary model plus a pinned fallback model that both support strict structured output.

Request requirements:

- `response_format.type = "json_schema"`;
- strict JSON Schema, all required fields, bounded array sizes, bounded strings, and `additionalProperties: false`;
- `provider.require_parameters = true`;
- `provider.data_collection = "deny"`;
- `provider.zdr = true`;
- conservative output-token cap;
- application timeout and at most one model retry/fallback;
- no external tools or web search;
- prompt logging/data-use opt-ins disabled;
- an API-key or workspace guardrail with model/provider allowlists, ZDR, sensitive-info handling, prompt-injection handling, and a daily/monthly budget.

Do not use `openrouter/auto` for a scored assessment. An intentional model change requires evaluation and a policy/prompt release note.

ZDR limits routing to endpoints OpenRouter marks as zero-retention. The request still transits OpenRouter and a model provider; describe that honestly in the privacy and methodology pages.

## Model response contract

Illustrative shape:

```json
{
  "summary": "string",
  "blockerExplanations": [
    {
      "ruleId": "OPS-RESTORE-001",
      "explanation": "string",
      "verification": "string"
    }
  ],
  "unknownExplanations": [],
  "strengths": [],
  "plan48Hours": [],
  "planTwoWeeks": [],
  "doNotOptimizeYet": [],
  "nextStepReason": "string"
}
```

The actual schema should cap blocker/plan counts and string lengths. Do not ask the model to restate the level, scores, policy version, blocker severities, CTA ID, or disclaimer. The server merges those deterministic values after parsing and rejects any missing rule ID, invented rule ID, extra property, or action outside the allowed catalog.

## API design

### `POST /api/readiness/assess`

Input:

- policy version requested by the current UI;
- normalized answers;
- optional sanitized symptom;
- anonymous anti-abuse token, never an analytics identifier.

Response:

- generated report or deterministic fallback;
- `fallbackUsed` boolean;
- opaque report ID plus a short-lived signed handoff token containing only the report ID, policy version, level, and allowed blocker IDs;
- no raw provider response, prompt, routing internals, or stack trace.

### `POST /api/diagnostic-requests`

Separate explicit action containing contact fields, consent, the signed handoff token, and only the minimized readiness summary the visitor chooses to share. The server verifies token integrity before storing the report ID/level/policy metadata. Any selected blocker IDs must be a subset of the signed token. Approved labels are never trusted from the browser: after verification, the server resolves each selected ID against the signed policy version's Git-owned blocker catalog and stores that canonical label snapshot. It never re-calls the model.

After validation, store only the consented fields defined for the private Payload `diagnostic-requests` collection. This route never writes to `contact-requests`, Umami, OpenRouter, or rate-limit state beyond expiring anonymous counters.

### `POST /api/contact-requests`

Separate direct-service action containing contact fields, consent, one allowlisted `serviceInterest`, and bounded optional context. It accepts no readiness token, report ID, blocker, score, level, manifest, or model output. After validation, store only the documented fields in the private Payload `contact-requests` collection; this route never writes to `diagnostic-requests`, Umami, or OpenRouter.

### Shared security contract for both public PII forms

Both `POST /api/diagnostic-requests` and `POST /api/contact-requests` must use the shared public-form security contract in [04](./04-payload-cms-implementation.md#shared-public-form-security-contract): enforce same-origin/CSRF controls, strict content type/schema and total-body-size validation, bounded and allowlisted fields, Key Value-backed limits for both an IP-derived one-way key and a separate session/challenge token, generic non-enumerating errors, and safe retry handling. Never log request bodies, contact fields, free text, handoff tokens, or notification content. Persist PII only in the matching private collection with public access denied, the provisional retention review date, and the minimized ID/type-only internal notification.

## Rate limiting and cost controls

Back rate limits with Render Key Value so they work across instances:

- low anonymous burst limit per IP-derived one-way key;
- longer rolling limit per browser challenge token;
- global concurrency ceiling;
- stricter limit for repeated invalid/sensitive submissions;
- challenge only after suspicious behavior, not for every visitor.

Do not cache manifests or generated/deterministic reports in Key Value for the public MVP. Key Value stores only expiring abuse/concurrency counters and challenge state.

The key derivation must not be reversible or stored as analytics. Set expirations and do not use rate-limit data for marketing.

At OpenRouter:

- create a dedicated key with an explicit spend limit and reset period;
- restrict models/providers through Guardrails;
- inspect per-request usage accounting;
- alert at budget thresholds;
- fail closed to the deterministic report when the compliant model route is unavailable.

## Storage and privacy

Default behavior is stateless beyond operational logs:

- do not persist the raw manifest or AI report server-side;
- keep the report in browser/session memory and generate a client-side print/PDF view;
- sign only a minimal, short-lived handoff token so contact submission can verify level/policy/report metadata without storing or trusting a client-edited report;
- logs include policy version, outcome class, timing buckets, provider/model identifiers, token counts, fallback reason, and random request ID—never the manifest or text;
- diagnostic handoff stores contact data only after explicit submission and according to the retention policy;
- Umami receives allowed event metadata only.

If future product needs require saved reports, add an explicit opt-in, authenticated access, encryption, deletion controls, and a separate data-protection review first.

## Lead handoff

After the complete report:

> Want a principal engineer to review this assessment?

The consent screen contains:

- required name, email, and contact consent;
- optional company and website;
- request type fixed to `architecture_diagnostic` or `engineering_rescue_inquiry` from the deterministic CTA;
- an unchecked **Share assessment summary** control;
- when checked, a visible list of the readiness level and blocker labels, each individually removable;
- optional new `additionalContext` limited to 1,000 characters;
- the privacy-notice version and provisional 90-day review/retention statement.

Store only the fields specified in the Payload `diagnostic-requests` collection: contact details, request type, report ID, policy version, readiness level, explicitly selected blocker IDs and server-derived canonical label snapshots, the new handoff context, consent/version/timestamp, and workflow status. Never accept label text from the client or store raw answers, the assessment symptom, model prose, scores-by-answer, or the full report. Send an internal email with request ID and type only; the reviewer signs into Payload to inspect the consented record.

Map policy outcomes to one approved next step:

- low-risk, high-readiness → self-serve guidance;
- contained or broad architecture uncertainty → **Start the Architecture Diagnostic** (`architecture_diagnostic`);
- active high-impact failure → **Engineering Rescue inquiry** (`engineering_rescue_inquiry`).

The **Architecture Diagnostic — $200** is the human validation step. The AI identifies common gates; the human reviews actual architecture, evidence, and tradeoffs.

## Evaluation plan

Create a golden set containing at least:

- the three homepage examples;
- a static brochure with no sensitive data;
- a basic SaaS with correct auth but no restore test;
- multi-tenant SaaS with an authorization gap;
- a payments system missing webhook idempotency;
- an AI agent with destructive tools and no approval;
- a mature service with complete controls;
- every critical blocker in isolation;
- contradictory and mostly-unknown manifests;
- injection, secret, PII, code, and oversized-text inputs;
- model timeout, 429, 403 guardrail, invalid JSON, extra-property/invented-rule responses, and invalid handoff tokens.

For each case, assert deterministic scores, level cap, blocker IDs, completeness, CTA, fallback usefulness, and zero sensitive logging. Human-review model prose for factual faithfulness, prioritization, clarity, and absence of overclaiming.

## Launch gates

- deterministic engine has full unit coverage for every blocker and boundary threshold;
- changing the model cannot change the level or score;
- the fallback report passes the same usefulness review as the AI-enhanced version;
- no public input accepts files, URLs, code, or long free text;
- secrets and sensitive patterns are blocked/redacted before OpenRouter;
- ZDR, data-collection denial, model allowlist, structured-output support, and spend limits are verified in the live account;
- one load test proves rate limits and concurrency control;
- one privacy test proves no answers or report content enter logs, Payload, or Umami;
- methodology and privacy pages match actual behavior;
- all UI states are keyboard accessible and usable with reduced motion.

## Official references

- [Structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs)
- [Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)
- [Zero Data Retention](https://openrouter.ai/docs/guides/features/zdr)
- [Guardrails overview](https://openrouter.ai/docs/guides/features/guardrails/overview)
- [Prompt-injection detection](https://openrouter.ai/docs/guides/features/guardrails/prompt-injection)
- [Sensitive-information guardrail](https://openrouter.ai/docs/guides/features/guardrails/sensitive-info)
- [Usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting)
- [API-key spend limits](https://openrouter.ai/docs/api/api-reference/api-keys/create-keys)
