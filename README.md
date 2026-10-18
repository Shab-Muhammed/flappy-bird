# Flappy Bird: Classic Arcade Edition

A browser-based Flappy Bird recreation built with HTML, CSS, and the Canvas 2D API. It features responsive controls, a changing environment, unlockable cosmetics and sounds, and an optional online leaderboard.

## Features

- Canvas-based gameplay with keyboard, mouse, and touch controls.
- Animated bird, pipes, ground, and layered scenery.
- Automatic time-of-day and seasonal changes.
- Difficulty that increases as the player's score rises.
- Coins, persistent unlocks, bird and pipe cosmetics, and selectable death sounds.
- Daily score challenge and persistent score badges.
- Optional top-ten leaderboard with local storage fallback.
- Weekly and all-time online leaderboards, with a separate best score for each Monday-to-Monday UTC week.
- Private, code-only multiplayer rooms for up to eight signed-in players, with synced pipe layouts, live scores, room chat, and optional interpolated opponent ghosts.
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
| Open the store | Press `B` from the menu |
| Open the leaderboard | Press `L` or select the best-score control |
| Open private rooms | Select `Private Rooms` in the leaderboard; the house button reopens your room |
| Close an overlay | Press `Escape` |
| Mute or unmute audio | Press `M` or use the sound control |
| Replay after a run | Press `Space` or select the replay button |

## Store and customization

Coins, purchases, and equipped items are saved in the browser's local storage. The store includes bird skins, pipe skins, and death sounds. Catalog entries and prices are defined in `game.js` in the `SKINS`, `PIPE_SKINS`, and `DEATH_SOUNDS` collections.

The store uses the built-in bird, pipe, and death sound catalogs defined in `game.js`.

## Leaderboard configuration

The leaderboard uses the Firebase Realtime Database REST API. To configure your own database:

