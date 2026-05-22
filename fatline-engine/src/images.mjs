// Image sourcing for the Fatline engine.
// Strategy to beat V2: prefer real photography. Curated Unsplash photo URLs
// (permanent, verified) for hero/section slots by category, with Pollinations
// (photographic prompts) as the topical generator and ui-avatars for people.

// Verified-permanent Unsplash photo URLs by category (HEAD-checked).
// Expanded over the loop; Pollinations fills any gap.
export const UNSPLASH_BANK = {
  food: [
    'photo-1517248135467-4c7edcad34c4', // restaurant interior
    'photo-1414235077428-338989a2e8c0', // fine dining table
    'photo-1504674900247-0877df9cc836', // plated food
    'photo-1555396273-367ea4eb4db5', // cafe counter
  ],
  fashion: [
    'photo-1490481651871-ab68de25d43d', // editorial fashion
    'photo-1483985988355-763728e1935b', // boutique rack
    'photo-1441986300917-64674bd600d8', // storefront
  ],
  beauty: [
    'photo-1560066984-138dadb4c035', // salon
    'photo-1522335789203-aabd1fc54bc9', // skincare
  ],
  fitness: [
    'photo-1534438327276-14e5300c3a48', // gym
    'photo-1571019613454-1cb2f99b2d8b', // workout
  ],
  realestate: [
    'photo-1512917774080-9991f1c4c750', // modern home
    'photo-1600585154340-be6161a56a0c', // interior
  ],
  travel: [
    'photo-1469854523086-cc02fe5d8800', // landscape
    'photo-1501785888041-af3ef285b470', // scenic
  ],
  saas: [
    'photo-1551434678-e076c223a692', // team working
    'photo-1460925895917-afdab827c52f', // analytics
  ],
  finance: [
    'photo-1611974789855-9c2a0a7236a3', // finance desk
    'photo-1559526324-4b87b5e36e44', // charts
  ],
  ecommerce: [
    'photo-1441986300917-64674bd600d8', // store
    'photo-1556742049-0cfed4f6a45d', // packages
  ],
};

const POLLI = 'https://image.pollinations.ai/prompt/';

// Photographic, editorial prompt scaffolds per category for Pollinations.
const PHOTO_STYLE = 'editorial photography, cinematic lighting, shallow depth of field, high detail, premium, no text, no watermark';

function polli(prompt, { w = 1280, h = 720, seed = 42 } = {}) {
  const enc = encodeURIComponent(`${prompt}, ${PHOTO_STYLE}`);
  return `${POLLI}${enc}?width=${w}&height=${h}&nologo=true&seed=${seed}`;
}

function unsplash(id, { w = 1280, h = 720 } = {}) {
  return `https://images.unsplash.com/${id}?w=${w}&h=${h}&q=80&auto=format&fit=crop`;
}

/**
 * Hero image for a page. Uses curated Unsplash for the category when available
 * (deterministic by seed), else a topical Pollinations photo.
 */
export function heroImage({ category, keyword, seed = 1, w = 1280, h = 720 }) {
  const bank = UNSPLASH_BANK[category];
  if (bank && bank.length) {
    return unsplash(bank[seed % bank.length], { w, h });
  }
  return polli(keyword || `${category} brand hero`, { w, h, seed });
}

/** Section / card image — topical Pollinations photo (varied by subject+seed). */
export function cardImage({ subject, category, seed = 1, w = 640, h = 480 }) {
  return polli(`${subject || category} product`, { w, h, seed });
}

/** Use a bank image directly by index for a category (for galleries). */
export function bankImage({ category, index = 0, w = 640, h = 480 }) {
  const bank = UNSPLASH_BANK[category];
  if (bank && bank.length) return unsplash(bank[index % bank.length], { w, h });
  return cardImage({ category, seed: index + 1, w, h });
}

export function avatar(name = 'User', hex = '6d5efc') {
  const bg = hex.replace('#', '');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=80&bold=true&format=png`;
}

// Build a small image kit the page-generation prompts can reference by slot.
export function buildImageKit({ category, keyword, primaryHex }) {
  const hex = (primaryHex || '#6d5efc').replace('#', '');
  return {
    hero: heroImage({ category, keyword, seed: 1, w: 1400, h: 900 }),
    heroWide: heroImage({ category, keyword, seed: 2, w: 1600, h: 700 }),
    cards: Array.from({ length: 8 }, (_, i) =>
      bankImage({ category, index: i, w: 640, h: 480 })
    ),
    feature: cardImage({ subject: `${keyword || category} detail`, category, seed: 7, w: 900, h: 700 }),
    avatars: ['Aarav Mehta', 'Diya Sharma', 'Kabir Rao', 'Anika Iyer', 'Rohan Nair'].map((n) => avatar(n, hex)),
  };
}
