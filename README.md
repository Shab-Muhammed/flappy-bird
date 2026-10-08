# 🐤 Flappy Bird - Classic Arcade Edition

A mobile-optimized, high-DPI HTML5 canvas remake of **Flappy Bird** featuring the **authentic original bird**, **rich hand-crafted textures**, **backward-moving multi-layer parallax scenery**, and **dynamic Day & Night cycles**.

---

## ✨ Features & Visual Highlights

### 🐤 Authentic Original Flappy Bird
- **True Classic Design:** Chubby golden-yellow bird with an animated flapping wing, white/cream underbelly, cute tail feathers, and head crest.
- **Hand-Crafted Textures:** Rich radial plumage shading, expressive large cartoon eye with double specular reflections, rosy cheek blush, and puffy orange duck beak.
- **Fluid Animation:** Realistic aerodynamic pitch tilting, animated wing states, and gentle idle floating.

### 🧱 Hand-Crafted Textures & Depth
- **Classic Green Pipes:** True 3D cylindrical lighting with high-contrast specular gloss stripes, 3D collar lip overhangs, drop shadows, and dark hollow cavern openings.
- **Stratified Earth & Turf Ground:** Lush emerald green grass strip with serrated blade teeth, warm sandy loam soil with diagonal textured strata, and scattered earth pebbles moving backward.

### 🌅 Dynamic Day & Night Cycles & Backward Parallax Scenery
- **4 Time Periods:**
  - **DAY (☀️):** Classic retro bright sky-blue with soft warm sun and radiant corona.
  - **SUNSET (🌅):** Rich apricot, golden amber, and rose horizon with setting golden sun.
  - **NIGHT (🌙):** Deep starry navy sky with twinkling stars, shooting stars, and a glowing crescent moon with crater details.
  - **DAWN (🌄):** Soft pastel lavender and peach sunrise.
- **Moving Celestial Bodies:** Sun and Moon smoothly traverse the sky along realistic parabolic arcs.
- **Multi-Layer Parallax Moving Backward:**
  1. **Layer 1:** Fluffy billowy clouds with soft underbelly shading drifting backward.
  2. **Layer 2:** Distant mountain peaks with snowcaps moving backward with atmospheric haze.
  3. **Layer 3:** Mid-ground rolling green hills with silhouetted tree clusters moving backward.
  4. **Layer 4:** Classic green pipes moving backward.
  5. **Layer 5:** Stratified earth and grass turf ground moving backward in sync with flight speed.

### 🎮 Controls
- **Fly / Jump:** Tap anywhere on mobile, click canvas on desktop, or press `Space` / `ArrowUp` / `W`.
- **Change Time of Day:** Tap the `[☀️ DAY]` pill in the header or press `T` (cycles `AUTO 🔄`, `DAY ☀️`, `SUNSET 🌅`, `NIGHT 🌙`, `DAWN 🌄`).
- **Mute Audio:** Tap the sound button or press `M`.

---

## 🚀 How to Run Locally

Open `index.html` directly in any web browser, or launch a simple local HTTP server:
```bash
python -m http.server 8000
```
Then open `http://localhost:8000/`.

---

## 📁 Project Structure

```text
├── index.html        # Main HTML layout, viewport & header HUD
├── style.css         # Retro cabinet frame, classic typography, responsive styling
├── game.js           # Authentic bird, pipe shading, parallax scenery & sound engine
├── .gitignore        # Standard ignore rules
└── README.md         # Documentation
```

---

## 📜 License
MIT License
