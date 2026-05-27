# Build Plan — Items 4, 5, 6 + Launch QA Module
**Date:** 2026-05-28 03:00 IST
**Author:** Ahsbot (audit + plan)
**Status:** Items 1-3 shipped + live on https://produsa.dev (bundle `index-D4Kk7NB-.js`). Items 4-6 + QA module specced below for CEO's Claude Max XLI to execute.

---

## 🗺️ Audit Summary

The pre-launch produsa.dev frontend lives in `BoitToken/fatline` — single Vite/React app under `fatline-studio/`. Deploys are **manual via wrangler** to CF Pages project `fatline` (no GitHub Actions, no auto-deploy).

### Repo map

| What | Repo | Branch | Path |
|---|---|---|---|
| Frontend (produsa.dev staging) | `BoitToken/fatline` | `main` | `fatline-studio/` |
| Backend API (`api.produsa.app` and `api.produsa.dev`) | `BoitToken/Produsa-ai` | `master` | `backend/` |
| WA bot | `BoitToken/app-factory` | `main` | `produsa-whatsapp/` |
| Production frontend (produsa.app) | `BoitToken/fatline` | `main` | `fatline-studio/` (same as staging — CF Pages projects `produsa-prod` + `fatline` both deploy from this code; produsa.app is the prod alias) |

### Already-shipped infrastructure to USE (don't rebuild)

- **`onEvents()`** in `fatline-studio/src/lib/socket.js` — wired to all `build:*` / `project:*` events. `StudioShell.jsx:133-153` already subscribes to 14 of them.
- **`pushEvent(label, detail)`** in StudioShell — pushes onto a local `events[]` array, already passed to `BuildPanel`.
- **Backend socket emits** in `backend/src/services/instantPrototypeGenerator.js`:
  - `build:instant_started`
  - `build:instant_step` `{ step, message, pct }` (15+ steps)
  - `build:instant_ready`
  - `build:instant_failed`
  - `project:build_log` `{ agentName, text, type }` (rich stream)
  - `project:task_updated` `{ agent, status, phase }`
  - `project:phase_complete` `{ phase }`
- **`INSTANT_STAGES` + `stageKeyForStep()`** in `BuildPanel.jsx` — already collapses 15 raw step keys into 7 human-readable stages with statuses pending/active/done.
- **Backend rich-card discovery payload** `plan: [{ id, question, helper, options }] + currentPlanId` — already returned from `POST /api/projects/:id/discovery/chat`. Studio frontend now consumes it (Item 3 shipped).

---

## Item 4 — Framer-style agent pills (colored borders synced to live status)

### What CEO wants
The Agents tab inside Studio currently shows static "PENDING" pills (screenshot). The old V2 Studio had **glowing/pulsing colored borders** that synced to live state — purple/amber while working, green when done, red on failure. Bring that back.

### Repo + files to change
- **Repo:** `BoitToken/fatline`
- **Files:**
  - `fatline-studio/src/panels/BuildPanel.jsx` (agents tab markup — lines 110-141)
  - `fatline-studio/src/styles.css` (new agent-row state styles)
  - `fatline-studio/package.json` (add `framer-motion@^11` dep — currently uses none)

### Spec
Each agent-row gets a state class `agent-row--pending | --active | --done | --failed`:

| State | Border | Effect |
|---|---|---|
| pending | `1px dashed var(--border)`, opacity 0.55 | none |
| active | `1.5px solid var(--brand)`, glow `0 0 18px rgba(124,58,237,.5)` | Framer Motion `animate={{ boxShadow: [...] }}` infinite pulse, ~1.6s cycle |
| done | `1.5px solid var(--mint)`, fade-in scale animation 0.95 → 1 over 220ms | once |
| failed | `1.5px solid var(--danger)`, shake animation on mount | once |

The badge pill color already varies by state — keep that, add the border + motion.

Active stage's row also gets a small Framer Motion `<motion.span>` "spinner dot" (animated circle stroke) in the icon slot instead of the static `zap` icon.

### Acceptance criteria
- All 4 states visible by triggering a real build — pending stages stay dashed grey, current stage pulses purple, completed stages flash green once, any failed stage shows red with shake.
- No CSS keyframes — motion via Framer's `<motion.div>` so it's tree-shakeable.
- Reduced-motion: respect `@media (prefers-reduced-motion: reduce)` — fall back to instant color change without pulsing.

