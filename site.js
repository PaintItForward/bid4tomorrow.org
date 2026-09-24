/* site.js — shared nav, footer and dark mode for EVERY page.
   Usage: one line just before </body>:  <script src="site.js"></script>
   To add, remove or rename a link anywhere on the site, edit the arrays below. */
(function () {
  'use strict';

  /* ═══════════ 1. EDIT THESE ═══════════ */
  var NAV = [                                   // [label, href, optional extra class]
    ['About', 'about.html'],
    ['Branches', 'branches.html'],
    ['Fall 26 Auction ↗', 'auction.html', 'nav-badge-pill'],
    ['Volunteer', 'volunteer.html']
  ];
  var EXPLORE = [                               // "Explore" dropdown (home-page sections)
    ['Gallery', 'index.html#artwork'], ['How It Works', 'index.html#how-it-works'],
    ['Impact', 'index.html#impact'], ['Causes', 'index.html#causes'],
    ['FAQ', 'index.html#faq'], ['Contact', 'index.html#contact']
  ];
  var ACCOUNT = [                               // shown when signed in (and in the footer)
    ['My Account', 'account.html'], ['My Bids', 'my-bids.html'],
    ['Winning Bids', 'winning-bids.html'], ['Watchlist', 'watchlist.html']
  ];
  var FOOTER = {                                // footer columns: every page should appear somewhere here or in NAV
    'Explore': [['About Us', 'about.html'], ['Our Branches', 'branches.html'], ['Fall 26 Auction', 'auction.html'],
                ['Gallery', 'index.html#artwork'], ['Causes We Support', 'index.html#causes'], ['FAQ', 'index.html#faq']],
    'Get Involved': [['Submit Artwork', 'https://form.jotform.com/261786048210052'], ['Bid on Artwork', 'auction.html'],
                     ['Volunteer With Us', 'volunteer.html'], ['Volunteer Hours Policy', 'volunteer-hours-policy.html'],
                     ['Contact Us', 'index.html#contact']],
    'Account': [['Log in', 'login.html'], ['Sign up', 'signup.html']].concat(ACCOUNT),
    'Connect': [['Email Us', 'mailto:bid4tomorrow@gmail.com'], ['Instagram', 'https://www.instagram.com/bid4tomorrow/']]
  };
  var PARENT = {                                // pages that live "under" a nav item → highlight that item
    'artwork-detail.html': 'auction.html',
    'volunteer-hours-policy.html': 'volunteer.html',
    'signup.html': 'login.html',
    'reset-password.html': 'login.html'
  };
  var SB_KEY = 'sb-zezgamocqdkqfaqzompd-auth-token'; // where Supabase keeps the login session

  /* ═══════════ 2. HELPERS ═══════════ */
  var page = location.pathname.split('/').pop() || 'index.html';
  if (page.indexOf('.') < 0) page += '.html';   // hosts that serve /about instead of /about.html
  page = PARENT[page] || page;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function a(l, cls) {
    var here = l[1] === page, c = ((cls || '') + (here ? ' active' : '')).trim();
    return '<a href="' + l[1] + '"' + (c ? ' class="' + c + '"' : '') + (here ? ' aria-current="page"' : '') +
      (/^https?:/.test(l[1]) ? ' target="_blank" rel="noopener"' : '') + '>' + l[0] + '</a>';
  }
  function menu(label, items, extra) {
    return '<li class="has-sub"><button type="button" class="sub-btn" aria-expanded="false" aria-haspopup="true">' + label +
      ' ▾</button><ul class="sub">' + items.map(function (l) { return '<li>' + a(l) + '</li>'; }).join('') + (extra || '') + '</ul></li>';
  }

  /* ═══════════ 3. NAV ═══════════ */
  var user = null;
  try { var s = JSON.parse(localStorage.getItem(SB_KEY)); user = s && s.user; } catch (e) {}
  var who = user && ((user.user_metadata && user.user_metadata.full_name) || (user.email || 'Account').split('@')[0]);
  if (who && who.length > 14) who = who.slice(0, 13) + '…';
  var auth = user ? menu(esc(who), ACCOUNT, '<li><a href="#" id="sign-out">Sign out</a></li>')
                  : '<li>' + a(['Log in', 'login.html']) + '</li>';

  var oldNav = document.getElementById('main-nav'); if (oldNav) oldNav.remove();   // safety net for un-migrated pages
  var nav = document.createElement('nav');
  nav.id = 'main-nav'; nav.setAttribute('aria-label', 'Main navigation');
  nav.innerHTML =
    '<div class="nav-inner">' +
      '<a href="index.html" class="nav-logo" aria-label="Bid For Tomorrow home"><div class="nav-logo-mark" aria-hidden="true">' +
        '<img src="favicon-180x180.png" alt="" style="width:100%;height:100%;object-fit:cover"></div>Bid For Tomorrow</a>' +
      '<ul class="nav-links" id="nav-links">' +
        NAV.map(function (l) { return '<li>' + a(l, l[2]) + '</li>'; }).join('') +
        menu('Explore', EXPLORE) + auth +
        '<li><a href="index.html#get-involved" class="nav-cta">Get Involved</a></li>' +
      '</ul>' +
      '<button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Toggle navigation"><span></span><span></span><span></span></button>' +
    '</div>';
  document.body.prepend(nav);

  var links = document.getElementById('nav-links'), toggle = document.getElementById('nav-toggle');
  function closeMenus() {
    document.querySelectorAll('.has-sub.open').forEach(function (m) {
      m.classList.remove('open'); m.firstChild.setAttribute('aria-expanded', 'false');
    });
  }
  toggle.onclick = function () { toggle.setAttribute('aria-expanded', links.classList.toggle('open')); };
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.sub-btn');
    if (btn) {
      var m = btn.parentNode, open = !m.classList.contains('open');
      closeMenus(); m.classList.toggle('open', open); btn.setAttribute('aria-expanded', open);
      return;
    }
    closeMenus();
    if (e.target.closest('#nav-links a')) links.classList.remove('open');      // close mobile menu after a tap
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenus(); links.classList.remove('open'); } });

  var so = document.getElementById('sign-out');
  if (so) so.onclick = function (e) {
    e.preventDefault();
    var done = function () { try { localStorage.removeItem(SB_KEY); } catch (x) {} location.href = 'index.html'; };
    if (window.supabaseClient) window.supabaseClient.auth.signOut().then(done, done); else done();
  };

  /* ═══════════ 4. FOOTER ═══════════ */
  var oldFoot = document.querySelector('body > footer'); if (oldFoot) oldFoot.remove();
  var foot = document.createElement('footer'); foot.setAttribute('role', 'contentinfo');
  foot.innerHTML = '<div class="footer-inner"><div class="footer-top">' +
    '<div class="footer-brand"><a href="index.html" class="footer-logo">Bid For Tomorrow</a>' +
    '<p>Turning Creativity Into Impact. A student-led nonprofit giving young artists a platform while supporting youth physical and mental health in North America.</p>' +
    '<p class="footer-note">Registered Nonprofit.</p></div>' +
    Object.keys(FOOTER).map(function (h) {
      return '<div class="footer-col"><h4>' + h + '</h4><ul>' + FOOTER[h].map(function (l) { return '<li>' + a(l) + '</li>'; }).join('') + '</ul></div>';
    }).join('') +
    '</div><div class="footer-bottom"><p>&copy; ' + new Date().getFullYear() +
    ' Bid For Tomorrow. All rights reserved. Nonprofit, Greater Toronto Area &amp; Massachusetts.</p></div></div>';
  document.body.appendChild(foot);

  /* ═══════════ 5. DARK MODE (one key, one behaviour, every page) ═══════════ */
  document.querySelectorAll('.dark-toggle').forEach(function (b) { b.remove(); });
  var KEY = 'bft-theme', dark = false;
  try { dark = (localStorage.getItem(KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark'; } catch (e) {}
  var MOON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  var SUN = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
  var tb = document.createElement('button');
  tb.className = 'dark-toggle'; tb.id = 'theme-toggle'; tb.title = 'Toggle dark mode';
  tb.setAttribute('aria-label', 'Toggle dark mode'); tb.innerHTML = '<svg viewBox="0 0 24 24"></svg>';
  document.body.appendChild(tb);
  function paint() {
    document.documentElement.classList.toggle('dark', dark);
    document.body.classList.toggle('dark', dark);       // styles.css uses body.dark
    tb.firstChild.innerHTML = dark ? SUN : MOON;
  }
  tb.onclick = function () { dark = !dark; try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) {} paint(); };
  paint();

  /* ═══════════ 6. FADE-UP REVEAL (any element with class "fade-up") ═══════════ */
  var fades = document.querySelectorAll('.fade-up');
  if (fades.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es, o) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); o.unobserve(e.target); } });
    }, { threshold: 0.08 });
    fades.forEach(function (el) { io.observe(el); });
  } else fades.forEach(function (el) { el.classList.add('visible'); });
})();
