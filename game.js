/**
 * Flappy Bird - Visually Stylized & Smooth Paced Edition
 * Features:
 * - Calibrated relaxed game speed & floaty jump physics
 * - Multi-layer parallax scenery (Glow Sun, Snow-Capped Mountains, City Silhouettes, Rolling Hills)
 * - Highly detailed stylized bird (Top crest feather, wagging tail, layered wing, eye shines, blush)
 * - Deluxe 3D shaded pipes with brass trim rings and hanging ivy accents
 * - Floating score text popups (+1), feather wind puffs, and star sparkle bursts
 * - Web Audio API synthesized retro sound effects
 */

(() => {
  'use strict';

  // --- Canvas & High-DPI Scaling ---
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const bestScoreBadge = document.getElementById('best-score-badge');
  const soundBtn = document.getElementById('sound-btn');
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');
  const srAnnouncements = document.getElementById('sr-announcements');

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
      osc.frequency.exponentialRampToValueAtTime(740, t + 0.12);

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
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1320, t + 0.09);

      gain.gain.setValueAtTime(0.25, t);
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
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);

      gain.gain.setValueAtTime(0.32, t);
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
      osc.frequency.exponentialRampToValueAtTime(130, t + 0.38);

      gain.gain.setValueAtTime(0.24, t);
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

  // --- Game State & Calibrated Speed Tuning ---
  const STATE = {
    READY: 0,
    PLAYING: 1,
    DYING: 2,
    GAMEOVER: 3
  };

  let currentState = STATE.READY;
  let score = 0;
  let isNewHighScore = false;
  let gameOverTimer = 0;
  let screenShakeTimer = 0;
  let flashWhiteAlpha = 0;
  let globalFrame = 0;

  // Calibrated Smooth Speed Tuning (30% more relaxed and fluid than original)
  const GAME_SPEED = 1.62;
  const GROUND_HEIGHT = 108;
  const GROUND_Y = V_HEIGHT - GROUND_HEIGHT;
  let groundScrollOffset = 0;
  let hillScrollOffset = 0;

  // --- Particle Systems & Popups ---
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
        color: Math.random() > 0.4 ? '#fdd835' : '#ffffff',
        alpha: 1,
        life: 0.022 + Math.random() * 0.018
      });
    }
  }

  function createFlapPuff(x, y) {
    // Gentle white puff circle behind bird when flapping
    particles.push({
      type: 'puff',
      x: x - 14,
      y: y + 4,
      vx: -GAME_SPEED * 0.6,
      vy: 0.4,
      rot: 0,
      rotSpd: 0,
      size: 6,
      maxSize: 18,
      alpha: 0.6,
      life: 0.035
    });
  }

  function createScoreSparkles(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.3;
      const spd = Math.random() * 2.8 + 1.2;
      particles.push({
        type: 'sparkle',
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        rot: Math.random() * Math.PI,
        rotSpd: 0.15,
        size: Math.random() * 4 + 3,
        color: Math.random() > 0.3 ? '#fff566' : '#ffffff',
        alpha: 1,
        life: 0.032
      });
    }

    // Add floating "+1" text popup
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
      if (p.type === 'feather') {
        p.vy += 0.08;
      } else if (p.type === 'puff') {
        p.size += (p.maxSize - p.size) * 0.12;
      }
      p.rot += p.rotSpd;
      p.alpha -= p.life;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }

    // Update score popups
    for (let i = scorePopups.length - 1; i >= 0; i--) {
      const sp = scorePopups[i];
      sp.y += sp.vy;
      sp.vy *= 0.94;
      sp.scale = Math.max(1, sp.scale - 0.03);
      sp.alpha -= 0.024;
      if (sp.alpha <= 0) {
        scorePopups.splice(i, 1);
      }
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
      } else if (p.type === 'puff') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sparkle') {
        ctx.fillStyle = p.color;
        // 4-point star
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

    // Draw floating score popups
    scorePopups.forEach(sp => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.alpha);
      ctx.translate(sp.x, sp.y);
      ctx.scale(sp.scale, sp.scale);
      ctx.font = '900 24px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(sp.text, 0, 0);
      // Bright gold inner
      ctx.fillStyle = '#ffe438';
      ctx.fillText(sp.text, 0, 0);
      ctx.restore();
    });
  }

  // --- Stylized Environment & Multi-Layer Parallax ---
  const clouds = [
    { x: 30, y: 70, s: 0.9, spd: 0.18, a: 0.75 },
    { x: 170, y: 110, s: 1.15, spd: 0.24, a: 0.85 },
    { x: 310, y: 50, s: 0.75, spd: 0.14, a: 0.65 }
  ];

  function drawSkyAndSun() {
    // Rich Stylized Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    skyGrad.addColorStop(0, '#2fa6ce');
    skyGrad.addColorStop(0.45, '#56c8de');
    skyGrad.addColorStop(0.85, '#a4ebef');
    skyGrad.addColorStop(1, '#daf6f5');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Glowing Sun
    const sunX = V_WIDTH * 0.75;
    const sunY = 90;

    // Sun Radial Glow Halo
    const haloGrad = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 65);
    haloGrad.addColorStop(0, 'rgba(255, 250, 210, 0.55)');
    haloGrad.addColorStop(0.5, 'rgba(255, 235, 170, 0.2)');
    haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 65, 0, Math.PI * 2);
    ctx.fill();

    // Solid Sun Disc
    ctx.fillStyle = '#fffdf0';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawClouds() {
    clouds.forEach(c => {
      if (currentState === STATE.PLAYING || currentState === STATE.READY) {
        c.x -= c.spd;
        if (c.x < -90) c.x = V_WIDTH + 80;
      }

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.s, c.s);
      ctx.fillStyle = `rgba(255, 255, 255, ${c.a})`;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.arc(22, -10, 20, 0, Math.PI * 2);
      ctx.arc(44, 0, 22, 0, Math.PI * 2);
      ctx.arc(22, 8, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawMountains() {
    // Distant Majestic Mountain Range with Snow Caps
    ctx.save();
    const baseY = GROUND_Y - 45;

    // Mountain 1 (Left)
    drawSingleMountain(10, baseY, 130, 95, '#7bbcc4', '#66aab3');
    // Mountain 2 (Right)
    drawSingleMountain(180, baseY, 150, 115, '#74b5bd', '#5fa2ab');
    // Mountain 3 (Center distant)
    drawSingleMountain(110, baseY, 110, 80, '#8cc7ce', '#7bbcc4');

    ctx.restore();
  }

  function drawSingleMountain(cx, baseY, width, height, lightColor, shadowColor) {
    const leftX = cx - width / 2;
    const rightX = cx + width / 2;
    const peakX = cx;
    const peakY = baseY - height;

    // Left side (light)
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.moveTo(leftX, baseY);
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(peakX, baseY);
    ctx.closePath();
    ctx.fill();

    // Right side (shadow)
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(peakX, peakY);
    ctx.lineTo(rightX, baseY);
    ctx.lineTo(peakX, baseY);
    ctx.closePath();
    ctx.fill();

    // Snow Cap
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(peakX, peakY);
    ctx.lineTo(peakX - width * 0.16, peakY + height * 0.28);
    ctx.lineTo(peakX - width * 0.05, peakY + height * 0.24);
    ctx.lineTo(peakX, peakY + height * 0.29);
    ctx.lineTo(peakX + width * 0.08, peakY + height * 0.22);
    ctx.lineTo(peakX + width * 0.16, peakY + height * 0.28);
    ctx.closePath();
    ctx.fill();
  }

  function drawCityscape() {
    // Stylized Pastel City Skyline
    ctx.fillStyle = '#8bd0c8';
    const baseY = GROUND_Y - 10;
    const skyline = [
      { x: -5, w: 32, h: 58 },
      { x: 27, w: 26, h: 78 },
      { x: 53, w: 38, h: 48 },
      { x: 91, w: 28, h: 72 },
      { x: 119, w: 42, h: 54 },
      { x: 161, w: 32, h: 86 },
      { x: 193, w: 36, h: 62 },
      { x: 229, w: 42, h: 48 },
      { x: 271, w: 26, h: 76 },
      { x: 297, w: 36, h: 60 },
      { x: 333, w: 35, h: 82 }
    ];

    skyline.forEach(b => {
      ctx.fillRect(b.x, baseY - b.h, b.w, b.h);
      // Soft windows
      ctx.fillStyle = '#bdf1eb';
      for (let wy = baseY - b.h + 8; wy < baseY - 8; wy += 13) {
        ctx.fillRect(b.x + 5, wy, 4, 5);
        if (b.w > 26) ctx.fillRect(b.x + b.w - 9, wy, 4, 5);
      }
      ctx.fillStyle = '#8bd0c8';
    });
  }

  function drawRollingHills() {
    if (currentState === STATE.PLAYING || currentState === STATE.READY) {
      hillScrollOffset = (hillScrollOffset + GAME_SPEED * 0.35) % 80;
    }

    // Lush Mid-ground Rolling Green Hills
    ctx.fillStyle = '#6ec485';
    for (let x = -hillScrollOffset - 80; x < V_WIDTH + 80; x += 75) {
      ctx.beginPath();
      ctx.arc(x + 40, GROUND_Y + 10, 48, Math.PI, 0);
      ctx.fill();
    }

    // Foreground soft bushes with highlights
    ctx.fillStyle = '#55b26d';
    for (let x = -hillScrollOffset - 40; x < V_WIDTH + 40; x += 45) {
      ctx.beginPath();
      ctx.arc(x + 22, GROUND_Y + 4, 25, Math.PI, 0);
      ctx.fill();
    }
  }

  // --- Ground Layer with Foliage Tufts ---
  function drawGround() {
    if (currentState === STATE.PLAYING || currentState === STATE.READY) {
      groundScrollOffset = (groundScrollOffset + GAME_SPEED) % 24;
    }

    // Top lush grass strip
    const grassGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 16);
    grassGrad.addColorStop(0, '#75cc2b');
    grassGrad.addColorStop(1, '#5ca71d');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, GROUND_Y, V_WIDTH, 16);

    // Deep shadow line under grass
    ctx.fillStyle = '#457f13';
    ctx.fillRect(0, GROUND_Y + 14, V_WIDTH, 3);

    // Stratified Earth Body
    const dirtGrad = ctx.createLinearGradient(0, GROUND_Y + 17, 0, V_HEIGHT);
    dirtGrad.addColorStop(0, '#e5d99b');
    dirtGrad.addColorStop(0.3, '#d8cb8a');
    dirtGrad.addColorStop(1, '#b5a563');
    ctx.fillStyle = dirtGrad;
    ctx.fillRect(0, GROUND_Y + 17, V_WIDTH, GROUND_HEIGHT - 17);

    // Scrolling crosshatch dirt diagonal patterns
    ctx.fillStyle = '#c7b86b';
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

    // Tiny decorative pebbles on ground
    ctx.fillStyle = '#a6974e';
    for (let x = -groundScrollOffset; x < V_WIDTH + 30; x += 48) {
      ctx.beginPath();
      ctx.arc(x + 12, GROUND_Y + 36, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 32, GROUND_Y + 68, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Grass blades on top of the rim
    ctx.fillStyle = '#8ce03f';
    for (let x = -groundScrollOffset; x < V_WIDTH + 20; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x + 3, GROUND_Y - 4);
      ctx.lineTo(x + 6, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- Deluxe Stylized Pipes ---
  const pipes = [];
  const PIPE_WIDTH = 62;
  const PIPE_GAP = 152; // Relaxed comfortable gap
  const PIPE_SPAWN_INTERVAL = 145; // Well-spaced obstacles for relaxed rhythm
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

    draw() {
      // Ambient Drop Shadow Behind Pipes onto background
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(this.x + 8, 0, this.w, this.topHeight);
      ctx.fillRect(this.x + 8, this.bottomY, this.w, this.bottomHeight);
      ctx.restore();

      // Top Pipe
      this.drawPipeSection(this.x, 0, this.w, this.topHeight, true);
      // Bottom Pipe
      this.drawPipeSection(this.x, this.bottomY, this.w, this.bottomHeight, false);
    }

    drawPipeSection(x, y, w, h, isTop) {
      const lipHeight = 28;
      const lipOverlap = 5;
      const lipWidth = w + lipOverlap * 2;
      const lipX = x - lipOverlap;
      const lipY = isTop ? y + h - lipHeight : y;
      const shaftY = isTop ? y : y + lipHeight;
      const shaftHeight = Math.max(0, isTop ? h - lipHeight : h - lipHeight);

      // --- Pipe Shaft Cylinder Shading ---
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

      // Vertical glossy specular highlight line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(x + w * 0.32, shaftY, 3, shaftHeight);

      // --- Lip Collar Section ---
      const lipGrad = ctx.createLinearGradient(lipX, 0, lipX + lipWidth, 0);
      lipGrad.addColorStop(0, '#428a21');
      lipGrad.addColorStop(0.2, '#5cb52f');
      lipGrad.addColorStop(0.42, '#b2f458');
      lipGrad.addColorStop(0.72, '#55ab2b');
      lipGrad.addColorStop(1, '#224810');

      ctx.fillStyle = lipGrad;
      ctx.beginPath();
      this.roundRect(ctx, lipX, lipY, lipWidth, lipHeight, 4);
      ctx.fill();

      ctx.strokeStyle = '#18330b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Golden Brass Trim Ring on Pipe Lip
      const brassY = isTop ? lipY + 4 : lipY + lipHeight - 7;
      const brassGrad = ctx.createLinearGradient(lipX, 0, lipX + lipWidth, 0);
      brassGrad.addColorStop(0, '#c68d18');
      brassGrad.addColorStop(0.35, '#ffdc52');
      brassGrad.addColorStop(0.75, '#b97f10');
      brassGrad.addColorStop(1, '#7e5204');
      ctx.fillStyle = brassGrad;
      ctx.fillRect(lipX + 3, brassY, lipWidth - 6, 3.5);

      // Little decorative brass rivets
      ctx.fillStyle = '#ffe985';
      ctx.beginPath();
      ctx.arc(lipX + 10, brassY + 1.8, 1.3, 0, Math.PI * 2);
      ctx.arc(lipX + lipWidth - 10, brassY + 1.8, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Hanging Ivy Leaf Cling on Lips
      ctx.fillStyle = '#2d6816';
      const leafX = isTop ? lipX + 12 : lipX + lipWidth - 18;
      const leafY = isTop ? lipY + lipHeight : lipY;
      ctx.beginPath();
      ctx.ellipse(leafX, leafY + (isTop ? 6 : -4), 4.5, 6.5, isTop ? 0.3 : -0.3, 0, Math.PI * 2);
      ctx.fill();
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

  // --- Stylized Cute Bird Class ---
  class Bird {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = 92;
      this.y = V_HEIGHT * 0.42;
      this.radius = 16;
      this.vy = 0;
      // Floaty, forgiving physics
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
      this.rotation = -0.42; // Upward tilt
      createFlapPuff(this.x, this.y);
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

      // Physics integration
      this.vy += this.gravity;
      if (this.vy > this.maxVelocity) this.vy = this.maxVelocity;
      this.y += this.vy;

      // Realistic angular pitch transition
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

      // --- 1. Tail Feathers ---
      const wag = Math.sin(this.tailWag) * 3;
      ctx.save();
      ctx.translate(-15, 2);
      ctx.rotate(wag * 0.05);
      ctx.fillStyle = '#e5970c';
      ctx.strokeStyle = '#754003';
      ctx.lineWidth = 1.8;

      // 3 overlapping tail feathers
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

      // --- 3. Bird Body ---
      // Soft drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
      ctx.beginPath();
      ctx.ellipse(-2, 4, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main golden gradient body
      const bodyGrad = ctx.createRadialGradient(-3, -4, 3, 1, 2, 18);
      bodyGrad.addColorStop(0, '#fff25c');
      bodyGrad.addColorStop(0.55, '#fdbf18');
      bodyGrad.addColorStop(0.95, '#ea8e05');
      bodyGrad.addColorStop(1, '#c96f00');

      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#633703';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 13.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Peach Cream Belly
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

      // Wing base
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

      // Wing feather lines
      ctx.strokeStyle = '#995906';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(-4, -1 + wingFlap * 0.35, 5, 0.4, 2.2);
      ctx.stroke();
      ctx.restore();

      // --- 5. Expressive Big Eye ---
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

      // Eye Shines (Large and small specular reflection)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(10.8, -6.6, 1.6, 0, Math.PI * 2);
      ctx.arc(8.5, -3.8, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Cute Peach Cheek Blush
      ctx.fillStyle = 'rgba(255, 95, 95, 0.48)';
      ctx.beginPath();
      ctx.arc(4, 3.5, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // --- 6. Bright Orange Beak ---
      const beakGrad = ctx.createLinearGradient(11, 0, 22, 3);
      beakGrad.addColorStop(0, '#ff832b');
      beakGrad.addColorStop(0.7, '#ff5a17');
      beakGrad.addColorStop(1, '#db3804');

      ctx.fillStyle = beakGrad;
      ctx.strokeStyle = '#5a1f01';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(11, -1.5);
      ctx.lineTo(22, 2);
      ctx.lineTo(12, 6.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Beak seam line
      ctx.strokeStyle = '#541700';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(11, 2.2);
      ctx.lineTo(20, 2.2);
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

  // --- HUD & Score Banner ---
  function drawScoreHUD() {
    if (currentState !== STATE.PLAYING && currentState !== STATE.DYING) return;

    ctx.save();
    ctx.font = '800 40px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const text = score.toString();
    const x = V_WIDTH / 2;
    const y = 56;

    // Thick drop shadow outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6.5;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);

    // 3D Extrusion shadow
    ctx.fillStyle = '#0f172a';
    ctx.fillText(text, x, y + 2.5);

    // Inner vibrant white
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawStartScreen() {
    ctx.save();
    ctx.textAlign = 'center';

    const titleY = 162 + Math.sin(globalFrame * 0.05) * 5;

    // Stylized Arcade Logo: "FLAPPY BIRD"
    ctx.font = '900 38px "Fredoka", sans-serif';
    ctx.strokeStyle = '#1b3f0c';
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.strokeText('FLAPPY BIRD', V_WIDTH / 2, titleY);

    // Shadow Layer
    ctx.fillStyle = '#b35d00';
    ctx.fillText('FLAPPY BIRD', V_WIDTH / 2, titleY + 3.5);

    // Golden Gradient Face
    const titleGrad = ctx.createLinearGradient(0, titleY - 24, 0, titleY + 14);
    titleGrad.addColorStop(0, '#fff76a');
    titleGrad.addColorStop(0.45, '#ffc414');
    titleGrad.addColorStop(1, '#f07400');
    ctx.fillStyle = titleGrad;
    ctx.fillText('FLAPPY BIRD', V_WIDTH / 2, titleY);

    // Subtle Logo Star Glint
    const glintProgress = (globalFrame * 0.03) % 2;
    if (glintProgress < 0.6) {
      const gx = V_WIDTH / 2 - 100 + glintProgress * 300;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(gx, titleY - 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glassmorphic Tap Prompt Card
    const promptY = 375;
    ctx.fillStyle = 'rgba(12, 18, 30, 0.52)';
    ctx.beginPath();
    roundRect(ctx, 36, promptY - 26, V_WIDTH - 72, 115, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Animated Tap Ripple Indicator
    const tapOffset = Math.sin(globalFrame * 0.11) * 5;
    drawTapIcon(V_WIDTH / 2, promptY + 10 + tapOffset);

    ctx.font = '700 17px "Fredoka", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TAP OR PRESS SPACE', V_WIDTH / 2, promptY + 52);

    ctx.font = '500 12.5px "Fredoka", sans-serif';
    ctx.fillStyle = '#bfe5f5';
    ctx.fillText('Smooth flight • Dodge the pipes', V_WIDTH / 2, promptY + 74);

    ctx.restore();
  }

  function drawTapIcon(cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    // Glowing Pulse
    const pulse = (globalFrame % 45) / 45;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 - pulse * 0.85})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 11 + pulse * 16, 0, Math.PI * 2);
    ctx.stroke();

    // Finger Dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff7b00';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- Deluxe Game Over Scorecard ---
  const restartButtonRect = {
    x: 75,
    y: 436,
    w: 210,
    h: 54
  };

  function drawGameOverScreen() {
    ctx.save();
    ctx.textAlign = 'center';

    const ease = Math.min(1, gameOverTimer / 24);
    const modalY = 146 + (1 - ease) * 130;

    // Dark backdrop overlay
    ctx.fillStyle = `rgba(9, 14, 25, ${0.5 * ease})`;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // "GAME OVER" Ribbon Header
    ctx.font = '900 38px "Fredoka", sans-serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeText('GAME OVER', V_WIDTH / 2, modalY);

    const goGrad = ctx.createLinearGradient(0, modalY - 22, 0, modalY + 14);
    goGrad.addColorStop(0, '#ff7056');
    goGrad.addColorStop(1, '#d32f2f');
    ctx.fillStyle = goGrad;
    ctx.fillText('GAME OVER', V_WIDTH / 2, modalY);

    // Scorecard Body
    const cardX = 32;
    const cardY = modalY + 32;
    const cardW = V_WIDTH - 64;
    const cardH = 184;

    // Card drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    roundRect(ctx, cardX + 3, cardY + 6, cardW, cardH, 22);
    ctx.fill();

    // Card Surface Gradient
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, '#fefbf0');
    cardGrad.addColorStop(1, '#e5dcb8');
    ctx.fillStyle = cardGrad;
    roundRect(ctx, cardX, cardY, cardW, cardH, 22);
    ctx.fill();

    // Card Border
    ctx.strokeStyle = '#bfa15f';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Award Medal
    drawMedal(cardX + 50, cardY + 96, score);

    // Stats Section
    ctx.textAlign = 'right';

    // SCORE
    ctx.font = '700 12px "Press Start 2P", monospace';
    ctx.fillStyle = '#f57c00';
    ctx.fillText('SCORE', cardX + cardW - 22, cardY + 46);

    ctx.font = '800 28px "Fredoka", sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(score.toString(), cardX + cardW - 22, cardY + 82);

    // BEST
    ctx.font = '700 12px "Press Start 2P", monospace';
    ctx.fillStyle = '#f57c00';
    ctx.fillText('BEST', cardX + cardW - 22, cardY + 124);

    ctx.font = '800 28px "Fredoka", sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(highScore.toString(), cardX + cardW - 22, cardY + 160);

    // "NEW" High Score Ribbon
    if (isNewHighScore && score > 0) {
      ctx.save();
      ctx.translate(cardX + cardW - 96, cardY + 106);
      ctx.fillStyle = '#e53935';
      roundRect(ctx, 0, 0, 42, 17, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 9px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEW', 21, 13);
      ctx.restore();
    }

    // Play Again Button
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
      colorB = '#91a4b5';
      label = 'P';
    } else if (finalScore >= 20) {
      tier = 'GOLD';
      colorA = '#fff176';
      colorB = '#c79100';
      label = 'G';
    } else if (finalScore >= 10) {
      tier = 'SILVER';
      colorA = '#f5f5f5';
      colorB = '#9e9e9e';
      label = 'S';
    } else if (finalScore >= 4) {
      tier = 'BRONZE';
      colorA = '#f1a868';
      colorB = '#965214';
      label = 'B';
    }

    // Medal Slot Base
    ctx.strokeStyle = '#b8a698';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 33, 0, Math.PI * 2);
    ctx.stroke();

    if (!tier) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.fill();
      return;
    }

    // Ribbon
    ctx.fillStyle = '#3949ab';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 33);
    ctx.lineTo(cx - 19, cy - 50);
    ctx.lineTo(cx + 19, cy - 50);
    ctx.lineTo(cx + 10, cy - 33);
    ctx.closePath();
    ctx.fill();

    // Medal Disc with Radial Glow
    const grad = ctx.createRadialGradient(cx - 8, cy - 8, 3, cx, cy, 29);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, colorA);
    grad.addColorStop(1, colorB);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colorB;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner Embossed Ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.stroke();

    // Tier Letter
    ctx.font = '900 19px "Fredoka", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);

    // Rotating Sparkles on Gold / Platinum Medals
    if (tier === 'GOLD' || tier === 'PLATINUM') {
      const spRot = globalFrame * 0.08;
      const sparkleX = cx + Math.sin(spRot) * 20;
      const sparkleY = cy + Math.cos(spRot) * 20;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRestartButton(btn) {
    ctx.save();
    // Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    roundRect(ctx, btn.x, btn.y + 4, btn.w, btn.h, 27);
    ctx.fill();

    // Button Gradient
    const bGrad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
    bGrad.addColorStop(0, '#4cd964');
    bGrad.addColorStop(1, '#24ab3e');
    ctx.fillStyle = bGrad;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 27);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Label
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

  // --- Input Handlers (Mobile Touch, Pointer & Keyboard) ---
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
    sound.playTone(460, 0.08, 'sine');
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

  // Mobile safety against gesture zooming
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // --- Main Animation Loop (60 FPS) ---
  function gameLoop() {
    globalFrame++;

    // 1. Screen Shake calculations
    let shakeX = 0;
    let shakeY = 0;
    if (screenShakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * screenShakeTimer * 1.5;
      shakeY = (Math.random() - 0.5) * screenShakeTimer * 1.5;
      screenShakeTimer--;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 2. Parallax Backdrop
    drawSkyAndSun();
    drawMountains();
    drawClouds();
    drawCityscape();
    drawRollingHills();

    // 3. Pipes Update & Draw
    if (currentState === STATE.PLAYING) {
      pipeTimer++;
      if (pipeTimer >= PIPE_SPAWN_INTERVAL) {
        pipeTimer = 0;
        pipes.push(new PipePair(V_WIDTH + 10));
      }

      for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.update();

        // Check scoring point
        if (!p.passed && p.x + p.w < bird.x) {
          p.passed = true;
          score++;
          createScoreSparkles(bird.x + 10, bird.y);
          sound.playScore();
          srAnnouncements.textContent = `Score: ${score}`;
        }

        if (p.x + p.w < -30) {
          pipes.splice(i, 1);
        }
      }
    }

    pipes.forEach(p => p.draw());

    // 4. Ground Layer
    drawGround();

    // 5. Bird Update & Draw
    bird.update();
    bird.draw();

    // 6. Collision Checking & States
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

    // 7. Particles & Popups
    updateParticles();
    drawParticles();

    // 8. HUD & Overlays
    if (currentState === STATE.READY) {
      drawStartScreen();
    } else if (currentState === STATE.PLAYING || currentState === STATE.DYING) {
      drawScoreHUD();
    } else if (currentState === STATE.GAMEOVER) {
      drawGameOverScreen();
    }

    // 9. Impact White Flash
    if (flashWhiteAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashWhiteAlpha})`;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
      flashWhiteAlpha = Math.max(0, flashWhiteAlpha - 0.08);
    }

    ctx.restore();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

})();
