// ── Canyon Bookings — Shared JS ──────────────────────────────────────────

// ── Supabase client ───────────────────────────────────────────────────────
const { createClient } = supabase;
const sb = createClient(
  'https://akgftmrraboplxpeugvi.supabase.co',
  'sb_publishable_aobHSo8qxS8sM85c5qO1Tw_R2-8NyO7'
);

// ── Constants ─────────────────────────────────────────────────────────────
const DATA_URL = 'https://mryike.github.io/canyon-tracker/data.json';
const CANYON_ORDER = ['Empress', 'Grand Canyon', 'Narrow Neck'];
const CANYON_CHATS = [
  { id: '620164c4-642b-4185-ae6c-b983900b275b', name: 'Empress Canyon' },
  { id: '5ee03e2c-9308-4e67-b64f-c98ca7b4559d', name: 'Grand Canyon' },
  { id: '542aebcf-e059-44b4-8c24-83e9ad5bac0e', name: 'Narrow Neck' }
];

// ── Shared state (persisted in sessionStorage so it survives page navigation) ──
const State = {
  get user()    { try { return JSON.parse(sessionStorage.getItem('cb_user')); } catch { return null; } },
  set user(v)   { sessionStorage.setItem('cb_user', JSON.stringify(v)); },
  get canyon()  { return sessionStorage.getItem('cb_canyon') || 'Empress'; },
  set canyon(v) { sessionStorage.setItem('cb_canyon', v); },
  get theme()   { return sessionStorage.getItem('cb_theme') || 'light'; },
  set theme(v)  { sessionStorage.setItem('cb_theme', v); },
  get fs()      { return sessionStorage.getItem('cb_fs') || '15px'; },
  set fs(v)     { sessionStorage.setItem('cb_fs', v); },
  get data()    { try { return JSON.parse(sessionStorage.getItem('cb_data') || '{}'); } catch { return {}; } },
  set data(v)   { sessionStorage.setItem('cb_data', JSON.stringify(v)); },
  get updated() { return sessionStorage.getItem('cb_updated') || ''; },
  set updated(v){ sessionStorage.setItem('cb_updated', v); },
};

// ── Apply saved theme & font size on any page load ────────────────────────
function applyPreferences() {
  if (State.theme === 'dark') document.documentElement.classList.add('dark');
  document.documentElement.style.setProperty('--fs', State.fs);
}

// ── Auth helpers ──────────────────────────────────────────────────────────
async function requireAuth() {
  const { data: { session } } = await sb.auth.getSession().catch(() => ({ data: { session: null } }));
  if (session) {
    State.user = session.user;
    return session.user;
  }
  window.location.href = 'login.html';
  return null;
}

async function signInGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/index.html',
      queryParams: { prompt: 'select_account' }
    }
  });
  return error;
}

async function signOut() {
  await sb.auth.signOut();
  State.user = null;
  window.location.href = 'login.html';
}

// ── Data helpers ──────────────────────────────────────────────────────────
async function loadData(force = false) {
  try {
    const url = DATA_URL + (force ? `?t=${Date.now()}` : '');
    const res = await fetch(url);
    const json = await res.json();
    State.data = json.data || {};
    State.updated = json.updated || '';
    return State.data;
  } catch (e) {
    console.error('Data load failed:', e);
    return State.data; // return cached
  }
}

function sortedCanyons(data) {
  return Object.keys(data || {}).sort((a, b) => {
    const ia = CANYON_ORDER.indexOf(a), ib = CANYON_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1; if (ib === -1) return -1;
    return ia - ib;
  });
}

// ── Date helpers ──────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);

function fmtFull(s) {
  const d = new Date(s + 'T12:00:00');
  const t = todayStr();
  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  if (s === t) return 'Today';
  if (s === tom.toISOString().slice(0, 10)) return 'Tomorrow';
  return d.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric' });
}

function fmtUpdated(updatedStr) {
  if (!updatedStr) return { label: '', stale: false };
  const parts = updatedStr.match(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/);
  if (!parts) return { label: updatedStr, stale: false };
  const dt = new Date(parts[1] + 'T' + parts[2] + ':00');
  const diffMins = (Date.now() - dt.getTime()) / 60000;
  const stale = diffMins > 120;
  let label;
  if (diffMins < 90) label = `Updated ${Math.round(diffMins)}m ago`;
  else label = `Updated ${dt.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })} ${dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
  return { label, stale };
}

// ── Dropdown helper ───────────────────────────────────────────────────────
function toggleDd(id) {
  const el = document.getElementById(id);
  const isOpen = el.classList.contains('open');
  document.querySelectorAll('.filter-dd').forEach(d => d.classList.remove('open'));
  if (!isOpen) el.classList.add('open');
}

function closeDdsOnOutsideClick() {
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.filter-wrap')) {
      document.querySelectorAll('.filter-dd').forEach(d => d.classList.remove('open'));
    }
  });
}

// ── Bottom nav highlight ──────────────────────────────────────────────────
function highlightNav(page) {
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
}

// ── Bottom nav HTML (shared across all app pages) ─────────────────────────
const NAV_HTML = `
<div class="bottom-nav">
  <a class="nav-btn" href="index.html" data-page="home">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>Home
  </a>
  <a class="nav-btn" href="calendar.html" data-page="calendar">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Calendar
  </a>
  <a class="nav-btn" href="messages.html" data-page="messages">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Messages
  </a>
  <a class="nav-btn" href="settings.html" data-page="settings">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>Settings
  </a>
</div>`;

// ── Topbar HTML helper ────────────────────────────────────────────────────
function topbarHTML(title, showRefresh = false, showAvatar = true) {
  const user = State.user;
  const initials = user
    ? (user.user_metadata?.full_name || user.email || 'S').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  return `
    <div class="topbar">
      <div class="topbar-title">${title}</div>
      <div class="topbar-actions">
        ${showRefresh ? `<button class="icon-btn" onclick="refreshData()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
        </button>` : ''}
        ${showAvatar ? `<div class="avatar-ph">${initials}</div>` : ''}
      </div>
    </div>`;
}
