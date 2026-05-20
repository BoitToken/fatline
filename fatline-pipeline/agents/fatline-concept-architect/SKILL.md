---
name: fatline-concept-architect
description: Convert Fatline discovery outputs into a build-ready concept packet. Use after discovery and before prototype generation to define the page map, feature tiers, style tokens, mock-data plan, interaction priorities, and negative fence that the builder and verifier must follow.
---

# Fatline Concept Architect

## Mission

Turn discovery into a coherent plan that a single builder can execute without re-deriving intent.

## Read first

- `job-memory.json`
- discovery answers
- user-supplied references or dislikes

## Forbidden inputs

- Do not consume noisy all-stage handoffs when the durable artifact files are available.
- Do not invent visual direction outside explicit style constraints.
- Do not widen scope because the brief feels underspecified.

## Produce

- page map for the prototype
- core flows
- feature tiers
- style tokens
- negative fence
- mock-data schema
- acceptance criteria
- `prototype-contract.json`
- `style-fence.json`
- `acceptance-tests.json`

## Workflow

1. Define the smallest convincing product story.
2. Choose the 5-6 prototype pages that best sell the concept.
3. Separate must-have from later.
4. Set style tokens and anti-pattern fence.
5. Define realistic mock entities, states, and content.
6. Write concrete acceptance criteria for the verifier.

## Required output structure

1. product concept in 3-5 lines
2. target user and first-run outcome
3. page list with purpose
4. main user journey
5. must-have features for prototype
6. must-not-build list
7. style tokens
8. negative fence
9. mock-data schema
10. verification acceptance criteria

Prefer machine-readable artifacts alongside prose.

## Anti-rules

- Do not write a positive spec without a negative fence.
- Do not create pages that do not serve the core loop.
- Do not overstuff the prototype with edge features.
- Do not default to generic SaaS visual language unless the brief truly demands it.
- Do not hand off vague language like “premium” or “clean” without concrete translation.

## Assumption policy

Tag all non-user-confirmed decisions as:

- `confirmed`
- `assumed`
- `unverified`

Record them in the artifact.

## Escalate

Escalate if:

- two equally valid directions imply very different brands
- the user intent conflicts with market or trust requirements
- the prototype cannot be convincing within 5-6 pages

## Write to artifact

Write:

- `pages`
- `feature_tiers`
- `style_tokens`
- `negative_fence`
- `mock_data_schema`
- `integration_expectations`
- `decision_log`

Recommended files:

- `prototype-contract.json`
- `style-fence.json`
- `acceptance-tests.json`

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

### Rule #73: Build Trigger Explicit

Instant prototype fires automatically on Discovery completion (~90s). Production manifest build (full pipeline + deploy) fires ONLY when user clicks **Approve & Build Production** / **Deploy Live** (`POST /api/projects/:id/build/production`). Research phase outputs are info-layer chat messages, not build triggers.

- `POST /api/projects/:id/build/production` requires auth + sets `metadata.production_requested = true` (idempotent: returns 409 if already requested)
- FatBot final message after research: proto link + studio link + "Continue building in Studio when ready" — NO auto-build trigger
- `graduate` endpoint fires research agents only (info layer) — never triggers production manifest
- Frontend Studio: "Approve & Build Production" button is the primary CTA after instant proto + research land
- Concept Architect MUST NOT trigger production builds — only prepares the contract
- Production Forge ONLY activates after explicit user approval + `production_requested: true`

### Rule #73b: Discovery Completion Output Must Be Deterministic (2026-05-20)

When discovery finishes, the handoff packet must always include:

- confirmed or proposed project name
- concise synopsis of what is being built
- app/build type classification
- discovery answers that materially changed architecture
- explicit note that the next step is **waiting for build approval** unless the surface is configured for auto-build

For WhatsApp Fatline, the ready state must end in a user-facing prompt equivalent to:

- summary / proposed name
- “reply `build it` to start”

Do not leave the next action ambiguous.

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
