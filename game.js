/**
 * Flappy Bird - Neon Seasons & Cyber Arcade Edition
 * Features:
 * - Full Neon Synthwave / Cyberpunk Aesthetic with Real-time Glow FX
 * - Dynamic Day / Sunset / Night / Dawn Cycles with Smooth Color Transitions
 * - 4 Seasonal Moving Worlds:
 *    • Spring: Neon Sakura Grove with floating pagodas & drifting cherry blossom petals
 *    • Summer: Cyber Metropolis with holographic towers & light-trail traffic highway
 *    • Autumn: Golden Ember Ruins with floating glowing obelisks & swirling leaves
 *    • Winter: Aurora Borealis Frost-land with undulating aurora waves & falling snowflakes
 * - Glowing Cyber Bird with neon visor, luminous layered wings, and light ribbon trails
 * - Obsidian Cyber Pipes with vibrant neon laser cores, circuit lines & glowing rims
 * - Procedural Web Audio API sound effects with audio mute toggle
 */

(() => {
  'use strict';

  // --- Canvas Setup & High-DPI Support ---
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
      if (!this.muted) this.playTone(560, 0.08, 'sine');
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
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(780, t + 0.12);

      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    }

    playScore() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(920, t);
      osc.frequency.setValueAtTime(1380, t + 0.09);

      gain.gain.setValueAtTime(0.26, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.34);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    }

    playHit() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.2);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.21);
    }

    playDie() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.38);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.39);
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

  // Calibrated smooth speed
  const GAME_SPEED = 1.62;
  const GROUND_HEIGHT = 108;
  const GROUND_Y = V_HEIGHT - GROUND_HEIGHT;
  let groundScrollOffset = 0;
  let landmarkScrollOffset = 0;
  let foothillsScrollOffset = 0;
  let mountainScrollOffset = 0;

  // --- Day & Night Cycles & Seasons Engine ---
  const SEASONS = [
    { name: 'SPRING', icon: '🌸', color: '#ff66c4', accent: '#00f2fe' },
    { name: 'SUMMER', icon: '🌴', color: '#00f2fe', accent: '#ff007f' },
    { name: 'AUTUMN', icon: '🍁', color: '#ff772e', accent: '#ffe600' },
    { name: 'WINTER', icon: '❄️', color: '#68d8d6', accent: '#a18cd1' }
  ];

  const CYCLES = [
    {
      name: 'DAY',
      icon: '☀️',
      color: '#ffe600',
      skyTop: [14, 60, 130],
      skyMid: [32, 130, 196],
      skyBot: [80, 204, 235],
      cloudTop: 'rgba(255, 255, 255, 0.92)',
      cloudBot: 'rgba(165, 225, 250, 0.45)',
      cloudRim: 'rgba(255, 255, 255, 0.95)',
      ambient: 1.0,
      nightRatio: 0.0,
      windowGlow: 0.0,
      sunAlpha: 1.0,
      mountainTint: 'rgba(18, 48, 88, 0.85)',
      ridgeGlow: '#00f2fe'
    },
    {
      name: 'SUNSET',
      icon: '🌅',
      color: '#ff772e',
      skyTop: [52, 14, 82],
      skyMid: [170, 28, 98],
      skyBot: [255, 118, 38],
      cloudTop: 'rgba(255, 195, 140, 0.9)',
      cloudBot: 'rgba(195, 45, 115, 0.55)',
      cloudRim: 'rgba(255, 230, 160, 0.95)',
      ambient: 0.88,
      nightRatio: 0.22,
      windowGlow: 0.72,
      sunAlpha: 1.0,
      mountainTint: 'rgba(42, 18, 55, 0.88)',
      ridgeGlow: '#ff007f'
    },
    {
      name: 'NIGHT',
      icon: '🌙',
      color: '#00f2fe',
      skyTop: [5, 7, 18],
      skyMid: [12, 16, 44],
      skyBot: [26, 32, 75],
      cloudTop: 'rgba(34, 45, 92, 0.65)',
      cloudBot: 'rgba(14, 18, 40, 0.35)',
      cloudRim: 'rgba(0, 242, 254, 0.45)',
      ambient: 0.52,
      nightRatio: 1.0,
      windowGlow: 1.0,
      sunAlpha: 0.0,
      mountainTint: 'rgba(10, 14, 30, 0.92)',
      ridgeGlow: '#00f2fe'
    },
    {
      name: 'DAWN',
      icon: '🌄',
      color: '#ff66c4',
      skyTop: [28, 20, 64],
      skyMid: [116, 52, 95],
      skyBot: [238, 148, 118],
      cloudTop: 'rgba(255, 228, 205, 0.88)',
      cloudBot: 'rgba(135, 62, 102, 0.48)',
      cloudRim: 'rgba(255, 245, 195, 0.9)',
      ambient: 0.80,
      nightRatio: 0.18,
      windowGlow: 0.35,
      sunAlpha: 0.85,
      mountainTint: 'rgba(32, 24, 60, 0.88)',
      ridgeGlow: '#ff66c4'
    }
  ];

  const CYCLE_MODES = ['AUTO', 'DAY', 'SUNSET', 'NIGHT', 'DAWN'];
  let currentCycleModeIndex = 0; // 0 = AUTO
  let cycleProgress = 0.08; // Starts in bright, beautiful morning day
  let targetManualProgress = null;
  let currentSeasonIndex = 0;
  let currentCycleNightRatio = 0;

  // Background stars for Night/Dusk
  const stars = [];
  for (let i = 0; i < 50; i++) {
    stars.push({
      x: Math.random() * V_WIDTH,
      y: Math.random() * (GROUND_Y - 90),
      size: Math.random() * 1.8 + 0.6,
      twinkleOffset: Math.random() * Math.PI * 2,
      color: Math.random() > 0.4 ? '#00f2fe' : (Math.random() > 0.5 ? '#ff007f' : '#ffffff')
    });
  }

  // Shooting star
  let shootingStar = { x: -100, y: 0, vx: 0, vy: 0, life: 0 };
  function updateShootingStar() {
    if (shootingStar.life > 0) {
      shootingStar.x += shootingStar.vx;
      shootingStar.y += shootingStar.vy;
      shootingStar.life--;
    } else if (Math.random() < 0.007) {
      shootingStar.x = Math.random() * V_WIDTH * 0.7;
      shootingStar.y = Math.random() * 120 + 20;
      shootingStar.vx = Math.random() * 4 + 5;
      shootingStar.vy = Math.random() * 2 + 2;
      shootingStar.life = 25;
    }
  }

  // --- Parallax Moving Clouds ---
  const clouds = [
    { x: 30, y: 40, scale: 0.95, speed: 0.18, opacity: 0.68 },
    { x: 145, y: 74, scale: 1.25, speed: 0.24, opacity: 0.55 },
    { x: 260, y: 32, scale: 0.80, speed: 0.15, opacity: 0.70 },
    { x: 375, y: 88, scale: 1.10, speed: 0.22, opacity: 0.52 },
    { x: 490, y: 52, scale: 0.88, speed: 0.19, opacity: 0.62 }
  ];

  function updateClouds() {
    if (currentState === STATE.PLAYING || currentState === STATE.READY) {
      clouds.forEach(cl => {
        // Move backward across the sky
        cl.x -= cl.speed * GAME_SPEED;
        if (cl.x + 130 * cl.scale < -40) {
          cl.x = V_WIDTH + 40 + Math.random() * 60;
          cl.y = 26 + Math.random() * 75;
        }
      });
    }
  }

  function drawClouds(cycle) {
    clouds.forEach(cl => {
      ctx.save();
      ctx.translate(cl.x, cl.y);
      ctx.scale(cl.scale, cl.scale);
      ctx.globalAlpha = cl.opacity;

      const grad = ctx.createLinearGradient(0, -15, 0, 30);
      grad.addColorStop(0, cycle.cloudTop);
      grad.addColorStop(1, cycle.cloudBot);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(20, 15, 18, 0, Math.PI * 2);
      ctx.arc(42, 8, 24, 0, Math.PI * 2);
      ctx.arc(68, 14, 19, 0, Math.PI * 2);
      ctx.arc(88, 20, 14, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      // Top Highlight Rim
      ctx.strokeStyle = cycle.cloudRim;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(42, 8, 24, Math.PI * 1.05, Math.PI * 1.85);
      ctx.stroke();

      ctx.restore();
    });
  }

  // --- Seasonal & Night Weather Particles ---
  const seasonalParticles = [];
  function updateSeasonalParticles(seasonIdx) {
    if (seasonalParticles.length < 28 && Math.random() < 0.3) {
      const isFirefly = currentCycleNightRatio > 0.4 && Math.random() < 0.35;
      seasonalParticles.push({
        x: V_WIDTH + 15,
        y: isFirefly ? GROUND_Y - 20 - Math.random() * 120 : Math.random() * (GROUND_Y - 15),
        vx: -(Math.random() * 1.4 + 1.0), // Moves backward in the breeze
        vy: isFirefly ? (Math.random() - 0.5) * 0.8 : (seasonIdx === 3 ? Math.random() * 0.9 + 0.6 : (Math.random() - 0.5) * 0.5),
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.08,
        size: isFirefly ? Math.random() * 2.5 + 1.5 : Math.random() * 4 + 3,
        season: seasonIdx,
        isFirefly,
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

  function drawSeasonalParticles(cycle) {
    seasonalParticles.forEach(sp => {
      ctx.save();
      ctx.globalAlpha = sp.alpha;
      ctx.translate(sp.x, sp.y);
      ctx.rotate(sp.rot);

      if (sp.isFirefly) {
        // Night Bioluminescent Firefly
        const glow = Math.sin(globalFrame * 0.15 + sp.x) * 0.3 + 0.7;
        ctx.fillStyle = '#39ff14';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 10 * glow;
        ctx.beginPath();
        ctx.arc(0, 0, sp.size * glow, 0, Math.PI * 2);
        ctx.fill();
      } else if (sp.season === 0) {
        // Spring: Pink Sakura Petal
        ctx.fillStyle = '#ff66c4';
        ctx.shadowColor = '#ff66c4';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, sp.size * 1.3, sp.size * 0.7, 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (sp.season === 1) {
        // Summer: Neon Cyan Cyber Mote
        ctx.fillStyle = '#00f2fe';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, sp.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (sp.season === 2) {
        // Autumn: Glowing Maple Leaf / Golden Ember
        ctx.fillStyle = '#ff772e';
        ctx.shadowColor = '#ff5500';
        ctx.shadowBlur = 6;
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
        // Winter: Neon Snowflake
        ctx.strokeStyle = '#e0f7fa';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.2;
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

  // --- Dynamic Interpolated Environment Rendering ---
  function getCycleState() {
    // Mode handling: AUTO progression vs smooth manual transitions
    const mode = CYCLE_MODES[currentCycleModeIndex];

    if (mode === 'AUTO') {
      // Smooth continuous advance (~42 seconds per full day/night cycle)
      cycleProgress = (cycleProgress + 0.00035) % 1.0;
    } else {
      // Manual mode targets
      let targetP = 0.0;
      if (mode === 'DAY') targetP = 0.0;
      else if (mode === 'SUNSET') targetP = 0.25;
      else if (mode === 'NIGHT') targetP = 0.50;
      else if (mode === 'DAWN') targetP = 0.75;

      let diff = targetP - cycleProgress;
      // Handle modular wrap distance
      if (diff > 0.5) diff -= 1.0;
      if (diff < -0.5) diff += 1.0;
      cycleProgress = (cycleProgress + diff * 0.06 + 1.0) % 1.0;
    }

    const stageFloat = cycleProgress * 4;
    const stageIndex = Math.floor(stageFloat);
    const stageLerp = stageFloat - stageIndex;
    // Cosine smoothing for cinematic day/night blending
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

    const ambient = fromCycle.ambient + (toCycle.ambient - fromCycle.ambient) * smoothT;
    const nightRatio = fromCycle.nightRatio + (toCycle.nightRatio - fromCycle.nightRatio) * smoothT;
    const windowGlow = fromCycle.windowGlow + (toCycle.windowGlow - fromCycle.windowGlow) * smoothT;

    currentCycleNightRatio = nightRatio;

    // Active cycle display name
    const activeCycleName = stageLerp < 0.5 ? fromCycle.name : toCycle.name;
    const activeCycleIcon = stageLerp < 0.5 ? fromCycle.icon : toCycle.icon;

    if (cycleText && cycleIcon) {
      if (mode === 'AUTO') {
        cycleText.textContent = activeCycleName;
        cycleIcon.textContent = activeCycleIcon;
      } else {
        cycleText.textContent = mode;
        cycleIcon.textContent = fromCycle.icon;
      }
    }

    return {
      skyTop: `rgb(${skyTop[0]},${skyTop[1]},${skyTop[2]})`,
      skyMid: `rgb(${skyMid[0]},${skyMid[1]},${skyMid[2]})`,
      skyBot: `rgb(${skyBot[0]},${skyBot[1]},${skyBot[2]})`,
      cloudTop: toCycle.cloudTop,
      cloudBot: toCycle.cloudBot,
      cloudRim: toCycle.cloudRim,
      ambient,
      nightRatio,
      windowGlow,
      stageIndex,
      stageLerp,
      cycleProgress,
      activeName: activeCycleName,
      ridgeGlow: fromCycle.ridgeGlow,
      mountainTint: fromCycle.mountainTint
    };
  }

  function drawSky(cycle) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    skyGrad.addColorStop(0, cycle.skyTop);
    skyGrad.addColorStop(0.55, cycle.skyMid);
    skyGrad.addColorStop(1, cycle.skyBot);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Night Stars & Shooting Star
    if (cycle.nightRatio > 0.08) {
      stars.forEach(st => {
        const twinkle = Math.sin(globalFrame * 0.08 + st.twinkleOffset) * 0.4 + 0.6;
        ctx.save();
        ctx.globalAlpha = cycle.nightRatio * twinkle;
        ctx.fillStyle = st.color;
        ctx.shadowColor = st.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      updateShootingStar();
      if (shootingStar.life > 0) {
        ctx.save();
        ctx.globalAlpha = cycle.nightRatio * (shootingStar.life / 25);
        ctx.strokeStyle = '#00f2fe';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(shootingStar.x, shootingStar.y);
        ctx.lineTo(shootingStar.x - shootingStar.vx * 3, shootingStar.y - shootingStar.vy * 3);
        ctx.stroke();
        ctx.restore();
      }
    }

    // --- Dynamic Celestial Body: Sun & Moon Traveling on Arcs ---
    // Sun is active during Day, Sunset, and Dawn (cycleProgress 0.0 -> 0.45 or 0.85 -> 1.0)
    const isSunTime = cycle.cycleProgress < 0.46 || cycle.cycleProgress > 0.82;
    if (isSunTime) {
      // Map sun progress along arc: 0.82 (dawn rising) -> 0.12 (noon high) -> 0.45 (sunset sinking)
      let sunNorm = cycle.cycleProgress < 0.5 ? (cycle.cycleProgress + 0.18) / 0.64 : (cycle.cycleProgress - 0.82) / 0.64;
      sunNorm = Math.max(0, Math.min(1, sunNorm));

      const sunX = V_WIDTH * 0.15 + sunNorm * (V_WIDTH * 0.70);
      const sunY = 70 + Math.pow(sunNorm - 0.5, 2) * 440;
      const isSunset = cycle.cycleProgress > 0.22 && cycle.cycleProgress < 0.46;

      ctx.save();
      const sunAlpha = Math.max(0, 1 - cycle.nightRatio * 1.5);
      ctx.globalAlpha = sunAlpha;

      // Outer Sun Radiant Corona
      const haloR = isSunset ? 80 : 70;
      const haloGrad = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, haloR);
      if (isSunset) {
        haloGrad.addColorStop(0, 'rgba(255, 0, 127, 0.75)');
        haloGrad.addColorStop(0.5, 'rgba(255, 115, 36, 0.35)');
        haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        haloGrad.addColorStop(0, 'rgba(255, 245, 160, 0.8)');
        haloGrad.addColorStop(0.5, 'rgba(0, 242, 254, 0.25)');
        haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Main Sun Body
      const sunR = isSunset ? 32 : 28;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.clip();

      const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
      if (isSunset) {
        sunGrad.addColorStop(0, '#ffe600');
        sunGrad.addColorStop(0.5, '#ff007f');
        sunGrad.addColorStop(1, '#9d4edd');
      } else {
        sunGrad.addColorStop(0, '#ffffff');
        sunGrad.addColorStop(0.5, '#fff275');
        sunGrad.addColorStop(1, '#ff9900');
      }
      ctx.fillStyle = sunGrad;
      ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

      // Horizontal retro cutout stripes during Sunset
      if (isSunset) {
        ctx.fillStyle = cycle.skyMid;
        for (let sy = sunY - 4; sy < sunY + sunR; sy += 7) {
          ctx.fillRect(sunX - sunR, sy, sunR * 2, 2.5);
        }
      }
      ctx.restore();
      ctx.restore();
    }

    // Moon is active during Night & Twilight (cycleProgress 0.38 -> 0.90)
    const isMoonTime = cycle.cycleProgress > 0.38 && cycle.cycleProgress < 0.90;
    if (isMoonTime && cycle.nightRatio > 0.15) {
      let moonNorm = (cycle.cycleProgress - 0.38) / 0.52;
      moonNorm = Math.max(0, Math.min(1, moonNorm));

      const moonX = V_WIDTH * 0.18 + moonNorm * (V_WIDTH * 0.64);
      const moonY = 66 + Math.pow(moonNorm - 0.5, 2) * 360;

      ctx.save();
      ctx.globalAlpha = cycle.nightRatio;

      // Lunar Outer Halo
      const moonHalo = ctx.createRadialGradient(moonX, moonY, 15, moonX, moonY, 65);
      moonHalo.addColorStop(0, 'rgba(0, 242, 254, 0.35)');
      moonHalo.addColorStop(1, 'rgba(0, 242, 254, 0)');
      ctx.fillStyle = moonHalo;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 65, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Cyan Crescent Moon
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#00f2fe';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
      ctx.fill();

      // Crescent Mask matching sky
      ctx.fillStyle = cycle.skyTop;
      ctx.beginPath();
      ctx.arc(moonX + 9, moonY - 5, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Winter: Aurora Borealis Waves across Northern Sky
    if (currentSeasonIndex === 3) {
      ctx.save();
      const wave = Math.sin(globalFrame * 0.02) * 20;
      const wave2 = Math.cos(globalFrame * 0.025) * 25;
      const aurGrad = ctx.createLinearGradient(0, 40, 0, 220);
      aurGrad.addColorStop(0, 'rgba(0, 242, 254, 0)');
      aurGrad.addColorStop(0.5, `rgba(57, 255, 20, ${0.18 + cycle.nightRatio * 0.2})`);
      aurGrad.addColorStop(0.8, `rgba(157, 78, 221, ${0.15 + cycle.nightRatio * 0.15})`);
      aurGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aurGrad;

      ctx.beginPath();
      ctx.moveTo(0, 70 + wave);
      ctx.bezierCurveTo(V_WIDTH * 0.3, 30 + wave2, V_WIDTH * 0.7, 100 + wave, V_WIDTH, 60 + wave2);
      ctx.lineTo(V_WIDTH, 220);
      ctx.lineTo(0, 220);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // --- Continuous Parallax Mountains & Landscapes Moving Backward ---
  function drawMovingPlaces(cycle) {
    if (currentState === STATE.PLAYING || currentState === STATE.READY) {
      mountainScrollOffset += GAME_SPEED * 0.16;
      foothillsScrollOffset += GAME_SPEED * 0.32;
      landmarkScrollOffset += GAME_SPEED * 0.58;
    }

    // LAYER 1: Distant High Mountain Range (Moving Backward seamlessly)
    ctx.save();
    const mBaseY = GROUND_Y - 42;
    const M_TILE_W = 140;
    const mStart = -(mountainScrollOffset % M_TILE_W) - M_TILE_W;

    ctx.fillStyle = cycle.mountainTint;
    ctx.strokeStyle = cycle.ridgeGlow;
    ctx.lineWidth = 1.6;

    for (let x = mStart; x < V_WIDTH + M_TILE_W; x += M_TILE_W) {
      ctx.beginPath();
      ctx.moveTo(x, mBaseY);
      ctx.lineTo(x + 70, mBaseY - 86);
      ctx.lineTo(x + 140, mBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Peak Highlight Crest
      ctx.beginPath();
      ctx.moveTo(x + 55, mBaseY - 66);
      ctx.lineTo(x + 70, mBaseY - 86);
      ctx.lineTo(x + 85, mBaseY - 66);
      ctx.stroke();
    }
    ctx.restore();

    // LAYER 2: Secondary Mid-Distance Foothills (Moving Backward seamlessly)
    ctx.save();
    const fBaseY = GROUND_Y - 26;
    const F_TILE_W = 110;
    const fStart = -(foothillsScrollOffset % F_TILE_W) - F_TILE_W;

    ctx.fillStyle = 'rgba(10, 14, 28, 0.88)';
    ctx.strokeStyle = currentSeasonIndex === 3 ? 'rgba(0, 242, 254, 0.3)' : 'rgba(255, 0, 127, 0.22)';
    ctx.lineWidth = 1.4;

    for (let x = fStart; x < V_WIDTH + F_TILE_W; x += F_TILE_W) {
      ctx.beginPath();
      ctx.moveTo(x, fBaseY);
      ctx.quadraticCurveTo(x + 35, fBaseY - 48, x + 70, fBaseY - 32);
      ctx.quadraticCurveTo(x + 90, fBaseY - 42, x + F_TILE_W, fBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // LAYER 3: Seasonal Landmarks (Moving Backward seamlessly)
    if (currentSeasonIndex === 0) {
      drawSakuraPagodas(cycle);
    } else if (currentSeasonIndex === 1) {
      drawCyberMetropolis(cycle);
    } else if (currentSeasonIndex === 2) {
      drawAutumnObelisks(cycle);
    } else {
      drawWinterIcePeaks(cycle);
    }
  }

  function drawSakuraPagodas(cycle) {
    ctx.save();
    const baseY = GROUND_Y - 14;
    const TILE_W = 200;
    const startX = -(landmarkScrollOffset % TILE_W) - TILE_W;

    for (let x = startX; x < V_WIDTH + TILE_W; x += TILE_W) {
      // Floating Pagoda Silhouette
      ctx.fillStyle = '#170c24';
      ctx.strokeStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;

      // Tier 1 Curved Roof
      ctx.beginPath();
      ctx.moveTo(x + 10, baseY - 38);
      ctx.lineTo(x + 45, baseY - 52);
      ctx.lineTo(x + 80, baseY - 38);
      ctx.lineTo(x + 68, baseY - 43);
      ctx.lineTo(x + 22, baseY - 43);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tier 2 Curved Roof
      ctx.beginPath();
      ctx.moveTo(x + 22, baseY - 56);
      ctx.lineTo(x + 45, baseY - 70);
      ctx.lineTo(x + 68, baseY - 56);
      ctx.lineTo(x + 58, baseY - 60);
      ctx.lineTo(x + 32, baseY - 60);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pagoda Spire
      ctx.beginPath();
      ctx.moveTo(x + 45, baseY - 70);
      ctx.lineTo(x + 45, baseY - 84);
      ctx.stroke();

      // Hanging Lantern (Illuminates warmly at night!)
      const lanternGlow = 0.4 + cycle.windowGlow * 0.6;
      ctx.fillStyle = cycle.windowGlow > 0.4 ? '#ff9900' : '#ff007f';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10 * lanternGlow;
      ctx.beginPath();
      ctx.arc(x + 45, baseY - 26, 4, 0, Math.PI * 2);
      ctx.fill();

      // Torii Gate
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 95, baseY);
      ctx.lineTo(x + 95, baseY - 35);
      ctx.moveTo(x + 115, baseY);
      ctx.lineTo(x + 115, baseY - 35);
      ctx.moveTo(x + 90, baseY - 32);
      ctx.lineTo(x + 120, baseY - 32);
      ctx.stroke();

      // Blooming Cherry Blossom Tree Silhouette
      ctx.fillStyle = '#ff66c4';
      ctx.shadowColor = '#ff66c4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x + 155, baseY - 26, 16, 0, Math.PI * 2);
      ctx.arc(x + 168, baseY - 34, 14, 0, Math.PI * 2);
      ctx.arc(x + 145, baseY - 36, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCyberMetropolis(cycle) {
    ctx.save();
    const baseY = GROUND_Y - 8;
    const TILE_W = 340;
    const startX = -(landmarkScrollOffset % TILE_W) - TILE_W;

    const buildings = [
      { rx: 0, w: 32, h: 72, glow: '#00f2fe' },
      { rx: 34, w: 28, h: 98, glow: '#ff007f' },
      { rx: 64, w: 42, h: 62, glow: '#39ff14' },
      { rx: 108, w: 30, h: 90, glow: '#ffe600' },
      { rx: 140, w: 44, h: 70, glow: '#00f2fe' },
      { rx: 186, w: 32, h: 108, glow: '#ff007f' },
      { rx: 220, w: 38, h: 76, glow: '#00f2fe' },
      { rx: 260, w: 28, h: 92, glow: '#ffe600' },
      { rx: 290, w: 42, h: 64, glow: '#ff007f' }
    ];

    for (let tileX = startX; tileX < V_WIDTH + TILE_W; tileX += TILE_W) {
      buildings.forEach(b => {
        const bx = tileX + b.rx;
        if (bx + b.w < -20 || bx > V_WIDTH + 20) return;

        ctx.fillStyle = '#0a0d1e';
        ctx.fillRect(bx, baseY - b.h, b.w, b.h);

        // Neon Skyline Trim
        ctx.strokeStyle = b.glow;
        ctx.shadowColor = b.glow;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, baseY - b.h, b.w, b.h);

        // Blinking Antenna Beacon on Roof
        const blink = Math.sin(globalFrame * 0.12 + bx) > 0;
        if (blink) {
          ctx.fillStyle = b.glow;
          ctx.beginPath();
          ctx.arc(bx + b.w / 2, baseY - b.h - 5, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Dynamic Illuminated Windows (Light up brightly at Sunset & Night!)
        const winAlpha = 0.15 + cycle.windowGlow * 0.85;
        ctx.fillStyle = cycle.windowGlow > 0.4 ? (Math.sin(bx) > 0 ? '#ffe600' : '#00f2fe') : 'rgba(0, 242, 254, 0.3)';
        ctx.globalAlpha = winAlpha;

        for (let wy = baseY - b.h + 8; wy < baseY - 8; wy += 14) {
          ctx.fillRect(bx + 5, wy, 4, 5);
          if (b.w > 26) ctx.fillRect(bx + b.w - 9, wy, 4, 5);
        }
        ctx.globalAlpha = 1.0;
      });
    }

    // Elevated Highway with Speeding Vehicle Trails (Moving Backward)
    const hwyY = GROUND_Y - 12;
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hwyY);
    ctx.lineTo(V_WIDTH, hwyY);
    ctx.stroke();

    const traffic1 = (globalFrame * 4.8) % (V_WIDTH + 80);
    const traffic2 = (globalFrame * 4.2 + 130) % (V_WIDTH + 80);

    ctx.strokeStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(V_WIDTH - traffic1, hwyY - 2);
    ctx.lineTo(V_WIDTH - traffic1 + 24, hwyY - 2);
    ctx.stroke();

    ctx.strokeStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.beginPath();
    ctx.moveTo(traffic2 - 70, hwyY + 1.5);
    ctx.lineTo(traffic2 - 46, hwyY + 1.5);
    ctx.stroke();

    ctx.restore();
  }

  function drawAutumnObelisks(cycle) {
    ctx.save();
    const baseY = GROUND_Y - 18;
    const TILE_W = 190;
    const startX = -(landmarkScrollOffset % TILE_W) - TILE_W;

    for (let x = startX; x < V_WIDTH + TILE_W; x += TILE_W) {
      const floatY = Math.sin(globalFrame * 0.05 + x) * 7;
      const ox = x + 40;
      const oy = baseY - 52 + floatY;

      ctx.fillStyle = '#16101e';
      ctx.strokeStyle = '#ff772e';
      ctx.shadowColor = '#ff772e';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.8;

      // Hexagonal / Diamond Obelisk
      ctx.beginPath();
      ctx.moveTo(ox, oy - 42);
      ctx.lineTo(ox + 16, oy);
      ctx.lineTo(ox + 12, oy + 46);
      ctx.lineTo(ox - 12, oy + 46);
      ctx.lineTo(ox - 16, oy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing Center Rune Glyph
      ctx.fillStyle = '#ffe600';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(ox, oy + 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWinterIcePeaks(cycle) {
    ctx.save();
    const baseY = GROUND_Y - 10;
    const TILE_W = 180;
    const startX = -(landmarkScrollOffset % TILE_W) - TILE_W;

    for (let x = startX; x < V_WIDTH + TILE_W; x += TILE_W) {
      ctx.fillStyle = '#081729';
      ctx.strokeStyle = '#00f2fe';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + 20, baseY - 58);
      ctx.lineTo(x + 38, baseY - 86);
      ctx.lineTo(x + 56, baseY - 50);
      ctx.lineTo(x + 72, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crystal facet light line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.moveTo(x + 38, baseY - 86);
      ctx.lineTo(x + 38, baseY);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Synthwave Neon Ground / Cyber Grid Moving Backward ---
  function drawGround() {
    if (currentState === STATE.PLAYING || currentState === STATE.READY) {
      groundScrollOffset = (groundScrollOffset + GAME_SPEED) % 24;
    }

    // Top Neon Laser Line
    const curSeason = SEASONS[currentSeasonIndex];
    ctx.save();
    ctx.strokeStyle = curSeason.color;
    ctx.shadowColor = curSeason.color;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(V_WIDTH, GROUND_Y);
    ctx.stroke();

    // Dark Cyber Floor Base
    const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, V_HEIGHT);
    floorGrad.addColorStop(0, '#0c0f24');
    floorGrad.addColorStop(0.5, '#070815');
    floorGrad.addColorStop(1, '#020308');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, GROUND_Y + 2, V_WIDTH, GROUND_HEIGHT - 2);

    // Horizontal Perspective Grid Rungs
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.22)';
    ctx.lineWidth = 1.2;
    const rungs = [GROUND_Y + 14, GROUND_Y + 32, GROUND_Y + 54, GROUND_Y + 80, GROUND_Y + 104];
    rungs.forEach(ry => {
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(V_WIDTH, ry);
      ctx.stroke();
    });

    // Scrolling Diagonal Perspective Lines Moving Backward
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, GROUND_Y, V_WIDTH, GROUND_HEIGHT);
    ctx.clip();

    for (let x = -groundScrollOffset - 24; x < V_WIDTH + 30; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x + (x - V_WIDTH / 2) * 0.45, V_HEIGHT);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  // --- Obsidian & Neon Laser Pipes ---
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
      this.neonHue = (globalFrame * 0.5) % 360;
    }

    update() {
      this.x -= GAME_SPEED;
    }

    draw() {
      const curSeason = SEASONS[currentSeasonIndex];
      // Ambient shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(this.x + 8, 0, this.w, this.topHeight);
      ctx.fillRect(this.x + 8, this.bottomY, this.w, this.bottomHeight);

      // Top & Bottom Pipes
      this.drawPipeSection(this.x, 0, this.w, this.topHeight, true, curSeason);
      this.drawPipeSection(this.x, this.bottomY, this.w, this.bottomHeight, false, curSeason);
    }

    drawPipeSection(x, y, w, h, isTop, season) {
      const lipHeight = 28;
      const lipOverlap = 6;
      const lipWidth = w + lipOverlap * 2;
      const lipX = x - lipOverlap;
      const lipY = isTop ? y + h - lipHeight : y;
      const shaftY = isTop ? y : y + lipHeight;
      const shaftHeight = Math.max(0, isTop ? h - lipHeight : h - lipHeight);

      // 1. Dark Obsidian Body
      const bodyGrad = ctx.createLinearGradient(x, 0, x + w, 0);
      bodyGrad.addColorStop(0, '#101426');
      bodyGrad.addColorStop(0.35, '#222842');
      bodyGrad.addColorStop(0.65, '#161a2e');
      bodyGrad.addColorStop(1, '#090b14');

      ctx.fillStyle = bodyGrad;
      ctx.fillRect(x, shaftY, w, shaftHeight);

      // 2. Center Glowing Neon Laser Strip
      ctx.save();
      ctx.fillStyle = season.color;
      ctx.shadowColor = season.color;
      ctx.shadowBlur = 12;
      ctx.fillRect(x + w * 0.45, shaftY, 5, shaftHeight);

      // Vertical holographic circuit notches
      ctx.fillStyle = season.accent;
      ctx.shadowColor = season.accent;
      for (let cy = shaftY + 12; cy < shaftY + shaftHeight - 12; cy += 22) {
        ctx.fillRect(x + w * 0.3, cy, 4, 3);
        ctx.fillRect(x + w * 0.65, cy + 6, 4, 3);
      }
      ctx.restore();

      // Shaft Outline
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, shaftY, w, shaftHeight);

      // 3. Collar Lip Section
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      this.roundRect(ctx, lipX, lipY, lipWidth, lipHeight, 4);
      ctx.fill();

      // Neon Collar Rim Ring
      ctx.save();
      ctx.strokeStyle = season.color;
      ctx.shadowColor = season.color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Glowing Neon Energy Band on Lip
      const bandY = isTop ? lipY + 6 : lipY + lipHeight - 10;
      ctx.fillStyle = season.accent;
      ctx.shadowColor = season.accent;
      ctx.shadowBlur = 10;
      ctx.fillRect(lipX + 4, bandY, lipWidth - 8, 4);
      ctx.restore();
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

  // --- Glowing Neon Cyber Bird ---
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
      this.trail = [];
    }

    jump() {
      this.vy = this.jumpStrength;
      this.rotation = -0.42;
      createNeonPuff(this.x, this.y);
      createFeathers(this.x - 12, this.y + 4, 3);
      sound.playFlap();
    }

    update() {
      this.tailWag += 0.15;

      // Store trail points for glowing ribbon tail
      if (globalFrame % 2 === 0) {
        this.trail.unshift({
          x: this.x - 14,
          y: (currentState === STATE.READY ? this.y + this.idleFloatOffset : this.y) + 2,
          alpha: 1
        });
        if (this.trail.length > 8) this.trail.pop();
      }

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

      // Draw Light Ribbon Trail
      ctx.save();
      for (let i = 0; i < this.trail.length - 1; i++) {
        const t1 = this.trail[i];
        const t2 = this.trail[i + 1];
        const progress = 1 - i / this.trail.length;
        ctx.strokeStyle = `rgba(0, 242, 254, ${progress * 0.7})`;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 10;
        ctx.lineWidth = progress * 6;
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.translate(this.x, drawY);
      ctx.rotate(this.rotation);

      // 1. Neon Tail Feathers
      const wag = Math.sin(this.tailWag) * 3;
      ctx.save();
      ctx.translate(-15, 2);
      ctx.rotate(wag * 0.05);

      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 1.5;

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

      // 2. Head Crest Antenna
      ctx.save();
      ctx.fillStyle = '#00f2fe';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(-2, -15, 3.5, 6, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Main Glowing Cyber Bird Body
      ctx.save();
      const bodyGrad = ctx.createRadialGradient(-3, -4, 3, 1, 2, 18);
      bodyGrad.addColorStop(0, '#fff466');
      bodyGrad.addColorStop(0.55, '#ffbb00');
      bodyGrad.addColorStop(0.9, '#ff007f');
      bodyGrad.addColorStop(1, '#9d4edd');

      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#00f2fe';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 13.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Holographic Belly Plate
      ctx.fillStyle = 'rgba(0, 242, 254, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-2, 4.5, 11, 7.5, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4. Layered Animated Wing
      const wingFlap = Math.sin(this.wingAngle) * 7;
      ctx.save();
      ctx.translate(-5, 0);
      ctx.rotate(wingFlap * 0.08);

      const wingGrad = ctx.createLinearGradient(-10, -6, 6, 8);
      wingGrad.addColorStop(0, '#ffffff');
      wingGrad.addColorStop(0.4, '#00f2fe');
      wingGrad.addColorStop(1, '#ff007f');

      ctx.fillStyle = wingGrad;
      ctx.strokeStyle = '#ffe600';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.ellipse(-4, -1 + wingFlap * 0.35, 10, 7.2, -0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 5. Cyber Visor / Glowing Scanner Eye
      ctx.save();
      ctx.fillStyle = '#0a0d1e';
      ctx.strokeStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(7.5, -5, 7.5, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Visor Scanner Beam (Moving laser glint)
      const scanX = 7.5 + Math.sin(globalFrame * 0.15) * 3;
      ctx.fillStyle = '#00f2fe';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(scanX, -5, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Glint dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(scanX + 1, -6.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Night Forward Searchlight Beam
      if (currentCycleNightRatio > 0.15) {
        ctx.save();
        const beamAlpha = currentCycleNightRatio * 0.35;
        const beamGrad = ctx.createRadialGradient(10, -5, 2, 75, -5, 65);
        beamGrad.addColorStop(0, `rgba(0, 242, 254, ${beamAlpha})`);
        beamGrad.addColorStop(0.5, `rgba(0, 242, 254, ${beamAlpha * 0.4})`);
        beamGrad.addColorStop(1, 'rgba(0, 242, 254, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(10, -7);
        ctx.lineTo(80, -26);
        ctx.lineTo(80, 16);
        ctx.lineTo(10, -3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 6. Glowing Beak
      ctx.save();
      const beakGrad = ctx.createLinearGradient(11, 0, 22, 3);
      beakGrad.addColorStop(0, '#ffe600');
      beakGrad.addColorStop(1, '#ff5a17');

      ctx.fillStyle = beakGrad;
      ctx.strokeStyle = '#ff007f';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(11, -1.5);
      ctx.lineTo(22, 2);
      ctx.lineTo(12, 6.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

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
        color: Math.random() > 0.5 ? '#00f2fe' : '#ff007f',
        alpha: 1,
        life: 0.024
      });
    }
  }

  function createNeonPuff(x, y) {
    particles.push({
      type: 'puff',
      x: x - 14,
      y: y + 4,
      vx: -GAME_SPEED * 0.7,
      vy: 0.3,
      rot: 0,
      rotSpd: 0,
      size: 5,
      maxSize: 18,
      alpha: 0.75,
      life: 0.038
    });
  }

  function createScoreSparkles(x, y) {
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14 + (Math.random() - 0.5) * 0.3;
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
        color: Math.random() > 0.5 ? '#00f2fe' : '#ffe600',
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
      else if (p.type === 'puff') p.size += (p.maxSize - p.size) * 0.12;
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
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'puff') {
        ctx.fillStyle = 'rgba(0, 242, 254, 0.6)';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sparkle') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
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
      ctx.fillStyle = '#00f2fe';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 12;
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

  // --- Neon UI HUD & Menus ---
  function drawScoreHUD() {
    if (currentState !== STATE.PLAYING && currentState !== STATE.DYING) return;

    ctx.save();
    ctx.font = '900 42px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const text = score.toString();
    const x = V_WIDTH / 2;
    const y = 56;

    // Outer neon glow
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);

    // Inner bright white
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawStartScreen() {
    ctx.save();
    ctx.textAlign = 'center';

    const titleY = 162 + Math.sin(globalFrame * 0.05) * 5;

    // Glowing Synthwave Logo: "FLAPPY BIRD"
    ctx.font = '900 38px "Fredoka", sans-serif';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeText('FLAPPY BIRD', V_WIDTH / 2, titleY);

    const titleGrad = ctx.createLinearGradient(0, titleY - 24, 0, titleY + 14);
    titleGrad.addColorStop(0, '#ffe600');
    titleGrad.addColorStop(0.5, '#ff007f');
    titleGrad.addColorStop(1, '#9d4edd');
    ctx.fillStyle = titleGrad;
    ctx.fillText('FLAPPY BIRD', V_WIDTH / 2, titleY);

    // Tap Prompt Card with Neon Frame
    const promptY = 375;
    ctx.fillStyle = 'rgba(7, 9, 22, 0.75)';
    ctx.beginPath();
    roundRect(ctx, 36, promptY - 26, V_WIDTH - 72, 115, 22);
    ctx.fill();

    ctx.strokeStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Pulse dot
    const tapOffset = Math.sin(globalFrame * 0.11) * 5;
    drawTapIcon(V_WIDTH / 2, promptY + 10 + tapOffset);

    ctx.font = '700 17px "Fredoka", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TAP OR PRESS SPACE', V_WIDTH / 2, promptY + 52);

    ctx.font = '500 12.5px "Fredoka", sans-serif';
    ctx.fillStyle = '#00f2fe';
    ctx.fillText('Press T: Day/Night • Press S: Seasons', V_WIDTH / 2, promptY + 74);

    ctx.restore();
  }

  function drawTapIcon(cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    const pulse = (globalFrame % 45) / 45;
    ctx.strokeStyle = `rgba(0, 242, 254, ${0.9 - pulse * 0.9})`;
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 11 + pulse * 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff007f';
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

    // Dark backdrop overlay
    ctx.fillStyle = `rgba(5, 7, 15, ${0.65 * ease})`;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // "GAME OVER" Ribbon Header
    ctx.font = '900 38px "Fredoka", sans-serif';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeText('GAME OVER', V_WIDTH / 2, modalY);

    const goGrad = ctx.createLinearGradient(0, modalY - 22, 0, modalY + 14);
    goGrad.addColorStop(0, '#ff007f');
    goGrad.addColorStop(1, '#9d4edd');
    ctx.fillStyle = goGrad;
    ctx.fillText('GAME OVER', V_WIDTH / 2, modalY);

    // Scorecard Body
    const cardX = 32;
    const cardY = modalY + 32;
    const cardW = V_WIDTH - 64;
    const cardH = 184;

    // Scorecard cyber panel
    ctx.fillStyle = 'rgba(12, 16, 34, 0.88)';
    roundRect(ctx, cardX, cardY, cardW, cardH, 22);
    ctx.fill();

    ctx.strokeStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    drawMedal(cardX + 50, cardY + 96, score);

    ctx.textAlign = 'right';

    ctx.font = '700 12px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 8;
    ctx.fillText('SCORE', cardX + cardW - 22, cardY + 46);

    ctx.font = '800 28px "Fredoka", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillText(score.toString(), cardX + cardW - 22, cardY + 82);

    ctx.font = '700 12px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 8;
    ctx.fillText('BEST', cardX + cardW - 22, cardY + 124);

    ctx.font = '800 28px "Fredoka", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillText(highScore.toString(), cardX + cardW - 22, cardY + 160);

    if (isNewHighScore && score > 0) {
      ctx.save();
      ctx.translate(cardX + cardW - 96, cardY + 106);
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 10;
      roundRect(ctx, 0, 0, 42, 17, 5);
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
      colorA = '#00f2fe';
      colorB = '#91a4b5';
      label = 'P';
    } else if (finalScore >= 20) {
      tier = 'GOLD';
      colorA = '#ffe600';
      colorB = '#c79100';
      label = 'G';
    } else if (finalScore >= 10) {
      tier = 'SILVER';
      colorA = '#e0f7fa';
      colorB = '#78909c';
      label = 'S';
    } else if (finalScore >= 4) {
      tier = 'BRONZE';
      colorA = '#ff772e';
      colorB = '#a04000';
      label = 'B';
    }

    ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 33, 0, Math.PI * 2);
    ctx.stroke();

    if (!tier) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      return;
    }

    // Glowing Cyber Disc
    const grad = ctx.createRadialGradient(cx - 8, cy - 8, 3, cx, cy, 29);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, colorA);
    grad.addColorStop(1, colorB);

    ctx.fillStyle = grad;
    ctx.shadowColor = colorA;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '900 19px "Fredoka", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
  }

  function drawRestartButton(btn) {
    ctx.save();
    const bGrad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
    bGrad.addColorStop(0, '#00f2fe');
    bGrad.addColorStop(1, '#0072ff');

    ctx.fillStyle = bGrad;
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 16;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 27);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = '700 20px "Fredoka", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
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

  // --- Input Handlers ---
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

  // --- Interactive World & Day/Night Controls ---
  function toggleCycle() {
    currentCycleModeIndex = (currentCycleModeIndex + 1) % CYCLE_MODES.length;
    const mode = CYCLE_MODES[currentCycleModeIndex];
    if (mode === 'AUTO') {
      sound.playTone(620, 0.08, 'triangle');
      srAnnouncements.textContent = 'Day/Night Cycle set to Auto';
    } else {
      sound.playTone(740, 0.08, 'sine');
      srAnnouncements.textContent = `Time of Day set to: ${mode}`;
    }
  }

  function toggleSeason() {
    currentSeasonIndex = (currentSeasonIndex + 1) % SEASONS.length;
    updateSeasonBadgeUI();
    sound.playTone(520, 0.09, 'triangle');
    srAnnouncements.textContent = `World changed to: ${SEASONS[currentSeasonIndex].name}`;
  }

  function updateSeasonBadgeUI() {
    if (seasonIcon && seasonText) {
      seasonIcon.textContent = SEASONS[currentSeasonIndex].icon;
      seasonText.textContent = SEASONS[currentSeasonIndex].name;
      seasonText.style.color = SEASONS[currentSeasonIndex].color;
    }
  }
  updateSeasonBadgeUI();

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

    // 1. Dynamic Day & Night Cycle Sky
    const cycle = getCycleState();
    drawSky(cycle);

    // 2. Parallax Atmospheric Clouds Moving Backward
    updateClouds();
    drawClouds(cycle);

    // 3. Parallax Mountains & Landmark Scenery Moving Backward
    drawMovingPlaces(cycle);

    // 4. Seasonal & Weather Particles Moving Backward
    updateSeasonalParticles(currentSeasonIndex);
    drawSeasonalParticles(cycle);

    // 5. Pipes
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
            cycleProgress = (cycleProgress + 0.016) % 1.0;
          }
          createScoreSparkles(bird.x + 10, bird.y);
          sound.playScore();
          srAnnouncements.textContent = `Score: ${score}`;
        }

        if (p.x + p.w < -30) pipes.splice(i, 1);
      }
    }
    pipes.forEach(p => p.draw());

    // 5. Synthwave Ground
    drawGround();

    // 6. Glowing Neon Bird
    bird.update();
    bird.draw();

    // 7. Collision Detection
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

    // 8. Particles & Popups
    updateParticles();
    drawParticles();

    // 9. UI Screens
    if (currentState === STATE.READY) drawStartScreen();
    else if (currentState === STATE.PLAYING || currentState === STATE.DYING) drawScoreHUD();
    else if (currentState === STATE.GAMEOVER) drawGameOverScreen();

    // 10. Hit Flash
    if (flashWhiteAlpha > 0) {
      ctx.fillStyle = `rgba(255, 0, 127, ${flashWhiteAlpha * 0.7})`;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
      flashWhiteAlpha = Math.max(0, flashWhiteAlpha - 0.08);
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

})();
