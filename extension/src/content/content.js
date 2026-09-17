/**
 * SabioChess Chrome Extension - Content Script
 * Injects neubrutalist review button into Chess.com and opens instant analysis sidebar.
 */

(function () {
  'use strict';

  const SABIO_BUTTON_ID = 'sabiochess-review-injected-btn';
  const SIDEBAR_ID = 'sabiochess-sidebar-container';

  // Base URL for SabioChess (Defaults to Production https://sabiochess.com)
  const PROD_URL = 'https://sabiochess.com';
  let sabioBaseUrl = PROD_URL;

  function updateTargetUrl() {
    try {
      const stored = localStorage.getItem('sabiochess_target_url');
      if (stored && typeof stored === 'string' && stored.trim().length > 0) {
        sabioBaseUrl = stored.trim().replace(/\/+$/, '');
        return;
      }
    } catch {}

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['sabiochess_target_url'], (res) => {
        if (res && res.sabiochess_target_url) {
          sabioBaseUrl = res.sabiochess_target_url.trim().replace(/\/+$/, '');
        }
      });
    }
  }

  updateTargetUrl();

  // Console helper for developers: window.__setSabioUrl('http://localhost:4200')
  try {
    window.__setSabioUrl = (url) => {
      if (url) {
        localStorage.setItem('sabiochess_target_url', url);
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ sabiochess_target_url: url });
        }
        sabioBaseUrl = url.trim().replace(/\/+$/, '');
        console.log('[SabioChess] Target URL set to:', sabioBaseUrl);
      } else {
        localStorage.removeItem('sabiochess_target_url');
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.remove(['sabiochess_target_url']);
        }
        sabioBaseUrl = PROD_URL;
        console.log('[SabioChess] Target URL reset to default:', PROD_URL);
      }
    };
  } catch {}

  /**
   * Selectors for Chess.com game review button
   */
  function findGameReviewElement() {
    const selectors = [
      '[data-cy="game-review-button"]',
      'button[data-cy="game-over-review-button"]',
      'button[data-cy="game-review-button"]',
      'a[aria-label="Game Review"]',
      'button[aria-label="Game Review"]',
      '.game-review-buttons-component button',
      '.game-review-buttons-component a',
      '.game-review-buttons-component',
      '.game-review-button',
      '.game-over-modal-button',
      '.game-over-buttons-component button',
      '.daily-game-footer .game-review-button',
      '.live-game-buttons-game-over button',
      '.sidebar-view .game-review-buttons-component'
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) return el;
    }

    const candidates = document.querySelectorAll('button, a, div[role="button"], span');
    for (const el of candidates) {
      if (el.children.length <= 4 && el.offsetParent !== null) {
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        if (text === 'game review' || text === 'review game' || text.startsWith('game review')) {
          return el.closest('button, a, [role="button"], .ui_v5-button-component') || el;
        }
      }
    }

    return null;
  }

  /**
   * Injects the Sabio Review button right below Chess.com's Review button
   */
  function checkAndInjectButton() {
    const existing = document.getElementById(SABIO_BUTTON_ID);
    if (existing && document.body.contains(existing)) {
      return;
    }

    const reviewEl = findGameReviewElement();
    if (!reviewEl) {
      return;
    }

    const targetEl = reviewEl.closest('button, a, [role="button"], .ui_v5-button-component') || reviewEl;

    const sabioBtn = document.createElement('button');
    sabioBtn.id = SABIO_BUTTON_ID;
    sabioBtn.className = 'sabiochess-review-btn';
    sabioBtn.type = 'button';
    sabioBtn.title = 'Open instant Stockfish analysis on SabioChess';
    sabioBtn.innerHTML = `
      <div class="sabiochess-logo-badge">
        <svg viewBox="0 0 45 45" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.5 7.5 C20 7.5 18 9.5 18 12 C18 13.1 18.4 14.1 19 14.9 C16.8 16.2 15.5 18.5 15.5 21.2 C15.5 23.4 16.5 25.3 18.1 26.6 C14.8 27.8 10 32.5 10 40.5 L35 40.5 C35 32.5 30.2 27.8 26.9 26.6 C28.5 25.3 29.5 23.4 29.5 21.2 C29.5 18.5 28.2 16.2 26 14.9 C26.6 14.1 27 13.1 27 12 C27 9.5 25 7.5 22.5 7.5 Z" fill="#FFFFFF" stroke="#222222" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
          <line x1="12" y1="39" x2="33" y2="39" stroke="#222222" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <span class="sabiochess-btn-text">REVIEW ON SABIO<span class="sabiochess-text-orange">CHESS</span></span>
    `;

    sabioBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSabioReviewClick();
    });

    try {
      targetEl.insertAdjacentElement('afterend', sabioBtn);
    } catch {
      targetEl.parentElement?.appendChild(sabioBtn);
    }
  }

  /**
   * Determine piece figurine (N, B, R, Q, K) from element attributes, classes, or glyphs
   */
  function detectFigurine(node) {
    if (!node) return '';

    const dataFig = node.getAttribute('data-figurine') || node.getAttribute('data-piece') ||
                    node.querySelector('[data-figurine]')?.getAttribute('data-figurine') ||
                    node.querySelector('[data-piece]')?.getAttribute('data-piece');
    if (dataFig) return dataFig.toUpperCase();

    const figEl = node.querySelector('[class*="chess-"], [class*="icon-font-chess"], [class*="figurine"], [class*="knight"], [class*="bishop"], [class*="rook"], [class*="queen"], [class*="king"], [class*="piece"], span[data-piece]') || node;
    const rawClass = typeof figEl.className === 'string' ? figEl.className : (figEl.getAttribute?.('class') || '');
    const classStr = ' ' + rawClass.toLowerCase().replace(/[-_]/g, ' ') + ' ';

    if (classStr.includes(' knight ') || classStr.includes(' chess n ') || classStr.includes(' wn ') || classStr.includes(' bn ') || classStr.includes(' n ')) return 'N';
    if (classStr.includes(' bishop ') || classStr.includes(' chess b ') || classStr.includes(' wb ') || classStr.includes(' bb ') || classStr.includes(' b ')) return 'B';
    if (classStr.includes(' rook ') || classStr.includes(' chess r ') || classStr.includes(' wr ') || classStr.includes(' br ') || classStr.includes(' r ')) return 'R';
    if (classStr.includes(' queen ') || classStr.includes(' chess q ') || classStr.includes(' wq ') || classStr.includes(' bq ') || classStr.includes(' q ')) return 'Q';
    if (classStr.includes(' king ') || classStr.includes(' chess k ') || classStr.includes(' wk ') || classStr.includes(' bk ') || classStr.includes(' k ')) return 'K';

    return '';
  }

  /**
   * Validate if a string is a legitimate Chess SAN move
   */
  function isValidSan(san) {
    if (!san) return false;
    const sanRegex = /^((O-O(-O)?)|([KQRNB]?[a-h]?[1-8]?x?[a-h][1-8](=[QRNB])?))[\+#]?$/;
    return sanRegex.test(san);
  }

  /**
   * Parse single move node into valid Standard Algebraic Notation (SAN)
   */
  function parseMoveSan(node) {
    if (!node) return '';

    const directSan = node.getAttribute('data-san') || node.getAttribute('data-move');
    if (directSan && isValidSan(directSan)) {
      return directSan;
    }

    const fig = detectFigurine(node);

    const clone = node.cloneNode(true);
    // Remove extraneous time badges, clock displays, evaluation badges
    clone.querySelectorAll('.clock-component, .time, .badge, .eval, [data-cy="eval"], .move-time-component, .move-time, [class*="time"], [class*="clock"], [class*="eval"], .icon-font-chess, [class*="icon"]').forEach((el) => el.remove());

    let raw = (clone.textContent || '').trim();

    raw = raw
      .replace(/[\u2654\u265A]/g, 'K')
      .replace(/[\u2655\u265B]/g, 'Q')
      .replace(/[\u2656\u265C]/g, 'R')
      .replace(/[\u2657\u265D]/g, 'B')
      .replace(/[\u2658\u265E]/g, 'N')
      .replace(/[\u2659\u265F]/g, '');

    raw = raw.replace(/^[0-9]+(\.|\s|\.\.\.)+/, '').trim();
    raw = raw.replace(/\([^\)]*\)/g, '').replace(/(\+|-)[0-9]+(\.[0-9]+)?/g, '');
    raw = raw.replace(/[?!]/g, '');
    raw = raw.replace(/[^a-zA-Z0-9+=#xX\-]/g, '').trim();

    // Standardize castling (handles 0-0, 0-0-0, lowercase, and with check/mate)
    raw = raw
      .replace(/^0-0-0([\+#]?)$/i, 'O-O-O$1')
      .replace(/^0-0([\+#]?)$/i, 'O-O$1')
      .replace(/^o-o-o([\+#]?)$/i, 'O-O-O$1')
      .replace(/^o-o([\+#]?)$/i, 'O-O$1');

    if (!raw) return '';

    if (fig && !raw.startsWith('O-O') && !raw.toUpperCase().startsWith(fig) && !/^[KQRNB]/.test(raw)) {
      raw = fig + raw;
    }

    return isValidSan(raw) ? raw : '';
  }

  /**
   * Clean raw username string
   */
  function cleanUsername(raw) {
    if (!raw) return '';
    return raw
      .replace(/\(.*?\)/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .trim();
  }

  /**
   * Extract player names, ratings, and orientation
   */
  function extractPlayerMeta() {
    const usernames = [];

    const getUsernameFromEl = (el) => {
      if (!el) return '';
      const link = el.querySelector('a[href*="/member/"]');
      if (link) {
        const m = (link.getAttribute('href') || '').match(/\/member\/([a-zA-Z0-9_-]+)/);
        if (m && m[1]) return cleanUsername(m[1]);
      }
      const namedEl = el.querySelector('.user-username-component, .user-tagline-username, [data-username], .username');
      if (namedEl) {
        const u = namedEl.getAttribute('data-username') || namedEl.textContent;
        if (u) return cleanUsername(u);
      }
      return cleanUsername(el.innerText?.split(/[\s(]/)[0] || '');
    };

    // Method 1: Extract from board top / bottom player containers
    const topEl = document.querySelector('.board-layout-player-top, .board-layout-top, .player-component.top, .player-component.player-top, [class*="player-top"]');
    const bottomEl = document.querySelector('.board-layout-player-bottom, .board-layout-bottom, .player-component.bottom, .player-component.player-bottom, [class*="player-bottom"]');

    let topName = getUsernameFromEl(topEl);
    let bottomName = getUsernameFromEl(bottomEl);

    // Fallback if specific classes are missing: inspect all player components on page
    if (!topName || !bottomName) {
      const playerComponents = Array.from(document.querySelectorAll('.player-component, .user-tagline-component, [class*="player-row"]'));
      if (playerComponents.length >= 2) {
        if (!topName) topName = getUsernameFromEl(playerComponents[0]);
        if (!bottomName) bottomName = getUsernameFromEl(playerComponents[playerComponents.length - 1]);
      }
    }

    // Method 2: Extract all member profile links on page (href="/member/username")
    document.querySelectorAll('a[href*="/member/"]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const match = href.match(/\/member\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const u = cleanUsername(match[1]);
        if (u && !usernames.includes(u)) {
          usernames.push(u);
        }
      }
    });

    if (bottomName && !usernames.includes(bottomName)) usernames.unshift(bottomName);
    if (topName && !usernames.includes(topName)) usernames.push(topName);

    // Method 3: Logged in user meta tags / headers
    const loggedInEl = document.querySelector('meta[name="user-username"], meta[name="username"], [data-username], .user-nav-username, .nav-menu-user-username, #user-nav [data-username]');
    const loggedInUser = cleanUsername(loggedInEl?.getAttribute('content') || loggedInEl?.getAttribute('data-username') || loggedInEl?.textContent || '');
    if (loggedInUser && !usernames.includes(loggedInUser)) {
      usernames.push(loggedInUser);
    }

    // Method 4: Orientation / Flipped detection
    let isFlipped = document.querySelector('.board.flipped, .board-layout-main.flipped, .board.black, [class*="board-flipped"], wc-chess-board.flipped, chess-board.flipped, [flipped="true"]') !== null;

    if (!isFlipped) {
      // Coordinate geometric check: is Rank 8 lower on screen than Rank 1?
      const coordTexts = Array.from(document.querySelectorAll('.coordinates text, text.coordinate-light, text.coordinate-dark, [class*="coordinate"]'));
      const text8 = coordTexts.find((el) => el.textContent?.trim() === '8');
      const text1 = coordTexts.find((el) => el.textContent?.trim() === '1');
      if (text8 && text1) {
        const rect8 = text8.getBoundingClientRect();
        const rect1 = text1.getBoundingClientRect();
        if (rect8.top > rect1.top) {
          isFlipped = true;
        }
      }
    }

    const targetUser = bottomName || loggedInUser || usernames[0] || '';
    const whiteName = isFlipped ? topName : bottomName || usernames[0] || 'White';
    const blackName = isFlipped ? bottomName : topName || usernames[1] || 'Black';

    return {
      whiteName,
      blackName,
      isFlipped,
      usernames,
      targetUser
    };
  }

  /**
   * Format full PGN with standard headers and move sequence
   */
  function formatPgnString(movesList) {
    if (!movesList || movesList.length === 0) return '';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    const meta = extractPlayerMeta();
    const headers = [
      `[Event "Chess.com Game"]`,
      `[Site "Chess.com"]`,
      `[Date "${dateStr}"]`,
      `[White "${meta.whiteName}"]`,
      `[Black "${meta.blackName}"]`,
      `[Result "*"]`
    ].join('\n');

    let moveText = '';
    for (let i = 0; i < movesList.length; i++) {
      if (i % 2 === 0) {
        const moveNum = Math.floor(i / 2) + 1;
        moveText += `${moveNum}. ${movesList[i]} `;
      } else {
        moveText += `${movesList[i]} `;
      }
    }

    return `${headers}\n\n${moveText.trim()}`;
  }

  /**
   * Extract moves from Chess.com DOM move list
   */
  function extractPgnFromDOM() {
    const extractSanFromElement = parseMoveSan;
    // Strategy 1: Move list container with single move elements (.node, .move-node)
    const moveNodes = Array.from(
      document.querySelectorAll(
        'wc-simple-move-list .node, .move-list .node, .move-list-component .node, [data-whole-move-number] .node, .move-node'
      )
    );

    if (moveNodes.length > 0) {
      const moves = moveNodes
        .map((n) => extractSanFromElement(n))
        .filter((m) => m && isValidSan(m));

      if (moves.length > 0) {
        return formatPgnString(moves);
      }
    }

    // Strategy 2: Move list rows containing white / black move columns
    const moveRows = Array.from(
      document.querySelectorAll(
        'wc-move-list-row, .move-list-row, .move-row, tr.move-row, .vertical-move-list .row'
      )
    );

    if (moveRows.length > 0) {
      const moves = [];
      for (const row of moveRows) {
        const whiteMoveEl = row.querySelector('.white.node, .white-move, .move:first-of-type, [data-color="w"], div:nth-child(2)');
        const blackMoveEl = row.querySelector('.black.node, .black-move, .move:last-of-type, [data-color="b"], div:nth-child(3)');

        const wSan = extractSanFromElement(whiteMoveEl);
        if (wSan && isValidSan(wSan)) moves.push(wSan);

        const bSan = extractSanFromElement(blackMoveEl);
        if (bSan && isValidSan(bSan)) moves.push(bSan);
      }

      if (moves.length > 0) {
        return formatPgnString(moves);
      }
    }

    // Strategy 3: Text content regex matching from full move list container
    const moveListContainer = document.querySelector(
      'wc-simple-move-list, .move-list, .move-list-component, .vertical-move-list, [class*="move-list"]'
    );

    if (moveListContainer) {
      const text = moveListContainer.innerText || '';
      const tokens = text.split(/\s+/);
      const moves = [];

      for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i].trim();
        if (/^\d+\.+$/.test(token) || !token) continue;
        token = token.replace(/^\d+\.+/, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
        if (isValidSan(token)) {
          moves.push(token);
        }
      }

      if (moves.length > 0) {
        return formatPgnString(moves);
      }
    }

    return '';
  }

  /**
   * Extract game ID from current URL
   */
  function extractGameIdFromUrl() {
    const match = window.location.pathname.match(/(?:game\/(?:live|daily)|game|analysis\/game\/(?:live|daily))\/(\d+)/) ||
                  window.location.href.match(/[?&#]g=(\d+)/) ||
                  window.location.pathname.match(/\/(\d+)(?:\?|$)/);
    return match ? match[1] : null;
  }

  /**
   * Fetch official PGN via background service worker
   */
  function fetchPgnViaBackgroundWorker(usernames, gameId) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          {
            type: 'FETCH_CHESSCOM_PGN',
            usernames: usernames,
            gameId: gameId
          },
          (response) => {
            if (response && response.success && response.pgn) {
              resolve(response.pgn);
            } else {
              resolve('');
            }
          }
        );
      } else {
        resolve('');
      }
    });
  }

  let activePostMessageTimers = [];
  const clearActiveTimers = () => {
    activePostMessageTimers.forEach((t) => clearTimeout(t));
    activePostMessageTimers = [];
  };

  /**
   * Opens or updates the slide-over sidebar drawer
   */
  async function handleSabioReviewClick() {
    let sidebar = document.getElementById(SIDEBAR_ID);
    const meta = extractPlayerMeta();
    const gameId = extractGameIdFromUrl();

    // 1. Synchronously extract DOM PGN as immediate fallback
    let pgn = extractPgnFromDOM();

    const buildUrl = (targetPgn) => {
      updateTargetUrl();
      const params = new URLSearchParams();
      if (targetPgn) params.set('pgn', targetPgn);
      if (meta.isFlipped) params.set('flip', 'true');
      if (meta.targetUser) params.set('user', meta.targetUser);
      params.set('autoAnalyze', 'true');
      params.set('source', 'chesscom_extension');
      return `${sabioBaseUrl}/?${params.toString()}`;
    };

    const sendPostMessage = (customPgn) => {
      const pgnToSend = customPgn || pgn;
      const iframe = document.getElementById('sabiochess-iframe');

      if (iframe && iframe.contentWindow && pgnToSend) {
        iframe.contentWindow.postMessage(
          {
            type: 'LOAD_PGN',
            pgn: pgnToSend,
            flip: meta.isFlipped,
            user: meta.targetUser,
            targetUser: meta.targetUser,
            autoAnalyze: true
          },
          '*'
        );
      }
    };

    if (!sidebar) {
      sidebar = document.createElement('div');
      sidebar.id = SIDEBAR_ID;
      sidebar.innerHTML = `
        <div class="sabiochess-sidebar-header">
          <div class="sabiochess-sidebar-actions">
            <button class="sabiochess-header-btn" id="sabiochess-expand-btn" title="Toggle wider sidebar">⇲</button>
            <button class="sabiochess-header-btn" id="sabiochess-open-tab" title="Open full tab">↗</button>
            <button class="sabiochess-header-btn" id="sabiochess-close-btn" title="Close">✕</button>
          </div>
        </div>
        <iframe class="sabiochess-iframe" id="sabiochess-iframe" src="${buildUrl(pgn)}" allow="clipboard-read; clipboard-write"></iframe>
      `;

      document.body.appendChild(sidebar);

      sidebar.querySelector('#sabiochess-close-btn')?.addEventListener('click', () => {
        sidebar?.classList.remove('open');
      });

      sidebar.querySelector('#sabiochess-expand-btn')?.addEventListener('click', () => {
        sidebar?.classList.toggle('expanded');
      });

      sidebar.querySelector('#sabiochess-open-tab')?.addEventListener('click', () => {
        const currentPgn = pgn || extractPgnFromDOM();
        window.open(buildUrl(currentPgn), '_blank');
      });

      const iframe = sidebar.querySelector('#sabiochess-iframe');
      if (iframe) {
        iframe.addEventListener('load', () => {
          sendPostMessage(undefined);
          clearActiveTimers();
          activePostMessageTimers.push(setTimeout(() => sendPostMessage(undefined), 300));
          activePostMessageTimers.push(setTimeout(() => sendPostMessage(undefined), 800));
        });
      }
    } else {
      const iframe = sidebar.querySelector('#sabiochess-iframe');
      if (iframe) {
        sendPostMessage(undefined);
        clearActiveTimers();
        activePostMessageTimers.push(setTimeout(() => sendPostMessage(undefined), 300));
      }
    }

    // Open sidebar animation
    requestAnimationFrame(() => {
      sidebar?.classList.add('open');
    });

    // 2. Fetch official PGN in background by querying user archives in last 30 days
    if (meta.usernames.length > 0 || gameId) {
      fetchPgnViaBackgroundWorker(meta.usernames, gameId).then((officialPgn) => {
        if (officialPgn && officialPgn.trim().length > 0) {
          pgn = officialPgn;
          clearActiveTimers();
          sendPostMessage(officialPgn);
        }
      });
    }
  }

  // Listen for acknowledgments from SabioChess App
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SABIO_PGN_LOADED') {
      clearActiveTimers();
    }
  });

  /**
   * Observer & interval polling loop
   */
  function init() {
    const observer = new MutationObserver(() => {
      checkAndInjectButton();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    checkAndInjectButton();
    setInterval(checkAndInjectButton, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