1. Create a Firebase project and a Realtime Database.
2. Enable **Authentication → Sign-in method → Email/Password**. Then set the database rules below. They allow public leaderboard reads, authenticated username reservations, and score writes only by the signed-in account that owns the username:

   ```json
   {
     "rules": {
      "scores": {
        ".read": true,
        ".indexOn": ["score"],
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score','ts']) && newData.child('name').isString() && newData.child('name').val() === root.child('usernameByUid').child($uid).val() && newData.child('score').isNumber() && newData.child('score').val() >= 0 && newData.child('score').val() <= 10000 && newData.child('ts').exists()"
        }
      },
      "weeklyScores": {
        "$week": {
          ".read": true,
          ".indexOn": ["score"],
          ".validate": "$week.matches(/^[0-9]{4}-W[0-9]{2}$/)",
          "$uid": {
            ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
            ".validate": "newData.hasChildren(['name','score','ts']) && newData.child('name').isString() && newData.child('name').val() === root.child('usernameByUid').child($uid).val() && newData.child('score').isNumber() && newData.child('score').val() >= 0 && newData.child('score').val() <= 10000 && newData.child('ts').exists()"
          }
        }
      },
      "usernames": {
        ".read": true,
        "$name": {
          ".write": "auth != null && newData.val() === auth.uid && auth.token.email === ($name + '@users.flappy-bird-ae650.firebaseapp.com')",
          ".validate": "$name.matches(/^[a-z0-9_]{3,12}$/) && newData.isString()"
        }
      },
      "usernameByUid": {
        "$uid": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": "auth != null && auth.uid === $uid && auth.token.email === (newData.val() + '@users.flappy-bird-ae650.firebaseapp.com')",
          ".validate": "newData.isString() && newData.val().matches(/^[a-z0-9_]{3,12}$/)"
        }
      },
      "presence": {
        ".read": true,
        ".indexOn": ["lastSeen"],
        "$uid": {
          ".write": "auth != null && auth.uid === $uid",
          ".validate": "newData.hasChildren(['name','lastSeen']) && newData.child('name').val() === root.child('usernameByUid').child($uid).val() && newData.child('lastSeen').isNumber()"
        }
      },
      "suggestions": {
        ".read": false,
        "$id": {
          ".write": "!data.exists()",
          ".validate": "newData.hasChildren(['category','suggestion','ts']) && newData.child('category').isString() && (newData.child('category').val() === 'General' || newData.child('category').val() === 'Skin' || newData.child('category').val() === 'Audio') && newData.child('suggestion').isString() && newData.child('suggestion').val().length >= 1 && newData.child('suggestion').val().length <= 120 && newData.child('ts').isNumber()"
        }
       },
      "rooms": {
        "$code": {
          ".read": "auth != null",
          ".write": "auth != null && ((!data.exists() && newData.child('hostUid').val() === auth.uid) || (data.exists() && data.child('hostUid').val() === auth.uid && (!newData.exists() || newData.child('hostUid').val() === data.child('hostUid').val() || root.child('roomMembers').child($code).child(newData.child('hostUid').val()).exists())))",
          ".validate": "newData.hasChildren(['hostUid','phase','createdAt','startAt','seed']) && newData.child('hostUid').isString() && (newData.child('phase').val() === 'lobby' || newData.child('phase').val() === 'playing') && newData.child('createdAt').isNumber() && newData.child('startAt').isNumber() && newData.child('seed').isNumber()"
        }
      },
      "roomMembers": {
        "$code": {
          ".read": "auth != null && root.child('rooms').child($code).exists()",
          ".write": "auth != null && (auth.uid === root.child('rooms').child($code).child('hostUid').val() || !root.child('rooms').child($code).exists())",
          "$uid": {
            ".write": "auth != null && auth.uid === $uid && root.child('rooms').child($code).exists() && (!newData.exists() || (data.exists() && newData.child('joinedAt').val() === data.child('joinedAt').val()) || (!data.exists() && root.child('rooms').child($code).child('phase').val() === 'lobby'))",
            ".validate": "newData.hasChildren(['name','ready','joinedAt']) && newData.child('name').val() === root.child('usernameByUid').child($uid).val() && newData.child('ready').isBoolean() && newData.child('joinedAt').isNumber()"
          }
        }
      },
      "roomStates": {
        "$code": {
          ".read": "auth != null && root.child('rooms').child($code).exists() && root.child('roomMembers').child($code).child(auth.uid).exists()",
          ".write": "auth != null && (auth.uid === root.child('rooms').child($code).child('hostUid').val() || !root.child('rooms').child($code).exists())",
          "$uid": {
            ".write": "auth != null && auth.uid === $uid && root.child('rooms').child($code).exists() && root.child('roomMembers').child($code).child($uid).exists()",
            ".validate": "newData.hasChildren(['score','alive','y','roundAt','updatedAt']) && newData.child('score').isNumber() && newData.child('score').val() >= 0 && newData.child('score').val() <= 10000 && newData.child('alive').isBoolean() && newData.child('y').isNumber() && newData.child('roundAt').isNumber() && newData.child('updatedAt').isNumber() && (!newData.child('velocity').exists() || newData.child('velocity').isNumber()) && (!newData.child('playerId').exists() || newData.child('playerId').val() === $uid) && (!newData.child('playerName').exists() || newData.child('playerName').isString())"
          }
        }
      },
      "roomChat": {
        "$code": {
          ".read": "auth != null && root.child('rooms').child($code).exists() && root.child('roomMembers').child($code).child(auth.uid).exists()",
          ".write": "auth != null && (auth.uid === root.child('rooms').child($code).child('hostUid').val() || !root.child('rooms').child($code).exists())",
          ".indexOn": ["ts"],
          "$messageId": {
            ".write": "auth != null && !data.exists() && root.child('rooms').child($code).exists() && root.child('roomMembers').child($code).child(auth.uid).exists()",
            ".validate": "newData.hasChildren(['uid','name','text','ts']) && newData.child('uid').val() === auth.uid && newData.child('name').val() === root.child('roomMembers').child($code).child(auth.uid).child('name').val() && newData.child('text').isString() && newData.child('text').val().length >= 1 && newData.child('text').val().length <= 180 && newData.child('ts').isNumber()"
          }
        }
      }
     }
   }
   ```

