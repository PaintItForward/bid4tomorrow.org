/* assets/js/main.js */
(function () {
  // Mobile nav
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.nav-links a').forEach(a =>
      a.addEventListener('click', () => navLinks.classList.remove('open'))
    );
  }

  // Dark mode
  const darkBtn = document.getElementById('dark-toggle');
  const iconEl = document.getElementById('toggle-icon');
  const moonPath = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
  const sunPath = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';

  const setTheme = (dark) => {
    document.body.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('dark', dark);
    if (iconEl) iconEl.innerHTML = dark ? sunPath : moonPath;
  };

  if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme(true);
  darkBtn?.addEventListener('click', () => setTheme(!document.body.classList.contains('dark')));

  // API wrapper
  window.PIF = {
    apiBase: '/api',
    async request(path, options = {}) {
      const res = await fetch(this.apiBase + path, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
      }
      return res.json();
    },

    fmtRemaining(ms) {
      if (ms <= 0) return null;
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      if (d > 0) return `${d}d ${h}h ${m}m`;
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
    },

    formatTimeAgo(iso) {
      const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (seconds < 60) return 'just now';
      const mins = Math.floor(seconds / 60);
      if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
      const days = Math.floor(hours / 24);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    },

    startCountdown(el, endISO) {
      const tick = () => {
        const rem = new Date(endISO).getTime() - Date.now();
        if (rem <= 0) {
          el.textContent = 'Auction closed';
          el.closest('[data-countdown]')?.classList.add('closed');
          return;
        }
        const d = Math.floor(rem / 86400000);
        const h = Math.floor((rem % 86400000) / 3600000);
        const m = Math.floor((rem % 3600000) / 60000);
        const s = Math.floor((rem % 60000) / 1000);
        el.textContent = d > 0
          ? `${d} DAYS · ${String(h).padStart(2,'0')} HOURS · ${String(m).padStart(2,'0')} MINUTES`
          : `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      };
      tick();
      const id = setInterval(tick, 1000);
      el.dataset.interval = id;
    }
  };

  // Auto-run countdowns on elements with [data-countdown]
  document.querySelectorAll('[data-countdown]').forEach(el => {
    const end = el.dataset.countdown;
    if (end) PIF.startCountdown(el, end);
  });
})();
