# Produsa FatPipeline — Verification-First Pipeline

**Status:** Draft for testing  
**Author:** ProdusaClaw  
**Name:** FatPipeline  
**Intent:** Replace the current handoff-heavy generation chain with a smaller, tighter system that turns a one-line idea into a functional prototype, then turns approved prototypes into deployable products.

---

## 1) Core thesis

FatPipeline should **not** compete on agent count.

FatPipeline should compete on this claim:

> **Produsa does not just generate apps. It verifies them before they ship.**

That means:

- fewer context resets
- stronger style and product constraints
- one portable job-memory artifact
- a real verification loop with defect localization
- bounded auto-repair
- human escalation where taste or ambiguity cannot be proven mechanically

---

## 2) What we are keeping

These existing learnings stay:

1. **Discovery is mandatory.** Do not build from a raw brief without adaptive discovery questions.
2. **Prototype first, production second.** The instant/prototype path remains separate from the full production build path.
3. **Verification beats optimism.** Never call anything ready without end-to-end proof.
4. **Documentation must survive handoff.** No mental notes, no invisible rationale.

---

## 3) What changes in FatPipeline

### Old failure pattern

- too many agents touching one creative act
- UX, visual, and code decisions split apart
- positive brief without a strong negative fence
- generation quality judged too late
- repair loops too vague or too expensive

### New FatPipeline pattern

- compress the creative path into **5 core skills + 1 conditional repair skill**
- carry a single **job-memory artifact** across the run
- make **negative constraints** first-class
- verify on **4 channels**: static, runtime, visual, behavioral
- route failures to the correct stage with a bounded repair budget

---

## 4) FatPipeline agent roster

**Recommended operating model**

- 5 core skills on the normal path
- 1 conditional repair skill only when verification fails
- builder and judge must not be the same worker

### 1. FatScout
Own the first interaction after a one-line idea.

**Job:** Ask 4-6 adaptive questions, classify the product, identify audience, core loop, commercial model, platform, and success criteria.

**Output:** Discovery answers + product classification + risk flags.

### 2. FatScout
Turn discovery into the build plan.

**Job:** Write the concept packet, information architecture, page map, feature priority, mock-data plan, style tokens, and anti-pattern fence.

**Output:** Job-memory artifact v1.

### 3. FatProto
Generate the actual 5-6 page prototype in one coherent pass.

**Job:** Own UX + visual direction + frontend implementation together for the prototype layer. Produce realistic screen-to-screen continuity, seeded mock data, and a working interaction shell.

**Output:** Functional prototype artifact.

### 4. FatJudge
Run the first-class proof loop.

**Job:** Observe the build across static, runtime, visual, and behavioral channels. Score it, localize failures, and route them correctly.

**Output:** Verification packet with pass/fail, evidence, and localized defects.

### 5. FatForge
After prototype approval, deepen the system into a deployable product.

**Job:** Convert approved prototype direction into full app architecture, backend shape, integrations, auth, onboarding, persistence, and deployment packaging, then re-enter the same verification loop before release.

**Output:** Deployable app/website + production verification packet.

### 6. FatDeploy *(conditional)*
Apply bounded, surgical fixes only when verification fails.

**Job:** Patch exactly what the verifier localized. Do not redesign blindly. Do not widen scope.

**Output:** Fixed artifact + change log.

---

## 5) Phase structure

## Phase A — Proto mode

**Input:** One-line idea  
**Goal:** Functional 5-6 page prototype with relevant screens and believable mock data

### Proto flow

1. **FatScout**
   - ask 4-6 adaptive questions
   - capture user goals and anti-goals
   - detect app type

2. **FatScout**
   - define page map
   - define primary user loop
   - define mock-data sources and entities
   - define style tokens and negative fence

3. **FatProto**
   - build all proto screens in one pass
   - keep flow continuity across pages
   - use mock data that matches the business model

4. **FatJudge**
   - run static/runtime/visual/behavioral checks
   - return score + localized defects

5. **FatDeploy** *(only if verification fails)*
   - patch defects
   - hand back for re-verification

6. **Gate**
   - if pass: show proto to user for approval
   - if fail after budget: escalate with evidence

### Proto deliverable

- 5-6 relevant pages
- coherent design system
- realistic mock entities, tables, charts, cards, or content
- key flows clickable enough to inspect
- proof packet attached

---

## Phase B — Production mode

**Input:** User-approved prototype  
**Goal:** Real app/website that users can onboard into and start using

### Production flow

1. **FatForge** consumes the approved proto plus job-memory artifact
2. expand architecture:
   - data model
   - auth
   - backend routes/actions
   - persistence
   - onboarding
   - integrations
   - deployment plan
3. build implementation
4. send into **FatJudge**
5. route defects to **FatDeploy** only when needed
6. repeat under bounded budget
7. if quality gates pass, package for deploy

### Production deliverable

- deployable app/site
- onboarding works
- core workflows work
- integrations proven in test mode where applicable
- deployment and smoke verification evidence attached

---

## 6) The job-memory artifact

Every FatPipeline run should carry a single compressed artifact instead of rebuilding context at every stage.

### Recommended durable files

- `job-memory.json`
- `prototype-contract.json`
- `style-fence.json`
- `acceptance-tests.json`
- `verification-report.json`
- `defects.json`

### Required fields

- `idea`
- `app_type`
- `target_users`
- `primary_outcome`
- `core_loop`
- `platform`
- `pages`
- `feature_tiers` (must-have / should-have / later)
- `style_tokens`
- `negative_fence`
- `mock_data_schema`
- `integration_expectations`
- `risk_flags`
- `decision_log`
- `verification_history`
- `approval_state`

