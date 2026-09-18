import { Component, computed, inject, signal, ElementRef, ViewChild, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessGameService, SAMPLE_GAMES } from '../../../services/chess-game.service';
import { GameAnalysisService } from '../../../services/game-analysis.service';
import { SoundService } from '../../../services/sound.service';
import { SettingsService } from '../../../services/settings.service';
import { VoiceCommentaryService } from '../../../services/voice-commentary.service';
import { MEME_SOUND_PACKS, MemeSoundPack } from '../../../models/settings.model';
import { MoveClassification, getHeroIconForClass, LiveEngineLine } from '../../../models/analysis.model';
import { MoveVariation } from '../../../models/chess.model';
import { IconComponent, IconName } from '../../icon/icon.component';
import { PlatformGameSelectorComponent } from '../../platform-game-selector/platform-game-selector.component';
import { FetchedGame } from '../../../services/platform-importer.service';
import { getGameSummaryCommentary } from '../../../utils/coach-commentary.util';

export type ImporterSubTab = 'online' | 'samples' | 'pgn';

export interface FormattedVariationMove {
  label: string;
  san: string;
  plyIndex: number;
  isActive: boolean;
  classification?: MoveClassification;
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

export interface ReportClassificationRow {
  key: MoveClassification;
  label: string;
  symbol: string;
  icon: IconName;
  badgeClass: string;
  whiteCount: number;
  blackCount: number;
}

export interface MomentumMarkerPin {
  x: number;
  y: number;
  ply: number;
  san: string;
  color: string;
  label: string;
}

export interface MomentumChartData {
  linePath: string;
  whiteAreaPath: string;
  blackAreaPath: string;
  markerPins: MomentumMarkerPin[];
  currentPin: { x: number; y: number } | null;
  mappedPoints: Array<{ ply: number; san: string; evalScore: number; classification: MoveClassification; x: number; y: number; idx: number }>;
}

@Component({
  selector: 'app-review-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, PlatformGameSelectorComponent],
  templateUrl: './review-tab.component.html',
  styleUrls: ['./review-tab.component.css'],
})
export class ReviewTabComponent {
  readonly game = inject(ChessGameService);
  readonly analysisService = inject(GameAnalysisService);
  readonly soundService = inject(SoundService);
  readonly settings = inject(SettingsService);
  readonly voiceService = inject(VoiceCommentaryService);

  readonly sampleGames = SAMPLE_GAMES;
  readonly soundPacks = MEME_SOUND_PACKS;

