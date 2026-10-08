# 🐦 Flappy Bird - Modern Mobile & Desktop Arcade Game

A self-contained, responsive, and visually stylized **Flappy Bird** web game crafted with pure HTML5 Canvas vector graphics, smooth physics, and procedural audio synthesis.

---

## ✨ Features

- **🎮 Responsive Controls:** 
  - Mobile Touch: Tap anywhere to flap or restart.
  - Keyboard: `Spacebar`, `ArrowUp`, or `W` key.
  - Desktop: Click anywhere on screen.
  - Touch Safety: Blocked double-tap zoom, pull-to-refresh, and unwanted text selection.
- **🎨 Stylized Vector Graphics (Zero External Assets):**
  - **Dynamic Parallax Scenery:** Glowing sun with soft halo, floating puffy clouds, snow-capped mountains, pastel city silhouettes, rolling green hills, and grass blade tufts.
  - **Animated Bird:** Features flapping layered wings, wagging tail feathers, a bouncy head crest, expressive eyes with specular shines, and blush cheeks.
  - **Deluxe Pipes:** 3D cylindrical lighting, specular reflections, brass collar rings with rivets, hanging ivy accents, and background ambient drop shadows.
- **⚡ Calibrated Physics & Speed:**
  - Tuned flight velocity, floaty gravity, and fair obstacle spacing for fluid and satisfying arcade gameplay.
- **🔊 Procedural Audio Engine (Web Audio API):**
  - Real-time synthesized sound effects for flapping, scoring coin chimes, impacts, falling whistle, and UI blips.
  - Quick audio mute toggle with preference saved in `localStorage`.
- **🏆 High Score & Medals:**
  - Persistent high score tracking via `localStorage`.
  - Game Over scorecard with Bronze, Silver, Gold, and Platinum medals featuring sparkle animations.

---

## 🚀 How to Run Locally

Because this project is built entirely with vanilla web technologies, you don't need any complex build tools.

### Option 1: Direct File
Simply open `index.html` in any modern web browser.

### Option 2: Local HTTP Server (Python)
```bash
# Python 3
python -m http.server 8000
```
Then navigate to `http://localhost:8000/`.

---

## 📁 Project Structure

```text
├── index.html        # Main HTML layout, viewport & meta configurations
├── style.css         # Responsive layout, glassmorphic HUD, touch safety rules
├── game.js           # Game engine, physics, Web Audio synthesizer & rendering
├── .gitignore        # Ignored files
└── README.md         # Project documentation
```

---

## 📜 License
MIT License. Feel free to use and customize!
