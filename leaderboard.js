/**
 * Flappy Bird - Online Leaderboard
 *
 * One entry per player: the first time you finish a run you pick a name, and after that
 * every run quietly updates the SAME entry (your best score), so there are no duplicates.
 * Scores are stored under authenticated Firebase account IDs. Username claims keep display
 * names unique. See README.md for the required Firebase Authentication and database rules.
 */
(() => {
  'use strict';

  const CONFIG = {
    // e.g. 'https://your-project-default-rtdb.firebaseio.com'
    databaseURL: 'https://flappy-bird-ae650-default-rtdb.asia-southeast1.firebasedatabase.app/',
    collection: 'scores',
    presenceCollection: 'presence',
    topN: 10,
    timeoutMs: 6000,
    pollMs: 5000, // how often an open board re-fetches so every player sees new scores
    presencePollMs: 10000,
    heartbeatMs: 30000,
    activeWindowMs: 90000
  };

  const NAME_KEY = 'flappy_player_name';
  const ID_KEY = 'flappy_player_id';
  const LOCAL_KEY = 'flappy_local_scores';
  const MAX_NAME = 12;
  const MAX_SCORE = 10000; // keep in sync with the database rule in README.md

  const $ = (id) => document.getElementById(id);
  const overlay = $('lb-overlay');
  const accountOverlay = $('account-overlay');
  if (!overlay) return;

  const ui = {
    status: $('lb-status'),
    note: $('lb-note'),
    player: $('lb-player'),
    playerName: $('lb-player-name'),
    list: $('lb-list'),
    onlineCount: $('lb-online-count'),
    onlineList: $('lb-online-list'),
    closeBtn: $('lb-close'),
    openBtn: $('best-btn'),
    accountOpenBtn: $('account-menu-btn'),
    accountCloseBtn: $('account-close')
  };

  const auth = window.firebase && firebase.auth ? firebase.auth() : null;
  const accountBox = $('lb-auth');
  const accountName = $('lb-account-name');
  const accountPassword = $('lb-password');
  const accountMessage = $('lb-auth-message');
  const USERNAME_DOMAIN = '@users.flappy-bird-ae650.firebaseapp.com';
  let accountReady = false;
  let accountBusy = false;

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

  function cleanUsername(raw) {
    return String(raw || '').trim().replace(/[^a-z0-9_]/gi, '').slice(0, MAX_NAME);
  }

  function usernameEmail(raw) {
    return `${cleanUsername(raw).toLowerCase()}${USERNAME_DOMAIN}`;
  }

  function usernameKey(raw) {
    return cleanUsername(raw).toLowerCase();
  }

  function authErrorMessage(error) {
    const code = error && error.code;
    if (code === 'auth/email-already-in-use') return 'That username is already taken.';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Username or password is incorrect.';
    if (code === 'auth/weak-password') return 'Use a password with at least 6 characters.';
    if (code === 'auth/too-many-requests') return 'Too many attempts. Try again later.';
    return 'Could not sign in. Check your connection and try again.';
  }

  function applyUser(user) {
    if (!user) {
      accountReady = false;
      playerName = '';
      safeSet(NAME_KEY, '');
      stopPresence();
      updatePlayerStrip();
      if (accountVisible) showAccountForm();
      return;
    }
    const email = String(user.email || '');
    const suffix = USERNAME_DOMAIN.toLowerCase();
    if (!email.toLowerCase().endsWith(suffix)) {
      auth.signOut();
      setNote('This account is not set up for a game username.');
      return;
    }
    playerId = user.uid;
    presenceId = user.uid;
    const username = cleanUsername(email.slice(0, -USERNAME_DOMAIN.length));
    playerName = username;
    safeSet(NAME_KEY, username);
    accountReady = true;
    if (accountBox) accountBox.classList.add('hidden');
    updatePlayerStrip();
    startPresence();
    if (visible) refresh();
  }

  function showAccountForm(message = 'Sign in or create an account with a username and password.') {
    if (!accountBox) return;
    accountVisible = true;
    accountOverlay.classList.remove('hidden');
    accountBox.classList.remove('hidden');
    accountMessage.textContent = message;
    if (accountName && !accountName.value && legacyPlayerName) accountName.value = cleanUsername(legacyPlayerName);
    ui.player.classList.add('hidden');
    setTimeout(() => accountName && accountName.focus({ preventScroll: true }), 60);
  }

  async function authenticate(createAccount) {
    if (!auth || accountBusy) {
      accountMessage.textContent = 'Sign-in is unavailable. Reload the page and try again.';
      return;
    }
    const username = cleanUsername(accountName.value);
    const password = accountPassword.value;
    if (!/^[a-z0-9_]{3,12}$/i.test(username)) {
      accountMessage.textContent = 'Username must be 3–12 letters, numbers, or underscores.';
      return;
    }
    if (!password) {
      accountMessage.textContent = 'Enter your password.';
      return;
    }
    accountBusy = true;
    accountMessage.textContent = createAccount ? 'Creating account…' : 'Signing in…';
    try {
      if (createAccount) await assertUsernameAvailable(username);
      const result = createAccount
        ? await auth.createUserWithEmailAndPassword(usernameEmail(username), password)
        : await auth.signInWithEmailAndPassword(usernameEmail(username), password);
      await reserveUsername(result.user, username);
      await migrateLegacyScore(result.user, username);
      applyUser(result.user);
      accountPassword.value = '';
      if (unsynced > 0) syncScore(0);
    } catch (error) {
      if (error && error.message === 'USERNAME_RESERVATION_FAILED') {
        accountMessage.textContent = 'That username is already reserved. Choose another username or sign in to its account.';
      } else if (error && error.message === 'USERNAME_TAKEN') {
        accountMessage.textContent = 'That username is already on the leaderboard. Choose another one.';
      } else {
        accountMessage.textContent = authErrorMessage(error);
      }
    } finally {
      accountBusy = false;
    }
  }

  async function reserveUsername(user, username) {
    const key = usernameKey(username);
    const claimURL = `${baseURL}/usernames/${key}.json`;
    let claim = await request(claimURL);
    if (claim !== user.uid) {
      if (claim !== null) throw new Error('USERNAME_RESERVATION_FAILED');
      await assertUsernameAvailable(username, user.uid);
      try {
        await request(claimURL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user.uid) });
      } catch (e) {
        claim = await request(claimURL);
        if (claim !== user.uid) throw e;
      }
    }
    const reverseURL = `${baseURL}/usernameByUid/${user.uid}.json`;
    let savedName = await request(reverseURL);
    if (savedName !== key) {
      if (savedName !== null) throw new Error('USERNAME_RESERVATION_FAILED');
      try {
        await request(reverseURL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(key) });
      } catch (e) {
        savedName = await request(reverseURL);
        if (savedName !== key) throw e;
      }
    }
  }

  async function assertUsernameAvailable(username, uid = '') {
    const rows = await request(`${baseURL}/${CONFIG.collection}.json`);
    const wanted = usernameKey(username);
    const alreadyUsed = rows && Object.entries(rows).some(([id, row]) =>
      id !== uid && id !== legacyPlayerId && usernameKey(row && row.name) === wanted
    );
    if (alreadyUsed) throw new Error('USERNAME_TAKEN');
  }

  async function migrateLegacyScore(user, username) {
    if (!legacyPlayerId || legacyPlayerId === user.uid) return;
    const old = await request(`${baseURL}/${CONFIG.collection}/${legacyPlayerId}.json`);
    const oldLocal = readLocal().find(row => row.id === legacyPlayerId && usernameKey(row.name) === usernameKey(username));
    if ((!old || usernameKey(old.name) !== usernameKey(username)) && !oldLocal) return;
    const currentURL = `${baseURL}/${CONFIG.collection}/${user.uid}.json`;
    const current = await request(currentURL);
    const best = Math.max(Number(old && old.score) || 0, Number(oldLocal && oldLocal.score) || 0, Number(current && current.score) || 0);
    if (best <= (Number(current && current.score) || 0)) return;
    await request(currentURL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: usernameKey(username), score: best, ts: { '.sv': 'timestamp' } })
    });
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

  // Legacy local ID is used only for device-local score fallback; online records use Firebase UIDs.
  let playerId = safeGet(ID_KEY);
  if (!/^[a-z0-9]{16,40}$/.test(playerId || '')) {
    playerId = makeId();
    safeSet(ID_KEY, playerId);
  }
  let playerName = cleanName(safeGet(NAME_KEY));
  const legacyPlayerId = playerId;
  const legacyPlayerName = playerName;

  let presenceId = '';

  let visible = false;
  let accountVisible = false;
  let lastScore = null;   // score of the run that just ended (display only)
  let unsynced = 0;       // best score not yet saved (waiting for a name, or a failed save)

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
      let requestURL = url;
      if (auth && baseURL && requestURL.startsWith(baseURL) && auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        requestURL += `${requestURL.includes('?') ? '&' : '?'}auth=${encodeURIComponent(token)}`;
      }
      const res = await fetch(requestURL, { cache: 'no-store', ...options, signal: ctrl.signal });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
      }
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
    const seen = new Set();
    return sortScores(rows).filter(row => {
      const key = usernameKey(row.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function fetchPresence() {
    const cutoff = Date.now() - CONFIG.activeWindowMs;
    const query = `?orderBy=%22lastSeen%22&startAt=${cutoff}`;
    const data = await request(`${baseURL}/${CONFIG.presenceCollection}.json${query}`);
    const players = data
      ? Object.entries(data).map(([id, value]) => ({
        id,
        name: cleanName(value && value.name),
        lastSeen: Number(value && value.lastSeen) || 0
      })).filter(player => player.name && player.lastSeen >= cutoff)
      : [];
    return players.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 20);
  }

  function renderPresence(players, message = '') {
    ui.onlineCount.textContent = String(players.length);
    ui.onlineList.textContent = '';
    if (!players.length) {
      const item = document.createElement('li');
      item.className = 'lb-online-empty';
      item.textContent = message || 'No named players online yet.';
      ui.onlineList.appendChild(item);
      return;
    }
    players.forEach(player => {
      const item = document.createElement('li');
      item.textContent = player.name;
      if (player.id === presenceId) item.setAttribute('aria-label', `${player.name} (you)`);
      ui.onlineList.appendChild(item);
    });
  }

  async function refreshPresence() {
    if (!isOnline) {
      renderPresence([], 'Live players need the online database.');
      return;
    }
    try {
      renderPresence(await fetchPresence());
    } catch (e) {
      renderPresence([], 'Live player feed unavailable. Check Firebase rules.');
    }
  }

  let heartbeatTimer = null;
  async function sendHeartbeat() {
    if (!isOnline || !playerName) return;
    const url = `${baseURL}/${CONFIG.presenceCollection}/${presenceId}.json`;
    try {
      await request(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, lastSeen: { '.sv': 'timestamp' } })
      });
    } catch (e) { /* the next heartbeat can recover from temporary network errors */ }
  }

  function startPresence() {
    if (!isOnline || !playerName) return;
    sendHeartbeat();
    if (!heartbeatTimer) heartbeatTimer = setInterval(sendHeartbeat, CONFIG.heartbeatMs);
  }

  async function stopPresence() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    if (!isOnline || !presenceId || !auth || !auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`${baseURL}/${CONFIG.presenceCollection}/${presenceId}.json?auth=${encodeURIComponent(token)}`, {
        method: 'DELETE', cache: 'no-store', keepalive: true
      });
    } catch (e) { /* stale presence expires from the feed after the active window */ }
  }

  window.addEventListener('pagehide', stopPresence);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) startPresence();
  });

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
    refreshPresence();
    if (isOnline) pollTimer = setInterval(() => {
      refresh(true);
      refreshPresence();
    }, Math.max(CONFIG.pollMs, CONFIG.presencePollMs));
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

  // ---------- signed-in player display ----------
  function updatePlayerStrip() {
    ui.player.classList.toggle('hidden', !playerName);
    ui.playerName.textContent = playerName;
  }

  // ---------- open / close ----------
  function open() {
    if (!api.canOpen()) return;
    visible = true;
    overlay.classList.remove('hidden');
    updatePlayerStrip();
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

  function openAccount() {
    if (!api.canOpen()) return;
    accountVisible = true;
    accountOverlay.classList.remove('hidden');
    updatePlayerStrip();
    if (!auth || !auth.currentUser || !accountReady) showAccountForm();
    else if (accountBox) accountBox.classList.add('hidden');
  }

  function closeAccount() {
    accountVisible = false;
    accountOverlay.classList.add('hidden');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  // ---------- events ----------
  $('lb-login-btn').addEventListener('click', () => authenticate(false));
  $('lb-register-btn').addEventListener('click', () => authenticate(true));
  $('lb-signout').addEventListener('click', async () => {
    await stopPresence();
    if (auth) await auth.signOut();
    showAccountForm('Signed out. Sign in or create an account.');
  });
  [accountName, accountPassword].forEach(input => input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); authenticate(false); }
  }));
  ui.closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  ui.accountCloseBtn.addEventListener('click', closeAccount);
  accountOverlay.addEventListener('click', (e) => { if (e.target === accountOverlay) closeAccount(); });
  document.addEventListener('keydown', (e) => { if (visible && e.key === 'Escape') close(); });
  document.addEventListener('keydown', (e) => { if (accountVisible && e.key === 'Escape') closeAccount(); });
  ui.accountOpenBtn.addEventListener('click', openAccount);
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
    openAccount,
    closeAccount,
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

  // Restore the signed-in account or show the username/password form for new visitors.
  if (auth) {
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
    auth.onAuthStateChanged(async user => {
      if (!user) {
        applyUser(null);
        if (!accountVisible) openAccount();
        return;
      }
      applyUser(user);
      const username = cleanUsername(String(user.email || '').slice(0, -USERNAME_DOMAIN.length));
      try {
        await reserveUsername(user, username);
        await migrateLegacyScore(user, username);
      } catch (e) {
        if (e && e.message === 'USERNAME_RESERVATION_FAILED') {
          await auth.signOut();
          setNote('That username is reserved by a different account.');
        } else {
          accountReady = false;
          showAccountForm('Could not verify your username. Check that the Firebase database rules are published.');
        }
      }
      if (accountReady && unsynced > 0) syncScore(0);
      if (visible) refresh();
    });
  }
  if (!auth || !auth.currentUser) openAccount();
})();
