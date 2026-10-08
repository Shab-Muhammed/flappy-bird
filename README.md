# ⚡ Flappy Bird - Neon Seasons & Cyber Arcade

A self-contained, mobile-optimized, and visually stylized **Flappy Bird** arcade game featuring a full **Cyberpunk/Synthwave Neon aesthetic**, dynamic **Day & Night cycles**, and **moving seasonal worlds**.

---

## ✨ Features & Visual Highlights

### 🌆 Dynamic Day & Night Cycles
- **DAY (☀️):** Electric azure & turquoise skies with a radiant sun corona and lens flare.
- **SUNSET (🌅):** Synthwave horizon gradient (violet/magenta/amber) with a segmented retro sunset sun with horizontal cutout stripes.
- **NIGHT (🌙):** Deep space navy with twinkling neon stars, shooting stars, and a glowing cyan crescent moon.
- **DAWN (🌄):** Rose gold and electric violet pastel morning sky.
- **Dynamic Celestial Arcs:** The Sun and Moon smoothly traverse across the sky in realistic parabolic arcs as time advances.
- **Responsive Night Lighting:** Skyscraper window grids and pagoda lanterns illuminate when night falls; the Cyber Bird projects a forward searchlight beam cutting through the darkness.
- **Interactive Control:** Click the Time pill in the header or press `T` on your keyboard to instantly switch modes (`AUTO` 🔄, `DAY` ☀️, `SUNSET` 🌅, `NIGHT` 🌙, `DAWN` 🌄). In Auto mode, time continuously advances and progresses with each pipe cleared!

### 🏔️ Multi-Layer Parallax Scenery Moving Backward
The scenery now glides backward (right-to-left) with seamless, multi-tiered depth:
1. **Layer 1 (Atmospheric Clouds):** Procedural billowy clouds drifting backward across the sky with colors reactive to day/night lighting.
2. **Layer 2 (Distant Peaks):** Continuous neon-crested mountain ridges with mathematical seamless tiling.
3. **Layer 3 (Mid-Distance Foothills):** Rolling hill silhouettes and silhouetted tree ridges.
4. **Layer 4 (Seasonal Moving Landmarks):**
   - **Spring (Sakura Grove):** Multi-tier pagodas, illuminated night lanterns, torii gates, and blooming cherry trees.
   - **Summer (Cyber Metropolis):** 10 detailed skyscrapers with blinking roof antennas, dynamic lit windows, and an elevated expressway with speeding vehicle light trails racing backward.
   - **Autumn (Golden Ember Ruins):** Levitating runic obelisks with pulsing hieroglyphs.
   - **Winter (Aurora Citadels):** Crystalline glacial spires with undulating green & magenta Aurora Borealis ribbons.
5. **Layer 5 (Perspective Floor):** Dark cyber grid with neon laser boundary wire moving in sync with the flight speed.
6. **Layer 6 (Weather Particles):** Sakura petals, cyber motes, golden leaves, falling snowflakes, and night bioluminescent fireflies drifting in the wind.

### ⚡ Neon Style All Around
- **Glowing Cyber Bird:** Neon visor with an animated scanning laser eye, luminous layered wings, glowing crest antenna, light ribbon trail, and night searchlight beam.
- **Obsidian Laser Pipes:** Sleek gunmetal/obsidian pipe bodies with vibrant glowing neon laser cores, circuit lines, and energy rim rings.
- **Synthwave Floor:** Neon laser boundary line and scrolling perspective cyber grid.
- **Neon UI & Particle Systems:** Real-time glow effects (`ctx.shadowBlur`), floating glowing `+1` score popups, starburst particles, and a glassmorphic cyber HUD.

### 🎮 Smooth Controls & Calibrated Physics
- **Fly / Jump:** Tap anywhere on mobile, click canvas on desktop, or press `Spacebar` / `ArrowUp` / `W`.
- **Toggle Day/Night Cycle:** Tap the `[☀️ DAY]` pill in the header or press `T`.
- **Toggle Seasonal World:** Tap the `[🌸 SPRING]` pill in the header or press `S`.
- **Toggle Audio:** Tap the sound button or press `M`.

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
