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

  const seasonIcon = document.getElementById('season-icon');
  const seasonText = document.getElementById('season-text');
  const cycleText = document.getElementById('cycle-text');

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
  let cityScrollOffset = 0;
  let mountainScrollOffset = 0;

  // --- Day & Night Cycles & Seasons Engine ---
  const SEASONS = [
    { name: 'SPRING', icon: '🌸', color: '#ff66c4', accent: '#00f2fe' },
    { name: 'SUMMER', icon: '🌴', color: '#00f2fe', accent: '#ff007f' },
    { name: 'AUTUMN', icon: '🍁', color: '#ff772e', accent: '#ffe600' },
    { name: 'WINTER', icon: '❄️', color: '#68d8d6', accent: '#a18cd1' }
  ];

  const CYCLES = [
    { name: 'DAY', skyTop: [12, 45, 96], skyMid: [16, 92, 142], skyBot: [32, 172, 192], sunY: 100, sunAlpha: 1 },
    { name: 'SUNSET', skyTop: [42, 12, 68], skyMid: [138, 28, 92], skyBot: [248, 112, 48], sunY: 200, sunAlpha: 0.95 },
    { name: 'NIGHT', skyTop: [5, 7, 18], skyMid: [14, 18, 44], skyBot: [26, 32, 74], sunY: 90, sunAlpha: 0 },
    { name: 'DAWN', skyTop: [22, 16, 52], skyMid: [90, 42, 98], skyBot: [52, 142, 168], sunY: 210, sunAlpha: 0.8 }
  ];

  // Each full cycle lasts 2400 frames (~40s), smoothly interpolating
  const CYCLE_PERIOD = 2400;
  let currentSeasonIndex = 0;

  // Background stars for Night/Dawn
  const stars = [];
  for (let i = 0; i < 45; i++) {
    stars.push({
      x: Math.random() * V_WIDTH,
      y: Math.random() * (GROUND_Y - 80),
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
    } else if (Math.random() < 0.005) {
      shootingStar.x = Math.random() * V_WIDTH * 0.7;
      shootingStar.y = Math.random() * 120 + 20;
      shootingStar.vx = Math.random() * 4 + 5;
      shootingStar.vy = Math.random() * 2 + 2;
      shootingStar.life = 25;
    }
  }

  // Seasonal floating weather/particles
  const seasonalParticles = [];
  function updateSeasonalParticles(seasonIdx) {
    if (seasonalParticles.length < 24 && Math.random() < 0.25) {
      seasonalParticles.push({
        x: V_WIDTH + 10,
        y: Math.random() * (GROUND_Y - 20),
        vx: -(Math.random() * 1.2 + 0.8),
        vy: Math.sin(Math.random() * 10) * 0.6 + (seasonIdx === 3 ? 0.8 : 0.2), // snowflakes fall down
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.08,
        size: Math.random() * 4 + 3,
        season: seasonIdx,
        alpha: Math.random() * 0.5 + 0.5
      });
    }

    for (let i = seasonalParticles.length - 1; i >= 0; i--) {
      const sp = seasonalParticles[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.rot += sp.rotSpd;
      if (sp.x < -20 || sp.y > GROUND_Y) {
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
        ctx.fillStyle = '#ff66c4';
        ctx.shadowColor = '#ff66c4';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, sp.size * 1.3, sp.size * 0.7, 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (sp.season === 1) {
        // Summer: Neon Cyan Mote / Glint
        ctx.fillStyle = '#00f2fe';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, sp.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (sp.season === 2) {
        // Autumn: Glowing Orange Maple Leaf / Ember
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
        // Winter: Glowing Neon Snowflake
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
    const cycleProgress = (globalFrame % CYCLE_PERIOD) / CYCLE_PERIOD;
    const stageFloat = cycleProgress * 4;
    const stageIndex = Math.floor(stageFloat);
    const stageLerp = stageFloat - stageIndex;

    const fromCycle = CYCLES[stageIndex % 4];
    const toCycle = CYCLES[(stageIndex + 1) % 4];

    function lerpColor(c1, c2, t) {
      return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t)
      ];
    }

    const skyTop = lerpColor(fromCycle.skyTop, toCycle.skyTop, stageLerp);
    const skyMid = lerpColor(fromCycle.skyMid, toCycle.skyMid, stageLerp);
    const skyBot = lerpColor(fromCycle.skyBot, toCycle.skyBot, stageLerp);
    const sunY = fromCycle.sunY + (toCycle.sunY - fromCycle.sunY) * stageLerp;
    const sunAlpha = fromCycle.sunAlpha + (toCycle.sunAlpha - fromCycle.sunAlpha) * stageLerp;

    // Season index shifts every full day-night cycle or every 15 points
    const calculatedSeason = Math.floor(globalFrame / (CYCLE_PERIOD * 1.5) + score / 8) % 4;
    if (calculatedSeason !== currentSeasonIndex) {
      currentSeasonIndex = calculatedSeason;
      seasonIcon.textContent = SEASONS[currentSeasonIndex].icon;
      seasonText.textContent = SEASONS[currentSeasonIndex].name;
      seasonText.style.color = SEASONS[currentSeasonIndex].color;
    }

    cycleText.textContent = fromCycle.name;

    return {
      skyTop: `rgb(${skyTop[0]},${skyTop[1]},${skyTop[2]})`,
      skyMid: `rgb(${skyMid[0]},${skyMid[1]},${skyMid[2]})`,
      skyBot: `rgb(${skyBot[0]},${skyBot[1]},${skyBot[2]})`,
      sunY,
      sunAlpha,
      isNight: fromCycle.name === 'NIGHT' || toCycle.name === 'NIGHT',
      nightRatio: stageIndex === 2 ? 1 - Math.abs(stageLerp - 0.5) * 2 : (stageIndex === 1 ? stageLerp : (stageIndex === 3 ? 1 - stageLerp : 0))
    };
  }

  function drawSky(cycle) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    skyGrad.addColorStop(0, cycle.skyTop);
    skyGrad.addColorStop(0.55, cycle.skyMid);
    skyGrad.addColorStop(1, cycle.skyBot);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Night stars & shooting star
    if (cycle.nightRatio > 0.05) {
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

    // Celestial Body: Sun or Neon Moon
    if (cycle.sunAlpha > 0.1) {
      // Synthwave / Neon Sun
      const sunX = V_WIDTH * 0.72;
      const sunY = cycle.sunY;
      ctx.save();
      ctx.globalAlpha = cycle.sunAlpha;

      // Outer Sun Glow
      const haloGrad = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 70);
      haloGrad.addColorStop(0, 'rgba(255, 0, 127, 0.6)');
      haloGrad.addColorStop(0.5, 'rgba(255, 230, 0, 0.25)');
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
      ctx.fill();

      // Segmented Synthwave Sun (stripes)
      const sunR = 30;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.clip();

      const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
      sunGrad.addColorStop(0, '#ffe600');
      sunGrad.addColorStop(0.5, '#ff007f');
      sunGrad.addColorStop(1, '#9d4edd');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

      // Horizontal retro cutout stripes
      ctx.fillStyle = cycle.skyMid;
      for (let sy = sunY - 4; sy < sunY + sunR; sy += 7) {
        ctx.fillRect(sunX - sunR, sy, sunR * 2, 2.5);
      }
      ctx.restore();
      ctx.restore();
    } else if (cycle.nightRatio > 0.4) {
      // Neon Crescent Moon
      const moonX = V_WIDTH * 0.76;
      const moonY = 88;
      ctx.save();
      ctx.globalAlpha = cycle.nightRatio;
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 18;

      ctx.fillStyle = '#00f2fe';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
      ctx.fill();

      // Mask for crescent
      ctx.fillStyle = cycle.skyTop;
      ctx.beginPath();
      ctx.arc(moonX + 9, moonY - 5, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Winter: Aurora Borealis Curtains
    if (currentSeasonIndex === 3) {
      ctx.save();
      const wave = Math.sin(globalFrame * 0.02) * 20;
      const wave2 = Math.cos(globalFrame * 0.025) * 25;
      const aurGrad = ctx.createLinearGradient(0, 40, 0, 220);
      aurGrad.addColorStop(0, 'rgba(0, 242, 254, 0)');
      aurGrad.addColorStop(0.5, 'rgba(57, 255, 20, 0.28)');
      aurGrad.addColorStop(0.8, 'rgba(157, 78, 221, 0.22)');
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

  // --- Moving Places & Parallax Landscapes ---
  function drawMovingPlaces() {
    if (currentState === STATE.PLAYING || currentState === STATE.READY) {
      mountainScrollOffset = (mountainScrollOffset + GAME_SPEED * 0.18) % 180;
      cityScrollOffset = (cityScrollOffset + GAME_SPEED * 0.35) % 180;
    }

    // LAYER 1: Distant Neon Mountain / Crystal Ridge
    ctx.save();
    const mBaseY = GROUND_Y - 45;

    // Distant Neon Wireframe Peaks
    ctx.strokeStyle = currentSeasonIndex === 3 ? 'rgba(0, 242, 254, 0.35)' : 'rgba(157, 78, 221, 0.25)';
    ctx.fillStyle = currentSeasonIndex === 3 ? 'rgba(8, 24, 48, 0.85)' : 'rgba(15, 12, 34, 0.85)';
    ctx.lineWidth = 1.8;

    for (let x = -mountainScrollOffset - 180; x < V_WIDTH + 180; x += 140) {
      ctx.beginPath();
      ctx.moveTo(x, mBaseY);
      ctx.lineTo(x + 70, mBaseY - 85);
      ctx.lineTo(x + 140, mBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Peak Neon Highlight
      ctx.strokeStyle = currentSeasonIndex === 0 ? '#ff66c4' : (currentSeasonIndex === 3 ? '#00f2fe' : '#ffe600');
      ctx.beginPath();
      ctx.moveTo(x + 55, mBaseY - 65);
      ctx.lineTo(x + 70, mBaseY - 85);
      ctx.lineTo(x + 85, mBaseY - 65);
      ctx.stroke();
      ctx.strokeStyle = currentSeasonIndex === 3 ? 'rgba(0, 242, 254, 0.35)' : 'rgba(157, 78, 221, 0.25)';
    }
    ctx.restore();

    // LAYER 2: Seasonal Landmark Scenery
    if (currentSeasonIndex === 0) {
      // SPRING: Neon Sakura Grove with Japanese Pagodas & Torii Gates
      drawSakuraPagodas();
    } else if (currentSeasonIndex === 1) {
      // SUMMER: Cyber Metropolis with Highway Traffic & Holograms
      drawCyberMetropolis();
    } else if (currentSeasonIndex === 2) {
      // AUTUMN: Floating Ancient Runic Obelisks
      drawAutumnObelisks();
    } else {
      // WINTER: Glacial Ice Spire Citadel
      drawWinterIcePeaks();
    }
  }

  function drawSakuraPagodas() {
    ctx.save();
    const baseY = GROUND_Y - 15;
    for (let x = -cityScrollOffset - 80; x < V_WIDTH + 80; x += 160) {
      // Floating Pagoda Silhouette
      ctx.fillStyle = '#1c0f2b';
      ctx.strokeStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;

      // Tier 1 Roof
      ctx.beginPath();
      ctx.moveTo(x + 10, baseY - 40);
      ctx.lineTo(x + 50, baseY - 55);
      ctx.lineTo(x + 90, baseY - 40);
      ctx.lineTo(x + 75, baseY - 45);
      ctx.lineTo(x + 25, baseY - 45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tier 2 Roof
      ctx.beginPath();
      ctx.moveTo(x + 25, baseY - 60);
      ctx.lineTo(x + 50, baseY - 74);
      ctx.lineTo(x + 75, baseY - 60);
      ctx.lineTo(x + 65, baseY - 64);
      ctx.lineTo(x + 35, baseY - 64);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pagoda Finial Spire
      ctx.beginPath();
      ctx.moveTo(x + 50, baseY - 74);
      ctx.lineTo(x + 50, baseY - 88);
      ctx.stroke();

      // Glowing Sakura Blossom Silhouetted Tree
      ctx.fillStyle = '#ff66c4';
      ctx.shadowColor = '#ff66c4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x + 125, baseY - 28, 16, 0, Math.PI * 2);
      ctx.arc(x + 138, baseY - 36, 14, 0, Math.PI * 2);
      ctx.arc(x + 115, baseY - 38, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCyberMetropolis() {
    ctx.save();
    const baseY = GROUND_Y - 8;
    const buildings = [
      { x: -10, w: 32, h: 70, glow: '#00f2fe' },
      { x: 26, w: 28, h: 95, glow: '#ff007f' },
      { x: 58, w: 42, h: 60, glow: '#39ff14' },
      { x: 104, w: 30, h: 88, glow: '#ffe600' },
      { x: 138, w: 46, h: 68, glow: '#00f2fe' },
      { x: 188, w: 32, h: 106, glow: '#ff007f' },
      { x: 224, w: 38, h: 75, glow: '#00f2fe' },
      { x: 266, w: 26, h: 90, glow: '#ffe600' },
      { x: 296, w: 40, h: 62, glow: '#ff007f' },
      { x: 340, w: 36, h: 98, glow: '#00f2fe' }
    ];

    buildings.forEach(b => {
      const bx = b.x - cityScrollOffset * 0.6;
      ctx.fillStyle = '#0a0d1e';
      ctx.fillRect(bx, baseY - b.h, b.w, b.h);

      // Neon Top Border Antenna
      ctx.strokeStyle = b.glow;
      ctx.shadowColor = b.glow;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, baseY - b.h, b.w, b.h);

      // Antenna tip beacon
      ctx.fillStyle = b.glow;
      ctx.beginPath();
      ctx.arc(bx + b.w / 2, baseY - b.h - 5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Cyber Matrix Window grids
      for (let wy = baseY - b.h + 8; wy < baseY - 10; wy += 14) {
        ctx.fillRect(bx + 5, wy, 4, 5);
        if (b.w > 28) ctx.fillRect(bx + b.w - 9, wy, 4, 5);
      }
    });

    // Elevated Highway with Speeding Light-Streak Traffic
    const hwyY = GROUND_Y - 14;
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hwyY);
    ctx.lineTo(V_WIDTH, hwyY);
    ctx.stroke();

    // Red and Cyan Speeding Vehicle Light Streaks
    const trafficOff1 = (globalFrame * 4.5) % (V_WIDTH + 80);
    const trafficOff2 = (globalFrame * 3.8 + 140) % (V_WIDTH + 80);

    ctx.strokeStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(V_WIDTH - trafficOff1, hwyY - 2);
    ctx.lineTo(V_WIDTH - trafficOff1 + 22, hwyY - 2);
    ctx.stroke();

    ctx.strokeStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.beginPath();
    ctx.moveTo(trafficOff2 - 80, hwyY + 1.5);
    ctx.lineTo(trafficOff2 - 58, hwyY + 1.5);
    ctx.stroke();

    ctx.restore();
  }

  function drawAutumnObelisks() {
    ctx.save();
    const baseY = GROUND_Y - 20;
    for (let x = -cityScrollOffset - 60; x < V_WIDTH + 80; x += 130) {
      // Floating Obelisk with Glowing Glyphs
      const floatY = Math.sin(globalFrame * 0.05 + x) * 6;
      const ox = x + 30;
      const oy = baseY - 50 + floatY;

      ctx.fillStyle = '#18121f';
      ctx.strokeStyle = '#ff772e';
      ctx.shadowColor = '#ff772e';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.8;

      // Hexagonal / Diamond Obelisk
      ctx.beginPath();
      ctx.moveTo(ox, oy - 40);
      ctx.lineTo(ox + 16, oy);
      ctx.lineTo(ox + 12, oy + 45);
      ctx.lineTo(ox - 12, oy + 45);
      ctx.lineTo(ox - 16, oy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing Center Rune Glyph
      ctx.fillStyle = '#ffe600';
      ctx.shadowColor = '#ffe600';
      ctx.beginPath();
      ctx.arc(ox, oy + 6, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWinterIcePeaks() {
    ctx.save();
    const baseY = GROUND_Y - 12;
    for (let x = -cityScrollOffset - 70; x < V_WIDTH + 70; x += 110) {
      // Sharp Glacial Crystal Ice Spires
      ctx.fillStyle = '#0a1a2e';
      ctx.strokeStyle = '#00f2fe';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + 18, baseY - 55);
      ctx.lineTo(x + 34, baseY - 82);
      ctx.lineTo(x + 50, baseY - 48);
      ctx.lineTo(x + 65, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crystal facet line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.moveTo(x + 34, baseY - 82);
      ctx.lineTo(x + 34, baseY);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Synthwave Neon Ground / Cyber Grid ---
  function drawGround() {
    if (currentState === STATE.PLAYING || currentState === STATE.READY) {
      groundScrollOffset = (groundScrollOffset + GAME_SPEED) % 24;
    }

    // Top Neon Laser Line
    const curSeason = SEASONS[currentSeasonIndex];
    ctx.save();
    ctx.strokeStyle = curSeason.color;
    ctx.shadowColor = curSeason.color;
    ctx.shadowBlur = 12;
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

    // Scrolling Neon Perspective Grid Lines
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.22)';
    ctx.lineWidth = 1.2;

    // Horizontal grid perspective rungs
    const rungs = [GROUND_Y + 14, GROUND_Y + 32, GROUND_Y + 54, GROUND_Y + 80, GROUND_Y + 104];
    rungs.forEach(ry => {
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(V_WIDTH, ry);
      ctx.stroke();
    });

    // Scrolling diagonal perspective lines
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
    ctx.fillText('Neon Worlds • Day & Night Cycles', V_WIDTH / 2, promptY + 74);

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

  window.addEventListener('pointerdown', (e) => {
    if (e.target === canvas || e.target.id === 'game-container') {
      handleAction(e);
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      handleAction(e);
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

    // 2. Moving Places & Parallax Landscapes
    drawMovingPlaces();

    // 3. Seasonal Weather Particles (Sakura petals, cyber motes, leaves, snowflakes)
    updateSeasonalParticles(currentSeasonIndex);
    drawSeasonalParticles();

    // 4. Pipes
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
