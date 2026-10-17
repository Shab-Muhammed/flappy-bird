/* Private multiplayer rooms with room-only chat. Requires Firebase Auth and the
   Realtime Database rules documented in README.md. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const auth = window.FlappyFirebaseAuth;
  const database = firebase.database ? firebase.database() : null;
  let serverTimeOffset = 0;
  if (database) {
    database.ref('.info/serverTimeOffset').on('value', snapshot => {
      serverTimeOffset = Number(snapshot.val()) || 0;
    });
  }
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
  let isHostTransitioning = false;
  let disconnectCleanupRefs = [];
  let disconnectCleanupSignature = '';

  function setStatus(message) { statusEl.textContent = message; }
  function currentUser() { return auth && auth.currentUser; }
  function myUid() { const user = currentUser(); return user ? user.uid : ''; }
  function serverNow() { return Date.now() + serverTimeOffset; }
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const send = async forceRefresh => {
        let requestURL = url;
        if (user) {
          const token = await user.getIdToken(forceRefresh);
          requestURL += `${requestURL.includes('?') ? '&' : '?'}auth=${encodeURIComponent(token)}`;
        }
        return fetch(requestURL, { cache: 'no-store', ...options, signal: controller.signal });
      };
      let response = await send(false);
      if (response.status === 401 && user) response = await send(true);
      if (!response.ok) {
        const responseBody = await response.text();
        let detail = responseBody;
        try {
          const parsed = JSON.parse(responseBody);
          detail = parsed && parsed.error ? parsed.error : responseBody;
        } catch (error) { /* Keep the plain response text. */ }
        detail = String(detail || response.statusText || 'Unknown Firebase error').trim().slice(0, 180);
        const method = String(options.method || 'GET').toUpperCase();
        const path = new URL(url, window.location.href).pathname;
        throw new Error(`Room request failed (${response.status}) [${method} ${path}]: ${detail}`);
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
              hostUid: myUid(), phase: 'lobby', createdAt: { '.sv': 'timestamp' }, startAt: 0, seed: 0,
              lastManStanding: true
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
          if (room && room.code === code && !roomOverlay.classList.contains('hidden')) renderRoom();
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
          if (room && room.code === code && !roomOverlay.classList.contains('hidden')) renderRoom();
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
      const roundWasPlaying = room.phase === 'playing';
      room = { code, ...meta };
      members = nextMembers || {};
      if (!members[myUid()]) {
        resetRoom('You are no longer in this room.');
        return;
      }
      await armDisconnectCleanup(code);
      renderRoom();
      // Dead players spectate until the host publishes the final standings,
      // then return to the room lobby instead of seeing the solo replay screen.
      if (roundWasPlaying && room.phase !== 'playing'
        && window.FlappyGame && window.FlappyGame.isRoomPlayerOut
        && window.FlappyGame.isRoomPlayerOut()) {
        openPanel();
      }
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
    // State snapshots arrive ten times per second. Keep the closed room panel
    // out of the game's hot rendering path; openPanel() renders fresh data.
    if (roomOverlay.classList.contains('hidden')) return;
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
      const offline = state.updatedAt && serverNow() - Number(state.updatedAt) > 12000;
      const alive = room.phase === 'playing' && state.roundAt === room.startAt && state.alive && !offline;
      const waitingForRound = room.phase === 'playing' && (Number(room.startAt) > serverNow() || Number(state.roundAt) !== Number(room.startAt));
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
    const lastManStandingToggle = $('last-man-standing-toggle');
    lastManStandingToggle.checked = room.lastManStanding !== false;
    lastManStandingToggle.disabled = !isHost || isPlaying;
    $('room-ready-btn').classList.toggle('hidden', isPlaying || isHost);
    $('room-start-btn').classList.toggle('hidden', !isHost || isPlaying);
    $('room-ready-btn').textContent = me && me.ready ? 'Not ready' : 'I’m ready';
    const allReady = roster.length >= 2 && roster.every(([uid, player]) => uid === room.hostUid || player.ready);
    $('room-start-btn').disabled = !allReady;
    $('room-start-btn').title = allReady ? 'Start this room match' : 'At least two players must be ready';
    const hasPlayed = Object.values(states).some(state => Number(state.roundAt) > 0);
    const lastResult = room.lastResult;
    const previousResult = lastResult && lastResult.message
      ? `${Array.isArray(lastResult.winnerUids) && lastResult.winnerUids.includes(myUid()) ? '🏆 Victory!' : 'Round over.'} ${lastResult.message}`
      : '';
    $('room-result').textContent = isPlaying
      ? (room.startAt > serverNow() ? `Match starts in ${Math.max(1, Math.ceil((room.startAt - serverNow()) / 1000))}…` : 'Match in progress — scores update live.')
      : (previousResult || (roster.length < 2
        ? 'Share the code to invite up to 7 friends.'
        : allReady
          ? 'Everyone is ready. The host can start another match.'
          : hasPlayed
            ? 'Round complete — ready up whenever you want to play again.'
            : 'Everyone must mark ready before the host starts.'));
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
    const everyoneElseReady = Object.entries(members)
      .filter(([uid]) => uid !== myUid())
      .every(([, member]) => member.ready);
    if (roster.length < 2 || !everyoneElseReady) {
      setStatus('Wait until all other players are ready.');
      return;
    }
    busy = true;
    try {
      const startAt = serverNow() + 5000;
      const updated = { ...room, phase: 'playing', startAt, seed: randomSeed() };
      delete updated.lastResult;
      delete updated.code;
      await request(roomURL(room.code), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
      });
      setStatus('Starting together in 5 seconds…');
      await syncRoom();
    } catch (error) { setStatus('Could not start the match. Check room rules.'); }
    finally { busy = false; }
  }

  async function maybeStartRound() {
    const startAt = Number(room && room.startAt) || 0;
    if (!room || room.phase !== 'playing' || !startAt || startAt === lastStartAt) return;
    const delay = startAt - serverNow();
    if (delay > 0) {
      if (scheduledStartAt !== startAt) {
        if (startTimer) clearTimeout(startTimer);
        scheduledStartAt = startAt;
        startTimer = setTimeout(() => {
          startTimer = 0;
          scheduledStartAt = 0;
          maybeStartRound();
        }, delay + 5);
      }
      return;
    }
    if (startTimer) clearTimeout(startTimer);
    startTimer = 0;
    scheduledStartAt = 0;
    lastStartAt = startAt;
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
    if (!room || room.hostUid !== myUid() || room.phase !== 'playing' || isHostTransitioning || serverNow() < Number(room.startAt) + 3000) return;
    const uids = Object.keys(members);
    const now = serverNow();
    const timedOutMissingPlayers = now - Number(room.startAt) > 15000;
    const roundStatesReady = uids.length > 0 && uids.every(uid => {
      const state = states[uid];
      return (state && Number(state.roundAt) === Number(room.startAt)) || timedOutMissingPlayers;
    });
    if (!roundStatesReady) return;
    const allDone = uids.every(uid => {
      const state = states[uid];
      return !state || Number(state.roundAt) !== Number(room.startAt) || !state.alive || now - Number(state.updatedAt) > 15000;
    });
    const aliveCount = uids.filter(uid => {
      const state = states[uid];
      return state && Number(state.roundAt) === Number(room.startAt) && state.alive && now - Number(state.updatedAt) <= 15000;
    }).length;
    if (room.lastManStanding !== false ? aliveCount > 1 : !allDone) return;
    isHostTransitioning = true;
    try {
      const standings = uids.map(uid => {
        const member = members[uid] || {};
        const state = states[uid];
        return {
          uid,
          name: String(member.name || 'Player').slice(0, 24),
          score: state && Number(state.roundAt) === Number(room.startAt) ? Number(state.score) || 0 : 0
        };
      }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
      const topScore = standings[0] ? standings[0].score : 0;
      const winners = standings.filter(player => player.score === topScore);
      const winnerNames = winners.map(player => player.name);
      const winnerLabel = winnerNames.length > 1 ? `Tie: ${winnerNames.join(', ')}` : `Winner: ${winnerNames[0] || 'No winner'}`;
      const updated = {
        ...room,
        phase: 'lobby', startAt: 0, seed: 0,
        lastResult: {
          message: `${winnerLabel} · ${topScore} points`,
          winnerUids: winners.map(player => player.uid),
          standings,
          completedAt: firebase.database.ServerValue.TIMESTAMP
        }
      };
      delete updated.code;
      await request(roomURL(room.code), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
      });
      setStatus('Round finished. Get ready for the next match.');
    } catch (error) { /* the next room sync retries */ }
    finally { isHostTransitioning = false; }
  }

  async function updateLastManStanding() {
    if (!room || room.hostUid !== myUid() || room.phase !== 'lobby' || busy) return;
    const toggle = $('last-man-standing-toggle');
    busy = true;
    toggle.disabled = true;
    try {
      const updated = { ...room, lastManStanding: toggle.checked };
      delete updated.code;
      await request(roomURL(room.code), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
      });
      room = { ...room, lastManStanding: toggle.checked };
      renderRoom();
    } catch (error) {
      toggle.checked = room.lastManStanding === true;
      setStatus('Could not update the match rule. Check room rules.');
    } finally {
      busy = false;
      toggle.disabled = room.hostUid !== myUid() || room.phase !== 'lobby';
    }
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
        && serverNow() - Number(state.updatedAt || 0) < 12000)
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
  $('last-man-standing-toggle').addEventListener('change', updateLastManStanding);
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
    isRoundInProgress: () => !!room && room.phase === 'playing',
    getGhostPlayers,
    isPanelOpen: () => !roomOverlay.classList.contains('hidden'),
    open: openPanel,
    close: closePanel,
    showRoomAfterDeath() { if (room) openPanel(); }
  };
})();
