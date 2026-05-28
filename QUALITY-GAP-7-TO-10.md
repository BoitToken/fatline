# Fatline Output Quality — Gap Analysis (7/10 → 10/10)

**Comparison:** `fatline-engine` (current generator) vs. Produsa **V2.5 instant pipeline** (the fine-tuned gold standard).
**Sources:** `/root/produsa-v2-gauth/backend` (V2.5, git HEAD `91c5e58` ~2026-05-21 — mature, stable rules) and `/root/fatline-build/fatline-engine`.
**Date:** 2026-05-25

---

## 0. The framing that matters

The artifact generating fatline output is **`fatline-engine`** — a clean 2-stage LLM flow:
`brief (1 call) → pages (N parallel calls) → deterministic shell assembly`. Reliable plumbing,
thin depth.

It is **NOT** the 6 `fatline-pipeline/agents/*/SKILL.md` FatBots (those are aspirational specs that
already lag their own v2/v3 revisions and don't drive the live generator). Don't debug those for
output quality — debug the engine.

V2.5's instant pipeline is a **multi-agent, library-grounded** system. Its quality comes from FIVE
fine-tuned subsystems the engine simply does not have. That's the whole 7→10 gap.

| Subsystem | V2.5 instant pipeline | fatline-engine today |
|---|---|---|
| Copy | Dedicated copywriter stage + InstaScout brand voice: personality budget, banned phrases, forbidden patterns, micro-copy bank, brand manifesto | One sentence/slot in the brief call. No enforcement. |
| Design inspiration | Industry-gated, embedded **`inspiration_library`** (Envato themes + scraped galleries) injected as "structural DNA" | **None.** No inspiration concept at all. |
| Design tokens | DEPTH MANDATE: surfaces/gradients/shadows/motion/clamp type + 6 styles + deterministic layout archetypes | palette(6 colors) + 1-of-7 font key. One hardcoded dark template. Layout archetypes are **dead code**. |
| Imagery | Category-aware prompts → R2 cache → Pollinations(seeded) → Unsplash; deterministic 7-slot floor with real per-industry IDs | Shallow Unsplash bank (10 cats), Picsum fillers, initials-avatars. **LLM's `imageKeyword` is computed then ignored.** |
| QA | InstaSentinel 100-pt (deterministic + LLM judgment) + grounding verifier; fail-closed gates | Structural counting only, **max score 9.0, cannot perceive quality**. |

---

## 1. Copywriting

### What V2.5 enforces (port these verbatim)

**Personality Budget** (`InstaScout.md:122-129`) — a 0–10 dial set per brief, controls wit density:
```
N=8-9: Dating/social/Gen Z — irreverent, internet-native, screenshot-worthy.
N=6-7: Lifestyle/millennial — playful but professional.
N=3-4: B2B/SaaS — dry confidence, specific numbers, no jokes.
N=2-3: Health/legal/finance — warm authority, never clinical.
Default N=5. Insert EXACTLY N witty/concrete moments across tagline+heroHeadline+heroSubheadline+ctaPrimary.
```

**Banned phrases** (enforced in BOTH the skill and in code, `instantPrototypeGenerator.js:2419`):
```
"Available 24/7", "Everything you need", "Your AI [X]", "Win at", "Master your",
"Powered by AI", "Next-generation"/"Next-gen", "Seamlessly", "Take it to the next level",
"Unleash", "Revolutionary", "Game-changing", "Cutting-edge", "State-of-the-art",
"All-in-one solution", "Lorem ipsum", "example.com", "Coming Soon", "Placeholder"
→ If tempted, replace with a SPECIFIC verb/outcome the user actually experiences.
```

**Forbidden headline PATTERNS — Rule #89** (the "Revel Travel" post-mortem fix, `:2462`):
```
❌ "Your X. Adjective."  e.g. "Your Festival. Guaranteed."
❌ Filler-list subheads  e.g. "Authentic tickets, real beds, sorted transport — all in one booking."
❌ "X made simple" / "X done right" / "The X that just works" / "X, reimagined"
❌ Abstract-quality headlines with no brand nouns
RULE: H1 MUST contain a brand-specific noun/verb (festival, crew, trip…), NOT abstract qualities.
       Subhead MUST be unusable by any other brand in the same industry, or REWRITE.
```

**Headline/CTA formulas** (`InstaScout.md:86-92`): tagline 6-8 words verb/benefit-led; hero headline
4-8 words, no "Welcome to"; subhead 1 sentence specific benefit, no "platform for X"; CTA verb-led;
stat labels app-specific (not generic Users/Revenue/Growth); empty states app-specific.

**CTA variety** (`InstaUX.md:76`): forbid "Claim Your X"/"Unlock Your X"/"Get Your X"; rotate
action-first / benefit-first / urgency / social-proof / domain-specific ("Order Now", "Book Session").

**Micro-copy bank** (REQUIRED, `InstaScout.md:188`): every empty-state/button/toast/placeholder must
"sound like the BRAND, not a Bootstrap default" — "Add to bag" not "Add to cart"; injected verbatim
into the page prompts so copy is consistent, not re-invented per page.

**Brand manifesto + values** injected verbatim into the copywriter prompt for coherence (`:2447`).

**India voice** (`InstaScout.md:70-76, 231`): default `en-IN`; NEVER default to FR/DE without signal;
don't translate on brand name alone; Hinglish allowed for Indian D2C ("Bohot zyada style, exact pricing");
INR→Indian names (Raj, Priya, Arjun…); competitors localized (Zepto/Swiggy/Groww).

### fatline today
- All copy in ONE brief call, capped at a sentence/phrase per slot (hero sub ≤18 words, blurbs 6-10,
  quotes "1 sentence"). No long-form body, no FAQ/objection copy, no microcopy.
- **No** banned list, **no** forbidden patterns, **no** personality budget, **no** brand manifesto.
- India = a currency string + 5 hardcoded Indian avatar names + 3 food keywords. No en-IN voice.
- Page prompt says copy "MAY be used" → copy can silently drift per page (breaks coherence).

### To implement
1. Add a **dedicated copy stage** (or expand the brief) that emits a `microCopyBank`, `brandManifesto`,
   `brandValues`, and per-section copy — then inject them **verbatim** into page prompts (force, not "may").
2. Port the **banned-phrase list + Rule #89 forbidden-pattern self-check** into both the brief system
   prompt and a cheap post-generation validator (regex + one LLM pass).
3. Add the **personality budget** dial (infer from industry, allow brief override).
4. Add the **en-IN voice block** + Hinglish-for-D2C rule.

---

## 2. Design inspiration (Envato) — the biggest design lever

> The "secret sauce" is **not the Envato API.** It's a classified, embedded **`inspiration_library`**
> (Postgres + pgvector) built from Envato/ThemeForest theme folders in R2 + scraped galleries, distilled
> into structured directives injected into the generator.

### What V2.5 does
- **Ingestion** (`envatoClassifier.js`, `r2Reader.js`): theme folders in R2 → GPT-vision classifies each
  into `{industry_tags, vibe_tags, layout_type, animation_density, color_palette{primary..text},
  fonts_detected, target_pages, best_for}` + a 1536-dim embedding → upserted to `inspiration_library`.
- **Selection** (`designScout.searchInspiration`): given the brief's industry/vibe →
  - **Industry HARD GATE** (semantic allowlist, `designScout.js:132`): industry tags must intersect
    *before* any vibe/vector ranking (added after a pharma brief picked a fashion theme). Relaxes only
    if pool < 2.
  - pgvector cosine + **vibe re-rank** with explicit boosts/penalties (retro vs minimal signal regexes).
  - **Rule #90 fallback** (`designScout.js:304`): if no industry match → `is_universal` themes, stamped
    with a warning so downstream uses ONLY layout/rhythm, ignores content patterns.
- **Injection** (`buildInspirationBlock`, `:1779`): top-3 picks → a text block in the shell prompt:
```
INSPIRATION REFERENCES — absorb STRUCTURAL DNA, not surface:
• [PRIMARY] <title>  layout_archetype:… ← mirror this rhythm
   motion:… fonts_observed:… palette_observed:… screenshot:<url>
USE the PRIMARY's layout_archetype + motion + typography hierarchy. Adapt to brand voice & palette.
CRITICAL: if the brief's vibe clashes with the picks, TRUST THE BRIEF. The library is a starting point, not a cage.
```
- Plus a deterministic **layout archetype** (`pickLayoutArchetype`, `:1719`): 6 layout DNAs, each with a
  fixed `sectionRhythm` + `forbidden` list, **selected by hashing brief signals** so two different briefs
  reliably get visibly different layouts. (fatline has the same idea as `HERO_ARCHETYPES` — but it's dead code.)

### fatline today: nothing. No library, no inspiration, no archetype selection.

### To implement (highest design ROI)
1. **Stand up a minimal inspiration library.** Don't need the full R2 pipeline on day one — seed a JSON
   (or small SQLite/Postgres) of ~30–60 curated references per the V2.5 schema (`industry_tags, vibe_tags,
   layout_type, animation_density, color_palette, fonts_detected, screenshot_url`). Can be hand-built from
   the existing R2 `envato-extracted` assets if reachable from the engine's host.
2. **Add `selectInspiration(industry, vibe)`** with the **industry hard-gate + vibe re-rank** (port
   `designScout.js` logic; embeddings optional — tag-overlap scoring works as the Strategy-2 fallback).
3. **Wire `buildInspirationBlock()`** into the brief+page prompts with the "absorb DNA, trust the brief" framing.
4. **Revive layout archetypes**: implement `pickLayoutArchetype()` (hash brief signals → archetype with
   `sectionRhythm`+`forbidden`) and actually pass it into the shell/page prompts. This alone kills the
   "every fatline app looks identical" problem.

---

## 3. Design tokens & visual variety

### V2.5 DEPTH MANDATE (`InstaVisualD.md:184-255`) — "a 4-color palette is NOT enough"
Every build emits a full token system: `surfaces` (raised/sunken/overlay/borderSubtle/borderStrong),
`semantic` (success/warning/danger/info), `gradients` (hero/button/card_subtle), `typography` with
`clamp()` sizing (`"hero":"clamp(3rem,8vw,5.5rem)"`) + weights, `motion` density + named transitions,
`shadows` (sm/md/lg/glow), `radii` (sm/md/lg/xl/pill). Plus:
- **6 named styles** (Dark Luxury / Clean Light / Bold Brand / Warm Neutral / Neutral Professional /
  Vibrant-Playful) with real references (Linear, Notion, Zomato, Aesop, Zoho, CRED…).
- **Diversity mandate**: Dark Luxury ≤ 1-in-3 apps; Indian food/beauty/wellness/edu → Warm Neutral or
  Bold Brand, never Dark Luxury.
- **Forbidden colors**: the Produsa purple range (`#7c3aed, #a78bfa, #6d28d9…`) banned from output.
- **Typography mood → Google Fonts** map (retro-display→Lobster/Bungee, editorial-serif→Playfair…),
  plus the **31-font Envato-licensed display catalog** (`fonts-catalog.json`) with tone + industry indices.

### fatline today
- Only TWO real design decisions per build: 6-color palette + 1-of-7 font key. **All dark theme.**
- Chrome/spacing/cards/buttons/animations are **byte-identical across every app** (one `shell.mjs` template).
- `HERO_ARCHETYPES` (5 layouts) exists but is **never selected** — dead code.
- `bold_grotesk` font key uses `Clash Display`, **not on Google Fonts** → silently fails to load.

### To implement
1. Expand the brief's design output to the **DEPTH MANDATE token object** (surfaces/gradients/shadows/
   motion/clamp-type) and have `shell.mjs` consume tokens instead of hardcoding them.
2. Add a **light-theme path** + the 6-style system (even 3 styles would break the monotony).
3. Add the **diversity mandate + forbidden-purple guard** (the engine already strips Produsa branding;
   extend to colors).
4. Fix the `Clash Display` font bug; consider porting a subset of the Envato font catalog.

---

## 4. Imagery

### V2.5
- **Category-aware prompts** (`generateAssets`): apparel→"lifestyle editorial photograph of people wearing
  X, magazine quality, cinematic"; food→"editorial overhead spread… magazine cover styling"; etc.
- **Provider ladder**: R2 image cache HIT → **Pollinations** (deterministic seeds: hero 42, cover 99,
  cards 1-8) → **Unsplash** fallback → ui-avatars. Fails closed.
- **Deterministic 7-slot floor** (`getProjectImages`): `{hero,f1,f2,f3,av1,av2,av3}` resolved through
  project assets → Envato-extracted → curated stock → per-industry hardcoded Unsplash IDs (12 industries).
- **Copy-exact URL rule** injected: "use ONLY these exact URLs, never invent, never modify params."
- Real-readable-text mandate for mockups; INR prices in card content.

### fatline today
- **The LLM's `imageKeyword` is computed and then never used** — no image search at all.
- Unsplash bank covers only 10 categories (2-4 IDs each); 9 detectable industries fall to a generic 12-set;
  cards 3-8 are **random Picsum** (topically unrelated). Avatars are letter-chips, not faces.
- → Same hero photo on every "food" app ever generated.

### To implement
1. **Actually use `imageKeyword`** — wire a keyword image search (Unsplash API, or an internal R2/stock
   index) so imagery is tailored to the specific brand, not just the category.
2. Adopt **category-aware prompt templates** if/when adding generative images (the V2.5 prompts are good
   templates), with deterministic seeds for reproducibility.
3. Deepen the per-category real-photo bank and replace Picsum fillers; use real face avatars.

---

## 5. Output structure — "up to the pro stage"

V2.5 has two tiers; "pro stage" = the **production manifest pipeline** (the paid build), which fatline-studio
already reaches via `api.produsa.app`. The engine only produces the **instant tier**, so the goal is to make
the engine's instant output match V2.5's instant *structure quality*, which is what feeds a great pro build.

### V2.5 instant structure rules
- **Category-specific page blueprints** (`InstaUX.md:123`): apparel→home(lookbook)/shop/pdp(variant
  picker)/cart/lookbook/size-guide; food→home/menu/dish-detail/order/story; marketplace→browse/detail/
  dashboard/submit; CRM→dashboard/pipeline/contacts/deals/reports; **two-sided marketplace** → 4 public +
  5 admin pages. "Generic home/dashboard/settings is the #1 reason prototypes feel templated."
- **Navigation model derived from page IDs** (`InstaUX.md:29`): browse/catalog→top navbar; dashboard/
  admin→left sidebar; mobile→bottom tab bar; nav button text = page IDs (no invented marketing labels).
- **Feature-dump anti-pattern — Rule #85** (`InstaUX.md:159`): **max 3 feature cards per section**; if ≥5,
  split into TWO sections (top-3 hero cards + remainder as 2-col checklist), each with its own h2.
- **Visual depth mandate per section** (`InstaUX.md:156`): kpi_cards need icon+sparkline+WoW delta;
  data_table ≥5 columns (avatar/name/status pill/value/action), never 2; hero needs eyebrow+headline+
  subhead+2 CTAs+social-proof row+image; pricing middle tier "most popular".
- **Section library** (14 typed sections) + **HARD CONTRACT prompting** (Rule #76): expand each contract
  section-by-section so "the LLM cannot improvise" — exactly N `<section>` blocks, no merge/skip/reorder.
- **Min sizes**: each page ≥400 lines; shell ≥600 lines; landing ≥15KB; truncation guards.
- Quality bar stated as **"Envato ThemeForest standard"**; pro tier targets "$10,000 Webflow-quality".

### fatline today
- **Fixed 5-page set per app type**, never idea-driven (a paan store and a B2B SaaS both get 5 pages).
- Sections are free-text prose strings; no component-level contract; pages generated in parallel with no
  view of each other → component consistency is hope, not guarantee.
- No feature-dump rule, no per-section depth mandate, no typed section library, no charts/forms/tabs as
  styled components.

### To implement
1. Add **category-specific page blueprints** (idea/industry → page set), incl. two-sided marketplace logic.
2. Add the **feature-dump rule (max 3/section)** and the **per-section visual-depth mandate** to the page prompt.
3. Move from prose sections to a **typed section contract** (port InstaUX's 14-section library) and use
   HARD CONTRACT expansion so structure is deterministic.
4. Add the **nav-model-from-page-IDs** rule.

---

## 6. Quality measurement — the prerequisite (do this FIRST)

**You currently cannot measure 7→10.** `audit.mjs` is purely structural counting (chars, image count,
section count, font count, color count, buttons). It runs **no vision model** on the screenshots it
captures, judges no aesthetics, no copy quality, no layout balance. Its **maximum score is 9.0** — a
perfect 10 is mathematically unreachable, and "real images" is satisfied by random Picsum.

V2.5 by contrast uses **InstaSentinel** (100 pts: deterministic structure/size/nav + **LLM-judgment**
content-quality & design) with fail-closed gates (pass ≥65, hard-fail <50, post-retry floor 35), plus a
production **grounding verifier** that forces the designer to cite Envato references in a report.

### To implement (gate for everything else)
1. **Add a vision-based grader**: feed `audit.mjs`'s screenshots to a vision LLM scoring copy quality,
   visual taste, hierarchy, layout coherence, brand fit — on a rubric where 10 is reachable.
2. Recalibrate the rubric ceiling and the loop gate against it.
3. Without this, every improvement below is unfalsifiable.

---

## Prioritized roadmap

| # | Lever | Effort | Impact on 7→10 | Why |
|---|---|---|---|---|
| **P0** | Vision-based grader in `audit.mjs` | M | Enables measurement | Can't see 7→10 today |
| **P0** | Copy enforcement: banned list + Rule #89 + microCopyBank + force-inject | M | High | Generic copy is the most visible 7-tell |
| **P0** | Inspiration library + `selectInspiration` + `buildInspirationBlock` + revive layout archetypes | L | Highest (design) | Kills "every app looks the same" |
| **P1** | DEPTH MANDATE token system + light theme + diversity guard | M | High | Visual richness/variety |
| **P1** | Use `imageKeyword` for real image search; deepen bank | M | Med-High | Tailored imagery |
| **P1** | Category page blueprints + feature-dump rule + per-section depth mandate | M | High | Structure/IA quality |
| **P2** | Typed section contracts (InstaUX 14-section library) + HARD CONTRACT prompting | L | Med | Determinism/consistency |
| **P2** | Personality budget, en-IN voice, Envato font catalog subset | S | Med | Polish |
| **P2** | Multi-breakpoint prompt caching; bump to Opus 4.7 era models | S | Cost/quality | Engine pinned to 4-6 models |

**Sequence:** P0 grader → P0 copy + inspiration (in parallel) → P1 tokens/imagery/structure → P2 polish.
Each P-item is independently shippable and measurable once the grader exists.

---

## Caveats
- V2.5 source is `produsa-v2-gauth` @ `91c5e58` (~4 days old, unmerged OAuth branch). Rules are mature
  and stable; if porting code, fresh-clone `BoitToken/Produsa-ai` to confirm latest.
- The 31-font Envato catalog and R2 `envato-extracted` assets are **licensed for Boit/Produsa products only** —
  reuse is fine within the org, don't redistribute.
- V2.5 has **no prompt caching** either — fatline's single-breakpoint cache is actually ahead there; just extend it.
</content>
