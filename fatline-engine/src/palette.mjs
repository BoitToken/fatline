// Palettes, font pairings, and layout archetypes for the Fatline engine.
// Palettes seeded from V2's INDUSTRY_PALETTE and extended; the LLM design-brief
// stage may override, but these are the deterministic fallback/anchor.

export const INDUSTRY_PALETTE = {
  dating:     { primary: '#e11d48', bg: '#0f0a0d', card: '#1a0f14', accent: '#f43f5e', text: '#fce7f3', muted: '#9b8088' },
  finance:    { primary: '#10b981', bg: '#08120f', card: '#0f1a16', accent: '#34d399', text: '#d1fae5', muted: '#7d978c' },
  health:     { primary: '#14b8a6', bg: '#06140f', card: '#0a1f18', accent: '#2dd4bf', text: '#ccfbf1', muted: '#7a9b92' },
  food:       { primary: '#f97316', bg: '#140a05', card: '#1f1209', accent: '#fb923c', text: '#ffedd5', muted: '#b09078' },
  education:  { primary: '#6366f1', bg: '#080a1f', card: '#10122e', accent: '#818cf8', text: '#e0e7ff', muted: '#8b8fb5' },
  social:     { primary: '#d946ef', bg: '#120814', card: '#1a0f1f', accent: '#e879f9', text: '#fae8ff', muted: '#a888b0' },
  realestate: { primary: '#c79a3a', bg: '#13110c', card: '#1d1a12', accent: '#e0bd6a', text: '#f6efdc', muted: '#a89a78' },
  travel:     { primary: '#0ea5e9', bg: '#05101f', card: '#0a1a2f', accent: '#38bdf8', text: '#e0f2fe', muted: '#7c97ac' },
  ecommerce:  { primary: '#6d5efc', bg: '#0a0814', card: '#13102a', accent: '#9b8cff', text: '#e9e6ff', muted: '#9089b5' },
  fashion:    { primary: '#d4a373', bg: '#12100e', card: '#1c1814', accent: '#e9c79b', text: '#f5ece0', muted: '#a89880' },
  beauty:     { primary: '#e8959f', bg: '#140e10', card: '#1f1518', accent: '#f4b6bd', text: '#fbe9ec', muted: '#b08f96' },
  crypto:     { primary: '#f5b301', bg: '#070707', card: '#121212', accent: '#ffd34d', text: '#fff7e0', muted: '#9c9272' },
  music:      { primary: '#8b5cf6', bg: '#070510', card: '#110d1f', accent: '#a78bfa', text: '#ede9fe', muted: '#8d85a8' },
  ai:         { primary: '#2dd4bf', bg: '#05100f', card: '#0a1c1a', accent: '#5eead4', text: '#ccfbf1', muted: '#7c9c97' },
  saas:       { primary: '#3b82f6', bg: '#070b14', card: '#0e1525', accent: '#60a5fa', text: '#dbeafe', muted: '#7e8ba8' },
  crm:        { primary: '#6366f1', bg: '#080915', card: '#101227', accent: '#818cf8', text: '#e0e7ff', muted: '#868ab0' },
  fitness:    { primary: '#84cc16', bg: '#0c1206', card: '#141d0b', accent: '#a3e635', text: '#ecfccb', muted: '#94a472' },
  legal:      { primary: '#0891b2', bg: '#06121a', card: '#0b1d27', accent: '#22d3ee', text: '#cffafe', muted: '#7a96a0' },
  luxury:     { primary: '#c9a227', bg: '#0c0c0e', card: '#16161a', accent: '#e6c34d', text: '#f6f1e3', muted: '#9a9485' },
  default:    { primary: '#6d5efc', bg: '#08070f', card: '#11101c', accent: '#9b8cff', text: '#ece9ff', muted: '#8b88a8' },
};

