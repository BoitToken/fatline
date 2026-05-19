# Fatline FatPipeline v3 — Mandate-Heavy Agents, Validation Every Gate, Exhaustive Negative Fence

**Status:** Active mandate  
**Author:** ProdusaClaw  
**Date:** 2026-05-20  
**Version:** 3.0 — CEO Directive Edition

---

## Core Thesis

**Fatline is not an agent farm. It is a verification system for creative and product work.**

Most AI builders optimize generation. Fatline optimizes what **survives verification**.

**Generated until proven.**

### Why v3?

| Problem | v3 Solution |
|---|---|
| Context loss during handoffs | **Fatter agents** — fewer handoffs, richer mandates |
| Agents operating blind | **Validation loop after EVERY agent** — no handoff without proof |
| Vague negative constraints | **Exhaustive negative fence** — 200+ anti-patterns per build type |
| Weak initial discovery | **Deep research + architecture + exhaustive features** before any code |
| No verification of intent | **Intent-to-output diff check** — did the agent deliver what was mandated? |

---

## Strategic Architecture: 4 Core + 1 Conditional

**Not 6 agents. Not 35 agents. 4 core + 1 conditional repair.**

Every agent carries **massive mandate** — they do more, remember more, and verify their own work before submission.

| Agent | Mandate | Validation Gate |
|---|---|---|
| **FatScout** | Build type → Deep research → Architecture → Exhaustive features → Negative fence | FatJudge approves architecture packet |
| **FatProto** | Build prototype + self-verify against architecture packet | FatJudge 4-channel check |
| **FatJudge** | Independent verification after EVERY stage. Never builds. Only judges. | Human escalation if ambiguous |
| **FatForge** | Turn approved prototype into deployable product + self-verify | FatJudge 4-channel check |
| **FatDeploy** (conditional) | Surgical fixes only. Never redesign. Max 2 cycles proto, 3 production. | Re-submit to FatJudge |

---

## Phase A — Deep Discovery & Architecture (FatScout)

### Step 1: Build Type Identification

Before ANY question is asked, classify the build:

```
Input: one-line idea or brief
Output: build_type classification
```

**Build types:**
- `saas` — multi-tenant software with auth, billing, teams
- `marketplace` — two-sided platform with listings, transactions, reviews
- `ecommerce` — product catalog, cart, checkout, inventory
- `content` — blog, media, publishing, editorial
- `tool` — utility, calculator, converter, generator
- `community` — forums, social, messaging, groups
- `landing` — single-purpose conversion page
- `portfolio` — showcase, gallery, personal brand
- `dashboard` — data visualization, analytics, admin
- `mobile-app` — iOS/Android focused (PWA wrapper)
- `onboarding` — wizard, tutorial, setup flow
- `crm` — contacts, pipelines, deals, communication tracking

**Classification rules:**
- If the brief mentions "buy/sell/ listing/vendor" → marketplace
- If "blog/article/content/editorial" → content
- If "track/manage/organize contacts/deals" → crm
- If "calculate/convert/generate" → tool
- If "showcase/portfolio/gallery" → portfolio
- If "analytics/metrics/dashboard" → dashboard
- If "community/forum/discuss" → community
- If brief is < 10 words and mentions no transactions → landing
- Default: saas (most common, safest)

### Step 2: Adaptive Discovery Questions

**4-6 type-specific questions** that materially change architecture:

**For SaaS:**
1. Who pays — end users, teams, or enterprise admins?
2. What's the core action users do 3+ times per week?
3. What data must persist vs. what can be ephemeral?
4. What's the biggest trust barrier for a new user?
5. Must this support multi-tenancy or single-tenant?
6. What's the one feature that would make users switch from their current tool?

**For Marketplace:**
1. Who creates listings — suppliers, admins, or both?
2. What's the transaction model — commission, subscription, listing fee?
3. How do buyers find sellers — search, browse, or matching?
4. What's the trust mechanism — reviews, escrow, verification?
5. What's the geographic scope — local, national, global?
6. Who handles disputes — platform, third-party, or self-resolution?

**For Ecommerce:**
1. What's the product catalog size — 10, 100, 1000+ SKUs?
2. Who manages inventory — merchant, dropship, or hybrid?
3. What's the payment flow — one-page, multi-step, or subscription?
4. What's the shipping model — flat rate, calculated, or free threshold?
5. What's the return policy — no returns, store credit, or full refund?
6. What's the primary channel — web, mobile, or social commerce?

