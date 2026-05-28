// Image sourcing for the Fatline engine.
// Beat-V2 lever: REAL, FAST-loading photography for every category. We use
// verified-permanent Unsplash photo URLs (CDN, instant) — topical per category
// with a curated "generic premium" fallback — plus Picsum (real, always-loads)
// to fill galleries. No Pollinations: AI images are uncanny AND load too slowly
// to render reliably (V2's weakness). All URLs below are HEAD-verified.

const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&q=80&auto=format&fit=crop`;
const picsum = (seed, w, h) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

export const UNSPLASH_BANK = {
  food: ['1517248135467-4c7edcad34c4', '1414235077428-338989a2e8c0', '1504674900247-0877df9cc836', '1555396273-367ea4eb4db5'],
  fashion: ['1490481651871-ab68de25d43d', '1483985988355-763728e1935b', '1441986300917-64674bd600d8'],
  beauty: ['1560066984-138dadb4c035', '1522335789203-aabd1fc54bc9'],
  fitness: ['1534438327276-14e5300c3a48', '1571019613454-1cb2f99b2d8b'],
  health: ['1534438327276-14e5300c3a48', '1571019613454-1cb2f99b2d8b'],
  realestate: ['1512917774080-9991f1c4c750', '1600585154340-be6161a56a0c'],
  travel: ['1469854523086-cc02fe5d8800', '1501785888041-af3ef285b470'],
  saas: ['1551434678-e076c223a692', '1460925895917-afdab827c52f'],
  finance: ['1611974789855-9c2a0a7236a3', '1559526324-4b87b5e36e44'],
  ecommerce: ['1441986300917-64674bd600d8', '1483985988355-763728e1935b'],
};

// Premium, brand-neutral photos that suit B2B / SaaS / AI / legal / finance / education / crypto / social.
const GENERIC = [
  '1497366754035-f200968a6e72', '1486406146926-c627a92ad1ab', '1451187580459-43490279c0fa',
  '1518770660439-4636190af475', '1531297484001-80022131f5a1', '1504384308090-c894fdcc538d',
  '1454165804606-c3d57bc86b40', '1432888622747-4eb9a8efeb07', '1497215728101-856f4ea42174',
  '1542744173-8e7e53415bb0', '1620712943543-bcc4688e7485', '1517048676732-d65bc937f952',
];

function poolFor(category) {
  const b = UNSPLASH_BANK[category];
  return b && b.length ? b : GENERIC;
}

export function heroImage({ category, seed = 1, w = 1280, h = 720 }) {
  const p = poolFor(category);
  return U(p[seed % p.length], w, h);
}

export function cardImage({ category, seed = 1, w = 640, h = 480 }) {
  const p = poolFor(category);
  return U(p[seed % p.length], w, h);
}

export function bankImage({ category, index = 0, w = 640, h = 480 }) {
  const p = poolFor(category);
  if (index < p.length) return U(p[index], w, h);
  return picsum(`${category}-${index}`, w, h); // real photo, guaranteed fast load
}

export function avatar(name = 'User', hex = '6d5efc') {
  const bg = hex.replace('#', '');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=80&bold=true&format=png`;
}

const AV = ['Aarav Mehta', 'Diya Sharma', 'Kabir Rao', 'Anika Iyer', 'Rohan Nair'];

// Turn the brief's concrete imageKeyword into LoremFlickr tags.
// "artisan coffee roastery" -> "artisan,coffee,roastery"
const STOP = new Set(['the', 'and', 'for', 'with', 'app', 'site', 'web', 'page']);
function keywordTags(keyword, category) {
  const toks = String(keyword || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ,]/g, ' ')
    .split(/[\s,]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  return (toks.length ? toks : [category || 'business']).slice(0, 3).join(',');
}
// LoremFlickr: real keyword-matched photos, stable per `lock` seed, fast CDN.
const flickr = (tags, w, h, lock) => `https://loremflickr.com/${w}/${h}/${encodeURIComponent(tags)}?lock=${lock}`;

// Image kit referenced by the page prompts + the deterministic image-floor injector.
// Driven by the brief's imageKeyword so imagery matches the actual brand (coffee,
// not a generic cafe) — previously this used only the broad industry category, so
// every "food" build shared the same four photos. Falls back to the curated
// Unsplash pool when the brief produced no usable keyword. A global onerror handler
// in the shell swaps any image that fails to load for a Picsum photo, so the
// engine's "no broken images" guarantee holds regardless of source.
export function buildImageKit({ category, keyword, primaryHex }) {
  const hex = (primaryHex || '#6d5efc').replace('#', '');
  if (!String(keyword || '').trim()) {
    const p = poolFor(category);
    const cards = Array.from({ length: 8 }, (_, i) =>
      i < p.length ? U(p[i], 640, 480) : picsum(`${category}-c${i}`, 640, 480)
    );
    return {
      hero: U(p[0], 1400, 900), heroWide: U(p[1 % p.length], 1600, 700), feature: U(p[2 % p.length], 900, 700),
      cards, avatars: AV.map((n) => avatar(n, hex)), keyword: category,
    };
  }
  const tags = keywordTags(keyword, category);
  const cards = Array.from({ length: 8 }, (_, i) => flickr(tags, 640, 480, 20 + i));
  return {
    hero: flickr(tags, 1400, 900, 1),
    heroWide: flickr(tags, 1600, 700, 2),
    feature: flickr(tags, 900, 700, 3),
    cards,
    avatars: AV.map((n) => avatar(n, hex)),
    keyword: tags,
  };
}
