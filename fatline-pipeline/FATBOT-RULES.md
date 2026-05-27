# FATBOT-RULES.md — The FatBot Operating System

> **Classification:** MANDATORY — every FatBot reads this FIRST, before any work.
> **Scope:** All Fatline FatBots (Discovery Director / FatScout, Concept Architect, Prototype Builder / FatProto, Production Forge / FatForge, Verification Orchestrator / FatJudge, Repair Engineer).
> **Provenance:** Ported from the **approved Produsa V2.5 instant pipeline** (`Produsa-ai` `AGENTS.md` #34–#49 + #72–#75 and `docs/AGENT-RULES.md` R1–R10) and consolidated so the FatBots follow the same system. **This file is the single source of truth for FatBot rules.** Agent `SKILL.md` files reference it instead of restating it.

---

## 0. How FatBots Read These Rules

1. On agent wakeup (spawn/restart), the FIRST action is: `read fatline-pipeline/FATBOT-RULES.md`.
2. A FatBot MUST NOT write code, generate a prototype, call an API, deploy, or modify any file until all rules below are loaded into context.
3. If this file is unreachable, the agent **halts** and writes a `.stuck` signal immediately.
4. Rule precedence when two rules appear to conflict: **Part A (Non-Negotiables) > Part C (Instant Pipeline) > Part B (Operational) > Part D (Standards).** When still unclear, escalate (Rule #49).

**Naming reminder (Rule #72c):** `Fatline` is an internal pipeline name. The user-facing product is **Produsa**. User-facing agent labels **FatScout / FatProto / FatJudge / FatForge / FatDeploy** are allowed. Never expose internal repo/runtime language that confuses the user about whether they are using Produsa.

---

## Part A — The 10 Non-Negotiable Rules

> **Violation of any rule = task failure.** No exceptions, no workarounds. These are the hard floor under everything else.

### R1 — BUILD MUST PASS
`npm run build` must exit `0` with zero errors. TypeScript, ESLint, missing imports all count. "It works in dev" is irrelevant — the production build is the only truth. If it fails, fix it; do not report completion, do not hand off. Re-run a final time after fixes to confirm zero errors.

### R2 — SELF-QA BEFORE CLAIMING COMPLETE
Before reporting any task done, pass this checklist: build passes (R1); no mock data in production paths (R3); the artifact/URL actually responds; credits handled (R5); a completion record is written (R6). If ANY check fails, the task is NOT complete.

### R3 — MOCK DATA: REQUIRED IN PROTOTYPES, FORBIDDEN IN PRODUCTION
- **Prototype phase:** realistic mock data is *mandatory* (see the 10 Commandments, Part D) — real names, numbers, dates, images. Never "Lorem ipsum", never "placeholder".
- **Production phase:** zero fake data in any shipped code path. If an external API is down, return an error — never synthesize fake data. Seed data lives in `src/db/seeds/` and is never importable from production routes. Demo/preview modes gate behind `NODE_ENV !== 'production'`.

### R4 — NO PRODUCTION DB WRITES DURING BUILDS
Build/forge agents use a test schema (`test_` prefix) or seeded fixtures. Migrations go through the migration pipeline, never raw `INSERT` on production tables. Reference data is read-only. Only the running API (authenticated endpoints) writes to the production DB.

### R5 — CREDIT PRE-CHECK IS MANDATORY
Before ANY user-triggered **production** build (the paid phase), check balance vs. estimate. Insufficient credits → return **HTTP 402** (`Payment Required`, not 400/403) with `{balance, required, shortfall}`. Estimate carries a ≥10% safety margin. Never start a paid build hoping credits arrive later. (The instant prototype phase is free — no credit gate; see Rule #73.)

### R6 — LOG EVERY COMPLETION
Append one JSON line per completed task to the run log (`ap-storage/agent-log.jsonl` or the configured Fatline run log) with: `taskId, agentId, model, startedAt, completedAt, outcome (success|failure|partial|stuck), notes`. Append-only; never read-modify-write the whole file.

### R7 — INTER-AGENT COMMUNICATION VIA THE ARTIFACT + SIGNALS ONLY
FatBots coordinate through the **`job-memory.json` artifact** plus filesystem signals (`ap-storage/signals/<jobId>.<signal>`), never via direct HTTP calls, shared memory, DB-as-queue, or live sockets between agents. Poll signals at 30s intervals max. The job-memory artifact is the one portable thing that survives every handoff (no mental notes — Rule #48).

### R8 — STUCK PROTOCOL
No measurable progress for 15 minutes → **HALT** and write a `.stuck` signal (agentId, task, lastAction, attempts, timestamp). "Measurable progress" = a file changed, a test newly passes, a build error resolved, or a signal written. Same error after 3 attempts counts as stuck. Do not retry the same approach; wait for orchestration/reassignment.

### R9 — NO SECRETS IN CODE
Zero tolerance. All secrets come from `process.env`. Never hardcode keys, DB URLs, or tokens — in prototype or production output. `.env` is git-ignored; `.vault_key` is NEVER committed. Pre-deploy scan must return empty:
```bash
grep -rE "(sk-ant|sk-or|ghp_|gho_|xoxb-|xoxp-|AKIA[0-9A-Z]|postgres://|Bearer )" src/ dist/   # any match = deploy blocked
```
If a secret is committed: rotate immediately, purge from history, force-push, log a `security-incident`.

### R10 — FOOTER MANDATE
Every shipped UI page (prototype and production) includes this exact footer, visible but subtle (11–13px, muted, bottom of page) — never hidden via `display:none`/`opacity:0`:
```
Powered by Claude + OpenClaw + Actual Intelligence
```
Text must be exact — no variations. Verify with a grep before calling a build done.

### Severity & Handling
| Severity | Rules | Action |
|----------|-------|--------|
| **Critical** | R5, R9, #34 | Immediate halt. Deploy blocked. Escalate. |
| **High** | R1, R3, R4, #46, #75 | Task failed. Fix before re-submitting. |
| **Medium** | R2, R6, R7, #44, #45 | Warning logged. Comply before handoff. |
| **Low** | R8, R10, #48 | Warning logged. Fix on next iteration. |

---

## Part B — Operational Rules #34–#49

### Rule #34 — Never Say "Ready" Without Verification
```
Prototype/build complete?   → YES
Pages render at 390/768/1440?→ YES
Core loop navigable?        → YES
Data realistic (proto) /
  real (production)?        → YES
No console errors?          → YES
Verification score ≥95?     → YES
✅ NOW say "ready"
```

### Rule #37 — Diagnosis-First Protocol
Before any build/infra change: **DISCOVER** (job-memory.json, prototype outputs, verification reports, configs) → **VERIFY** (repro the defect across static/runtime/visual/behavioral channels) → **ANALYZE** (root cause; compare working vs broken) → **PROPOSE** (ONE minimal change, back up the artifact first) → **VERIFY** (re-run verification end-to-end, all 4 channels, score ≥95).

### Rule #38 — Model Selection
| Task | Model |
|------|-------|
| Health checks, routine verification polls, status reports | Kimi K2.6 (lightweight) / Haiku |
| Coding, debugging, prototype/production builds, supervision | Kimi K2.6 / Sonnet |
| Critical architecture / deep research | Codex 5.3 / Opus — **CEO approval required** |

### Rule #39 — Task Time-Boxing
| Task Type | Max Time | If Exceeded |
|-----------|----------|-------------|
| Bug/config fix | 30 min | Escalate with diagnostics |
| Prototype build | 2 hours | Break into sub-agents or escalate |
| Concept / discovery | 1 hour | Deliver partial, ask for extension |
| Verification pass | 15 min | If stuck >30 min, kill + restart |

### Rule #40 — Sleep Hours (00:00–10:00 IST)
✅ Cron jobs, monitoring, emergency fixes. ❌ No new agent spawns for prototype/production builds.

### Rule #41 — Agent Loop Detection
If an agent has no output >15 min, repeats a command >3×, or reports "still debugging" >30 min → **kill + respawn** with clearer scope, or escalate.

### Rule #42 — Batch Tasks
Max 3 concurrent build agents + 1 verification agent. Prefer 2–3 focused agents over 10 micro-agents. Queue >10 tasks → batch into fewer agents. (This is the whole point of Fatline: compress, don't fragment.)

### Rule #43 — 6-Step URL Verification Before Sharing
Never share a link until: **DNS → SSL → HTTPS 200 → correct content (not stub/502) → service online → nginx/routing wired.** Any fail → fix silently, re-verify all 6, THEN share. (Full protocol in Part D.)

### Rule #44 — Manifest Required
Every FatBot `SKILL.md` carries a Pipeline Manifest: phase (discovery / concept / prototype / production / verification / repair), dependencies (input artifacts), outputs, max runtime, quality gate.

### Rule #45 — Handoff Documents Required
Every stage emits a durable handoff: `DISCOVERY-HANDOFF.md` → `CONCEPT-HANDOFF.md` → `PROTOTYPE-SUBMISSION.md` → `VERIFICATION-REPORT.md` → `PRODUCTION-HANDOFF.md` → `DEPLOY-HANDOFF.md`. No mental notes.

### Rule #46 — 3-Cycle QA (No Exceptions)
No prototype or production build ships without 3 cycles: **C1** obvious breaks (build, render, navigation) → **C2** integration (cross-page flows, data/contract consistency) → **C3** edge cases (responsive, empty/error states, performance). Score ≥95/100 to pass. Builder and judge must not be the same worker. (Full loop in Part D.)

### Rule #47 — Security First
Never commit secrets; `.env` git-ignored; API keys in env vars only; `.vault_key` never committed; no hardcoded credentials in generated code. (Reinforces R9.)

### Rule #48 — Documentation Required
Every feature documented in `job-memory.json`; every fix explained in `repair_log` (root cause + prevention); every deploy logged in `deployment_notes`. No mental notes — everything in artifacts.

### Rule #49 — Escalation Protocol
Escalate to CEO (Fatman, Telegram @ahswaat) when: score <95 after C3; infra down >10 min; security breach suspected; budget/cost concerns; or taste/ambiguity that cannot be proven mechanically.

---

## Part C — Instant Pipeline Rules #72–#76

These encode the hard-won learnings of the approved instant pipeline. They override Part B on conflict.

### Rule #72 — Discovery is Not Optional
Every Fatline build kicks off with the Discovery Director asking **4–6 type-specific** questions whose answers shape major design/architecture decisions.
- Adaptive questions per app type (marketplace / crm / saas / ecommerce / mobile / landing / webapp). Generic 3-question discovery (audience/core_value/brand_feel) is **FORBIDDEN** for new builds.
- Answers persist as `metadata.discovery_answers` (canonical) + `metadata.discovery.discovery_answers` (back-compat). Legacy `scoping_answers` auto-migrate on first run.
- Gate: in the prototype stage, if `discovery_answers` is empty AND `_skipDiscovery !== true` → emit `build:discovery_required` and pause the build.
- The **verbatim Discovery Answers block** MUST be injected into every Concept Architect / Prototype Builder / Production Forge prompt.
- WA surface calls `POST /api/discovery/questions` (standalone, no project ID) before project creation; frontend shows `DiscoveryWizard` when stage='briefing' or on `build:discovery_required`.

**#72b — WA Discovery Handoff Must Not Auto-Build (2026-05-20).** On the WhatsApp surface: project naming is **not** a build trigger. After name confirmation, continue into discovery questions / final confirmation. Terminate discovery after **at most 6 total questions**, then transition to an explicit **ready-to-build** state and wait for a clear trigger (`build it`). Never send "starting deep research / prototype in 10–15 minutes" right after naming unless the explicit build trigger already fired. If project creation or auth failed, surface the error and keep the user recoverable — never pretend the build started.

**#72c — Fatline Naming + Surface Rules (2026-05-20).** See §0 naming reminder.

### Rule #73 — Build Trigger Explicit
The **instant prototype** fires automatically on Discovery completion (~90s, **free**, no credit gate). The **production** build (full pipeline + deploy, **paid**) fires ONLY on explicit user action — **Approve & Build Production** / **Deploy Live** → `POST /api/projects/:id/build/production`. Research outputs are info-layer chat messages, never build triggers.
- `POST …/build/production` requires auth + sets `metadata.production_requested = true` (idempotent: 409 if already requested).
- WA final message after research: proto link + studio link + "Continue building in Studio when ready" — NO auto-build trigger. The `graduate` endpoint fires research only.
- Concept Architect MUST NOT trigger production — it only prepares the contract. Production Forge activates ONLY after explicit approval + `production_requested: true`.

**#73b — Discovery Completion Output Must Be Deterministic (2026-05-20).** When discovery finishes, the handoff packet always includes: confirmed/proposed project name; concise synopsis; app/build-type classification; the discovery answers that materially changed architecture; and an explicit note that the next step is **waiting for build approval** (unless the surface is configured for auto-build). For WA, the ready state ends in a user-facing prompt equivalent to *summary / proposed name* + "reply `build it` to start". Never leave the next action ambiguous.

### Rule #74 — Currency Localization (CEO mandate 2026-05-07)
Currency is determined by the **geographic origin of the user/brief** (WhatsApp country code or brief content).

| Region | Currency | Symbol |
|---|---|---|
| India (+91) | INR | ₹ |
| Europe (EU dial codes) | EUR | € |
| USA / Canada (+1) | USD | $ |
| Ambiguous / unknown | INR | ₹ |

**Default when ambiguous: ₹ (INR)** — Boit Technologies is India-based. **DO NOT hardcode `$`/`USD` as a global default. Ever.**
- Helper: `backend/src/utils/currencyForBrief.js` → `resolveCurrency({ phone, briefText })`; WA: `produsa-whatsapp/src/services/localeResolver.js` (unknown-phone default = INR).
- Prototype Builder reads `currency_symbol`/`currency_code`, defaults ₹. Production Forge carries currency forward; never resets to USD. Mock data uses the correct symbol ("₹2,400" not "$2,400"). Payment integrations follow locale (Razorpay for INR, Stripe for USD/EUR).

**#74b — Explicit Promotion Only (2026-05-20).** Discovery completion does not authorize production. Prototype completion does not authorize production. Production Forge runs ONLY after an explicit promote/build-live approval on the correct surface. If any downstream path auto-promotes from naming, discovery, or research completion → treat it as a pipeline bug and **stop**, don't silently continue. (This is the enforcement companion to #73.)

### Rule #75 — Bundler Placeholder NEVER Ships With Real Source
The manifest bundler (`manifestBundler.js`) must NEVER emit the "Component rendered in manifest build" placeholder HTML when real source exists:
- `prototype_pages` exist in DB → bundle via `injectPages(prototype_index_html, prototype_pages)`.
- JSX pages extracted from `build_tasks` → use `generateManifestHTML()`.
- Emergency placeholder (no pages anywhere) → `console.error` loudly (CloudWatch).
- Runtime guard: before storing `manifest_html`, if a placeholder string is present AND real source exists → **throw a hard error** (never silent).
- `retry-deploy` MUST call `bundleManifestHTML()` before the smoke gate so the subdomain serves real content on every retry.

**Why (2026-05-07 incident):** Project 256 "House of Presence" had 215 KB of real HTML in `prototype_index_html` + 6 `prototype_pages`, but `bundleManifestHTML` read only `build_tasks` (0 rows for instant-proto projects) and silently emitted a 6.2 KB stub; `retry-deploy` never re-bundled, so every retry served the stub. CEO found it during investor-demo prep.

### Rule #76 — Delivery Is Part of "Done" (2026-05-20)
A build is not complete until the **user actually receives the usable continuation links**. Artifact success ≠ delivery success.
- On successful prototype completion, return BOTH the proto/preview link and the studio link; the final message makes the next action obvious (edit / continue in Studio / explicit build approval per stage).
- Verification (FatJudge) MUST distinguish four outcomes: (1) build failed, (2) build OK but link generation failed, (3) build OK but WA/surface delivery failed, (4) build + delivery both OK. A green backend state with no user-facing link/message is a **failure**, not a pass.
- Delivery-path failures route to the Repair Engineer like any other defect — localize the broken layer (project creation / build trigger / poller / link generation / surface delivery), patch the narrowest layer, and re-run enough of the flow to prove links now arrive. "Built somewhere in the backend" is never an acceptable closeout if the user got nothing.

---

## Part D — Shared Production Standards

All FatBots inherit these. They are the consolidated craft standards lifted from the V2.5 specialist probots into the 6-agent FatBot model.

### D1 — Design Language: "Dark Luxury" (default house style)
Use unless the brief/discovery genuinely demands otherwise (Concept Architect sets `style_tokens` + `style-fence.json`; builders must not deviate without recording why).
- **Colors:** background `#050505`, cards `#0a0a0a`, border `rgba(255,255,255,0.06)`, text primary `#c5d0dc`, text secondary `#6b7280`, accents amber `#F59E0B` / purple `#8B5CF6` / success `#10B981`.
- **Type:** headings `Space Grotesk`, body `Inter`, code `JetBrains Mono`.
- **Mobile-first:** base 375px; touch targets ≥44px; `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`; modals as bottom sheet on mobile (`items-end md:items-center`).
- **Footer:** mandatory (R10).

### D2 — The 10 Commandments of Visual Completeness
> Never ship a technically-correct but visually-empty build. This is the cardinal sin.
1. Every list page: **6–12 demo items** with realistic data + images.
2. Every card: an image (category-specific placeholder if the API has none).
3. Every detail page: all fields populated — no dashes, no `₹0.00`, no "— /10".
4. Empty states: engaging — icon + description + CTA + preview of the populated state.
5. Seed script mandatory (`scripts/seed-demo.js`, 10–20 realistic records) for production.
6. Before "done": exercise every route — verify non-empty, images load, numbers real.
7. API shape matching: inspect the endpoint FIRST, build to the exact field names.
8. Price strings → numbers: API returns `"38000000.00"` — always `Number()` before display.
9. **Investor test:** "Could the CEO demo this to an investor RIGHT NOW?" If no → not done.
10. No 90%-blank pages: content fills the viewport.

### D3 — Component Quality Bar (every interactive surface)
Loading state ✅ · error state ✅ · empty state ✅ · success state ✅ · keyboard-accessible (WCAG 2.1 AA, ARIA, focus management) ✅. Frontend perf target: Lighthouse ≥85 performance / ≥90 accessibility, responsive 375px→1440px, no `console.log` in shipped code.

### D4 — The 3-Cycle Dev-Test Loop (expands Rule #46)
```
Build → Judge → Fix v1 → Judge → Fix v2 → Approve
 C1            C2              C3
```
- Builder self-QAs before every submission; the judge never approves with score <95; max 3 cycles then escalate (Rule #49).
- C1 finds obvious breaks; C2 finds integration/contract mismatches; C3 finds edge cases.
- Document each cycle (`PROTOTYPE-SUBMISSION.md` / `VERIFICATION-REPORT.md`). Builder ≠ judge.

**Scoring rubric (FatJudge):** Functionality 40% · Integration 30% · Edge cases 20% · Performance 10%. **PASS ≥95** · **CONDITIONAL 90–94** (fix P2s, ship) · **FAIL <90** (back to builder/repair). Any P1 in C3 = fail regardless of score.

### D5 — Backend / Production Hardening
Read `SCHEMA.md` — never guess table/column names. Parameterized queries only (no string-built SQL). Every endpoint: input validation, auth check, error handling with correct HTTP status, logging. Migrations ship up AND down. Test endpoints with `curl` and show responses. Relative `/api/` URLs — never hardcoded `localhost`. Reinforces R3/R4/R9.

### D6 — 6-Step URL Verification Protocol (expands Rule #43)
```bash
# 1 DNS
dig +short "$SUBDOMAIN.produsa.dev" | grep -q "187.77.189.126"
# 2 SSL
echo | openssl s_client -servername "$SUBDOMAIN.produsa.dev" -connect "$SUBDOMAIN.produsa.dev:443" 2>/dev/null | openssl x509 -noout -dates
# 3 HTTPS 200
curl -s -o /dev/null -w "%{http_code}" "https://$SUBDOMAIN.produsa.dev"
# 4 Content (not stub / 502 / nginx default)
curl -s "https://$SUBDOMAIN.produsa.dev" | grep -q "<expected marker>"
# 5 Service online
pm2 status | grep "$SUBDOMAIN" | grep -q online
# 6 Routing wired
nginx -t
```
ALL pass → share. ANY fail → fix silently, re-run all 6. **Rollback** on deploy failure: stop → preserve logs → restore previous build → re-verify (6 steps) → document in `DEPLOYMENT-LOG.md` → escalate. Target: revert in <5 min.

### D7 — Quality Gates (pipeline-wide)
| Stage | Gate | Threshold |
|-------|------|-----------|
| Discovery | Answers sufficient + ≥1 negative constraint | Rule #72 |
| Concept | Contract + style-fence + acceptance tests present | Architect gate |
| Prototype | FatJudge 4-channel score | ≥95 |
| Production | FatJudge 4-channel + 6-step verify + delivery | ≥95 + Rule #76 |
| Deploy | 6-step verification | All pass |
| **Live** | **Production Manifest (#77–#88)** | **all items pass** |

---

## Part E — Production Manifest (Definition of Done #77–#88)

> The Manifest is the hard checklist that separates "looks done" from "is a deployed, working app." A build advances `production → live` ONLY when **every** item passes. A failed item is a STOP routed to repair (FatMender), not a warning. See [MANIFEST-FATLINE.md](./MANIFEST-FATLINE.md). Automated items are enforced + unit-tested in `runtime/lib/manifest.js`.

### Rule #77 — No Dead Controls
Every interactive element (button, link, form, menu) is wired to a real handler / route / endpoint. **Forbidden in shipped paths:** `onClick={()=>{}}`, `href="#"`, "coming soon", disabled-with-no-reason, or handlers that only `console.log`. Verification enumerates controls and confirms each has a working target.

### Rule #78 — Persistence Round-Trip
Every create/edit/delete actually writes to the database and survives a page reload. In-memory/local-only state that resets is a failure. Proof: `create → reload → record still present` (and `delete → reload → gone`).

### Rule #79 — Executable Acceptance (DoD core)
The app is NOT done until **every** criterion in `acceptance-tests.json` has a corresponding **passing automated test** (Playwright for journeys, API tests for endpoints). The Concept Architect writes the criteria; FatJudge refuses to pass until each has a green test. No criterion may be "manually verified" in production.

### Rule #80 — Environment & Fresh-Boot Readiness
Every `process.env.X` referenced in code is declared in `.env.example` AND provisioned in the deploy environment (no missing-env crash on first boot). The app boots from a **clean database**: migrations run up AND down idempotently, plus a seed. `/api/health` returns `{status:"ok"}`.

### Rule #81 — Live Smoke Test
The core user journey (signup → core action → data persists → logout) is executed against the **deployed subdomain** — not localhost, not staging. 6-step verification (#43/D6) proves the URL *responds*; #81 proves it *works*. Run after every deploy and every retry-deploy.

### Rule #82 — Auth & Tenant Isolation
Real signup / login / logout / session. Protected routes redirect unauthenticated users. **Authorization on every endpoint:** user A can never read or write user B's data. Tested with two seeded users. (Critical severity — a leak here blocks deploy.)

### Rule #83 — Security Gate
Before deploy: `npm audit` clean or every finding triaged; security headers present (CSP, HSTS, X-Content-Type-Options); all input validated + sanitized; user-supplied HTML rendered XSS-safe; rate limiting on auth + write endpoints; no `eval`/dynamic require. Extends R9 (secrets) to the full attack surface.

### Rule #84 — Resilience
A global error boundary (no white screen of death); API/network errors surfaced to the user (never swallowed); real 404 and 500 pages; zero unhandled promise rejections; graceful degradation when a third-party integration is down.

### Rule #85 — Integrations Proven, Not Mocked
Every integration declared in the contract is exercised in **test mode** and proven before live: email actually sends, payments complete (Razorpay/Stripe) with **webhooks handled + idempotency keys**, file upload stores, search queries return. R3 kills fake *data*; #85 kills fake *features*.

### Rule #86 — Observability Minimum
Before "live": a health-check endpoint, structured request/error logging, error tracking (Sentry-class), and an uptime monitor are all wired. You cannot operate what you cannot see.

### Rule #87 — Performance Budget
Bundle size within budget (warn >250KB gz, fail >400KB gz for first load), no N+1 queries on list endpoints, API p95 < 500ms, images optimized/lazy-loaded. Extends D3's Lighthouse ≥85.

### Rule #88 — Stub/Placeholder Scan
Shipped production paths contain no `TODO`, `FIXME`, `not implemented`, `Lorem ipsum`, `example@`, or hardcoded sample responses. Generalizes #75 (bundler placeholder) to all source.

### Behavior rules
- **#B1 — Plan + Self-Critique.** Before generating, each builder writes a short plan and critiques it against the negative fence + acceptance criteria. Measure twice, cut once.
- **#B2 — Capability Honesty (anti-fake).** Never stub or fake a feature you cannot actually build. Tag it `unverified` and escalate (#49) rather than ship a hollow shell. This is the cultural rule behind #77 and #85.

---

## Per-Agent Binding Matrix

Every FatBot is bound by **all** rules. This shows which bite hardest per role (and where each agent's `SKILL.md` adds application notes).

| FatBot | Hardest-binding rules |
|--------|----------------------|
| Discovery Director (FatScout) | #72, #72b, #72c, #73b, #44, #45, #B2 |
| Concept Architect | #72 (inject answers), #73/#74b (no production trigger), #74 (currency in tokens), **#79 (write executable acceptance)**, D1, D2 |
| Prototype Builder (FatProto) | R3, R10, #34, #74, **#77, #84, #87, #88, #B1, #B2**, D1, D2, D3 |
| Production Forge (FatForge) | R1, R3, R4, R5, R9, #73, #74b, **#78, #80, #82, #83, #85, #86, #87, #B1, #B2**, D4, D5, D6 |
| Verification Orchestrator (FatJudge) | #34, #46, #75, #76, **#77–#88 (runs the Production Manifest)**, D2, D4 |
| Repair Engineer | #37, #75, #76, **#77/#78/#82/#88 (manifest-failure repairs)**, R8, #48 |

---

*Maintained by ProdusaClaw. Source of truth for FatBot rules — update here, never fork into individual SKILL.md files. Last consolidated: 2026-05-22 (ported from approved Produsa V2.5 instant pipeline).*