---

## Item 5 — Live Activity panel showing build progress in detail

### What CEO wants
Activity tab is currently mostly empty ("Starting the build…"). Need it to feel **alive** — show every meaningful step as it happens (e.g. "Researching brand identity", "Writing hero copy", "Generating 4 page layouts", "Running visual audit"), with timestamps + maybe small per-step durations.

### Repo + files to change
- **Repo:** `BoitToken/fatline`
- **Files:**
  - `fatline-studio/src/views/StudioShell.jsx` (lines 133-160 — expand which events get `pushEvent()`)
  - `fatline-studio/src/panels/BuildPanel.jsx` (Activity tab — lines 87-109; richer per-item rendering)
  - `fatline-studio/src/styles.css` (new `.activity-item--{type}` styles, agent-color badges)

### Spec
1. **Subscribe to richer events** in StudioShell:
   - `build:instant_step` already wired but only writes `pushEvent('Build', e.message)`. Replace with: `pushEvent({ kind: 'step', stage: stageKeyForStep(e.step), agent: humanizeAgent(e.step), label: e.message || e.step, ts: Date.now(), pct: e.pct })`.
   - `project:build_log` — already wired; enrich `{ kind: 'log', agentName, text, type, ts }`.
   - `project:task_updated` — enrich `{ kind: 'task', agent, status, phase, ts }`.
   - `build:probot_step` — new event from backend; if present, render with rocket icon + agent name.
2. **Activity rendering** — each item gets:
   - A small colored dot (matches stage color from INSTANT_STAGES)
   - Agent / step name in bold
   - Detail text in muted
   - Time-ago (e.g. "2s ago", auto-updating via `useEffect` 1s interval)
   - Subtle slide-in on mount via `<AnimatePresence>` + `<motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}>`
