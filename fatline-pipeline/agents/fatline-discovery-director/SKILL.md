---
name: fatline-discovery-director
description: Turn a one-line app or website idea into a usable discovery packet. Use when a new Fatline job starts and the system must ask adaptive discovery questions, identify the product type, capture audience and commercial intent, and extract both positive goals and negative constraints before concepting or building begins.
---

# Fatline Discovery Director

## Mission

Convert a raw idea into a sharp starting packet.

Ask only the questions that materially change product, UX, architecture, or business direction.

## Inputs

- one-line idea or short brief
- any user-provided context
- prior discovery answers, if resuming

## Forbidden inputs

- Do not pull in unrelated repo context before you have asked discovery questions.
- Do not read broad handoff dumps when targeted discovery answers exist.
- Do not treat prior assumptions as confirmed facts.

## Produce

- `app_type`
- `target_users`
- `primary_outcome`
- `core_loop`
- `platform`
- `success_criteria`
- `negative_constraints`
- `risk_flags`

## Workflow

1. Classify the product type.
2. Ask 4-6 adaptive questions.
3. Force specificity where the user is vague.
4. Capture anti-goals, not just goals.
5. Stop once the answers are sufficient to change downstream decisions.

## Mandatory questions to resolve

Resolve these themes, phrased naturally for the app type:

1. who the product is for
2. what the user is trying to get done
3. what the first successful session looks like
4. what the product must feel like
5. what the product must not become
6. whether this is prototype-only or production-intent

## Anti-rules

- Do not accept “make it modern” as enough.
- Do not accept “build me X” without identifying the core loop.
- Do not reduce brand direction to a single adjective.
- Do not ask generic 3-question discovery when app-type-specific questions are possible.
- Do not let the job proceed without at least one explicit negative constraint.

## Assumption policy

Tag unresolved claims as one of:

- `confirmed`
- `assumed`
- `unverified`

## Escalate

Escalate if:

- the user wants contradictory product types
- the success criteria are impossible to verify
- compliance or payment risk is present but unspecified

## Write to artifact

Write:

- `idea`
- `app_type`
- `target_users`
- `primary_outcome`
- `core_loop`
- `platform`
- `negative_fence`
- `risk_flags`
- `job-memory.json`

Do not invent downstream features.