**For Content:**
1. Who creates content — single author, multi-author, or community?
2. What's the monetization — ads, subscriptions, donations, or none?
3. What's the content format — text, video, audio, or mixed?
4. What's the discovery mechanism — search, tags, categories, or algorithmic?
5. What's the engagement model — read-only, comments, or community?
6. What's the publishing frequency — daily, weekly, or evergreen?

**For Tool:**
1. What's the input — file upload, form, API, or manual entry?
2. What's the output — file download, display, API response, or action?
3. What's the processing model — client-side, server-side, or hybrid?
4. What's the accuracy requirement — exact, approximate, or illustrative?
5. What's the usage pattern — one-time, daily, or batch?
6. What's the sharing model — private, link, or public?

**For Community:**
1. What's the joining mechanism — open, invite, or application?
2. What's the content format — posts, threads, channels, or rooms?
3. What's the moderation model — self, community, or admin?
4. What's the identity model — real name, pseudonym, or anonymous?
5. What's the engagement driver — content, events, or direct messaging?
6. What's the monetization — free, freemium, or token-based?

### Step 3: Deep Market Research

**Mandatory research outputs:**

1. **Competitor landscape** — top 3 direct competitors, their strengths, their fatal weaknesses
2. **Market gap** — what's missing that this product fills
3. **Target user persona** — demographics, psychographics, pain points, current workaround
4. **Differentiator** — one sentence why someone switches to this
5. **Risk flags** — technical, legal, commercial risks

### Step 4: Architecture Design

**Mandatory architecture outputs:**

1. **Data model** — entities, relationships, cardinality
2. **API contract** — endpoints, methods, request/response shapes
3. **Page map** — all pages, their purpose, navigation flow
4. **State machine** — user states, transitions, guards
5. **Auth model** — anonymous, email, social, SSO, or none
6. **Persistence model** — local, cloud, hybrid
7. **Integration map** — payment, messaging, analytics, storage

### Step 5: Exhaustive Features List

**Four tiers — NOTHING is unclassified:**

```json
{
  "must_have": {
    "description": "Product is unusable without these",
    "criteria": "Ship-blocking if missing",
    "examples": []
  },
  "should_have": {
    "description": "Expected by users, not ship-blocking",
    "criteria": "Can ship v1 without, must be in v2",
    "examples": []
  },
  "nice_to_have": {
    "description": "Delightful but not expected",
    "criteria": "Only if time permits",
    "examples": []
  },
  "explicitly_out_of_scope": {
    "description": "Intentionally NOT building",
    "criteria": "Protects scope from creep",
    "examples": []
  }
}
```

**Every feature MUST have:**
- Name
- Description (1 sentence)
- User value (why it matters)
- Business value (why WE care)
- Complexity estimate (low/medium/high)
- Dependencies (what must exist first)
- Acceptance criteria (testable)

### Step 6: Exhaustive Negative Fence

**200+ anti-patterns organized by category. Every build type gets a customized subset.**

---

## The Negative Fence — Exhaustive Anti-Patterns

### Visual Anti-Patterns (40+)

**Generic SaaS Tropes:**
- Must not use purple-blue gradient hero backgrounds
- Must not default to glassmorphism / frosted glass cards
- Must not use soft pastel card soup (white cards on light gray)
- Must not overuse rounded corners where authority is needed
- Must not default to Inter font for everything
- Must not use generic 3D illustration hero images
- Must not use "modern SaaS" template look (sidebar + top nav + dashboard grid)
- Must not use floating action buttons (FAB) for non-mobile apps
- Must not use hamburger menu on desktop
- Must not use carousel hero sliders