  readonly isReportView = signal<boolean>(true);
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
      if (isVar) {
        this.isReportView.set(false);
      }
      if (!isVar && this.isFollowUpActive() && !this.isPlayingFollowUp()) {
        this.isFollowUpActive.set(false);
        this.isBestVariation.set(false);
      }
    });

    effect(() => {
      const currentPly = this.game.currentPlyIndex();
      if (currentPly !== null && currentPly !== undefined) {
        setTimeout(() => {
          const container = this.movesListContainer?.nativeElement;
          if (!container) return;
          const activeEl = container.querySelector('[data-active-move="true"]') as HTMLElement;
          if (activeEl) {
            const containerRect = container.getBoundingClientRect();
            const elRect = activeEl.getBoundingClientRect();
            if (containerRect.height === 0 || elRect.height === 0) return;

            const stickyHeaderOffset = 34;
            const diffTop = elRect.top - (containerRect.top + stickyHeaderOffset);
            const diffBottom = elRect.bottom - containerRect.bottom;

            if (diffTop < 0) {
              container.scrollTop += diffTop;
            } else if (diffBottom > 0) {
              container.scrollTop += diffBottom;
            }
          }
        }, 0);
      }
    });

    // When game history changes, reset to Report view and ensure analysis is active
    effect(() => {
      const hist = this.game.history();
      if (hist.length > 0) {
        if (!this.analysisService.summary() && !this.analysisService.isAnalyzing()) {
          this.triggerAutoAnalysis();
        }
      }
    });

    // Auto-narrate coach commentary when navigating moves if voiceCommentary is enabled
    effect(() => {
      const isVoiceEnabled = this.settings.voiceCommentary();
      if (!isVoiceEnabled) return;
      const isReport = this.isReportView();
      if (isReport) return;
      const exp = this.currentExplanation();
      const hist = this.game.history();
      if (hist.length === 0) return;

      const commentaryText = exp
        ? (exp.commentary || `${exp.san} is ${exp.classification}`)
        : this.gameSummaryCommentary();

      if (commentaryText) {
        this.voiceService.speak(commentaryText);
      }
    });
  }

  readonly statsList: StatItem[] = [
    { key: 'brilliant', label: 'Brilliant Move', icon: 'sparkles', symbol: '!!', badgeClass: 'bg-[#00C0F9] text-black border-[#222222]' },
    { key: 'great', label: 'Great Move', icon: 'arrow-trending-up', symbol: '!', badgeClass: 'bg-[#0E4C92] text-white border-[#222222]' },
    { key: 'best', label: 'Best Move', icon: 'star', symbol: '★', badgeClass: 'bg-[#10B981] text-white border-[#222222]' },
    { key: 'excellent', label: 'Excellent', icon: 'hand-thumb-up', symbol: '✓', badgeClass: 'bg-[#84CC16] text-[#222222] border-[#222222]' },
    { key: 'good', label: 'Good Move', icon: 'check', symbol: '✓', badgeClass: 'bg-[#3B82F6] text-white border-[#222222]' },
    { key: 'book', label: 'Book Move', icon: 'book-open', symbol: '📖', badgeClass: 'bg-[#A16207] text-white border-[#222222]' },
    { key: 'inaccuracy', label: 'Inaccuracy', icon: 'exclamation-circle', symbol: '?!', badgeClass: 'bg-[#F59E0B] text-black border-[#222222]' },
    { key: 'mistake', label: 'Mistake', icon: 'question-mark-circle', symbol: '?', badgeClass: 'bg-[#F97316] text-white border-[#222222]' },
    { key: 'miss', label: 'Miss', icon: 'x-mark', symbol: '✕', badgeClass: 'bg-[#EA580C] text-white border-[#222222]' },
    { key: 'blunder', label: 'Blunder', icon: 'exclamation-triangle', symbol: '??', badgeClass: 'bg-[#EF4444] text-white border-[#222222]' },
  ];

  readonly reportClassificationRows = computed<ReportClassificationRow[]>(() => {
    const sum = this.analysisService.summary();
    const wc = sum?.whiteCounts;
    const bc = sum?.blackCounts;

    return [
      {
        key: 'brilliant',
        label: 'Brilliant Move',
        symbol: '!!',
        icon: 'sparkles',
        badgeClass: 'bg-[#00C0F9] text-black border-[#222222]',
        whiteCount: wc?.brilliant || 0,
        blackCount: bc?.brilliant || 0,
      },
      {
        key: 'great',
        label: 'Great Move',
        symbol: '!',
        icon: 'arrow-trending-up',
        badgeClass: 'bg-[#0E4C92] text-white border-[#222222]',
        whiteCount: (wc?.great || 0) + (wc?.excellent || 0),
        blackCount: (bc?.great || 0) + (bc?.excellent || 0),
      },
      {
        key: 'best',
        label: 'Best Move',
        symbol: '★',
        icon: 'star',
        badgeClass: 'bg-[#10B981] text-white border-[#222222]',
        whiteCount: (wc?.best || 0) + (wc?.book || 0),
        blackCount: (bc?.best || 0) + (bc?.book || 0),
      },
      {
        key: 'inaccuracy',
        label: 'Inaccuracy',
        symbol: '?!',
        icon: 'exclamation-circle',
        badgeClass: 'bg-[#F59E0B] text-black border-[#222222]',
        whiteCount: wc?.inaccuracy || 0,
        blackCount: bc?.inaccuracy || 0,
      },
      {
        key: 'mistake',
        label: 'Mistake',
        symbol: '?',
        icon: 'question-mark-circle',
        badgeClass: 'bg-[#F97316] text-white border-[#222222]',
        whiteCount: wc?.mistake || 0,
        blackCount: bc?.mistake || 0,
      },
      {
        key: 'miss',
        label: 'Miss',
        symbol: '✕',
        icon: 'x-mark',
        badgeClass: 'bg-[#EA580C] text-white border-[#222222]',
        whiteCount: wc?.miss || 0,
        blackCount: bc?.miss || 0,
      },
      {
        key: 'blunder',
        label: 'Blunder',
        symbol: '??',
        icon: 'exclamation-triangle',
        badgeClass: 'bg-[#DC2626] text-white border-[#222222]',
        whiteCount: wc?.blunder || 0,
        blackCount: bc?.blunder || 0,
      },
    ];
  });

  readonly momentumData = computed<MomentumChartData>(() => {
    const points = this.analysisService.evalGraphPoints();
    if (points.length === 0) {
      return {
        linePath: 'M 15 60 L 485 60',
        whiteAreaPath: 'M 15 60 L 485 60 L 485 60 L 15 60 Z',
        blackAreaPath: 'M 15 60 L 485 60 L 485 60 L 15 60 Z',
        markerPins: [],
        currentPin: null,
        mappedPoints: [],
      };
    }

    const svgWidth = 500;
    const svgHeight = 120;
    const paddingX = 15;
    const availableWidth = svgWidth - paddingX * 2;
    const centerY = svgHeight / 2;

    const mappedPoints = points.map((pt, i) => {
      const x = paddingX + (i / Math.max(1, points.length - 1)) * availableWidth;
      const y = centerY - (pt.evalScore / 10) * 46;
      return { ...pt, x, y, idx: i };
    });

    let linePath = `M ${mappedPoints[0].x.toFixed(1)} ${mappedPoints[0].y.toFixed(1)}`;
    for (let i = 0; i < mappedPoints.length - 1; i++) {
      const p0 = mappedPoints[i === 0 ? 0 : i - 1];
      const p1 = mappedPoints[i];
      const p2 = mappedPoints[i + 1];
      const p3 = mappedPoints[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const first = mappedPoints[0];
    const last = mappedPoints[mappedPoints.length - 1];
    const whiteAreaPath = `${linePath} L ${last.x.toFixed(1)} ${centerY} L ${first.x.toFixed(1)} ${centerY} Z`;
    const blackAreaPath = `${linePath} L ${last.x.toFixed(1)} ${centerY} L ${first.x.toFixed(1)} ${centerY} Z`;

    const markerPins: MomentumMarkerPin[] = mappedPoints
      .filter((pt) => ['blunder', 'mistake', 'miss', 'brilliant'].includes(pt.classification))
      .map((pt) => {
        let color = '#EF4444';
        let label = '??';
        if (pt.classification === 'blunder') {
          color = '#DC2626';
          label = '??';
        } else if (pt.classification === 'mistake') {
          color = '#F97316';
          label = '?';
        } else if (pt.classification === 'miss') {
          color = '#EA580C';
          label = '✕';
        } else if (pt.classification === 'brilliant') {
          color = '#00C0F9';
          label = '!!';
        }
        return {
          x: pt.x,
          y: pt.y,
          ply: pt.ply,
          san: pt.san,
          color,
          label,
        };
      });

    const currentPly = this.game.currentPlyIndex();
    let currentPin = null;
    if (currentPly !== null && currentPly >= 0 && currentPly < mappedPoints.length) {
      currentPin = { x: mappedPoints[currentPly].x, y: mappedPoints[currentPly].y };
    }

    return {
      linePath,
      whiteAreaPath,
      blackAreaPath,
      markerPins,
      currentPin,
      mappedPoints,
    };
  });

  readonly activeSoundLabel = computed(() => {
    if (this.soundService.isMuted()) return 'MUTED';
    if (!this.settings.memeSounds()) return 'STANDARD';
    const pack = this.soundPacks.find((p) => p.id === this.settings.memePack());
    return pack ? pack.name.toUpperCase() : 'MEME';
  });

  private formatVariation(v: MoveVariation): RenderedVariation {
    const active = this.game.activeVariation();
    const analyses = this.analysisService.movesAnalysis();
    const parentAnalysis = v.parentPly >= 0 ? analyses[v.parentPly] : null;
    const liveLines = this.analysisService.liveEngineLines();

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

      let classification: MoveClassification | undefined = undefined;
      const varMove = item.move;
      if (
        i === 0 &&
        parentAnalysis &&
        (parentAnalysis.bestMoveSan === varMove.san ||
          parentAnalysis.bestMove === `${varMove.from}${varMove.to}`)
      ) {
        classification = 'best';
      } else if (
        i === 0 &&
        liveLines.length > 0 &&
        liveLines[0].firstMove &&
        (liveLines[0].firstMove.san === varMove.san ||
          `${liveLines[0].firstMove.from}${liveLines[0].firstMove.to}` === `${varMove.from}${varMove.to}`)
      ) {
        classification = 'best';
      } else if (
        i === 0 &&
        liveLines.length > 1 &&
        liveLines[1].firstMove &&
        (liveLines[1].firstMove.san === varMove.san ||
          `${liveLines[1].firstMove.from}${liveLines[1].firstMove.to}` === `${varMove.from}${varMove.to}`)
      ) {
        classification = 'excellent';
      } else {
        classification = 'good';
      }

      return {
        label,
        san: item.move.san,
        plyIndex: i,
        isActive,
        classification,
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
        const parentAnalysis = parentPly >= 0 ? this.analysisService.movesAnalysis()[parentPly] : null;
        const liveLines = this.analysisService.liveEngineLines();
        const varMove = item.move;

        let classification: MoveClassification = 'good';
        let commentary = `Exploring variation move ${item.move.san}. Step forward or play alternate moves on the board.`;

        if (this.isFollowUpActive()) {
          classification = 'best';
          commentary = `Demonstrating engine continuation (${item.move.san}) from move ${parentPly >= 0 ? Math.floor(parentPly / 2) + 1 : 1}.`;
        } else if (
          this.isBestVariation() ||
          (parentAnalysis &&
            (parentAnalysis.bestMoveSan === varMove.san ||
              parentAnalysis.bestMove === `${varMove.from}${varMove.to}`))
        ) {
          classification = 'best';
          commentary = `Alternative move ${item.move.san} matches the top engine recommendation for this position.`;
        } else if (
          liveLines.length > 0 &&
          liveLines[0].firstMove &&
          (liveLines[0].firstMove.san === varMove.san ||
            `${liveLines[0].firstMove.from}${liveLines[0].firstMove.to}` === `${varMove.from}${varMove.to}`)
        ) {
          classification = 'best';
          commentary = `Alternative move ${item.move.san} is evaluated as the strongest engine candidate.`;
        } else if (
          liveLines.length > 1 &&
          liveLines[1].firstMove &&
          (liveLines[1].firstMove.san === varMove.san ||
            `${liveLines[1].firstMove.from}${liveLines[1].firstMove.to}` === `${varMove.from}${varMove.to}`)
        ) {
          classification = 'excellent';
          commentary = `Alternative move ${item.move.san} is a strong second-choice engine line.`;
        } else {
          commentary = `Exploring variation move ${item.move.san}. Step forward, play alternate moves, or click RETURN to resume the main review.`;
        }

        return {
          isVariation: true,
          isFollowUp: this.isFollowUpActive(),
          isBest: this.isBestVariation() || classification === 'best',
          plyIndex: parentPly,
          san: item.move.san,
          turn: item.move.color,
          moveTime: undefined,
          clock: undefined,
          classification,
          accuracy: null,
          commentary,
          bestMoveSan: parentAnalysis?.bestMoveSan,
          followUpMoves: parentAnalysis?.followUpMoves || [],
        };
      }
    }

    const ply = this.game.currentPlyIndex();
    const hist = this.game.history();
    if (hist.length === 0) return null;

    if (ply === null || ply < 0) return null;
    const item = hist[ply];
    if (!item) return null;

    const analysis = this.game.currentMoveAnalysis() || this.analysisService.movesAnalysis()[ply];

    return {
      isVariation: false,
      isFollowUp: false,
      isBest: false,
      plyIndex: ply,
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

  readonly gameSummaryCommentary = computed<string>(() => {
    const hist = this.game.history();
    if (hist.length === 0) {
      return 'Ready for move 1. Play your moves on the board, or import a match from Chess.com!';
    }

    const meta = this.game.matchMetadata();
    const outcome = this.game.gameOutcome();
    const summary = this.analysisService.summary();
    const detectedOpening = this.analysisService.detectedOpening();

    return getGameSummaryCommentary({
      whiteName: meta.white?.name,
      blackName: meta.black?.name,
      whiteRating: meta.white?.rating,
      blackRating: meta.black?.rating,
      openingName: detectedOpening?.name || meta.openingName,
      eco: detectedOpening?.eco || meta.eco,
      result: meta.result,
      termination: meta.termination,
      totalPlies: hist.length,
      winner: outcome.winner,
      terminationType: outcome.terminationType,
      whiteAccuracy: summary?.whiteAccuracy,
      blackAccuracy: summary?.blackAccuracy,
      whiteCounts: summary?.whiteCounts as any,
      blackCounts: summary?.blackCounts as any,
    });
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
      this.soundService.playRandomPackSound(pack.id as any, this.settings.volume());
    }
  }

  speakCurrentCommentary(): void {
    const exp = this.currentExplanation();
    const text =
      exp?.commentary ||
      (exp ? `${exp.san} is ${exp.classification}` : this.gameSummaryCommentary());
    this.voiceService.speak(text, { force: true, interrupt: true });
  }

  loadNewGame(): void {
    this.stopFollowUp();
    this.game.resetGame();
    this.isImporterOpen.set(false);
    this.isReportView.set(true);
    this.settings.flashToast('READY TO LOAD GAME');
  }

  toggleImporter(): void {
    this.isImporterOpen.update((o) => !o);
    if (this.isImporterOpen()) {
      this.importerTab.set('online');
    }
  }

  setImporterTab(tab: ImporterSubTab): void {
    this.importerTab.set(tab);
  }

  onOnlineGameSelected(_game: FetchedGame): void {
    this.isImporterOpen.set(false);
    this.isReportView.set(true);
    this.settings.flashToast('ONLINE GAME LOADED');
  }

  loadSample(gameId: string): void {
    const success = this.game.loadSampleGame(gameId);
    if (success) {
      this.isImporterOpen.set(false);
      this.isReportView.set(true);
      this.settings.flashToast('SAMPLE LOADED');
    }
  }

  importPgn(): void {
    const text = this.pgnInputText().trim();
    if (!text) return;
    const success = this.game.loadPgn(text);
    if (success) {
      this.isImporterOpen.set(false);
      this.isReportView.set(true);
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

  onLineHover(rank: number | null): void {
    this.analysisService.setHoveredLineRank(rank);
  }

  onLineClick(line: LiveEngineLine): void {
    this.stopFollowUp();
    this.game.previewEngineLine(line);
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

  readonly Math = Math;

  startReviewWalkthrough(): void {
    this.isReportView.set(false);
    this.game.goToStart();
    if (this.settings.voiceCommentary()) {
      this.voiceService.speak(this.gameSummaryCommentary(), { force: true, interrupt: true });
    }
  }

  returnToReport(): void {
    this.isReportView.set(true);
  }

  jumpFromMomentum(ply: number): void {
    this.isReportView.set(false);
    this.jumpTo(ply - 1);
  }

  seekMomentum(event: MouseEvent): void {
    const data = this.momentumData();
    if (!data.mappedPoints || data.mappedPoints.length === 0) return;

    const target = event.currentTarget as HTMLElement | SVGElement;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0) return;

    const clickSvgX = ((event.clientX - rect.left) / rect.width) * 500;

    let closestPoint = data.mappedPoints[0];
    let minDiff = Math.abs(data.mappedPoints[0].x - clickSvgX);

    for (let i = 1; i < data.mappedPoints.length; i++) {
      const diff = Math.abs(data.mappedPoints[i].x - clickSvgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = data.mappedPoints[i];
      }
    }

    if (closestPoint) {
      this.jumpFromMomentum(closestPoint.ply);
    }
  }

  triggerAutoAnalysis(): void {
    const history = this.game.history();
    if (history.length === 0) return;
    const moveInputs = history.map((h) => ({
      from: h.from,
      to: h.to,
      piece: h.piece,
      captured: h.captured,
      san: h.san,
      fen: h.fen,
      turn: h.turn,
    }));
    const meta = this.game.matchMetadata();
    this.analysisService.runAnalysis(moveInputs, undefined, {
      white: meta.white.rating,
      black: meta.black.rating,
    });
  }

  getPlayerInitial(name?: string): string {
    if (!name) return '?';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase();
  }

  getCoachVerdictBadgeClass(verdict?: string): string {
    switch (verdict?.toUpperCase()) {
      case 'EXCEPTIONAL':
        return 'bg-[#10B981] text-white border-[#222222] dark:border-black';
      case 'GREAT':
        return 'bg-[#0E4C92] text-white border-[#222222] dark:border-black';
      case 'SOLID':
        return 'bg-[#F59E0B] text-black border-[#222222] dark:border-black';
      case 'MEDIOCRE':
        return 'bg-[#F97316] text-white border-[#222222] dark:border-black';
      case 'BAD':
      default:
        return 'bg-[#DC2626] text-white border-[#222222] dark:border-black';
    }
  }

  getPhaseBadgeInfo(quality?: string): { icon: IconName; symbol: string; badgeClass: string; label: string; isEmpty: boolean } {
    if (!quality || quality === '-' || quality === '—') {
      return {
        icon: 'check',
        symbol: '—',
        badgeClass: 'bg-transparent text-gray-400 border-none',
        label: '—',
        isEmpty: true,
      };
    }
    const q = quality.toLowerCase();
    if (q.includes('brilliant')) {
      return { icon: 'sparkles', symbol: '!!', badgeClass: 'bg-[#00C0F9] text-black border-[#222222]', label: 'Brilliant', isEmpty: false };
    }
    if (q.includes('great')) {
      return { icon: 'arrow-trending-up', symbol: '!', badgeClass: 'bg-[#0E4C92] text-white border-[#222222]', label: 'Great', isEmpty: false };
    }
    if (q.includes('best')) {
      return { icon: 'star', symbol: '★', badgeClass: 'bg-[#10B981] text-white border-[#222222]', label: 'Best', isEmpty: false };
    }
    if (q.includes('inaccuracy')) {
      return { icon: 'exclamation-circle', symbol: '?!', badgeClass: 'bg-[#F59E0B] text-black border-[#222222]', label: 'Inaccuracy', isEmpty: false };
    }
    if (q.includes('mistake')) {
      return { icon: 'question-mark-circle', symbol: '?', badgeClass: 'bg-[#F97316] text-white border-[#222222]', label: 'Mistake', isEmpty: false };
    }
    if (q.includes('miss')) {
      return { icon: 'x-mark', symbol: '✕', badgeClass: 'bg-[#EA580C] text-white border-[#222222]', label: 'Miss', isEmpty: false };
    }
    if (q.includes('blunder')) {
      return { icon: 'exclamation-triangle', symbol: '??', badgeClass: 'bg-[#DC2626] text-white border-[#222222]', label: 'Blunder', isEmpty: false };
    }
    if (q.includes('good') || q.includes('excellent')) {
      return { icon: 'check', symbol: '✓', badgeClass: 'bg-[#10B981] text-white border-[#222222]', label: 'Good', isEmpty: false };
    }
    return { icon: 'star', symbol: '•', badgeClass: 'bg-[#D9D9D9] text-[#222222] border-[#222222]', label: quality, isEmpty: false };
  }
}