const INDUSTRY_KEYWORDS = {
  food: ['restaurant', 'food', 'cafe', 'bakery', 'paan', 'kitchen', 'meal', 'delivery', 'coffee', 'dining', 'cloud kitchen', 'tiffin'],
  fashion: ['fashion', 'apparel', 'clothing', 'wear', 'streetwear', 'boutique', 'designer', 'sneaker'],
  beauty: ['beauty', 'salon', 'cosmetic', 'skincare', 'spa', 'parlor', 'makeup', 'grooming'],
  fitness: ['fitness', 'gym', 'workout', 'yoga', 'training', 'coach', 'wellness'],
  health: ['health', 'clinic', 'doctor', 'medical', 'patient', 'therapy', 'dental', 'pharma'],
  finance: ['finance', 'fintech', 'bank', 'invoice', 'accounting', 'lending', 'payment', 'wallet'],
  realestate: ['real estate', 'property', 'realty', 'rent', 'lease', 'homes', 'broker', 'listing'],
  travel: ['travel', 'trip', 'tour', 'hotel', 'flight', 'booking', 'vacation', 'stay'],
  education: ['education', 'course', 'learn', 'school', 'tutor', 'lms', 'student', 'academy'],
  ecommerce: ['shop', 'store', 'ecommerce', 'e-commerce', 'marketplace', 'cart', 'd2c', 'retail'],
  crypto: ['crypto', 'web3', 'token', 'nft', 'blockchain', 'defi', 'wallet'],
  music: ['music', 'audio', 'podcast', 'artist', 'song', 'studio', 'sound'],
  ai: ['ai', 'ml', 'gpt', 'agent', 'llm', 'intelligence', 'automation', 'copilot'],
  saas: ['saas', 'platform', 'dashboard', 'analytics', 'workflow', 'tool', 'b2b'],
  crm: ['crm', 'sales', 'pipeline', 'leads', 'deals', 'contacts'],
  legal: ['legal', 'law', 'attorney', 'compliance', 'contract'],
  dating: ['dating', 'match', 'relationship', 'singles'],
  social: ['social', 'community', 'creator', 'feed', 'network'],
  luxury: ['luxury', 'premium', 'exclusive', 'bespoke', 'haute', 'elite'],
};

export function detectIndustry(text = '') {
  const t = text.toLowerCase();
  let best = 'default', hits = 0;
  for (const [ind, kws] of Object.entries(INDUSTRY_KEYWORDS)) {
    const c = kws.reduce((s, k) => s + (t.includes(k) ? 1 : 0), 0);
    if (c > hits) { hits = c; best = ind; }
  }
  return best;
}

export function getPalette(industry) {
  return INDUSTRY_PALETTE[industry] || INDUSTRY_PALETTE.default;
}

// Google Font pairings (display + body). Picked by tone in the design-brief stage.
export const FONT_PAIRS = {
  luxe_serif:    { display: 'Playfair Display', body: 'DM Sans', displayWeights: '500;600;700', bodyWeights: '400;500;600' },
  modern_sans:   { display: 'Space Grotesk', body: 'Inter', displayWeights: '500;600;700', bodyWeights: '400;500;600' },
  editorial:     { display: 'Fraunces', body: 'Inter', displayWeights: '500;600;700', bodyWeights: '400;500;600' },
  geometric:     { display: 'Sora', body: 'Inter', displayWeights: '600;700;800', bodyWeights: '400;500' },
  warm:          { display: 'DM Serif Display', body: 'DM Sans', displayWeights: '400', bodyWeights: '400;500;600' },
  bold_grotesk:  { display: 'Clash Display', body: 'Inter', displayWeights: '600;700', bodyWeights: '400;500;600' }, // fallback to Space Grotesk if unavailable
  tech_mono:     { display: 'Space Grotesk', body: 'IBM Plex Sans', displayWeights: '500;600;700', bodyWeights: '400;500;600' },
};

export function getFontPair(key) {
  return FONT_PAIRS[key] || FONT_PAIRS.modern_sans;
}

// Default font pair recommendation by industry (the brief stage can override).
export function defaultFontKey(industry) {
  const map = {
    food: 'warm', fashion: 'luxe_serif', beauty: 'luxe_serif', luxury: 'luxe_serif',
    realestate: 'editorial', legal: 'editorial', education: 'editorial',
    saas: 'geometric', crm: 'geometric', ai: 'tech_mono', crypto: 'tech_mono',
    finance: 'modern_sans', travel: 'modern_sans', fitness: 'bold_grotesk',
    music: 'bold_grotesk', social: 'modern_sans', dating: 'modern_sans',
  };
  return map[industry] || 'modern_sans';
}

export function hexToRgb(hex) {
  const m = hex.replace('#', '');
  const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Layout archetypes for the HERO (variety across briefs; chosen in brief stage).
export const HERO_ARCHETYPES = [
  'split-right',     // headline left, photographic image card right + stats strip
  'cinematic',       // full-bleed hero photo with dark gradient + glass cards
  'editorial',       // two-column serif magazine layout, portrait image
  'centered-cards',  // centered gradient headline + 3 floating preview cards
  'gallery',         // masonry image-grid as the hero
];
