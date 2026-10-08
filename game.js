/**
 * Flappy Bird - Classic Arcade Edition
 * Features:
 * - 100% Authentic Original Yellow Flappy Bird (chubby body, animated wing, big cartoon eye, puffy lips)
 * - Gradual & Automatic Day/Night Cycle (Dawn ➔ Day ➔ Sunset ➔ Night) with moving Sun & Moon arcs
 * - Gradual & Automatic Season Cycle (Spring 🌸 ➔ Summer ☀️ ➔ Autumn 🍁 ➔ Winter ❄️) with continuous color morphing
 * - Hand-crafted rich textures: 3D cylindrical green pipes, lush turf grass, stratified earth soil
 * - Multi-layer backward-moving parallax scenery:
 *    • Drifting billowy textured clouds
 *    • Distant atmospheric mountain ridges
 *    • Mid-ground rolling hills with animated seasonal trees
 *    • Seasonal weather particles drifting backward (Sakura petals, golden motes, autumn leaves, snowflakes)
 *    • Stratified textured dirt with diagonal soil stripes
 * - Smooth physics and synthesized retro audio
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
  let scale = 1;

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
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

  // --- Game Engine Variables ---
  const STATE = { READY: 0, PLAYING: 1, DYING: 2, GAMEOVER: 3 };
  let currentState = STATE.READY;
  let score = 0;
  let isNewHighScore = false;
  let gameOverTimer = 0;
  let screenShakeTimer = 0;
  let flashWhiteAlpha = 0;
  let globalFrame = 0;

  // Calibrated smooth classic speed
  const GAME_SPEED = 1.62;
  const GROUND_HEIGHT = 108;
  const GROUND_Y = V_HEIGHT - GROUND_HEIGHT;

  let groundScrollOffset = 0;
  let hillsScrollOffset = 0;
  let mountainScrollOffset = 0;

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
      mountainColor: [120, 176, 190],
      mountainOutline: '#5894a4',
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
      mountainColor: [168, 101, 109],
      mountainOutline: '#84424b',
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
      mountainColor: [28, 40, 66],
      mountainOutline: '#121a2d',
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
      mountainColor: [128, 90, 128],
      mountainOutline: '#624062',
      sunAlpha: 0.85,
      sunColor: '#ffe49e',
      nightRatio: 0.25,
      pipeBrightness: 0.85
    }
  ];

  const CYCLE_MODES = ['AUTO', 'DAY', 'SUNSET', 'NIGHT', 'DAWN'];
  let currentCycleModeIndex = 0; // 0 = AUTO
  let cycleProgress = 0.08; // Starts in bright, beautiful day

  // --- 2. Dynamic Organic Season Cycles Engine ---
  const SEASONS = [
    {
      name: 'SPRING',
      icon: '🌸',
      hillColor: [96, 204, 56],       // Fresh spring green
      hillDark: [62, 148, 34],
      treeCanopy: [254, 180, 214],    // Blooming pink cherry blossom
      treeOutline: '#ec729c',
      grassTop: [126, 222, 54],
      grassBot: [92, 168, 32]
    },
    {
      name: 'SUMMER',
      icon: '☀️',
      hillColor: [72, 172, 42],       // Rich deep emerald grass
      hillDark: [46, 122, 26],
      treeCanopy: [48, 134, 26],      // Dense leafy green oak
      treeOutline: '#1e5210',
      grassTop: [112, 196, 40],
      grassBot: [80, 154, 26]
    },
    {
      name: 'AUTUMN',
      icon: '🍁',
      hillColor: [202, 126, 42],      // Warm golden amber
      hillDark: [148, 80, 22],
      treeCanopy: [228, 76, 26],      // Fiery orange/crimson maple
      treeOutline: '#a83208',
      grassTop: [210, 148, 48],
      grassBot: [162, 102, 28]
    },
    {
      name: 'WINTER',
      icon: '❄️',
      hillColor: [136, 178, 198],     // Frosted snow-dusted blue hills
      hillDark: [92, 132, 154],
      treeCanopy: [40, 84, 68],       // Snow-blanketed evergreen pines
      treeOutline: '#204636',
      grassTop: [220, 240, 248],
      grassBot: [140, 176, 194]
    }
  ];

  const SEASON_MODES = ['AUTO', 'SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];
  let currentSeasonModeIndex = 0; // 0 = AUTO
  let seasonProgress = 0.05; // Starts in Spring

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
        cl.x -= cl.speed * GAME_SPEED;
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

  // --- Dynamic Seasonal Weather Particles (Moving Backward) ---
  const seasonalParticles = [];
  function updateSeasonalParticles(seasonIndex) {
    // Spawn particles matching active season
    if (seasonalParticles.length < 24 && Math.random() < 0.28) {
      seasonalParticles.push({
        x: V_WIDTH + 15,
        y: Math.random() * (GROUND_Y - 20),
        vx: -(Math.random() * 1.3 + 1.1), // Drifting backward in the wind
        vy: seasonIndex === 3 ? Math.random() * 0.9 + 0.6 : (Math.random() - 0.5) * 0.5 + (seasonIndex === 2 ? 0.4 : 0.1),
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.08,
        size: Math.random() * 3.5 + 3.0,
        season: seasonIndex,
        alpha: Math.random() * 0.4 + 0.6
      });
    }

    for (let i = seasonalParticles.length - 1; i >= 0; i--) {
      const sp = seasonalParticles[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.rot += sp.rotSpd;
      if (sp.x < -20 || sp.y > GROUND_Y || sp.y < 0) {
        seasonalParticles.splice(i, 1);
      }
    }
  }

  function drawSeasonalParticles() {
    seasonalParticles.forEach(sp => {
      ctx.save();
      ctx.globalAlpha = sp.alpha;
      ctx.translate(sp.x, sp.y);
      ctx.rotate(sp.rot);

      if (sp.season === 0) {
        // Spring: Pink Sakura Petal
        ctx.fillStyle = '#fca5cc';
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, sp.size * 1.3, sp.size * 0.7, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (sp.season === 1) {
        // Summer: Golden Dandelion Fuzz / Sunlight Mote
        ctx.fillStyle = '#fff088';
        ctx.beginPath();
        ctx.arc(0, 0, sp.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (sp.season === 2) {
        // Autumn: Golden/Red Maple Leaf
        ctx.fillStyle = (sp.x % 2 === 0) ? '#ea580c' : '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(0, -sp.size);
        ctx.lineTo(sp.size * 0.8, -sp.size * 0.3);
        ctx.lineTo(sp.size, sp.size * 0.5);
        ctx.lineTo(0, sp.size * 0.8);
        ctx.lineTo(-sp.size, sp.size * 0.5);
        ctx.lineTo(-sp.size * 0.8, -sp.size * 0.3);
        ctx.closePath();
        ctx.fill();
      } else {
        // Winter: White Crystalline Snowflake
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (let a = 0; a < 3; a++) {
          const angle = (a * Math.PI) / 3;
          ctx.moveTo(Math.cos(angle) * sp.size, Math.sin(angle) * sp.size);
          ctx.lineTo(-Math.cos(angle) * sp.size, -Math.sin(angle) * sp.size);
        }
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  // --- Dynamic Gradual Day & Night Interpolation ---
  function getCycleState() {
    const mode = CYCLE_MODES[currentCycleModeIndex];

    if (mode === 'AUTO') {
      // Smooth continuous advance (~50s full cycle)
      cycleProgress = (cycleProgress + 0.00032) % 1.0;
    } else {
      let targetP = 0.0;
      if (mode === 'DAY') targetP = 0.0;
      else if (mode === 'SUNSET') targetP = 0.25;
      else if (mode === 'NIGHT') targetP = 0.50;
      else if (mode === 'DAWN') targetP = 0.75;

      let diff = targetP - cycleProgress;
      if (diff > 0.5) diff -= 1.0;
      if (diff < -0.5) diff += 1.0;
      cycleProgress = (cycleProgress + diff * 0.06 + 1.0) % 1.0;
    }

    const stageFloat = cycleProgress * 4;
    const stageIndex = Math.floor(stageFloat);
    const stageLerp = stageFloat - stageIndex;
    const smoothT = (1 - Math.cos(stageLerp * Math.PI)) / 2;

    const fromCycle = CYCLES[stageIndex % 4];
    const toCycle = CYCLES[(stageIndex + 1) % 4];

    function lerpColor(c1, c2, t) {
      return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t)
      ];
    }

    const skyTop = lerpColor(fromCycle.skyTop, toCycle.skyTop, smoothT);
    const skyMid = lerpColor(fromCycle.skyMid, toCycle.skyMid, smoothT);
    const skyBot = lerpColor(fromCycle.skyBot, toCycle.skyBot, smoothT);
    const mountainCol = lerpColor(fromCycle.mountainColor, toCycle.mountainColor, smoothT);

    const nightRatio = fromCycle.nightRatio + (toCycle.nightRatio - fromCycle.nightRatio) * smoothT;
    const pipeBrightness = fromCycle.pipeBrightness + (toCycle.pipeBrightness - fromCycle.pipeBrightness) * smoothT;

    const activeName = stageLerp < 0.5 ? fromCycle.name : toCycle.name;
    const activeIcon = stageLerp < 0.5 ? fromCycle.icon : toCycle.icon;

    if (cycleText && cycleIcon) {
      cycleText.textContent = mode === 'AUTO' ? activeName : mode;
      cycleIcon.textContent = mode === 'AUTO' ? activeIcon : fromCycle.icon;
    }

    return {
      skyTop: `rgb(${skyTop[0]},${skyTop[1]},${skyTop[2]})`,
      skyMid: `rgb(${skyMid[0]},${skyMid[1]},${skyMid[2]})`,
      skyBot: `rgb(${skyBot[0]},${skyBot[1]},${skyBot[2]})`,
      mountainColor: `rgb(${mountainCol[0]},${mountainCol[1]},${mountainCol[2]})`,
      mountainOutline: toCycle.mountainOutline,
      cloudTop: toCycle.cloudTop,
      cloudBot: toCycle.cloudBot,
      cloudShadow: toCycle.cloudShadow,
      nightRatio,
      pipeBrightness,
      cycleProgress
    };
  }

  // --- Dynamic Gradual Seasons Interpolation ---
  function getSeasonState() {
    const sMode = SEASON_MODES[currentSeasonModeIndex];

    if (sMode === 'AUTO') {
      // Smooth continuous advance (~140s full cycle across all 4 seasons)
      seasonProgress = (seasonProgress + 0.00012) % 1.0;
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
    const smoothT = (1 - Math.cos(stageLerp * Math.PI)) / 2;

    const fromSeason = SEASONS[stageIndex % 4];
    const toSeason = SEASONS[(stageIndex + 1) % 4];

    function lerpColor(c1, c2, t) {
      return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t)
      ];
    }

    const hillCol = lerpColor(fromSeason.hillColor, toSeason.hillColor, smoothT);
    const hillDark = lerpColor(fromSeason.hillDark, toSeason.hillDark, smoothT);
    const treeCanopy = lerpColor(fromSeason.treeCanopy, toSeason.treeCanopy, smoothT);
    const grassTop = lerpColor(fromSeason.grassTop, toSeason.grassTop, smoothT);
    const grassBot = lerpColor(fromSeason.grassBot, toSeason.grassBot, smoothT);

    const activeName = stageLerp < 0.5 ? fromSeason.name : toSeason.name;
    const activeIcon = stageLerp < 0.5 ? fromSeason.icon : toSeason.icon;

    if (seasonText && seasonIcon) {
      seasonText.textContent = sMode === 'AUTO' ? activeName : sMode;
      seasonIcon.textContent = sMode === 'AUTO' ? activeIcon : fromSeason.icon;
    }

    return {
      hillColor: `rgb(${hillCol[0]},${hillCol[1]},${hillCol[2]})`,
      hillDark: `rgb(${hillDark[0]},${hillDark[1]},${hillDark[2]})`,
      treeCanopy: `rgb(${treeCanopy[0]},${treeCanopy[1]},${treeCanopy[2]})`,
      treeOutline: toSeason.treeOutline,
      grassTop: `rgb(${grassTop[0]},${grassTop[1]},${grassTop[2]})`,
      grassBot: `rgb(${grassBot[0]},${grassBot[1]},${grassBot[2]})`,
      seasonIndex: stageIndex % 4,
      isWinter: (stageIndex % 4) === 3
    };
  }

  function drawSky(cycle) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    skyGrad.addColorStop(0, cycle.skyTop);
    skyGrad.addColorStop(0.55, cycle.skyMid);
    skyGrad.addColorStop(1, cycle.skyBot);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Stars at Night
    if (cycle.nightRatio > 0.08) {
      stars.forEach(st => {
        const twinkle = Math.sin(globalFrame * 0.08 + st.twinkleOffset) * 0.35 + 0.65;
        ctx.save();
        ctx.globalAlpha = cycle.nightRatio * twinkle;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      updateShootingStar();
      if (shootingStar.life > 0) {
        ctx.save();
        ctx.globalAlpha = cycle.nightRatio * (shootingStar.life / 24);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(shootingStar.x, shootingStar.y);
        ctx.lineTo(shootingStar.x - shootingStar.vx * 3, shootingStar.y - shootingStar.vy * 3);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Celestial Sun: Travels in a parabolic arc
    const isSunTime = cycle.cycleProgress < 0.46 || cycle.cycleProgress > 0.82;
    if (isSunTime) {
      let sunNorm = cycle.cycleProgress < 0.5 ? (cycle.cycleProgress + 0.18) / 0.64 : (cycle.cycleProgress - 0.82) / 0.64;
      sunNorm = Math.max(0, Math.min(1, sunNorm));

      const sunX = V_WIDTH * 0.15 + sunNorm * (V_WIDTH * 0.70);
      const sunY = 70 + Math.pow(sunNorm - 0.5, 2) * 440;

      ctx.save();
      const sunAlpha = Math.max(0, 1 - cycle.nightRatio * 1.5);
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

    // Celestial Moon: Travels in an arc at Night
    const isMoonTime = cycle.cycleProgress > 0.38 && cycle.cycleProgress < 0.90;
    if (isMoonTime && cycle.nightRatio > 0.15) {
      let moonNorm = (cycle.cycleProgress - 0.38) / 0.52;
      moonNorm = Math.max(0, Math.min(1, moonNorm));

      const moonX = V_WIDTH * 0.18 + moonNorm * (V_WIDTH * 0.64);
      const moonY = 66 + Math.pow(moonNorm - 0.5, 2) * 360;

      ctx.save();
      ctx.globalAlpha = cycle.nightRatio;

      // Soft Lunar Halo
      const moonHalo = ctx.createRadialGradient(moonX, moonY, 12, moonX, moonY, 48);
      moonHalo.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      moonHalo.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = moonHalo;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 48, 0, Math.PI * 2);
      ctx.fill();

      // Crescent Moon
      ctx.fillStyle = '#f8f9fa';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 20, 0, Math.PI * 2);
      ctx.fill();

      // Mask for realistic crescent
      ctx.fillStyle = cycle.skyTop;
      ctx.beginPath();
      ctx.arc(moonX + 8, moonY - 4, 17.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // --- Parallax Scenery: Mountains & Rolling Hills with Seasonal Trees Moving Backward ---
  function drawMovingScenery(cycle, season) {
    if (currentState === STATE.PLAYING || currentState === STATE.READY) {
      mountainScrollOffset += GAME_SPEED * 0.16;
      hillsScrollOffset += GAME_SPEED * 0.38;
    }

    // LAYER 1: Distant Mountain Ridge (Moving Backward)
    ctx.save();
    const mBaseY = GROUND_Y - 32;
    const M_TILE_W = 140;
    const mStart = -(mountainScrollOffset % M_TILE_W) - M_TILE_W;

    ctx.fillStyle = cycle.mountainColor;
    ctx.strokeStyle = cycle.mountainOutline;
    ctx.lineWidth = 1.8;

    for (let x = mStart; x < V_WIDTH + M_TILE_W; x += M_TILE_W) {
      ctx.beginPath();
      ctx.moveTo(x, mBaseY);
      ctx.lineTo(x + 70, mBaseY - 82);
      ctx.lineTo(x + 140, mBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Snowcap / Ridge Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(x + 70, mBaseY - 82);
      ctx.lineTo(x + 85, mBaseY - 64);
      ctx.lineTo(x + 75, mBaseY - 68);
      ctx.lineTo(x + 65, mBaseY - 64);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // LAYER 2: Mid-Ground Rolling Hills with Seasonal Trees (Moving Backward)
    ctx.save();
    const hBaseY = GROUND_Y - 10;
    const H_TILE_W = 120;
    const hStart = -(hillsScrollOffset % H_TILE_W) - H_TILE_W;

    for (let x = hStart; x < V_WIDTH + H_TILE_W; x += H_TILE_W) {
      // Rolling Hill Contour (Color morphs between seasons)
      ctx.fillStyle = season.hillColor;
      ctx.strokeStyle = season.hillDark;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(x, hBaseY);
      ctx.quadraticCurveTo(x + 35, hBaseY - 50, x + 70, hBaseY - 32);
      ctx.quadraticCurveTo(x + 95, hBaseY - 44, x + H_TILE_W, hBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Clustered Seasonal Trees on Ridge (Sakura pink in Spring, emerald in Summer, fiery in Autumn, pines in Winter)
      ctx.fillStyle = season.treeCanopy;
      ctx.strokeStyle = season.treeOutline;
      ctx.lineWidth = 1.5;

      if (season.isWinter) {
        // Winter Evergreen Pine Trees with White Snow Tops
        drawPineTree(ctx, x + 42, hBaseY - 40, 16);
      } else {
        // Rounded Deciduous Canopies
        ctx.beginPath();
        ctx.arc(x + 32, hBaseY - 42, 7, 0, Math.PI * 2);
        ctx.arc(x + 42, hBaseY - 45, 9, 0, Math.PI * 2);
        ctx.arc(x + 52, hBaseY - 41, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawPineTree(context, tx, ty, size) {
    context.fillStyle = '#2c584a';
    context.beginPath();
    context.moveTo(tx, ty - size);
    context.lineTo(tx + size * 0.6, ty);
    context.lineTo(tx - size * 0.6, ty);
    context.closePath();
    context.fill();

    // Snow blanket on pine top
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.moveTo(tx, ty - size);
    context.lineTo(tx + size * 0.35, ty - size * 0.45);
    context.lineTo(tx, ty - size * 0.35);
    context.lineTo(tx - size * 0.35, ty - size * 0.45);
    context.closePath();
    context.fill();
  }

  // --- Hand-Crafted Ground: Grass Turf & Stratified Soil ---
  function drawGround(season) {
    if (currentState === STATE.PLAYING || currentState === STATE.READY) {
      groundScrollOffset = (groundScrollOffset + GAME_SPEED) % 24;
    }

    // 1. Seasonal Grass Turf Strip (Morphs with active season)
    const grassGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 16);
    grassGrad.addColorStop(0, season.grassTop);
    grassGrad.addColorStop(1, season.grassBot);
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, GROUND_Y, V_WIDTH, 16);

    // Bright Top Edge Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(0, GROUND_Y, V_WIDTH, 2.5);

    // Grass Blade Serrated Teeth Shadow
    ctx.fillStyle = season.hillDark;
    ctx.fillRect(0, GROUND_Y + 14, V_WIDTH, 3);

    // 2. Stratified Soil / Dirt Body
    const dirtGrad = ctx.createLinearGradient(0, GROUND_Y + 17, 0, V_HEIGHT);
    dirtGrad.addColorStop(0, '#ded895');
    dirtGrad.addColorStop(0.25, '#d6ca88');
    dirtGrad.addColorStop(0.7, '#c2b062');
    dirtGrad.addColorStop(1, '#9e8c42');
    ctx.fillStyle = dirtGrad;
    ctx.fillRect(0, GROUND_Y + 17, V_WIDTH, GROUND_HEIGHT - 17);

    // 3. Diagonal Textured Earth Stripes (Moving Backward with Ground)
    ctx.fillStyle = '#c8ba6e';
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, GROUND_Y + 17, V_WIDTH, GROUND_HEIGHT - 17);
    ctx.clip();

    const stripeWidth = 12;
    for (let x = -groundScrollOffset - 24; x < V_WIDTH + 24; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 17);
      ctx.lineTo(x + stripeWidth, GROUND_Y + 17);
      ctx.lineTo(x, V_HEIGHT);
      ctx.lineTo(x - stripeWidth, V_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }

    // Small Earth Pebbles scattered on soil
    ctx.fillStyle = '#9e8c42';
    for (let x = -groundScrollOffset - 12; x < V_WIDTH + 24; x += 36) {
      ctx.beginPath();
      ctx.ellipse(x + 14, GROUND_Y + 35, 3.2, 2.0, 0.2, 0, Math.PI * 2);
      ctx.ellipse(x + 24, GROUND_Y + 58, 2.6, 1.6, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- Hand-Crafted 3D Cylindrical Classic Green Pipes ---
  const pipes = [];
  const PIPE_WIDTH = 62;
  const PIPE_GAP = 152;
  const PIPE_SPAWN_INTERVAL = 145;
  let pipeTimer = 0;

  class PipePair {
    constructor(x) {
      this.x = x;
      this.w = PIPE_WIDTH;
      const minCenter = 130 + PIPE_GAP / 2;
      const maxCenter = GROUND_Y - 80 - PIPE_GAP / 2;
      this.gapCenter = Math.floor(Math.random() * (maxCenter - minCenter + 1)) + minCenter;
      this.topHeight = this.gapCenter - PIPE_GAP / 2;
      this.bottomY = this.gapCenter + PIPE_GAP / 2;
      this.bottomHeight = GROUND_Y - this.bottomY;
      this.passed = false;
    }

    update() {
      this.x -= GAME_SPEED;
    }

    draw(cycle) {
      // Soft ambient drop shadow cast behind pipes
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.fillRect(this.x + 8, 0, this.w, this.topHeight);
      ctx.fillRect(this.x + 8, this.bottomY, this.w, this.bottomHeight);
      ctx.restore();

      // Top Pipe (hanging down)
      this.drawPipeSection(this.x, 0, this.w, this.topHeight, true, cycle);
      // Bottom Pipe (standing up)
      this.drawPipeSection(this.x, this.bottomY, this.w, this.bottomHeight, false, cycle);
    }

    drawPipeSection(x, y, w, h, isTop, cycle) {
      const lipHeight = 28;
      const lipOverlap = 5;
      const lipWidth = w + lipOverlap * 2;
      const lipX = x - lipOverlap;
      const lipY = isTop ? y + h - lipHeight : y;
      const shaftY = isTop ? y : y + lipHeight;
      const shaftHeight = Math.max(0, isTop ? h - lipHeight : h - lipHeight);

      // --- 1. Pipe Shaft Cylindrical 3D Texture ---
      const shaftGrad = ctx.createLinearGradient(x, 0, x + w, 0);
      shaftGrad.addColorStop(0, '#428a21');
      shaftGrad.addColorStop(0.18, '#5cb52f');
      shaftGrad.addColorStop(0.38, '#9ced4a');
      shaftGrad.addColorStop(0.68, '#58af2d');
      shaftGrad.addColorStop(0.9, '#39751c');
      shaftGrad.addColorStop(1, '#275213');

      ctx.fillStyle = shaftGrad;
      ctx.fillRect(x, shaftY, w, shaftHeight);

      // Shaft Outline
      ctx.strokeStyle = '#1e3f0e';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, shaftY, w, shaftHeight);

      // Glossy Vertical Specular Stripe
      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.fillRect(x + w * 0.32, shaftY, 3, shaftHeight);

      // --- 2. Pipe Lip Collar with 3D Overhang ---
      const lipGrad = ctx.createLinearGradient(lipX, 0, lipX + lipWidth, 0);
      lipGrad.addColorStop(0, '#428a21');
      lipGrad.addColorStop(0.2, '#5cb52f');
      lipGrad.addColorStop(0.42, '#b2f458');
      lipGrad.addColorStop(0.72, '#55ab2b');
      lipGrad.addColorStop(1, '#224810');

      ctx.fillStyle = lipGrad;
      ctx.beginPath();
      this.roundRect(ctx, lipX, lipY, lipWidth, lipHeight, 3);
      ctx.fill();

      // Lip Outline
      ctx.strokeStyle = '#1e3f0e';
      ctx.lineWidth = 2.5;
      ctx.stroke();

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

      // --- 1. Tail Feathers (3 Layered Classic Feathers) ---
      const wag = Math.sin(this.tailWag) * 3;
      ctx.save();
      ctx.translate(-15, 2);
      ctx.rotate(wag * 0.05);
      ctx.fillStyle = '#e5970c';
      ctx.strokeStyle = '#754003';
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.ellipse(-4, -4, 6, 3, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-6, 0, 7, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-4, 4, 6, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // --- 2. Head Crest Feather Tuft ---
      ctx.fillStyle = '#ffb300';
      ctx.strokeStyle = '#754003';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(-2, -15, 3.5, 6, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // --- 3. Chubby Yellow Bird Body (Multi-Stop Textured Gradient) ---
      ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
      ctx.beginPath();
      ctx.ellipse(-2, 4, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      const bodyGrad = ctx.createRadialGradient(-3, -4, 3, 1, 2, 18);
      bodyGrad.addColorStop(0, '#fff466');
      bodyGrad.addColorStop(0.5, '#fdbf18');
      bodyGrad.addColorStop(0.88, '#ea8e05');
      bodyGrad.addColorStop(1, '#c96f00');

      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#633703';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 13.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Peach Cream Underbelly Patch
      const bellyGrad = ctx.createLinearGradient(-10, 0, 8, 12);
      bellyGrad.addColorStop(0, '#ffffff');
      bellyGrad.addColorStop(0.6, '#fff0bd');
      bellyGrad.addColorStop(1, '#ffd894');
      ctx.fillStyle = bellyGrad;
      ctx.beginPath();
      ctx.ellipse(-2, 4.5, 11, 7.5, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // --- 4. Layered Animated Wing ---
      const wingFlap = Math.sin(this.wingAngle) * 7;
      ctx.save();
      ctx.translate(-5, 0);
      ctx.rotate(wingFlap * 0.08);

      const wingGrad = ctx.createLinearGradient(-10, -6, 6, 8);
      wingGrad.addColorStop(0, '#ffffff');
      wingGrad.addColorStop(0.35, '#fee150');
      wingGrad.addColorStop(0.85, '#f59a0b');
      wingGrad.addColorStop(1, '#cf7302');

      ctx.fillStyle = wingGrad;
      ctx.strokeStyle = '#633703';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.ellipse(-4, -1 + wingFlap * 0.35, 10, 7.2, -0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Wing Feather Quill Line
      ctx.strokeStyle = '#995906';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(-4, -1 + wingFlap * 0.35, 5, 0.4, 2.2);
      ctx.stroke();
      ctx.restore();

      // --- 5. Expressive Big Cartoon Eye ---
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#4a2902';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(7.5, -5, 7, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupil
      ctx.fillStyle = '#1e2430';
      ctx.beginPath();
      ctx.arc(9.5, -5, 3.6, 0, Math.PI * 2);
      ctx.fill();

      // Eye Shines (Double Specular Glint Reflection)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(10.8, -6.6, 1.6, 0, Math.PI * 2);
      ctx.arc(8.5, -3.8, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Cute Rosy Peach Cheek Blush
      ctx.fillStyle = 'rgba(255, 95, 95, 0.48)';
      ctx.beginPath();
      ctx.arc(4, 3.5, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // --- 6. Bright Orange Duck Lips / Beak ---
      const beakGrad = ctx.createLinearGradient(11, 0, 22, 3);
      beakGrad.addColorStop(0, '#ff832b');
      beakGrad.addColorStop(0.7, '#ff5a17');
      beakGrad.addColorStop(1, '#db3804');

      ctx.fillStyle = beakGrad;
      ctx.strokeStyle = '#5a1f01';
      ctx.lineWidth = 2;

      // Top Lip
      ctx.beginPath();
      ctx.moveTo(11, -1.5);
      ctx.quadraticCurveTo(18, -4, 22, 0);
      ctx.lineTo(13, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bottom Lip
      ctx.beginPath();
      ctx.moveTo(11, 2);
      ctx.quadraticCurveTo(18, 1.5, 20.5, 3);
      ctx.quadraticCurveTo(16, 7, 11, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Smile mouth crease
      ctx.strokeStyle = '#421601';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(12, 1.5);
      ctx.lineTo(19, 1.5);
      ctx.stroke();

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
        color: Math.random() > 0.4 ? '#ffcf33' : '#ffffff',
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
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sp.text, 0, 0);
      ctx.restore();
    });
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
    roundRect(ctx, 36, promptY - 26, V_WIDTH - 72, 115, 20);
    ctx.fill();

    ctx.strokeStyle = '#553b1b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const tapOffset = Math.sin(globalFrame * 0.11) * 5;
    drawTapIcon(V_WIDTH / 2, promptY + 10 + tapOffset);

    ctx.font = '700 17px "Fredoka", sans-serif';
    ctx.fillStyle = '#332010';
    ctx.fillText('TAP OR PRESS SPACE', V_WIDTH / 2, promptY + 52);

    ctx.font = '600 12.5px "Fredoka", sans-serif';
    ctx.fillStyle = '#6b4c20';
    ctx.fillText('Press T: Day/Night • Press S: Seasons', V_WIDTH / 2, promptY + 74);

    ctx.restore();
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

  const restartButtonRect = { x: 75, y: 436, w: 210, h: 54 };

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
      currentState = STATE.PLAYING;
      bird.jump();
      srAnnouncements.textContent = 'Game started. Tap to fly!';
    } else if (currentState === STATE.PLAYING) {
      bird.jump();
    } else if (currentState === STATE.GAMEOVER) {
      if (gameOverTimer > 18) {
        restartGame();
      }
    }
  }

  function restartGame() {
    pipes.length = 0;
    particles.length = 0;
    scorePopups.length = 0;
    score = 0;
    pipeTimer = 0;
    bird.reset();
    currentState = STATE.READY;
    srAnnouncements.textContent = 'Game reset. Ready to fly.';
    sound.playTone(480, 0.08, 'sine');
  }

  window.addEventListener('pointerdown', (e) => {
    if (e.target === canvas || e.target.id === 'game-container') {
      handleAction(e);
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      handleAction(e);
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      toggleCycle();
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      toggleSeason();
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      sound.toggleMute();
    }
  });

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  // --- Main Animation Loop ---
  function gameLoop() {
    globalFrame++;

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
    drawSky(cycle);

    // 2. Dynamic Gradual Seasons (Color Blending)
    const season = getSeasonState();

    // 3. Parallax Textured Clouds Moving Backward
    updateClouds();
    drawClouds(cycle);

    // 4. Parallax Mountains & Rolling Hills with Seasonal Trees Moving Backward
    drawMovingScenery(cycle, season);

    // 5. Seasonal Weather Particles Moving Backward (Petals, motes, leaves, snow)
    updateSeasonalParticles(season.seasonIndex);
    drawSeasonalParticles();

    // 6. Hand-Crafted Green Pipes
    if (currentState === STATE.PLAYING) {
      pipeTimer++;
      if (pipeTimer >= PIPE_SPAWN_INTERVAL) {
        pipeTimer = 0;
        pipes.push(new PipePair(V_WIDTH + 10));
      }

      for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.update();

        if (!p.passed && p.x + p.w < bird.x) {
          p.passed = true;
          score++;
          if (CYCLE_MODES[currentCycleModeIndex] === 'AUTO') {
            cycleProgress = (cycleProgress + 0.014) % 1.0;
          }
          if (SEASON_MODES[currentSeasonModeIndex] === 'AUTO') {
            seasonProgress = (seasonProgress + 0.008) % 1.0;
          }
          createScoreSparkles(bird.x + 10, bird.y);
          sound.playScore();
          srAnnouncements.textContent = `Score: ${score}`;
        }

        if (p.x + p.w < -30) pipes.splice(i, 1);
      }
    }
    pipes.forEach(p => p.draw(cycle));

    // 7. Textured Earth & Grass Turf Ground Moving Backward
    drawGround(season);

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

})();