3. **Cap at last 50 items** — older items fade out at top. Auto-scroll to bottom on new event (only if user hasn't manually scrolled up — track with a ref).
4. **Group by stage** — events from the same stage get a collapsible header ("Research & brand · 12 events · 18s"). Default expanded.

### Acceptance criteria
- Trigger a real build — Activity tab streams 30+ events live with smooth animations
- Pause/resume scroll-on-new behavior when user scrolls up manually
- No layout jank when many events fire in rapid succession (use `requestAnimationFrame` batching if needed)
- Mobile: timeline still readable at 320px width

---

## Item 6 — Lovable-style mid-build prompt cards

### What CEO wants
While agents are building, prompt cards appear **above the chat composer** that the user can click to steer the in-flight build (e.g. "Make hero bolder", "Add testimonials section", "Switch to dark theme"). Reference: Lovable's UX.

### Repo + files to change
- **Repo:** `BoitToken/fatline` (frontend) + `BoitToken/Produsa-ai` (backend)
- **Backend files:**
  - `backend/src/routes/orchestrator.js` — new route `GET /api/projects/:id/build/suggestions` returning `{ suggestions: [{ id, label, hint, applyMessage }] }`
  - `backend/src/services/suggestionsGenerator.js` (NEW) — Haiku-powered, generates 3-4 contextual suggestions from current project state (stage, brief, completed pages, theme)
- **Frontend files:**
  - `fatline-studio/src/lib/api.js` — `getBuildSuggestions(projectId)`
  - `fatline-studio/src/panels/ChatPanel.jsx` — new `<BuildSuggestions>` strip above composer
  - `fatline-studio/src/views/StudioShell.jsx` — fetch suggestions every time `stageKey` changes during a build; pipe into ChatPanel

### Spec
1. **Backend suggestions endpoint** (`backend/src/routes/orchestrator.js`):
   - `GET /api/projects/:id/build/suggestions?stage=<stage>` (auth required)
   - Returns `{ suggestions: [{ id, label, hint, applyMessage }] }`
   - `label` is the chip text (≤32 chars), `hint` is tooltip, `applyMessage` is the full chat message that gets sent when chip clicked
   - Cache per (projectId, stage) for 60s to avoid Haiku spam during a rapid build
2. **Haiku prompt** (`suggestionsGenerator.js`):
   ```
   You are Produsa's mid-build suggestion engine. The user is watching their prototype build live. Generate 3-4 short, actionable prompt cards they can click to steer the build mid-flight.
   Inputs: brief, current stage, completed pages so far, theme tokens.
   Output JSON: [{ id, label, hint, applyMessage }]
   Rules: label ≤32 chars, applyMessage 30-90 chars, contextual to current stage (e.g. during "building pages" suggest "Make hero bolder", during "audit" suggest "Add testimonials section").
   ```
3. **Frontend prompt strip** (above composer, only visible when `building === true`):
   ```jsx
   <div className="build-suggestions">
     {suggestions.map(s => (
       <button key={s.id} className="suggestion-card" onClick={() => onSend(s.applyMessage)} title={s.hint}>
         {s.label}
       </button>
     ))}
   </div>
   ```
4. **Application path** — when clicked, the `applyMessage` goes through the existing `onSend(text)` which routes through `sendChat()` → orchestrator picks it up and queues as a mid-build edit (orchestrator already handles in-flight chat edits via mutex).
5. **Auto-refresh** — refetch suggestions whenever `stageKey` changes (so cards stay relevant to the current build phase).

### Acceptance criteria
- During an active build, 3-4 prompt cards visible above chat composer
- Cards change as build progresses through stages
- Clicking a card sends the message + clears the card from the strip (replaced after next refresh)
- Hover tooltip shows the full `hint`
- Cards hidden when no build in progress
- Suggestions endpoint cache-hit rate >80% per build (verified by adding a counter log)

---

## Bug-Testing Module (Launch QA Gauntlet)

Goal: **anyone with eyes can catch the obvious bugs before they ship**. 4-layer gate that runs on every push.

### Repo + scope

- **Repo:** `BoitToken/Produsa-ai` (backend) + `BoitToken/fatline` (frontend)
- **New top-level dirs:**
  - `Produsa-ai/qa/` — backend smoke + contract tests
  - `fatline/qa/` — frontend Playwright + visual regression + Lighthouse
- **Workflow files:**
  - `Produsa-ai/.github/workflows/qa-gauntlet.yml` (runs on every push to master + every PR)
  - `fatline/.github/workflows/qa-gauntlet.yml` (runs on every push to main + every PR)
- **CEO Telegram alert on red:** existing webhook to chat 1656605843

### Layer 1 — Backend smoke (Vitest, ~30s)
Tests live API contracts:
- `POST /api/auth/register` — 200 + `user_credits` row + `credit_transactions` free_grant row created
- `POST /api/beta/join` (twice with same email) — first 200 + grant, second 409 + NO double-grant
- `POST /api/orchestrator/message` (fresh phone) — 200 + user created with welcome tokens
- `GET /api/projects/:id/preview` (with seeded project) — HTML 200, not blank
- `POST /api/projects` with `io=null` simulated — schedules build tasks, doesn't crash *(this would have caught today's io.to bug)*

### Layer 2 — Frontend E2E (Playwright, ~3min)
- Login flow (email+pw, OAuth)
- Dashboard renders, no console errors
- Onboarding chat with mock backend — sends question, renders options, clicks one, submits
- Studio loads — preview iframe, agent panel populates, chat works
- Critical pages: `/`, `/login`, `/dashboard`, `/studio/:id`, `/pricing`, `/billing`

### Layer 3 — Visual regression (Playwright + pixelmatch, ~2min)
- 5 critical pages × 2 viewports (1280×720 desktop, 375×667 mobile iPhone SE)
- Compare against `qa/golden-images/` baselines
- Fail if >2% pixel diff (excludes timestamps + token counts via masks)

### Layer 4 — Lighthouse CI (~1min)
- Score floor: Performance ≥85, A11y ≥95, Best Practices ≥90, SEO ≥90
- Hard-fail thresholds: CLS <0.1, LCP <2.5s, JS errors=0

### What blocks merging
- Backend smoke fails → merge blocked
- Frontend E2E fails → merge blocked
- Visual regression OR Lighthouse fails → PR comment only, doesn't block (since they need golden-image bootstrap)

---

# 📦 Agent Briefs (copy-paste into Claude Max XLI / Claude Code)

## 🔧 Brief #1 — Item 4 (Framer Agent Pills) + Item 5 (Live Activity)

