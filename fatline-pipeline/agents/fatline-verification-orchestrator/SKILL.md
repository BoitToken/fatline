---
name: fatline-verification-orchestrator
description: Verify Fatline prototypes and production builds across static, runtime, visual, and behavioral channels. Use after prototype or production generation to score the artifact, localize defects, route them to the correct stage, and enforce bounded repair loops before anything is approved or shipped.
---

# Fatline Verification Orchestrator

## Mission

Convert generation into proof.

Do not offer vague reviews. Produce actionable defect packets.

## Forbidden inputs

- Do not accept self-reported success from the generator as proof.
- Do not skip evidence collection because the UI looks plausible.
- Do not rely on one verification channel to cover another.

## Check channels

1. static
2. runtime
3. visual
4. behavioral

## Static checks

- typecheck
- lint
- build
- import and asset integrity

## Runtime checks

- console errors
- network failures
- unhandled exceptions
- route/render failures

## Visual checks

- 390 / 768 / 1440 screenshots
- overflow or collapse
- legibility and hierarchy
- brand fit against style tokens
- negative-fence violations

## Behavioral checks

- execute the main user journey
- validate forms, transitions, state changes, and result states
- for production, run real test-mode integrations where required

## Output format

Always return:

- overall score
- pass/fail decision
- evidence summary
- localized defect packets
- recommended owner per defect
- whether the next step is repair, re-architecture, or human review
- `verification-report.json`
- `defects.json`

## Defect packet fields

- `channel`
- `severity`
- `symptom`
- `probable_cause`
- `target_file_or_component`
- `selector_or_route`
- `viewport`
- `repro_steps`
- `recommended_owner`

## Anti-rules

- Do not say “looks broken” without localization.
- Do not pass visually plausible but behaviorally dead builds.
- Do not treat screenshot quality as sufficient proof.
- Do not send taste ambiguity into blind repair loops.
- Do not approve anything that violates the negative fence.

## Assumption policy

If root cause is uncertain, mark it explicitly as:

- `confirmed`
- `assumed`
- `unverified`

Do not present hypotheses as facts.

## Escalate

Escalate to human review if:

- the issue is primarily aesthetic and non-converging
- multiple directions are viable with different brand implications
- evidence is mixed and confidence is low

## Write to artifact

Append:

- `verification_history`
- `quality_score`
- `escalation_reason` when applicable

Attach durable evidence whenever possible: screenshots, logs, traces, selectors, or test outputs.

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

### Rule #75: Bundler Placeholder NEVER Ships With Real Source

The manifest bundler (`manifestBundler.js`) must NEVER emit the "Component rendered in manifest build" placeholder HTML when real source exists. Specifically:

- If `prototype_pages` exist in DB → use `injectPages(prototype_index_html, prototype_pages)` as the bundle output
- If JSX pages are extracted from `build_tasks` → use `generateManifestHTML()`
- Emergency placeholder (no pages anywhere) → log `console.error` loudly so CloudWatch catches it
- Runtime guard: before storing `manifest_html`, if placeholder string present AND real source exists → **throw hard error** (never silent)
- `retry-deploy` must call `bundleManifestHTML()` before the smoke gate so the subdomain serves real content on every retry

#### Fatline Verification Orchestrator additions

- **MUST verify** that deployed HTML does NOT contain placeholder strings ("Component rendered", "Loading...", "placeholder")
- **MUST check** `manifest_html_len` vs `prototype_index_html_len` — if manifest is < 10KB but prototype is > 50KB, flag as Rule #75 violation
- **MUST run** smoke gate on the ACTUAL subdomain, not a fallback URL
- **MUST verify** that `bundleManifestHTML()` was called during deploy by checking build events

**Why this rule exists (2026-05-07 incident):** Project 256 "House of Presence" had 215KB of real editorial HTML in `prototype_index_html` + 6 pages in `prototype_pages`, but `bundleManifestHTML` only read from `build_tasks` (which had 0 rows for instant-prototype projects). The bundler silently emitted a 6.2KB placeholder stub. Because `retry-deploy` did not re-bundle, every retry served the stub. CEO discovered this during investor demo preparation.
