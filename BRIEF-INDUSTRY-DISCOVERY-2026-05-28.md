# Brief #4 — Industry-aware DiscoveryScout + Multi-Select Question Cards
**Date filed:** 2026-05-28 03:10 IST
**Filed by:** Ahsbot
**Trigger:** CEO 2026-05-28 02:57 IST screenshot — onboarding asked a generic USP question with bland options ("I serve a hyper-specific niche", "I deliver a guaranteed outcome", etc). User wants industry-specific InstaScout-grounded questions + ability to multi-select answers.

---

## Goal (one paragraph)
Onboarding questions on `produsa.dev` and `produsa.app` must be **industry-specific**, generated from the project brief by running a fast vertical classifier (already exists: `classifyVertical()` in `backend/src/agents/instant/scouts/index.js`) and then having DiscoveryScout ask **vertical-specialized** questions instead of generic ones. Where appropriate, users must be able to **pick multiple options** (not just one) — the system stores a deterministic comma-separated answer string with multi-select intent preserved.

---

## Repos + branches

| Repo | URL | Branch | Working dir |
|---|---|---|---|
| Backend | `https://github.com/BoitToken/Produsa-ai.git` | cut `feat/industry-discovery-multi-select-2026-05-28` off `origin/master` | `backend/` |
| Frontend | `https://github.com/BoitToken/fatline.git` | cut `feat/multi-select-question-cards-2026-05-28` off `origin/main` | `fatline-studio/` |

---

## Backend changes (`BoitToken/Produsa-ai`)

### 1. `backend/src/agents/discovery/discoveryScout.js` — make it industry-aware

**Current shape:** `generateDiscoveryQuestions(brief, appType)` calls Sonnet with a generic prompt + `normalizeAppType(appType)`. Question prompt only uses the broad app type (webapp/crm/saas/ecommerce/mobile/landing/marketplace) — not the deep vertical.

**Required change:**
- Import `classifyVertical, SPECIALIST_THRESHOLD, VERTICALS, REGISTRY` from `../instant/scouts/index.js`.
- Before generating questions, run `classifyVertical(brief, callLLM)` (use the existing llmChat-backed `callLLM` shape — see `dispatchSpecialistScout` for the pattern).
- If `vertical_confidence >= 0.7` and `vertical !== 'none'`:
  - Load the specialist module from `REGISTRY[vertical]`
  - Read its `skillMd` (already exported by every specialist file in `backend/src/agents/instant/scouts/`)
  - Pull out the "Required Page Contracts", "Color Palette Tendencies", "Conversion Patterns", "Anti-Patterns" sections (each specialist has these — verify in `b2b-distributor.js`, `ecommerce-d2c.js`, `saas-tool.js`, `restaurant-hospitality.js`, `healthcare-clinic.js`, `professional-services.js`, `creator-portfolio.js`, `education-course.js`).
  - Inject this domain context into the DiscoveryScout system prompt as a "DOMAIN CONTEXT" block.
- Update the system prompt's question-generation rules:
  - For matched verticals, REPLACE the generic USP/audience/visual_direction questions with vertical-tailored ones drawn from the specialist context.
  - Examples per vertical (must be in the system prompt as `VERTICAL_QUESTION_GUIDES`):
    - **b2b-distributor**: which brands/manufacturers are stocked, MOQ tiers, RFQ vs add-to-cart, regions served, authorised-distributor proof to surface, technical-vs-procurement audience
    - **ecommerce-d2c**: product category, hero product type (apparel/beauty/supplements/home), price ladder, returns policy hook, fulfillment model
    - **saas-tool**: free trial vs freemium vs paid-only, integrations to feature, target user (SMB / enterprise / dev), primary CTA (sign-up / book demo / install)
    - **restaurant-hospitality**: cuisine/category (cloud-kitchen, dine-in, hybrid), online-order channels, reservation flow needed, gallery vs menu prominence
    - **healthcare-clinic**: practice type (dental / dermatology / GP / specialist), appointment booking method, insurance flag, trust signals (board certs, years, reviews)
    - **professional-services**: practice area (legal / accounting / consulting / agency), engagement model (project / retainer / hourly), gated-content vs CTA-first
    - **creator-portfolio**: medium (writer / designer / photographer / dev / multi-disciplinary), case-study count, contact-to-quote vs schedule-call
    - **education-course**: format (cohort-based / self-paced / 1-on-1), payment (one-time / subscription / installments), target learner level, social-proof type
- Output schema gains a new field per question:
  ```
  "multi_select": true   // optional, defaults false; when true, multiple options can be picked
  ```
