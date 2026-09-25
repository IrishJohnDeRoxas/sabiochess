/**
 * SabioChess Chrome Extension - Content Script
 * Supports one-click instant Stockfish review and slide-over sidebar for:
 * 1. Chess.com
 * 2. Lichess.org
 */

(function () {
  'use strict';

  const SABIO_BUTTON_ID = 'sabiochess-review-injected-btn';
  const SIDEBAR_ID = 'sabiochess-sidebar-container';

  // Base URL for SabioChess (Defaults to Production https://sabiochess.com)
  const PROD_URL = 'https://sabiochess.com';
  const FALLBACK_URL = 'https://sabiochess.irishjohnderoxas.workers.dev';
  let sabioBaseUrl = PROD_URL;

  // Health check cache: avoid re-pinging on every action
  let _healthCacheResult = null;
  let _healthCacheTime = 0;
  const HEALTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const isLichess = window.location.hostname.includes('lichess.org');
  const isChessCom = window.location.hostname.includes('chess.com');

  /**
   * Resolve the best available SabioChess URL (prod or fallback).
   */
  function resolveBaseUrl() {
    try {
      const stored = localStorage.getItem('sabiochess_target_url');
      if (stored && typeof stored === 'string' && stored.trim().length > 0) {
        sabioBaseUrl = stored.trim().replace(/\/+$/, '');
        return Promise.resolve(sabioBaseUrl);
      }
    } catch {}

    if (_healthCacheResult !== null && Date.now() - _healthCacheTime < HEALTH_CACHE_TTL) {
      sabioBaseUrl = _healthCacheResult;
      return Promise.resolve(sabioBaseUrl);
    }

    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'HEALTH_CHECK', url: PROD_URL }, (response) => {
          const available = response && response.available;
          _healthCacheResult = available ? PROD_URL : FALLBACK_URL;
          _healthCacheTime = Date.now();
          sabioBaseUrl = _healthCacheResult;
          if (!available) {
            console.log('[SabioChess] Prod unavailable, using fallback:', FALLBACK_URL);
          }
          resolve(sabioBaseUrl);
        });
      } else {
        sabioBaseUrl = PROD_URL;
        resolve(sabioBaseUrl);
      }
    });
  }

  function updateTargetUrl() {
    let target = PROD_URL;
    try {
      const stored = localStorage.getItem('sabiochess_target_url');
      if (stored && typeof stored === 'string' && stored.trim().length > 0) {
        target = stored.trim().replace(/\/+$/, '');
      }
    } catch {}

    sabioBaseUrl = target;
    return sabioBaseUrl;
  }

  updateTargetUrl();
  resolveBaseUrl();

  window.addEventListener('storage', (e) => {
    if (e.key === 'sabiochess_target_url') {
      const newUrl = updateTargetUrl();
      console.log('[SabioChess] Target URL updated:', newUrl);
    }
  });

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SABIO_SET_TARGET_URL') {
      sabioBaseUrl = event.data.url ? event.data.url.trim().replace(/\/+$/, '') : PROD_URL;
      console.log('[SabioChess] Target URL updated via message:', sabioBaseUrl);
    }
  });

  window.__setSabioUrl = (url) => {
    if (url) {
      localStorage.setItem('sabiochess_target_url', url);
      sabioBaseUrl = url.trim().replace(/\/+$/, '');
      console.log('[SabioChess] Target URL set to:', sabioBaseUrl);
    } else {
      localStorage.removeItem('sabiochess_target_url');
      sabioBaseUrl = PROD_URL;
      console.log('[SabioChess] Target URL reset to default:', PROD_URL);
    }
  };

  /**
   * Validate if a string is a legitimate Chess SAN move
   */
  function isValidSan(san) {
    if (!san) return false;
    const sanRegex = /^((O-O(-O)?)|([KQRNB]?[a-h]?[1-8]?x?[a-h][1-8](=[QRNB])?))[\+#]?$/;
    return sanRegex.test(san);
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
   * Creates the signature Neubrutalist Sabio Review Button element
   */
  function createSabioButton(isFloating, onClickHandler, extraClass = '') {
    const sabioBtn = document.createElement('button');
    sabioBtn.id = SABIO_BUTTON_ID;
    const baseClass = isFloating ? 'sabiochess-review-btn sabiochess-review-btn--floating' : 'sabiochess-review-btn';
    sabioBtn.className = extraClass ? `${baseClass} ${extraClass}` : baseClass;
    sabioBtn.type = 'button';
    sabioBtn.title = 'Open instant Stockfish analysis on SabioChess';
    sabioBtn.innerHTML = `
      <div class="sabiochess-logo-badge">
        <svg viewBox="0 0 45 45" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(0, -1.5)">
            <path d="M22.5 7.5 C20 7.5 18 9.5 18 12 C18 13.1 18.4 14.1 19 14.9 C16.8 16.2 15.5 18.5 15.5 21.2 C15.5 23.4 16.5 25.3 18.1 26.6 C14.8 27.8 10 32.5 10 40.5 L35 40.5 C35 32.5 30.2 27.8 26.9 26.6 C28.5 25.3 29.5 23.4 29.5 21.2 C29.5 18.5 28.2 16.2 26 14.9 C26.6 14.1 27 13.1 27 12 C27 9.5 25 7.5 22.5 7.5 Z" fill="#FFFFFF" stroke="#222222" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
            <line x1="12" y1="39" x2="33" y2="39" stroke="#222222" stroke-width="2" stroke-linecap="round"/>
          </g>
        </svg>
      </div>
      <span class="sabiochess-btn-text">REVIEW ON SABIO<span class="sabiochess-text-orange">CHESS</span></span>
    `;

    sabioBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClickHandler();
    });

    return sabioBtn;
  }

  const EXTENSION_SETTINGS_KEY = 'sabiochess_extension_settings_v2';

  function saveExtensionSettings(settings) {
    if (!settings || typeof settings !== 'object') return;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.set({ [EXTENSION_SETTINGS_KEY]: settings });
      } catch {}
    }
    try {
      localStorage.setItem(EXTENSION_SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }

  function getExtensionSettings(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.get([EXTENSION_SETTINGS_KEY], (res) => {
          if (res && res[EXTENSION_SETTINGS_KEY]) {
            callback(res[EXTENSION_SETTINGS_KEY]);
            return;
          }
          fallbackLocal();
        });
        return;
      } catch {}
    }
    fallbackLocal();

    function fallbackLocal() {
      try {
        const raw = localStorage.getItem(EXTENSION_SETTINGS_KEY);
        if (raw) {
          callback(JSON.parse(raw));
          return;
        }
      } catch {}
      callback(null);
    }
  }

  function syncSettingsToIframe(iframe) {
    if (!iframe || !iframe.contentWindow) return;
    getExtensionSettings((settings) => {
      if (settings && iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: 'SABIO_APPLY_SETTINGS',
            settings: settings
          },
          '*'
        );
      }
    });
  }

  let activeSidebarPgn = '';
  let activeSidebarMeta = null;
  let activePostMessageTimers = [];

  const clearActiveTimers = () => {
    activePostMessageTimers.forEach((t) => clearTimeout(t));
    activePostMessageTimers = [];
  };

  const sendActivePostMessage = () => {
    const iframe = document.getElementById('sabiochess-iframe');
    if (iframe && iframe.contentWindow && activeSidebarPgn) {
      iframe.contentWindow.postMessage(
        {
          type: 'LOAD_PGN',
          pgn: activeSidebarPgn,
          flip: Boolean(activeSidebarMeta && activeSidebarMeta.isFlipped),
          user: activeSidebarMeta?.targetUser || '',
          targetUser: activeSidebarMeta?.targetUser || '',
          autoAnalyze: true
        },
        '*'
      );
    }
  };

  const queueSendRetries = () => {
    clearActiveTimers();
    [0, 150, 400, 800, 1500, 2500, 4000].forEach((delay) => {
      activePostMessageTimers.push(setTimeout(sendActivePostMessage, delay));
    });
  };

  /**
   * Opens or updates the slide-over sidebar drawer with the game
   */
  async function openSabioSidebar({ initialPgn, meta, gameId, platform, fetchOfficialPgnFn }) {
    updateTargetUrl();
    await resolveBaseUrl();

    let sidebar = document.getElementById(SIDEBAR_ID);
    activeSidebarPgn = initialPgn || '';
    activeSidebarMeta = meta || null;

    const buildUrl = (targetPgn) => {
      const params = new URLSearchParams();
      if (targetPgn) params.set('pgn', targetPgn);
      if (meta && meta.isFlipped) params.set('flip', 'true');
      if (meta && meta.targetUser) params.set('user', meta.targetUser);
      params.set('autoAnalyze', 'true');
      params.set('source', `${platform}_extension`);
      return `${sabioBaseUrl}/?${params.toString()}`;
    };

    const targetUrl = buildUrl(activeSidebarPgn);

    if (!sidebar) {
      sidebar = document.createElement('div');
      sidebar.id = SIDEBAR_ID;
      sidebar.innerHTML = `
        <div class="sabiochess-sidebar-header">
          <div class="sabiochess-sidebar-actions">
            <button class="sabiochess-header-btn" id="sabiochess-expand-btn" title="Expand sidebar width">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
            <button class="sabiochess-header-btn" id="sabiochess-open-tab" title="Open in new tab">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </button>
            <button class="sabiochess-header-btn" id="sabiochess-close-btn" title="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <iframe class="sabiochess-iframe" id="sabiochess-iframe" src="${targetUrl}" allow="clipboard-read; clipboard-write"></iframe>
      `;

      document.body.appendChild(sidebar);

      sidebar.querySelector('#sabiochess-close-btn')?.addEventListener('click', () => {
        sidebar?.classList.remove('open');
      });

      sidebar.querySelector('#sabiochess-expand-btn')?.addEventListener('click', () => {
        const isExpanded = sidebar?.classList.toggle('expanded');
        const expandBtn = sidebar?.querySelector('#sabiochess-expand-btn');
        if (expandBtn) {
          expandBtn.title = isExpanded ? 'Collapse sidebar' : 'Expand sidebar width';
          expandBtn.innerHTML = isExpanded
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
        }
      });

      sidebar.querySelector('#sabiochess-open-tab')?.addEventListener('click', () => {
        window.open(buildUrl(activeSidebarPgn), '_blank');
      });

      const iframe = sidebar.querySelector('#sabiochess-iframe');
      if (iframe) {
        iframe.addEventListener('load', () => {
          syncSettingsToIframe(iframe);
          queueSendRetries();
        });
      }
    } else {
      const iframe = sidebar.querySelector('#sabiochess-iframe');
      if (iframe) {
        if (!iframe.src || iframe.src !== targetUrl) {
          iframe.src = targetUrl;
        } else {
          syncSettingsToIframe(iframe);
          queueSendRetries();
        }
      }
    }

    queueSendRetries();

    // Slide-in animation
    requestAnimationFrame(() => {
      sidebar?.classList.add('open');
    });

    // Asynchronously fetch official PGN via background worker
    if (typeof fetchOfficialPgnFn === 'function') {
      fetchOfficialPgnFn().then((officialPgn) => {
        if (officialPgn && officialPgn.trim().length > 0) {
          activeSidebarPgn = officialPgn;
          queueSendRetries();
        }
      });
    }
  }

  // Listen for acknowledgments, ready state, and settings changes from SabioChess App
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'SABIO_PGN_LOADED') {
      clearActiveTimers();
    } else if (event.data.type === 'SABIO_READY') {
      const iframe = document.getElementById('sabiochess-iframe');
      if (iframe) {
        syncSettingsToIframe(iframe);
      }
      sendActivePostMessage();
    } else if (event.data.type === 'SABIO_SETTINGS_CHANGED' && event.data.settings) {
      saveExtensionSettings(event.data.settings);
    }
  });

  /* ==========================================================================
     LICHESS.ORG ADAPTER
     ========================================================================== */
  const LichessAdapter = {
    isInjecting: false,

    STATIC_ROUTES: new Set([
      'analysis', 'training', 'practice', 'broadcast', 'streamer',
      'tournament', 'inbox', 'account', 'editor', 'paste', 'learn',
      'patron', 'teams', 'team', 'forum', 'blog', 'video', 'swiss',
      'simul', 'streak', 'storm', 'racer', 'coach', 'games', 'player',
      'page', 'insights', 'tv'
    ]),

    extractGameId() {
      const pathname = window.location.pathname;
      const segments = pathname.split('/').filter(Boolean);
      if (!segments.length) return null;

      // Handle /analysis/standard/6nyeBPlN or /analysis/6nyeBPlN
      if (segments[0] === 'analysis') {
        const candidate = segments[segments.length - 1];
        if (candidate && candidate.length >= 8 && candidate !== 'analysis' && candidate !== 'standard') {
          return candidate.slice(0, 8);
        }
      }

      // Handle /{gameId} or /{gameId}/white or /{gameId}/black
      const firstSegment = segments[0];
      if (firstSegment && firstSegment.length >= 8 && !this.STATIC_ROUTES.has(firstSegment.toLowerCase())) {
        return firstSegment.slice(0, 8);
      }

      // Match 8-char base58 id in URL
      const match = pathname.match(/\/([a-zA-Z0-9]{8})(?:[/?#]|$)/);
      if (match && !this.STATIC_ROUTES.has(match[1].toLowerCase())) {
        return match[1];
      }

      return null;
    },

    detectGameOverState() {
      // 1. Active play indicators (resign/draw buttons by ARIA, data attributes, actions)
      const isPlaying = document.querySelector(
        '[data-act="resign"], [data-act="draw"], [aria-label*="resign" i], [aria-label*="draw" i], .rcontrols .resign, button.resign, .force-resign, .round__app.playing, main.round.playing'
      );
      if (isPlaying && isPlaying.offsetParent !== null) return false;

      // 2. Post-game action links (functional URLs: rematch, new game, analysis)
      const postGameAction = document.querySelector(
        'a[href*="/analysis"], a[href*="/rematch"], a[href*="/new-opponent"], a.analysis, .follow-up, .round__app.finished, main.round.finished'
      );
      if (postGameAction && postGameAction.offsetParent !== null) return true;

      // 3. Analysis pages
      const pathname = window.location.pathname;
      if (pathname.startsWith('/analysis')) return true;

      // 4. Game outcome text indicators
      const resultEl = document.querySelector('.rcontrols .result, .result-wrap, .status, p.status, .game__meta .status, .game__meta, [data-result]');
      if (resultEl) {
        const text = (resultEl.textContent || '').trim();
        const resultPatterns = /\b(1-0|0-1|1\/2-1\/2|½-½|victorious|checkmate|resigned|timeout|time\s*out|draw|stalemate|time\s*forfeit|game\s*over)\b/i;
        if (resultPatterns.test(text)) return true;
      }

      return false;
    },

    findBoardElement() {
      const selectors = ['cg-board', 'cg-container', '.cg-wrap', 'main.round', 'main.analyse', '.round__app'];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) return el;
      }
      return null;
    },

    findInjectionTarget() {
      if (!this.detectGameOverState()) return null;

      const isSabio = (el) => el.id === SABIO_BUTTON_ID || el.closest(`#${SABIO_BUTTON_ID}`);
      const isVisible = (el) => el && el.offsetParent !== null;

      // 1. Inside .follow-up container (Game Over action panel on right side)
      const followUp = document.querySelector('.follow-up, .rcontrols .follow-up, .round__side .follow-up, .round__app .follow-up');
      if (followUp && isVisible(followUp)) {
        const buttons = Array.from(followUp.querySelectorAll('a, button, .fbt')).filter((el) => !isSabio(el));
        const analysisBtn = buttons.find((el) => {
          const text = (el.textContent || '').trim().toLowerCase();
          const href = el.getAttribute('href') || '';
          return text.includes('analysis') || el.classList.contains('analysis') || href.includes('analysis');
        });

        if (analysisBtn) {
          return { element: analysisBtn, placement: 'afterend' };
        }

        if (buttons.length > 0) {
          return { element: buttons[buttons.length - 1], placement: 'afterend' };
        }

        return { element: followUp, placement: 'appendChild' };
      }

      // 2. Buttons in right side controls matching "Analysis board", "Rematch", or "New opponent"
      const candidateBtns = Array.from(document.querySelectorAll('.round__side a, .round__side button, .rcontrols a, .rcontrols button, a.fbt, button.fbt, a.analysis'));
      const foundBtn = candidateBtns.find((el) => {
        if (isSabio(el) || !isVisible(el)) return false;
        const text = (el.textContent || '').trim().toLowerCase();
        return text.includes('analysis board') || text.includes('analysis') || text.includes('rematch') || text.includes('opponent');
      });
      if (foundBtn) {
        return { element: foundBtn, placement: 'afterend' };
      }

      // 3. Analysis page tools panel (/analysis/...)
      const analyseControls = document.querySelector('.analyse__tools .analyse__controls, .analyse__side .analyse__tools, .analyse__controls, .analyse__side');
      if (analyseControls && isVisible(analyseControls)) {
        return { element: analyseControls, placement: 'appendChild' };
      }

      // 4. Side controls fallback (only when game is finished)
      const sideControls = document.querySelector('.round__side .rcontrols, .round__side, .rcontrols, .round__underboard');
      if (sideControls && isVisible(sideControls)) {
        return { element: sideControls, placement: 'appendChild' };
      }

      return null;
    },

    extractPlayerMeta() {
      const usernames = [];

      const getUsernameFromEl = (el) => {
        if (!el) return '';
        const link = el.querySelector('a.user-link, a[href^="/@/"]');
        if (link) {
          const href = link.getAttribute('href') || '';
          const m = href.match(/\/@\/([a-zA-Z0-9_-]+)/);
          if (m && m[1]) return cleanUsername(m[1]);
          return cleanUsername(link.textContent || '');
        }
        return cleanUsername(el.textContent || '');
      };

      const topEl = document.querySelector('.ruser-top, .ruser.top, .player.top, [class*="player-top"]');
      const bottomEl = document.querySelector('.ruser-bottom, .ruser.bottom, .player.bottom, [class*="player-bottom"]');

      let topName = getUsernameFromEl(topEl);
      let bottomName = getUsernameFromEl(bottomEl);

      // Logged-in user in navigation
      const loggedInEl = document.querySelector('#user_tag, a#user_tag, [data-user], #dasher_app .user-link');
      const loggedInUser = cleanUsername(
        loggedInEl?.getAttribute('data-user') ||
        document.body.getAttribute('data-user') ||
        loggedInEl?.textContent ||
        ''
      );

      // Orientation detection
      let isFlipped = document.querySelector(
        'cg-wrap.orientation-black, .orientation-black, cg-board.black, .is2d.black, [class*="black-orientation"]'
      ) !== null;

      if (!isFlipped) {
        const rankTexts = Array.from(document.querySelectorAll('.ranks text, .ranks coord, coord.rank'));
        if (rankTexts.length > 0) {
          const firstRank = rankTexts[0].textContent?.trim();
          if (firstRank === '1') isFlipped = true;
        }
      }

      if (bottomName && !usernames.includes(bottomName)) usernames.push(bottomName);
      if (topName && !usernames.includes(topName)) usernames.push(topName);
      if (loggedInUser && !usernames.includes(loggedInUser)) usernames.push(loggedInUser);

      const targetUser = bottomName || loggedInUser || usernames[0] || '';
      const whiteName = isFlipped ? topName || 'White' : bottomName || usernames[0] || 'White';
      const blackName = isFlipped ? bottomName || 'Black' : topName || usernames[1] || 'Black';

      return {
        whiteName,
        blackName,
        isFlipped,
        usernames,
        targetUser
      };
    },

    extractPgnFromDOM() {
      const moveNodes = Array.from(
        document.querySelectorAll(
          'rmoves u8t, rmoves move, tview2 move, tview2 u8t, .analyse__moves move, .analyse__moves u8t, .round__app u8t, .round__app move, .rreplay u8t, u8t, [data-san], [data-ply]'
        )
      );

      const moves = [];
      for (const node of moveNodes) {
        const directSan = node.getAttribute('data-san');
        if (directSan && isValidSan(directSan)) {
          moves.push(directSan);
          continue;
        }

        const clone = node.cloneNode(true);
        clone.querySelectorAll('eval, time, index, c3t, .c3t, [class*="eval"], [class*="time"], [class*="glyph"]').forEach((el) => el.remove());
        let text = (clone.textContent || '').trim();
        text = text.replace(/^[0-9]+(\.|\s|\.\.\.)+/, '').trim();
        text = text.replace(/[^a-zA-Z0-9+=#xX\-]/g, '').trim();

        if (text) {
          text = text
            .replace(/^0-0-0([\+#]?)$/i, 'O-O-O$1')
            .replace(/^0-0([\+#]?)$/i, 'O-O$1');
        }

        if (isValidSan(text)) {
          moves.push(text);
        }
      }

      if (moves.length === 0) return '';

      const meta = this.extractPlayerMeta();
      const gameId = this.extractGameId();
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

      const headers = [
        `[Event "Lichess Game"]`,
        `[Site "https://lichess.org/${gameId || ''}"]`,
        `[Date "${dateStr}"]`,
        `[White "${meta.whiteName}"]`,
        `[Black "${meta.blackName}"]`,
        `[Result "*"]`
      ].join('\n');

      let moveText = '';
      for (let i = 0; i < moves.length; i++) {
        if (i % 2 === 0) {
          const moveNum = Math.floor(i / 2) + 1;
          moveText += `${moveNum}. ${moves[i]} `;
        } else {
          moveText += `${moves[i]} `;
        }
      }

      return `${headers}\n\n${moveText.trim()}`;
    },

    fetchOfficialPgn(gameId, usernames) {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage(
            {
              type: 'FETCH_LICHESS_PGN',
              platform: 'lichess',
              gameId: gameId,
              usernames: usernames
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
    },

    handleReviewClick() {
      const meta = this.extractPlayerMeta();
      const gameId = this.extractGameId();
      const domPgn = this.extractPgnFromDOM();

      openSabioSidebar({
        initialPgn: domPgn,
        meta: meta,
        gameId: gameId,
        platform: 'lichess',
        fetchOfficialPgnFn: () => this.fetchOfficialPgn(gameId, meta.usernames)
      });
    },

    checkAndInject() {
      if (this.isInjecting) return;

      const targetInfo = this.findInjectionTarget();
      const existing = document.getElementById(SABIO_BUTTON_ID);

      if (!targetInfo) {
        if (this.detectGameOverState()) {
          if (existing && existing.classList.contains('sabiochess-review-btn--floating')) return;
          if (existing) existing.remove();

          const board = this.findBoardElement();
          if (!board) return;

          try {
            this.isInjecting = true;
            const sabioBtn = createSabioButton(true, () => this.handleReviewClick(), 'sabiochess-review-btn--lichess');
            const boardRect = board.getBoundingClientRect();
            sabioBtn.style.position = 'fixed';
            sabioBtn.style.bottom = `${Math.max(window.innerHeight - boardRect.bottom + 8, 16)}px`;
            sabioBtn.style.right = `${Math.max(window.innerWidth - boardRect.right, 16)}px`;
            document.body.appendChild(sabioBtn);
          } finally {
            this.isInjecting = false;
          }
        } else {
          if (existing) existing.remove();
        }
        return;
      }

      const { element: targetEl, placement } = targetInfo;

      if (existing) {
        if (existing.classList.contains('sabiochess-review-btn--floating')) {
          existing.remove();
        } else {
          const sameParent = existing.parentElement === targetEl.parentElement;
          if (sameParent) return;
        }
      }

      try {
        this.isInjecting = true;
        const existingAgain = document.getElementById(SABIO_BUTTON_ID);
        if (existingAgain) existingAgain.remove();

        const sabioBtn = createSabioButton(false, () => this.handleReviewClick(), 'sabiochess-review-btn--lichess');

        if (placement === 'afterend') {
          targetEl.insertAdjacentElement('afterend', sabioBtn);
        } else if (placement === 'prepend') {
          targetEl.prepend(sabioBtn);
        } else {
          targetEl.appendChild(sabioBtn);
        }
      } catch {
        targetEl.parentElement?.appendChild(createSabioButton(false, () => this.handleReviewClick(), 'sabiochess-review-btn--lichess'));
      } finally {
        this.isInjecting = false;
      }
    }
  };

  /* ==========================================================================
     CHESS.COM ADAPTER
     ========================================================================== */
  const ChessComAdapter = {
    isInjecting: false,

    findGameReviewElement() {
      const isSabio = (el) => el.id === SABIO_BUTTON_ID || el.closest(`#${SABIO_BUTTON_ID}`);
      const isVisible = (el) => el.offsetParent !== null;
      const allCandidates = [];

      const semanticSelectors = [
        '[data-cy="game-review-button"]',
        '[data-cy="game-over-review-button"]',
        '[aria-label="Game Review"]'
      ];
      for (const sel of semanticSelectors) {
        document.querySelectorAll(sel).forEach((el) => {
          if (!isSabio(el) && isVisible(el) && !allCandidates.includes(el)) allCandidates.push(el);
        });
      }

      document.querySelectorAll('button, a, [role="button"]').forEach((el) => {
        if (isSabio(el) || !isVisible(el) || allCandidates.includes(el)) return;
        if (el.children.length > 4) return;
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        if (text === 'game review' || text === 'review game') {
          const btn = el.closest('button, a, [role="button"], .ui_v5-button-component') || el;
          if (!allCandidates.includes(btn)) allCandidates.push(btn);
        }
      });

      document.querySelectorAll('a[href*="/game-review/"]').forEach((link) => {
        if (!isSabio(link) && isVisible(link) && !allCandidates.includes(link)) allCandidates.push(link);
      });

      const classSelectors = [
        '.game-review-buttons-component button',
        '.game-review-buttons-component a',
        '.game-review-button',
        '.game-over-buttons-component button',
        '.daily-game-footer .game-review-button',
        '.live-game-buttons-game-over button'
      ];
      for (const sel of classSelectors) {
        document.querySelectorAll(sel).forEach((el) => {
          if (!isSabio(el) && isVisible(el) && !allCandidates.includes(el)) allCandidates.push(el);
        });
      }

      if (allCandidates.length === 0) return null;

      const inSidebar = (el) => el.closest('.sidebar-view, .game-review-buttons-component, .game-review-emphasis-component');
      const inModal = (el) => el.closest('[class*="game-over-modal"], [class*="game-over"]');

      const sidebarHit = allCandidates.find((el) => inSidebar(el) && !inModal(el));
      if (sidebarHit) return sidebarHit;

      const nonModalHit = allCandidates.find((el) => !inModal(el));
      if (nonModalHit) return nonModalHit;

      return allCandidates[0];
    },

    detectGameOverState() {
      // 1. If actively playing (resign button visible), NOT game over
      const isPlaying = document.querySelector(
        '[data-cy="resign-button"], button[aria-label="Resign"], .resign-button-component, .live-game-buttons-component:not(.live-game-buttons-game-over)'
      );
      if (isPlaying && isPlaying.offsetParent !== null) return false;

      // 2. Official Game Review button exists (only rendered when game is over)
      if (this.findGameReviewElement()) return true;

      // 3. Game over modal, game over dialog or header
      if (document.querySelector('[class*="game-over-modal"], [class*="game-over-dialog"], .game-over-buttons-component, [data-cy="game-over-header"]')) {
        return true;
      }

      const isGamePage = /\/game\/(live\/|daily\/)?\d+/.test(window.location.pathname);
      if (!isGamePage) return false;

      // 4. Game outcome / result indicators
      const resultEl = document.querySelector('.game-result, [data-cy="game-over-header"], .header-title-component, .game-over-header');
      if (resultEl) {
        const text = (resultEl.textContent || '').trim();
        const resultPatterns = /\b(1-0|0-1|1\/2-1\/2|½-½|won|lost|checkmate|resigned|timeout|time\s*out|draw|stalemate|game\s*over)\b/i;
        if (resultPatterns.test(text)) return true;
      }

      return false;
    },

    findBoardElement() {
      const selectors = ['wc-chess-board', 'chess-board', '#board-single', '#board-vs-personalities', '[class*="board-layout-main"]', '[class*="board"]'];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) return el;
      }
      return null;
    },

    detectFigurine(node) {
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
    },

    parseMoveSan(node) {
      if (!node) return '';

      const directSan = node.getAttribute('data-san') || node.getAttribute('data-move');
      if (directSan && isValidSan(directSan)) {
        return directSan;
      }

      const fig = this.detectFigurine(node);
      const clone = node.cloneNode(true);
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
    },

    extractPlayerMeta() {
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

      const topEl = document.querySelector('.board-layout-player-top, .board-layout-top, .player-component.top, .player-component.player-top, [class*="player-top"]');
      const bottomEl = document.querySelector('.board-layout-player-bottom, .board-layout-bottom, .player-component.bottom, .player-component.player-bottom, [class*="player-bottom"]');

      let topName = getUsernameFromEl(topEl);
      let bottomName = getUsernameFromEl(bottomEl);

      if (!topName || !bottomName) {
        const playerComponents = Array.from(document.querySelectorAll('.player-component, .user-tagline-component, [class*="player-row"]'));
        if (playerComponents.length >= 2) {
          if (!topName) topName = getUsernameFromEl(playerComponents[0]);
          if (!bottomName) bottomName = getUsernameFromEl(playerComponents[playerComponents.length - 1]);
        }
      }

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

      const loggedInEl = document.querySelector('meta[name="user-username"], meta[name="username"], [data-username], .user-nav-username, .nav-menu-user-username, #user-nav [data-username]');
      const loggedInUser = cleanUsername(loggedInEl?.getAttribute('content') || loggedInEl?.getAttribute('data-username') || loggedInEl?.textContent || '');
      if (loggedInUser && !usernames.includes(loggedInUser)) {
        usernames.push(loggedInUser);
      }

      let isFlipped = document.querySelector('.board.flipped, .board-layout-main.flipped, .board.black, [class*="board-flipped"], wc-chess-board.flipped, chess-board.flipped, [flipped="true"]') !== null;

      if (!isFlipped) {
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
    },

    formatPgnString(movesList) {
      if (!movesList || movesList.length === 0) return '';
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
      const meta = this.extractPlayerMeta();
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
    },

    extractPgnFromDOM() {
      const moveNodes = Array.from(
        document.querySelectorAll(
          'wc-simple-move-list .node, .move-list .node, .move-list-component .node, [data-whole-move-number] .node, .move-node'
        )
      );

      if (moveNodes.length > 0) {
        const moves = moveNodes
          .map((n) => this.parseMoveSan(n))
          .filter((m) => m && isValidSan(m));

        if (moves.length > 0) {
          return this.formatPgnString(moves);
        }
      }

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

          const wSan = this.parseMoveSan(whiteMoveEl);
          if (wSan && isValidSan(wSan)) moves.push(wSan);

          const bSan = this.parseMoveSan(blackMoveEl);
          if (bSan && isValidSan(bSan)) moves.push(bSan);
        }

        if (moves.length > 0) {
          return this.formatPgnString(moves);
        }
      }

      return '';
    },

    extractGameIdFromUrl() {
      const match = window.location.pathname.match(/(?:game\/(?:live|daily)|game|analysis\/game\/(?:live|daily))\/(\d+)/) ||
                    window.location.href.match(/[?&#]g=(\d+)/) ||
                    window.location.pathname.match(/\/(\d+)(?:\?|$)/);
      return match ? match[1] : null;
    },

    fetchOfficialPgn(usernames, gameId) {
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
    },

    handleReviewClick() {
      const meta = this.extractPlayerMeta();
      const gameId = this.extractGameIdFromUrl();
      const domPgn = this.extractPgnFromDOM();

      openSabioSidebar({
        initialPgn: domPgn,
        meta: meta,
        gameId: gameId,
        platform: 'chesscom',
        fetchOfficialPgnFn: () => this.fetchOfficialPgn(meta.usernames, gameId)
      });
    },

    checkAndInject() {
      if (this.isInjecting) return;

      const isGamePage = /\/game\//.test(window.location.pathname);
      if (!isGamePage) {
        const hasReviewElement = document.querySelector(
          '[data-cy="game-review-button"], [data-cy="game-over-review-button"], [aria-label="Game Review"]'
        );
        if (!hasReviewElement) {
          const existing = document.getElementById(SABIO_BUTTON_ID);
          if (existing) existing.remove();
          return;
        }
      }

      const reviewEl = this.findGameReviewElement();
      const existing = document.getElementById(SABIO_BUTTON_ID);

      if (!reviewEl) {
        if (this.detectGameOverState()) {
          if (existing && existing.classList.contains('sabiochess-review-btn--floating')) return;
          if (existing) existing.remove();

          const board = this.findBoardElement();
          if (!board) return;

          try {
            this.isInjecting = true;
            const sabioBtn = createSabioButton(true, () => this.handleReviewClick());
            const boardRect = board.getBoundingClientRect();
            sabioBtn.style.position = 'fixed';
            sabioBtn.style.bottom = `${Math.max(window.innerHeight - boardRect.bottom + 8, 16)}px`;
            sabioBtn.style.right = `${Math.max(window.innerWidth - boardRect.right, 16)}px`;
            document.body.appendChild(sabioBtn);
          } finally {
            this.isInjecting = false;
          }
        } else {
          if (existing) existing.remove();
        }
        return;
      }

      const targetEl = reviewEl.closest('button, a, [role="button"], .ui_v5-button-component') || reviewEl;

      if (existing) {
        if (existing.classList.contains('sabiochess-review-btn--floating')) {
          existing.remove();
        } else {
          const sameParent = existing.parentElement === targetEl.parentElement;
          const isDirectSibling = existing.previousElementSibling === targetEl || targetEl.nextElementSibling === existing;
          const isFollowing = sameParent && (targetEl.compareDocumentPosition(existing) & Node.DOCUMENT_POSITION_FOLLOWING);

          if (sameParent && (isDirectSibling || isFollowing)) {
            return;
          }
        }
      }

      try {
        this.isInjecting = true;
        const existingAgain = document.getElementById(SABIO_BUTTON_ID);
        if (existingAgain) existingAgain.remove();

        const sabioBtn = createSabioButton(false, () => this.handleReviewClick());

        try {
          targetEl.insertAdjacentElement('afterend', sabioBtn);
        } catch {
          targetEl.parentElement?.appendChild(sabioBtn);
        }
      } finally {
        this.isInjecting = false;
      }
    }
  };

  /* ==========================================================================
     INITIALIZATION & LIFECYCLE
     ========================================================================== */
  const activeAdapter = isLichess ? LichessAdapter : isChessCom ? ChessComAdapter : null;

  if (activeAdapter) {
    let injectDebounceTimer = null;
    const scheduleCheck = () => {
      if (injectDebounceTimer) return;
      injectDebounceTimer = setTimeout(() => {
        injectDebounceTimer = null;
        activeAdapter.checkAndInject();
      }, 50);
    };

    const init = () => {
      const observer = new MutationObserver((mutations) => {
        const isOurMutation = mutations.every((m) => {
          const target = m.target;
          return target && (
            target.id === SABIO_BUTTON_ID ||
            target.id === SIDEBAR_ID ||
            (typeof target.closest === 'function' && target.closest(`#${SIDEBAR_ID}, #${SABIO_BUTTON_ID}`))
          );
        });
        if (isOurMutation) return;

        scheduleCheck();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      activeAdapter.checkAndInject();
      setInterval(() => activeAdapter.checkAndInject(), 1000);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
