# Fatline Runtime

A standalone, **zero-dependency** orchestrator that makes the 6 FatBots *executable*. It loads the `SKILL.md` files + `FATBOT-RULES.md`, threads one `job-memory.json` artifact across all stages, and enforces the rule gates as code. Generator-agnostic: ships with an offline `MockGenerator` for dry-runs/CI and a `LiveGenerator` stub showing where the model + `api.produsa.app` endpoints plug in.

## Why this exists
The audit (2026-05-22) found the FatBots were *definitions only* — nothing executed them; live generation still ran the V2 probot logic. This runtime is the missing glue: the pipeline now runs, and the gates the audit flagged as "specified but not implemented" are real and tested.

## Run it (dry-run, offline)
```bash
cd fatline-pipeline/runtime
node run.mjs --idea "an ecommerce store for handmade goods" --surface whatsapp --phone "+91 98765 43210" --promote
node --test            # 15 gate tests
```

## The 6-stage flow
```
new → discovery(#72) → concept → prototype(#73 free, #75 guard) → verify⇄repair(#46, ≤3) → #76 delivery
    → ready_to_build → [explicit promote #73/#74b + R5 credits] → production → verify → #76 → live
```

## Gates implemented (`lib/gates.js`)
| Gate | Rule | Behaviour |
|------|------|-----------|
| `gateDiscovery` | #72 / #72b | empty/insufficient → `build:discovery_required`; WA ≤6 Qs; ≥1 negative constraint |
| `gatePromotion` | #73 / #74b | production only on explicit approval + `production_requested`; else refuse (no auto-promote) |
| `gateCredits` | R5 | paid phase only; shortfall → HTTP 402 (+10% margin) |
| `gateBundler` | #75 | real source + stub/placeholder manifest → **fatal throw** (re-bundle) |
| `gateDelivery` | #76 | four outcomes: build_failed / link_gen_failed / delivery_failed / delivered |

Rule mechanics in `lib/rules.js`: `resolveCurrency` (#74, ₹ default), `FOOTER` (R10), `discoveryAnswersBlock` (#72 verbatim injection).

## The live pipeline (`LiveGenerator`) — wired

`LiveGenerator` (`lib/generator.js`) drives the real pipeline:
- **model reasoning** via `lib/modelClient.js` (Anthropic Messages API, prompt-cached system prompts) — runs the discovery/concept/verify/repair SKILLs;
- **build endpoints** via `lib/produsaClient.js` (`api.produsa.app`): create project → `build/instant` → poll → `build/production`;
- **Manifest signals** via `lib/signals.js` (pure, unit-tested): `#77` dead-control scan, `#88` stub scan, `R10` footer, `#80` env diff, `#84` resilience markers, `#87` bundle size — derived from the deployed HTML/source; signals it can't compute come from the backend's `metadata.manifest_signals`, and anything still unknown stays absent → the Manifest fails it (capability honesty, #B2).

```bash
export ANTHROPIC_API_KEY=…  PRODUSA_TOKEN=…           # R9: env only
node run.mjs --probe                                  # read-only GET /api/health
node run.mjs --live --idea "a CRM for plumbers"       # discovery→concept→prototype→verify (FREE)
node run.mjs --live --idea "…" --promote --allow-production   # also fire the PAID prod build
```

**Safety:** without `--live` it's fully offline. With `--live` but **without** `--allow-production`, the paid `POST /build/production` is refused (prototype-only). The orchestrator still enforces every gate (R5 credits, #73/#74b promotion, Manifest #77–#88).

> Some `api.produsa.app` response field names in `LiveGenerator` are best-effort against the studio's `api.js` contract; confirm/adjust against live responses (the build flow also emits socket events — polling is used here for socket-independence).

## Files
- `run.mjs` — CLI · `lib/orchestrator.js` — FSM · `lib/gates.js` — flow gates · `lib/manifest.js` — Production Manifest · `lib/rules.js` — rule mechanics
- `lib/agents.js` — SKILL loader + prompt assembly · `lib/generator.js` — Mock/Live · `lib/validate.js` — schema validator
- `lib/config.js` — env+flags+safety · `lib/modelClient.js` — Anthropic · `lib/produsaClient.js` — api.produsa.app · `lib/signals.js` — Manifest extractors
- `schema/job-memory.schema.json` — artifact spine · `test/{gates,manifest,signals}.test.mjs` — 37 tests
