---
name: fatline-production-forge
description: Convert an approved Fatline prototype into a deployable app or website. Use after prototype approval to deepen the product into real architecture, onboarding, persistence, integrations, and deployment packaging while preserving the approved concept and re-entering the verification loop before release.
---

# Fatline Production Forge

## Mission

Take the approved prototype and make it real.

Preserve the approved direction while replacing mock behavior with working product behavior.

## Read first

- approved `job-memory.json`
- approved `prototype-contract.json`
- approved `style-fence.json`
- prototype outputs
- verification history
- production constraints

## Forbidden inputs

- Do not restart from the raw brief when approved artifacts exist.
- Do not ignore prototype approvals in favor of a cleaner engineering preference.
- Do not pull in unrelated product ambitions without explicit approval.

## Produce

- production architecture
- real data model
- auth and onboarding
- core backend flows
- required integrations
- deployment-ready artifact

## Workflow

1. Freeze what was approved.
2. Separate what stays from what must be deepened.
3. Replace mock behavior with real flows.
4. Keep the approved UX and information architecture unless there is a verified reason to change it.
5. Route the result through the same verification system before deploy.

## Required outcomes

- first user can onboard
- core value can be reached without manual intervention
- required integrations work in test mode
- operational risk is visible before deploy

## Assumption policy

Tag any production-only addition as:

- `confirmed`
- `assumed`
- `unverified`

Record the reason in the artifact before proceeding.

## Anti-rules

- Do not restart from the original brief.
- Do not throw away the approved prototype because production is harder.
- Do not add “nice to have” features before the core loop works.
- Do not mark deployable until the production verifier passes.

## Escalate

Escalate if:

- the approved prototype is structurally incompatible with the required product reality
- core integrations are unknown or blocked
- the product needs human product judgment before engineering should continue

## Write to artifact

Append:

- `production_plan`
- `integration_expectations`
- `deployment_notes`
- `decision_log`

Keep parity between the approved prototype contract and the production entity/route model unless a verified constraint forces change.

---

## Base Quality Rules

### Rule #34: Never Say "Ready" Without Verification
```
Prototype built? → YES
Pages render at 390/768/1440? → YES
Core loop navigable? → YES
Mock data realistic? → YES
No console errors? → YES
Verification score ≥95? → YES
✅ NOW say "ready"
```

### Rule #37: Diagnosis-First Protocol
Before any build change:
1. **DISCOVER** — Current state (job-memory.json, prototype outputs, verification reports)
2. **VERIFY** — Repro the defect locally (static, runtime, visual, behavioral channels)
3. **ANALYZE** — Root cause (compare working vs broken builds, check defect packet)
4. **PROPOSE** — Minimal fix (ONE change, backup artifact first)
5. **VERIFY** — End-to-end (re-run verification, check all 4 channels, score ≥95)

### Rule #38: Model Selection
- **Kimi K2.6 (lightweight):** Health checks, routine verification polls, status reports
- **Kimi K2.6:** Coding, debugging, prototype building, production forge work
- **Codex 5.3:** Only when CEO explicitly requests (deep research, critical architecture)

### Rule #39: Task Time-Boxing
| Task Type | Max Time | If Exceeded |
|-----------|----------|-------------|
| Bug/config fix | 30 min | Escalate with diagnostics |
| Prototype build | 2 hours | Break into sub-agents or escalate |
| Concept architecting | 1 hour | Deliver partial, ask for extension |
| Verification pass | 15 min | If stuck >30min, kill + restart |

### Rule #40: Sleep Hours (00:00–10:00 IST)
- ✅ Cron jobs, monitoring, emergency fixes
- ❌ No new agent spawns for prototype/production builds

### Rule #41: Agent Loop Detection
If agent: no output >15min, repeats command >3x, or reports "still debugging" >30min → **kill + respawn** with clearer scope or escalate.

### Rule #42: Batch Tasks
- Max 3 concurrent build agents, 1 verification agent
- Prefer 2-3 focused agents over 10 micro-agents
- If queue >10 tasks, batch into fewer agents

### Rule #43: NEVER Share Prototype URL Without 6-Step Verification
Before sharing ANY link with CEO:
1. DNS resolves correctly
2. SSL cert valid
3. HTTPS returns 200
4. Content correct (not placeholder/stub)
5. All prototype pages load
6. Core user journey works end-to-end

### Rule #44: Manifest Required
All Fatline agents MUST have:
- Pipeline phase (discovery / concept / prototype / production / verification / repair)
- Dependencies (input artifacts)
- Outputs (what they produce)
- Max runtime
- Quality gate (score threshold)

### Rule #45: Handoff Documents
Every stage produces:
- `DISCOVERY-HANDOFF.md`
- `CONCEPT-HANDOFF.md`
- `PROTOTYPE-SUBMISSION.md`
- `VERIFICATION-REPORT.md`
- `PRODUCTION-HANDOFF.md`

### Rule #46: 3-Cycle QA
NO PROTOTYPE SHIPS WITHOUT 3 CYCLES:
- Cycle 1: Obvious breaks (build, render, navigation)
- Cycle 2: Integration issues (cross-page flows, data consistency)
- Cycle 3: Edge cases (responsive, empty states, error handling)
- Score ≥95 to pass

### Rule #47: Security First
- Never commit secrets in prototype or production artifacts
- API keys in environment variables only
- Vault key (.vault_key) NEVER committed
- No hardcoded credentials in generated code

### Rule #48: Documentation Required
- Every feature documented in job-memory.json
- Every bug fix explained in repair_log
- Every deployment logged in deployment_notes
- No mental notes — everything in artifacts

### Rule #49: Escalation Protocol
Escalate to CEO when:
- Score <95 after Cycle 3
- Prototype fundamentally incompatible with production reality
- Security breach suspected
- Budget/cost concerns

---

## Instant Pipeline Rules

### Rule #74: Currency Localization (CEO mandate 2026-05-07)

Currency is determined by the **geographic origin of the user/brief**, detected from the WhatsApp phone number country code or brief content.

| Region | Currency | Symbol |
|---|---|---|
| India (+91) | INR | ₹ |
| Europe (EU dial codes) | EUR | € |
| USA / Canada (+1) | USD | $ |
| Ambiguous / unknown | INR | ₹ |

**Default when ambiguous: ₹ (INR)** — Boit Technologies is India-based; ₹ is the safe fallback.

**DO NOT hardcode `$` or `USD` as a global default. Ever.**

### Implementation for Fatline:
- Helper module: `backend/src/utils/currencyForBrief.js` — `resolveCurrency({ phone, briefText })`
- FatBot: `produsa-whatsapp/src/services/localeResolver.js` — unknown-phone default is INR (not USD)
- Instant pipeline: `fatline-prototype-builder` defaults `currency='₹', currencyCode='INR'`
- Prototype Builder: reads `currency_symbol` / `currency_code` from input; defaults to ₹ if absent
- Production Forge: carries forward currency settings from prototype; never resets to USD
- All agent system prompts mentioning currency: "Use the symbol from `research_data.currency.symbol`. If absent, default to ₹."
- Mock data in prototypes MUST use the correct currency symbol (e.g., "₹2,400 revenue" not "$2,400")
- Production builds MUST preserve currency locale for payment integrations (Razorpay for INR, Stripe for USD/EUR)

### Rule #74b: Explicit Promotion Only (2026-05-20)

- Discovery completion does not authorize production.
- Prototype completion does not authorize production.
- Production Forge only runs after an explicit promote/build-live approval on the correct surface.
- If downstream code paths still auto-promote from naming, discovery, or research completion, treat that as a pipeline bug and stop rather than silently continuing.
