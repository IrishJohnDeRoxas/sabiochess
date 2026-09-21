# SabioChess

> **Master Chess Analysis & Real-Time AI Voice Coach — 100% Free, Private, and Running Client-Side.**

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-orange?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/sabiochess)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)
[![Angular](https://img.shields.io/badge/Angular-22-DD0031?style=for-the-badge&logo=angular)](https://angular.dev)
[![Engine](https://img.shields.io/badge/Stockfish-WASM-black?style=for-the-badge)](https://stockfishchess.org)

---

## Why SabioChess?

| Feature | Chess.com Diamond ($120/yr) | Lichess | **SabioChess (Free)** |
| :--- | :---: | :---: | :---: |
| **Unlimited Full Game Reviews** | No (Free is 1/day) | No (Basic Analysis) | **Unlimited & Free** |
| **Natural AI Voice Coach** | No (Robotic Audio) | None | **On-Device Neural TTS** |
| **Move Classifications (!!, !, ★, ??)** | Yes | Basic centipawn | **Full 7-Tier System** |
| **Direct Chess.com Match Import** | Yes | Manual PGN | **1-Click Chrome Extension** |
| **Privacy & Serverless Execution** | Cloud tracked | Cloud Engine | **100% In-Browser Worker** |

---

## Key Features

- **Client-Side Stockfish WASM**: Deep multithreaded engine analysis directly in Web Workers with zero latency and zero server queues.
- **On-Device Voice Commentary**: Spoken move explanations and real-time coaching using neural text-to-speech.
- **Master Opening Book**: Contextual opening recognition, variations, and theory insights.
- **Neubrutalist Board & Themes**: High-contrast, accessibility-first board themes, sound packs, and momentum charts.
- **Chrome Extension Overlay**: 1-click review directly from Chess.com game-over screens.

---

## Support SabioChess

SabioChess is completely free and open-source. If you saved money skipping expensive chess subscriptions, consider supporting development:

- **[Support on Buy Me a Coffee](https://buymeacoffee.com/sabiochess)**

---

## Development & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Dev Server
```bash
npm run dev
# or: ng serve
```
Open `http://localhost:4200/` in your browser.

### 3. Run Tests
```bash
npm test
```

### 4. Build Production Bundle
```bash
npm run build
```

---

## Browser Extension (Chess.com Integration)

The `extension/` directory contains the official Manifest V3 Chrome extension.

### Dev Testing on Chess.com:
By default, the extension loads `https://sabiochess.com`. To point it to your local dev server while testing on Chess.com, open the browser console (`Cmd+Option+I` on chess.com) and run:

```javascript
// Point to local development:
localStorage.setItem('sabiochess_target_url', 'http://localhost:4200');

// Reset to production:
localStorage.removeItem('sabiochess_target_url');
```

---

## License
This project is licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0).