- For `audience`, `key_features`, `integrations`, `target_brands`, `pages_needed`, `social_proof_type`, `payment_methods`, `regions_served` — these are NATURALLY multi-select. Force `multi_select: true` for any question id that matches the regex `/^(key_features|integrations|target_brands|pages_needed|social_proof_type|payment_methods|regions_served|cuisines|services_offered|case_studies|fulfillment|content_types)$/i` even if the LLM forgets it (post-process safeguard).
- Single-select stays for: `audience`, `usp`, `visual_direction`, `brand_name`, `pricing_model`, `monetization`, `core_workflow`.
- Update `sanitizeQuestionOptions()` to preserve the `multi_select` boolean on each question through the sanitization pass.
- Update `getDefaultQuestions()` fallback to also include `multi_select` flags where appropriate.

**Acceptance criteria (backend):**
- Run `node -e "import('./src/agents/discovery/discoveryScout.js').then(m=>m.generateDiscoveryQuestions('We are ABN Impex, a B2B rubber raw materials distributor for ExxonMobil Butyl Rubber range, serving tyre+automotive manufacturers in India','webapp').then(qs=>console.log(JSON.stringify(qs,null,2))))"` — output must include at least 2 questions referencing "brands", "MOQ" or "RFQ", "authorised-distributor", or "regions served". The bland generic "I serve a hyper-specific niche" option SHALL NOT appear.
- At least one question in the output must have `multi_select: true` (likely `target_brands`, `key_features`, or `pages_needed`).
- Add unit test `backend/__tests__/agents/discovery/industryQuestions.test.js` that mocks `classifyVertical` to return `{ vertical: 'b2b-distributor', vertical_confidence: 0.9 }` and asserts the question array contains vertical-tagged questions + `multi_select` markers.

### 2. `backend/src/agents/discovery/conversationalDiscovery.js`

- Where `generateDiscoveryQuestions(brief, classification.app_type)` is called (line ~395), this now goes through the industry-aware path automatically. No code change here — just verify behavior end-to-end.
- The plan question's `multi_select` field must flow through the response unchanged (already shapeless via spread).

### 3. `backend/src/routes/discovery.js`

- Where `POST /api/projects/:id/discovery/chat` parses an incoming `message`, allow the message body to be either a string OR an object `{ message: string, selected_options: string[] }`. If `selected_options` is present and non-empty, join them with `, ` and use that as the answer text (this is how multi-select submissions arrive from the frontend).
- The bind-step (`PLAN_ID_TO_KEY` mapping at line ~309) stores the joined string under the canonical answer key — no schema change needed.
- Path-validation guard: `selected_options` must be an array of strings with length 1-10, each ≤200 chars. Reject 400 if any item fails.

**Acceptance criteria (backend route):**
- `curl -X POST .../discovery/chat -d '{"selected_options":["Brand 1","Brand 2","Brand 3"]}'` results in answer stored as `"Brand 1, Brand 2, Brand 3"` in `discovery_answers`.
- Pure string `message` continues to work unchanged.

---

## Frontend changes (`BoitToken/fatline`)

### 1. `fatline-studio/src/lib/api.js`

- Change `discoveryChat` signature to optionally accept `selected_options`:
  ```js
  export async function discoveryChat(projectId, message, { skip = false, selected_options = null } = {}) {
    const body = skip ? { skip: true }
      : (selected_options ? { selected_options }
        : { message });
    return request(`/api/projects/${projectId}/discovery/chat`, { method: 'POST', body });
  }
  ```

### 2. `fatline-studio/src/views/Dashboard.jsx`

- The `applyDiscovery()` reducer extracts `helper` + `options` from `r.plan[currentPlanId]`. Add `multi_select: planQ.multi_select === true` to the message metadata.
- Render the question-card differently when `m.multi_select === true`:
  - Replace the click-to-submit behavior with a **checkbox-style multi-select**.
  - Each option toggles into a local `selected` Set on the message.
  - Below the option list, show a primary "Submit (N selected)" button that:
    - Calls `discoveryChat(projectId, '', { selected_options: [...selectedArray] })`
    - Then dispatches `applyDiscovery` on the response.
  - Disable Submit when nothing is selected.
- Single-select stays exactly as it is today (click an option, auto-submit).
- Use distinct visual style for multi-select option cards: a checkbox circle on the left instead of the numbered chip; selected cards get the brand-purple fill on the checkbox + a faint brand-tinted background.
- Helper line should also display "(pick all that apply)" when `multi_select` is true.

### 3. `fatline-studio/src/panels/ChatPanel.jsx` (the in-Studio right-panel chat)

- Mirror the same multi-select pattern. ChatPanel currently calls `onSend(opt)` directly on click; refactor so:
  - For single-select questions (default): keep current click-to-submit behavior.
  - For multi-select (`m.multi_select === true`): show checkbox-style cards + a Submit button. Submit calls `onSend(JSON.stringify({ kind: 'multi_select', options: [...selected] }))` — and the parent `onSend` in `StudioShell.jsx` recognizes the JSON shape and routes it through `discoveryChat(projectId, '', { selected_options })` instead of the bare-text path.
