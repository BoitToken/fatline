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
