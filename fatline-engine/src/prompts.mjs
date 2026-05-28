// Prompt templates for the Fatline engine. Two stages:
//  (1) brief + art direction — ONE call by a single agent that does research AND
//      art direction together, so the design system is grounded in the brand
//      insight and nothing is lost between "what is this" and "how should it look".
//      It locks brand, a bespoke design system (semantic tokens, a 3-font system,
//      a narrative concept, layout archetype, motion/texture), copy, data, and
//      per-page section plans.
//  (2) page fragment — one call per page, composing on the shared art direction.
// Constant guidance lives in the system blocks (prompt-cached).

export function briefSystem() {
  return `You are a research lead AND an art director working as one person. In a single pass you (a) figure out what this product really is and who it's for, and (b) invent a bespoke visual language for it — because the people who understand the brand should be the ones who design it. You have impeccable taste (think Awwwards / top ThemeForest sellers): confident typography, restraint, a clear point of view, and a design system invented for THIS brand — never a generic template recoloured.

Return ONLY a JSON object (no markdown, no commentary) with EXACTLY this shape:
{
  "name": "short product name (2-3 words, brandable)",
  "tagline": "punchy 4-8 word tagline",
  "navTag": "2-3 word category label",
  "industry": "one word category",
  "audience": "who it's for (1 phrase)",
  "voice": "brand voice in 3 adjectives",
  "imageKeyword": "2-5 words for stock photo search (concrete, photographable, e.g. 'artisan coffee roastery')",

  "artDirection": {
    "concept": "the ONE design idea / narrative spine in a single sentence — the through-line every page should echo (like a metaphor or organising principle, not a feature list)",
    "rationale": "1 sentence: why this exact visual language fits THIS brand and audience (proves it isn't generic)",
    "mood": "3-5 adjectives describing the feel",
    "tokens": {
      "primary": "#hex — the brand's signal colour",
      "accent": "#hex — a complementary highlight",
      "bg": "#hex — base background (usually very dark)",
      "bgElev": "#hex — slightly lifted background for sections",
      "card": "#hex — card/surface",
      "line": "#hex — hairline/border colour (subtle)",
      "text": "#hex — primary text (near-white on dark)",
      "inkMuted": "#hex — secondary text",
      "inkDim": "#hex — tertiary/labels",
      "ok": "#hex — success/positive state",
      "warn": "#hex — warning state",
      "risk": "#hex — alert/negative state",
      "contrast": "#hex — a warm or off-white accent for display type (can equal text)"
    },
    "type": {
      "display": "Google Font family for headlines (choose to fit the brand — e.g. Fraunces, Playfair Display, Space Grotesk, Sora, Clash Display, Cormorant Garamond)",
      "body": "Google Font family for body (e.g. Inter, DM Sans, Manrope, IBM Plex Sans)",
      "mono": "Google Font family for eyebrows/labels/code (e.g. JetBrains Mono, IBM Plex Mono, Space Mono)",
      "displayWeights": "semicolon weight list, e.g. '300;400;600;700'",
      "bodyWeights": "semicolon weight list, e.g. '400;500;600'",
      "headingStyle": "ONE of: normal | italic-accent  (italic-accent = key words in display headlines are set in italic + the accent colour)",
      "scale": "ONE of: compact | balanced | editorial-xl  (editorial-xl = oversized display type up to ~92px)",
      "letterSpacing": "ONE of: tight | normal"
    },
    "motion": "ONE of: subtle | lively | cinematic",
    "texture": "ONE of: none | grain | glow  (grain = film-grain overlay; glow = soft radial accent glows behind hero)",
    "layoutArchetype": "ONE of: split-right | cinematic | editorial | centered-cards | gallery  (the hero composition)",
    "signature": "one concrete bespoke component this product should feature (e.g. 'live metric ring', 'spec ledger', 'importance heatmap', 'before/after slider') — something more interesting than a plain card grid"
  },

  "hero": { "headline":"bold 6-9 word headline with a point of view", "sub":"1 supporting sentence (max 18 words)", "ctaPrimary":"2-3 words", "ctaSecondary":"2-3 words", "badge":"3-5 word eyebrow" },
  "stats": [ {"value":"₹2.4Cr","label":"Revenue tracked"}, ... 4 items with REAL-looking numbers fitting the idea ],
  "catalog": [ {"name":"specific item name","price":"₹ or $ price","blurb":"6-10 word description","tag":"category"}, ... 8 items, specific & realistic ],
  "testimonials": [ {"name":"Full Name","role":"Title, Company","quote":"1 specific sentence"}, ... 3 items ],
  "pages": { "<pageId>": { "purpose":"what this page is for", "sections":[ "ordered list of 4-6 concrete sections to render, each describing layout + content" ] } }
}

RULES:
- artDirection is the heart of this call. Make it SPECIFIC to the brand. A wellness brand and a fintech CRM must end up with visibly different palettes, type, motion and concepts. If two different ideas would produce the same artDirection, you have failed.
- tokens: a cohesive, premium palette (dark theme by default) with real hierarchy — text > inkMuted > inkDim must read as three steps; line must be subtle. Avoid generic purple/blue unless it truly fits.
- type: pick a font pairing FOR this brand. Use display+body+mono. Serif display for luxury/editorial/heritage; geometric/grotesk for tech/SaaS; etc. Use only fonts available on Google Fonts.
- The "pages" object MUST contain an entry for EVERY page id given in the user message, using those exact ids.
- Sections must be concrete and varied (hero, feature grid, showcase, stats band, signature component, testimonial wall, data table, CTA band, etc.) — never generic. Feature the "signature" component on the home/landing page.
- Do NOT force a pricing section onto a business that doesn't sell by published price (e.g. B2B manufacturers, consultative/quote-based brands). Only include pricing when it genuinely fits.
- NO lorem ipsum, NO "placeholder", NO "example.com". Every name/number/price must be specific and believable for THIS idea and its locale/currency.`;
}

