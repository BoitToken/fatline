# Part B — Brand Compile & Grounded Redesign (Spec for approval)

**Goal (Fatman, 2026-05-26):** When a user asks to rebuild a website for an existing brand
(e.g. **Aluplex**, project 528), the system must first **compile that brand's real identity in
one place — logo + colours + content** — and then drive the new design **from that compiled
material**, instead of generating a generic site that ignores the brand.

**Status:** awaiting CEO approval. Frontend lives in `BoitToken/fatline` (`fatline-studio`).
Backend lives in `BoitToken/Produsa-ai` = **live production on ECS (ap-south-1)** → any backend
change is a separate, higher-stakes deploy and will NOT be pushed without explicit sign-off.

---

## 1. Why 528 came out weak (root cause)

V2.5 already has the machinery — it just isn't fed or surfaced:

| Piece | Where | State |
|---|---|---|
| `runBrandScout(businessDna)` — Stage 0.5 | `backend/src/services/brandScout.js`, called `instantPrototypeGenerator.js:2956` | **Finds the site by web-searching the business name.** No way to pass the exact URL. If search misses or `business_name` wasn't extracted → `found:false` → no grounding. |
| `brand_truth` → prompt injection | `buildImmutableTruth()` `instantPrototypeGenerator.js:285`, injected `:3073` | Works, but **only when `found`**, and the data is shallow: `tagline` (og:description), one `hero_copy` line, `primary_colors`, `product_categories`, `about` (≤200 chars), `logo_url`, a few `product_image_urls`. |
| Logo upload | `backend/src/routes/projects-logo.js` (`POST /api/projects/:id/upload-logo` → `metadata.logo_url`) | Exists, **not surfaced in fatline-studio**. |
| `brandLocked` flag | `instantPrototypeGenerator.js:1663` (`research.brandUrl \|\| research.scrapedBrand`) | Latent — **nothing currently sets `research.brandUrl`.** |

**Net:** the studio never lets the user say "rebuild *this* URL", BrandScout guesses, the compiled
kit is never shown for confirmation, and the extracted content is too thin to carry a redesign.

---

## 2. What to build

### 2A. Frontend — `fatline-studio` (no production-backend risk)

1. **Brand-intake step** in onboarding/discovery (Dashboard pre-build or first chat turn):
   - "Rebuilding an existing brand/website?" → **URL field** + **logo upload** (uses the existing
     `/upload-logo` route) + optional **paste-content** box.
   - Persist URL to `metadata.brand_url` via the create/discovery payload.
2. **Brand tab/panel** (new 5th tab in `BuildPanel.jsx`, or a card in the preview rail) that renders
   the compiled kit from `metadata.brand_truth` + uploaded `logo_url`:
   - logo preview, colour swatches, tagline, hero copy, product/section list, about, source URL.
   - "Looks right / fix this" affordance so the user confirms grounding **before** the redesign.
3. Reuse existing API client patterns in `src/lib/api.js` (`uploadLogo`, `getProject` already give
   `metadata`). Add `uploadLogo()` + a `brand_truth` read helper.

**Acceptance (2A):** a user can supply a URL + logo, see the compiled brand kit in the studio, and
that data is stored on the project — all without any backend change beyond endpoints that exist.

### 2B. Backend — `Produsa-ai` (PRODUCTION — requires explicit approval to deploy)

1. **Accept an explicit brand URL.** Read `metadata.brand_url` (or `build/instant` body `brandUrl`)
   in the instant route (`orchestrator.js`, `POST /:id/build/instant`) and pass it into the pipeline.
   When present, **scrape that URL directly** (skip web-search guessing) and set
   `research.brandUrl` / `research.scrapedBrand` → flips `brandLocked` true.
2. **Deepen the compile** in `brandScout.js extractBrandSignals()`:
   - crawl homepage **+ a couple of obvious internal pages** (`/about`, `/services`, `/products`);
   - extract nav items, services/offerings, full about, section headings, testimonials, contact —
     store a richer `brand_truth` (additive fields; keep existing keys).
3. **Merge uploaded logo** into `brand_truth.logo_url` so the generated shell uses the real logo.
4. **Make grounding mandatory when locked**: when `brandLocked`, treat `brand_truth` copy/colours/
   sections as authoritative in `buildImmutableTruth()` (it already injects; tighten "MUST use").
5. **Expose** `brand_truth` on the project read (already in `metadata`) for the frontend panel.

**Acceptance (2B):** for project 528 (Aluplex) with the real URL supplied, `brand_truth.found=true`,
the kit contains the real logo + colours + multi-section content, and the regenerated site visibly
uses the brand's own logo, palette, and copy.

---

## 3. Sequencing & risk

- **Phase B1 (frontend, low risk):** ship 2A in `fatline-studio` (same safe path as Part A).
- **Phase B2 (backend, gated):** 2B in `Produsa-ai` behind the existing `ENABLE_BRAND_SCOUT` flag +
  a new `brand_url`-direct path; additive, fail-open (falls back to today's search behaviour). PR →
  review → approved deploy to ECS. No schema migration required (`brand_truth` is JSON in metadata).
- **Risk:** backend is production V2.5 serving produsa.app; deploy only on explicit approval, behind
  flags, with the search-based fallback intact.

---

## 4. Open question for Fatman
Do you want the brand-intake as a **dedicated pre-build step** (cleaner, slightly more friction) or
inferred **automatically from the idea text** (zero friction, but can't supply a logo)? Recommend the
dedicated step for rebuilds, auto-inference for greenfield ideas.
