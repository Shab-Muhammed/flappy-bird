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
- Top 10 board. You pick a name once, then every run updates your single entry (best score), and **Change name** renames it without creating a duplicate. It opens after every run, from the start menu, and from the 🏆 BEST pill.
- Works in **local mode** (this device only) until you connect a database. See setup below.

### 🪙 Coins & Store
- Coins are paid out when a run ends, from your final score `P`: `C(P) = floor(P × (1 + α × P))` with `α = 0.02` (`COIN_ALPHA` in `game.js`). Score 10 pays 12 coins, 20 pays 28, 30 pays 48, 50 pays 100.
- Open the **🐤 STORE** from the start menu (or press `B`). The **Birds** tab sells Blue Jay, Ruby, Parrot, Shadow and Bubblegum; the **Pipes** tab sells Frost, Sunset, Candy, Obsidian and Royal Gold. Edit `SKINS` / `PIPE_SKINS` in `game.js` to change prices or add more.
- Coins and unlocks are saved on your device.
- The leaderboard opens after every run, and the **🏆 LEADERBOARD** button is on the start menu (or press `L`).

### 🎮 Controls
- **Fly / Jump:** Tap anywhere on mobile, click canvas on desktop, or press `Space` / `ArrowUp` / `W`.
- **Change Time of Day:** Tap the `[☀️ DAY]` pill in the header or press `T` (cycles `AUTO 🔄`, `DAY ☀️`, `SUNSET 🌅`, `NIGHT 🌙`, `DAWN 🌄`).
- **Leaderboard:** Tap the `🏆 BEST` pill. `Esc` closes it.
- **Mute Audio:** Tap the sound button or press `M`.

---

## 🌐 Leaderboard Setup (Firebase Realtime Database, free tier)

1. Create a project at <https://console.firebase.google.com> and add a **Realtime Database** (start in locked mode).
2. In **Rules**, paste this and publish (it was updated: entries are now keyed by a player id so each player has one row):
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
3. Copy the database URL (looks like `https://your-project-default-rtdb.firebaseio.com`) into `CONFIG.databaseURL` at the top of `leaderboard.js`.

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
├── leaderboard.js    # Online Top 10 leaderboard (Firebase REST, local fallback)
├── .gitignore        # Standard ignore rules
└── README.md         # Documentation
```

---

## 📜 License
MIT License