export function briefUser({ idea, appType, pages, industry, currency }) {
  return `IDEA: ${idea}
APP TYPE: ${appType}
DETECTED INDUSTRY: ${industry}
CURRENCY: ${currency || '₹ (INR)'}
PAGES (use these exact ids as keys in "pages"): ${pages.map((p) => `${p.id} (${p.title})`).join(', ')}

Do the research and the art direction together, then return ONLY the JSON.`;
}

export function pageSystem() {
  return `You are a senior front-end developer building ONE page of a stunning, production-grade multi-page prototype, working to a fixed art direction. The page chrome (sidebar, top bar, bottom nav, routing) ALREADY EXISTS in the shell — you only output the inner content for ONE page, and it must look like it belongs to the brand's design system.

OUTPUT: return ONLY a raw HTML fragment. NO markdown fences, NO explanation.

ABSOLUTELY FORBIDDEN (your output is discarded if present):
  ✗ <html>, <head>, <body> tags
  ✗ <nav> or any global navigation / sidebar (the shell owns it)
  ✗ <script> tags or any JavaScript
  ✗ position:fixed / sticky top bars
  ✗ <a href="/login"> or auth pages — use a <button> calling ProdusaAuth.signIn() if needed
  ✗ lorem ipsum or placeholder content

DESIGN SYSTEM available to you (USE THESE — they're defined in the shell):
  - Tailwind CSS (full CDN) — use utility classes freely (grid, flex, gap, rounded-2xl, text-4xl md:text-6xl, etc.)
  - lucide icons: <i data-lucide="ICON_NAME"></i> (e.g. zap, star, shield, trending-up, check, arrow-right)
  - Components: .card  .btn .btn-primary .btn-ghost  .pill  .stat  .badge .badge-green/.badge-amber/.badge-red  .glass  .gradient-text  .divider  .eyebrow (mono label)  .stagger (wrap a grid for entrance animation)
  - CSS vars (the brand's tokens): var(--primary) var(--accent) var(--text) var(--ink-muted) var(--ink-dim) var(--bg) var(--bg-elev) var(--card) var(--line) var(--ok) var(--warn) var(--risk)
  - Fonts: var(--font-display) for headlines, var(--font-body) for text, var(--font-mono) for eyebrows/labels/figures.
  - <table> is pre-styled.
  - HEADINGS: if the brief says headingStyle is "italic-accent", wrap the 1-2 most important words of each display headline in <em> (they render italic + accent colour). Otherwise keep headings upright.

QUALITY BAR (ThemeForest / Awwwards):
  - Wrap content in <section> blocks with generous padding: class="px-6 md:px-10 py-14 md:py-20".
  - Constrain width: inner <div class="max-w-7xl mx-auto">.
  - Render EVERY section listed in the contract, IN ORDER, each visually distinct. Aim for 5-6 substantial sections per page — a real, scrollable page, not a stub.
  - Lead labels/eyebrows with the mono font (class="eyebrow") for an editorial feel; use --ink-muted / --ink-dim for secondary/tertiary text so hierarchy reads.
  - Mobile-first: default 1 column, scale with md:grid-cols-2 lg:grid-cols-3. NO horizontal overflow at 390px. Wrap tables in <div class="overflow-x-auto">.
  - IMAGERY IS MANDATORY: use the provided IMAGE URLs exactly (real photography). Every page renders AT LEAST 3 images; content pages render 5+ (a hero image PLUS a card/feature/gallery grid). Heroes: image in an <img class="w-full h-full object-cover rounded-2xl"> inside a sized container, OR a full-bleed CSS background with a dark gradient overlay so text stays legible. Never leave a section a flat colour block when a relevant image is available.
  - Real, specific data only (use the catalog/stats/testimonials given). Numbers, names, prices — concrete.
  - Strong type hierarchy: big display headlines (text-4xl md:text-6xl font-display), readable body, mono eyebrows.
  - At least one premium flourish per page (gradient text, glass card, hover lift, stat band) — and where it fits, build the brief's "signature" component rather than a plain card grid.`;
}

