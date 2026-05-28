// Deterministic shell builder. The LLM only produces page fragments; Fatline
// owns the chrome, design system, routing and __PAGES__ injection — so the
// render mechanism is guaranteed (no V2-style post-hoc patching).
import { hexToRgb } from './palette.mjs';

function rgbStr(hex) { return hexToRgb(hex).join(', '); }

function navItem(p, active) {
  return `<button class="nav-item${active ? ' active' : ''}" data-page="${p.id}" onclick="loadPage('${p.id}')">
      <i data-lucide="${p.icon}"></i><span>${p.title}</span>
    </button>`;
}

function bottomItem(p, active) {
  return `<button class="bn-item${active ? ' active' : ''}" data-page="${p.id}" onclick="loadPage('${p.id}')">
      <i data-lucide="${p.icon}"></i><span>${p.title}</span>
    </button>`;
}

export function buildShell({ brief, pages, pagesData }) {
  const pal = brief.palette;
  const fonts = brief.fonts;
  // Art direction (full design system). Falls back to the base palette/fonts when
  // an older caller passes no `art`, so the deterministic render never breaks.
  const art = brief.art || {};
  const ty = art.type || {};
  const tok = art.tokens || {};
  const display = ty.display || fonts.display;
  const body = ty.body || fonts.body;
  const mono = ty.mono || 'JetBrains Mono';
  const dWeights = ty.displayWeights || fonts.displayWeights || '500;600;700';
  const bWeights = ty.bodyWeights || fonts.bodyWeights || '400;500;600';
  const headingStyle = ty.headingStyle || 'normal';
  const tracking = ty.letterSpacing === 'normal' ? '-0.005em' : '-0.022em';
  const displaySize = ty.scale === 'editorial-xl' ? 'clamp(40px,8vw,92px)'
    : ty.scale === 'compact' ? 'clamp(28px,4vw,44px)' : 'clamp(32px,5vw,60px)';
  const texture = art.texture || 'none';
  const T = {
    bgElev: tok.bgElev || pal.card,
    line: tok.line || pal.card,
    inkMuted: tok.inkMuted || pal.muted,
    inkDim: tok.inkDim || pal.muted,
    ok: tok.ok || '#4ade80',
    warn: tok.warn || '#fbbf24',
    risk: tok.risk || '#f87171',
    contrast: tok.contrast || pal.text,
  };
  const primRgb = rgbStr(pal.primary);
  const accentRgb = rgbStr(pal.accent);

  const grainCss = `body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:.04;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");}`;
  const glowCss = `.app{position:relative;z-index:1;}body::after{content:"";position:fixed;top:-15%;left:50%;transform:translateX(-50%);width:90vw;height:70vh;pointer-events:none;z-index:0;background:radial-gradient(ellipse at center,rgba(var(--primary-rgb),0.13),rgba(var(--accent-rgb),0.05) 35%,transparent 65%);}`;
  const textureCss = texture === 'grain' ? grainCss : texture === 'glow' ? glowCss : '';
  const accentHeadingCss = headingStyle === 'italic-accent'
    ? `h1 em,h2 em,h3 em,.font-display em{font-style:italic;color:var(--accent);font-weight:inherit;}`
    : '';

  const defaultPage = pages.find((p) => ['home', 'dashboard', 'landing'].includes(p.id))?.id || pages[0].id;
  const initials = (brief.name || 'Fatline').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const fam = (name, w) => `family=${encodeURIComponent(name)}:wght@${w}`;
  const fontLink =
    `https://fonts.googleapis.com/css2?` +
    `${fam(display, dWeights)}&${fam(body, bWeights)}&${fam(mono, '400;500')}&display=swap`;

  const pagesJson = JSON.stringify(pagesData).replace(/<\//g, '<\\/');

  const navDesktop = pages.map((p) => navItem(p, p.id === defaultPage)).join('\n      ');
  // bottom nav: max 5 items
  const navBottom = pages.slice(0, 5).map((p) => bottomItem(p, p.id === defaultPage)).join('\n      ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${brief.name || 'Fatline App'}</title>
<meta name="description" content="${(brief.tagline || '').replace(/"/g, '&quot;')}">
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontLink}" rel="stylesheet">
<script src="https://unpkg.com/lucide@latest"></script>
<script>
tailwind.config = {
  theme: { extend: {
    colors: { brand: '${pal.primary}', accent: '${pal.accent}', ink: '${pal.bg}', card: '${pal.card}',
      'bg-elev': '${T.bgElev}', line: '${T.line}', 'ink-muted': '${T.inkMuted}', 'ink-dim': '${T.inkDim}',
      ok: '${T.ok}', warn: '${T.warn}', risk: '${T.risk}' },
    fontFamily: { display: ['${display}','serif'], body: ['${body}','sans-serif'], mono: ['${mono}','monospace'] }
  } }
};
</script>
<style>
  :root{
    --primary:${pal.primary}; --primary-rgb:${primRgb};
    --accent:${pal.accent}; --accent-rgb:${accentRgb};
    --bg:${pal.bg}; --bg-elev:${T.bgElev}; --card:${pal.card}; --line:${T.line};
    --text:${pal.text}; --contrast:${T.contrast};
    --muted:${T.inkMuted}; --ink-muted:${T.inkMuted}; --ink-dim:${T.inkDim};
    --ok:${T.ok}; --warn:${T.warn}; --risk:${T.risk};
    --font-display:'${display}',serif; --font-body:'${body}',sans-serif; --font-mono:'${mono}',ui-monospace,monospace;
    --display-size:${displaySize};
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;overflow-x:hidden;max-width:100%;}
  body{background:var(--bg);color:var(--text);font-family:var(--font-body);-webkit-font-smoothing:antialiased;line-height:1.6;}
  ${textureCss}
  h1,h2,h3,h4,.font-display{font-family:var(--font-display);letter-spacing:${tracking};line-height:1.06;}
  ${accentHeadingCss}
  .eyebrow{font-family:var(--font-mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);display:inline-flex;align-items:center;gap:10px;}
  .eyebrow::before{content:"";width:22px;height:1px;background:currentColor;opacity:.7;}
  a{color:inherit;text-decoration:none;}
  ::selection{background:rgba(var(--primary-rgb),0.35);}
  img{display:block;max-width:100%;}
  /* layout */
  .app{display:flex;min-height:100vh;}
  .sidebar{width:248px;flex-shrink:0;background:linear-gradient(180deg, color-mix(in srgb,var(--card) 92%, #000) 0%, var(--bg) 100%);
    border-right:1px solid rgba(var(--primary-rgb),0.10);padding:22px 16px;position:sticky;top:0;height:100vh;display:flex;flex-direction:column;gap:6px;}
  .brand{display:flex;align-items:center;gap:11px;padding:6px 8px 18px;}
  .brand .logo{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-weight:800;color:#fff;
    background:linear-gradient(135deg,var(--primary),var(--accent));box-shadow:0 6px 20px rgba(var(--primary-rgb),0.4);font-family:var(--font-display);}
  .brand .bname{font-weight:700;font-size:15px;}
  .brand .btag{font-size:11px;color:var(--muted);}
  .nav-item{display:flex;align-items:center;gap:12px;width:100%;padding:11px 13px;border:none;background:transparent;color:var(--muted);
    border-radius:11px;cursor:pointer;font-size:14px;font-weight:500;font-family:var(--font-body);transition:all .18s ease;text-align:left;}
  .nav-item:hover{background:rgba(var(--primary-rgb),0.08);color:var(--text);}
  .nav-item.active{background:rgba(var(--primary-rgb),0.14);color:#fff;box-shadow:inset 0 0 0 1px rgba(var(--primary-rgb),0.25);}
  .nav-item i,.bn-item i{width:18px;height:18px;}
  .nav-foot{margin-top:auto;padding:12px 8px 0;border-top:1px solid rgba(var(--primary-rgb),0.08);font-size:12px;color:var(--muted);}
  .main{flex:1;min-width:0;display:flex;flex-direction:column;}
  .topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 30px;position:sticky;top:0;z-index:20;
    background:color-mix(in srgb,var(--bg) 82%, transparent);backdrop-filter:blur(14px);border-bottom:1px solid rgba(var(--primary-rgb),0.08);}
  .topbar .tt{font-size:13px;color:var(--muted);}
  .topbar .actions{display:flex;align-items:center;gap:12px;}
  #page-content{padding:0 0 80px;animation:fadeUp .5s ease both;overflow-x:auto;max-width:100%;}
  #page-content img{max-width:100%;}
  #page-content > *{max-width:100%;}
  #page-content.exiting{opacity:0;transform:translateY(10px);transition:all .2s ease;}
  /* component vocabulary the LLM is told to use */
  .btn{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;border-radius:12px;font-weight:600;font-size:14px;cursor:pointer;border:none;transition:all .2s ease;}
  .btn-primary{background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;box-shadow:0 8px 24px rgba(var(--primary-rgb),0.35);}
  .btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(var(--primary-rgb),0.5);}
  .btn-ghost{background:transparent;color:var(--text);border:1px solid rgba(var(--primary-rgb),0.3);}
  .btn-ghost:hover{background:rgba(var(--primary-rgb),0.08);}
  .pill{display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.04em;
    background:rgba(var(--primary-rgb),0.12);color:var(--accent);border:1px solid rgba(var(--primary-rgb),0.22);text-transform:uppercase;}
  .card{background:linear-gradient(160deg, color-mix(in srgb,var(--card) 96%, #fff) 0%, var(--card) 100%);
    border:1px solid rgba(var(--primary-rgb),0.10);border-radius:18px;padding:24px;transition:all .25s ease;}
  .card:hover{transform:translateY(-4px);border-color:rgba(var(--primary-rgb),0.28);box-shadow:0 18px 40px rgba(0,0,0,0.35);}
  .stat{font-family:var(--font-display);font-size:30px;font-weight:700;color:#fff;}
  .muted{color:var(--muted);}
  .accent{color:var(--accent);}
  .glass{background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.08);border-radius:18px;}
  .gradient-text{background:linear-gradient(120deg,var(--text),var(--accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
  .divider{height:1px;background:linear-gradient(90deg,transparent,rgba(var(--primary-rgb),0.4),transparent);}
  table{width:100%;border-collapse:collapse;}
  th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:12px 14px;border-bottom:1px solid rgba(var(--primary-rgb),0.12);}
  td{padding:14px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;}
  tr:hover td{background:rgba(var(--primary-rgb),0.04);}
  .badge{display:inline-block;padding:3px 11px;border-radius:999px;font-size:12px;font-weight:600;}
  .badge-green{background:rgba(34,197,94,0.15);color:#4ade80;}
  .badge-amber{background:rgba(245,158,11,0.15);color:#fbbf24;}
  .badge-red{background:rgba(239,68,68,0.15);color:#f87171;}
  .stagger>*{opacity:0;animation:fadeUp .6s ease forwards;}
  .stagger>*:nth-child(1){animation-delay:.05s}.stagger>*:nth-child(2){animation-delay:.12s}
  .stagger>*:nth-child(3){animation-delay:.19s}.stagger>*:nth-child(4){animation-delay:.26s}
  .stagger>*:nth-child(5){animation-delay:.33s}.stagger>*:nth-child(6){animation-delay:.40s}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .bottom-nav{display:none;}
  ::-webkit-scrollbar{width:9px;height:9px}::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(var(--primary-rgb),0.3);border-radius:9px}
  /* mobile */
  @media(max-width:860px){
    .sidebar{display:none!important;}
    .topbar{padding:14px 18px;}
    #page-content{padding-bottom:96px;}
    .bottom-nav{display:flex!important;position:fixed;bottom:0;left:0;right:0;z-index:50;justify-content:space-around;
      padding:9px 6px env(safe-area-inset-bottom);background:color-mix(in srgb,var(--card) 96%, #000);border-top:1px solid rgba(var(--primary-rgb),0.18);backdrop-filter:blur(16px);}
    .bn-item{display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;color:var(--muted);font-size:10px;font-weight:600;cursor:pointer;flex:1;}
    .bn-item.active{color:var(--accent);}
  }
</style>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="brand">
      <div class="logo">${initials}</div>
      <div><div class="bname">${brief.name || 'Fatline'}</div><div class="btag">${brief.navTag || brief.tagline?.slice(0, 28) || ''}</div></div>
    </div>
    ${navDesktop}
    <div class="nav-foot">Powered by Fatline</div>
  </aside>
  <div class="main">
    <header class="topbar">
      <div class="tt">${brief.tagline || ''}</div>
      <div class="actions">
        <span class="pill"><i data-lucide="circle-dot" style="width:13px;height:13px"></i> Live</span>
        <button class="btn btn-primary" style="padding:9px 18px" onclick="window.ProdusaAuth&&window.ProdusaAuth.signIn?window.ProdusaAuth.signIn():null">${brief.ctaPrimary || 'Get Started'}</button>
      </div>
    </header>
    <main id="page-content"></main>
  </div>
</div>
<nav class="bottom-nav">
  ${navBottom}
</nav>
<script>window.__PAGES__ = ${pagesJson};</script>
<script>
  function _icons(){ try{ if(window.lucide) lucide.createIcons(); }catch(e){} }
  function loadPage(name){
    var html = (window.__PAGES__ && window.__PAGES__[name]) || '';
    var el = document.getElementById('page-content');
    if(!el) return;
    if(!html){ name = ${JSON.stringify(defaultPage)}; html = (window.__PAGES__||{})[name] || ''; }
    el.classList.add('exiting');
    setTimeout(function(){
      el.innerHTML = html;
      el.classList.remove('exiting');
      el.style.opacity='0'; el.style.transform='translateY(12px)';
      requestAnimationFrame(function(){
        el.style.transition='opacity .35s ease, transform .35s ease';
        el.style.opacity='1'; el.style.transform='translateY(0)';
      });
      _icons();
      window.scrollTo(0,0);
    }, 180);
    document.querySelectorAll('.nav-item,.bn-item').forEach(function(i){i.classList.remove('active');});
    document.querySelectorAll('[data-page="'+name+'"]').forEach(function(a){a.classList.add('active');});
    try{ history.replaceState(null,'','#'+name); }catch(e){}
  }
  window.addEventListener('message', function(e){ if(e.data && e.data.page) loadPage(e.data.page); });
  window.addEventListener('hashchange', function(){ var h=location.hash.replace('#',''); if(h && window.__PAGES__[h]) loadPage(h); });
  document.addEventListener('DOMContentLoaded', function(){
    _icons();
    var h = location.hash.replace('#','');
    loadPage(h && window.__PAGES__[h] ? h : ${JSON.stringify(defaultPage)});
  });
</script>
</body>
</html>`;
}
