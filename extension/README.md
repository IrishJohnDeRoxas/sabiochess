# SabioChess Chrome Extension

A lightweight Manifest V3 Chrome Extension that integrates SabioChess directly into **Chess.com**.

When you finish a game on Chess.com, the extension automatically detects the game-over screen and injects a **"Review on SabioChess"** button below the default *Game Review* button. Clicking it slides open an analysis sidebar that loads your game and runs Stockfish depth-16 review instantly.

---

## Features

- **Modern Clean UI**: Matches SabioChess design with bold high-contrast styling and responsive tactile controls.
- **Auto-Detection**: Uses `MutationObserver` to detect completed games across Chess.com live, daily, and play modes.
- **Smart PGN Extraction**: Reads the live DOM move tree with fallback to Chess.com's public game API.
- **Slide-Over Sidebar Drawer**: Smooth slide-in sidebar overlay with expand, minimize, and full-tab opening capabilities.
- **Zero-Config Instant Analysis**: Auto-passes game PGN and triggers engine review on load.

---

## Installation (Developer Mode)

1. Open Google Chrome (or any Chromium browser like Brave, Edge, Arc).
2. Go to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select this `extension` directory (`sabiochess/extension`).
6. The extension is now installed and active!

---

## Testing on Chess.com

1. Navigate to [chess.com](https://www.chess.com) and play or open any completed game (e.g., `https://www.chess.com/game/live/...`).
2. When the game ends (or on any finished game screen), look right below the green **Game Review** button.
3. You will see the orange **REVIEW ON SABIOCHESS** button.
4. Click it to open the analysis sidebar.

---

## Switching Target URL (Localhost vs. Production)

By default, the extension points to production `https://sabiochess.com`.

To switch target environment while testing on Chess.com, open Developer Console (F12 / Cmd+Option+I on chess.com):

```javascript
// Point extension to local dev server:
window.__setSabioUrl('http://localhost:4200');

// Reset extension back to production:
window.__setSabioUrl(); // or window.__setSabioUrl('https://sabiochess.com');
```
