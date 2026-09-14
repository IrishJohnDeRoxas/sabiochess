import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FetchedGame, PlatformImporterService } from '../../services/platform-importer.service';
import { ChessGameService } from '../../services/chess-game.service';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../icon/icon.component';

export type PlatformType = 'chess.com' | 'lichess';

@Component({
  selector: 'app-platform-game-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './platform-game-selector.component.html',
  styleUrls: ['./platform-game-selector.component.css'],
})
export class PlatformGameSelectorComponent {
  private readonly platformService = inject(PlatformImporterService);
  private readonly gameService = inject(ChessGameService);
  readonly settings = inject(SettingsService);

  @Output() gameSelected = new EventEmitter<FetchedGame>();

  readonly activePlatform = signal<PlatformType>('chess.com');
  readonly username = signal<string>(this.settings.chesscomUsername() || 'Hikaru');
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly gamesList = signal<FetchedGame[]>([]);

  selectPlatform(platform: PlatformType): void {
    this.activePlatform.set(platform);
    this.errorMessage.set(null);
    if (platform === 'chess.com') {
      this.username.set(this.settings.chesscomUsername() || 'Hikaru');
    } else {
      this.username.set(this.settings.lichessUsername() || 'DrNykterstein');
    }
  }

  async fetchGames(): Promise<void> {
    const user = this.username().trim();
    if (!user) {
      this.errorMessage.set('Please enter a valid username');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      let games: FetchedGame[] = [];
      if (this.activePlatform() === 'chess.com') {
        this.settings.setChesscomUsername(user);
        games = await this.platformService.fetchChessComGames(user);
      } else {
        this.settings.setLichessUsername(user);
        games = await this.platformService.fetchLichessGames(user);
      }
      this.gamesList.set(games);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not fetch games from platform';
      this.errorMessage.set(msg);
      this.gamesList.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  loadGame(game: FetchedGame): void {
    const success = this.gameService.loadPgn(game.pgn);
    if (success) {
      this.gameSelected.emit(game);
    } else {
      this.errorMessage.set('Failed to load selected game PGN.');
    }
  }
}
