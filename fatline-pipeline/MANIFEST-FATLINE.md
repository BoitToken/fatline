# Manifest Fatline — the Production Definition of Done

**Status:** Active mandate (canonical)
**Date:** 2026-05-23
**Owner:** ProdusaClaw

> **Manifest Fatline** = the Fatline pipeline governed by a **Production Manifest**: a hard checklist (#77–#88) an app must fully satisfy before it can go **live**. The goal is not a pretty prototype — it is a **fully built, deployed, working app**. The FatBots don't get to call something "done"; the Manifest does.

---

## Why this exists

The visual rules (10 Commandments, D2) make a build *look* finished. The Manifest makes it *be* finished. AI builders consistently ship surfaces where most controls are dead, data evaporates on refresh, env vars are missing in prod, every user can see every other user's rows, and "integrations" are mocked. The Manifest is the gate that refuses to call those apps live.

A build advances `production → live` **only** when `productionManifest(jm)` passes. A failing item routes to the Repair Engineer (FatMender) — it is not a warning, it is a stop.

---

## The Production Manifest (Definition of Done)

Each item is a rule in [FATBOT-RULES.md](./FATBOT-RULES.md) Part E. "Gate" items are enforced in code ([runtime/lib/manifest.js](./runtime/lib/manifest.js), unit-tested); "Prompt" items are mandates the agent/LiveGenerator must satisfy and report signals for.

| # | Manifest item | What it proves | Type | Binds |
|---|---------------|----------------|------|-------|
| **#77** | **No dead controls** | every button/link/form wired to a real handler/route/endpoint; zero no-op `onClick`, `href="#"`, "coming soon" | Gate | Proto, Forge, Judge |
| **#78** | **Persistence round-trip** | every create/edit writes to the DB and survives a reload (`create → reload → present`) | Gate | Forge, Judge |
| **#79** | **Executable acceptance (DoD core)** | every `acceptance-tests.json` criterion has a passing automated test | Gate | Architect (writes), Judge (enforces) |
| **#80** | **Env & fresh-boot readiness** | every `process.env.X` is in `.env.example` + provisioned; boots from clean DB (idempotent up/down migrations + seed); `/api/health` ok | Gate | Forge |
| **#81** | **Live smoke** | core journey (signup → core action → persist → logout) passes on the **deployed subdomain**, not localhost/staging | Gate | Judge, Forge |
| **#82** | **Auth + tenant isolation** | real signup/login/logout/session; protected routes redirect; user A cannot read/write user B's data | Gate | Forge, Judge |
| **#83** | **Security gate** | `npm audit` clean/triaged, security headers (CSP/HSTS), input sanitization, XSS-safe rendering, rate limiting | Gate | Forge, Judge |
| **#84** | **Resilience** | global error boundary, API errors surfaced (not silent), real 404/500 pages, no unhandled rejections, graceful integration-down | Prompt+Gate | Proto, Forge |
| **#85** | **Integrations proven, not mocked** | every declared integration (email, payments+webhooks+idempotency, storage, search) exercised in test mode | Gate | Forge, Judge |
| **#86** | **Observability minimum** | health check + structured logging + error tracking + uptime monitor live before "live" | Gate | Forge |
| **#87** | **Performance budget** | bundle-size cap, no N+1 queries, API p95 < 500ms, images optimized (extends Lighthouse ≥85) | Gate | Proto, Forge, Judge |
| **#88** | **Stub/placeholder scan** | no `TODO/FIXME/not implemented/lorem/hardcoded sample` in shipped paths (generalizes #75) | Gate | Judge |

### Behavior rules (better generation, not just gating)
- **#B1 — Plan + self-critique:** before generating, each builder writes a short plan and critiques it against the negative fence + acceptance criteria ("measure twice"). Reduces rework and off-brief output.
- **#B2 — Capability honesty (anti-fake):** never stub or fake a feature it cannot actually build — tag `unverified` and escalate (#49) rather than ship a hollow shell. This is what makes #77/#85 stick.

---

## How the gate runs

```
production build → FatJudge 4-channel (#46) → #76 delivery
                 → productionManifest(jm):  #77 … #88   (all must pass)
                 → ✅ live   |   ❌ → FatMender (repair) → re-run
```

`productionManifest()` returns `{ pass, score, items[] }`. Any failed item blocks `live` and is routed to repair with a localized signal. The manifest score is reported alongside the FatJudge quality score.

## Rollout
1. ✅ Rules #77–#88 + #B1/#B2 in FATBOT-RULES.md Part E.
2. ✅ `runtime/lib/manifest.js` + unit tests; wired into `orchestrator.promoteToProduction`.
3. ✅ Binding matrix + per-agent `manifest.json` updated.
4. ✅ `LiveGenerator` wired (`runtime/lib/generator.js`): Anthropic model reasoning + `api.produsa.app` build endpoints + pure Manifest signal extractors (`runtime/lib/signals.js`, unit-tested). `--probe` confirms live connectivity (health 200).
5. ⏳ Backend must emit the remaining Manifest signals it owns via `project.metadata.manifest_signals` — `#78` persistence round-trip, `#82` two-user isolation, `#83` `npm audit`+headers, `#85` test-mode integration runs, `#86` observability wiring, `#87` p95/lighthouse. Signals not derivable client-side and not supplied stay absent → the Manifest fails them (capability honesty, #B2). Full visual/runtime channels need a Playwright worker.
