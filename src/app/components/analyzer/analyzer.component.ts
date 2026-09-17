import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChessGameService } from '../../services/chess-game.service';
import { SettingsService } from '../../services/settings.service';
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
})
export class AnalyzerComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute, { optional: true });
  readonly settings = inject(SettingsService);
  readonly game = inject(ChessGameService);

  private routeSub?: Subscription;
  private lastLoadedPgn = '';
  private messageHandler = (event: MessageEvent) => this.handleWindowMessage(event);

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

    if (rawPgn) {
      const pgnToLoad = this.cleanPgnString(rawPgn);
      if (pgnToLoad === this.lastLoadedPgn && this.game.history().length > 0) {
        return;
      }
      const success = this.game.loadPgn(pgnToLoad);
      if (success) {
        this.lastLoadedPgn = pgnToLoad;
        this.settings.flashToast('GAME LOADED FOR ANALYSIS');
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
    } else if (sample) {
      this.game.loadSampleGame(sample);
    }

    const targetUser = params['user'] || params['username'] || params['player'];
    this.applyBoardOrientation(flip, targetUser);
  }

  private applyBoardOrientation(flip?: string | boolean, targetUser?: string): void {
    if (targetUser && typeof targetUser === 'string') {
      const cleanTarget = targetUser.toLowerCase().replace(/[^a-z0-9]/g, '');
      const meta = this.game.matchMetadata();
      const white = meta.white.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const black = meta.black.name.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (
        cleanTarget &&
        (black === cleanTarget ||
          (black.length > 2 && cleanTarget.includes(black)) ||
          (cleanTarget.length > 2 && black.includes(cleanTarget)))
      ) {
        this.game.isBoardFlipped.set(true);
        return;
      }
      if (
        cleanTarget &&
        (white === cleanTarget ||
          (white.length > 2 && cleanTarget.includes(white)) ||
          (cleanTarget.length > 2 && white.includes(cleanTarget)))
      ) {
        this.game.isBoardFlipped.set(false);
        return;
      }
    }

    if (flip === true || flip === 'true' || flip === 'black' || flip === '1') {
      this.game.isBoardFlipped.set(true);
    } else if (flip === false || flip === 'false' || flip === 'white' || flip === '0') {
      this.game.isBoardFlipped.set(false);
    }
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
