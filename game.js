/**
 * Flappy Bird - Classic Arcade Edition
 * Features:
 * - 100% Authentic Original Yellow Flappy Bird (chubby body, animated wing, big cartoon eye, puffy lips)
 * - Gradual & Automatic Day/Night Cycle (Dawn ➔ Day ➔ Sunset ➔ Night) with moving Sun & Moon arcs
 * - Gradual & Automatic Season Cycle (Spring 🌸 ➔ Summer ☀️ ➔ Autumn 🍁 ➔ Winter ❄️) with continuous color morphing
 * - Hand-crafted rich textures: 3D cylindrical green pipes, lush turf grass, stratified earth soil
 * - Layered backgrounds with:
 *    • Drifting billowy textured clouds
 *    • Theme-specific landscape silhouettes
 *    • Seasonal weather particles drifting backward (Sakura petals, golden motes, autumn leaves, snowflakes)
 *    • Stratified textured dirt with diagonal soil stripes
 * - Smooth physics and synthesized retro audio
 * - Gradually increasing speed, fully blended day/night transitions
 * - Online Top 10 leaderboard (see leaderboard.js), shown after every run and from the menu
 * - Coins paid out from your final score, and a store for bird and pipe skins
 */

(() => {
  'use strict';

  // --- Canvas Setup & High-DPI Scaling ---
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const bestScoreBadge = document.getElementById('best-score-badge');
  const soundBtn = document.getElementById('sound-btn');
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');
  const srAnnouncements = document.getElementById('sr-announcements');

  const cycleBadge = document.getElementById('cycle-badge');
  const cycleIcon = document.getElementById('cycle-icon');
  const cycleText = document.getElementById('cycle-text');

  const seasonBadge = document.getElementById('season-badge');
  const seasonIcon = document.getElementById('season-icon');
  const seasonText = document.getElementById('season-text');

  const V_WIDTH = 360;
  const V_HEIGHT = 640;
  const coarsePointer = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0;
  const glowScale = coarsePointer ? 0.48 : 0.72;
  const glowBlur = amount => amount * glowScale;
  let scale = 1;

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.5 : 2);
    canvas.width = V_WIDTH * dpr;
    canvas.height = V_HEIGHT * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    const rect = canvas.getBoundingClientRect();
    scale = rect.width / V_WIDTH;
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 150));
  resizeCanvas();

  // --- Web Audio API Procedural Sound Engine ---
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.muted = localStorage.getItem('flappy_muted') === 'true';
      this.updateIcons();
    }

    init() {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.init();
      this.muted = !this.muted;
      localStorage.setItem('flappy_muted', this.muted);
      this.updateIcons();
      if (!this.muted) this.playTone(540, 0.08, 'sine');
    }

    updateIcons() {
      if (this.muted) {
        soundIconOn.classList.add('hidden');
        soundIconOff.classList.remove('hidden');
      } else {
        soundIconOn.classList.remove('hidden');
        soundIconOff.classList.add('hidden');
      }
    }

    playFlap() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, t);
      osc.frequency.exponentialRampToValueAtTime(740, t + 0.11);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.11);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }

    playScore() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1320, t + 0.08);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.32);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.33);
    }

    playHit() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    }

    playDie() {
      if (this.muted) return;
      this.init();
      if (randomDeathSoundEnabled) {
        const ownedSounds = DEATH_SOUNDS.filter(item => deathSoundOwned.includes(item.id));
        const selected = ownedSounds[Math.floor(Math.random() * ownedSounds.length)];
        if (selected && selected.id !== equippedDeathSound) {
          this.playDeathSoundItem(selected);
          return;
        }
      }
      if (activeDeathSound) {
        if (activeDeathBuffer && this.ctx) {
          this.playDeathBuffer(activeDeathBuffer);
          return;
        }
        if (activeDeathBufferPromise) {
          activeDeathBufferPromise.then(buffer => {
            if (this.muted) return;
            if (buffer && this.ctx) this.playDeathBuffer(buffer);
            else if (activeDeathAudio) {
              try { activeDeathAudio.currentTime = 0; } catch (e) { /* wait for metadata */ }
              activeDeathAudio.play().catch(() => {});
            }
          });
          return;
        }
        if (activeDeathAudio) {
          try { activeDeathAudio.currentTime = 0; } catch (e) { /* wait for metadata */ }
          activeDeathAudio.play().catch(() => {});
        }
        return;
      }
      this.playSynthDie();
    }

    playDeathSoundItem(item) {
      if (!item.src) {
        this.playSynthDie();
        return;
      }
      const cachedBuffer = deathSoundBuffers.get(item.id);
      if (cachedBuffer && this.ctx) {
        this.playDeathBuffer(cachedBuffer);
        return;
      }
      const dataUri = window.FLAPPY_DEATH_SOUND_DATA && window.FLAPPY_DEATH_SOUND_DATA[item.id];
      if (dataUri && this.ctx) {
        const encoded = dataUri.slice(dataUri.indexOf(',') + 1);
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
        this.ctx.decodeAudioData(bytes.buffer)
          .then(buffer => {
            deathSoundBuffers.set(item.id, buffer);
            this.playDeathBuffer(buffer);
          })
          .catch(() => this.playDeathFile(item));
        return;
      }
      this.playDeathFile(item);
    }

    playDeathFile(item) {
      if (this.muted) return;
      const audio = new Audio(new URL(item.src, document.baseURI).href);
      audio.volume = 0.8;
      audio.play().catch(() => {});
    }

    playDeathBuffer(buffer) {
      if (this.muted || !this.ctx) return;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.8;
      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();
    }

    playSynthDie() {
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(460, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.35);

      gain.gain.setValueAtTime(0.26, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    }

    playCoin() {
      if (this.muted) return;
      this.playTone(1175, 0.07, 'triangle');
      setTimeout(() => this.playTone(1568, 0.14, 'triangle'), 60);
    }

    playTone(freq, duration, type = 'sine') {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
    }
  }

  let activeDeathSound = null;
  let activeDeathAudio = null;
  let activeDeathBuffer = null;
  let activeDeathBufferPromise = null;
  let randomDeathSoundEnabled = lsGet('flappy_random_death_sound') === 'true';
  const deathSoundBuffers = new Map();

  const sound = new SoundManager();
  soundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sound.toggleMute();
  });

  // --- High Score Persistence ---
  let highScore = parseInt(localStorage.getItem('flappy_bird_high_score') || '0', 10);
  if (isNaN(highScore)) highScore = 0;
  bestScoreBadge.textContent = highScore;

  function updateHighScore(val) {
    if (val > highScore) {
      highScore = val;
      localStorage.setItem('flappy_bird_high_score', highScore);
      bestScoreBadge.textContent = highScore;
      return true;
    }
    return false;
  }

  // --- Coins & Bird Skins (saved on this device) ---
  const SKINS = [
    { id: 'classic', name: 'Classic', price: 0,
      body: ['#fff466', '#fdbf18', '#ea8e05', '#c96f00'], belly: ['#ffffff', '#fff0bd', '#ffd894'],
      wing: ['#ffffff', '#fee150', '#f59a0b', '#cf7302'], tail: '#e5970c', crest: '#ffb300',
      outline: '#633703', outlineSoft: '#754003', quill: '#995906', beak: ['#ff832b', '#ff5a17', '#db3804'] },
    { id: 'bluejay', name: 'Blue Jay', price: 25,
      body: ['#e4f6ff', '#5bbcff', '#2f86e0', '#1d56a8'], belly: ['#ffffff', '#eaf6ff', '#c5e4fa'],
      wing: ['#ffffff', '#8fd3ff', '#3a8fe6', '#1f5bb0'], tail: '#2f86e0', crest: '#5bbcff',
      outline: '#10305e', outlineSoft: '#143a70', quill: '#1d56a8', beak: ['#ffb03b', '#ff8a1c', '#d96400'] },
    { id: 'ruby', name: 'Ruby', price: 40,
      body: ['#ffc0c0', '#ff5d5d', '#dc2f2f', '#9f1717'], belly: ['#ffffff', '#ffe3da', '#ffc6b3'],
      wing: ['#ffffff', '#ff8f8f', '#e23c3c', '#a61a1a'], tail: '#d92a2a', crest: '#ff5d5d',
      outline: '#4d0d0d', outlineSoft: '#5e1212', quill: '#a61a1a', beak: ['#ffe066', '#ffc21f', '#e09200'] },
    { id: 'parrot', name: 'Parrot', price: 60,
      body: ['#e7ff9a', '#8ee03c', '#4fb21f', '#2e7a10'], belly: ['#fffbe0', '#fff3a8', '#ffe070'],
      wing: ['#ffffff', '#7fe8ff', '#2cb7e6', '#1479b0'], tail: '#2cb7e6', crest: '#ff5252',
      outline: '#1d4a0a', outlineSoft: '#265c0e', quill: '#1479b0', beak: ['#ff6a5a', '#e0302a', '#a81410'] },
    { id: 'shadow', name: 'Shadow', price: 80,
      body: ['#9aa3b2', '#556070', '#323a47', '#1b2029'], belly: ['#e5e9f0', '#c3cad6', '#9aa3b2'],
      wing: ['#c9d0dc', '#6b7686', '#3a4350', '#1f252e'], tail: '#2b323d', crest: '#556070',
      outline: '#0b0e13', outlineSoft: '#10141b', quill: '#0f1319', beak: ['#ffd34d', '#ffb21a', '#d98a00'] },
    { id: 'bubblegum', name: 'Bubblegum', price: 100,
      body: ['#ffe3f4', '#ff92d2', '#e0489e', '#a21f6f'], belly: ['#ffffff', '#fff0f8', '#ffd0ec'],
      wing: ['#ffffff', '#ffb0e0', '#e957b0', '#a91f78'], tail: '#e0489e', crest: '#ff92d2',
      outline: '#4f0b36', outlineSoft: '#62113f', quill: '#a21f6f', beak: ['#ffd34d', '#ffb21a', '#d98a00'] }
  ];

  function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function lsSet(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* ignore */ } }

  const DAILY_CHALLENGE_KEY = `flappy_daily_${new Date().toISOString().slice(0, 10)}`;
  const dailySeed = Number(new Date().toISOString().slice(8, 10));
  const dailyTarget = [5, 8, 10, 12, 15, 7, 9][dailySeed % 7];
  const DAILY_BONUS = 10;
  const BADGES = [
    { score: 5, name: 'Rookie Flapper' },
    { score: 10, name: 'Sky Hopper' },
    { score: 20, name: 'Pipe Pro' },
    { score: 35, name: 'Cloud Champion' }
  ];
  let completedDaily = lsGet(DAILY_CHALLENGE_KEY) === 'true';
  let dailyBonusEarned = false;
  let unlockedBadges = [];
  try {
    const saved = JSON.parse(lsGet('flappy_badges') || '[]');
    if (Array.isArray(saved)) unlockedBadges = BADGES.filter(b => saved.includes(b.score)).map(b => b.score);
  } catch (e) { /* keep defaults */ }
  let newlyUnlockedBadges = [];

  // Death sounds are priced by recognizability and impact. The original sound remains free.
  const DEATH_SOUNDS = [
    { id: 'original', name: 'Classic Death', src: '', price: 0 },
    { id: 'sanctuary-guardian', name: 'Sanctuary Guardian', src: 'sounds/death/sanctuary-guardian.mp3', price: 100 },
    { id: 'kids-yay', name: 'Kids Yay', src: 'sounds/death/kids-yay.mp3', price: 60 },
    { id: 'du-bist-gut-genug', name: 'You’re Good Enough', src: 'sounds/death/du-bist-gut-genug.mp3', price: 40 },
    { id: 'wilhelm-scream', name: 'Wilhelm Scream', src: 'sounds/death/wilhelm-scream.mp3', price: 125 },
    { id: 'tf-nemesis', name: 'Nemesis', src: 'sounds/death/tf-nemesis.mp3', price: 90 },
    { id: 'spongebob-fail', name: 'SpongeBob Fail', src: 'sounds/death/spongebob-fail.mp3', price: 80 },
    { id: 'audiomass-mystery', name: 'Usheyy', src: 'sounds/death/audiomass-mystery.mp3', price: 25 },
    { id: 'yooo', name: 'Yooo!', src: 'sounds/death/yooo.mp3', price: 70 },
    { id: 'fahhh', name: 'Fahhh!', src: 'sounds/death/fahhh.mp3', price: 50 },
    { id: 'punch', name: 'Punch', src: 'sounds/death/punch.mp3', price: 65 },
    { id: 'pop-shot', name: 'Pop Shot', src: 'sounds/death/pop-shot.mp3', price: 70 },
    { id: 'vine-boom', name: 'Vine Boom', src: 'sounds/death/vine-boom.mp3', price: 110 },
    { id: 'mystery-beep', name: 'Fortnite Death', src: 'sounds/death/mystery-beep.mp3', price: 20 },
    { id: 'error', name: 'Error', src: 'sounds/death/error.mp3', price: 30 },
    { id: 'scuba-scuba', name: 'Scuba Scuba', src: 'sounds/death/scuba-scuba.mp3', price: 55 },
    { id: 'ada-gommale', name: 'Ada Gommale', src: 'sounds/death/ada-gommale.mp3', price: 55 },
    { id: 'rizzbot-laugh', name: 'Rizzbot Laugh', src: 'sounds/death/rizzbot-laugh.mp3', price: 55 }
  ];
  const deathSoundOwned = loadOwned('flappy_owned_death_sounds', DEATH_SOUNDS).filter(id => id !== 'classic');
  if (!deathSoundOwned.includes('original')) deathSoundOwned.unshift('original');
  const savedDeathSound = lsGet('flappy_equipped_death_sound');
  let equippedDeathSound = deathSoundOwned.includes(savedDeathSound) ? savedDeathSound : 'original';
  function setActiveDeathSound() {
    const selected = DEATH_SOUNDS.find(item => item.id === equippedDeathSound) || DEATH_SOUNDS[0];
    activeDeathSound = selected.src || null;
    activeDeathBuffer = null;
    activeDeathBufferPromise = null;
    activeDeathAudio = activeDeathSound ? new Audio(new URL(activeDeathSound, document.baseURI).href) : null;
    if (activeDeathAudio) {
      activeDeathAudio.preload = 'auto';
      activeDeathAudio.volume = 0.8;
      activeDeathAudio.load();
      const dataUri = window.FLAPPY_DEATH_SOUND_DATA && window.FLAPPY_DEATH_SOUND_DATA[selected.id];
      sound.init();
      if (sound.ctx && dataUri) {
        const encoded = dataUri.slice(dataUri.indexOf(',') + 1);
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        activeDeathBufferPromise = sound.ctx.decodeAudioData(bytes.buffer)
          .then(buffer => {
            if (equippedDeathSound === selected.id) activeDeathBuffer = buffer;
            return buffer;
          })
          .catch(() => null);
      }
    }
  }
  setActiveDeathSound();

  function loadOwned(key, list) {
    let owned = ['classic'];
    try {
      const saved = JSON.parse(lsGet(key) || '[]');
      if (Array.isArray(saved)) {
        owned = Array.from(new Set(['classic', ...saved.filter(id => list.some(s => s.id === id))]));
      }
    } catch (e) { /* keep default */ }
    return owned;
  }

  const wallet = (() => {
    const owned = loadOwned('flappy_owned_birds', SKINS);
    const eq = lsGet('flappy_equipped_bird');
    return {
      coins: Math.max(0, parseInt(lsGet('flappy_coins') || '0', 10) || 0),
      owned,
      equipped: owned.includes(eq) ? eq : 'classic'
    };
  })();

  function saveWallet() {
    lsSet('flappy_coins', String(wallet.coins));
    lsSet('flappy_owned_birds', JSON.stringify(wallet.owned));
    lsSet('flappy_equipped_bird', wallet.equipped);
    lsSet('flappy_owned_death_sounds', JSON.stringify(deathSoundOwned));
    lsSet('flappy_equipped_death_sound', equippedDeathSound);
  }

  function skinById(id) { return SKINS.find(s => s.id === id) || SKINS[0]; }
  function activeSkin() { return skinById(wallet.equipped); }
  let runCoins = 0;

  // --- Game Engine Variables ---
  const STATE = { READY: 0, PLAYING: 1, DYING: 2, GAMEOVER: 3 };
  let currentState = STATE.READY;
  let score = 0;
  let isNewHighScore = false;
  let gameOverTimer = 0;
  let screenShakeTimer = 0;
  let flashWhiteAlpha = 0;
  let globalFrame = 0;
  let worldFrame = 0;

  // Keep the original opening pace, then increase speed with a gentle exponential curve.
  const BASE_SPEED = 2.0;
  const MAX_SPEED = 6.0;
  const SPEED_GROWTH_RATE = 0.0035;
  let gameSpeed = BASE_SPEED;
  function targetSpeed() {
    return Math.min(MAX_SPEED, BASE_SPEED * Math.exp(SPEED_GROWTH_RATE * score));
  }
  const GROUND_HEIGHT = 108;
  const GROUND_Y = V_HEIGHT - GROUND_HEIGHT;

  let groundScrollOffset = 0;
  const GROUND_SCROLL_PERIOD = 1092;

  // --- 1. Dynamic Day & Night Cycles Engine ---
  const CYCLES = [
    {
      name: 'DAY',
      icon: '☀️',
      skyTop: [78, 192, 202],     // Classic retro sky blue #4ec0ca
      skyMid: [112, 197, 206],    // Bright sky turquoise #70c5ce
      skyBot: [195, 235, 238],    // Soft haze horizon
      cloudTop: '#ffffff',
      cloudBot: '#d2ebf5',
      cloudShadow: 'rgba(70, 140, 160, 0.25)',
      sunAlpha: 1.0,
      sunColor: '#fff580',
      nightRatio: 0.0,
      pipeBrightness: 1.0
    },
    {
      name: 'SUNSET',
      icon: '🌅',
      skyTop: [190, 80, 95],      // Warm twilight rose #be505f
      skyMid: [235, 120, 75],     // Radiant amber-orange #eb784b
      skyBot: [255, 215, 130],    // Golden sunset horizon #ffd782
      cloudTop: '#fff2dd',
      cloudBot: '#f4a582',
      cloudShadow: 'rgba(160, 60, 40, 0.3)',
      sunAlpha: 0.95,
      sunColor: '#ffcc44',
      nightRatio: 0.2,
      pipeBrightness: 0.9
    },
    {
      name: 'NIGHT',
      icon: '🌙',
      skyTop: [12, 20, 44],       // Deep starry navy #0c142c
      skyMid: [20, 34, 68],       // Midnight blue #142244
      skyBot: [35, 55, 95],       // Soft night horizon #23375f
      cloudTop: '#3a4b6e',
      cloudBot: '#1d263b',
      cloudShadow: 'rgba(5, 10, 20, 0.4)',
      sunAlpha: 0.0,
      sunColor: '#ffffff',
      nightRatio: 1.0,
      pipeBrightness: 0.65
    },
    {
      name: 'DAWN',
      icon: '🌄',
      skyTop: [100, 75, 125],     // Lilac purple #644b7d
      skyMid: [195, 110, 128],    // Pastel rose #c36e80
      skyBot: [248, 185, 148],    // Soft peach dawn #f8b994
      cloudTop: '#fff0e5',
      cloudBot: '#cf9ea8',
      cloudShadow: 'rgba(110, 50, 70, 0.25)',
      sunAlpha: 0.85,
      sunColor: '#ffe49e',
      nightRatio: 0.25,
      pipeBrightness: 0.85
    }
  ];

  const CYCLE_MODES = ['AUTO', 'DAY', 'SUNSET', 'NIGHT', 'DAWN'];
  let currentCycleModeIndex = 0; // 0 = AUTO
  let cycleProgress = 0.08; // Starts in bright, beautiful day
  let cycleBoost = 0;       // pending score-based time advance, fed in gradually

  // --- 2. Dynamic Organic Season Cycles Engine ---
  const SEASONS = [
    {
      name: 'SPRING',
      icon: '🌸'
    },
    {
      name: 'SUMMER',
      icon: '☀️'
    },
    {
      name: 'AUTUMN',
      icon: '🍁'
    },
    {
      name: 'WINTER',
      icon: '❄️'
    }
  ];

  const SEASON_MODES = ['AUTO', 'SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];
  let currentSeasonModeIndex = 0; // 0 = AUTO
  let seasonProgress = 0.05; // Starts in Spring
  let seasonBoost = 0;       // pending score-based season advance, fed in gradually

  const THEMES = [
    { name: 'Kerala', icon: '🌴', skyTop: '#087e70', skyMid: '#35b58c', skyBot: '#b4e7a0', far: '#236e60', near: '#124f49', groundTop: '#4eaa52', groundBody: '#694b32', pipe: ['#275b38', '#398b50', '#68b75e', '#3c8246', '#205231', '#163c29'], lip: ['#1d4d31', '#347b43', '#62a94f', '#3f8145', '#1e4a30'], outline: '#123b2c', accent: '#b8df65', style: 'kerala' },
    { name: 'Desert', icon: '🏜️', skyTop: '#f28a62', skyMid: '#f5bc72', skyBot: '#ffe5a4', far: '#b97958', near: '#d89a5d', groundTop: '#eab85d', groundBody: '#ad7044', pipe: ['#98602e', '#c28a3d', '#f0c45b', '#cf923e', '#93602e', '#603d29'], lip: ['#80502d', '#b47637', '#e8b654', '#c1873d', '#754a2c'], outline: '#603b25', accent: '#fff0ad', style: 'desert' },
    { name: 'Cyberpunk', icon: '🌃', skyTop: '#100d31', skyMid: '#26164d', skyBot: '#47285f', far: '#17142e', near: '#211a3f', groundTop: '#211d3e', groundBody: '#141322', pipe: ['#342057', '#56358b', '#a13fca', '#7136a4', '#3c256e', '#251644'], lip: ['#322052', '#57317d', '#a945cc', '#8139aa', '#3c235d'], outline: '#f34dbb', accent: '#51f4ff', style: 'cyberpunk' },
    { name: 'Swamp', icon: '🍄', skyTop: '#173d3a', skyMid: '#285b4c', skyBot: '#9bbf83', far: '#244d3a', near: '#173d2e', groundTop: '#628b4b', groundBody: '#473f30', pipe: ['#46563d', '#62734b', '#89995d', '#63704a', '#414d37', '#303a2d'], lip: ['#3e4d36', '#596b44', '#839259', '#68774a', '#3c4932'], outline: '#283b2b', accent: '#b5d785', style: 'forest' },
    { name: 'Highway', icon: '🛣️', skyTop: '#5589a2', skyMid: '#91b7bd', skyBot: '#d9d2ad', far: '#536b70', near: '#3c5559', groundTop: '#7e8584', groundBody: '#303539', pipe: ['#50595c', '#758084', '#b8c0be', '#8d9999', '#596366', '#41494c'], lip: ['#485154', '#6d797c', '#aab4b5', '#859092', '#4c5557'], outline: '#343b3d', accent: '#ffd34f', style: 'highway' }
  ];
  const THEME_CYCLE_PROFILES = {
    kerala: {
      DAWN: { skyTop: '#e59ba9', skyMid: '#f3c6a0', skyBot: '#fff0c9', far: '#937d91', near: '#627b72', groundTop: '#4b8973', groundBody: '#3c5148', accent: '#d4b87a', pipeTint: '#d8b782', lighting: 'rgba(255, 193, 180, 0.12)', particleEffect: 'mist', particleDensity: 0.45, pipeShade: 0.08, emission: 0, vineOpacity: 0.8, mushroomGlow: 0, hazardBrightness: 0.5 },
      DAY: { skyTop: '#29a9d4', skyMid: '#6bcce0', skyBot: '#c6f3e5', far: '#398d73', near: '#155d45', groundTop: '#4eaa52', groundBody: '#416544', accent: '#a8e7cc', pipeTint: '#e0d4a4', lighting: 'rgba(22, 135, 91, 0.07)', particleEffect: 'leaves', particleDensity: 0.7, pipeShade: 0, emission: 0, vineOpacity: 1, mushroomGlow: 0, hazardBrightness: 0.5 },
      SUNSET: { skyTop: '#773d66', skyMid: '#e07853', skyBot: '#f6bc75', far: '#583c59', near: '#3d3b49', groundTop: '#bd8452', groundBody: '#473632', accent: '#f3bd69', pipeTint: '#d27b38', lighting: 'rgba(245, 119, 49, 0.13)', particleEffect: 'gold', particleDensity: 0.48, pipeShade: 0.2, emission: 0, vineOpacity: 0.88, mushroomGlow: 0, hazardBrightness: 0.5 },
      NIGHT: { skyTop: '#101a3b', skyMid: '#17294a', skyBot: '#283b58', far: '#182b38', near: '#102927', groundTop: '#24483d', groundBody: '#17231f', accent: '#74a9b2', pipeTint: '#18304a', lighting: 'rgba(12, 27, 62, 0.22)', particleEffect: 'fireflies', particleDensity: 0.78, pipeShade: 0.55, emission: 2, vineOpacity: 0.78, mushroomGlow: 0, hazardBrightness: 0.55 }
    },
    desert: {
      DAWN: { skyTop: '#e5a5a2', skyMid: '#f2c29a', skyBot: '#ffe5b3', far: '#aa8277', near: '#b58769', groundTop: '#e2b46c', groundBody: '#996746', accent: '#ffe2a1', pipeTint: '#f1c28d', lighting: 'rgba(255, 197, 161, 0.13)', particleEffect: 'sand', particleDensity: 0.42, pipeShade: 0.04, emission: 0, vineOpacity: 1, mushroomGlow: 0, hazardBrightness: 0.5, cityGlow: 0 },
      DAY: { skyTop: '#80b7d5', skyMid: '#b8d8dd', skyBot: '#f8e6b5', far: '#c3a071', near: '#d7a75e', groundTop: '#f2d07d', groundBody: '#b77b43', accent: '#fff0ab', pipeTint: '#fff0bd', lighting: 'rgba(255, 222, 143, 0.12)', particleEffect: 'sand', particleDensity: 1, pipeShade: 0, emission: 0, vineOpacity: 1, mushroomGlow: 0, hazardBrightness: 0.5, cityGlow: 0 },
      SUNSET: { skyTop: '#401d45', skyMid: '#aa3f50', skyBot: '#f0804e', far: '#542843', near: '#763f49', groundTop: '#c66b42', groundBody: '#5e3540', accent: '#ffb34e', pipeTint: '#a74b36', lighting: 'rgba(187, 50, 49, 0.16)', particleEffect: 'gold', particleDensity: 0.58, pipeShade: 0.22, emission: 0, vineOpacity: 1, mushroomGlow: 0, hazardBrightness: 0.5, cityGlow: 0.24 },
      NIGHT: { skyTop: '#09152e', skyMid: '#14213d', skyBot: '#222b47', far: '#20253d', near: '#302b49', groundTop: '#65506a', groundBody: '#262238', accent: '#dbb9ff', pipeTint: '#263459', lighting: 'rgba(13, 28, 62, 0.27)', particleEffect: 'stardust', particleDensity: 0.54, pipeShade: 0.48, emission: 8, vineOpacity: 1, mushroomGlow: 0, hazardBrightness: 0.5, cityGlow: 0.8 }
    },
    cyberpunk: {
      DAWN: { skyTop: '#242d52', skyMid: '#45456b', skyBot: '#5b7185', far: '#202941', near: '#262946', groundTop: '#36374d', groundBody: '#171927', accent: '#7cabb8', pipeTint: '#313644', lighting: 'rgba(115, 175, 218, 0.08)', particleEffect: 'pixels', particleDensity: 0.28, pipeShade: 0.1, emission: 6, vineOpacity: 1, mushroomGlow: 0, hazardBrightness: 0.5 },
      DAY: { skyTop: '#555e68', skyMid: '#737d83', skyBot: '#8d9696', far: '#41464f', near: '#303640', groundTop: '#535661', groundBody: '#20222b', accent: '#8f9296', pipeTint: '#68717b', lighting: 'rgba(145, 167, 183, 0.11)', particleEffect: 'smoke', particleDensity: 0.25, pipeShade: 0.12, emission: 2, vineOpacity: 1, mushroomGlow: 0, hazardBrightness: 0.5 },
      SUNSET: { skyTop: '#351846', skyMid: '#672455', skyBot: '#a54169', far: '#281b3d', near: '#321a42', groundTop: '#3d2453', groundBody: '#151324', accent: '#f046c7', pipeTint: '#8b3169', lighting: 'rgba(221, 49, 157, 0.13)', particleEffect: 'pixels', particleDensity: 0.62, pipeShade: 0.06, emission: 12, vineOpacity: 1, mushroomGlow: 0, hazardBrightness: 0.5 },
      NIGHT: { skyTop: '#02040d', skyMid: '#080d20', skyBot: '#121329', far: '#080b19', near: '#101124', groundTop: '#21182f', groundBody: '#090b15', accent: '#38edff', pipeTint: '#131328', lighting: 'rgba(20, 18, 56, 0.08)', particleEffect: 'pixels', particleDensity: 1, pipeShade: 0, emission: 20, vineOpacity: 1, mushroomGlow: 0, hazardBrightness: 0.5 }
    },
    forest: {
      DAWN: { skyTop: '#688b91', skyMid: '#9bb9ad', skyBot: '#ccd8bc', far: '#41685e', near: '#315247', groundTop: '#6a8b58', groundBody: '#45483a', accent: '#c1d6a0', pipeTint: '#c8d2ce', lighting: 'rgba(171, 215, 214, 0.12)', particleEffect: 'mist', particleDensity: 0.55, pipeShade: 0.12, emission: 0, vineOpacity: 1, mushroomGlow: 0.22, hazardBrightness: 0.5, rayStrength: 0.55 },
      DAY: { skyTop: '#55a875', skyMid: '#99c581', skyBot: '#d3dfa2', far: '#346846', near: '#1e472e', groundTop: '#78a64d', groundBody: '#465039', accent: '#c0df7f', pipeTint: '#b4c78e', lighting: 'rgba(172, 224, 124, 0.09)', particleEffect: 'leaves', particleDensity: 0.78, pipeShade: 0, emission: 0, vineOpacity: 1, mushroomGlow: 0.42, hazardBrightness: 0.5, rayStrength: 1 },
      SUNSET: { skyTop: '#49364d', skyMid: '#a66b58', skyBot: '#d8a36b', far: '#4c493c', near: '#4a4036', groundTop: '#8d754b', groundBody: '#37332d', accent: '#e8ab62', pipeTint: '#c38b55', lighting: 'rgba(223, 142, 73, 0.15)', particleEffect: 'gold', particleDensity: 0.62, pipeShade: 0.12, emission: 1, vineOpacity: 1, mushroomGlow: 0.55, hazardBrightness: 0.5, rayStrength: 0.35 },
      NIGHT: { skyTop: '#071624', skyMid: '#0d2631', skyBot: '#18333a', far: '#101e24', near: '#10201e', groundTop: '#35422c', groundBody: '#171d18', accent: '#4da9a9', pipeTint: '#182b35', lighting: 'rgba(4, 22, 34, 0.24)', particleEffect: 'fireflies', particleDensity: 0.92, pipeShade: 0.5, emission: 15, vineOpacity: 1, mushroomGlow: 1, hazardBrightness: 0.5, rayStrength: 0.05 }
    },
    highway: {
      DAWN: { skyTop: '#737a9e', skyMid: '#a2a9bb', skyBot: '#d1c8c5', far: '#55616f', near: '#46535a', groundTop: '#7a8187', groundBody: '#292f35', accent: '#e2c96a', pipeTint: '#c7cbd0', lighting: 'rgba(176, 180, 216, 0.10)', particleEffect: 'haze', particleDensity: 0.46, pipeShade: 0.08, emission: 0, vineOpacity: 1, mushroomGlow: 0, hazardBrightness: 0.5, trafficIntensity: 0.08, streetlightIntensity: 0.35 },
      DAY: { skyTop: '#69afd3', skyMid: '#a1d3e2', skyBot: '#e4e3ce', far: '#697f86', near: '#495f63', groundTop: '#929a9b', groundBody: '#34393b', accent: '#ffda43', pipeTint: '#e6e9e4', lighting: 'rgba(195, 219, 231, 0.08)', particleEffect: 'dust', particleDensity: 0.75, pipeShade: 0, emission: 0, vineOpacity: 1, mushroomGlow: 0, hazardBrightness: 0.62, trafficIntensity: 0.05, streetlightIntensity: 0 },
      SUNSET: { skyTop: '#51435f', skyMid: '#b56250', skyBot: '#ee9b57', far: '#4a424c', near: '#403a40', groundTop: '#76604c', groundBody: '#292a2d', accent: '#ff9f43', pipeTint: '#d78651', lighting: 'rgba(239, 119, 57, 0.13)', particleEffect: 'traffic', particleDensity: 0.52, pipeShade: 0.16, emission: 0, vineOpacity: 1, mushroomGlow: 0, hazardBrightness: 0.5, trafficIntensity: 0.55, streetlightIntensity: 0.62 },
      NIGHT: { skyTop: '#060c1b', skyMid: '#101a2b', skyBot: '#202d3b', far: '#121a25', near: '#1c2429', groundTop: '#394044', groundBody: '#14181c', accent: '#c4d4da', pipeTint: '#202c37', lighting: 'rgba(8, 20, 32, 0.23)', particleEffect: 'traffic', particleDensity: 0.82, pipeShade: 0.38, emission: 12, vineOpacity: 1, mushroomGlow: 0, hazardBrightness: 1, trafficIntensity: 1, streetlightIntensity: 1 }
    }
  };
  const THEME_CYCLE_COLOR_KEYS = ['skyTop', 'skyMid', 'skyBot', 'far', 'near', 'groundTop', 'groundBody', 'accent', 'pipeTint', 'lighting'];
  Object.values(THEME_CYCLE_PROFILES).forEach(profiles => {
    Object.values(profiles).forEach(profile => {
      profile.parsed = {};
      THEME_CYCLE_COLOR_KEYS.forEach(key => { profile.parsed[key] = parseColor(profile[key]); });
    });
  });

  function syncThemeToCycle(theme, cycle) {
    const profiles = THEME_CYCLE_PROFILES[theme.style];
    if (!profiles) return theme;
    const from = profiles[cycle.stageName];
    const to = profiles[cycle.nextStageName];
    if (!from || !to) return theme;
    const mixColorValue = key => toCss(mixColor(from.parsed[key], to.parsed[key], cycle.stageLerp));
    const synchronized = { ...theme };
    for (const key of THEME_CYCLE_COLOR_KEYS) {
      synchronized[key] = mixColorValue(key);
    }
    synchronized.pipe = from.pipe ? from.pipe.map((color, index) => mixColorValue(color, to.pipe[index])) : theme.pipe;
    synchronized.lip = from.lip ? from.lip.map((color, index) => mixColorValue(color, to.lip[index])) : theme.lip;
    for (const key of ['particleDensity', 'pipeShade', 'emission', 'vineOpacity', 'mushroomGlow', 'hazardBrightness', 'rayStrength', 'trafficIntensity', 'streetlightIntensity', 'cityGlow']) {
      if (from[key] === undefined || to[key] === undefined) continue;
      synchronized[key] = from[key] + (to[key] - from[key]) * cycle.stageLerp;
    }
    synchronized.particleEffect = cycle.stageLerp < 0.5 ? from.particleEffect : to.particleEffect;
    synchronized.cycleStage = cycle.stageLerp < 0.5 ? cycle.stageName : cycle.nextStageName;
    synchronized.cycleBrightness = cycle.pipeBrightness;
    synchronized.nightRatio = cycle.nightRatio;
    synchronized.cycleStageLerp = cycle.stageLerp;
    return synchronized;
  }
  function shuffledThemeOrder() {
    const order = THEMES.map((_, index) => index);
    for (let index = order.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
    }
    return order;
  }
  let themeOrder = shuffledThemeOrder();
  let themeOrderPosition = 0;
  let themeIndex = themeOrder[themeOrderPosition];
  let previousThemeIndex = themeIndex;
  let themeTransition = 1;
  let themeTimer = 0;
  let themeBannerTimer = 0;
  let themeLastTimestamp = null;
  const THEME_SWITCH_SECONDS = 45;
  const THEME_TRANSITION_SECONDS = 2.4;
  const THEME_BANNER_SECONDS = 2.5;

  function themeColor(value) {
    return parseColor(value);
  }

  function getThemeState(deltaSeconds) {
    if (currentState === STATE.PLAYING) {
      themeTimer += deltaSeconds;
      if (themeTimer >= THEME_SWITCH_SECONDS) advanceTheme();
    }
    themeTransition = Math.min(1, themeTransition + deltaSeconds / THEME_TRANSITION_SECONDS);
    if (themeBannerTimer > 0) themeBannerTimer = Math.max(0, themeBannerTimer - deltaSeconds);
    const from = THEMES[previousThemeIndex];
    const to = THEMES[themeIndex];
    const t = easeBlend(themeTransition);
    const blendHex = (a, b) => {
      const ca = themeColor(a), cb = themeColor(b);
      return `rgb(${Math.round(ca[0] + (cb[0] - ca[0]) * t)},${Math.round(ca[1] + (cb[1] - ca[1]) * t)},${Math.round(ca[2] + (cb[2] - ca[2]) * t)})`;
    };
    const blendList = (a, b) => a.map((color, index) => blendHex(color, b[index]));
    return {
      ...to,
      skyTop: blendHex(from.skyTop, to.skyTop), skyMid: blendHex(from.skyMid, to.skyMid), skyBot: blendHex(from.skyBot, to.skyBot),
      far: blendHex(from.far, to.far), near: blendHex(from.near, to.near), groundTop: blendHex(from.groundTop, to.groundTop), groundBody: blendHex(from.groundBody, to.groundBody),
      pipe: blendList(from.pipe, to.pipe), lip: blendList(from.lip, to.lip), outline: blendHex(from.outline, to.outline), accent: blendHex(from.accent, to.accent),
      style: t < 0.5 ? from.style : to.style, blend: t
    };
  }

  function advanceTheme() {
    previousThemeIndex = themeIndex;
    themeOrderPosition++;
    if (themeOrderPosition >= themeOrder.length) {
      themeOrder = shuffledThemeOrder();
      if (themeOrder[0] === previousThemeIndex) [themeOrder[0], themeOrder[1]] = [themeOrder[1], themeOrder[0]];
      themeOrderPosition = 0;
    }
    themeIndex = themeOrder[themeOrderPosition];
    themeTransition = 0;
    themeTimer = 0;
    themeBannerTimer = THEME_BANNER_SECONDS;
  }

  let ambientParticleStyle = '';
  let atmosphereTime = 0;
  const ambientParticles = [];

  function makeAmbientParticle(theme, initial = false) {
    const groundEffect = theme.particleEffect === 'sand' || theme.particleEffect === 'dust' || theme.particleEffect === 'haze' || theme.particleEffect === 'traffic';
    const particle = {
      x: initial ? Math.random() * V_WIDTH : V_WIDTH + Math.random() * 40,
      y: groundEffect ? GROUND_Y - 12 - Math.pow(Math.random(), 2) * 112 : Math.random() * (GROUND_Y - 16),
      size: 1 + Math.random() * 2.4,
      phase: Math.random() * Math.PI * 2,
      speed: 10 + Math.random() * 28,
      drift: (Math.random() - 0.5) * 12
    };
    if (theme.particleEffect === 'traffic') particle.y = GROUND_Y - 26 - Math.random() * 88;
    if (theme.particleEffect === 'mist') particle.drift = -8 - Math.random() * 16;
    if (theme.particleEffect === 'sand') particle.speed += 18 + theme.particleDensity * 38;
    if (theme.particleEffect === 'dust' || theme.particleEffect === 'traffic') particle.speed += 48 + theme.particleDensity * 76;
    if (theme.particleEffect === 'pixels') particle.drift = -12 - Math.random() * 24;
    if (theme.particleEffect === 'fireflies') particle.speed *= 0.35;
    if (theme.particleEffect === 'traffic') particle.lightColor = Math.random() < 0.52 ? '#ff334f' : '#fff5cf';
    return particle;
  }

  function updateThemeAtmosphere(theme, deltaSeconds) {
    const worldActive = currentState === STATE.READY || currentState === STATE.PLAYING;
    if (worldActive) atmosphereTime += deltaSeconds;
    const particleStyle = `${theme.style}:${theme.particleEffect}`;
    if (ambientParticleStyle !== particleStyle) {
      ambientParticleStyle = particleStyle;
      ambientParticles.length = 0;
    }
    const particleCount = Math.round((coarsePointer ? 10 : 12) + theme.particleDensity * (coarsePointer ? 14 : 20));
    while (ambientParticles.length < particleCount) ambientParticles.push(makeAmbientParticle(theme, true));
    while (ambientParticles.length > particleCount) ambientParticles.pop();
    if (!worldActive) return;
    for (let index = ambientParticles.length - 1; index >= 0; index--) {
      const particle = ambientParticles[index];
      particle.x -= particle.speed * deltaSeconds;
      particle.y += particle.drift * deltaSeconds + Math.sin(particle.phase) * deltaSeconds * 4;
      particle.phase += deltaSeconds * (1.4 + particle.size * 0.4);
      if (particle.x < -32 || particle.y < -12 || particle.y > GROUND_Y) {
        ambientParticles[index] = makeAmbientParticle(theme);
      }
    }
  }

  function drawThemeAtmosphere(theme) {
    ctx.save();
    if (theme.style === 'forest') {
      for (let index = 0; index < 4; index++) {
        const beamX = 38 + index * 92 + Math.sin(atmosphereTime * 0.18 + index) * 15;
        const beam = ctx.createLinearGradient(beamX, 0, beamX + 55, GROUND_Y - 20);
        beam.addColorStop(0, `rgba(204, 255, 160, ${0.16 * (theme.rayStrength || 0)})`);
        beam.addColorStop(1, 'rgba(204, 255, 160, 0)');
        ctx.fillStyle = beam;
        ctx.beginPath(); ctx.moveTo(beamX - 7, 0); ctx.lineTo(beamX + 7, 0); ctx.lineTo(beamX + 66, GROUND_Y - 20); ctx.lineTo(beamX + 40, GROUND_Y - 20); ctx.closePath(); ctx.fill();
      }
    }

    ambientParticles.forEach(particle => {
      const pulse = 0.5 + Math.sin(particle.phase) * 0.5;
      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.28 + theme.particleDensity * 0.72);
      if (theme.particleEffect === 'mist' || theme.particleEffect === 'haze') {
        ctx.fillStyle = theme.particleEffect === 'mist' ? 'rgba(232, 251, 239, 0.5)' : 'rgba(218, 230, 238, 0.48)';
        ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * 2.2, 0, Math.PI * 2); ctx.fill();
        if (theme.particleEffect === 'mist') {
          ctx.fillStyle = 'rgba(208, 241, 235, 0.62)';
          ctx.beginPath(); ctx.arc(particle.x + 4, particle.y + 3, Math.max(0.7, particle.size * 0.35), 0, Math.PI * 2); ctx.fill();
        }
      } else if (theme.particleEffect === 'leaves') {
        ctx.fillStyle = theme.style === 'kerala' ? '#a6d75d' : '#d4df88';
        ctx.translate(particle.x, particle.y); ctx.rotate(Math.sin(particle.phase) * 0.7);
        ctx.beginPath(); ctx.ellipse(0, 0, particle.size * 1.9, particle.size * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(247, 255, 204, 0.55)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-particle.size, 0); ctx.lineTo(particle.size, 0); ctx.stroke();
      } else if (theme.particleEffect === 'gold') {
        ctx.shadowColor = '#ffc86b'; ctx.shadowBlur = glowBlur(7);
        ctx.fillStyle = pulse > 0.5 ? '#ffe69a' : '#e99a4c';
        ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * (0.5 + pulse * 0.55), 0, Math.PI * 2); ctx.fill();
      } else if (theme.particleEffect === 'fireflies') {
        const forestBlue = theme.style === 'forest' && particle.phase % 2 > 1;
        ctx.shadowColor = forestBlue ? '#55dfff' : '#caff70'; ctx.shadowBlur = glowBlur(theme.style === 'kerala' ? 10 : 15);
        ctx.fillStyle = forestBlue ? '#69eaff' : '#dcff70';
        ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * (0.55 + pulse * 0.7), 0, Math.PI * 2); ctx.fill();
      } else if (theme.particleEffect === 'sand' || theme.particleEffect === 'dust') {
        ctx.strokeStyle = theme.particleEffect === 'sand' ? '#ffe0a0' : '#d7e1e2';
        ctx.globalAlpha *= theme.particleEffect === 'sand' ? 0.42 + theme.particleDensity * 0.48 : 0.28 + theme.particleDensity * 0.42;
        ctx.lineWidth = particle.size * 0.55;
        ctx.beginPath(); ctx.moveTo(particle.x, particle.y); ctx.lineTo(particle.x + particle.size * (theme.particleEffect === 'sand' ? 4 : 9), particle.y - particle.size * 0.25); ctx.stroke();
      } else if (theme.particleEffect === 'stardust') {
        ctx.shadowColor = '#b9cfff'; ctx.shadowBlur = glowBlur(6);
        ctx.fillStyle = pulse > 0.6 ? '#ffffff' : '#9baed8';
        ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * 0.65, 0, Math.PI * 2); ctx.fill();
      } else if (theme.particleEffect === 'smoke') {
        ctx.fillStyle = 'rgba(174, 191, 201, 0.28)';
        ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * 1.7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(160, 182, 202, 0.18)'; ctx.beginPath(); ctx.moveTo(particle.x - 4, particle.y + 4); ctx.lineTo(particle.x + 5, particle.y + 4); ctx.stroke();
      } else if (theme.particleEffect === 'traffic') {
        ctx.globalAlpha *= theme.style === 'highway' && theme.cycleStage === 'NIGHT' ? 0.9 : 0.42;
        ctx.shadowColor = particle.lightColor; ctx.shadowBlur = glowBlur(theme.cycleStage === 'NIGHT' ? 8 : 3);
        ctx.strokeStyle = particle.lightColor; ctx.lineWidth = theme.cycleStage === 'NIGHT' ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(particle.x, particle.y); ctx.lineTo(particle.x + particle.size * 11, particle.y); ctx.stroke();
      } else if (theme.particleEffect === 'pixels') {
        const pixelColor = pulse > 0.5 ? '#46f4ff' : '#ff48c8';
        ctx.globalAlpha *= theme.emission < 3 ? 0.3 : theme.emission < 8 ? 0.6 : 1;
        ctx.shadowColor = pixelColor; ctx.shadowBlur = glowBlur(theme.cycleStage === 'NIGHT' ? 10 : 5);
        ctx.fillStyle = pixelColor;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      } else {
        ctx.shadowColor = '#d7ff7a'; ctx.shadowBlur = glowBlur(8);
        ctx.fillStyle = pulse > 0.45 ? '#e6f58a' : '#a9d76c';
        ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * 0.65, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
  }

  function drawThemeLighting(theme) {
    ctx.save();
    ctx.fillStyle = theme.lighting;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
    if (theme.style === 'cyberpunk' && theme.emission > 8) {
      const bloom = ctx.createLinearGradient(0, 0, V_WIDTH, GROUND_Y);
      const strength = Math.min(0.14, (theme.emission - 8) * 0.012);
      bloom.addColorStop(0, `rgba(31, 213, 255, ${strength})`);
      bloom.addColorStop(0.5, 'rgba(86, 34, 155, 0.025)');
      bloom.addColorStop(1, `rgba(255, 48, 174, ${strength})`);
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
    }
    ctx.restore();
  }

  function drawThemeLandmarks(theme, opacity = 1) {
    const drift = (worldFrame * gameSpeed * 0.12) % 440;
    const farDrift = (worldFrame * gameSpeed * 0.035) % 440;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = theme.far;
    for (let x = -440 - farDrift; x < V_WIDTH + 440; x += 440) {
      if (theme.style === 'desert') {
        ctx.fillStyle = theme.far;
        ctx.beginPath(); ctx.moveTo(x, GROUND_Y - 18); ctx.quadraticCurveTo(x + 120, GROUND_Y - 76, x + 240, GROUND_Y - 19); ctx.quadraticCurveTo(x + 340, GROUND_Y - 60, x + 440, GROUND_Y - 18); ctx.fill();
        // Distant pyramids sit behind the dunes and move at the slower parallax rate.
        ctx.fillStyle = '#d9a578';
        for (const pyramid of [[52, 92, 70], [181, 58, 44], [310, 78, 59]]) {
          const [px, width, height] = pyramid;
          ctx.beginPath(); ctx.moveTo(x + px, GROUND_Y - 21); ctx.lineTo(x + px + width / 2, GROUND_Y - 21 - height); ctx.lineTo(x + px + width, GROUND_Y - 21); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#c78e68';
          ctx.beginPath(); ctx.moveTo(x + px + width / 2, GROUND_Y - 21 - height); ctx.lineTo(x + px + width, GROUND_Y - 21); ctx.lineTo(x + px + width / 2, GROUND_Y - 21); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#d9a578';
        }
      } else if (theme.style === 'cyberpunk') {
        for (let building = 0; building < 11; building++) {
          const bx = x + building * 43;
          const height = 80 + ((building * 47 + 19) % 112);
          ctx.fillRect(bx, GROUND_Y - height, 34, height);
        }
      } else if (theme.style === 'highway') {
        ctx.beginPath(); ctx.moveTo(x, GROUND_Y - 16); ctx.lineTo(x + 95, GROUND_Y - 58); ctx.lineTo(x + 220, GROUND_Y - 20); ctx.lineTo(x + 330, GROUND_Y - 64); ctx.lineTo(x + 440, GROUND_Y - 16); ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(x, GROUND_Y - 10); ctx.quadraticCurveTo(x + 110, GROUND_Y - 104, x + 220, GROUND_Y - 14); ctx.quadraticCurveTo(x + 330, GROUND_Y - 95, x + 440, GROUND_Y - 10); ctx.fill();
      }
    }
    ctx.fillStyle = theme.near;
    if (theme.style === 'desert') {
      for (let x = -440 - drift; x < V_WIDTH + 440; x += 440) {
        ctx.fillStyle = theme.near;
        ctx.beginPath(); ctx.moveTo(x, GROUND_Y - 8); ctx.quadraticCurveTo(x + 115, GROUND_Y - 105, x + 240, GROUND_Y - 14); ctx.quadraticCurveTo(x + 340, GROUND_Y - 65, x + 440, GROUND_Y - 8); ctx.fill();
        // Low desert fortress with crenellated walls, corner towers and an arched gate.
        ctx.fillStyle = '#8c5546';
        ctx.fillRect(x + 274, GROUND_Y - 83, 117, 75);
        ctx.fillRect(x + 267, GROUND_Y - 105, 30, 97);
        ctx.fillRect(x + 369, GROUND_Y - 99, 29, 91);
        ctx.fillRect(x + 263, GROUND_Y - 111, 38, 9);
        ctx.fillRect(x + 365, GROUND_Y - 105, 37, 9);
        for (let merlon = 0; merlon < 6; merlon++) ctx.fillRect(x + 278 + merlon * 19, GROUND_Y - 91, 10, 9);
        ctx.fillStyle = '#50343b';
        ctx.beginPath(); ctx.moveTo(x + 321, GROUND_Y - 8); ctx.lineTo(x + 321, GROUND_Y - 37); ctx.arc(x + 334, GROUND_Y - 37, 13, Math.PI, 0); ctx.lineTo(x + 347, GROUND_Y - 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d49a67';
        ctx.fillRect(x + 276, GROUND_Y - 78, 4, 18); ctx.fillRect(x + 384, GROUND_Y - 77, 4, 16);

        // Sphinx in profile: seated body, raised paws and a distinctive headdress.
        ctx.fillStyle = '#c28a59';
        ctx.beginPath(); ctx.moveTo(x + 106, GROUND_Y - 10); ctx.quadraticCurveTo(x + 116, GROUND_Y - 38, x + 149, GROUND_Y - 40); ctx.lineTo(x + 169, GROUND_Y - 48); ctx.lineTo(x + 184, GROUND_Y - 45); ctx.lineTo(x + 181, GROUND_Y - 35); ctx.lineTo(x + 169, GROUND_Y - 32); ctx.lineTo(x + 164, GROUND_Y - 10); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 165, GROUND_Y - 43); ctx.lineTo(x + 165, GROUND_Y - 68); ctx.lineTo(x + 172, GROUND_Y - 82); ctx.lineTo(x + 188, GROUND_Y - 77); ctx.lineTo(x + 193, GROUND_Y - 65); ctx.lineTo(x + 187, GROUND_Y - 53); ctx.lineTo(x + 179, GROUND_Y - 44); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#9f674d';
        ctx.beginPath(); ctx.moveTo(x + 163, GROUND_Y - 69); ctx.lineTo(x + 171, GROUND_Y - 87); ctx.lineTo(x + 190, GROUND_Y - 81); ctx.lineTo(x + 198, GROUND_Y - 63); ctx.lineTo(x + 190, GROUND_Y - 69); ctx.lineTo(x + 185, GROUND_Y - 77); ctx.lineTo(x + 177, GROUND_Y - 69); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f7d39a'; ctx.fillRect(x + 185, GROUND_Y - 68, 2.5, 2);
        if (theme.cityGlow > 0.02) {
          const cityX = x + 299;
          const glow = ctx.createRadialGradient(cityX, GROUND_Y - 184, 2, cityX, GROUND_Y - 184, 72);
          glow.addColorStop(0, `rgba(255, 181, 119, ${theme.cityGlow * 0.36})`);
          glow.addColorStop(1, 'rgba(255, 135, 92, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(cityX - 72, GROUND_Y - 256, 144, 144);
          ctx.save();
          ctx.globalAlpha = theme.cityGlow * opacity;
          ctx.fillStyle = '#ffd783';
          for (let lightIndex = 0; lightIndex < 6; lightIndex++) {
            ctx.fillRect(cityX - 8 + (lightIndex % 2) * 7, GROUND_Y - 192 + Math.floor(lightIndex / 2) * 9, 2, 3);
          }
          ctx.restore();
        }
      }
    } else if (theme.style === 'cyberpunk') {
      for (let x = -440 - drift; x < V_WIDTH + 440; x += 440) {
        const windowGlow = 0.1 + 0.9 * (theme.emission / 20);
        for (let i = 0; i < 8; i++) {
          const bx = x + i * 58; const h = 55 + ((i * 37) % 90); ctx.fillRect(bx, GROUND_Y - h, 42, h);
          for (let row = 0; row < Math.floor(h / 16); row++) {
            const flicker = Math.sin(worldFrame * 0.035 + i * 5.7 + row * 3.1);
            if (flicker > -0.15) {
              ctx.globalAlpha = windowGlow * opacity;
              ctx.fillStyle = flicker > 0.6 ? '#70f5ff' : '#e45bc8';
              ctx.fillRect(bx + 7 + (row % 2) * 15, GROUND_Y - h + 8 + row * 16, 5, 7);
              ctx.globalAlpha = opacity;
              ctx.fillStyle = theme.near;
            }
          }
        }
        ctx.fillRect(x + 204, GROUND_Y - 172, 27, 162); ctx.fillRect(x + 210, GROUND_Y - 212, 15, 40);
      }
    } else if (theme.style === 'highway') {
      for (let x = -440 - drift; x < V_WIDTH + 440; x += 440) {
        ctx.fillStyle = '#39484c';
        ctx.fillRect(x + 62, GROUND_Y - 166, 12, 158);
        ctx.fillRect(x + 276, GROUND_Y - 166, 12, 158);
        ctx.fillRect(x + 58, GROUND_Y - 171, 232, 9);
        ctx.fillStyle = '#849194';
        ctx.fillRect(x + 65, GROUND_Y - 164, 3, 152);
        ctx.fillRect(x + 279, GROUND_Y - 164, 3, 152);
        ctx.fillRect(x + 62, GROUND_Y - 173, 224, 2);
        ctx.fillStyle = '#293538';
        ctx.fillRect(x + 58, GROUND_Y - 12, 20, 5);
        ctx.fillRect(x + 272, GROUND_Y - 12, 20, 5);
        ctx.fillStyle = '#75888b';
        ctx.fillRect(x + 148, GROUND_Y - 162, 8, 13);
        ctx.fillRect(x + 252, GROUND_Y - 162, 8, 13);
        ctx.fillStyle = '#263337';
        ctx.fillRect(x + 146, GROUND_Y - 151, 116, 29);
        ctx.fillStyle = '#52666a';
        ctx.fillRect(x + 149, GROUND_Y - 148, 110, 23);
        ctx.strokeStyle = '#a6b4b4'; ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 146, GROUND_Y - 151, 116, 29);
        ctx.fillStyle = '#f3d78e'; ctx.font = '700 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('EXIT 08', x + 204, GROUND_Y - 136);
        if (theme.streetlightIntensity > 0.02) {
          ctx.save();
          ctx.globalAlpha = theme.streetlightIntensity * opacity;
          ctx.shadowColor = '#ffe4a3'; ctx.shadowBlur = glowBlur(12 * theme.streetlightIntensity);
          ctx.fillStyle = '#fff0c4';
          for (const lamp of [[68, -173], [282, -173]]) {
            ctx.beginPath(); ctx.arc(x + lamp[0], GROUND_Y + lamp[1], 3, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        }
        if (theme.trafficIntensity > 0.02) {
          ctx.save();
          ctx.globalAlpha = theme.trafficIntensity * opacity;
          for (let lightIndex = 0; lightIndex < 8; lightIndex++) {
            const lightX = x + ((lightIndex * 67 - atmosphereTime * (theme.cycleStage === 'NIGHT' ? 54 : 28)) % 430 + 430) % 430;
            const lightY = GROUND_Y - 28 - (lightIndex % 3) * 5;
            const lightColor = lightIndex % 2 ? '#ff334f' : '#fff5cf';
            ctx.shadowColor = lightColor;
            ctx.shadowBlur = glowBlur(theme.cycleStage === 'NIGHT' ? 8 : 3);
            ctx.fillStyle = lightColor;
            ctx.fillRect(lightX, lightY, 5, 2);
          }
          ctx.restore();
        }
        ctx.fillStyle = theme.near;
      }
    } else {
      for (let x = -440 - drift; x < V_WIDTH + 440; x += 440) {
        ctx.beginPath(); ctx.moveTo(x, GROUND_Y - 8); ctx.quadraticCurveTo(x + 110, GROUND_Y - 96, x + 220, GROUND_Y - 12); ctx.quadraticCurveTo(x + 340, GROUND_Y - 130, x + 440, GROUND_Y - 8); ctx.fill();
        if (theme.style === 'kerala') {
          for (let palmX = x + 95; palmX < x + 400; palmX += 145) { ctx.strokeStyle = theme.near; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(palmX, GROUND_Y - 12); ctx.quadraticCurveTo(palmX - 8, GROUND_Y - 70, palmX + 5, GROUND_Y - 126); ctx.stroke(); ctx.fillStyle = theme.near; for (let a = -2; a <= 2; a++) { ctx.beginPath(); ctx.ellipse(palmX + a * 15, GROUND_Y - 128 + Math.abs(a) * 8, 22, 5, a * 0.28, 0, Math.PI * 2); ctx.fill(); } }
          ctx.fillStyle = '#4b2f23';
          ctx.beginPath(); ctx.moveTo(x + 172, GROUND_Y - 25); ctx.quadraticCurveTo(x + 226, GROUND_Y - 7, x + 280, GROUND_Y - 25); ctx.lineTo(x + 266, GROUND_Y - 12); ctx.lineTo(x + 185, GROUND_Y - 12); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#b98a55'; ctx.fillRect(x + 209, GROUND_Y - 40, 35, 17); ctx.fillRect(x + 217, GROUND_Y - 49, 18, 9);
          ctx.fillStyle = theme.near;
        } else {
          ctx.fillStyle = theme.near; ctx.beginPath(); ctx.arc(x + 260, GROUND_Y - 62, 20, Math.PI, 0); ctx.fillRect(x + 240, GROUND_Y - 62, 40, 50); ctx.fill();
          ctx.fillStyle = '#6e8060'; ctx.fillRect(x + 98, GROUND_Y - 93, 12, 80); ctx.fillRect(x + 154, GROUND_Y - 93, 12, 80); ctx.fillRect(x + 88, GROUND_Y - 101, 88, 12);
          ctx.fillStyle = '#98a884'; ctx.strokeStyle = '#354e3c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + 131, GROUND_Y - 101, 44, Math.PI, 0); ctx.lineTo(x + 175, GROUND_Y - 89); ctx.lineTo(x + 87, GROUND_Y - 89); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
    }
    if (theme.style === 'cyberpunk') {
      ctx.strokeStyle = '#353052'; ctx.globalAlpha = opacity; ctx.lineWidth = 1;
      for (let x = -40; x < V_WIDTH + 40; x += 40) { ctx.beginPath(); ctx.moveTo(V_WIDTH / 2, GROUND_Y - 42); ctx.lineTo(x, GROUND_Y); ctx.stroke(); }
      for (let y = GROUND_Y - 34; y < GROUND_Y; y += 12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(V_WIDTH, y); ctx.stroke(); }
    }
    if (theme.style === 'kerala') {
      ctx.globalAlpha = opacity;
      ctx.fillStyle = theme.accent;
      ctx.fillRect(0, GROUND_Y - 11, V_WIDTH, 9);
      ctx.fillStyle = '#a5e8d9';
      for (let x = -(worldFrame * 0.55 % 56); x < V_WIDTH; x += 56) ctx.fillRect(x, GROUND_Y - 8, 22, 1);
    }
    if (theme.style === 'highway') {
      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#596366';
      ctx.fillRect(0, GROUND_Y - 87, V_WIDTH, 10);
      ctx.fillStyle = theme.accent;
      ctx.fillRect(0, GROUND_Y - 77, V_WIDTH, 3);
      ctx.fillStyle = '#788184';
      for (let x = 14; x < V_WIDTH; x += 42) ctx.fillRect(x, GROUND_Y - 77, 3, 8);
    }
    ctx.restore();
  }

  function drawThemeGround(theme, opacity = 1, includeBase = true) {
    ctx.save();
    if (includeBase) {
      const gradient = ctx.createLinearGradient(0, GROUND_Y, 0, V_HEIGHT);
      gradient.addColorStop(0, theme.groundTop);
      gradient.addColorStop(0.18, theme.groundBody);
      gradient.addColorStop(1, theme.groundBody);
      ctx.globalAlpha = 1;
      ctx.fillStyle = gradient; ctx.fillRect(0, GROUND_Y, V_WIDTH, GROUND_HEIGHT);
      ctx.fillStyle = theme.accent; ctx.fillRect(0, GROUND_Y, V_WIDTH, 3);
    }
    ctx.globalAlpha = opacity;
    if (theme.style === 'highway') {
      ctx.fillStyle = '#d2d8d6';
      for (let x = -(groundScrollOffset * 2 % 78); x < V_WIDTH; x += 78) ctx.fillRect(x, GROUND_Y + 53, 38, 4);
      ctx.fillStyle = '#41474a'; ctx.fillRect(0, GROUND_Y + 8, V_WIDTH, 2);
      ctx.fillStyle = '#626c70';
      for (let x = -(groundScrollOffset % 64); x < V_WIDTH; x += 64) ctx.fillRect(x, GROUND_Y + 16, 28, 2);
    } else if (theme.style === 'cyberpunk') {
      ctx.strokeStyle = '#3d3471'; ctx.lineWidth = 1.4;
      for (let x = -(groundScrollOffset * 2 % 58); x < V_WIDTH + 58; x += 58) {
        ctx.beginPath(); ctx.moveTo(V_WIDTH / 2 + (x - V_WIDTH / 2) * 0.18, GROUND_Y); ctx.lineTo(x, V_HEIGHT); ctx.stroke();
      }
      for (let y = GROUND_Y + 14; y < V_HEIGHT; y += 17) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(V_WIDTH, y); ctx.stroke();
      }
      ctx.fillStyle = '#53e9f2'; ctx.fillRect(0, GROUND_Y + 4, V_WIDTH, 2);
      ctx.fillStyle = '#f14bad'; ctx.fillRect(0, GROUND_Y + 7, V_WIDTH, 1);
    } else if (theme.style === 'desert') {
      ctx.fillStyle = '#f6d18b';
      for (let x = -(groundScrollOffset % 42); x < V_WIDTH; x += 42) ctx.fillRect(x, GROUND_Y + 12 + (x % 9), 2, 2);
    } else if (theme.style === 'kerala') {
      ctx.fillStyle = '#2c6b4a';
      for (let x = -(groundScrollOffset % 44); x < V_WIDTH; x += 44) {
        ctx.beginPath(); ctx.moveTo(x + 8, GROUND_Y + 8); ctx.lineTo(x + 13, GROUND_Y - 1); ctx.lineTo(x + 17, GROUND_Y + 8); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 25, GROUND_Y + 8); ctx.lineTo(x + 32, GROUND_Y - 4); ctx.lineTo(x + 34, GROUND_Y + 8); ctx.fill();
      }
      ctx.strokeStyle = '#a5e8d9'; ctx.lineWidth = 1;
      for (let x = -(groundScrollOffset % 52); x < V_WIDTH; x += 52) {
        ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 34); ctx.quadraticCurveTo(x + 20, GROUND_Y + 30, x + 42, GROUND_Y + 34); ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#586c3f';
      for (let x = -(groundScrollOffset % 74); x < V_WIDTH; x += 74) {
        ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 44); ctx.quadraticCurveTo(x + 24, GROUND_Y + 7, x + 48, GROUND_Y + 42); ctx.strokeStyle = '#334c31'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillRect(x + 8, GROUND_Y + 13, 14, 3); ctx.fillRect(x + 45, GROUND_Y + 70, 16, 3);
      }
    }
    ctx.restore();
  }

  function drawThemeBanner() {
    if (!themeBannerTimer) return;
    const fade = Math.min(1, themeBannerTimer / 0.4, (THEME_BANNER_SECONDS - themeBannerTimer) / 0.3);
    const theme = THEMES[themeIndex];
    ctx.save(); ctx.globalAlpha = Math.max(0, fade);
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = glowBlur(16);
    ctx.fillStyle = 'rgba(12, 18, 28, 0.82)';
    roundRect(ctx, 28, 104, V_WIDTH - 56, 58, 20);
    ctx.fill();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = '800 24px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.accent;
    ctx.fillText(`ENTERING ${theme.name.toUpperCase()}`, V_WIDTH / 2, 133, V_WIDTH - 76);
    ctx.restore();
  }

  // Night Stars
  const stars = [];
  for (let i = 0; i < 48; i++) {
    stars.push({
      x: Math.random() * V_WIDTH,
      y: Math.random() * (GROUND_Y - 95),
      size: Math.random() * 1.6 + 0.6,
      twinkleOffset: Math.random() * Math.PI * 2
    });
  }

  // Shooting Star at Night
  let shootingStar = { x: -100, y: 0, vx: 0, vy: 0, life: 0 };
  function updateShootingStar() {
    if (shootingStar.life > 0) {
      shootingStar.x += shootingStar.vx;
      shootingStar.y += shootingStar.vy;
      shootingStar.life--;
    } else if (Math.random() < 0.006) {
      shootingStar.x = Math.random() * V_WIDTH * 0.7;
      shootingStar.y = Math.random() * 110 + 20;
      shootingStar.vx = Math.random() * 4 + 4;
      shootingStar.vy = Math.random() * 2 + 1.8;
      shootingStar.life = 24;
    }
  }

  // --- Parallax Moving Clouds ---
  const clouds = [
    { x: 30, y: 45, scale: 0.95, speed: 0.18 },
    { x: 155, y: 78, scale: 1.25, speed: 0.24 },
    { x: 275, y: 36, scale: 0.82, speed: 0.15 },
    { x: 390, y: 92, scale: 1.10, speed: 0.21 },
    { x: 505, y: 56, scale: 0.90, speed: 0.19 }
  ];

  function updateClouds() {
    if (currentState === STATE.PLAYING || currentState === STATE.READY) {
      clouds.forEach(cl => {
        // Drifting backward across the sky
        cl.x -= cl.speed * gameSpeed;
        if (cl.x + 140 * cl.scale < -40) {
          cl.x = V_WIDTH + 40 + Math.random() * 60;
          cl.y = 28 + Math.random() * 75;
        }
      });
    }
  }

  function drawClouds(cycle) {
    clouds.forEach(cl => {
      ctx.save();
      ctx.translate(cl.x, cl.y);
      ctx.scale(cl.scale, cl.scale);

      // Cloud soft underbelly shadow
      ctx.fillStyle = cycle.cloudShadow;
      ctx.beginPath();
      ctx.arc(22, 17, 18, 0, Math.PI * 2);
      ctx.arc(44, 10, 24, 0, Math.PI * 2);
      ctx.arc(70, 16, 19, 0, Math.PI * 2);
      ctx.arc(90, 22, 14, 0, Math.PI * 2);
      ctx.fill();

      // Cloud body gradient
      const clGrad = ctx.createLinearGradient(0, -10, 0, 32);
      clGrad.addColorStop(0, cycle.cloudTop);
      clGrad.addColorStop(1, cycle.cloudBot);

      ctx.fillStyle = clGrad;
      ctx.beginPath();
      ctx.arc(20, 15, 18, 0, Math.PI * 2);
      ctx.arc(42, 8, 24, 0, Math.PI * 2);
      ctx.arc(68, 14, 19, 0, Math.PI * 2);
      ctx.arc(88, 20, 14, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      // Top Highlight Rim
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(42, 8, 24, Math.PI * 1.1, Math.PI * 1.8);
      ctx.stroke();

      ctx.restore();
    });
  }

  // --- Smooth Day & Night Interpolation ---
  // Every colour is parsed once into [r,g,b,a] so sky, clouds and shadows
  // all blend continuously instead of snapping when a stage changes.
  const CYCLE_AUTO_SPEED = 0.00018; // ~90s for a full day at 60fps
  const CYCLE_COLOR_KEYS = ['skyTop', 'skyMid', 'skyBot', 'cloudTop', 'cloudBot', 'cloudShadow'];

  function parseColor(c) {
    if (Array.isArray(c)) return [c[0], c[1], c[2], 1];
    if (c[0] === '#') {
      const h = c.length === 4 ? c.slice(1).split('').map(x => x + x).join('') : c.slice(1);
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
    }
    const m = c.match(/[\d.]+/g).map(Number);
    return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1];
  }

  CYCLES.forEach(cy => {
    cy.parsed = {};
    CYCLE_COLOR_KEYS.forEach(k => { cy.parsed[k] = parseColor(cy[k]); });
  });

  function mixColor(a, b, t) {
    return a.map((v, i) => v + (b[i] - v) * t);
  }

  function toCss(c) {
    return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${+c[3].toFixed(3)})`;
  }

  // Half linear, half smoothstep: no hard stop-and-go at each keyframe
  function easeBlend(t) {
    const s = t * t * (3 - 2 * t);
    return t + (s - t) * 0.5;
  }

  function getCycleState() {
    const mode = CYCLE_MODES[currentCycleModeIndex];
    const worldActive = currentState === STATE.READY || currentState === STATE.PLAYING;

    if (mode === 'AUTO' && worldActive) {
      // Score bonus is fed in a little each frame so the sky never jumps
      const bonusStep = cycleBoost * 0.02;
      cycleBoost -= bonusStep;
      cycleProgress = (cycleProgress + CYCLE_AUTO_SPEED + bonusStep) % 1.0;
    } else if (mode !== 'AUTO' && worldActive) {
      cycleBoost = 0;
      let targetP = 0.0;
      if (mode === 'DAY') targetP = 0.0;
      else if (mode === 'SUNSET') targetP = 0.25;
      else if (mode === 'NIGHT') targetP = 0.50;
      else if (mode === 'DAWN') targetP = 0.75;

      let diff = targetP - cycleProgress;
      if (diff > 0.5) diff -= 1.0;
      if (diff < -0.5) diff += 1.0;
      cycleProgress = (cycleProgress + diff * 0.03 + 1.0) % 1.0;
    }

    const stageFloat = cycleProgress * 4;
    const stageBase = Math.floor(stageFloat);
    const stageLerp = stageFloat - stageBase;
    const t = easeBlend(stageLerp);

    const fromCycle = CYCLES[stageBase % 4];
    const toCycle = CYCLES[(stageBase + 1) % 4];
    const mix = (key) => toCss(mixColor(fromCycle.parsed[key], toCycle.parsed[key], t));

    const nightRatio = fromCycle.nightRatio + (toCycle.nightRatio - fromCycle.nightRatio) * t;
    const pipeBrightness = fromCycle.pipeBrightness + (toCycle.pipeBrightness - fromCycle.pipeBrightness) * t;

    if (cycleText && cycleIcon) {
      if (mode === 'AUTO') {
        const active = stageLerp < 0.5 ? fromCycle : toCycle;
        cycleText.textContent = active.name;
        cycleIcon.textContent = active.icon;
      } else {
        cycleText.textContent = mode;
        cycleIcon.textContent = CYCLES.find(c => c.name === mode).icon;
      }
    }

    return {
      skyTop: mix('skyTop'),
      skyMid: mix('skyMid'),
      skyBot: mix('skyBot'),
      cloudTop: mix('cloudTop'),
      cloudBot: mix('cloudBot'),
      cloudShadow: mix('cloudShadow'),
      nightRatio,
      pipeBrightness,
      cycleProgress,
      stageName: fromCycle.name,
      nextStageName: toCycle.name,
      stageLerp
    };
  }

  // --- Dynamic Gradual Seasons Interpolation ---
  function getSeasonState() {
    const sMode = SEASON_MODES[currentSeasonModeIndex];

    if (sMode === 'AUTO') {
      // Smooth continuous advance (~140s full cycle across all 4 seasons)
      const seasonBonusStep = seasonBoost * 0.02;
      seasonBoost -= seasonBonusStep;
      seasonProgress = (seasonProgress + 0.00012 + seasonBonusStep) % 1.0;
    } else {
      let targetP = 0.0;
      if (sMode === 'SPRING') targetP = 0.0;
      else if (sMode === 'SUMMER') targetP = 0.25;
      else if (sMode === 'AUTUMN') targetP = 0.50;
      else if (sMode === 'WINTER') targetP = 0.75;

      let diff = targetP - seasonProgress;
      if (diff > 0.5) diff -= 1.0;
      if (diff < -0.5) diff += 1.0;
      seasonProgress = (seasonProgress + diff * 0.06 + 1.0) % 1.0;
    }

    const stageFloat = seasonProgress * 4;
    const stageIndex = Math.floor(stageFloat);
    const stageLerp = stageFloat - stageIndex;
    const fromSeason = SEASONS[stageIndex % 4];
    const toSeason = SEASONS[(stageIndex + 1) % 4];

    const activeName = stageLerp < 0.5 ? fromSeason.name : toSeason.name;
    const activeIcon = stageLerp < 0.5 ? fromSeason.icon : toSeason.icon;

    if (seasonText && seasonIcon) {
      seasonText.textContent = sMode === 'AUTO' ? activeName : sMode;
      seasonIcon.textContent = sMode === 'AUTO' ? activeIcon : fromSeason.icon;
    }

    return { seasonIndex: stageIndex % 4 };
  }

  function drawSky(cycle, theme) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    const skyMix = (base, themed) => {
      const color = themeColor(themed);
      return toCss(mixColor(base, color, theme.blend));
    };
    skyGrad.addColorStop(0, skyMix(parseColor(cycle.skyTop), theme.skyTop));
    skyGrad.addColorStop(0.55, skyMix(parseColor(cycle.skyMid), theme.skyMid));
    skyGrad.addColorStop(1, skyMix(parseColor(cycle.skyBot), theme.skyBot));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Stars at Night
    const starVis = Math.pow(cycle.nightRatio, 1.5);
    if (starVis > 0.01) {
      stars.forEach(st => {
        const twinkle = Math.sin(worldFrame * 0.08 + st.twinkleOffset) * 0.35 + 0.65;
        ctx.save();
        ctx.globalAlpha = starVis * twinkle;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      updateShootingStar();
      if (shootingStar.life > 0) {
        ctx.save();
        ctx.globalAlpha = starVis * (shootingStar.life / 24);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(shootingStar.x, shootingStar.y);
        ctx.lineTo(shootingStar.x - shootingStar.vx * 3, shootingStar.y - shootingStar.vy * 3);
        ctx.stroke();
        ctx.restore();
      }
    }

    const smooth = (t) => t * t * (3 - 2 * t);
    const edgeFade = (t, w) => Math.max(0, Math.min(1, t / w, (1 - t) / w));

    // Celestial Sun: rises around progress 0.78, sets around 0.46, fading near the horizon
    const sunT = ((cycle.cycleProgress + 0.22) % 1.0) / 0.68;
    if (sunT <= 1) {
      const sunAlpha = smooth(edgeFade(sunT, 0.14)) * Math.max(0, 1 - cycle.nightRatio * 1.5);
      if (sunAlpha > 0.01) {
        const sunX = V_WIDTH * 0.12 + sunT * (V_WIDTH * 0.76);
        const sunY = 80 + Math.pow(sunT - 0.5, 2) * 4 * 250;

        ctx.save();
        ctx.globalAlpha = sunAlpha;

        // Soft Warm Halo
        const haloGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 56);
        haloGrad.addColorStop(0, 'rgba(255, 245, 180, 0.6)');
        haloGrad.addColorStop(0.5, 'rgba(255, 220, 120, 0.25)');
        haloGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 56, 0, Math.PI * 2);
        ctx.fill();

        // Radiant Sun Disk
        const sunGrad = ctx.createRadialGradient(sunX - 6, sunY - 6, 2, sunX, sunY, 26);
        sunGrad.addColorStop(0, '#ffffff');
        sunGrad.addColorStop(0.4, '#fff688');
        sunGrad.addColorStop(1, '#ffc838');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // Celestial Moon: crosses the sky from progress 0.34 to 0.92, fading at both ends
    const moonT = ((cycle.cycleProgress - 0.34 + 1.0) % 1.0) / 0.58;
    if (moonT <= 1) {
      const moonAlpha = smooth(edgeFade(moonT, 0.18)) * Math.min(1, cycle.nightRatio * 1.6);
      if (moonAlpha > 0.01) {
        const moonX = V_WIDTH * 0.14 + moonT * (V_WIDTH * 0.72);
        const moonY = 70 + Math.pow(moonT - 0.5, 2) * 4 * 220;

        ctx.save();
        ctx.globalAlpha = moonAlpha;

        // Soft Lunar Halo
        const moonHalo = ctx.createRadialGradient(moonX, moonY, 12, moonX, moonY, 48);
        moonHalo.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        moonHalo.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = moonHalo;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 48, 0, Math.PI * 2);
        ctx.fill();

        // Crescent: outer disc minus an offset disc (true cut-out, so it stays clean while fading)
        ctx.beginPath();
        ctx.arc(moonX, moonY, 20, 0, Math.PI * 2);
        ctx.clip();
        ctx.beginPath();
        ctx.rect(moonX - 30, moonY - 30, 60, 60);
        ctx.moveTo(moonX + 8 + 17.5, moonY - 4);
        ctx.arc(moonX + 8, moonY - 4, 17.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f8f9fa';
        ctx.fill('evenodd');

        ctx.restore();
      }
    }
  }

  // --- Hand-Crafted 3D Cylindrical Classic Green Pipes ---
  const pipes = [];
  const PIPE_WIDTH = 62;
  const PIPE_GAP = 152;
  const PIPE_SPACING = 235;   // horizontal distance between pipe pairs (px)
  let pipeTimer = 0;
  let roomPipeSeed = 0;

  function pipeRandom() {
    if (!roomPipeSeed) return Math.random();
    // Mulberry32: deterministic pipe gaps for every player in the same room round.
    roomPipeSeed = (roomPipeSeed + 0x6D2B79F5) | 0;
    let value = roomPipeSeed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  class PipePair {
    constructor(x) {
      this.x = x;
      this.w = PIPE_WIDTH;
      const minCenter = 130 + PIPE_GAP / 2;
      const maxCenter = GROUND_Y - 80 - PIPE_GAP / 2;
      this.gapCenter = Math.floor(pipeRandom() * (maxCenter - minCenter + 1)) + minCenter;
      this.topHeight = this.gapCenter - PIPE_GAP / 2;
      this.bottomY = this.gapCenter + PIPE_GAP / 2;
      this.bottomHeight = GROUND_Y - this.bottomY;
      this.passed = false;
    }

    update() {
      this.x -= gameSpeed;
    }

    draw(cycle, theme) {
      // Soft ambient drop shadow cast behind pipes
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.fillRect(this.x + 8, 0, this.w, this.topHeight);
      ctx.fillRect(this.x + 8, this.bottomY, this.w, this.bottomHeight);
      ctx.restore();

      // Top Pipe (hanging down)
      this.drawPipeSection(this.x, 0, this.w, this.topHeight, true, cycle, theme);
      // Bottom Pipe (standing up)
      this.drawPipeSection(this.x, this.bottomY, this.w, this.bottomHeight, false, cycle, theme);
    }

    drawPipeSection(x, y, w, h, isTop, cycle, theme) {
      const shaftColors = theme.pipe;
      const lipColors = theme.lip;
      const lipHeight = theme.style === 'desert' ? 34 : (theme.style === 'highway' ? 32 : 28);
      const lipOverlap = theme.style === 'desert' ? 8 : 5;
      const lipWidth = w + lipOverlap * 2;
      const lipX = x - lipOverlap;
      const lipY = isTop ? y + h - lipHeight : y;
      const shaftY = isTop ? y : y + lipHeight;
      const shaftHeight = Math.max(0, isTop ? h - lipHeight : h - lipHeight);

      // --- 1. Pipe Shaft Cylindrical 3D Texture ---
      const shaftGrad = ctx.createLinearGradient(x, 0, x + w, 0);
      shaftGrad.addColorStop(0, shaftColors[0]);
      shaftGrad.addColorStop(0.18, shaftColors[1]);
      shaftGrad.addColorStop(0.38, shaftColors[2]);
      shaftGrad.addColorStop(0.68, shaftColors[3]);
      shaftGrad.addColorStop(0.9, shaftColors[4]);
      shaftGrad.addColorStop(1, shaftColors[5]);

      const neonColor = isTop ? '#43f5ff' : '#ff48c9';
      ctx.save();
      if (theme.style === 'cyberpunk') {
        ctx.shadowColor = neonColor;
        ctx.shadowBlur = glowBlur(theme.emission);
      }
      ctx.fillStyle = shaftGrad;
      ctx.fillRect(x, shaftY, w, shaftHeight);
      ctx.restore();

      // Shaft Outline
      ctx.save();
      if (theme.style === 'cyberpunk') {
        ctx.shadowColor = neonColor;
        ctx.shadowBlur = glowBlur(theme.emission);
      }
      ctx.strokeStyle = theme.style === 'cyberpunk' ? neonColor : theme.outline;
      if (theme.style === 'cyberpunk') ctx.globalAlpha = Math.max(0.1, theme.emission / 20);
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, shaftY, w, shaftHeight);
      ctx.restore();

      // Glossy Vertical Specular Stripe
      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.fillRect(x + w * 0.32, shaftY, 3, shaftHeight);

      ctx.save();
      ctx.beginPath(); ctx.rect(x, shaftY, w, shaftHeight); ctx.clip();
      if (theme.style === 'kerala') {
        for (let nodeY = shaftY + 34; nodeY < shaftY + shaftHeight; nodeY += 58) {
          ctx.fillStyle = '#183b2c'; ctx.fillRect(x + 1, nodeY - 3, w - 2, 5);
          ctx.fillStyle = '#7ab878'; ctx.fillRect(x + 2, nodeY - 3, w - 4, 1.3);
          ctx.fillStyle = '#0e2f25'; ctx.fillRect(x + 2, nodeY + 1, w - 4, 1.5);
        }
        ctx.globalAlpha = theme.vineOpacity;
        ctx.strokeStyle = theme.cycleStage === 'NIGHT' ? '#729fbd' : '#1a4b35'; ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(x + 8, shaftY); ctx.bezierCurveTo(x + 54, shaftY + shaftHeight * 0.28 + Math.sin(worldFrame * 0.03) * 4, x + 8, shaftY + shaftHeight * 0.62, x + 49, shaftY + shaftHeight);
        ctx.stroke();
        for (let leafY = shaftY + 24; leafY < shaftY + shaftHeight; leafY += 48) {
          const leafX = x + (Math.sin(leafY * 0.12) > 0 ? 42 : 18);
          ctx.fillStyle = '#7fbd54';
          ctx.beginPath(); ctx.ellipse(leafX, leafY, 8, 3.4, -0.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#b0d879'; ctx.fillRect(leafX - 2, leafY - 1, 4, 1);
        }
        const wetSheen = ctx.createLinearGradient(x + 4, 0, x + 19, 0);
        wetSheen.addColorStop(0, 'rgba(225,255,219,0.42)'); wetSheen.addColorStop(1, 'rgba(225,255,219,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = wetSheen; ctx.fillRect(x + 4, shaftY, 15, shaftHeight);
      } else if (theme.style === 'desert') {
        ctx.strokeStyle = '#e7bd71'; ctx.lineWidth = 1;
        for (let blockY = shaftY + 48; blockY < shaftY + shaftHeight; blockY += 64) {
          ctx.beginPath(); ctx.moveTo(x + 3, blockY); ctx.lineTo(x + w - 3, blockY); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + 21, blockY - 64); ctx.lineTo(x + 21, blockY); ctx.moveTo(x + 43, blockY); ctx.lineTo(x + 43, blockY + 64); ctx.stroke();
        }
        ctx.strokeStyle = '#795032'; ctx.lineWidth = 1.2;
        for (let crackY = shaftY + 28; crackY < shaftY + shaftHeight; crackY += 87) {
          const crackX = x + 12 + (Math.floor(crackY / 87) % 3) * 17;
          ctx.beginPath(); ctx.moveTo(crackX, crackY); ctx.lineTo(crackX + 5, crackY + 7); ctx.lineTo(crackX + 2, crackY + 13); ctx.lineTo(crackX + 8, crackY + 19); ctx.stroke();
        }
        const sunEdge = ctx.createLinearGradient(x, 0, x + 12, 0);
        const pipeBrightness = Number.isFinite(cycle.pipeBrightness) ? cycle.pipeBrightness : 1;
        const sunHighlightOpacity = Math.max(0, Math.min(1, 0.28 + 0.38 * pipeBrightness));
        sunEdge.addColorStop(0, `rgba(255,237,174,${sunHighlightOpacity})`); sunEdge.addColorStop(1, 'rgba(255,237,174,0)');
        ctx.fillStyle = sunEdge; ctx.fillRect(x, shaftY, 12, shaftHeight);
      } else if (theme.style === 'forest') {
        ctx.strokeStyle = theme.mushroomGlow > 0.7 ? '#55c8bd' : '#374436'; ctx.lineWidth = 1.2;
        ctx.shadowColor = '#4de0d2'; ctx.shadowBlur = glowBlur(5 * theme.mushroomGlow);
        for (let runeY = shaftY + 38; runeY < shaftY + shaftHeight; runeY += 76) {
          const runeX = x + 13 + (Math.floor(runeY / 76) % 2) * 17;
          ctx.beginPath(); ctx.moveTo(runeX, runeY - 8); ctx.lineTo(runeX + 5, runeY); ctx.lineTo(runeX, runeY + 8); ctx.moveTo(runeX + 10, runeY - 5); ctx.lineTo(runeX + 17, runeY + 5); ctx.stroke();
        }
        for (let mossY = shaftY + 14; mossY < shaftY + shaftHeight; mossY += 58) {
          ctx.fillStyle = '#516d3e'; ctx.beginPath(); ctx.ellipse(x + 8 + (mossY % 3) * 12, mossY, 10, 4, -0.2, 0, Math.PI * 2); ctx.fill();
        }
        for (let mushroomY = shaftY + 52; mushroomY < shaftY + shaftHeight; mushroomY += 94) {
          const side = mushroomY % 2 ? x + 5 : x + w - 5;
          ctx.strokeStyle = '#d8d6b6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(side, mushroomY); ctx.lineTo(side, mushroomY - 7); ctx.stroke();
          ctx.shadowColor = mushroomY % 3 ? '#55e8ff' : '#ffe36e'; ctx.shadowBlur = glowBlur(15 * theme.mushroomGlow);
          ctx.globalAlpha = 0.22 + theme.mushroomGlow * 0.78;
          ctx.fillStyle = mushroomY % 3 ? '#61d9e7' : '#f4d86b';
          ctx.beginPath(); ctx.ellipse(side, mushroomY - 8, 5, 3, 0, Math.PI, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1; ctx.shadowBlur = glowBlur(5 * theme.mushroomGlow);
        }
      } else if (theme.style === 'highway') {
        for (let markY = shaftY + 10; markY < shaftY + shaftHeight; markY += 52) {
          const railHeight = Math.min(17, shaftY + shaftHeight - markY);
          if (railHeight < 4) continue;
          const railGrad = ctx.createLinearGradient(x, markY, x, markY + railHeight);
          railGrad.addColorStop(0, '#dce2e1');
          railGrad.addColorStop(0.24, '#9da8a8');
          railGrad.addColorStop(0.52, '#687477');
          railGrad.addColorStop(0.78, '#b9c2c1');
          railGrad.addColorStop(1, '#778285');
          ctx.fillStyle = '#343b3e'; ctx.fillRect(x + 2, markY - 2, w - 4, railHeight + 4);
          ctx.fillStyle = railGrad; ctx.fillRect(x + 4, markY, w - 8, railHeight);
          ctx.fillStyle = '#edf0ed'; ctx.fillRect(x + 5, markY + 1, w - 10, 2);
          ctx.fillStyle = '#4f595b'; ctx.fillRect(x + 5, markY + railHeight - 2, w - 10, 2);
          for (const boltX of [x + 10, x + w - 10]) {
            ctx.fillStyle = '#4a5355'; ctx.beginPath(); ctx.arc(boltX, markY + railHeight / 2, 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e2e6e3'; ctx.beginPath(); ctx.arc(boltX - 0.6, markY + railHeight / 2 - 0.6, 0.8, 0, Math.PI * 2); ctx.fill();
          }
        }
      } else if (theme.style === 'cyberpunk') {
        const core = ctx.createLinearGradient(x + 24, 0, x + 38, 0);
        core.addColorStop(0, 'rgba(60,236,255,0)'); core.addColorStop(0.5, 'rgba(60,236,255,0.42)'); core.addColorStop(1, 'rgba(255,57,192,0)');
        ctx.globalAlpha = 0.08 + 0.42 * (theme.emission / 20);
        ctx.fillStyle = core; ctx.fillRect(x + 22, shaftY, 18, shaftHeight);
        ctx.strokeStyle = neonColor; ctx.lineWidth = 1.4; ctx.shadowColor = neonColor; ctx.shadowBlur = glowBlur(theme.emission * 0.5);
        ctx.globalAlpha = Math.max(0.1, theme.emission / 20);
        for (let traceY = shaftY + 18; traceY < shaftY + shaftHeight; traceY += 46) {
          const bendX = x + 16 + (Math.floor(traceY / 46) % 2) * 25;
          ctx.beginPath(); ctx.moveTo(x + 5, traceY); ctx.lineTo(bendX, traceY); ctx.lineTo(bendX + 7, traceY + 9); ctx.lineTo(x + w - 7, traceY + 9); ctx.stroke();
          ctx.fillStyle = '#eaffff'; ctx.beginPath(); ctx.arc(x + w - 8, traceY + 9, 1.7, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
      if (theme.pipeShade > 0) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = theme.pipeShade;
        ctx.fillStyle = theme.pipeTint;
        ctx.fillRect(x, shaftY, w, shaftHeight);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // --- 2. Pipe Lip Collar with 3D Overhang ---
      const lipGrad = ctx.createLinearGradient(lipX, 0, lipX + lipWidth, 0);
      lipGrad.addColorStop(0, lipColors[0]);
      lipGrad.addColorStop(0.2, lipColors[1]);
      lipGrad.addColorStop(0.42, lipColors[2]);
      lipGrad.addColorStop(0.72, lipColors[3]);
      lipGrad.addColorStop(1, lipColors[4]);

      ctx.save();
      if (theme.style === 'cyberpunk') {
        ctx.shadowColor = neonColor;
        ctx.shadowBlur = glowBlur(theme.emission);
        ctx.globalAlpha = Math.max(0.1, theme.emission / 20);
      }
      ctx.fillStyle = lipGrad;
      ctx.beginPath();
      this.roundRect(ctx, lipX, lipY, lipWidth, lipHeight, 3);
      ctx.fill();
      ctx.restore();
      if (theme.pipeShade > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = theme.pipeShade;
        ctx.fillStyle = theme.pipeTint;
        ctx.fillRect(lipX, lipY, lipWidth, lipHeight);
        ctx.restore();
      }
      if (theme.style === 'highway') {
        ctx.save();
        ctx.beginPath();
        this.roundRect(ctx, lipX + 2, lipY + 3, lipWidth - 4, lipHeight - 6, 2);
        ctx.clip();
        ctx.fillStyle = '#f4c84e';
        ctx.fillRect(lipX + 2, lipY + 3, lipWidth - 4, lipHeight - 6);
        ctx.fillStyle = '#30373a';
        for (let stripeX = lipX - lipHeight; stripeX < lipX + lipWidth; stripeX += 17) {
          ctx.beginPath();
          ctx.moveTo(stripeX, lipY + lipHeight - 3);
          ctx.lineTo(stripeX + 9, lipY + lipHeight - 3);
          ctx.lineTo(stripeX + 17, lipY + 3);
          ctx.lineTo(stripeX + 8, lipY + 3);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = '#e5e9e7'; ctx.lineWidth = 1.2; ctx.strokeRect(lipX + 3, lipY + 3, lipWidth - 6, lipHeight - 6);
        const beaconPulse = (0.45 + 0.55 * Math.sin(worldFrame * 0.22)) * theme.hazardBrightness;
        ctx.save(); ctx.globalAlpha = beaconPulse; ctx.shadowColor = '#ff332e'; ctx.shadowBlur = glowBlur(12 * theme.hazardBrightness); ctx.fillStyle = '#ff302a';
        for (const beaconX of [lipX + 7, lipX + lipWidth - 7]) {
          ctx.beginPath(); ctx.arc(beaconX, lipY + lipHeight / 2, 2.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      } else if (theme.style === 'desert') {
        ctx.fillStyle = '#7c512d';
        ctx.fillRect(lipX - 3, lipY + lipHeight - 7, lipWidth + 6, 8);
        ctx.fillStyle = '#e9bd63';
        ctx.fillRect(lipX - 5, lipY + lipHeight - 9, lipWidth + 10, 3);
        ctx.save(); ctx.shadowColor = '#ffe3a0'; ctx.shadowBlur = glowBlur(theme.emission);
        ctx.strokeStyle = '#f4d98e'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(lipX + 5, lipY + 4); ctx.lineTo(lipX + lipWidth - 5, lipY + 4); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#d7b77b';
        for (let sandX = lipX + 4; sandX < lipX + lipWidth - 2; sandX += 13) {
          ctx.beginPath(); ctx.moveTo(sandX, lipY + lipHeight - 7); ctx.lineTo(sandX + 5, lipY + lipHeight - 10); ctx.lineTo(sandX + 11, lipY + lipHeight - 7); ctx.closePath(); ctx.fill();
        }
      } else if (theme.style === 'kerala') {
        for (const leafX of [lipX + 3, lipX + lipWidth - 3]) {
          for (let leaf = 0; leaf < 3; leaf++) {
            const leafY = lipY + 4 + leaf * 5;
            ctx.fillStyle = leaf % 2 ? '#a3d95d' : '#4e9c45';
            ctx.beginPath(); ctx.ellipse(leafX + (leafX < x + w / 2 ? -3 : 3), leafY, 5, 2, leafX < x + w / 2 ? -0.4 : 0.4, 0, Math.PI * 2); ctx.fill();
          }
        }
      } else if (theme.style === 'forest') {
        ctx.fillStyle = '#536b3c';
        for (let mossX = lipX + 7; mossX < lipX + lipWidth - 5; mossX += 16) {
          const drip = 4 + (Math.floor(mossX) % 3) * 2;
          ctx.beginPath(); ctx.moveTo(mossX, lipY + lipHeight - 2); ctx.quadraticCurveTo(mossX + 5, lipY + lipHeight + 1, mossX + 2, lipY + lipHeight + drip); ctx.quadraticCurveTo(mossX - 2, lipY + lipHeight + 2, mossX, lipY + lipHeight - 2); ctx.fill();
        }
      }

      // Lip Outline
      ctx.save();
      if (theme.style === 'cyberpunk') { ctx.shadowColor = neonColor; ctx.shadowBlur = glowBlur(theme.emission); ctx.globalAlpha = Math.max(0.1, theme.emission / 20); }
      ctx.strokeStyle = theme.style === 'cyberpunk' ? neonColor : theme.outline;
      ctx.lineWidth = 2.5;
      this.roundRect(ctx, lipX, lipY, lipWidth, lipHeight, 3);
      ctx.stroke();
      ctx.restore();

      if (theme.style === 'cyberpunk') {
        const sparkPulse = 0.55 + Math.sin(worldFrame * 0.42 + (isTop ? 0 : 1.7)) * 0.35;
        ctx.save();
        ctx.globalAlpha = sparkPulse * Math.max(0.1, theme.emission / 20);
        ctx.strokeStyle = neonColor;
        ctx.fillStyle = '#eaffff';
        ctx.lineWidth = 1.6;
        ctx.shadowColor = neonColor;
        ctx.shadowBlur = glowBlur(theme.emission * 0.5);
        for (const side of [0, 1]) {
          const startX = side ? lipX + lipWidth - 4 : lipX + 4;
          const endX = side ? x + w - 3 : x + 3;
          const jointY = isTop ? lipY + lipHeight - 3 : lipY + 3;
          const direction = side ? -1 : 1;
          const jitter = Math.sin(worldFrame * 0.71 + side * 2.1) * 2.2;
          ctx.beginPath();
          ctx.moveTo(startX, jointY);
          ctx.lineTo(startX + direction * 5, jointY + jitter);
          ctx.lineTo(endX - direction * 3, jointY - jitter * 0.55);
          ctx.lineTo(endX, jointY + 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(endX, jointY + 2, 1.5 + sparkPulse, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Top/Bottom Rim Highlight on Lip
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(lipX + lipWidth * 0.32, lipY + 2, 3.5, lipHeight - 4);

      // --- 3. Lip Underside Drop Shadow onto Pipe Shaft ---
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      if (isTop) {
        ctx.fillRect(x, lipY - 5, w, 5);
      } else {
        ctx.fillRect(x, lipY + lipHeight, w, 5);
      }
      if (theme.style === 'forest' && isTop) {
        const mossLight = ctx.createLinearGradient(0, lipY + lipHeight, 0, lipY + lipHeight + 15);
        mossLight.addColorStop(0, 'rgba(139, 190, 87, 0.24)');
        mossLight.addColorStop(1, 'rgba(50, 93, 47, 0)');
        ctx.fillStyle = mossLight;
        ctx.fillRect(x - 2, lipY + lipHeight, w + 4, 15);
      }

      // --- 4. Deep Hollow Opening Cavern Shadow at Pipe Rim ---
      const cavernGrad = ctx.createLinearGradient(0, isTop ? lipY + lipHeight - 6 : lipY, 0, isTop ? lipY + lipHeight : lipY + 6);
      cavernGrad.addColorStop(0, isTop ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0)');
      cavernGrad.addColorStop(1, isTop ? 'rgba(0, 0, 0, 0)' : 'rgba(0, 0, 0, 0.45)');
      ctx.fillStyle = cavernGrad;
      ctx.fillRect(lipX + 2, isTop ? lipY + lipHeight - 6 : lipY, lipWidth - 4, 6);
    }

    roundRect(context, rx, ry, rw, rh, radius) {
      context.beginPath();
      context.moveTo(rx + radius, ry);
      context.lineTo(rx + rw - radius, ry);
      context.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
      context.lineTo(rx + rw, ry + rh - radius);
      context.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
      context.lineTo(rx + radius, ry + rh);
      context.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
      context.lineTo(rx, ry + radius);
      context.quadraticCurveTo(rx, ry, rx + radius, ry);
      context.closePath();
    }
  }

  function drawBirdSprite(g, skin, wingAngle, tailWag) {
    // --- 1. Tail Feathers (3 Layered Classic Feathers) ---
    const wag = Math.sin(tailWag) * 3;
    g.save();
    g.translate(-15, 2);
    g.rotate(wag * 0.05);
    g.fillStyle = skin.tail;
    g.strokeStyle = skin.outlineSoft;
    g.lineWidth = 1.8;

    g.beginPath();
    g.ellipse(-4, -4, 6, 3, -0.4, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    g.beginPath();
    g.ellipse(-6, 0, 7, 3.5, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    g.beginPath();
    g.ellipse(-4, 4, 6, 3, 0.4, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.restore();

    // --- 2. Head Crest Feather Tuft ---
    g.fillStyle = skin.crest;
    g.strokeStyle = skin.outlineSoft;
    g.lineWidth = 1.8;
    g.beginPath();
    g.ellipse(-2, -15, 3.5, 6, -0.35, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    // --- 3. Chubby Yellow Bird Body (Multi-Stop Textured Gradient) ---
    g.fillStyle = 'rgba(0, 0, 0, 0.16)';
    g.beginPath();
    g.ellipse(-2, 4, 18, 14, 0, 0, Math.PI * 2);
    g.fill();

    const bodyGrad = g.createRadialGradient(-3, -4, 3, 1, 2, 18);
    bodyGrad.addColorStop(0, skin.body[0]);
    bodyGrad.addColorStop(0.5, skin.body[1]);
    bodyGrad.addColorStop(0.88, skin.body[2]);
    bodyGrad.addColorStop(1, skin.body[3]);

    g.fillStyle = bodyGrad;
    g.strokeStyle = skin.outline;
    g.lineWidth = 2.4;
    g.beginPath();
    g.ellipse(0, 0, 17, 13.5, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    // Peach Cream Underbelly Patch
    const bellyGrad = g.createLinearGradient(-10, 0, 8, 12);
    bellyGrad.addColorStop(0, skin.belly[0]);
    bellyGrad.addColorStop(0.6, skin.belly[1]);
    bellyGrad.addColorStop(1, skin.belly[2]);
    g.fillStyle = bellyGrad;
    g.beginPath();
    g.ellipse(-2, 4.5, 11, 7.5, -0.15, 0, Math.PI * 2);
    g.fill();

    // --- 4. Layered Animated Wing ---
    const wingFlap = Math.sin(wingAngle) * 7;
    g.save();
    g.translate(-5, 0);
    g.rotate(wingFlap * 0.08);

    const wingGrad = g.createLinearGradient(-10, -6, 6, 8);
    wingGrad.addColorStop(0, skin.wing[0]);
    wingGrad.addColorStop(0.35, skin.wing[1]);
    wingGrad.addColorStop(0.85, skin.wing[2]);
    wingGrad.addColorStop(1, skin.wing[3]);
    g.fillStyle = wingGrad;
    g.strokeStyle = skin.outline;
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(-4, -1 + wingFlap * 0.35, 10, 7.2, -0.22, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = skin.outline;
    g.lineWidth = 2;
    g.stroke();

    // Wing Feather Quill Line
    g.strokeStyle = skin.quill;
    g.lineWidth = 1.3;
    g.beginPath();
    g.arc(-4, -1 + wingFlap * 0.35, 5, 0.4, 2.2);
    g.stroke();
    g.restore();

    // --- 5. Expressive Big Cartoon Eye ---
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#4a2902';
    g.lineWidth = 2.2;
    g.beginPath();
    g.ellipse(7.5, -5, 7, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    // Pupil
    g.fillStyle = '#1e2430';
    g.beginPath();
    g.arc(9.5, -5, 3.6, 0, Math.PI * 2);
    g.fill();

    // Eye Shines (Double Specular Glint Reflection)
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(10.8, -6.6, 1.6, 0, Math.PI * 2);
    g.arc(8.5, -3.8, 0.9, 0, Math.PI * 2);
    g.fill();

    // Cute Rosy Peach Cheek Blush
    g.fillStyle = 'rgba(255, 95, 95, 0.48)';
    g.beginPath();
    g.arc(4, 3.5, 3.8, 0, Math.PI * 2);
    g.fill();

    // --- 6. Bright Orange Duck Lips / Beak ---
    const beakGrad = g.createLinearGradient(11, 0, 22, 3);
    beakGrad.addColorStop(0, skin.beak[0]);
    beakGrad.addColorStop(0.7, skin.beak[1]);
    beakGrad.addColorStop(1, skin.beak[2]);

    g.fillStyle = beakGrad;
    g.strokeStyle = '#5a1f01';
    g.lineWidth = 2;

    // Top Lip
    g.beginPath();
    g.moveTo(11, -1.5);
    g.quadraticCurveTo(18, -4, 22, 0);
    g.lineTo(13, 2.5);
    g.closePath();
    g.fill();
    g.stroke();

    // Bottom Lip
    g.beginPath();
    g.moveTo(11, 2);
    g.quadraticCurveTo(18, 1.5, 20.5, 3);
    g.quadraticCurveTo(16, 7, 11, 5.5);
    g.closePath();
    g.fill();
    g.stroke();

    // Smile mouth crease
    g.strokeStyle = '#421601';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(12, 1.5);
    g.lineTo(19, 1.5);
    g.stroke();

  }

  // --- Authentic Original Flappy Bird (Hand-Crafted Textures) ---
  class Bird {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = 92;
      this.y = V_HEIGHT * 0.42;
      this.radius = 16;
      this.vy = 0;
      this.gravity = 0.22;
      this.jumpStrength = -5.2;
      this.maxVelocity = 7.0;
      this.rotation = 0;
      this.wingAngle = 0;
      this.wingSpeed = 0.22;
      this.idleFloatOffset = 0;
      this.tailWag = 0;
    }

    jump() {
      this.vy = this.jumpStrength;
      this.rotation = -0.42;
      createFeathers(this.x - 12, this.y + 4, 3);
      sound.playFlap();
    }

    update() {
      this.tailWag += 0.15;

      if (currentState === STATE.READY) {
        this.idleFloatOffset = Math.sin(globalFrame * 0.07) * 7;
        this.wingAngle += 0.16;
        this.rotation = Math.sin(globalFrame * 0.07) * 0.06;
        return;
      }

      this.vy += this.gravity;
      if (this.vy > this.maxVelocity) this.vy = this.maxVelocity;
      this.y += this.vy;

      if (this.vy < 0) {
        this.rotation = Math.max(-0.46, this.rotation - 0.07);
      } else {
        this.rotation = Math.min(Math.PI / 2.15, this.rotation + 0.038);
      }

      if (this.vy < 2.5) {
        this.wingAngle += this.wingSpeed;
      }
    }

    draw() {
      const drawY = currentState === STATE.READY ? this.y + this.idleFloatOffset : this.y;

      ctx.save();
      ctx.translate(this.x, drawY);
      ctx.rotate(this.rotation);
      drawBirdSprite(ctx, activeSkin(), this.wingAngle, this.tailWag);
      ctx.restore();
    }

    getHitbox() {
      return {
        x: this.x - 12,
        y: this.y - 10,
        w: 24,
        h: 20
      };
    }
  }

  const bird = new Bird();

  // --- Particles & Score FX ---
  const particles = [];
  const scorePopups = [];

  function createFeathers(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 2.4 + 1.0;
      particles.push({
        type: 'feather',
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1.2,
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 4 + 3,
        color: Math.random() > 0.4 ? activeSkin().body[1] : '#ffffff',
        alpha: 1,
        life: 0.024
      });
    }
  }

  function createScoreSparkles(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.3;
      const spd = Math.random() * 2.8 + 1.4;
      particles.push({
        type: 'sparkle',
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        rot: Math.random() * Math.PI,
        rotSpd: 0.15,
        size: Math.random() * 4 + 3,
        color: Math.random() > 0.5 ? '#ffe600' : '#ffffff',
        alpha: 1,
        life: 0.032
      });
    }

    scorePopups.push({
      text: '+1',
      x: x + 16,
      y: y - 10,
      vy: -1.8,
      alpha: 1,
      scale: 1.4
    });
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === 'feather') p.vy += 0.08;
      p.rot += p.rotSpd;
      p.alpha -= p.life;
      if (p.alpha <= 0) particles.splice(i, 1);
    }

    for (let i = scorePopups.length - 1; i >= 0; i--) {
      const sp = scorePopups[i];
      sp.y += sp.vy;
      sp.vy *= 0.94;
      sp.scale = Math.max(1, sp.scale - 0.03);
      sp.alpha -= 0.024;
      if (sp.alpha <= 0) scorePopups.splice(i, 1);
    }
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      if (p.type === 'feather') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sparkle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.3, -p.size * 0.3);
        ctx.lineTo(p.size, 0);
        ctx.lineTo(p.size * 0.3, p.size * 0.3);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.3, p.size * 0.3);
        ctx.lineTo(-p.size, 0);
        ctx.lineTo(-p.size * 0.3, -p.size * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });

    scorePopups.forEach(sp => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.alpha);
      ctx.translate(sp.x, sp.y);
      ctx.scale(sp.scale, sp.scale);
      ctx.font = '900 24px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(sp.text, 0, 0);
      ctx.fillStyle = sp.color || '#ffffff';
      ctx.fillText(sp.text, 0, 0);
      ctx.restore();
    });
  }

  // --- Coins: paid out when a run ends, based on the final score ---
  // C(P) = floor(P * (rate + alpha * P)): payouts stay modest as runs get longer.
  // rate 0.6, alpha 0.002 -> score 10 = 6, 20 = 12, 30 = 19, 50 = 35.
  const COIN_RATE = 0.6;
  const COIN_ALPHA = 0.002;
  function coinsForScore(P) {
    return Math.floor(P * (COIN_RATE + COIN_ALPHA * P) + 1e-9);
  }

  function drawCoinCounter() {
    ctx.save();
    ctx.translate(0, 34);
    ctx.font = '700 15px "Fredoka", sans-serif';
    const text = String(wallet.coins);
    const w = 38 + ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    roundRect(ctx, 12, 62, w, 26, 13);
    ctx.fill();

    ctx.fillStyle = '#ffd23a';
    ctx.strokeStyle = '#7a4a00';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(26, 75, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff2a0';
    ctx.beginPath();
    ctx.arc(24.5, 73, 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 40, 76);
    ctx.restore();
  }

  // --- Collision Engine ---
  function checkCollisions() {
    if (bird.y + 12 >= GROUND_Y) {
      bird.y = GROUND_Y - 12;
      triggerGameOver();
      return true;
    }

    if (bird.y - 12 <= 0) {
      bird.y = 12;
      bird.vy = 0;
    }

    const box = bird.getHitbox();
    for (let i = 0; i < pipes.length; i++) {
      const p = pipes[i];
      if (box.x + box.w > p.x && box.x < p.x + p.w) {
        if (box.y < p.topHeight || box.y + box.h > p.bottomY) {
          triggerGameOver();
          return true;
        }
      }
    }
    return false;
  }

  function triggerGameOver() {
    if (currentState === STATE.DYING || currentState === STATE.GAMEOVER) return;

    currentState = STATE.DYING;
    screenShakeTimer = 12;
    flashWhiteAlpha = 0.85;
    gameOverTimer = 0;
    createFeathers(bird.x, bird.y, 16);

    sound.playHit();
    setTimeout(() => sound.playDie(), 110);

    isNewHighScore = updateHighScore(score);
    srAnnouncements.textContent = `Game Over. Final score: ${score}. Best: ${highScore}.`;
  }

  // --- Retro Arcade Score HUD & UI ---
  function drawScoreHUD() {
    if (currentState !== STATE.PLAYING && currentState !== STATE.DYING) return;

    drawCoinCounter();
    ctx.save();
    ctx.font = '900 48px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const text = score.toString();
    const x = V_WIDTH / 2;
    const y = 56;

    ctx.fillStyle = '#000000';
    ctx.fillText(text, x + 2, y + 4);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawStartScreen() {
    drawCoinCounter();
    ctx.save();
    ctx.textAlign = 'center';

    const titleY = 162 + Math.sin(globalFrame * 0.05) * 5;

    // Classic Retro Arcade Logo: "FLAPPY BIRD"
    ctx.font = '900 40px "Fredoka", sans-serif';
    ctx.lineJoin = 'round';

    ctx.fillStyle = '#221500';
    ctx.fillText('FLAPPY BIRD', V_WIDTH / 2 + 2, titleY + 5);

    ctx.strokeStyle = '#542a00';
    ctx.lineWidth = 7;
    ctx.strokeText('FLAPPY BIRD', V_WIDTH / 2, titleY);

    const titleGrad = ctx.createLinearGradient(0, titleY - 26, 0, titleY + 12);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(0.2, '#fff168');
    titleGrad.addColorStop(0.65, '#f59e0b');
    titleGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = titleGrad;
    ctx.fillText('FLAPPY BIRD', V_WIDTH / 2, titleY);

    // Retro Tap Instruction Card
    const promptY = 375;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    roundRect(ctx, 36, promptY - 26, V_WIDTH - 72, 128, 20);
    ctx.fill();

    ctx.strokeStyle = '#553b1b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const tapOffset = Math.sin(globalFrame * 0.11) * 5;
    drawTapIcon(V_WIDTH / 2, promptY + 10 + tapOffset);

    ctx.font = '700 17px "Fredoka", sans-serif';
    ctx.fillStyle = '#332010';
    ctx.fillText('TAP / CLICK / SPACE TO FLAP', V_WIDTH / 2, promptY + 52);

    ctx.font = '600 12.5px "Fredoka", sans-serif';
    ctx.fillStyle = '#6b4c20';

    ctx.font = '700 12px "Fredoka", sans-serif';
    ctx.fillStyle = completedDaily ? '#39751c' : '#b85800';
    ctx.fillText(completedDaily
      ? `DAILY COMPLETE  ·  BADGES ${unlockedBadges.length}/${BADGES.length}`
      : `DAILY: SCORE ${dailyTarget} FOR +${DAILY_BONUS} COINS`, V_WIDTH / 2, promptY + 96);

    ctx.restore();
    drawMenuButtons();
  }

  // Menu buttons (drawn on the canvas, hit-tested in the pointerdown handler)
  const lbButtonRect = { x: 111, y: 478, w: 138, h: 42 };

  function drawMenuButton(r, label, c0, c1, border) {
    ctx.save();
    const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    grad.addColorStop(0, c0);
    grad.addColorStop(1, c1);
    ctx.fillStyle = grad;
    roundRect(ctx, r.x, r.y, r.w, r.h, 21);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(r.x + 16, r.y + 4, r.w - 32, 3);

    ctx.font = '700 13.5px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = border;
    ctx.lineWidth = 3;
    ctx.strokeText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.restore();
  }

  function drawMenuButtons() {
    drawMenuButton(lbButtonRect, '🏆 LEADERBOARD', '#ffbf47', '#ee8a00', '#8a4b00');
  }

  function drawTapIcon(cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    const pulse = (globalFrame % 45) / 45;
    ctx.strokeStyle = `rgba(82, 168, 42, ${0.8 - pulse * 0.8})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 11 + pulse * 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#553b1b';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = '#f85820';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  const restartButtonRect = { x: 20, y: 436, w: 150, h: 54 };
  const gameOverLbButtonRect = { x: 190, y: 436, w: 150, h: 54 };

  function drawGameOverScreen() {
    ctx.save();
    ctx.textAlign = 'center';

    const ease = Math.min(1, gameOverTimer / 24);
    const modalY = 146 + (1 - ease) * 130;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.55 * ease})`;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    ctx.font = '900 38px "Fredoka", sans-serif';
    ctx.lineJoin = 'round';

    ctx.fillStyle = '#221500';
    ctx.fillText('GAME OVER', V_WIDTH / 2 + 2, modalY + 4);

    ctx.strokeStyle = '#542a00';
    ctx.lineWidth = 6;
    ctx.strokeText('GAME OVER', V_WIDTH / 2, modalY);

    const goGrad = ctx.createLinearGradient(0, modalY - 22, 0, modalY + 14);
    goGrad.addColorStop(0, '#ffffff');
    goGrad.addColorStop(0.3, '#ff7a3d');
    goGrad.addColorStop(1, '#d82800');
    ctx.fillStyle = goGrad;
    ctx.fillText('GAME OVER', V_WIDTH / 2, modalY);

    const cardX = 32;
    const cardY = modalY + 32;
    const cardW = V_WIDTH - 64;
    const cardH = 184;

    ctx.fillStyle = '#f8f2d8';
    roundRect(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.fill();

    ctx.strokeStyle = '#543615';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    drawMedal(cardX + 50, cardY + 96, score);

    ctx.textAlign = 'right';

    ctx.font = '700 12px "Press Start 2P", monospace';
    ctx.fillStyle = '#b85800';
    ctx.fillText('SCORE', cardX + cardW - 22, cardY + 46);

    ctx.font = '800 28px "Fredoka", sans-serif';
    ctx.fillStyle = '#2a1a08';
    ctx.fillText(score.toString(), cardX + cardW - 22, cardY + 82);

    ctx.font = '700 12px "Press Start 2P", monospace';
    ctx.fillStyle = '#b85800';
    ctx.fillText('BEST', cardX + cardW - 22, cardY + 124);

    ctx.font = '800 28px "Fredoka", sans-serif';
    ctx.fillStyle = '#2a1a08';
    ctx.fillText(highScore.toString(), cardX + cardW - 22, cardY + 160);

    if (isNewHighScore && score > 0) {
      ctx.save();
      ctx.translate(cardX + cardW - 96, cardY + 106);
      ctx.fillStyle = '#d82800';
      roundRect(ctx, 0, 0, 42, 17, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 9px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEW', 21, 13);
      ctx.restore();
    }

    if (ease >= 0.75) {
      drawRestartButton(restartButtonRect);
      drawMenuButton(gameOverLbButtonRect, 'LEADERBOARD', '#ffbf47', '#ee8a00', '#8a4b00');

      ctx.font = '700 13px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = completedDaily ? '#39751c' : '#fff0bd';
      const challengeLine = newlyUnlockedBadges.length
        ? `BADGE: ${BADGES.find(b => b.score === newlyUnlockedBadges[newlyUnlockedBadges.length - 1]).name}`
        : dailyBonusEarned
          ? `DAILY COMPLETE  +${DAILY_BONUS} COINS`
          : completedDaily
            ? `DAILY COMPLETE  ·  BADGES ${unlockedBadges.length}/${BADGES.length}`
            : `DAILY ${Math.min(score, dailyTarget)}/${dailyTarget}  ·  BADGES ${unlockedBadges.length}/${BADGES.length}`;
      ctx.strokeStyle = '#3a2400';
      ctx.lineWidth = 3;
      ctx.strokeText(challengeLine, V_WIDTH / 2, 405);
      ctx.fillText(challengeLine, V_WIDTH / 2, 405);

      ctx.font = '700 16px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      const coinLine = `+${runCoins} coins  •  total ${wallet.coins}`;
      ctx.strokeStyle = '#3a2400';
      ctx.lineWidth = 4;
      ctx.strokeText(coinLine, V_WIDTH / 2, 516);
      ctx.fillStyle = '#ffe27a';
      ctx.fillText(coinLine, V_WIDTH / 2, 516);
    }

    ctx.restore();
  }

  function drawMedal(cx, cy, finalScore) {
    let tier = null;
    let label = '';
    let colorA = '#cd7f32';
    let colorB = '#8c4e16';

    if (finalScore >= 35) {
      tier = 'PLATINUM';
      colorA = '#ffffff';
      colorB = '#8ec3d8';
      label = 'P';
    } else if (finalScore >= 20) {
      tier = 'GOLD';
      colorA = '#fff168';
      colorB = '#c79100';
      label = 'G';
    } else if (finalScore >= 10) {
      tier = 'SILVER';
      colorA = '#ffffff';
      colorB = '#8a99a8';
      label = 'S';
    } else if (finalScore >= 4) {
      tier = 'BRONZE';
      colorA = '#ff9844';
      colorB = '#9e4000';
      label = 'B';
    }

    ctx.strokeStyle = '#543615';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 33, 0, Math.PI * 2);
    ctx.stroke();

    if (!tier) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fill();
      return;
    }

    const grad = ctx.createRadialGradient(cx - 8, cy - 8, 3, cx, cy, 29);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, colorA);
    grad.addColorStop(1, colorB);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#543615';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '900 19px "Fredoka", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#422408';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(label, cx, cy);
    ctx.fillText(label, cx, cy);
  }

  function drawRestartButton(btn) {
    ctx.save();
    const bGrad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
    bGrad.addColorStop(0, '#75cc2b');
    bGrad.addColorStop(0.5, '#5ca71d');
    bGrad.addColorStop(1, '#428512');

    ctx.fillStyle = bGrad;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 27);
    ctx.fill();

    ctx.strokeStyle = '#275213';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(btn.x + 20, btn.y + 4, btn.w - 40, 3);

    ctx.font = '700 20px "Fredoka", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1e3f0e';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('PLAY AGAIN', btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.fillText('PLAY AGAIN', btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.restore();
  }

  function roundRect(context, rx, ry, rw, rh, radius) {
    context.beginPath();
    context.moveTo(rx + radius, ry);
    context.lineTo(rx + rw - radius, ry);
    context.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
    context.lineTo(rx + rw, ry + rh - radius);
    context.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
    context.lineTo(rx + radius, ry + rh);
    context.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
    context.lineTo(rx, ry + radius);
    context.quadraticCurveTo(rx, ry, rx + radius, ry);
    context.closePath();
  }

  // --- Input Handlers, Day/Night & Season Controls ---
  function toggleCycle() {
    currentCycleModeIndex = (currentCycleModeIndex + 1) % CYCLE_MODES.length;
    const mode = CYCLE_MODES[currentCycleModeIndex];
    if (mode === 'AUTO') {
      sound.playTone(560, 0.08, 'triangle');
      srAnnouncements.textContent = 'Day/Night Cycle: Auto';
    } else {
      sound.playTone(680, 0.08, 'sine');
      srAnnouncements.textContent = `Time of Day set to: ${mode}`;
    }
  }

  function toggleSeason() {
    currentSeasonModeIndex = (currentSeasonModeIndex + 1) % SEASON_MODES.length;
    const mode = SEASON_MODES[currentSeasonModeIndex];
    if (mode === 'AUTO') {
      sound.playTone(520, 0.08, 'triangle');
      srAnnouncements.textContent = 'Season Cycle: Auto';
    } else {
      sound.playTone(620, 0.08, 'sine');
      srAnnouncements.textContent = `Season set to: ${mode}`;
    }
  }

  if (cycleBadge) {
    cycleBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCycle();
    });
  }

  if (seasonBadge) {
    seasonBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSeason();
    });
  }

  function handleAction(event) {
    if (event) {
      if (event.target && event.target.closest('#ui-header')) {
        return;
      }
      if (event.cancelable && event.type !== 'keydown') {
        event.preventDefault();
      }
    }

    sound.init();

    if (currentState === STATE.READY) {
      if (window.FlappyRooms && window.FlappyRooms.isInRoom()) return;
      roomPipeSeed = 0;
      currentState = STATE.PLAYING;
      bird.jump();
      srAnnouncements.textContent = 'Game started. Tap to fly!';
    } else if (currentState === STATE.PLAYING) {
      bird.jump();
    } else if (currentState === STATE.GAMEOVER) {
      if (window.FlappyRooms && window.FlappyRooms.isInRoom()) return;
      if (gameOverTimer > 18) {
        restartGame();
      }
    }
  }

  function onRunEnded() {
    runCoins = coinsForScore(score);
    dailyBonusEarned = false;
    newlyUnlockedBadges = BADGES
      .filter(b => score >= b.score && !unlockedBadges.includes(b.score));
    if (newlyUnlockedBadges.length) {
      unlockedBadges = [...unlockedBadges, ...newlyUnlockedBadges.map(b => b.score)];
      lsSet('flappy_badges', JSON.stringify(unlockedBadges));
    }
    if (!completedDaily && score >= dailyTarget) {
      completedDaily = true;
      dailyBonusEarned = true;
      lsSet(DAILY_CHALLENGE_KEY, 'true');
      runCoins += DAILY_BONUS;
    }
    if (runCoins > 0) {
      wallet.coins += runCoins;
      saveWallet();
      sound.playCoin();
    }

    const lb = window.FlappyLeaderboard;
    if (!lb) return;
    if (score > 0) lb.setPending(score);
    else lb.clearPending();
  }

  if (window.FlappyLeaderboard) {
    // Never pop the leaderboard open in the middle of a run
    window.FlappyLeaderboard.canOpen = () => currentState !== STATE.PLAYING;
  }

  // --- Store (birds + sounds) ---
  const storeOverlay = document.getElementById('store-overlay');
  const storeGrid = document.getElementById('store-grid');
  const storeCoinCount = document.getElementById('store-coin-count');
  const storeMsg = document.getElementById('store-msg');
  const storeClose = document.getElementById('store-close');
  const requestForm = document.getElementById('request-form');
  const requestCategory = document.getElementById('request-category');
  const requestName = document.getElementById('request-name');
  const requestStatus = document.getElementById('request-status');
  const deathSoundControls = document.getElementById('death-sound-controls');
  const randomDeathSoundToggle = document.getElementById('random-death-sound-toggle');
  const storeTabs = {
    bird: document.getElementById('store-tab-bird'),
    sound: document.getElementById('store-tab-sound')
  };
  const STORE_HINTS = {
    bird: 'Earn coins at the end of every run. The higher your score, the more each pipe pays.',
    sound: 'Equip a death sound or randomize owned sounds for each run.'
  };
  let storeVisible = false;
  let storeTab = 'bird';
  let storeRaf = 0;
  let storePreviewAudio = null;

  function overlayOpen() {
    return storeVisible || !!(window.FlappyLeaderboard && window.FlappyLeaderboard.isOpen());
  }

  function storeData() {
    if (storeTab === 'bird') return { list: SKINS, owned: wallet.owned, equipped: wallet.equipped };
    return { list: DEATH_SOUNDS, owned: deathSoundOwned, equipped: equippedDeathSound };
  }

  function setStoreTab(tab) {
    stopDeathSoundPreview();
    storeTab = tab;
    Object.keys(storeTabs).forEach(k => {
      storeTabs[k].classList.toggle('active', k === tab);
      storeTabs[k].setAttribute('aria-selected', String(k === tab));
    });
    storeMsg.textContent = STORE_HINTS[tab];
    randomDeathSoundToggle.checked = randomDeathSoundEnabled;
    renderStore();
  }

  function renderStore() {
    const { list, owned, equipped } = storeData();
    storeCoinCount.textContent = wallet.coins;
    storeGrid.textContent = '';
    list.forEach(item => {
      const isOwned = owned.includes(item.id);
      const isEquipped = equipped === item.id;

      const card = document.createElement('div');
      card.className = 'store-card' + (isEquipped ? ' equipped' : '');

      const cv = document.createElement('canvas');
      cv.width = 160;
      cv.height = 128;
      cv.className = 'store-preview';
      cv.dataset.kind = storeTab;
      cv.dataset.skin = item.id;
      if (storeTab === 'sound') {
        cv.tabIndex = 0;
        cv.setAttribute('role', 'button');
        cv.setAttribute('aria-label', `Play ${item.name}`);
      }

      const name = document.createElement('div');
      name.className = 'store-name';
      name.textContent = item.name;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lb-btn store-btn';
      if (isEquipped) {
        btn.textContent = 'Equipped';
        btn.disabled = true;
      } else if (isOwned) {
        btn.textContent = 'Equip';
        btn.addEventListener('click', () => equipItem(item));
      } else {
        btn.textContent = `🪙 ${item.price}`;
        if (wallet.coins < item.price) btn.classList.add('store-locked');
        btn.addEventListener('click', () => buyItem(item));
      }

      card.append(cv, name);
      if (storeTab === 'sound') {
        card.classList.add('store-sound-card');
        card.addEventListener('click', event => {
          if (!event.target.closest('button')) playDeathSoundPreview(item);
        });
        cv.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            playDeathSoundPreview(item);
          }
        });
      }
      card.append(btn);
      storeGrid.appendChild(card);
    });
    deathSoundControls.classList.toggle('hidden', storeTab !== 'sound');
  }

  function playDeathSoundPreview(item) {
    stopDeathSoundPreview();
    sound.init();
    storeMsg.textContent = `Previewing ${item.name}.`;
    if (!item.src) {
      sound.playSynthDie();
      return;
    }
    const preview = new Audio(new URL(item.src, document.baseURI).href);
    preview.volume = 0.8;
    storePreviewAudio = preview;
    preview.addEventListener('ended', () => {
      if (storePreviewAudio === preview) storePreviewAudio = null;
    }, { once: true });
    preview.play().catch(() => {
      if (storePreviewAudio === preview) storePreviewAudio = null;
      storeMsg.textContent = `Could not preview ${item.name}.`;
    });
  }

  function stopDeathSoundPreview() {
    if (!storePreviewAudio) return;
    storePreviewAudio.pause();
    storePreviewAudio.currentTime = 0;
    storePreviewAudio = null;
  }

  function equipItem(item) {
    if (storeTab === 'bird') wallet.equipped = item.id;
    else {
      equippedDeathSound = item.id;
      setActiveDeathSound();
    }
    saveWallet();
    storeMsg.textContent = `${item.name} equipped.`;
    sound.playTone(620, 0.08, 'sine');
    renderStore();
  }

  function buyItem(item) {
    if (wallet.coins < item.price) {
      storeMsg.textContent = `Earn ${item.price - wallet.coins} more coins to unlock ${item.name}.`;
      sound.playTone(180, 0.12, 'square');
      return;
    }
    wallet.coins -= item.price;
    if (storeTab === 'bird') {
      wallet.owned.push(item.id);
      wallet.equipped = item.id;
    } else {
      deathSoundOwned.push(item.id);
      equippedDeathSound = item.id;
      setActiveDeathSound();
    }
    saveWallet();
    storeMsg.textContent = `${item.name} unlocked and equipped!`;
    sound.playCoin();
    renderStore();
  }

  function animateStorePreviews() {
    if (!storeVisible) return;
    const t = performance.now() / 1000;
    storeGrid.querySelectorAll('canvas').forEach((cv, i) => {
      const g = cv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      g.setTransform(2, 0, 0, 2, 0, 0);
      if (cv.dataset.kind === 'sound') {
        g.fillStyle = '#fff4d6';
        g.beginPath();
        g.arc(40, 32, 26, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#5b3a13';
        g.font = 'bold 30px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(cv.dataset.skin === 'original' ? '♪' : '♫', 40, 32);
      } else {
        g.translate(42, 34 + Math.sin(t * 3 + i) * 2);
        g.scale(1.3, 1.3);
        drawBirdSprite(g, skinById(cv.dataset.skin), t * 12 + i, t * 9);
      }
    });
    storeRaf = requestAnimationFrame(animateStorePreviews);
  }

  function openStore() {
    if (storeVisible || currentState === STATE.PLAYING) return;
    if (window.FlappyLeaderboard && window.FlappyLeaderboard.isOpen()) return;
    storeVisible = true;
    setStoreTab('bird');
    storeOverlay.classList.remove('hidden');
    cancelAnimationFrame(storeRaf);
    animateStorePreviews();
  }

  function closeStore() {
    storeVisible = false;
    stopDeathSoundPreview();
    storeOverlay.classList.add('hidden');
    cancelAnimationFrame(storeRaf);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  storeTabs.bird.addEventListener('click', () => setStoreTab('bird'));
  storeTabs.sound.addEventListener('click', () => setStoreTab('sound'));
  document.getElementById('store-menu-btn').addEventListener('click', () => {
    sound.init();
    openStore();
  });
  requestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = requestName.value.trim();
    if (!value) return;
    const submitButton = requestForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    requestStatus.textContent = 'Sending your request…';
    try {
      if (!window.FlappyLeaderboard || !window.FlappyLeaderboard.isOnline) {
        throw new Error('Suggestions are not configured right now.');
      }
      await window.FlappyLeaderboard.submitSuggestion(requestCategory.value, value);
      requestStatus.textContent = 'Thanks! Your request was sent.';
      requestName.value = '';
    } catch (error) {
      console.error('Could not send store request:', error);
      requestStatus.textContent = error && error.name === 'AbortError'
        ? 'The request timed out. Check your connection and try again.'
        : 'Could not send your request. Check the Firebase database rules and try again.';
    } finally {
      submitButton.disabled = false;
    }
  });
  storeClose.addEventListener('click', closeStore);
  randomDeathSoundToggle.addEventListener('change', () => {
    randomDeathSoundEnabled = randomDeathSoundToggle.checked;
    lsSet('flappy_random_death_sound', String(randomDeathSoundEnabled));
    storeMsg.textContent = randomDeathSoundEnabled
      ? 'Random owned death sounds enabled.'
      : 'Equipped death sound will play on death.';
  });
  storeOverlay.addEventListener('click', (e) => { if (e.target === storeOverlay) closeStore(); });
  document.addEventListener('keydown', (e) => { if (storeVisible && e.key === 'Escape') closeStore(); });

  function restartGame() {
    if (window.FlappyLeaderboard) window.FlappyLeaderboard.clearPending();
    gameSpeed = BASE_SPEED;
    runCoins = 0;
    dailyBonusEarned = false;
    newlyUnlockedBadges = [];
    pipes.length = 0;
    particles.length = 0;
    scorePopups.length = 0;
    score = 0;
    pipeTimer = 0;
    roomPipeSeed = 0;
    bird.reset();
    currentState = STATE.READY;
    srAnnouncements.textContent = 'Game reset. Ready to fly.';
    sound.playTone(480, 0.08, 'sine');
  }

  // Convert a pointer event to the canvas' 360x640 coordinate space (accounts for letterboxing)
  function pointerToVirtual(e) {
    const rect = canvas.getBoundingClientRect();
    const sc = Math.min(rect.width / V_WIDTH, rect.height / V_HEIGHT);
    const ox = (rect.width - V_WIDTH * sc) / 2;
    const oy = (rect.height - V_HEIGHT * sc) / 2;
    return { x: (e.clientX - rect.left - ox) / sc, y: (e.clientY - rect.top - oy) / sc };
  }

  function inRect(r, p, pad = 4) {
    return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
  }

  window.addEventListener('pointerdown', (e) => {
    if (e.target !== canvas && e.target.id !== 'game-container') return;

    if (currentState === STATE.READY) {
      const p = pointerToVirtual(e);
      if (inRect(lbButtonRect, p)) {
        e.preventDefault();
        sound.init();
        if (window.FlappyLeaderboard) window.FlappyLeaderboard.open();
        return;
      }
    }
    if (currentState === STATE.READY && window.FlappyRooms && window.FlappyRooms.isInRoom()) return;
    if (currentState === STATE.GAMEOVER && gameOverTimer > 18) {
      const p = pointerToVirtual(e);
      if (inRect(gameOverLbButtonRect, p)) {
        e.preventDefault();
        if (window.FlappyLeaderboard) window.FlappyLeaderboard.open();
        return;
      }
      if (inRect(restartButtonRect, p)) {
        e.preventDefault();
        if (window.FlappyRooms && window.FlappyRooms.isInRoom()) return;
        restartGame();
        return;
      }
    }
    handleAction(e);
  }, { passive: false });

  let coinShortcut = '';
  let coinShortcutTimer = 0;
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.closest && e.target.closest('input, textarea, select')) return;
    // Hidden keyboard code: type "coins" to add 100 coins to this device's wallet.
    if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
      coinShortcut = (coinShortcut + e.key.toLowerCase()).slice(-5);
      clearTimeout(coinShortcutTimer);
      coinShortcutTimer = setTimeout(() => { coinShortcut = ''; }, 1800);
      if (coinShortcut === 'coins') {
        wallet.coins += 100;
        saveWallet();
        if (storeVisible) renderStore();
        coinShortcut = '';
        clearTimeout(coinShortcutTimer);
        e.preventDefault();
        return;
      }
    } else {
      coinShortcut = '';
      clearTimeout(coinShortcutTimer);
    }

    // Leave the keyboard alone while the leaderboard (and its name box) is open
    if (overlayOpen()) return;

    if (e.shiftKey && e.code === 'KeyT') {
      e.preventDefault();
      advanceTheme();
      sound.playTone(760, 0.1, 'triangle');
      srAnnouncements.textContent = THEMES[themeIndex].name;
    } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      handleAction(e);
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      toggleCycle();
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      toggleSeason();
    } else if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      if (window.FlappyLeaderboard) window.FlappyLeaderboard.open();
    } else if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      openStore();
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      sound.toggleMute();
    }
  });

  // --- Main Animation Loop ---
  function gameLoop(timestamp) {
    const deltaSeconds = themeLastTimestamp === null
      ? 0
      : Math.min(0.05, Math.max(0, (timestamp - themeLastTimestamp) / 1000));
    themeLastTimestamp = timestamp;
    globalFrame++;
    const worldActive = currentState === STATE.READY || currentState === STATE.PLAYING;
    const worldDeltaSeconds = worldActive ? deltaSeconds : 0;
    if (worldActive) {
      worldFrame++;
      groundScrollOffset = (groundScrollOffset + gameSpeed) % GROUND_SCROLL_PERIOD;
    }

    let shakeX = 0;
    let shakeY = 0;
    if (screenShakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * screenShakeTimer * 1.5;
      shakeY = (Math.random() - 0.5) * screenShakeTimer * 1.5;
      screenShakeTimer--;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Dynamic Gradual Day & Night Sky (Sun & Moon Arc)
    const cycle = getCycleState();
    const theme = syncThemeToCycle(getThemeState(worldDeltaSeconds), cycle);
    drawSky(cycle, theme);

    // 2. Dynamic Gradual Seasons (Color Blending)
    getSeasonState();

    // 3. Parallax Textured Clouds Moving Backward
    updateClouds();
    drawClouds(cycle);

    // 4. Theme-specific landscape silhouettes
    if (theme.blend < 1 && previousThemeIndex !== themeIndex) {
      const fromTheme = { ...theme, style: THEMES[previousThemeIndex].style };
      const toTheme = { ...theme, style: THEMES[themeIndex].style };
      drawThemeLandmarks(fromTheme, 1 - theme.blend);
      drawThemeLandmarks(toTheme, theme.blend);
    } else {
      drawThemeLandmarks(theme);
    }

    // 5. Theme-specific light, filters, and ambient particles
    updateThemeAtmosphere(theme, worldDeltaSeconds);
    drawThemeAtmosphere(theme);

    // 6. Hand-Crafted Green Pipes
    if (currentState === STATE.PLAYING) {
      // Ease toward the current score target without abrupt speed changes.
      gameSpeed += (targetSpeed() - gameSpeed) * 0.035;

      pipeTimer += gameSpeed;
      if (pipeTimer >= PIPE_SPACING) {
        pipeTimer -= PIPE_SPACING;
        pipes.push(new PipePair(V_WIDTH + 10));
      }

      for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.update();

        if (!p.passed && p.x + p.w < bird.x) {
          p.passed = true;
          score++;
          if (CYCLE_MODES[currentCycleModeIndex] === 'AUTO') cycleBoost += 0.014;
          if (SEASON_MODES[currentSeasonModeIndex] === 'AUTO') seasonBoost += 0.008;
          createScoreSparkles(bird.x + 10, bird.y);
          sound.playScore();
          srAnnouncements.textContent = `Score: ${score}`;
        }

        if (p.x + p.w < -30) pipes.splice(i, 1);
      }
    }
    pipes.forEach(p => p.draw(cycle, theme));

    // 7. Theme-specific ground
    if (theme.blend < 1 && previousThemeIndex !== themeIndex) {
      const fromTheme = { ...theme, style: THEMES[previousThemeIndex].style };
      const toTheme = { ...theme, style: THEMES[themeIndex].style };
      drawThemeGround(fromTheme, 1 - theme.blend);
      drawThemeGround(toTheme, theme.blend, false);
    } else {
      drawThemeGround(theme);
    }
    drawThemeLighting(theme);

    // 8. Authentic Hand-Crafted Original Flappy Bird
    bird.update();
    bird.draw();

    // 9. Collision Detection
    if (currentState === STATE.PLAYING) {
      checkCollisions();
    } else if (currentState === STATE.DYING) {
      if (bird.y + 12 >= GROUND_Y) {
        bird.y = GROUND_Y - 12;
        bird.vy = 0;
        currentState = STATE.GAMEOVER;
        onRunEnded();
        if (window.FlappyRooms && window.FlappyRooms.isInRoom()) {
          window.FlappyRooms.showRoomAfterDeath();
        }
      }
    } else if (currentState === STATE.GAMEOVER) {
      gameOverTimer++;
    }

    // 10. Particles & Popups
    updateParticles();
    drawParticles();

    // 11. UI Screens
    if (currentState === STATE.READY) drawStartScreen();
    else if (currentState === STATE.PLAYING || currentState === STATE.DYING) drawScoreHUD();
    else if (currentState === STATE.GAMEOVER) drawGameOverScreen();
    drawThemeBanner();

    // 12. Hit Flash
    if (flashWhiteAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashWhiteAlpha * 0.7})`;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
      flashWhiteAlpha = Math.max(0, flashWhiteAlpha - 0.08);
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

  window.FlappyGame = {
    startRoomRound(seed) {
      restartGame();
      roomPipeSeed = (Number(seed) >>> 0) || 1;
      currentState = STATE.PLAYING;
      bird.jump();
      srAnnouncements.textContent = 'Private room match started. Tap to fly!';
    },
    roomSnapshot() {
      return { score, alive: currentState === STATE.PLAYING, y: Math.round(bird.y) };
    }
  };

})();
