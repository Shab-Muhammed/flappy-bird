# Flappy Bird: Classic Arcade Edition

A browser-based Flappy Bird recreation built with HTML, CSS, and the Canvas 2D API. It features responsive controls, a changing environment, unlockable cosmetics and sounds, and an optional online leaderboard.

## Features

- Canvas-based gameplay with keyboard, mouse, and touch controls.
- Animated bird, pipes, ground, and layered scenery.
- Automatic and manual time-of-day and seasonal changes.
- Difficulty that increases as the player's score rises.
- Coins, persistent unlocks, bird and pipe cosmetics, and selectable death sounds.
- Daily score challenge and persistent score badges.
- Optional top-ten leaderboard with local storage fallback.
- A separate creator tool for preparing owner-published bird and pipe skins.

## Run locally

The game uses browser APIs and static files. You can open `index.html` directly, or serve the project over HTTP:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>.

## Controls

| Action | Control |
| --- | --- |
| Flap | Tap or click the game, or press `Space`, `ArrowUp`, or `W` |
| Change time of day | Press `T` or use the header control |
| Open the store | Press `B` from the menu |
| Open the leaderboard | Press `L` or select the best-score control |
| Close an overlay | Press `Escape` |
| Mute or unmute audio | Press `M` or use the sound control |
| Replay after a run | Press `Space` or select the replay button |

## Store and customization

Coins, purchases, and equipped items are saved in the browser's local storage. The store includes bird skins, pipe skins, and death sounds. Catalog entries and prices are defined in `game.js` in the `SKINS`, `PIPE_SKINS`, and `DEATH_SOUNDS` collections.

The `flappy bird skin creator` directory contains a separate tool for preparing custom bird and pipe images. Skins are published by the site owner through `custom-skins.js`; players cannot upload skins from within the game.

## Leaderboard configuration

The leaderboard uses the Firebase Realtime Database REST API. To configure your own database:

1. Create a Firebase project and a Realtime Database.
2. Set the database rules. The rules below permit public reads, allow each player record to be created or updated when its score does not decrease, and allow short-lived player presence records for the live feed:

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
      },
      "presence": {
        ".read": true,
        ".indexOn": ["lastSeen"],
        "$id": {
          ".write": true,
          ".validate": "$id.matches(/^[a-f0-9]{24}$/) && newData.hasChildren(['name','lastSeen']) && newData.child('name').isString() && newData.child('name').val().length >= 1 && newData.child('name').val().length <= 12 && newData.child('lastSeen').isNumber()"
        }
      },
      "suggestions": {
        ".read": false,
        "$id": {
          ".write": "!data.exists()",
          ".validate": "newData.hasChildren(['category','suggestion','ts']) && newData.child('category').isString() && (newData.child('category').val() === 'Pipe' || newData.child('category').val() === 'Skin' || newData.child('category').val() === 'Audio') && newData.child('suggestion').isString() && newData.child('suggestion').val().length >= 1 && newData.child('suggestion').val().length <= 120 && newData.child('ts').isNumber()"
        }
       }
     }
   }
   ```

3. Set `CONFIG.databaseURL` near the top of `leaderboard.js` to your database URL.

Set the database URL to an empty string to use device-local scores without submitting to Firebase. The browser client cannot provide strong protection against fabricated scores; the rules provide basic validation and a score limit for a casual leaderboard.

The live feed writes a random session ID, the player's chosen display name, and a server timestamp to `presence` every 30 seconds. It displays records updated in the last 90 seconds and attempts to delete the current record when the page closes; stale records naturally disappear from the feed after a crash or lost connection. Names are visible to anyone using the game while the session is active. This public REST setup is best-effort presence, not authenticated identity, so a determined visitor can spoof or overwrite presence data.

The store's suggestion form submits category, suggestion text, and a server timestamp to the `suggestions` collection. The rules above allow new submissions while preventing edits and reads through the public client. Review requests in Firebase Console under Realtime Database data at `suggestions`. Since the form is public and unauthenticated, the validation limits the content but does not prevent spam; use an authenticated server endpoint if you need stronger abuse protection.

## Project structure

```text
.
├── index.html                  Main game page and overlays
├── style.css                   Layout and responsive styling
├── game.js                     Game loop, rendering, store, and controls
├── leaderboard.js              Firebase leaderboard and local fallback
├── custom-skins.js             Owner-published custom skins
├── sounds/
│   └── death/                  Death sound files and bundled audio data
├── flappy bird skin creator/   Custom skin preparation tool
├── package.json                Project dependency metadata
└── README.md                   Project documentation
```

## License

This project is provided under the MIT License.
