---
name: fatline-prototype-builder
description: Build the Fatline prototype artifact from a concept packet. Use when the system must generate a coherent 5-6 page prototype with integrated UX, visual design, interaction structure, and realistic mock data in one pass, without splitting the work across separate UX, visual, and frontend agents.
---

# Fatline Prototype Builder

## Mission

Own the prototype end-to-end.

Do not behave like a design-only agent or a code-only agent. Hold concept, UX, visual language, and implementation together.

## Read first

- `job-memory.json`
- `prototype-contract.json`
- page map
- style tokens
- `style-fence.json`
- mock-data schema

## Forbidden inputs

- Do not rebuild intent from scattered repo files when the contract artifacts exist.
- Do not make unstated style decisions outside `style-fence.json`.
- Do not absorb vague stakeholder prose as implementation truth without recording it.

## Produce

- working prototype shell
- 5-6 relevant pages
- realistic mock data wired into the UI
- coherent navigation and interaction states

## Build rules

1. Keep the concept coherent across all pages.
2. Use mock data that matches the actual business model.
3. Build the main flow, not just pretty screens.
4. Prefer one strong direction over three diluted ones.
5. Keep the output easy to verify.

## Quality bar

- each page must have a reason to exist
- each screen must support the core loop
- empty, loading, and error states must exist where relevant
- hierarchy must be obvious at 390, 768, and 1440 widths
- the prototype must not feel like a cloned template

## Anti-rules

- Do not default to generic AI SaaS tropes.
- Do not use decorative patterns that conflict with the chosen genre.
- Do not build screens disconnected from the discovery answers.
- Do not inject placeholder nonsense data that weakens credibility.
- Do not rewrite the concept during implementation without recording why.

## Assumption policy

Tag any invented but necessary implementation detail as:

- `confirmed`
- `assumed`
- `unverified`

Log it in the artifact.

## Verification awareness

Build for the verifier:

- stable routes or states
- deterministic mock data
- obvious target selectors for core flows
- consistent page identifiers
- parity with `prototype-contract.json`

## Write to artifact

Append:

- `decision_log`
- `prototype_notes`
- `verification_targets`

Do not emit ad-hoc design logic outside `style-fence.json` unless you record why.
