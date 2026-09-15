import { Component, computed, inject, signal, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessGameService, SAMPLE_GAMES } from '../../../services/chess-game.service';
import { GameAnalysisService } from '../../../services/game-analysis.service';
import { SoundService } from '../../../services/sound.service';
import { SettingsService } from '../../../services/settings.service';
import { MEME_SOUND_PACKS, MemeSoundPack } from '../../../models/settings.model';
import { MoveClassification, getHeroIconForClass } from '../../../models/analysis.model';
import { IconComponent, IconName } from '../../icon/icon.component';
import { PlatformGameSelectorComponent } from '../../platform-game-selector/platform-game-selector.component';
import { FetchedGame } from '../../../services/platform-importer.service';

export type ImporterSubTab = 'online' | 'samples' | 'pgn';

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
  imports: [CommonModule, FormsModule, IconComponent, PlatformGameSelectorComponent],
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
  private followUpInterval: ReturnType<typeof setInterval> | null = null;
  private followUpOriginalPly: number | null = null;

  readonly statsList: StatItem[] = [
    { key: 'brilliant', label: 'Brilliant', icon: 'sparkles', symbol: '!!', badgeClass: 'bg-[#8B5CF6] text-white border-[#222222]' },
    { key: 'great', label: 'Great', icon: 'arrow-trending-up', symbol: '!', badgeClass: 'bg-[#06B6D4] text-white border-[#222222]' },
    { key: 'best', label: 'Best', icon: 'star', symbol: '★', badgeClass: 'bg-[#10B981] text-white border-[#222222]' },
    { key: 'excellent', label: 'Excellent', icon: 'check', symbol: '✓', badgeClass: 'bg-[#84CC16] text-[#222222] border-[#222222]' },
    { key: 'good', label: 'Good', icon: 'check', symbol: '✓', badgeClass: 'bg-[#3B82F6] text-white border-[#222222]' },
    { key: 'book', label: 'Book', icon: 'book-open', symbol: '📖', badgeClass: 'bg-[#A16207] text-white border-[#222222]' },
    { key: 'inaccuracy', label: 'Inaccuracy', icon: 'exclamation-triangle', symbol: '?!', badgeClass: 'bg-[#F59E0B] text-[#222222] border-[#222222]' },
    { key: 'mistake', label: 'Mistake', icon: 'exclamation-triangle', symbol: '?', badgeClass: 'bg-[#F97316] text-white border-[#222222]' },
    { key: 'miss', label: 'Miss', icon: 'trash', symbol: '✕', badgeClass: 'bg-[#EA580C] text-white border-[#222222]' },
    { key: 'blunder', label: 'Blunder', icon: 'exclamation-triangle', symbol: '??', badgeClass: 'bg-[#EF4444] text-white border-[#222222]' },
  ];

  readonly activeSoundLabel = computed(() => {
    if (this.soundService.isMuted()) return 'MUTED';
    if (!this.settings.memeSounds()) return 'STANDARD';
    const pack = this.soundPacks.find((p) => p.id === this.settings.memePack());
    return pack ? pack.name.toUpperCase() : 'MEME';
  });

  readonly movePairs = computed<MovePairItem[]>(() => {
    const hist = this.game.history();
    const analyses = this.analysisService.movesAnalysis();
    const pairs: MovePairItem[] = [];

    for (let i = 0; i < hist.length; i += 2) {
      const whiteItem = hist[i];
      const blackItem = i + 1 < hist.length ? hist[i + 1] : undefined;
      const whiteAnalysis = analyses[i];
      const blackAnalysis = analyses[i + 1];

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
      });
    }

    return pairs;
  });

  readonly currentExplanation = computed(() => {
    const ply = this.game.currentPlyIndex();
    const hist = this.game.history();
    if (hist.length === 0) return null;

    const targetPly = ply === null || ply < 0 ? 0 : ply;
    const item = hist[targetPly];
    if (!item) return null;

    const analysis = this.game.currentMoveAnalysis() || this.analysisService.movesAnalysis()[targetPly];

    return {
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

  jumpTo(plyIndex: number): void {
    this.stopFollowUp();
    this.game.jumpToPly(plyIndex);
  }

  toggleFollowUp(): void {
    if (this.isPlayingFollowUp()) {
      this.stopFollowUp();
    } else {
      this.startFollowUp();
    }
  }

  private startFollowUp(): void {
    const exp = this.currentExplanation();
    if (!exp || exp.followUpMoves.length === 0) return;

    this.followUpOriginalPly = this.game.currentPlyIndex();
    this.isPlayingFollowUp.set(true);

    let step = 0;
    const startPly = exp.plyIndex;

    this.followUpInterval = setInterval(() => {
      if (step < exp.followUpMoves.length && startPly + step + 1 < this.game.history().length) {
        step++;
        this.game.jumpToPly(startPly + step);
      } else {
        this.stopFollowUp();
      }
    }, 1000);
  }

  private stopFollowUp(): void {
    this.isPlayingFollowUp.set(false);
    if (this.followUpInterval) {
      clearInterval(this.followUpInterval);
      this.followUpInterval = null;
    }
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
