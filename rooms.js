/* Private multiplayer rooms with room-only chat. Requires Firebase Auth and the
   Realtime Database rules documented in README.md. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const auth = window.FlappyFirebaseAuth;
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
  let startTimer = 0;
  let scheduledStartAt = 0;
  let busy = false;
  let syncing = false;
  let lastChatLoad = 0;
  let lastChatKey = '';
  let lastStartAt = 0;
  let acceptNextStart = false;
  let isHostTransitioning = false;

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
      if (!response.ok) throw new Error(`Room request failed (${response.status}).`);
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
    try {
      let code = '';
      let created = false;
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

    const member = existingMine || { name: currentName(), ready: false, joinedAt: Date.now() };
    await request(`${memberURL}/${myUid()}.json`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(member)
    });
    room = { code, ...meta };
    members = { ...existingMembers, [myUid()]: member };
    states = await request(scopedURL('roomStates', code)) || {};
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
    syncRoom();
    timer = setInterval(syncRoom, 1000);
  }

  function stopPolling() {
    if (timer) clearInterval(timer);
    if (startTimer) clearTimeout(startTimer);
    timer = 0;
    startTimer = 0;
    scheduledStartAt = 0;
  }

  async function syncRoom() {
    if (!room || syncing || !currentUser()) return;
    syncing = true;
    try {
      const code = room.code;
      const [meta, nextMembers, nextStates] = await Promise.all([
        request(roomURL(code)),
        request(scopedURL('roomMembers', code)),
        request(scopedURL('roomStates', code))
      ]);
      if (!meta) {
        resetRoom('The room was closed by its host.');
        return;
      }
      room = { code, ...meta };
      members = nextMembers || {};
      states = nextStates || {};
      if (!members[myUid()]) {
        resetRoom('You are no longer in this room.');
        return;
      }
      renderRoom();
      await publishMyState();
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
    const roster = Object.entries(members).sort((a, b) => {
      const aScore = Number((states[a[0]] || {}).score) || 0;
      const bScore = Number((states[b[0]] || {}).score) || 0;
      return bScore - aScore || String(a[1].name).localeCompare(String(b[1].name));
    });
    roster.forEach(([uid, member]) => {
      const state = states[uid] || {};
      const li = document.createElement('li');
      const offline = state.updatedAt && Date.now() - Number(state.updatedAt) > 12000;
      const alive = room.phase === 'playing' && state.roundAt === room.startAt && state.alive && !offline;
      li.textContent = `${member.name}${uid === room.hostUid ? ' ★' : ''} — ${Number(state.score) || 0} ${room.phase === 'lobby' ? (member.ready ? '· ready' : '· waiting') : (alive ? '· flying' : (offline ? '· offline' : '· out'))}`;
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
    $('room-result').textContent = isPlaying
      ? (room.startAt > Date.now() ? `Match starts in ${Math.max(1, Math.ceil((room.startAt - Date.now()) / 1000))}…` : 'Match in progress — scores update live.')
      : (roster.length < 2 ? 'Share the code to invite up to 7 friends.' : allReady ? 'Everyone is ready. The host can start.' : 'Everyone must mark ready before the host starts.');
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
    if (!room || room.phase !== 'playing' || !window.FlappyGame) return;
    const snapshot = window.FlappyGame.roomSnapshot();
    const url = scopedURL('roomStates', room.code, `/${myUid()}`);
    await request(url, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: snapshot.score,
        alive: snapshot.alive,
        y: snapshot.y,
        roundAt: room.startAt,
        updatedAt: { '.sv': 'timestamp' }
      })
    });
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
        await request(roomURL(code), { method: 'DELETE' });
      } else {
        await request(scopedURL('roomStates', code, `/${myUid()}`), { method: 'DELETE' });
        await request(ownMemberURL(code), { method: 'DELETE' });
      }
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
    isPanelOpen: () => !roomOverlay.classList.contains('hidden'),
    open: openPanel,
    close: closePanel
  };
})();
