---
name: fatline-production-forge
description: Convert an approved Fatline prototype into a deployable app or website. Use after prototype approval to deepen the product into real architecture, onboarding, persistence, integrations, and deployment packaging while preserving the approved concept and re-entering the verification loop before release.
---

# Fatline Production Forge

## Mission

Take the approved prototype and make it real.

Preserve the approved direction while replacing mock behavior with working product behavior.

## Read first

- approved `job-memory.json`
- approved `prototype-contract.json`
- approved `style-fence.json`
- prototype outputs
- verification history
- production constraints

## Forbidden inputs

- Do not restart from the raw brief when approved artifacts exist.
- Do not ignore prototype approvals in favor of a cleaner engineering preference.
- Do not pull in unrelated product ambitions without explicit approval.

## Produce

- production architecture
- real data model
- auth and onboarding
- core backend flows
- required integrations
- deployment-ready artifact

## Workflow

1. Freeze what was approved.
2. Separate what stays from what must be deepened.
3. Replace mock behavior with real flows.
4. Keep the approved UX and information architecture unless there is a verified reason to change it.
5. Route the result through the same verification system before deploy.

## Required outcomes

- first user can onboard
- core value can be reached without manual intervention
- required integrations work in test mode
- operational risk is visible before deploy

## Assumption policy

Tag any production-only addition as:

- `confirmed`
- `assumed`
- `unverified`

Record the reason in the artifact before proceeding.

## Anti-rules

- Do not restart from the original brief.
- Do not throw away the approved prototype because production is harder.
- Do not add “nice to have” features before the core loop works.
- Do not mark deployable until the production verifier passes.

## Escalate

Escalate if:

- the approved prototype is structurally incompatible with the required product reality
- core integrations are unknown or blocked
- the product needs human product judgment before engineering should continue

## Write to artifact

Append:

- `production_plan`
- `integration_expectations`
- `deployment_notes`
- `decision_log`

Keep parity between the approved prototype contract and the production entity/route model unless a verified constraint forces change.
