# ⚡ Flappy Bird - Neon Seasons & Cyber Arcade

A self-contained, mobile-optimized, and visually stylized **Flappy Bird** arcade game featuring a full **Cyberpunk/Synthwave Neon aesthetic**, dynamic **Day & Night cycles**, and **moving seasonal worlds**.

---

## ✨ Features & Visual Highlights

### 🌆 Dynamic Day & Night Cycles
- **DAY:** Electric azure & turquoise skies with a radiant sun corona.
- **SUNSET:** Synthwave horizon gradient (violet/magenta/amber) with a segmented retro sunset sun.
- **NIGHT:** Deep space navy with twinkling neon stars, shooting stars, and a glowing cyan crescent moon.
- **DAWN:** Rose gold and electric violet pastel dawn.

### 🌸 4 Moving Seasonal Worlds
1. **Spring (Neon Sakura Grove):** Floating Japanese pagodas, illuminated torii spires, silhouetted cherry blossom trees, and drifting pink sakura petals.
2. **Summer (Cyber Metropolis):** Skyscraper city skyline with holographic antenna beacons, glowing matrix window grids, and an elevated highway with speeding neon vehicle light trails.
3. **Autumn (Golden Ember Ruins):** Ancient floating megaliths and cyber obelisks with glowing rune glyphs, accompanied by swirling autumn leaves and golden embers.
4. **Winter (Aurora Borealis Frost-land):** Undulating green & violet aurora borealis curtains waving across the sky, glacial ice spires, and falling crystalline snowflakes.

### ⚡ Neon Style All Around
- **Glowing Cyber Bird:** Neon visor with an animated scanning laser eye, luminous layered wings, glowing crest antenna, and an animated light ribbon trail.
- **Obsidian Laser Pipes:** Sleek gunmetal/obsidian pipe bodies with vibrant glowing neon laser cores, circuit lines, and energy rim rings.
- **Synthwave Floor:** Neon laser boundary line and scrolling perspective cyber grid.
- **Neon UI & Particle Systems:** Real-time glow effects (`ctx.shadowBlur`), floating glowing `+1` score popups, starburst particles, and a glassmorphic cyber HUD.

### 🎮 Smooth Controls & Calibrated Physics
- **Controls:** Tap anywhere on mobile, click on desktop, or press `Spacebar` / `ArrowUp` / `W`.
- **Touch Safe:** Prevents double-tap zoom, accidental scrolling, and selection highlights.
- **Audio:** 100% procedurally synthesized sound effects with an in-game mute toggle.

---

## 🚀 How to Run Locally

Open `index.html` directly in your browser or run a simple local server:
```bash
python -m http.server 8000
```
Then navigate to `http://localhost:8000/`.

---

## 📁 Project Structure

```text
├── index.html        # Main HTML layout, viewport & season/time HUD
├── style.css         # Neon cabinet frame, glassmorphic UI, responsive styles
├── game.js           # Day/Night engine, seasonal world rendering, physics & SFX
├── .gitignore        # Standard ignore rules
└── README.md         # Documentation
```

---

## 📜 License
MIT License