### Rules

1. Every downstream agent reads the artifact first.
2. Every meaningful design or architecture choice must update the `decision_log`.
3. Verification adds evidence to `verification_history` instead of writing loose prose.
4. Production mode starts from the approved artifact, not from the original brief.
5. Brand guidance must become machine-readable constraints, not remain prose-only.

---

## 7) Negative constraints are first-class

Every job must include both:

- **anchor:** what this product should feel like
- **fence:** what it must not become

### Fence examples

- must not look like generic AI SaaS
- must not default to glassmorphism / purple-on-white / soft card soup
- must not overuse rounded corners where the product needs authority
- must not invent features absent from the approved concept
- must not ship placeholder mockups once real source exists

### Required fence categories

1. visual anti-patterns
2. product anti-patterns
3. content/tone anti-patterns
4. business-model anti-patterns
5. integration/risk anti-patterns

---

## 8) Verification loop

FatPipeline verification must run on **4 channels**.

Use an independent verifier, not the same worker that produced the artifact.

### A. Static

- typecheck
- lint
- build
- import integrity
- asset/reference integrity

### B. Runtime

- console errors
- failed network calls
- unhandled promise rejections
- broken routes
- hydration/render failures

### C. Visual

- screenshots at 390 / 768 / 1440 widths
- overflow/collapse detection
- hierarchy/readability check
- brand fit against style tokens and fence
- detect generic-SaaS drift where possible

### D. Behavioral

- execute the core user flow
- exercise forms, nav, state changes, creation flows, and response handling
- in production mode, run real test-mode integrations where relevant
  - payments
  - messaging
  - invoice/receipt generation
  - onboarding and auth flows

---

## 9) Defect localization and routing

Detection is not enough.

Every failed verification must be translated into a structured defect packet:

- `channel`
- `severity`
- `symptom`
- `probable_cause`
- `target_file_or_component`
- `selector_or_route`
- `viewport`
- `repro_steps`
- `recommended_owner`

Every stage pass must attach an evidence bundle, not just a status flag.

### Routing rules

- spec defect -> **FatScout**
- shell, route, or shared-layout defect -> **FatProto** or **FatForge**
- page-specific defect -> **FatProto**
- visual/layout bug -> **FatDeploy**
- runtime error -> **FatDeploy**
- missing feature but clear spec -> **FatForge** or **FatProto**
- brief ambiguity -> **FatScout**
- taste ambiguity or non-converging aesthetic feedback -> **human escalation**

### Repair budget

- max 2 passes in proto mode
- max 3 passes in production mode
- max 1 upstream rewind when the defect proves the contract is wrong
- escalate with evidence after budget exhaustion

---

## 10) Quality gates

### Proto gate

Pass only if:

1. all required pages render
2. no critical console/runtime failures
3. key navigation path works
4. mock data matches concept and target user
5. visual direction respects the fence
6. verification score >= 85
7. evidence bundle exists for the pass

### Production gate

Pass only if:

1. build + runtime checks are clean
2. core onboarding flow works
3. core commercial or operational workflow works
4. required integrations pass in test mode
5. security and obvious regression checks pass
6. verification score >= 92
7. evidence bundle exists for the pass

### Human gate

Force human signoff when:

- aesthetic confidence is low
- the brand implication of two directions differs materially
- negative constraints are fuzzy or subjective
- the product is high-visibility and customer-facing

---

## 11) Anti-rules

### Brief stage anti-rules

- never accept positive goals without anti-goals
- never let “modern / premium / clean” pass without forced specificity
- never treat speed or agent count as a proxy for quality

### Design stage anti-rules

- never default to generic SaaS patterns
- never split one coherent aesthetic decision across three weak handoffs
- never hide uncertainty when taste is being guessed

### Build stage anti-rules

- never auto-loop on vague aesthetic dissatisfaction
- never rewrite broadly when the defect is localized
- never claim ready without proof across the required channels

### Product stage anti-rules

- never market headcount as the moat
- never confuse a screenshot pass with a product pass
- never ship integrations that were only assumed, not exercised

---

## 12) Skill changes required

Every FatPipeline skill should explicitly contain:

1. mission
2. expected inputs
3. expected outputs
4. forbidden inputs
5. artifact write contract
6. negative rules
7. verification awareness
8. escalation rules
9. artifact fields to read/write
10. assumption policy (`assumed`, `confirmed`, `unverified`)

Skills must stop sounding like generic role descriptions.

They should read like operating doctrine.

---

## 13) Marketing line

### Use

- **Fatline is not an agent farm. It is a verification system for creative and product work.**
- **Most AI builders optimize generation. Produsa optimizes what survives verification.**
- **Generated until proven.**

### Avoid

- “35 agents build your app”
- “fully autonomous design”
- “instant brand-quality output”

---

## 14) Immediate build order

1. create Fatline skills for the 6-agent roster
2. define the job-memory artifact schema
3. refactor the instant build path around the new artifact
4. harden the verification loop around localization + routing
5. wire prototype approval into production mode entry
6. add metrics for pass rate, rework, escalation, and sameness drift
7. convert current brand rules into machine-readable style fences

---

## 15) Decision

For FatPipeline testing, the recommendation is:

- **collapse** the creative path
- **promote** verification to a first-class product capability
- **treat anti-rules as core input, not commentary**
- **escalate taste ambiguity instead of faking certainty**

That is the version of Produsa that can become more robust than the rest of the market.
