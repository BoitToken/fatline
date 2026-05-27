# Fatline FatPipeline v2 — Fatter Agents, Validation Every Stage

> ⚠️ **SUPERSEDED (v2, historical).** The canonical spec is [FATPIPELINE-v3.md](./FATPIPELINE-v3.md). Rules are canonical in [FATBOT-RULES.md](./FATBOT-RULES.md). Kept for history.

**Status:** Superseded by v3  
**Author:** ProdusaClaw  
**Date:** 2026-05-20  

---

## Core Thesis

Fatline is not an agent farm. It is a **verification system for creative and product work**.

Most AI builders optimize generation. Fatline optimizes what **survives verification**.

**Generated until proven.**

---

## Strategic Shift from v1

| v1 (6 agents) | v2 (4 core + 1 conditional) |
|---|---|
| Discovery Director | → **FatScout** (merged + expanded) |
| Concept Architect | → absorbed into FatScout |
| Prototype Builder | → **FatProto** (with self-verify) |
| Verification Orchestrator | → **FatJudge** (independent, runs after EVERY stage) |
| FatForge | → **FatForge** (with self-verify) |
| Repair Engineer | → **FatDeploy** (conditional, fixes only) |

**Why fewer agents?** Context loss during handoffs is our #1 quality killer. Every handoff loses nuance. Fatter agents = fewer handoffs = more coherent output.

---

## Agent Roster

### FatBot-1: FatScout
**Mandate:** Own everything before a single line of code is written.

**Tasks:**
1. **Build type identification** — classify the app/website type (SaaS, marketplace, content, tool, etc.)
2. **Market research** — what exists, what sucks, what's the gap
3. **Architecture design** — data model, API contract, page map, state machine
4. **Exhaustive features list** — must-have, should-have, nice-to-have, explicitly-out-of-scope
5. **Massive negative constraints** — what this product MUST NOT become (see §Negative Fence)
6. **Risk flags** — technical, legal, commercial risks
7. **Mock data schema** — realistic entities, states, relationships
8. **Acceptance criteria** — concrete, testable success definitions

**Validation gate:** FatJudge must approve the architecture packet before any code is written. If the architecture is rejected, FatScout must fix it.

**Output:**
- `architecture-packet.json` — complete build plan
- `negative-fence.json` — exhaustive constraints
- `research-brief.md` — market analysis
- `feature-matrix.json` — tiered features

---

### FatBot-2: FatProto
**Mandate:** Build the prototype AND verify it yourself before handing off.

**Tasks:**
1. Read the approved architecture packet
2. Build 5-6 page prototype in ONE coherent pass (no UX/visual/code split)
3. Wire realistic mock data
4. **Self-verify** against architecture packet
5. Fix your own defects
6. Submit to FatJudge

**Validation gate:** Must pass self-verification AND FatJudge before proceeding.

**Output:**
- `prototype-artifact.json` — built prototype
- `self-verification-report.json` — own quality check

---

### FatBot-3: FatJudge
**Mandate:** Independent verification. Never builds. Only judges.

**Runs after EVERY stage:**
- After FatScout → verifies architecture completeness
- After FatProto → verifies prototype quality
- After FatForge → verifies production readiness

**4-channel verification:**
1. **Static** — typecheck, lint, build, import integrity, asset integrity
2. **Runtime** — console errors, network failures, unhandled rejections, broken routes
3. **Visual** — screenshots at 390/768/1440, overflow detection, hierarchy check, brand fit
4. **Behavioral** — execute core user flow, forms, nav, state changes

**Defect localization:**
Every failure gets a structured defect packet:
- `channel` (static/runtime/visual/behavioral)
- `severity` (P0/P1/P2)
- `symptom`
- `probable_cause`
- `target_file_or_component`
- `selector_or_route`
- `repro_steps`
- `recommended_owner`

**Output:**
- `verification-packet.json` — pass/fail + evidence
- `defects.json` — structured defect list (empty if pass)

---

### FatBot-4: FatForge
**Mandate:** Turn approved prototype into deployable product.

**Tasks:**
1. Consume approved prototype + architecture packet
2. Build backend (data model, auth, routes, persistence)
3. Build frontend production shell
4. Implement onboarding
5. Wire integrations (payments, messaging, etc.)
6. **Self-verify** before submission
7. Deploy

**Validation gate:** Must pass self-verification AND FatJudge before declaring live.

**Output:**
- `production-artifact.json` — complete app
- `deploy-verification.json` — deploy health check

---

### FatBot-5: FatDeploy (conditional)
**Mandate:** Fix localized defects only. Never redesign.

