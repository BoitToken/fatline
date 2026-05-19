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
