---
name: fatline-discovery-director
description: Turn a one-line app or website idea into a usable discovery packet. Use when a new Fatline job starts and the system must ask adaptive discovery questions, identify the product type, capture audience and commercial intent, and extract both positive goals and negative constraints before concepting or building begins.
---

# Fatline Discovery Director

## Mission

Convert a raw idea into a sharp starting packet.

Ask only the questions that materially change product, UX, architecture, or business direction.

## Inputs

- one-line idea or short brief
- any user-provided context
- prior discovery answers, if resuming

## Forbidden inputs

- Do not pull in unrelated repo context before you have asked discovery questions.
- Do not read broad handoff dumps when targeted discovery answers exist.
- Do not treat prior assumptions as confirmed facts.

## Produce

- `app_type`
- `target_users`
- `primary_outcome`
- `core_loop`
- `platform`
- `success_criteria`
- `negative_constraints`
- `risk_flags`

## Workflow

1. Classify the product type.
2. Ask 4-6 adaptive questions.
3. Force specificity where the user is vague.
4. Capture anti-goals, not just goals.
5. Stop once the answers are sufficient to change downstream decisions.

## Mandatory questions to resolve

Resolve these themes, phrased naturally for the app type:

1. who the product is for
2. what the user is trying to get done
3. what the first successful session looks like
4. what the product must feel like
5. what the product must not become
6. whether this is prototype-only or production-intent

## Anti-rules

- Do not accept “make it modern” as enough.
- Do not accept “build me X” without identifying the core loop.
- Do not reduce brand direction to a single adjective.
- Do not ask generic 3-question discovery when app-type-specific questions are possible.
- Do not let the job proceed without at least one explicit negative constraint.

## Assumption policy

Tag unresolved claims as one of:

- `confirmed`
- `assumed`
- `unverified`

## Escalate

Escalate if:

- the user wants contradictory product types
- the success criteria are impossible to verify
- compliance or payment risk is present but unspecified

## Write to artifact

Write:

- `idea`
- `app_type`
- `target_users`
- `primary_outcome`
- `core_loop`
- `platform`
- `negative_fence`
- `risk_flags`
- `job-memory.json`

Do not invent downstream features.

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

### Rule #72: Discovery is Not Optional

Every Fatline build kicks off with the Discovery Director asking 4-6 type-specific questions whose answers shape major design/architecture decisions.

- **Discovery Director** (`fatline-discovery-director/SKILL.md`) generates adaptive questions per app type (marketplace/crm/saas/ecommerce/mobile/landing/webapp)
- Answers persist as `metadata.discovery_answers` (canonical) + `metadata.discovery.discovery_answers` (backwards compat)
- Pipeline gate in `fatline-prototype-builder` Stage 0.3: if `discovery_answers` is empty AND `_skipDiscovery !== true` → emit `build:discovery_required` + pause build
- **Verbatim Discovery Answers block** MUST be injected into every Concept Architect / Prototype Builder / Production Forge prompt
- Generic 3-question discovery (audience/core_value/brand_feel) is FORBIDDEN for new builds — questions must be adaptive per app type
- Legacy `scoping_answers` from prior builds auto-migrated to `discovery_answers` shape on first pipeline run
- FatBot: calls `POST /api/discovery/questions` (standalone endpoint, no project ID) to generate questions before project creation
- Frontend: `DiscoveryWizard` component shown when stage='briefing' or `build:discovery_required` socket event fires

### Rule #72b: WA Discovery Handoff Must Not Auto-Build (2026-05-20)

For the WhatsApp Fatline surface specifically:

- Project naming is **not** a build trigger.
- After the user confirms the project name, the flow must continue into discovery questions or final discovery confirmation.
- Discovery must terminate cleanly after **at most 6 total questions**.
- When discovery is sufficient, the bot must transition to an explicit **ready-to-build** state.
- The bot must wait for a clear user trigger like `build it` before starting the build.
- Never send “starting deep research / prototype in 10–15 minutes” immediately after project naming unless the explicit build trigger has already happened.
- If discovery cannot continue because project creation or auth failed, surface the error and keep the user in a recoverable state instead of pretending the build started.

### Rule #72c: Fatline Naming + Surface Rules (2026-05-20)

- `Fatline` is an internal pipeline name.
- User-facing product name is **Produsa**.
- Agent names like **FatScout**, **FatProto**, **FatJudge**, **FatForge**, and **FatDeploy** are allowed user-facing labels.
- Do not expose internal repo/runtime language that would confuse the user about whether they are using Produsa.

### Rule #73: Build Trigger Explicit

Instant prototype fires automatically on Discovery completion (~90s). Production manifest build (full pipeline + deploy) fires ONLY when user clicks **Approve & Build Production** / **Deploy Live** (`POST /api/projects/:id/build/production`). Research phase outputs are info-layer chat messages, not build triggers.

- `POST /api/projects/:id/build/production` requires auth + sets `metadata.production_requested = true` (idempotent: returns 409 if already requested)
- FatBot final message after research: proto link + studio link + "Continue building in Studio when ready" — NO auto-build trigger
- `graduate` endpoint fires research agents only (info layer) — never triggers production manifest
- Frontend Studio: "Approve & Build Production" button is the primary CTA after instant proto + research land
- Concept Architect MUST NOT trigger production builds — only prepares the contract
- Production Forge ONLY activates after explicit user approval + `production_requested: true`
