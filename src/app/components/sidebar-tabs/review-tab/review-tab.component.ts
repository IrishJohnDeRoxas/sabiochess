import { Component, computed, inject, signal, ElementRef, ViewChild, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessGameService, SAMPLE_GAMES } from '../../../services/chess-game.service';
import { GameAnalysisService } from '../../../services/game-analysis.service';
import { SoundService } from '../../../services/sound.service';
import { SettingsService } from '../../../services/settings.service';
import { MEME_SOUND_PACKS, MemeSoundPack } from '../../../models/settings.model';
import { MoveClassification, getHeroIconForClass } from '../../../models/analysis.model';
import { MoveVariation } from '../../../models/chess.model';
import { IconComponent, IconName } from '../../icon/icon.component';
import { PlatformGameSelectorComponent } from '../../platform-game-selector/platform-game-selector.component';
import { VariationBannerComponent } from '../../variation-banner/variation-banner.component';
import { FetchedGame } from '../../../services/platform-importer.service';

export type ImporterSubTab = 'online' | 'samples' | 'pgn';

export interface FormattedVariationMove {
  label: string;
  san: string;
  plyIndex: number;
  isActive: boolean;
}

export interface RenderedVariation {
  id: string;
  parentPly: number;
  moves: FormattedVariationMove[];
}

export interface MovePairItem {
  moveNumber: number;
  whitePly: number;
  whiteSan: string;
  whiteClass?: MoveClassification;
  whiteMoveTime?: string;
  whiteClock?: string;
  blackPly?: number;
  blackSan?: string;
  blackClass?: MoveClassification;
  blackMoveTime?: string;
  blackClock?: string;
  variations: RenderedVariation[];
}

export interface StatItem {
  key: MoveClassification;
  label: string;
  icon: IconName;
  symbol: string;
  badgeClass: string;
}

@Component({
  selector: 'app-review-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, PlatformGameSelectorComponent, VariationBannerComponent],
  templateUrl: './review-tab.component.html',
  styleUrls: ['./review-tab.component.css'],
})
export class ReviewTabComponent {
  readonly game = inject(ChessGameService);
  readonly analysisService = inject(GameAnalysisService);
  readonly soundService = inject(SoundService);
  readonly settings = inject(SettingsService);

  readonly sampleGames = SAMPLE_GAMES;
  readonly soundPacks = MEME_SOUND_PACKS;

  readonly isSoundMenuOpen = signal<boolean>(false);
  readonly isImporterOpen = signal<boolean>(false);
  readonly importerTab = signal<ImporterSubTab>('online');
  readonly pgnInputText = signal<string>('');

  readonly isPlayingFollowUp = signal<boolean>(false);
  readonly isFollowUpActive = signal<boolean>(false);
  readonly isBestVariation = signal<boolean>(false);
  private followUpTimer: ReturnType<typeof setTimeout> | null = null;
  private followUpOriginalPly = -1;