3. Add the site's hosting domain under **Authentication → Settings → Authorized domains** if Firebase rejects sign-in from the deployed site. The Firebase web app configuration and SDK are already included in `index.html`.

Players enter usernames and passwords; the game maps usernames to internal Firebase email-shaped identifiers, so players do not need email addresses. Username availability is checked against Firebase Authentication and the `usernames` reservation collection, independently of leaderboard rows. Returning players should open the game in the same browser they used before, create an account with their old username (the field is prefilled), and the game will move their best local or online score to the account. Players who cleared their browser data or changed devices need an administrator to migrate their account and score. To create accounts for players yourself, create a Firebase Authentication user with `<lowercase_username>@users.flappy-bird-ae650.firebaseapp.com` as the email and give the player their username and password. Firebase handles password storage. Publish the rules above in Realtime Database → Rules before enabling the online leaderboard.

The all-time board stores one best-score entry per account under `scores/{uid}`. The weekly board stores one best score per account under `weeklyScores/{week}/{uid}`, where weeks start Monday at 00:00 UTC and use an ISO week key such as `2026-W42`. A run updates both boards independently, so a weekly write failure does not prevent the all-time score from saving. The weekly board starts empty and does not backfill historical scores; old weekly nodes can be removed from Firebase Realtime Database when desired. The week key is calculated using the player's device clock, so a misconfigured clock can place a score in the wrong week.

The live feed writes the authenticated player's account ID, username, and server timestamp to `presence` every 30 seconds. It displays records updated in the last 90 seconds and attempts to delete the current record when the player signs out or closes the page; stale records naturally disappear from the feed after a crash or lost connection. Names are visible to anyone using the game while the session is active.

## Private multiplayer rooms

Players sign in, create a room, and share its two-word code (for example `SOGGY-WAFFLE`). The game client limits rooms to eight players, with a ready check, host-started free-for-all matches, a full-screen ranked in-room score table, and room-only chat. After each round, players return to the room and can ready up for another match; rooms have no match limit. When a host leaves or disconnects, hosting transfers to the member with the earliest `joinedAt` timestamp. A room and its `roomMembers`, `roomStates`, and `roomChat` data are deleted when its last member leaves or disconnects. Realtime Database rules cannot count arbitrary children, so the player limit is not enforced against modified clients; use a trusted server such as a Cloud Function if the capacity limit must be security-enforced. Every round uses the same seeded pipe-gap sequence for all players. There is no public room list, random matchmaking, global chat, or one-to-one chat. The room feature uses the `rooms`, `roomMembers`, `roomStates`, and `roomChat` paths included in the rules above. Publish those complete rules in Firebase Console → Realtime Database → Rules. Members need a signed-in game account; anyone with a room code can attempt to join while the room is in its lobby.

The store's suggestion form accepts General, Skin, and Audio suggestions and submits the category, suggestion text, and a server timestamp to the `suggestions` collection. The rules above allow new submissions while preventing edits and reads through the public client. Review requests in Firebase Console under Realtime Database data at `suggestions`. Since the form is public and unauthenticated, the validation limits the content but does not prevent spam; use an authenticated server endpoint if you need stronger abuse protection.

## Project structure

```text
.
├── index.html                  Main game page and overlays
├── style.css                   Layout and responsive styling
├── game.js                     Game loop, rendering, store, and controls
├── leaderboard.js              Firebase leaderboard and local fallback
├── rooms.js                    Private multiplayer rooms and room-only chat
├── sounds/
│   └── death/                  Death sound files and bundled audio data
├── package.json                Project dependency metadata
└── README.md                   Project documentation
```

## License

This project is provided under the MIT License.
