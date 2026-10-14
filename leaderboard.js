/**
 * Flappy Bird - Online Leaderboard
 *
 * Talks to a Firebase Realtime Database over plain REST (no SDK, no build step).
 * Until you paste your database URL below, the board runs in "local" mode and
 * shows the scores saved on this device only. See README.md for the 2-minute setup.
 */
(() => {
  'use strict';

  const CONFIG = {
    // e.g. 'https://your-project-default-rtdb.firebaseio.com'
    databaseURL: 'https://flappy-bird-ae650-default-rtdb.asia-southeast1.firebasedatabase.app/',
    collection: 'scores',
    topN: 10,
    timeoutMs: 6000,
    pollMs: 5000 // how often an open board re-fetches so every player sees new scores
  };

  const NAME_KEY = 'flappy_player_name';
  const LOCAL_KEY = 'flappy_local_scores';
  const MAX_NAME = 12;
  const MAX_SCORE = 500; // keep in sync with the database rule in README.md

  const $ = (id) => document.getElementById(id);
  const overlay = $('lb-overlay');
  if (!overlay) return;

  const ui = {
    status: $('lb-status'),
    submit: $('lb-submit'),
    score: $('lb-score'),
    name: $('lb-name'),
    submitBtn: $('lb-submit-btn'),
    list: $('lb-list'),
    closeBtn: $('lb-close'),
    openBtn: $('best-btn')
  };

  const baseURL = CONFIG.databaseURL.trim().replace(/\/+$/, '');
  const isOnline = baseURL.length > 0;

  let visible = false;
  let busy = false;
  let pendingScore = null;
  let submitted = false;
  let myId = null;
  let localId = null;

  // ---------- storage helpers ----------
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  function cleanName(raw) {
    const cleaned = String(raw || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, MAX_NAME);
    return cleaned || 'ANON';
  }

  function sortScores(rows) {
    return rows.sort((a, b) => b.score - a.score || (a.ts || 0) - (b.ts || 0));
  }

  function readLocal() {
    try {
      const rows = JSON.parse(safeGet(LOCAL_KEY) || '[]');
      return Array.isArray(rows) ? rows.filter(r => r && typeof r.score === 'number') : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocal(entry) {
    const rows = sortScores(readLocal().concat(entry)).slice(0, 20);
    safeSet(LOCAL_KEY, JSON.stringify(rows));
  }

  // ---------- network ----------
  async function request(url, options = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CONFIG.timeoutMs);
    try {
      const res = await fetch(url, { cache: 'no-store', ...options, signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchOnline() {
    const url = `${baseURL}/${CONFIG.collection}.json?orderBy=%22score%22&limitToLast=${CONFIG.topN}`;
    const data = await request(url);
    const rows = data
      ? Object.entries(data).map(([id, v]) => ({
          id,
          name: String((v && v.name) || 'ANON'),
          score: Number(v && v.score) || 0,
          ts: Number(v && v.ts) || 0
        }))
      : [];
    return sortScores(rows);
  }

  function postOnline(name, score) {
    return request(`${baseURL}/${CONFIG.collection}.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score, ts: { '.sv': 'timestamp' } })
    });
  }

  // ---------- rendering ----------
  function setStatus(text) {
    ui.status.textContent = text;
  }

  function render(rows) {
    ui.list.textContent = '';
    if (!rows.length) {
      const li = document.createElement('li');
      li.className = 'lb-empty';
      li.textContent = 'No scores yet. Set the first one!';
      ui.list.appendChild(li);
      return;
    }
    rows.slice(0, CONFIG.topN).forEach((row, i) => {
      const li = document.createElement('li');
      if (myId && row.id === myId) li.classList.add('me');

      const rank = document.createElement('span');
      rank.className = 'lb-rank';
      rank.textContent = ['🥇', '🥈', '🥉'][i] || String(i + 1);

      const name = document.createElement('span');
      name.className = 'lb-name';
      name.textContent = row.name;

      const pts = document.createElement('span');
      pts.className = 'lb-pts';
      pts.textContent = row.score;

      li.append(rank, name, pts);
      ui.list.appendChild(li);
    });
  }

  let pollTimer = null;
  let refreshing = false;

  function startPolling() {
    stopPolling();
    if (isOnline) pollTimer = setInterval(() => { if (!busy) refresh(true); }, CONFIG.pollMs);
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  async function refresh(silent = false) {
    if (refreshing) return;
    refreshing = true;
    try {
      await loadBoard(silent);
    } finally {
      refreshing = false;
    }
  }

  async function loadBoard(silent) {
    if (!silent) setStatus('Loading scores…');
    if (!isOnline) {
      render(sortScores(readLocal()));
      setStatus('Showing scores from this device. The online board is not set up yet.');
      return;
    }
    try {
      render(await fetchOnline());
      setStatus(`Global top ${CONFIG.topN} · live`);
    } catch (e) {
      render(sortScores(readLocal()));
      setStatus("Can't reach the server. Showing scores from this device.");
    }
  }

  // ---------- actions ----------
  async function submit() {
    if (busy || submitted || pendingScore == null) return;

    const score = Math.min(MAX_SCORE, Math.max(0, Math.floor(pendingScore)));
    const name = cleanName(ui.name.value);
    ui.name.value = name === 'ANON' ? '' : name;
    safeSet(NAME_KEY, ui.name.value);

    busy = true;
    ui.submitBtn.disabled = true;
    setStatus('Submitting…');

    if (!localId) {
      localId = 'local-' + Date.now();
      saveLocal({ id: localId, name, score, ts: Date.now() });
    }

    if (isOnline) {
      try {
        const res = await postOnline(name, score);
        myId = res && res.name;
      } catch (e) {
        busy = false;
        ui.submitBtn.disabled = false;
        setStatus("Couldn't submit. Check your connection and try again.");
        return;
      }
    } else {
      myId = localId;
    }

    submitted = true;
    busy = false;
    ui.submit.classList.add('hidden');
    await refresh();
    setStatus('Score submitted!');
  }

  function open() {
    if (!api.canOpen()) return;
    visible = true;
    overlay.classList.remove('hidden');

    const canSubmit = pendingScore != null && !submitted;
    ui.submit.classList.toggle('hidden', !canSubmit);
    if (canSubmit) {
      ui.score.textContent = pendingScore;
      ui.name.value = safeGet(NAME_KEY) || ui.name.value || '';
      ui.submitBtn.disabled = false;
      setTimeout(() => ui.name.focus({ preventScroll: true }), 60);
    }
    refresh();
    startPolling();
  }

  function close() {
    visible = false;
    stopPolling();
    overlay.classList.add('hidden');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  // ---------- events ----------
  ui.submitBtn.addEventListener('click', submit);
  ui.closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  ui.name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  document.addEventListener('keydown', (e) => { if (visible && e.key === 'Escape') close(); });
  if (ui.openBtn) {
    ui.openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      open();
      ui.openBtn.blur();
    });
  }

  // ---------- public API used by game.js ----------
  const api = {
    isOnline,
    isOpen: () => visible,
    canOpen: () => true,
    open,
    close,
    setPending(score) {
      pendingScore = score;
      submitted = false;
      myId = null;
      localId = null;
    },
    clearPending() {
      pendingScore = null;
      submitted = false;
      myId = null;
      localId = null;
    }
  };
  window.FlappyLeaderboard = api;
})();