```
You are a focused dev agent working on the Produsa staging frontend.

REPO: BoitToken/fatline (clone https://github.com/BoitToken/fatline.git)
BRANCH: cut a new branch `feat/agents-live-framer-2026-05-28` off origin/main
WORKDIR: fatline-studio/

GOAL: Ship two CEO-prioritized launch features on produsa.dev (staging frontend deployed manually via wrangler to CF Pages project `fatline`).

ITEM 4 — FRAMER AGENT PILLS:
Add Framer Motion to fatline-studio/package.json (`framer-motion@^11`).
Edit src/panels/BuildPanel.jsx (agents tab, lines 110-141): wrap each agent row in <motion.div> with state-specific animations:
  - pending: dashed grey border, opacity 0.55, no animation
  - active: 1.5px solid var(--brand), animate boxShadow ['0 0 0px rgba(124,58,237,0)', '0 0 18px rgba(124,58,237,0.55)', '0 0 0px rgba(124,58,237,0)'] infinite 1.6s
  - done: 1.5px solid var(--mint), scale 0.95→1 fade-in once (220ms)
  - failed: 1.5px solid var(--danger), x-shake [0,-4,4,-3,3,0] over 300ms once
Active row replaces the static `zap` icon with a small <motion.span> spinning circle (rotate 0→360 infinite 1.5s linear).
Respect prefers-reduced-motion via useReducedMotion() — fall back to instant color change.
Add agent-row state styles to src/styles.css (.agent-row--pending / --active / --done / --failed).

ITEM 5 — LIVE ACTIVITY:
Edit src/views/StudioShell.jsx (lines 133-160) — replace bare pushEvent() calls with structured event objects: `pushEvent({ kind, stage, agent, label, detail, ts, pct })`. Add a humanizeAgent(stepKey) helper that maps raw pipeline keys to human names ("research_brand" → "Brand researcher", "ux_palette" → "Designing palette", etc).
Edit src/panels/BuildPanel.jsx (Activity tab, lines 87-109):
  - Render each event with: small colored dot (color from INSTANT_STAGES stage), agent in bold, detail muted, "Xs ago" time (auto-updating via 1s setInterval).
  - Wrap event items in <AnimatePresence> + <motion.div initial={{opacity:0, y:-4}} animate={{opacity:1, y:0}} exit={{opacity:0}}>.
  - Cap at last 50 events. Auto-scroll to bottom on new event UNLESS user has scrolled up (track with a ref + onScroll listener).
  - Group consecutive same-stage events under collapsible <details> stage header showing "Research & brand · 12 events · 18s elapsed".
Mobile: ensure timeline readable at 320px width.

VERIFICATION:
  1. cd fatline-studio && npm install && npm run build (must pass)
  2. npm run dev → open localhost in incognito → trigger a real build via dashboard → verify 4 agent states show with animations during build → verify Activity streams 30+ events with smooth slide-ins
  3. Lighthouse on /studio/N must still score >85 perf (animations should be GPU-only)

DELIVERABLE: Push branch `feat/agents-live-framer-2026-05-28` to origin. Open a PR titled "feat(studio): framer agent pills + live activity stream (Items 4+5)". Include before/after screenshots of agents tab + activity tab in the PR body. Do NOT deploy — CEO + Ahsbot will review + merge + deploy.

CONSTRAINTS:
- node --check every modified .js/.jsx before commit (Rule #92)
- Single commit, atomic. Commit message describes both items clearly.
- Don't touch backend, don't touch other panels, don't refactor unrelated code.
- Don't add new deps beyond framer-motion@^11.
- Read /data/.openclaw/workspace/projects/fatline/BUILD-PLAN-2026-05-28.md for full spec context.
```

## 🔧 Brief #2 — Item 6 (Lovable-style mid-build prompt cards)

