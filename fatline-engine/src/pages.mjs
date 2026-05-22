// Page-set definitions per app type (mirrors V2's getPagesForType, with icons).
// Each page: { id, title, icon }  — id is the route key used by __PAGES__.
// Icons are lucide-style names rendered as inline SVG by the shell.

const P = (id, title, icon) => ({ id, title, icon });

const SETS = {
  webapp: [
    P('home', 'Home', 'home'),
    P('dashboard', 'Dashboard', 'layout-dashboard'),
    P('features', 'Features', 'sparkles'),
    P('pricing', 'Pricing', 'tag'),
    P('account', 'Account', 'user'),
  ],
  landing: [
    P('home', 'Home', 'home'),
    P('features', 'Features', 'sparkles'),
    P('pricing', 'Pricing', 'tag'),
    P('about', 'About', 'info'),
    P('contact', 'Contact', 'mail'),
  ],
  saas: [
    P('home', 'Home', 'home'),
    P('dashboard', 'Dashboard', 'layout-dashboard'),
    P('features', 'Features', 'sparkles'),
    P('billing', 'Billing', 'credit-card'),
    P('docs', 'Docs', 'book'),
  ],
  crm: [
    P('dashboard', 'Dashboard', 'layout-dashboard'),
    P('pipeline', 'Pipeline', 'kanban'),
    P('contacts', 'Contacts', 'users'),
    P('deals', 'Deals', 'handshake'),
    P('reports', 'Reports', 'bar-chart'),
  ],
  ecommerce: [
    P('home', 'Home', 'home'),
    P('shop', 'Shop', 'shopping-bag'),
    P('product', 'Product', 'package'),
    P('cart', 'Cart', 'shopping-cart'),
    P('account', 'Account', 'user'),
  ],
  mobile: [
    P('home', 'Home', 'home'),
    P('explore', 'Explore', 'compass'),
    P('create', 'Create', 'plus-circle'),
    P('activity', 'Activity', 'bell'),
    P('profile', 'Profile', 'user'),
  ],
  tool: [
    P('home', 'Home', 'home'),
    P('workspace', 'Workspace', 'layout-dashboard'),
    P('templates', 'Templates', 'grid'),
    P('pricing', 'Pricing', 'tag'),
    P('account', 'Account', 'user'),
  ],
};

const ALIAS = {
  website: 'landing',
  fullstack: 'webapp',
  fullapp: 'webapp',
  dashboard: 'crm',
  store: 'ecommerce',
  shop: 'ecommerce',
  app: 'mobile',
  utility: 'tool',
};

export function resolveType(type = '') {
  const t = String(type).toLowerCase().trim();
  if (SETS[t]) return t;
  if (ALIAS[t]) return ALIAS[t];
  return 'webapp';
}

export function getPages(type) {
  return SETS[resolveType(type)];
}

export const PAGE_SETS = SETS;
