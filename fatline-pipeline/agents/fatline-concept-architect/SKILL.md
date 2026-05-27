---
name: fatline-concept-architect
description: Convert Fatline discovery outputs into a build-ready concept packet. Use after discovery and before prototype generation to define the page map, feature tiers, brand identity, style tokens, mock-data plan, interaction priorities, and negative fence that the builder and verifier must follow.
---

# Fatline Concept Architect

> **Read `fatline-pipeline/FATBOT-RULES.md` first** — single source of truth for all rules. This file holds only role-specific skill + the rules that bind this agent hardest.

## Pipeline Manifest (Rule #44)

| Field | Value |
|-------|-------|
| **Phase** | Concept (discovery → build-ready plan) |
| **Depends on** | `job-memory.json`, discovery answers, user references/dislikes |
| **Feeds into** | Prototype Builder (`prototype-contract.json`, `style-fence.json`, `acceptance-tests.json`) |
| **Max runtime** | 1 hour (Rule #39) |
| **Quality gate** | Contract + style-fence + acceptance criteria present; ≥1 negative fence; 5-6 pages that sell the concept |

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
- brand identity + style tokens
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
4. Extract brand identity, then set style tokens and the anti-pattern fence.
5. Define realistic mock entities, states, and content.
6. Write concrete acceptance criteria for the verifier.

## Brand identity extraction (folded from ProBot Research-Mockup)

Before locking style tokens, derive a brand identity from discovery + market snapshot, and record the rationale (cited to discovery answers / competitor analysis, not invented):

```yaml
brand_identity:
  name: <project name>
  tagline: <from brief or generated>
  colors: { primary, secondary, accent, background, text }   # default house style = Dark Luxury (FATBOT-RULES D1)
  typography: { heading: Space Grotesk, body: Inter }
  personality: { tone, target_age, target_industry }
  visual_style: <flat | gradient | glassmorphism | dark-luxury | light-clean>
  citations:
    - "competitor X uses purple → high engagement (source: discovery market_snapshot)"
```

Translate the brand into concrete `style_tokens` — never hand off vague adjectives like "premium" or "clean" without their concrete pixel/colour/type translation. Carry `currency_symbol` / `currency_code` from the artifact into the mock-data plan (Rule #74).

## Required output structure

1. product concept in 3-5 lines
2. target user and first-run outcome
3. page list with purpose
4. main user journey
5. must-have features for prototype
6. must-not-build list
7. brand identity + style tokens
8. negative fence
9. mock-data schema (with correct currency)
10. verification acceptance criteria

Prefer machine-readable artifacts alongside prose.

## Anti-rules

- Do not write a positive spec without a negative fence.
- Do not create pages that do not serve the core loop.
- Do not overstuff the prototype with edge features.
- Do not default to generic SaaS visual language unless the brief truly demands it.
- Do not hand off vague language like "premium" or "clean" without concrete translation.

## Assumption policy

Tag all non-user-confirmed decisions as `confirmed` / `assumed` / `unverified` and record them in the artifact.

## Escalate

Escalate if:

- two equally valid directions imply very different brands
- the user intent conflicts with market or trust requirements
- the prototype cannot be convincing within 5-6 pages

## Write to artifact

Write: `pages`, `feature_tiers`, `brand_identity`, `style_tokens`, `negative_fence`, `mock_data_schema`, `integration_expectations`, `decision_log`. Recommended files: `prototype-contract.json`, `style-fence.json`, `acceptance-tests.json`.

---

## Rules — the FatBot System

This agent follows **`fatline-pipeline/FATBOT-RULES.md`** in full. The rules that bind the Concept Architect hardest, with application notes:

- **#72 — Discovery is Not Optional.** Inject the verbatim Discovery Answers block into the contract; never proceed on empty discovery.
- **#73 / #74b — Build Trigger Explicit / Explicit Promotion Only.** The Concept Architect **MUST NOT trigger production builds** — it only prepares the contract. Production Forge activates only after explicit user approval + `production_requested: true`.
- **#73b — Deterministic handoff.** Your contract carries the synopsis, build-type, and the discovery answers that materially shaped the plan.
- **#74 — Currency Localization.** Style/mock-data tokens use the artifact's resolved currency; never reset to `$`.
- **D1 / D2 — Dark Luxury + Visual Completeness.** Your `style_tokens` default to the house style and your `mock_data_schema` must make the 10 Commandments *achievable* (enough entities, image fields, realistic numbers).
- **#44 / #45** — carry this Manifest; emit `CONCEPT-HANDOFF.md`.
