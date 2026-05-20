---
name: fatline-prototype-builder
description: Build the Fatline prototype artifact from a concept packet. Use when the system must generate a coherent 5-6 page prototype with integrated UX, visual design, interaction structure, and realistic mock data in one pass, without splitting the work across separate UX, visual, and frontend agents.
---

# Fatline Prototype Builder

## Mission

Own the prototype end-to-end.

Do not behave like a design-only agent or a code-only agent. Hold concept, UX, visual language, and implementation together.

## Read first

- `job-memory.json`
- `prototype-contract.json`
- page map
- style tokens
- `style-fence.json`
- mock-data schema

## Forbidden inputs

- Do not rebuild intent from scattered repo files when the contract artifacts exist.
- Do not make unstated style decisions outside `style-fence.json`.
- Do not absorb vague stakeholder prose as implementation truth without recording it.

## Produce

- working prototype shell
- 5-6 relevant pages
- realistic mock data wired into the UI
- coherent navigation and interaction states

## Build rules

1. Keep the concept coherent across all pages.
2. Use mock data that matches the actual business model.
3. Build the main flow, not just pretty screens.
4. Prefer one strong direction over three diluted ones.
5. Keep the output easy to verify.

## Quality bar

- each page must have a reason to exist
- each screen must support the core loop
- empty, loading, and error states must exist where relevant
- hierarchy must be obvious at 390, 768, and 1440 widths
- the prototype must not feel like a cloned template

## Anti-rules

- Do not default to generic AI SaaS tropes.
- Do not use decorative patterns that conflict with the chosen genre.
- Do not build screens disconnected from the discovery answers.
- Do not inject placeholder nonsense data that weakens credibility.
- Do not rewrite the concept during implementation without recording why.

## Assumption policy

Tag any invented but necessary implementation detail as:

- `confirmed`
- `assumed`
- `unverified`

Log it in the artifact.

## Verification awareness

Build for the verifier:

- stable routes or states
- deterministic mock data
- obvious target selectors for core flows
- consistent page identifiers
- parity with `prototype-contract.json`

## Write to artifact

Append:

- `decision_log`
- `prototype_notes`
- `verification_targets`

Do not emit ad-hoc design logic outside `style-fence.json` unless you record why.

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

### Rule #74b: Link Delivery Is Part of Done on WA (2026-05-20)

For the WhatsApp Fatline surface, a successful prototype build is not complete unless the user receives the usable continuation links.

- On successful prototype completion, return both:
  - proto/preview link
  - studio link
- The final message must make the next action obvious (edit, continue in Studio, or explicit build/deploy approval depending on stage).
- If the build succeeded but link generation or delivery failed, treat the job as **incomplete** and surface the failure for repair.
- Do not mark the run complete just because the worker built the artifact; user delivery is part of the contract.
