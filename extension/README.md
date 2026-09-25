# SabioChess Chrome Extension

A lightweight Manifest V3 Chrome Extension that integrates SabioChess directly into **Chess.com** and **Lichess.org**.

When you finish a game on Chess.com or Lichess, the extension automatically detects the game-over screen and injects a **"Review on SabioChess"** button. Clicking it slides open an analysis sidebar that loads your game and runs Stockfish depth-16 review instantly.

---

## Features

- **Modern Clean UI**: Matches SabioChess design with bold high-contrast styling and responsive tactile controls.
- **Dual Platform Support**: Seamless integration on both **Chess.com** and **Lichess.org**.
- **Auto-Detection**: Uses `MutationObserver` to detect completed games across Chess.com (live, daily, play) and Lichess (standard, analysis, study, tournaments).
- **Smart PGN Extraction**: Reads the live DOM move tree with instant background fetch fallback to official Chess.com and Lichess public APIs.
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

## Testing on Platforms

### Chess.com
1. Navigate to [chess.com](https://www.chess.com) and play or open any completed game (e.g., `https://www.chess.com/game/live/...`).
2. When the game ends (or on any finished game screen), look right below the green **Game Review** button.
3. Click the orange **REVIEW ON SABIOCHESS** button to open the analysis sidebar.

### Lichess.org
1. Navigate to [lichess.org](https://lichess.org) and open any completed game or analysis board (e.g., `https://lichess.org/6nyeBPlN` or `https://lichess.org/analysis/...`).
2. In the post-game panel (next to **Analysis board** / in **.follow-up**) or in analysis tools, you will see the **REVIEW ON SABIOCHESS** button.
3. Click it to immediately slide open the SabioChess analysis drawer with full engine evaluation.

---

## Permissions & Architecture

- **Zero Elevated Permissions (`permissions: []`)**: The extension does not request or require `storage`, `activeTab`, `tabs`, or background cookies.
- **Narrow Host Permissions**: Strictly limited to `chess.com`, `api.chess.com`, `lichess.org`, `sabiochess.com`, and official worker fallback solely to detect game states and query public match archive PGN data.
- **100% Client-Side Engine**: Game analysis runs locally in the browser via WebAssembly Stockfish. Zero game data or personal credentials are sent to or logged on remote servers.

---

## Switching Target URL (Localhost vs. Production)

By default, the extension points to production `https://sabiochess.com`.

To switch target environment while testing, open Developer Console (F12 / Cmd+Option+I on chess.com or lichess.org):

```javascript
// Point extension to local dev server:
localStorage.setItem('sabiochess_target_url', 'http://localhost:4200');

// Reset extension back to production:
localStorage.removeItem('sabiochess_target_url');
```