  @ViewChild('movesListContainer') movesListContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('soundMenuContainer') soundMenuContainer?: ElementRef<HTMLDivElement>;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isSoundMenuOpen()) return;
    const clickedInside = this.soundMenuContainer?.nativeElement?.contains(event.target as Node);
    if (!clickedInside) {
      this.isSoundMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isSoundMenuOpen()) {
      this.isSoundMenuOpen.set(false);
    }
  }

  constructor() {
    effect(() => {
      const isVar = this.game.isVariationActive();
      if (!isVar && this.isFollowUpActive() && !this.isPlayingFollowUp()) {
        this.isFollowUpActive.set(false);
        this.isBestVariation.set(false);
      }
    });

    effect(() => {
      const currentPly = this.game.currentPlyIndex();
      const activeVar = this.game.activeVariation();
      if (currentPly !== null && currentPly !== undefined) {
        setTimeout(() => {
          const container = this.movesListContainer?.nativeElement;
          if (!container) return;
          const activeEl = container.querySelector('[data-active-move="true"], .variation-move-pill.active') as HTMLElement;
          if (activeEl && typeof activeEl.scrollIntoView === 'function') {
            activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 0);
      }
    });
  }

  readonly statsList: StatItem[] = [
    { key: 'brilliant', label: 'Brilliant', icon: 'sparkles', symbol: '!!', badgeClass: 'bg-[#8B5CF6] text-white border-[#222222]' },
    { key: 'great', label: 'Great', icon: 'arrow-trending-up', symbol: '!', badgeClass: 'bg-[#06B6D4] text-white border-[#222222]' },
    { key: 'best', label: 'Best', icon: 'star', symbol: '★', badgeClass: 'bg-[#10B981] text-white border-[#222222]' },
    { key: 'excellent', label: 'Excellent', icon: 'check', symbol: '✓', badgeClass: 'bg-[#84CC16] text-[#222222] border-[#222222]' },
    { key: 'good', label: 'Good', icon: 'check', symbol: '✓', badgeClass: 'bg-[#3B82F6] text-white border-[#222222]' },
    { key: 'book', label: 'Book', icon: 'book-open', symbol: '📖', badgeClass: 'bg-[#A16207] text-white border-[#222222]' },
    { key: 'inaccuracy', label: 'Inaccuracy', icon: 'exclamation-circle', symbol: '?!', badgeClass: 'bg-[#F59E0B] text-[#222222] border-[#222222]' },
    { key: 'mistake', label: 'Mistake', icon: 'question-mark-circle', symbol: '?', badgeClass: 'bg-[#F97316] text-white border-[#222222]' },
    { key: 'miss', label: 'Miss', icon: 'x-mark', symbol: '✕', badgeClass: 'bg-[#EA580C] text-white border-[#222222]' },
    { key: 'blunder', label: 'Blunder', icon: 'exclamation-triangle', symbol: '??', badgeClass: 'bg-[#EF4444] text-white border-[#222222]' },
  ];

  readonly activeSoundLabel = computed(() => {
    if (this.soundService.isMuted()) return 'MUTED';
    if (!this.settings.memeSounds()) return 'STANDARD';
    const pack = this.soundPacks.find((p) => p.id === this.settings.memePack());
    return pack ? pack.name.toUpperCase() : 'MEME';
  });

  private formatVariation(v: MoveVariation): RenderedVariation {
    const active = this.game.activeVariation();
    const moves: FormattedVariationMove[] = v.moves.map((item, i) => {
      const effectivePly = v.parentPly + 1 + i;
      const isWhite = effectivePly % 2 === 0;
      const mNum = Math.floor(effectivePly / 2) + 1;
      let label = '';
      if (i === 0) {
        label = isWhite ? `${mNum}.` : `${mNum}...`;
      } else if (isWhite) {
        label = `${mNum}.`;
      }
      const isActive = active !== null && active.id === v.id && active.plyIndex === i;
      return {
        label,
        san: item.move.san,
        plyIndex: i,
        isActive,
      };
    });

    return {
      id: v.id,
      parentPly: v.parentPly,
      moves,
    };
  }

  readonly rootVariations = computed<RenderedVariation[]>(() => {
    return this.game.variations()
      .filter((v) => v.parentPly === -1)
      .map((v) => this.formatVariation(v));
  });

  readonly movePairs = computed<MovePairItem[]>(() => {
    const hist = this.game.history();
    const analyses = this.analysisService.movesAnalysis();
    const allVariations = this.game.variations();
    const pairs: MovePairItem[] = [];

    for (let i = 0; i < hist.length; i += 2) {
      const whiteItem = hist[i];
      const blackItem = i + 1 < hist.length ? hist[i + 1] : undefined;
      const whiteAnalysis = analyses[i];
      const blackAnalysis = analyses[i + 1];

      // Variations branched after White's move (parentPly === i) or Black's move (parentPly === i + 1)
      const pairVariations = allVariations
        .filter((v) => v.parentPly === i || (blackItem && v.parentPly === i + 1))
        .map((v) => this.formatVariation(v));

      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        whitePly: i,
        whiteSan: whiteItem.san,
        whiteClass: whiteAnalysis?.classification,
        whiteMoveTime: whiteItem.formattedMoveTime,
        whiteClock: whiteItem.clock,
        blackPly: blackItem ? i + 1 : undefined,
        blackSan: blackItem ? blackItem.san : undefined,
        blackClass: blackAnalysis?.classification,
        blackMoveTime: blackItem ? blackItem.formattedMoveTime : undefined,
        blackClock: blackItem ? blackItem.clock : undefined,
        variations: pairVariations,
      });
    }

    return pairs;
  });

  readonly currentExplanation = computed(() => {
    if (this.game.isVariationActive()) {
      const active = this.game.activeVariation();
      const variation = this.game.currentVariation();
      if (active && variation && active.plyIndex >= 0 && active.plyIndex < variation.moves.length) {
        const item = variation.moves[active.plyIndex];
        const parentPly = variation.parentPly;
        const analysis = parentPly >= 0 ? this.analysisService.movesAnalysis()[parentPly] : null;

        let commentary = `Exploring variation move ${item.move.san}. Step forward or play alternate moves on the board.`;
        if (this.isFollowUpActive()) {
          commentary = 'Demonstrating the engine\'s recommended line from this position.';
        } else if (this.isBestVariation()) {
          commentary = 'This was the top engine choice in this position. Click Show Follow-Up to see the line unfold.';
        }

        return {
          isVariation: true,
          isFollowUp: this.isFollowUpActive(),
          isBest: this.isBestVariation(),
          plyIndex: parentPly,
          san: item.move.san,
          turn: item.move.color,
          moveTime: undefined,
          clock: undefined,
          classification: (this.isBestVariation() ? 'best' : 'good') as MoveClassification,
          accuracy: null,
          commentary,
          bestMoveSan: analysis?.bestMoveSan,
          followUpMoves: analysis?.followUpMoves || [],
        };
      }
    }

    const ply = this.game.currentPlyIndex();
    const hist = this.game.history();
    if (hist.length === 0) return null;

    const targetPly = ply === null || ply < 0 ? 0 : ply;
    const item = hist[targetPly];
    if (!item) return null;

    const analysis = this.game.currentMoveAnalysis() || this.analysisService.movesAnalysis()[targetPly];

    return {
      isVariation: false,
      isFollowUp: false,
      isBest: false,
      plyIndex: targetPly,
      san: item.san,
      turn: item.turn,
      moveTime: item.formattedMoveTime,
      clock: item.clock,
      classification: analysis?.classification || ('good' as MoveClassification),
      accuracy: analysis?.accuracy,
      commentary: analysis?.commentary,
      bestMoveSan: analysis?.bestMoveSan,
      followUpMoves: analysis?.followUpMoves || [],
    };
  });

  readonly canPlayBest = computed(() => {
    const exp = this.currentExplanation();
    if (!exp) return false;
    if (this.game.isVariationActive() && exp.isBest) return false;
    if (exp.classification === 'best' || exp.classification === 'book') return false;
    return !!exp.bestMoveSan;
  });

  readonly canRetry = computed(() => {
    return this.game.isVariationActive() || (this.game.currentPlyIndex() !== null && this.game.currentPlyIndex()! >= 0);
  });

  readonly canNext = computed(() => {
    if (this.game.isVariationActive()) return true;
    return this.game.canRedo();
  });

  toggleSoundMenu(): void {
    this.isSoundMenuOpen.update((o) => !o);
  }

  selectSoundPack(packId: string): void {
    const pack = this.soundPacks.find((p) => p.id === packId);
    if (pack) {
      this.settings.setMemePack(pack.id as any);
      this.settings.setMemeSounds(true);
      this.soundService.setMuted(false);
    }
    this.isSoundMenuOpen.set(false);
  }

  setStandardSounds(): void {
    this.settings.setMemeSounds(false);
    this.soundService.setMuted(false);
    this.isSoundMenuOpen.set(false);
  }

  previewSoundPack(packId: string, event: Event): void {
    event.stopPropagation();
    const pack = this.soundPacks.find((p) => p.id === packId);
    if (pack) {
      this.soundService.playReactionSound('best', pack.id as any, this.settings.volume());
    }
  }

  toggleImporter(): void {
    this.isImporterOpen.update((o) => !o);
  }

  setImporterTab(tab: ImporterSubTab): void {
    this.importerTab.set(tab);
  }

  onOnlineGameSelected(_game: FetchedGame): void {
    this.isImporterOpen.set(false);
    this.settings.flashToast('ONLINE GAME LOADED');
  }

  loadSample(gameId: string): void {
    const success = this.game.loadSampleGame(gameId);
    if (success) {
      this.isImporterOpen.set(false);
      this.settings.flashToast('SAMPLE LOADED');
    }
  }

  importPgn(): void {
    const text = this.pgnInputText().trim();
    if (!text) return;
    const success = this.game.loadPgn(text);
    if (success) {
      this.isImporterOpen.set(false);
      this.pgnInputText.set('');
      this.settings.flashToast('PGN IMPORTED');
    } else {
      alert('Could not parse PGN. Please check notation syntax.');
    }
  }

  isMainPlyActive(ply: number | undefined): boolean {
    if (ply === undefined) return false;
    return !this.game.isVariationActive() && this.game.currentPlyIndex() === ply;
  }

  jumpTo(plyIndex: number): void {
    this.stopFollowUp();
    this.game.jumpToPly(plyIndex);
  }

  jumpToVariation(varId: string, plyIndex: number): void {
    this.stopFollowUp();
    this.game.jumpToVariation(varId, plyIndex);
  }

  deleteVariation(varId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.game.deleteVariation(varId);
  }

  playBestMove(): void {
    this.stopFollowUp();
    const exp = this.currentExplanation();
    if (!exp?.bestMoveSan) return;

    const ply = this.game.currentPlyIndex();
    if (ply === null || ply < 0) return;

    // Step back to position before this move
    this.game.jumpToPly(ply - 1);
    // Play the best move as variation
    const ok = this.game.move(exp.bestMoveSan);
    if (ok) {
      this.isBestVariation.set(true);
    }
  }

  retryMove(): void {
    this.stopFollowUp();
    this.isBestVariation.set(false);

    if (this.game.isVariationActive()) {
      this.game.exitVariation();
      return;
    }

    const ply = this.game.currentPlyIndex();
    if (ply !== null && ply >= 0) {
      this.game.jumpToPly(ply - 1);
    }
  }

  nextMove(): void {
    this.stopFollowUp();
    this.isBestVariation.set(false);

    if (this.game.isVariationActive()) {
      const curVar = this.game.currentVariation();
      const parentPly = curVar ? curVar.parentPly : (this.game.currentPlyIndex() ?? 0);
      this.game.exitVariation();
      this.game.jumpToPly(parentPly + 1);
      return;
    }

    this.game.redo();
  }

  toggleFollowUp(): void {
    if (this.isFollowUpActive()) {
      this.stopFollowUp();
    } else {
      this.startFollowUp();
    }
  }

  private startFollowUp(): void {
    const exp = this.currentExplanation();
    if (!exp) return;

    let movesToPlay: string[] = [];
    const isVar = this.game.isVariationActive();

    if (isVar && this.isBestVariation()) {
      movesToPlay = exp.followUpMoves?.slice(1) || [];
    } else if (isVar) {
      movesToPlay = exp.followUpMoves || [];
    } else if (exp.classification === 'best' || exp.classification === 'book') {
      movesToPlay = exp.followUpMoves || [];
    } else if (exp.bestMoveSan) {
      // Demonstrated move that should have been played
      const currentPly = this.game.currentPlyIndex();
      if (currentPly !== null && currentPly >= 0) {
        this.game.jumpToPly(currentPly - 1);
      }
      movesToPlay = [exp.bestMoveSan, ...(exp.followUpMoves?.slice(1) || [])];
    } else {
      movesToPlay = exp.followUpMoves || [];
    }

    if (movesToPlay.length === 0) return;

    this.followUpOriginalPly = this.game.currentPlyIndex() ?? -1;
    this.isFollowUpActive.set(true);
    this.isPlayingFollowUp.set(true);

    this.followUpTimer = setTimeout(() => {
      this.playContinuationMoves(movesToPlay, 0);
    }, 400);
  }

  private playContinuationMoves(moves: string[], index: number): void {
    if (!this.isFollowUpActive()) return;

    if (index >= moves.length) {
      this.isPlayingFollowUp.set(false);
      return;
    }

    const success = this.game.move(moves[index]);
    if (!success) {
      this.isPlayingFollowUp.set(false);
      return;
    }

    if (index + 1 < moves.length) {
      this.followUpTimer = setTimeout(() => {
        this.playContinuationMoves(moves, index + 1);
      }, 1000);
    } else {
      this.isPlayingFollowUp.set(false);
    }
  }

  private stopFollowUp(): void {
    if (this.followUpTimer) {
      clearTimeout(this.followUpTimer);
      this.followUpTimer = null;
    }
    this.isPlayingFollowUp.set(false);
    this.isFollowUpActive.set(false);
  }

  formatAccuracy(acc?: number | null): string {
    if (acc === undefined || acc === null) return '0%';
    return `${Math.round(acc)}%`;
  }

  getClassificationBadgeClass(classification: string): string {
    const item = this.statsList.find((s) => s.key === classification);
    return item ? item.badgeClass : 'bg-[#D9D9D9] text-[#222222] border-[#222222]';
  }

  copyFen(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.game.fen()).then(() => {
        this.settings.flashToast('FEN COPIED');
      });
    }
  }

  copyPgn(): void {
    const hist = this.game.history();
    let pgnStr = '';
    for (let i = 0; i < hist.length; i += 2) {
      const num = Math.floor(i / 2) + 1;
      const w = hist[i].san;
      const b = hist[i + 1]?.san ? ` ${hist[i + 1].san}` : '';
      pgnStr += `${num}. ${w}${b} `;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pgnStr.trim()).then(() => {
        this.settings.flashToast('PGN COPIED');
      });
    }
  }

  getClassificationSymbol(classification: string): string {
    const item = this.statsList.find((s) => s.key === classification);
    return item ? item.symbol : '•';
  }

  getClassificationIcon(classification: string): IconName {
    const item = this.statsList.find((s) => s.key === classification);
    return item ? item.icon : 'star';
  }
}
