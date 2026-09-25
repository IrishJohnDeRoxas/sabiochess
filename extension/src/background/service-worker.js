/**
 * SabioChess Extension Service Worker (Manifest V3)
 * Fetches games from Chess.com & Lichess public APIs and matches current game.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'HEALTH_CHECK') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    fetch(request.url, { method: 'HEAD', signal: controller.signal })
      .then((res) => {
        clearTimeout(timeout);
        sendResponse({ available: res.ok });
      })
      .catch(() => {
        clearTimeout(timeout);
        sendResponse({ available: false });
      });
    return true;
  }

  if (request.type === 'FETCH_LICHESS_PGN' || (request.type === 'FETCH_PGN' && request.platform === 'lichess')) {
    handleFetchLichessPgn(request.usernames || [request.username].filter(Boolean), request.gameId)
      .then((pgn) => {
        sendResponse({ success: Boolean(pgn), pgn: pgn || '' });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err?.message || 'Failed', pgn: '' });
      });
    return true;
  }

  if (request.type === 'FETCH_CHESSCOM_PGN' || request.type === 'FETCH_PGN') {
    const rawUsers = Array.isArray(request.usernames)
      ? request.usernames
      : [request.username, request.whiteUser, request.blackUser].filter(Boolean);

    handleFetchChessComPgn(rawUsers, request.gameId)
      .then((pgn) => {
        sendResponse({ success: Boolean(pgn), pgn: pgn || '' });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err?.message || 'Failed', pgn: '' });
      });
    return true; // Keep channel open for async sendResponse
  }
});

async function handleFetchLichessPgn(rawUsernames, gameId) {
  // Strategy 1: Direct game export endpoint by game ID
  if (gameId) {
    const cleanId = gameId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    if (cleanId) {
      const urls = [
        `https://lichess.org/game/export/${cleanId}?clocks=true&evals=false&opening=false`,
        `https://lichess.org/game/export/${cleanId}?clocks=true`
      ];
      for (const url of urls) {
        try {
          const res = await fetch(url, {
            headers: { Accept: 'application/x-chess-pgn' }
          });
          if (res.ok) {
            const text = await res.text();
            if (text && (text.includes('[') || text.includes('1.'))) {
              return text;
            }
          }
        } catch {}
      }
    }
  }

  // Strategy 2: User recent games API
  const cleanUsers = (rawUsernames || [])
    .map((u) => (u || '').replace(/\(.*?\)/g, '').replace(/[^a-zA-Z0-9_-]/g, '').trim())
    .filter(Boolean);

  for (const username of cleanUsers) {
    try {
      const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=5&clocks=true&evals=false&opening=false`;
      const res = await fetch(url, {
        headers: { Accept: 'application/x-chess-pgn' }
      });
      if (res.ok) {
        const text = await res.text();
        if (text && (text.includes('[') || text.includes('1.'))) {
          if (gameId) {
            const games = text.split(/\n\n(?=\[Event )/);
            const matched = games.find((g) => g.includes(gameId));
            if (matched) return matched;
          }
          return text.split(/\n\n(?=\[Event )/)[0] || text;
        }
      }
    } catch {}
  }

  return '';
}

async function handleFetchChessComPgn(rawUsernames, gameId) {
  const cleanUsers = (rawUsernames || [])
    .map((u) => (u || '').replace(/\(.*?\)/g, '').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase().trim())
    .filter(Boolean);

  // Strategy 1: Fetch user archives for last 30-60 days and filter by gameId
  for (const username of cleanUsers) {
    try {
      const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`;
      const archRes = await fetch(archivesUrl);
      if (!archRes.ok) continue;

      const archData = await archRes.json();
      if (!archData.archives || !archData.archives.length) continue;

      // Check last 2 months (current + previous month = 30-60 days)
      const recentArchives = archData.archives.slice(-2).reverse();

      for (const archiveUrl of recentArchives) {
        try {
          const monthRes = await fetch(archiveUrl);
          if (!monthRes.ok) continue;

          const monthData = await monthRes.json();
          if (!monthData.games || !Array.isArray(monthData.games)) continue;

          // Match by gameId in url or pgn
          if (gameId) {
            const matched = monthData.games.find((g) =>
              (g.url && g.url.includes(gameId)) ||
              (g.pgn && g.pgn.includes(gameId)) ||
              (g.uuid && g.uuid === gameId)
            );
            if (matched && matched.pgn) {
              return matched.pgn;
            }
          }

          // If no gameId provided, take player's latest game
          if (!gameId && monthData.games.length > 0) {
            const latest = monthData.games[monthData.games.length - 1];
            if (latest && latest.pgn) {
              return latest.pgn;
            }
          }
        } catch {}
      }
    } catch {}
  }

  // Strategy 2: If gameId exists, try direct callback endpoints
  if (gameId) {
    const callbackUrls = [
      `https://www.chess.com/callback/live/game/${gameId}`,
      `https://www.chess.com/callback/daily/game/${gameId}`
    ];
    for (const url of callbackUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.pgn) {
            return data.pgn;
          }
          if (data && data.game && data.game.pgn) {
            return data.game.pgn;
          }
        }
      } catch {}
    }
  }

  return '';
}