- This keeps ChatPanel a passive renderer (no API call) and StudioShell remains the I/O owner.

### 4. `fatline-studio/src/views/StudioShell.jsx`

- The `onSend(text)` callback at line ~217 currently sends bare text via `discoveryChat(projectId, text)`. Update so:
  - If `text` looks like `{"kind":"multi_select","options":[...]}` → parse + call `discoveryChat(projectId, '', { selected_options: options })`.
  - Otherwise unchanged.
- Pipe `multi_select` from `data.plan[currentPlanId]` into the message metadata exactly the same way `helper` and `options` already do (around line ~226).

### 5. `fatline-studio/src/styles.css`

- Add `.fl-option-card--multi` (and the matching `.q-option-card--multi` in the studio chat) with:
  - Checkbox-style indicator on the left (uses a square instead of the rounded number chip)
  - Selected state: indicator fills with `var(--brand)`, shows checkmark; card background tints with `rgba(124,58,237,0.06)`; border `var(--brand)`.
  - Selected-count badge on the Submit button (e.g. "Submit (3 selected)").
- Add `.fl-multi-submit` (and `.q-multi-submit`) primary button styles — full-width, padded, disabled state with `opacity: 0.5`.
- Mobile: maintain touch-target sizing (≥44px tap height).

### 6. Accessibility

- Multi-select option cards must be rendered as proper checkbox-role buttons: `role="checkbox" aria-checked={selected} aria-label={opt}`.
- Submit button: `aria-label="Submit N selected answers"`.
- Keyboard: option cards toggle on `Space`, Submit on `Enter`.

**Acceptance criteria (frontend):**
- Trigger an onboarding flow with a multi-select question (e.g. brief "B2B distributor for industrial fans, need brands page and quote-request form") → question must render with checkbox indicators + Submit button → tap 3 options → Submit → next question appears + answer is stored as `"Opt1, Opt2, Opt3"` (verify in network response).
- Single-select questions still work exactly as before (one click submits).
- `npm run build` passes.
- Mobile viewport at 375px: multi-select cards still 44px+ tall, Submit button full-width, checkbox indicators visible.

---

## Verification commands (CEO to paste into terminal after agent finishes)

```bash
# 1. Backend industry classifier smoke
cd backend && node -e "import('./src/agents/discovery/discoveryScout.js').then(m=>m.generateDiscoveryQuestions('ABN Impex — B2B distributor of rubber raw materials and ExxonMobil Butyl Rubber for tyre+automotive manufacturers in India','webapp').then(qs=>console.log(JSON.stringify(qs,null,2))))"
# Expect: questions mentioning brands, MOQ, RFQ, authorised-distributor, regions. At least one multi_select:true.

# 2. Multi-select route smoke
curl -X POST https://api.produsa.dev/api/projects/541/discovery/chat \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"selected_options":["Tyre manufacturers","Automotive OEMs","Industrial belts"]}' \
  | jq .

# 3. Frontend smoke
cd fatline-studio && npm run build && npm run dev
# Open localhost → onboarding chat → trigger a B2B brief → confirm checkbox-style multi-select renders with Submit button → submit 3 options → answer flows correctly.
```

---

## Deliverable

- Backend PR titled: `feat(discovery): industry-aware InstaScout-grounded questions + multi-select support`
- Frontend PR titled: `feat(studio): multi-select question cards with checkbox UI + Submit button`
- Both PR bodies must include:
  - Before/after JSON output of `generateDiscoveryQuestions()` for the same input ("ABN Impex" brief).
  - Screenshots of a multi-select question rendering on desktop + mobile.
  - Confirmation of the curl test result for the new API shape.
- Do NOT deploy. Ahsbot + CEO will review + merge + deploy.

---

## Constraints

- Rule #55 S3: sanitize errors — never return raw LLM error to client.
- Rule #55 Q1: industry classifier fails OPEN to `vertical='none'` (falls back to generic DiscoveryScout) — never blocks the flow.
- Rule #92: `node --check` every modified `.js`/`.jsx` before commit.
- Single commit per repo, atomic.
- Don't add new deps.
- Don't touch other panels, don't refactor unrelated code.
- LLM cost guard: `classifyVertical` runs once per discovery start; cache the result under `metadata.classification.vertical` so repeated discovery turns don't re-classify.
- Read `BUILD-PLAN-2026-05-28.md` (sibling file in `BoitToken/fatline`) for full project context.

---

## Optional polish (defer if out of scope)

- Add a small "Why we're asking" expandable info icon next to each question that, when clicked, shows the question's `why_it_matters` text. Cheap UX win that explains the depth to the user.
- Add a small "industry: b2b-distributor (92%)" debug badge under the question card in dev mode (`?dev=1` URL param). Helps QA verify the classifier is firing.
