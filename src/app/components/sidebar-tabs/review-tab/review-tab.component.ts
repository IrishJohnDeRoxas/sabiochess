import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessGameService, SAMPLE_GAMES } from '../../../services/chess-game.service';
import { GameAnalysisService } from '../../../services/game-analysis.service';
import { SoundService } from '../../../services/sound.service';
import { SettingsService } from '../../../services/settings.service';
import { MEME_SOUND_PACKS, MemeSoundPack } from '../../../models/settings.model';
import { IconComponent } from '../../icon/icon.component';
import { PlatformGameSelectorComponent } from '../../platform-game-selector/platform-game-selector.component';
import { FetchedGame } from '../../../services/platform-importer.service';

export type ImporterSubTab = 'online' | 'samples' | 'pgn';

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

  readonly activeSoundLabel = computed(() => {
    if (this.soundService.isMuted()) return 'MUTED';
    if (!this.settings.memeSounds()) return 'STANDARD';
    const pack = this.soundPacks.find((p) => p.id === this.settings.memePack());
    return pack ? pack.name.toUpperCase() : 'MEME';
  });

  readonly movePairs = computed(() => {
    const hist = this.game.history();
    const pairs: {
      num: number;
      whiteSan: string;
      whitePly: number;
      blackSan?: string;
      blackPly?: number;
    }[] = [];

    for (let i = 0; i < hist.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        whiteSan: hist[i].san,
        whitePly: i,
        blackSan: hist[i + 1]?.san,
        blackPly: i + 1 < hist.length ? i + 1 : undefined,
      });
    }

    return pairs;
  });

  toggleSoundMenu(): void {
    this.isSoundMenuOpen.update((o) => !o);
  }

  selectSoundPack(pack: MemeSoundPack): void {
    this.settings.setMemePack(pack);
    this.settings.setMemeSounds(true);
    this.soundService.setMuted(false);
    this.isSoundMenuOpen.set(false);
  }

  setStandardSounds(): void {
    this.settings.setMemeSounds(false);
    this.soundService.setMuted(false);
    this.isSoundMenuOpen.set(false);
  }

  previewSoundPack(pack: MemeSoundPack, event: Event): void {
    event.stopPropagation();
    this.soundService.playReactionSound('best', pack, this.settings.volume());
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

  getClassificationBadgeClass(classification: string): string {
    switch (classification) {
      case 'brilliant':
        return 'bg-[#8B5CF6] text-white border-[#222222]';
      case 'great':
        return 'bg-[#06B6D4] text-white border-[#222222]';
      case 'best':
        return 'bg-[#10B981] text-white border-[#222222]';
      case 'excellent':
        return 'bg-[#84CC16] text-[#222222] border-[#222222]';
      case 'good':
        return 'bg-[#3B82F6] text-white border-[#222222]';
      case 'book':
        return 'bg-[#A16207] text-white border-[#222222]';
      case 'inaccuracy':
        return 'bg-[#F59E0B] text-[#222222] border-[#222222]';
      case 'mistake':
        return 'bg-[#F97316] text-white border-[#222222]';
      case 'miss':
        return 'bg-[#EA580C] text-white border-[#222222]';
      case 'blunder':
        return 'bg-[#EF4444] text-white border-[#222222]';
      default:
        return 'bg-[#D9D9D9] text-[#222222] border-[#222222]';
    }
  }

  getClassificationSymbol(classification: string): string {
    switch (classification) {
      case 'brilliant':
        return '!!';
      case 'great':
        return '!';
      case 'best':
        return '★';
      case 'excellent':
        return '✓';
      case 'good':
        return '✓';
      case 'book':
        return '📖';
      case 'inaccuracy':
        return '?!';
      case 'mistake':
        return '?';
      case 'miss':
        return '✕';
      case 'blunder':
        return '??';
      default:
        return '•';
    }
  }
}
