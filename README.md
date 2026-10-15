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

### 📈 Gradual Difficulty
- Scroll speed eases up smoothly as your score climbs (`BASE_SPEED`, `MAX_SPEED`, `SPEED_PER_POINT` at the top of `game.js`).
- Pipes are spaced by distance, so gaps stay evenly spaced at every speed.

### 🏆 Online Leaderboard
- Top 10 board. You pick a name once, then every run updates your single entry (best score), and **Change name** renames it without creating a duplicate. Open it from the start menu, game-over screen, or 🏆 BEST pill.
- The game is currently configured to submit scores to the Firebase database URL in `leaderboard.js`. If that endpoint is unavailable, the board falls back to scores saved on this device.

### 🪙 Coins & Store
- Coins are paid out when a run ends, from your final score `P`: `C(P) = floor(P × (r + α × P))` with `r = 0.6` and `α = 0.002` (`COIN_RATE` and `COIN_ALPHA` in `game.js`). Score 10 pays 6 coins, 20 pays 12, 30 pays 19, 50 pays 35.
- Open the **🐤 STORE** from the start menu (or press `B`). The **Birds** tab sells Blue Jay, Ruby, Parrot, Shadow and Bubblegum; **Pipes** sells Frost, Sunset, Candy, Obsidian and Royal Gold; **Death Sounds** sells unlockable crash sounds at tiered prices. Bought sounds equip automatically and can be changed at any time. Edit `SKINS`, `PIPE_SKINS` or `DEATH_SOUNDS` in `game.js` to change prices or add more.
- Coins and unlocks are saved on your device.
- Use `flappy bird skin creator/index.html` to make image-based bird or pipe skins. Download its `custom-skins.js` and deploy it with the game to publish owner-selected skins in the store; players cannot upload skins from inside the game.
- A daily score challenge awards a one-time 10-coin bonus. Its target rotates by UTC date. Four score badges (5, 10, 20 and 35) are saved on this device.
- The leaderboard is available from the start menu, the **🏆 BEST** pill, or the game-over screen (or press `L`); it no longer interrupts every run.

### 🎮 Controls
- **Fly / Jump:** Tap anywhere on mobile, click canvas on desktop, or press `Space` / `ArrowUp` / `W`.
- **Change Time of Day:** Tap the `[☀️ DAY]` pill in the header or press `T` (cycles `AUTO 🔄`, `DAY ☀️`, `SUNSET 🌅`, `NIGHT 🌙`, `DAWN 🌄`).
- **Leaderboard:** Tap the `🏆 BEST` pill. `Esc` closes it.
- **Replay:** Tap **PLAY AGAIN** on the game-over screen or press `Space`.
- **Daily challenge:** Reach the score shown on the start screen to earn 10 bonus coins once per UTC day.
- **Badges:** Reach scores of 5, 10, 20 and 35 to unlock persistent badges.
- **Mute Audio:** Tap the sound button or press `M`.

---

## 🌐 Leaderboard Setup (Firebase Realtime Database, free tier)

The game currently points to the database URL in `leaderboard.js`. To use your own database, create a project at <https://console.firebase.google.com> and add a **Realtime Database** (start in locked mode).
1. In **Rules**, paste this and publish (entries are keyed by a player id so each player has one row). The `.write` condition allows an existing entry to be updated when its score is unchanged or higher; `!data.exists()` by itself only permits the first save:
   ```json
   {
     "rules": {
       "scores": {
         ".read": true,
         ".indexOn": ["score"],
         "$id": {
           ".write": "!data.exists() || newData.child('score').val() >= data.child('score').val()",
           ".validate": "$id.matches(/^[a-z0-9]{16,40}$/) && newData.hasChildren(['name','score','ts']) && newData.child('name').isString() && newData.child('name').val().length <= 12 && newData.child('score').isNumber() && newData.child('score').val() >= 0 && newData.child('score').val() <= 500"
         }
       }
     }
   }
   ```
2. Replace `CONFIG.databaseURL` at the top of `leaderboard.js` with your database URL. To keep scores on this device only, set it to an empty string.

Each player gets one entry. It can be created and then only raised (or renamed at the same score), never lowered or deleted. If you used an older version, delete the old `scores` node in the console once so the board starts clean. This is a casual board: because the game runs in the browser, a determined player could still post a fake score. The rules above cap names and scores, and `MAX_SCORE` in `leaderboard.js` must match the cap.

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
├── sounds/death/     # Death sounds used by the sound shop
│   └── death-sounds.js # Bundled audio data for reliable local playback
├── leaderboard.js    # Online Top 10 leaderboard (Firebase REST, local fallback)
├── custom-skins.js   # Owner-published custom bird and pipe skins
├── flappy bird skin creator/ # Owner-side direct-image skin creator
├── .gitignore        # Standard ignore rules
└── README.md         # Documentation
```

---

## 📜 License
MIT License
