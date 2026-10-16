/**
 * Flappy Bird - Online Leaderboard
 *
 * One entry per player: the first time you finish a run you pick a name, and after that
 * every run quietly updates the SAME entry (your best score), so there are no duplicates.
 * Entries are stored under a random per-browser player id in a Firebase Realtime Database
 * over plain REST (no SDK, no build step). Until you paste your database URL below, the
 * board runs in "local" mode and shows scores from this device only. See README.md.
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
  const ID_KEY = 'flappy_player_id';
  const LOCAL_KEY = 'flappy_local_scores';
  const MAX_NAME = 12;
  const MAX_SCORE = 500; // keep in sync with the database rule in README.md

  const $ = (id) => document.getElementById(id);
  const overlay = $('lb-overlay');
  if (!overlay) return;

  const ui = {
    status: $('lb-status'),
    note: $('lb-note'),
    player: $('lb-player'),
    playerName: $('lb-player-name'),
    rename: $('lb-rename'),
    submit: $('lb-submit'),
    scoreLine: $('lb-score-line'),
    score: $('lb-score'),
    hint: $('lb-hint'),
    name: $('lb-name'),
    submitBtn: $('lb-submit-btn'),
    list: $('lb-list'),
    closeBtn: $('lb-close'),
    openBtn: $('best-btn')
  };

  const baseURL = CONFIG.databaseURL.trim().replace(/\/+$/, '');
  const isOnline = baseURL.length > 0;

  // ---------- storage helpers ----------
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  function cleanName(raw) {
    return String(raw || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, MAX_NAME);
  }

  function makeId() {
    try {
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      let s = '';
      while (s.length < 24) s += Math.random().toString(16).slice(2);
      return s.slice(0, 24);
    }
  }

  // Identity of this player on this browser (random id + chosen name)
  let playerId = safeGet(ID_KEY);
  if (!/^[a-z0-9]{16,40}$/.test(playerId || '')) {
    playerId = makeId();
    safeSet(ID_KEY, playerId);
  }
  let playerName = cleanName(safeGet(NAME_KEY));

  let visible = false;
  let lastScore = null;   // score of the run that just ended (display only)
  let unsynced = 0;       // best score not yet saved (waiting for a name, or a failed save)
  let formMode = null;    // 'first' | 'rename' | null

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

  // One row per player: replace this player's row instead of adding another
  function saveLocal(entry) {
    const rows = sortScores(readLocal().filter(r => r.id !== entry.id).concat(entry)).slice(0, 20);
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

  const ownURL = () => `${baseURL}/${CONFIG.collection}/${playerId}.json`;

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

  // Saves this player's best score + name into their single entry.
  // Only writes when something actually changed.
  async function pushScore(rawScore) {
    const score = Math.min(MAX_SCORE, Math.max(0, Math.floor(rawScore || 0)));
    const name = playerName;

    const mine = readLocal().find(r => r.id === playerId);
    const prevLocal = mine ? mine.score : 0;
    const localBest = Math.max(prevLocal, score);
    if (localBest > 0) saveLocal({ id: playerId, name, score: localBest, ts: Date.now() });
    if (!isOnline) return { best: localBest, improved: score > prevLocal };

    const existing = await request(ownURL()); // null when this player has no entry yet
    const prev = existing ? Number(existing.score) || 0 : 0;
    const best = Math.max(prev, score);
    if (!existing && best <= 0) return { best: 0, improved: false };
    if (existing && best === prev && existing.name === name) return { best, improved: false };

    await request(ownURL(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score: best, ts: { '.sv': 'timestamp' } })
    });
    return { best, improved: score > prev };
  }

  // Saves are queued so two quick runs can never race each other
  let queue = Promise.resolve();
  function syncScore(score) {
    const run = async () => {
      const attempt = Math.max(score || 0, unsynced);
      setNote('Saving…');
      try {
        const r = await pushScore(attempt);
        unsynced = 0;
        if (r.improved) setNote(`New best saved: ${r.best}!`);
        else if (r.best > 0) setNote(`Your best is still ${r.best}.`);
        else setNote('');
        if (visible) refresh(true);
      } catch (e) {
        unsynced = Math.max(unsynced, attempt);
        setNote("Couldn't save your score. It will retry next time.");
      }
    };
    queue = queue.then(run);
    return queue;
  }

  // ---------- rendering ----------
  function setStatus(text) { ui.status.textContent = text; }
  function setNote(text) { ui.note.textContent = text; }

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
      if (row.id === playerId) li.classList.add('me');

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
    if (isOnline) pollTimer = setInterval(() => refresh(true), CONFIG.pollMs);
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

  // ---------- name form (first run, or "Change name") ----------
  function updatePlayerStrip() {
    ui.player.classList.toggle('hidden', !playerName);
    ui.playerName.textContent = playerName;
  }

  function showForm(mode) {
    formMode = mode;
    ui.submit.classList.remove('hidden');
    ui.scoreLine.classList.toggle('hidden', mode === 'rename');
    ui.score.textContent = unsynced || lastScore || 0;
    ui.hint.textContent = mode === 'first'
      ? "Pick a name for the leaderboard. You'll only be asked once."
      : 'Your best score moves to the new name. No duplicate entry is created.';
    ui.submitBtn.textContent = mode === 'first' ? 'Save' : 'Save name';
    ui.name.value = playerName;
    setTimeout(() => ui.name.focus({ preventScroll: true }), 60);
  }

  function hideForm() {
    formMode = null;
    ui.submit.classList.add('hidden');
  }

  function submitName() {
    const name = cleanName(ui.name.value);
    if (!name) {
      setNote('Type a name to continue.');
      return;
    }
    const changed = name !== playerName;
    playerName = name;
    safeSet(NAME_KEY, name);
    hideForm();
    updatePlayerStrip();
    if (changed || unsynced > 0) syncScore(0); // pushes any waiting score and/or renames the entry
  }

  // ---------- open / close ----------
  function open() {
    if (!api.canOpen()) return;
    visible = true;
    overlay.classList.remove('hidden');
    updatePlayerStrip();

    if (!playerName) showForm('first');
    else if (formMode !== 'rename') hideForm();
    if (playerName && unsynced > 0) syncScore(0); // retry a save that failed earlier

    refresh();
    startPolling();
  }

  function close() {
    visible = false;
    overlay.classList.add('hidden');
    stopPolling();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  // ---------- events ----------
  ui.submitBtn.addEventListener('click', submitName);
  ui.rename.addEventListener('click', () => showForm('rename'));
  ui.closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  ui.name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitName(); } });
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
    async submitSuggestion(category, suggestion) {
      if (!isOnline) throw new Error('Suggestion submissions are not configured.');
      const allowedCategories = ['Pipe', 'Skin', 'Audio'];
      const text = String(suggestion || '').trim().slice(0, 120);
      if (!allowedCategories.includes(category) || !text) throw new Error('Enter a suggestion and choose a category.');
      const url = `${baseURL}/suggestions.json`;
      return request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, suggestion: text, ts: { '.sv': 'timestamp' } })
      });
    },
    // Called when a run ends with a score above zero
    setPending(score) {
      lastScore = score;
      if (playerName) {
        syncScore(score);            // known player: save silently, no form
      } else {
        unsynced = Math.max(unsynced, score); // keep it until they pick a name
      }
    },
    clearPending() {
      lastScore = null;
    }
  };
  window.FlappyLeaderboard = api;

  // Ask first-time visitors for a leaderboard name as soon as the page loads.
  // Existing visitors with a saved name continue straight into the game.
  if (!playerName) open();
})();
