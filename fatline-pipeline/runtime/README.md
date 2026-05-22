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

## Wiring the live pipeline
Implement the methods on `LiveGenerator` (`lib/generator.js`) — discovery → `POST /api/discovery/questions`, prototype → `POST /api/projects/:id/build/instant`, production → `POST /api/projects/:id/build/production`, verify → the 4-channel verifier — then pass it to `new Orchestrator({ generator })`. The FSM, gates, and artifact schema stay identical.

## Files
- `run.mjs` — CLI · `lib/orchestrator.js` — FSM · `lib/gates.js` — guards · `lib/rules.js` — rule mechanics
- `lib/agents.js` — SKILL loader + prompt assembly · `lib/generator.js` — Mock/Live · `lib/validate.js` — schema validator
- `schema/job-memory.schema.json` — the artifact spine · `test/gates.test.mjs` — gate tests