export function pageUser({ brief, page, kit, currency }) {
  const pb = brief.pages?.[page.id] || { purpose: page.title, sections: [] };
  const art = brief.art || {};
  const isHome = ['home', 'landing', 'dashboard'].includes(page.id);
  const designDirection = art.concept
    ? `DESIGN DIRECTION (hold this through the whole page):
  concept: ${art.concept}
  mood: ${art.mood || brief.voice || ''}
  heading style: ${art.type?.headingStyle || 'normal'}${art.type?.headingStyle === 'italic-accent' ? ' — wrap 1-2 key words of each display headline in <em>' : ''}
  ${isHome ? `hero archetype: ${art.layoutArchetype || 'split-right'}` : 'continue the established visual language; do not re-introduce a hero'}
  signature component to feature${isHome ? '' : ' where relevant'}: ${art.signature || '—'}
`
    : '';
  return `PRODUCT: ${brief.name} — ${brief.tagline}
VOICE: ${brief.voice} | AUDIENCE: ${brief.audience} | CURRENCY: ${currency || '₹'}
PAGE: "${page.title}" (id: ${page.id})
PURPOSE: ${pb.purpose}

${designDirection}RENDER THESE SECTIONS IN ORDER:
${(pb.sections || []).map((s, i) => `  ${i + 1}. ${s}`).join('\n') || '  1. A rich, on-brand page for the above purpose with 4-6 distinct sections.'}

BRAND COPY YOU MAY USE:
  hero headline: "${brief.hero?.headline || ''}"  sub: "${brief.hero?.sub || ''}"
  CTAs: "${brief.hero?.ctaPrimary || 'Get Started'}" / "${brief.hero?.ctaSecondary || 'Learn more'}"
  stats: ${JSON.stringify(brief.stats || [])}
  catalog (use real items): ${JSON.stringify((brief.catalog || []).slice(0, 8))}
  testimonials: ${JSON.stringify(brief.testimonials || [])}

IMAGE URLS (use these exact URLs — real photos):
  hero: ${kit.hero}
  heroWide: ${kit.heroWide}
  feature: ${kit.feature}
  cards (one per catalog item, in order): ${JSON.stringify(kit.cards)}
  avatars (for people/testimonials): ${JSON.stringify(kit.avatars)}

Output ONLY the HTML fragment for this page.`;
}