**Color & Typography:**
- Must not use more than 3 brand colors (primary, secondary, accent)
- Must not use pure black (#000) for text (use #1a1a1a or softer)
- Must not use pure white (#fff) backgrounds without purpose
- Must not use font size smaller than 14px for body text
- Must not use font weight lighter than 400 for readable text
- Must not use all-caps for body text or paragraphs
- Must not use centered text for long paragraphs (>2 lines)
- Must not use justified text alignment
- Must not use more than 2 font families
- Must not use decorative fonts for body text

**Layout & Spacing:**
- Must not use random spacing (no 13px, 17px, 23px — use 4px grid)
- Must not cram content to fit above the fold
- Must not use fixed-width containers on large screens (max-width needed)
- Must not use sidebars that scroll independently on desktop
- Must not use sticky headers taller than 80px
- Must not use footer taller than 200px
- Must not use more than 3 columns on mobile
- Must not use horizontal scroll on any viewport
- Must not use z-index wars (more than 3 layers)
- Must not use absolute positioning for layout structure

**Animation & Motion:**
- Must not use autoplaying videos with sound
- Must not use entrance animations longer than 500ms
- Must not use parallax scrolling for functional apps
- Must not use particle effects or confetti for serious products
- Must not use loading spinners longer than 2 seconds without progress
- Must not use skeleton screens for content that loads in < 200ms
- Must not use bounce animations for non-playful products
- Must not use blinking or flashing elements

### Product Anti-Patterns (50+)

**Feature Creep:**
- Must not invent features absent from approved concept
- Must not build admin dashboards for prototypes
- Must not add settings pages before core flows work
- Must not implement search before content exists
- Must not add notifications before actions exist
- Must not build analytics before data exists
- Must not add user roles before single-user flow works
- Must not build multi-language before English works
- Must not add dark mode before light mode is polished
- Must not build mobile app before web works

**Onboarding & UX:**
- Must not force account creation before showing value
- Must not use 5+ step onboarding wizards
- Must not ask for permissions before explaining why
- Must not use tooltip tours as primary onboarding
- Must not require email verification before first use
- Must not use modal popups for non-urgent messages
- Must not auto-subscribe users to newsletters
- Must not use cookie banners that block interaction
- Must not require phone number for non-SMS products
- Must not use CAPTCHA on first visit

**Trust & Credibility:**
- Must not use fake social proof ("47 people viewing now")
- Must not use fake urgency ("Only 2 left!" when unlimited)
- Must not use fake testimonials with stock photos
- Must not use "AI-powered" badge without actual AI
- Must not use "secure" badges without HTTPS
- Must not use "as seen on" logos without permission
- Must not use misleading pricing (show monthly but charge annually)
- Must not hide pricing behind "contact sales"
- Must not use auto-renew without clear disclosure
- Must not use dark patterns for consent

**Data & Forms:**
- Must not ask for data you don't need (SSN for newsletter)
- Must not use placeholder text as labels
- Must not use inline validation that blocks typing
- Must not clear form on error
- Must not use confirm-password fields (use show/hide toggle)
- Must not use dropdowns for < 4 options (use radio buttons)
- Must not use radio buttons for > 6 options (use dropdown)
- Must not use date pickers for distant dates (use text input)
- Must not require complex passwords for low-risk accounts
- Must not store passwords in plain text

### Content/Tone Anti-Patterns (40+)

**Copy & Messaging:**
- Must not use AI-sounding placeholder copy
- Must not use "Lorem ipsum" anywhere
- Must not use generic testimonials ("This app changed my life")
- Must not use inconsistent tone across pages
- Must not use jargon without explanation
- Must not use "synergy", "leverage", "streamline" without context
- Must not use "simple", "easy", "just" in instructions
- Must not use exclamation points in error messages
- Must not use all caps for emphasis (use bold or color)
- Must not use "click here" links (use descriptive text)

**Microcopy:**
- Must not use "Submit" as button text (use action verb)
- Must not use "OK" for confirmation (use "Yes, delete")
- Must not use "Error occurred" without details
- Must not use "Something went wrong" without next steps
- Must not use "Loading..." without context ("Loading your projects...")
- Must not use "Success!" without describing what succeeded
- Must not use passive voice in CTAs ("Projects can be created" → "Create project")
- Must not use double negatives ("Don't not click")
- Must not use "Are you sure?" without explaining consequences
- Must not use "Cancel" when meaning is "Go back"

**Empty States:**
- Must not show blank screens
- Must not use "No data" without explanation
- Must not show table headers with empty rows
- Must not use sad face icons for empty states
- Must not blame users ("You haven't created anything yet")
- Must not show "0" without context ("0 projects" → "No projects yet")

### Business Model Anti-Patterns (30+)

**Pricing & Monetization:**
- Must not assume payment flows for free tools
- Must not build subscription UI for one-time purchases
- Must not add "enterprise" pricing tier for MVP
- Must not use "contact sales" as only pricing option
- Must not show currency symbols without amounts
- Must not hide fees until checkout
- Must not use psychological pricing ($9.99) for B2B
- Must not offer unlimited plans you can't fulfill
- Must not require credit card for free trials
- Must not auto-upgrade users without notice

**Trust & Compliance:**
- Must not skip privacy policy for products that collect data
- Must not skip terms of service for paid products
- Must not use "we'll never spam" without unsubscribe mechanism
- Must not collect location data without purpose
- Must not share user data without disclosure
- Must not use third-party trackers without consent
- Must not store payment data (use Stripe/Razorpay tokens)
- Must not skip SSL for any page
- Must not use HTTP for authentication flows
- Must not log sensitive data (passwords, tokens)

### Integration/Risk Anti-Patterns (40+)

**Technical:**
- Must not ship integrations that were only assumed, not exercised
- Must not hardcode API keys in source
- Must not skip input validation because "it's a prototype"
- Must not use eval() or innerHTML with user content
- Must not trust client-side validation alone
- Must not use sync blocking operations on main thread
- Must not load third-party scripts without SRI
- Must not use outdated dependencies with known CVEs
- Must not expose stack traces to users
- Must not use default credentials (admin/admin)

**Performance:**
- Must not load > 1MB of JavaScript for initial paint
- Must not use unoptimized images (> 200KB without WebP)
- Must not make > 6 concurrent API calls on load
- Must not use render-blocking CSS imports
- Must not use setState in loops without batching
- Must not fetch data in componentWillMount
- Must not use polling intervals < 5 seconds
- Must not load fonts from > 2 sources
- Must not use CSS animations that trigger layout thrashing
- Must not ignore Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)

**Accessibility:**
- Must not use color alone to convey meaning
- Must not use <div> for buttons (use <button>)
- Must not skip alt text for informative images
- Must not use focusable elements without visible focus states
- Must not use aria-hidden on focusable elements
- Must not use placeholder as label
- Must not skip heading hierarchy (h1 → h2 → h3)
- Must not use tables for layout
- Must not set outline: none without replacement
- Must not use contrast ratios below WCAG AA (4.5:1 text, 3:1 UI)

---

## Validation Loop — The Core Differentiator

### Validation runs after EVERY agent. No exceptions.

```
Agent completes work
    ↓
Self-verification (agent checks own output)
    ↓
Intent-to-output diff check (did we deliver what was mandated?)
    ↓
Submit to FatJudge
    ↓
FatJudge runs 4-channel check
    ↓
PASS → Handoff to next agent
FAIL → Route to FatDeploy or back to originating agent
    ↓
Repair completes
    ↓
Re-submit to FatJudge
    ↓
PASS → Handoff
FAIL (budget exhausted) → Escalate to human
```

### Self-Verification Checklist (every agent must complete before submission)

**FatScout:**
- [ ] Build type correctly identified
- [ ] All 4-6 discovery questions answered
- [ ] Market research has 3+ competitors
- [ ] Architecture has data model + API contract + page map
- [ ] Features list has must/should/nice/out-of-scope
- [ ] Negative fence has 20+ items
- [ ] All outputs in job-memory.json

**FatProto:**
- [ ] All pages from architecture packet built
- [ ] Mock data matches schema
- [ ] Navigation works between all pages
- [ ] Core user flow executable
- [ ] No console errors
- [ ] Visual check against negative fence
- [ ] Screenshots at 390/768/1440

**FatForge:**
- [ ] All prototype pages preserved
- [ ] Backend routes match API contract
- [ ] Auth flow works end-to-end
- [ ] Onboarding completes without errors
- [ ] Core commercial workflow works
- [ ] Integrations pass in test mode
- [ ] Deploy smoke test passes

### FatJudge — 4-Channel Check

**Channel 1: Static**
- Typecheck pass
- Lint pass
- Build pass
- No import errors
- All assets referenced exist
- No hardcoded secrets

**Channel 2: Runtime**
- Zero console errors on load
- Zero unhandled rejections
- All API calls return 200
- No broken routes (404 check)
- Hydration completes without errors
- Memory leaks check (heap growth < 10%)

**Channel 3: Visual**
- Screenshots at 390px (mobile)
- Screenshots at 768px (tablet)
- Screenshots at 1440px (desktop)
- No overflow or horizontal scroll
- Text legibility check
- Brand fit against style tokens
- Negative fence compliance scan

**Channel 4: Behavioral**
- Core user journey completes
- Form submission works
- Navigation state changes work
- Error states trigger correctly
- Loading states show and dismiss
- Empty states render correctly

### Intent-to-Output Diff Check

**The most important check:** Did the agent deliver what was actually mandated?

```json
{
  "mandate": "Build 5-page SaaS prototype with auth, dashboard, and settings",
  "output": {
    "pages_built": ["landing", "signup", "dashboard", "settings", "profile"],
    "auth_implemented": true,
    "dashboard_has_data": true,
    "settings_has_fields": true
  },
  "diff": {
    "missing": [],
    "extra": ["profile"],
    "incorrect": [],
    "verdict": "PASS — all mandated elements present, extra page noted"
  }
}
```

**Rules:**
- Missing elements = automatic FAIL
- Extra elements = WARN (acceptable if not ship-blocking)
- Incorrect elements = FAIL (delivered X instead of Y)
- Verdict must be explicit: PASS / WARN / FAIL

---

## Quality Gates

### Architecture Gate (after FatScout)
- [ ] Build type identified
- [ ] Discovery answers complete
- [ ] Competitor research has 3+ entries
- [ ] Data model defined
- [ ] Page map has 5+ pages
- [ ] Features list has 10+ must-have items
- [ ] Negative fence has 20+ items
- [ ] Risk flags documented
- [ ] Verification score ≥ 80
- [ ] Evidence bundle attached

### Proto Gate (after FatProto + FatJudge)
- [ ] All required pages render
- [ ] No critical console/runtime failures
- [ ] Key navigation path works
- [ ] Mock data matches concept
- [ ] Visual direction respects negative fence
- [ ] Intent-to-output diff: PASS
- [ ] Verification score ≥ 85
- [ ] Evidence bundle attached

### Production Gate (after FatForge + FatJudge)
- [ ] Build + runtime checks clean
- [ ] Core onboarding flow works
- [ ] Core commercial/operational workflow works
- [ ] Required integrations pass in test mode
- [ ] Security basics pass
- [ ] Intent-to-output diff: PASS
- [ ] Verification score ≥ 92
- [ ] Evidence bundle attached

---

## Job-Memory Artifact

Single source of truth carried across all stages:

```json
{
  "idea": "string",
  "build_type": "saas|marketplace|ecommerce|content|tool|community|landing|portfolio|dashboard|mobile-app|onboarding|crm",
  "app_type": "string",
  "target_users": "string",
  "primary_outcome": "string",
  "core_loop": "string",
  "platform": "string",
  "discovery_answers": {},
  "research": {
    "market_gap": "string",
    "competitors": [],
    "differentiator": "string"
  },
  "architecture": {
    "data_model": "string",
    "api_contract": "string",
    "page_map": [],
    "state_machine": "string",
    "auth_model": "string",
    "persistence_model": "string"
  },
  "features": {
    "must_have": [],
    "should_have": [],
    "nice_to_have": [],
    "out_of_scope": []
  },
  "negative_fence": {
    "visual": [],
    "product": [],
    "content": [],
    "business": [],
    "integration": []
  },
  "style_tokens": {},
  "mock_data_schema": {},
  "risk_flags": [],
  "decision_log": [],
  "verification_history": [],
  "approval_state": "pending|approved|rejected",
  "intent_to_output_diffs": []
}
```

---

## Anti-Rules (System-Level)

1. **Never accept positive goals without anti-goals**
2. **Never let "modern / premium / clean" pass without forced specificity**
3. **Never treat speed or agent count as a proxy for quality**
4. **Never default to generic SaaS patterns**
5. **Never split one coherent aesthetic decision across three weak handoffs**
6. **Never auto-loop on vague aesthetic dissatisfaction**
7. **Never rewrite broadly when the defect is localized**
8. **Never claim ready without proof across required channels**
9. **Never confuse a screenshot pass with a product pass**
10. **Never ship integrations that were only assumed, not exercised**
11. **Never allow handoff without intent-to-output diff check**
12. **Never let agents operate blind — verification is mandatory, not optional**
13. **Never skip negative fence — it prevents more bugs than any test suite**
14. **Never accept "it looks good" as verification — evidence or it didn't happen**
15. **Never let repair cycles exceed budget — escalate instead of looping forever**

---

## What Makes Fatline Better

| Other AI Builders | Fatline |
|---|---|
| Optimize generation speed | Optimize verification rigor |
| More agents = better | Fatter agents = fewer handoffs = more coherent |
| Positive brief only | Exhaustive negative fence |
| Self-reported quality | Independent FatJudge |
| Handoff without checking | Intent-to-output diff before every handoff |
| Agents operate blind | Every agent verifies before submission |
| Screenshot = done | 4-channel verification with evidence |
| Loop until looks okay | Bounded repair with escalation |

---

## Implementation Order

1. ✅ Write v3 spec (this document)
2. Update all SKILL.md files with v3 mandates
3. Implement intent-to-output diff check in verification
4. Add negative fence generation to FatScout
5. Wire validation loop into pipeline orchestrator
6. Add evidence bundle attachment to all stages
7. Run E2E tests until green
8. Playwright audit on fatline.produsa.dev

---

**Fatline is not an agent farm. It is a verification system for creative and product work.**

**Most AI builders optimize generation. Fatline optimizes what survives verification.**

**Generated until proven.**