**Activated only when:**
- FatJudge finds defects
- Defect is localized (specific file/component)
- Repair budget not exhausted

**Tasks:**
1. Read defect packet
2. Apply surgical fix
3. Re-verify
4. Hand back to FatJudge

**Repair budget:**
- Max 2 repair cycles in proto mode
- Max 3 repair cycles in production mode
- Max 1 upstream rewind per stage
- Escalate to human after budget exhaustion

**Output:**
- `fixed-artifact.json`
- `repair-log.json`

---

## Exhaustive Negative Fence

Every project MUST have a negative fence with at least these categories:

### Visual Anti-Patterns
- Must not look like generic AI SaaS
- Must not default to glassmorphism / purple-on-white / soft card soup
- Must not overuse rounded corners where authority is needed
- Must not use placeholder gradients as hero backgrounds
- Must not default to Inter font for everything

### Product Anti-Patterns
- Must not invent features absent from approved concept
- Must not build admin dashboards for prototypes
- Must not add settings pages before core flows work
- Must not implement search before content exists
- Must not add notifications before actions exist

### Content/Tone Anti-Patterns
- Must not use AI-sounding placeholder copy
- Must not use "Lorem ipsum" anywhere
- Must not use generic testimonials ("This app changed my life")
- Must not use inconsistent tone across pages

### Business Model Anti-Patterns
- Must not assume payment flows for free tools
- Must not build subscription UI for one-time purchases
- Must not add "enterprise" pricing tier for MVP

### Integration/Risk Anti-Patterns
- Must not ship integrations that were only assumed, not exercised
- Must not hardcode API keys in source
- Must not skip input validation because "it's a prototype"

---

## Validation Loop Rules

### After EVERY agent:
1. Agent submits output
2. **FatJudge runs 4-channel check**
3. If pass → handoff to next agent
4. If fail → route to FatDeploy (if localized) or back to originating agent (if architectural)
5. If fail after budget → escalate to human

### FatJudge is ALWAYS independent
- Never the same agent that produced the artifact
- Never uses the same context window
- Fresh read of artifacts only

### Evidence required
- Screenshots for visual checks
- Console logs for runtime checks
- Build output for static checks
- Flow recordings for behavioral checks

---

## Quality Gates

### Proto Gate (pass all):
- [ ] All required pages render
- [ ] No critical console/runtime failures
- [ ] Key navigation path works
- [ ] Mock data matches concept
- [ ] Visual direction respects negative fence
- [ ] Verification score ≥ 85
- [ ] Evidence bundle attached

### Production Gate (pass all):
- [ ] Build + runtime checks clean
- [ ] Core onboarding flow works
- [ ] Core commercial/operational workflow works
- [ ] Required integrations pass in test mode
- [ ] Security basics pass
- [ ] Verification score ≥ 92
- [ ] Evidence bundle attached

---

## Job-Memory Artifact

Single source of truth carried across all stages:

```json
{
  "idea": "string",
  "app_type": "string",
  "build_type": "webapp|website|mobile|landing|saas|marketplace|crm|ecommerce",
  "target_users": "string",
  "primary_outcome": "string",
  "core_loop": "string",
  "platform": "string",
  "research": {
    "market_gap": "string",
    "competitors": [],
    "differentiator": "string"
  },
  "architecture": {
    "data_model": "string",
    "api_contract": "string",
    "page_map": [],
    "state_machine": "string"
  },
  "features": {
    "must_have": [],
    "should_have": [],
    "nice_to_have": [],
    "out_of_scope": []
  },
  "negative_fence": {
    "visual": [],
    "product": [],
    "content": [],
    "business": [],
    "integration": []
  },
  "style_tokens": {},
  "mock_data_schema": {},
  "risk_flags": [],
  "decision_log": [],
  "verification_history": [],
  "approval_state": "pending|approved|rejected"
}
```

---

## Anti-Rules (System-Level)

1. **Never accept positive goals without anti-goals**
2. **Never let "modern / premium / clean" pass without forced specificity**
3. **Never treat speed or agent count as a proxy for quality**
4. **Never default to generic SaaS patterns**
5. **Never split one coherent aesthetic decision across three weak handoffs**
6. **Never auto-loop on vague aesthetic dissatisfaction**
7. **Never rewrite broadly when the defect is localized**
8. **Never claim ready without proof across required channels**
9. **Never confuse a screenshot pass with a product pass**
10. **Never ship integrations that were only assumed, not exercised**

---

## Marketing Line

**Fatline is not an agent farm. It is a verification system for creative and product work.**

**Most AI builders optimize generation. Fatline optimizes what survives verification.**

**Generated until proven.**
