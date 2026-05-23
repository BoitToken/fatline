# fatline-engine — the FatBots prototype generator

A standalone, fatline-native instant-prototype generator built to **beat the V2
instant pipeline** on visual quality and reliability. It clones the *approach* of
V2's `instantPrototypeGenerator` (Produsa-ai) but **does not touch V2.5 code** —
it's a clean re-implementation with deliberate improvements.

## Why it beats V2
| V2 weakness | Fatline fix |
|---|---|
| Fragile LLM-generated shell needing ~10 regex patches | **Deterministic shell** (`src/shell.mjs`) — Fatline owns the chrome, CSS design system, `window.__PAGES__` and the router. Renders never break. |
| Pollinations AI images (uncanny, slow) | **Real photography** — curated Unsplash bank + topical photo prompts (`src/images.mjs`). |
| Per-page LLM drift, no shared context | **Shared design brief** locks palette, fonts, copy, data + per-page section plans before any page is generated (`src/prompts.mjs`). |
| Dormant per-vertical guidance | Industry detection → palette + font pairing + section vocabulary (`src/palette.mjs`). |
| No caching | Prompt-cached system blocks (`src/llm.mjs`). |

Output is byte-compatible with the V2 preview mechanism (`window.__PAGES__` +
`postMessage({page})`), so it drops straight into the Fatline Studio iframe.

## Pipeline
1. **Design brief** (one creative LLM call) → brand, palette, fonts, hero copy,
   real data catalog, per-page section contracts.
2. **Pages** (one call per page, in parallel) → HTML fragments composing from the
   shared brief + image kit.
3. **Assemble** → deterministic shell with `__PAGES__` injected.

Model: `claude-sonnet-4-6` (set `ANTHROPIC_API_KEY`). Pass `--brief-opus` /
`--pages-opus` to use Opus for higher-leverage stages.

## Usage
```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
export PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright   # if browsers cached

# generate one prototype
node run.mjs --idea "Premium paan delivery in Bangalore" --type ecommerce --label demo --out ./out
open ./out/demo/index.html

# audit a build (or any live proto URL) against the V2 quality rubric
node audit.mjs --file ./out/demo/index.html --label demo
node audit.mjs --url https://proto.produsa.app/proto/p/460 --label v2-bar

# run the test-dev loop: 16 varied briefs, gate 8.5, stop at 10 consecutive passes
node loop.mjs --count 16 --gate 8.5 --target 10 --out ./loop
```

## Audit rubric (`audit.mjs`)
Headless-Chromium renders every page, walks the `__PAGES__` router, screenshots,
and scores 0–10 on: multi-page coverage, content density, **real images loaded**,
structure/components, typography, palette cohesion, interactivity — penalising
lorem ipsum, horizontal overflow, and render errors. Calibration baselines:
**V2 460 = 9.0, V2 Salesfun = 5.1.** Loop "pass" = score ≥ gate, ≥5 pages,
≥3 images, ≥2 fonts, no penalties.

## Layout
```
src/llm.mjs        Anthropic wrapper (cache, retry, timeout, JSON/HTML extract)
src/palette.mjs    industry palettes, font pairings, archetypes
src/images.mjs     curated Unsplash + Pollinations + avatars
src/pages.mjs      page sets per app type
src/prompts.mjs    design-brief + per-page prompts
src/shell.mjs      deterministic shell + design system + router
src/generate.mjs   orchestration
run.mjs            CLI (one build)
audit.mjs          Playwright audit harness (importable runAudit)
loop.mjs           test-dev loop to N consecutive passes
```
