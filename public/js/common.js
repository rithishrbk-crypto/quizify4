(function () {
  const ICONS = {
    dashboard: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    minus: '<path d="M5 12h14"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    left: '<path d="M15 18l-6-6 6-6"/>',
    right: '<path d="M9 18l6-6-6-6"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/>',
  };
  window.$ = (s, r = document) => r.querySelector(s);
  window.icon = (name, size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  window.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const LOGO = (size = 30) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#4c8dff"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="#0b1233" stroke="rgba(255,255,255,.15)"/><circle cx="15" cy="15" r="7" fill="none" stroke="url(#lg)" stroke-width="3"/><path d="M19 19l5 5" stroke="url(#lg)" stroke-width="3" stroke-linecap="round"/></svg>`;
  window.logoHTML = () => `${LOGO()}<span>Quizify</span>`;

  window.api = async function (url, opts = {}) {
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
    });
    let data = {};
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (res.status === 401 && !opts.noRedirect) {
      location.href = '/login';
      throw Object.assign(new Error('Please log in to continue.'), { status: 401, data });
    }
    if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: res.status, data });
    return data;
  };

  window.toast = (msg, type = '') => {
    const box = $('#toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  };

  window.fmtDate = (ms) => {
    const d = new Date(ms);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  window.errorState = (msg) =>
    `<div class="glass empty"><h3>We couldn't load this page</h3><p>${esc(msg)}</p><a class="btn btn-primary" href="/dashboard">Back to dashboard</a></div>`;

  window.mountSidebar = function (active, user) {
    const el = $('#sidebar');
    if (!el) return;
    const item = (href, key, label) =>
      `<a class="nav-item ${active === key ? 'active' : ''}" href="${href}" ${active === key ? 'aria-current="page"' : ''}>${icon(key)}<span>${label}</span></a>`;
    el.innerHTML = `
      <a class="logo" href="/dashboard">${logoHTML()}</a>
      <nav class="side-nav" aria-label="Main">${item('/dashboard', 'dashboard', 'Dashboard')}${item('/history', 'history', 'Quiz history')}</nav>
      <div class="side-user">
        <div class="avatar">${esc((user.name || '?').trim().charAt(0).toUpperCase())}</div>
        <div class="who"><b>${esc(user.name)}</b><span>${esc(user.email)}</span></div>
        <button class="icon-btn" id="logout" title="Log out" aria-label="Log out">${icon('logout', 18)}</button>
      </div>`;
    $('#logout').addEventListener('click', async () => {
      try { await api('/api/auth/logout', { method: 'POST', noRedirect: true }); } finally { location.href = '/'; }
    });
  };

  document.querySelectorAll('[data-logo]').forEach((el) => (el.innerHTML = logoHTML()));
  document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 22)));
})();
