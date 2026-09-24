import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChessGameService } from '../../services/chess-game.service';
import { SettingsService } from '../../services/settings.service';
import { SoundService } from '../../services/sound.service';
import { ChessBoardComponent } from '../chess-board/chess-board.component';
import { EvalBarComponent } from '../eval-bar/eval-bar.component';
import { IconComponent } from '../icon/icon.component';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { SidebarTabsComponent } from '../sidebar-tabs/sidebar-tabs.component';

@Component({
  selector: 'app-analyzer',
  standalone: true,
  imports: [
    CommonModule,
    ChessBoardComponent,
    PlayerCardComponent,
    EvalBarComponent,
    SidebarTabsComponent,
    IconComponent,
  ],
  templateUrl: './analyzer.component.html',
  styleUrls: ['./analyzer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyzerComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });
  readonly settings = inject(SettingsService);
  readonly game = inject(ChessGameService);
  private readonly sound = inject(SoundService);

  private routeSub?: Subscription;
  private lastLoadedPgn = '';
  private messageHandler = (event: MessageEvent) => this.handleWindowMessage(event);

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target) {
      const tagName = target.tagName?.toLowerCase();
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target.isContentEditable
      ) {
        return;
      }
    }

    switch (event.key) {
      case 'ArrowLeft':
        if (this.game.canUndo()) {
          this.game.prevMove();
          event.preventDefault();
        }
        break;
      case 'ArrowRight':
        if (this.game.canRedo()) {
          this.game.nextMove();
          event.preventDefault();
        }
        break;
      case 'ArrowUp':
      case 'Home':
        if (this.game.canUndo()) {
          this.game.goToStart();
          event.preventDefault();
        }
        break;
      case 'ArrowDown':
      case 'End':
        if (this.game.canRedo()) {
          this.game.goToEnd();
          event.preventDefault();
        }
        break;
      case ' ':
        if (this.game.history().length > 0) {
          this.game.toggleAutoplay();
          event.preventDefault();
        }
        break;
      case 'e':
      case 'E':
        // E: toggle Stockfish live engine evaluation on/off
        if (this.game.history().length > 0) {
          const next = !this.settings.autoEvaluation();
          this.settings.setAutoEvaluation(next);
          this.settings.flashToast(next ? 'ENGINE ON' : 'ENGINE OFF');
          event.preventDefault();
        }
        break;
      case 'f':
      case 'F':
        this.game.flipBoard();
        event.preventDefault();
        break;
      case 'm':
      case 'M':
        this.sound.toggleMute();
        this.settings.flashToast(this.sound.isMuted() ? '🔇 MUTED' : '🔊 SOUND ON');
        event.preventDefault();
        break;
    }
  }

  ngOnInit(): void {
    if (this.route) {
      this.routeSub = this.route.queryParams.subscribe((params) => {
        this.handleQueryParams(params);
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.messageHandler);
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageHandler);
    }
  }

  private cleanPgnString(raw: string): string {
    if (!raw) return '';
    let pgn = raw.trim();

    try {
      if (pgn.includes('%') || pgn.includes('+') || pgn.includes('&')) {
        const decoded = decodeURIComponent(pgn.replace(/\+/g, ' '));
        if (decoded && (decoded.includes('[') || decoded.includes('1.'))) {
          pgn = decoded;
        }
      }
    } catch {}

    pgn = pgn.replace(/\\n/g, '\n').replace(/\\r/g, '');

    const firstBracket = pgn.indexOf('[');
    const firstMove = pgn.search(/\b1\.\s*[a-zA-Z]/);

    if (firstBracket !== -1 && (firstMove === -1 || firstBracket < firstMove)) {
      pgn = pgn.slice(firstBracket);
    } else if (firstMove !== -1) {
      pgn = pgn.slice(firstMove);
    }

    return pgn.trim();
  }

  private handleQueryParams(params: Record<string, string | undefined>): void {
    const rawPgn = params['pgn'];
    const rawFen = params['fen'];
    const sample = params['sample'];
    const flip = params['flip'];
    let loaded = false;

    if (rawPgn) {
      const pgnToLoad = this.cleanPgnString(rawPgn);
      if (pgnToLoad === this.lastLoadedPgn && this.game.history().length > 0) {
        return;
      }
      const success = this.game.loadPgn(pgnToLoad);
      if (success) {
        this.lastLoadedPgn = pgnToLoad;
        this.settings.flashToast('GAME LOADED FOR ANALYSIS');
        loaded = true;
      }
    } else if (rawFen) {
      let fenToLoad = rawFen.trim();
      try {
        if (rawFen.includes('%')) {
          fenToLoad = decodeURIComponent(rawFen).trim();
        }
      } catch {}
      this.game.loadFen(fenToLoad);
      this.settings.flashToast('POSITION LOADED');
      loaded = true;
    } else if (sample) {
      this.game.loadSampleGame(sample);
      loaded = true;
    }

    const targetUser = params['user'] || params['username'] || params['player'];
    this.applyBoardOrientation(flip, targetUser);

    if (loaded && (rawPgn || rawFen || sample)) {
      this.clearQueryParams();
    }
  }

  private clearQueryParams(): void {
    if (this.router) {
      this.router.navigate([], {
        queryParams: {},
        replaceUrl: true,
      });
    } else if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  private applyBoardOrientation(flip?: string | boolean, targetUser?: string): void {
    this.game.applyBoardOrientation(flip, targetUser);
  }

  private handleWindowMessage(event: MessageEvent): void {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'LOAD_PGN' && typeof data.pgn === 'string') {
      const pgn = this.cleanPgnString(data.pgn);
      const targetUser = data.user || data.targetUser || data.username || data.player;

      if (!pgn) return;
      if (pgn === this.lastLoadedPgn && this.game.history().length > 0) {
        this.applyBoardOrientation(data.flip, targetUser);
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'SABIO_PGN_LOADED', success: true }, '*');
          }
        } catch {}
        return;
      }
      const success = this.game.loadPgn(pgn);
      if (success) {
        this.lastLoadedPgn = pgn;
        this.applyBoardOrientation(data.flip, targetUser);
        this.settings.flashToast('GAME LOADED FOR ANALYSIS');

        // Acknowledge back to parent extension iframe
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'SABIO_PGN_LOADED', success: true }, '*');
          }
        } catch {}
      }
    } else if (data.type === 'LOAD_FEN' && typeof data.fen === 'string') {
      this.game.loadFen(data.fen.trim());
      if (data.flip !== undefined) {
        this.applyBoardOrientation(data.flip, data.user || data.targetUser);
      }
      this.settings.flashToast('POSITION LOADED');
    }
  }
}
