/* Private multiplayer rooms with room-only chat. Requires Firebase Auth and the
   Realtime Database rules documented in README.md. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const auth = window.FlappyFirebaseAuth;
  const database = firebase.database ? firebase.database() : null;
  const baseURL = firebase.app().options.databaseURL.replace(/\/+$/, '');
  const roomOverlay = $('room-overlay');
  const statusEl = $('room-status');
  const joinControls = $('room-join-controls');
  const sessionPanel = $('room-session');
  const codeInput = $('room-code-input');
  const playerList = $('room-player-list');
  const chatList = $('room-chat-list');
  const MAX_PLAYERS = 8;
  const ROOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const USERNAME_DOMAIN = '@users.flappy-bird-ae650.firebaseapp.com';

  let room = null;
  let members = {};
  let states = {};
  let timer = 0;
  let stateTimer = 0;
  let leaderboardRenderTimer = 0;
  let roomStateRef = null;
  let publishingState = false;
  let startTimer = 0;
  let scheduledStartAt = 0;
  let busy = false;
  let syncing = false;
  let lastChatLoad = 0;
  let lastChatKey = '';
  let lastStartAt = 0;
  let acceptNextStart = false;
  let isHostTransitioning = false;
  let disconnectCleanupRefs = [];
  let disconnectCleanupSignature = '';

  function setStatus(message) { statusEl.textContent = message; }
  function currentUser() { return auth && auth.currentUser; }
  function myUid() { const user = currentUser(); return user ? user.uid : ''; }
  function currentName() {
    const email = String((currentUser() || {}).email || '');
    return email.toLowerCase().endsWith(USERNAME_DOMAIN.toLowerCase())
      ? email.slice(0, -USERNAME_DOMAIN.length).toLowerCase()
      : '';
  }
  function roomURL(code, path = '') { return `${baseURL}/rooms/${code}${path}.json`; }
  function scopedURL(collection, code, path = '') { return `${baseURL}/${collection}/${code}${path}.json`; }
  function ownMemberURL(code = room && room.code) { return scopedURL('roomMembers', code, `/${myUid()}`); }

  async function armDisconnectCleanup(code) {
    if (!database) throw new Error('Room cleanup is unavailable. Reload and try again.');
    const isHost = room && room.hostUid === myUid();
    const successor = Object.entries(members)
      .filter(([uid]) => uid !== myUid())
      .sort((a, b) => (Number(a[1].joinedAt) || 0) - (Number(b[1].joinedAt) || 0) || a[0].localeCompare(b[0]))[0];
    const successorUid = successor ? successor[0] : '';
    const signature = `${code}:${isHost ? `host:${successorUid || 'empty'}` : 'member'}`;
    if (signature === disconnectCleanupSignature) return;
    await cancelDisconnectCleanup();
    const operations = isHost && successorUid
      ? [
        { path: `rooms/${code}`, method: 'update', value: { hostUid: successorUid } },
        { path: `roomStates/${code}/${myUid()}`, method: 'remove' },
        { path: `roomMembers/${code}/${myUid()}`, method: 'remove' }
      ]
      : isHost
        ? ['roomChat', 'roomStates', 'roomMembers', 'rooms'].map(collection => ({ path: `${collection}/${code}`, method: 'remove' }))
        : [
          { path: `roomMembers/${code}/${myUid()}`, method: 'remove' },
          { path: `roomStates/${code}/${myUid()}`, method: 'remove' }
        ];
    for (const operation of operations) {
      const ref = database.ref(operation.path);
      if (operation.method === 'update') await ref.onDisconnect().update(operation.value);
      else await ref.onDisconnect().remove();
      disconnectCleanupRefs.push(ref);
    }
    disconnectCleanupSignature = signature;
  }

  async function cancelDisconnectCleanup() {
    const refs = disconnectCleanupRefs;
    disconnectCleanupRefs = [];
    disconnectCleanupSignature = '';
    await Promise.all(refs.map(ref => ref.onDisconnect().cancel().catch(() => {})));
  }

  async function deleteRoomData(code) {
    for (const collection of ['roomChat', 'roomStates', 'roomMembers', 'rooms']) {
      await request(scopedURL(collection, code), { method: 'DELETE' });
    }
  }

  async function request(url, options = {}) {
    const user = currentUser();
    let requestURL = url;
    if (user) {
      const token = await user.getIdToken();
      requestURL += `${requestURL.includes('?') ? '&' : '?'}auth=${encodeURIComponent(token)}`;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(requestURL, { cache: 'no-store', ...options, signal: controller.signal });
      if (!response.ok) {
        const responseBody = await response.text();
        let detail = responseBody;
        try {
          const parsed = JSON.parse(responseBody);
          detail = parsed && parsed.error ? parsed.error : responseBody;
        } catch (error) { /* Keep the plain response text. */ }
        detail = String(detail || response.statusText || 'Unknown Firebase error').trim().slice(0, 180);
        throw new Error(`Room request failed (${response.status}): ${detail}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function randomCode() {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, value => ROOM_ALPHABET[value % ROOM_ALPHABET.length]).join('');
  }

  function randomSeed() {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] || 1;
  }

  function openPanel() {
    if (window.FlappyLeaderboard && !window.FlappyLeaderboard.canOpen()) return;
    if (!currentUser()) {
      roomOverlay.classList.add('hidden');
      if (window.FlappyLeaderboard) window.FlappyLeaderboard.openAccount();
      return;
    }
    roomOverlay.classList.remove('hidden');
    if (!room) {
      joinControls.classList.remove('hidden');
      sessionPanel.classList.add('hidden');
      setStatus('Create a private room or enter a friend’s code.');
    } else {
      renderRoom();
    }
  }

  function closePanel() { roomOverlay.classList.add('hidden'); }

  async function createRoom() {
    if (busy || !currentUser()) return openPanel();
    busy = true;
    setStatus('Creating your room…');
    let code = '';
    let created = false;
    try {
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        code = randomCode();
        const existing = await request(roomURL(code));
        if (existing) continue;
        try {
          await request(roomURL(code), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hostUid: myUid(), phase: 'lobby', createdAt: { '.sv': 'timestamp' }, startAt: 0, seed: 0
            })
          });
          created = true;
        } catch (error) {
          const check = await request(roomURL(code));
          if (check && check.hostUid === myUid()) created = true;
          else throw error;
        }
      }
      if (!created) throw new Error('Could not allocate a room code. Please try again.');
      await enterRoom(code, true);
    } catch (error) {
      if (created && code) {
        try { await deleteRoomData(code); } catch (cleanupError) { /* Keep the original room setup error. */ }
        if (room && room.code === code) resetRoom('Room setup failed. The room was removed.');
      }
      setStatus(error.message || 'Could not create the room. Check Firebase rules.');
    } finally {
      busy = false;
    }
  }

  async function joinRoom() {
    const code = String(codeInput.value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 8) {
      setStatus('Enter the 8-character room code.');
      return;
    }
    if (busy || !currentUser()) return openPanel();
    busy = true;
    setStatus('Joining room…');
    try { await enterRoom(code, false); }
    catch (error) { setStatus(error.message || 'Could not join. Check the code and Firebase rules.'); }
    finally { busy = false; }
  }

  async function enterRoom(code, createdByMe) {
    const meta = await request(roomURL(code));
    if (!meta) throw new Error('Room not found. Check the code.');
    const memberURL = scopedURL('roomMembers', code);
    const existingMembers = await request(memberURL) || {};
    const existingMine = existingMembers[myUid()];
    if (meta.phase !== 'lobby' && !existingMine) throw new Error('A match is already running. Join after this round.');
    if (!existingMine && Object.keys(existingMembers).length >= MAX_PLAYERS) throw new Error('This room is full (8 players maximum).');

    const member = existingMine || { name: currentName(), ready: false, joinedAt: { '.sv': 'timestamp' } };
    await request(scopedURL('roomMembers', code, `/${myUid()}`), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(member)
    });
    room = { code, ...meta };
    members = { ...existingMembers, [myUid()]: member };
    states = await request(scopedURL('roomStates', code)) || {};
    await armDisconnectCleanup(code);
    try { sessionStorage.setItem('flappy_private_room', code); } catch (error) { /* session storage is optional */ }
    acceptNextStart = meta.phase === 'lobby';
    lastStartAt = Number(meta.startAt) || 0;
    lastChatLoad = 0;
    lastChatKey = '';
    joinControls.classList.add('hidden');
    sessionPanel.classList.remove('hidden');
    renderRoom();
    startPolling();
    if (createdByMe) setStatus('Room created. Share the code with your friends.');
  }

  function startPolling() {
    stopPolling();
    watchRoomStates(room.code);
    syncRoom();
    timer = setInterval(syncRoom, 1000);
    // Publish 10 Hz snapshots; the canvas interpolates between live updates.
    stateTimer = setInterval(publishMyState, 100);
  }

  function stopPolling() {
    if (timer) clearInterval(timer);
    if (stateTimer) clearInterval(stateTimer);
    if (roomStateRef) roomStateRef.off();
    roomStateRef = null;
    if (leaderboardRenderTimer) clearTimeout(leaderboardRenderTimer);
    leaderboardRenderTimer = 0;
    if (startTimer) clearTimeout(startTimer);
    timer = 0;
    stateTimer = 0;
    startTimer = 0;
    scheduledStartAt = 0;
  }

  function watchRoomStates(code) {
    if (roomStateRef) roomStateRef.off();
    roomStateRef = database.ref(`roomStates/${code}`);
    const refreshState = snapshot => {
      if (!room || room.code !== code) return;
      states[snapshot.key] = snapshot.val();
      if (!leaderboardRenderTimer) {
        leaderboardRenderTimer = setTimeout(() => {
          leaderboardRenderTimer = 0;
          if (room && room.code === code) renderRoom();
        }, 250);
      }
    };
    roomStateRef.on('child_added', refreshState);
    roomStateRef.on('child_changed', refreshState);
    roomStateRef.on('child_removed', snapshot => {
      delete states[snapshot.key];
      if (!leaderboardRenderTimer) {
        leaderboardRenderTimer = setTimeout(() => {
          leaderboardRenderTimer = 0;
          if (room && room.code === code) renderRoom();
        }, 250);
      }
    });
  }

  async function syncRoom() {
    if (!room || syncing || !currentUser()) return;
    syncing = true;
    try {
      const code = room.code;
      const [meta, nextMembers] = await Promise.all([
        request(roomURL(code)),
        request(scopedURL('roomMembers', code))
      ]);
      if (!meta) {
        resetRoom('The room was closed by its host.');
        return;
      }
      room = { code, ...meta };
      members = nextMembers || {};
      if (!members[myUid()]) {
        resetRoom('You are no longer in this room.');
        return;
      }
      await armDisconnectCleanup(code);
      renderRoom();
      await maybeStartRound();
      await maybeFinishRound();
      if (Date.now() - lastChatLoad > 1800) await loadChat();
    } catch (error) {
      setStatus('Room connection interrupted. Reconnecting…');
    } finally {
      syncing = false;
    }
  }

  function renderRoom() {
    if (!room) return;
    joinControls.classList.add('hidden');
    sessionPanel.classList.remove('hidden');
    $('room-code').textContent = room.code;
    $('room-player-count').textContent = String(Object.keys(members).length);
    playerList.textContent = '';
    const scoreFor = uid => {
      const state = states[uid] || {};
      if (room.phase === 'playing' && Number(state.roundAt) !== Number(room.startAt)) return 0;
      return Number(state.score) || 0;
    };
    const roster = Object.entries(members).sort((a, b) => {
      return scoreFor(b[0]) - scoreFor(a[0]) || String(a[1].name).localeCompare(String(b[1].name));
    });
    roster.forEach(([uid, member], rank) => {
      const state = states[uid] || {};
      const li = document.createElement('li');
      const offline = state.updatedAt && Date.now() - Number(state.updatedAt) > 12000;
      const alive = room.phase === 'playing' && state.roundAt === room.startAt && state.alive && !offline;
      const waitingForRound = room.phase === 'playing' && (room.startAt > Date.now() || Number(state.roundAt) !== Number(room.startAt));
      const activity = room.phase === 'lobby'
        ? (member.ready ? '· ready' : '· waiting')
        : (waitingForRound ? '· ready' : alive ? '· flying' : offline ? '· offline' : '· out');
      li.className = uid === myUid() ? 'room-leaderboard-me' : '';
      const rankCell = document.createElement('span');
      rankCell.className = 'room-rank';
      rankCell.textContent = `#${rank + 1}`;
      const nameCell = document.createElement('span');
      nameCell.className = 'room-player-name';
      nameCell.textContent = `${member.name}${uid === room.hostUid ? ' ★' : ''}${uid === myUid() ? ' (you)' : ''}`;
      const scoreCell = document.createElement('span');
      scoreCell.className = 'room-player-score';
      scoreCell.textContent = String(scoreFor(uid));
      const statusCell = document.createElement('span');
      statusCell.className = 'room-player-status';
      statusCell.textContent = activity.replace(/^·\s*/, '');
      li.append(rankCell, nameCell, scoreCell, statusCell);
      playerList.appendChild(li);
    });

    const me = members[myUid()];
    const isHost = room.hostUid === myUid();
    const isPlaying = room.phase === 'playing';
    $('room-ready-btn').classList.toggle('hidden', isPlaying);
    $('room-start-btn').classList.toggle('hidden', !isHost || isPlaying);
    $('room-ready-btn').textContent = me && me.ready ? 'Not ready' : 'I’m ready';
    const allReady = roster.length >= 2 && roster.every(([, player]) => player.ready);
    $('room-start-btn').disabled = !allReady;
    $('room-start-btn').title = allReady ? 'Start this room match' : 'At least two players must be ready';
    const hasPlayed = Object.values(states).some(state => Number(state.roundAt) > 0);
    $('room-result').textContent = isPlaying
      ? (room.startAt > Date.now() ? `Match starts in ${Math.max(1, Math.ceil((room.startAt - Date.now()) / 1000))}…` : 'Match in progress — scores update live.')
      : (roster.length < 2
        ? 'Share the code to invite up to 7 friends.'
        : allReady
          ? 'Everyone is ready. The host can start another match.'
          : hasPlayed
            ? 'Round complete — ready up whenever you want to play again.'
            : 'Everyone must mark ready before the host starts.');
    if (roomOverlay.classList.contains('hidden')) return;
    if (isPlaying) setStatus('Private room match');
    else setStatus('Private room lobby');
  }

  async function toggleReady() {
    if (!room || room.phase !== 'lobby' || busy) return;
    const me = members[myUid()];
    busy = true;
    try {
      await request(ownMemberURL(), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...me, ready: !me.ready })
      });
      await syncRoom();
    } catch (error) { setStatus('Could not update ready status. Check room rules.'); }
    finally { busy = false; }
  }

  async function startMatch() {
    if (!room || room.hostUid !== myUid() || busy) return;
    const roster = Object.values(members);
    if (roster.length < 2 || !roster.every(member => member.ready)) {
      setStatus('Wait until everyone is ready.');
      return;
    }
    busy = true;
    try {
      const startAt = Date.now() + 5000;
      const updated = { ...room, phase: 'playing', startAt, seed: randomSeed() };
      delete updated.code;
      await request(roomURL(room.code), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
      });
      acceptNextStart = true;
      setStatus('Starting together in 5 seconds…');
      await syncRoom();
    } catch (error) { setStatus('Could not start the match. Check room rules.'); }
    finally { busy = false; }
  }

  async function maybeStartRound() {
    if (room.phase !== 'playing' || !room.startAt || room.startAt === lastStartAt) return;
    if (!acceptNextStart) return;
    if (Date.now() < room.startAt) {
      if (scheduledStartAt !== Number(room.startAt)) {
        if (startTimer) clearTimeout(startTimer);
        scheduledStartAt = Number(room.startAt);
        startTimer = setTimeout(() => {
          startTimer = 0;
          scheduledStartAt = 0;
          maybeStartRound();
        }, Math.max(0, Number(room.startAt) - Date.now() + 5));
      }
      return;
    }
    if (startTimer) clearTimeout(startTimer);
    startTimer = 0;
    scheduledStartAt = 0;
    lastStartAt = room.startAt;
    acceptNextStart = false;
    const game = window.FlappyGame;
    if (game) game.startRoomRound(Number(room.seed) || 1);
    const me = members[myUid()];
    if (me) request(ownMemberURL(), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...me, ready: false })
    }).catch(() => {});
    closePanel();
    if (window.FlappyLeaderboard) window.FlappyLeaderboard.close();
  }

  async function maybeFinishRound() {
    if (!room || room.hostUid !== myUid() || room.phase !== 'playing' || isHostTransitioning || Date.now() < room.startAt + 3000) return;
    const uids = Object.keys(members);
    const allDone = uids.length > 0 && uids.every(uid => {
      const state = states[uid];
      return state && Number(state.roundAt) === Number(room.startAt) && (!state.alive || Date.now() - Number(state.updatedAt) > 15000);
    });
    if (!allDone) return;
    isHostTransitioning = true;
    try {
      const updated = { ...room, phase: 'lobby', startAt: 0, seed: 0 };
      delete updated.code;
      await request(roomURL(room.code), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
      });
      acceptNextStart = true;
      setStatus('Round finished. Get ready for the next match.');
    } catch (error) { /* the next room sync retries */ }
    finally { isHostTransitioning = false; }
  }

  async function publishMyState() {
    if (!room || room.phase !== 'playing' || !window.FlappyGame || !roomStateRef || publishingState) return;
    const snapshot = window.FlappyGame.roomSnapshot();
    publishingState = true;
    try {
      await roomStateRef.child(myUid()).set({
        score: snapshot.score,
        alive: snapshot.alive,
        y: snapshot.y,
        velocity: snapshot.velocity,
        playerId: myUid(),
        playerName: currentName(),
        roundAt: room.startAt,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });
    } catch (error) {
      // The next tick retries while the room remains active.
    } finally {
      publishingState = false;
    }
  }

  function getGhostPlayers() {
    if (!room || room.phase !== 'playing') return [];
    return Object.entries(states)
      .filter(([uid, state]) => state && uid !== myUid() && Number(state.roundAt) === Number(room.startAt)
        && Date.now() - Number(state.updatedAt || 0) < 12000)
      .map(([uid, state]) => ({
        id: uid,
        name: String((members[uid] && members[uid].name) || state.playerName || 'Opponent').slice(0, 24),
        y: Number(state.y),
        velocity: Number(state.velocity) || 0,
        score: Number(state.score) || 0,
        alive: state.alive !== false,
        updatedAt: Number(state.updatedAt) || 0,
        roundAt: Number(state.roundAt)
      }))
      .filter(player => Number.isFinite(player.y));
  }

  async function loadChat() {
    if (!room) return;
    lastChatLoad = Date.now();
    const query = '?orderBy=%22ts%22&limitToLast=40';
    const messages = await request(scopedURL('roomChat', room.code) + query);
    const rows = messages ? Object.entries(messages).sort((a, b) => Number(a[1].ts) - Number(b[1].ts)) : [];
    const signature = rows.map(([key]) => key).join('|');
    if (signature === lastChatKey) return;
    lastChatKey = signature;
    chatList.textContent = '';
    rows.forEach(([key, message]) => {
      const item = document.createElement('li');
      const author = document.createElement('b');
      author.textContent = `${message.name}: `;
      item.append(author, document.createTextNode(String(message.text || '')));
      if (message.uid === myUid()) item.classList.add('room-chat-mine');
      chatList.appendChild(item);
    });
    chatList.scrollTop = chatList.scrollHeight;
  }

  async function sendChat(event) {
    event.preventDefault();
    if (!room || busy) return;
    const input = $('room-chat-input');
    const text = String(input.value || '').trim().slice(0, 180);
    if (!text) return;
    busy = true;
    $('room-chat-send').disabled = true;
    try {
      await request(scopedURL('roomChat', room.code), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: myUid(), name: currentName(), text, ts: { '.sv': 'timestamp' } })
      });
      input.value = '';
      await loadChat();
    } catch (error) { setStatus('Could not send room message. Check room chat rules.'); }
    finally { busy = false; $('room-chat-send').disabled = false; }
  }

  async function leaveRoom() {
    if (!room || busy) return;
    busy = true;
    const code = room.code;
    try {
      if (room.hostUid === myUid()) {
        const successor = Object.entries(members)
          .filter(([uid]) => uid !== myUid())
          .sort((a, b) => (Number(a[1].joinedAt) || 0) - (Number(b[1].joinedAt) || 0) || a[0].localeCompare(b[0]))[0];
        if (successor) {
          const updated = { ...room, hostUid: successor[0] };
          delete updated.code;
          await request(roomURL(code), {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
          });
          await request(scopedURL('roomStates', code, `/${myUid()}`), { method: 'DELETE' });
          await request(ownMemberURL(code), { method: 'DELETE' });
        } else {
          await deleteRoomData(code);
        }
      } else {
        await request(scopedURL('roomStates', code, `/${myUid()}`), { method: 'DELETE' });
        await request(ownMemberURL(code), { method: 'DELETE' });
      }
      await cancelDisconnectCleanup();
      resetRoom('You left the room.');
    } catch (error) { setStatus('Could not leave room. Check Firebase rules.'); }
    finally { busy = false; }
  }

  function resetRoom(message) {
    stopPolling();
    room = null;
    members = {};
    states = {};
    lastStartAt = 0;
    if (startTimer) clearTimeout(startTimer);
    startTimer = 0;
    scheduledStartAt = 0;
    acceptNextStart = false;
    try { sessionStorage.removeItem('flappy_private_room'); } catch (error) { /* session storage is optional */ }
    joinControls.classList.remove('hidden');
    sessionPanel.classList.add('hidden');
    setStatus(message);
  }

  $('room-quick-open').addEventListener('click', openPanel);
  $('room-create-btn').addEventListener('click', createRoom);
  $('room-join-btn').addEventListener('click', joinRoom);
  $('room-code-input').addEventListener('keydown', event => { if (event.key === 'Enter') joinRoom(); });
  $('room-ready-btn').addEventListener('click', toggleReady);
  $('room-start-btn').addEventListener('click', startMatch);
  $('room-leave-btn').addEventListener('click', leaveRoom);
  $('room-close-btn').addEventListener('click', closePanel);
  $('room-copy-btn').addEventListener('click', async () => {
    if (!room) return;
    try { await navigator.clipboard.writeText(room.code); setStatus('Room code copied.'); }
    catch (error) { setStatus(`Share this code: ${room.code}`); }
  });
  $('room-chat-form').addEventListener('submit', sendChat);
  roomOverlay.addEventListener('click', event => { if (event.target === roomOverlay) closePanel(); });
  document.addEventListener('keydown', event => { if (!roomOverlay.classList.contains('hidden') && event.key === 'Escape') closePanel(); });

  auth.onAuthStateChanged(user => {
    if (!user) {
      if (room) resetRoom('Sign in again to return to your room.');
      return;
    }
    if (room) return;
    let savedCode = '';
    try { savedCode = sessionStorage.getItem('flappy_private_room') || ''; } catch (error) { /* no session storage */ }
    if (savedCode) {
      enterRoom(savedCode, false).catch(() => {
        try { sessionStorage.removeItem('flappy_private_room'); } catch (error) { /* optional */ }
      });
    }
  });

  window.FlappyRooms = {
    isInRoom: () => !!room,
    getGhostPlayers,
    isPanelOpen: () => !roomOverlay.classList.contains('hidden'),
    open: openPanel,
    close: closePanel,
    showRoomAfterDeath() { if (room) openPanel(); }
  };
})();