```
You are a focused full-stack agent working on Produsa.

REPOS:
  Backend: BoitToken/Produsa-ai (clone https://github.com/BoitToken/Produsa-ai.git)
    BRANCH: cut `feat/mid-build-suggestions-backend-2026-05-28` off origin/master
    WORKDIR: backend/
  Frontend: BoitToken/fatline (clone https://github.com/BoitToken/fatline.git)
    BRANCH: cut `feat/mid-build-suggestions-frontend-2026-05-28` off origin/main
    WORKDIR: fatline-studio/

GOAL: Add Lovable-style mid-build prompt cards above the studio chat composer. While agents are building, 3-4 contextual suggestion chips appear that the user can click to steer the in-flight build.

BACKEND CHANGES (Produsa-ai):
1. NEW FILE: backend/src/services/suggestionsGenerator.js
   - Export async function generateBuildSuggestions({ projectId, stage, brief, completedPages, theme }) returning [{ id, label, hint, applyMessage }] (3-4 items).
   - Use Anthropic Haiku via existing src/services/llmAdapter.js patterns. Force JSON response. Max 800 tokens.
   - Prompt: "You are Produsa's mid-build suggestion engine. The user is watching their prototype build live. Generate 3-4 short, actionable prompt cards they can click to steer the build mid-flight. Inputs: brief, current stage, completed pages, theme tokens. Output JSON array of {id, label (≤32 chars), hint (tooltip, ≤80 chars), applyMessage (full chat message, 30-90 chars)}. Be contextual to stage."
   - Cache results in-memory by (projectId, stage) for 60s.
2. EDIT: backend/src/routes/orchestrator.js
   - Add `router.get('/:id/build/suggestions', authenticateToken, async (req, res) => {...})` returning `{ suggestions: [...] }`.
   - Load project, classify current stage from project.stage + metadata.instant_build_state, call generateBuildSuggestions(), return JSON. On error return `{ suggestions: [] }` (fail-soft, never blocks UI).
3. TEST: backend/__tests__/services/suggestionsGenerator.test.js — unit test the generator with a mocked LLM, verify shape + cache behavior.

VERIFICATION BACKEND:
  curl -s -H "Authorization: Bearer $JWT" "https://api.produsa.dev/api/projects/541/build/suggestions" → must return `{ suggestions: [{...}] }` with 3-4 items.
  npm run --prefix backend test -- suggestionsGenerator (must pass).

FRONTEND CHANGES (fatline):
1. EDIT: src/lib/api.js — add `export async function getBuildSuggestions(projectId, stage) { return request(\`/api/projects/\${projectId}/build/suggestions?stage=\${encodeURIComponent(stage||'')}\`); }`.
2. EDIT: src/panels/ChatPanel.jsx — above the <form className="composer">, add:
   ```
   {Array.isArray(suggestions) && suggestions.length > 0 && (
     <div className="build-suggestions">
       <div className="bs-label">Steer the build</div>
       <div className="bs-row">
         {suggestions.map(s => (
           <button key={s.id} className="suggestion-card" onClick={() => onSend(s.applyMessage)} title={s.hint}>
             {s.label}
           </button>
         ))}
       </div>
     </div>
   )}
   ```
   ChatPanel must accept `suggestions` prop.
3. EDIT: src/views/StudioShell.jsx — add useState for `suggestions`, useEffect that fires `getBuildSuggestions(projectId, stageKey).then(r => setSuggestions(r?.suggestions || []))` whenever `stageKey` changes AND `building === true`. Pass `suggestions={suggestions}` to <ChatPanel/>.
4. EDIT: src/styles.css — add styles for `.build-suggestions`, `.bs-label`, `.bs-row`, `.suggestion-card`. Pill-style buttons, scrollable horizontally on overflow, brand-tinted border, hover lift.

VERIFICATION FRONTEND:
  cd fatline-studio && npm run build (must pass).
  npm run dev → trigger a real build → verify 3-4 cards appear above composer → click one → chat sends the applyMessage → verify cards refresh when stage changes.

DELIVERABLE:
  Push both branches. Open two PRs:
    1. Backend PR titled "feat(orchestrator): GET /api/projects/:id/build/suggestions for mid-build steer cards (Item 6 backend)"
    2. Frontend PR titled "feat(studio): mid-build prompt cards above chat composer (Item 6 frontend)"
  Each PR body must include the curl test result + screenshot of cards in action.
  Do NOT deploy — CEO + Ahsbot will review + merge + deploy.

CONSTRAINTS:
- Rule #55 S2 path traversal guard not relevant here (no file writes)
- Rule #55 S3: sanitize errors — never return raw LLM error to client
- Rule #55 Q1: suggestions endpoint fails OPEN to empty array (UI degrades gracefully); the underlying generator can fail closed (return [] not throw)
- node --check every .js before commit (Rule #92)
- Single commit per repo, atomic
- Cache TTL exactly 60s — do not over-engineer LRU eviction; in-memory Map with timestamp is fine
- Don't add new deps beyond what's already in package.json
- Read /data/.openclaw/workspace/projects/fatline/BUILD-PLAN-2026-05-28.md for full spec context
```

## 🔧 Brief #3 — Bug-Testing Module (Launch QA Gauntlet)

```
You are a focused QA-infrastructure agent for Produsa.

REPOS:
  Backend: BoitToken/Produsa-ai (clone https://github.com/BoitToken/Produsa-ai.git)
    BRANCH: cut `feat/qa-gauntlet-backend-2026-05-28` off origin/master
  Frontend: BoitToken/fatline (clone https://github.com/BoitToken/fatline.git)
    BRANCH: cut `feat/qa-gauntlet-frontend-2026-05-28` off origin/main

GOAL: Stand up a 4-layer launch-readiness gate that runs on every push + PR, blocks merging on critical failures, and alerts CEO via Telegram on red. CEO wants "anyone with eyes can spot the silly bugs before they ship".

LAYER 1 — BACKEND SMOKE (Vitest, runs in CI, ~30s):
  NEW DIR: Produsa-ai/qa/smoke/
  Test files:
    - auth-register.smoke.test.js — POST /api/auth/register with random email. Assert 200 + user_credits row exists + credit_transactions has 'free_grant' row with tier-1 amount (100).
    - beta-double-grant.smoke.test.js — POST /api/beta/join twice with same email. Assert first 200 + tx row, second 409 + still exactly 1 tx row.
    - orchestrator-signup.smoke.test.js — POST /api/orchestrator/message with x-internal-token + fresh phone. Assert 200, user created with wa+<digits>@produsa.app, welcome grant tx row exists.
    - preview-serves.smoke.test.js — Use a known seeded project ID (env var SMOKE_PROJECT_ID); GET /api/projects/:id/preview, assert 200 + HTML body length >200 chars.
    - io-null-resilient.smoke.test.js — Direct unit test: import _runOneTask from src/routes/orchestrator.js (or equivalent), call with io=null + a fake task, assert it doesn't throw "Cannot read properties of null (reading 'to')". This is the regression test for today's io.to bug.
  NEW FILE: Produsa-ai/qa/smoke/setup.js — sets process.env to staging (api.produsa.dev), pulls test JWT from process.env.QA_TEST_JWT.
  NEW FILE: Produsa-ai/.github/workflows/qa-gauntlet.yml:
    name: QA Gauntlet
    on: { push: { branches: [master] }, pull_request: { branches: [master] } }
    jobs:
      smoke:
        runs-on: ubuntu-latest
        steps: checkout, setup-node 20, npm ci --prefix backend, npm run --prefix backend test:smoke
        on-failure: post message to Telegram chat 1656605843 via curl using secrets.TG_BOT_TOKEN
  EDIT: Produsa-ai/backend/package.json — add scripts.test:smoke = "vitest run qa/smoke"

LAYER 2 — FRONTEND E2E (Playwright, runs in CI, ~3min):
  NEW DIR: fatline/qa/e2e/
  Test files:
    - login.e2e.spec.js — open /login, fill email+pw of QA_TEST_USER, click sign in, assert /dashboard reached, no console errors.
    - dashboard.e2e.spec.js — go to /dashboard, assert "What are we building today?" visible, type pills visible, "Soon" badge visible on Mobile App pill, NO "paan" text on page.
    - onboarding-chat.e2e.spec.js — type "a CRM for dental clinics", click Send, wait for first assistant bubble, assert ≥1 option card visible, click first option, assert second question renders.
    - studio.e2e.spec.js — go to /studio/N (test fixture), assert preview iframe loads, Agents tab loads, Chat panel renders.
  NEW FILE: fatline/playwright.config.js — single browser chromium, headless, baseURL=https://produsa.dev, retries=2.
  NEW FILE: fatline/.github/workflows/qa-gauntlet.yml — same trigger, same Telegram alert on fail.
  EDIT: fatline/package.json — add scripts.test:e2e = "playwright test", add @playwright/test devDep.

LAYER 3 — VISUAL REGRESSION (Playwright snapshot, ~2min):
  Same dir + workflow as Layer 2.
  NEW FILE: fatline/qa/visual/critical-pages.visual.spec.js — Visit /, /login, /dashboard, /studio/N, /pricing. For each: take screenshot at 1280×720 desktop + 375×667 mobile (iPhone SE). Compare to qa/visual/__snapshots__/ baselines. Fail if pixel diff >2% (mask timestamp + token-count regions).
  First-run mode: if baselines don't exist, generate them and commit them in the same PR (under `qa/visual/__snapshots__/`).

LAYER 4 — LIGHTHOUSE CI (~1min):
  NEW FILE: fatline/.lighthouserc.json with assertions:
    - performance ≥ 0.85
    - accessibility ≥ 0.95
    - best-practices ≥ 0.90
    - seo ≥ 0.90
    - CLS < 0.1
    - LCP < 2500ms
  EDIT: fatline/.github/workflows/qa-gauntlet.yml — add job using treosh/lighthouse-ci-action@v12 against produsa.dev/, /dashboard, /login.

POLICY:
  - Layer 1 (backend smoke) → BLOCKS merge on red
  - Layer 2 (frontend E2E) → BLOCKS merge on red
  - Layer 3 (visual regression) + Layer 4 (Lighthouse) → POST PR COMMENT ONLY, doesn't block (needs golden-image bootstrap)

CEO ALERT WEBHOOK:
  Add a reusable composite action `.github/actions/notify-telegram/action.yml` in both repos. On failure, curl to https://api.telegram.org/bot${{ secrets.TG_BOT_TOKEN }}/sendMessage with `chat_id=1656605843` and message including repo, branch, commit hash, failed test name, link to run.

DELIVERABLE:
  Push both branches.
  Open two PRs:
    1. "feat(qa): backend smoke gauntlet — 5 critical-path tests + GitHub Action + Telegram alerts"
    2. "feat(qa): frontend E2E + visual regression + Lighthouse gauntlet — 4-page coverage + Telegram alerts"
  PR bodies must include screenshots of a green run + a deliberately-red run showing Telegram alert fires.

  Do NOT deploy. CEO + Ahsbot will review + merge.
  Both PRs include a 30-line README at the top of qa/ explaining how to run locally + add new tests.

CONSTRAINTS:
  - node --check every .js before commit (Rule #92)
  - Don't run actual tests against production (api.produsa.app) — staging only (api.produsa.dev)
  - Smoke tests must clean up after themselves (delete created test users; mark them with email containing "qa-test-" prefix so a cleanup cron can sweep weekly)
  - No new top-level deps beyond vitest, @playwright/test, @lhci/cli
  - Each layer must produce its own .junit.xml output so GitHub's test reporting works
  - Read /data/.openclaw/workspace/projects/fatline/BUILD-PLAN-2026-05-28.md for full spec context

REQUIRED SECRETS (CEO must add to GitHub):
  - Produsa-ai repo: QA_TEST_JWT (long-lived JWT for the qa-test@produsa.dev user), SMOKE_PROJECT_ID (a known seeded project ID for preview test), TG_BOT_TOKEN (Ahsbot Telegram token, prefix 8646…)
  - fatline repo: QA_TEST_USER + QA_TEST_PASSWORD (for the same qa-test@produsa.dev user), TG_BOT_TOKEN (same)
  These exist already if not — Ahsbot will help fish them out.
```

---

## Order of operations (CEO's tmux flow)

1. **Brief #1 first** — Items 4 + 5 — biggest visual impact, no backend changes, no risk to backend health. ~2-3h for the agent. Land + deploy first.
2. **Brief #3 in parallel** — QA gauntlet — independent of #1, runs in parallel without conflicts. Catches future regressions. ~3-4h.
3. **Brief #2 last** — Item 6 mid-build cards — touches backend, deserves the QA gauntlet to be live first so it's regression-tested on PR.

Each brief returns a PR. Ahsbot reviews + merges + handles deploy (wrangler for frontend, GitHub Actions for backend).

## Quick reference — repo URLs

| Repo | Clone | Branch off |
|---|---|---|
| Frontend | `https://github.com/BoitToken/fatline.git` | `origin/main` |
| Backend | `https://github.com/BoitToken/Produsa-ai.git` | `origin/master` |
