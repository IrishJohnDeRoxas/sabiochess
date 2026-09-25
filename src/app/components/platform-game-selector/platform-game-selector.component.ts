import { ChangeDetectionStrategy, Component, inject, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FetchedGame, PlatformImporterService } from '../../services/platform-importer.service';
import { ChessGameService } from '../../services/chess-game.service';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../icon/icon.component';

export type PlatformType = 'chess.com' | 'lichess';

const CACHE_PREFIX = 'sabiochess_cached_games_';
const RECENT_CACHE_KEY = 'sabiochess_recent_cached_games';

interface CachedPlatformGames {
  platform: PlatformType;
  username: string;
  games: FetchedGame[];
  timestamp: number;
}

@Component({
  selector: 'app-platform-game-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './platform-game-selector.component.html',
  styleUrls: ['./platform-game-selector.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformGameSelectorComponent implements OnInit {
  private readonly platformService = inject(PlatformImporterService);
  private readonly gameService = inject(ChessGameService);
  readonly settings = inject(SettingsService);

  readonly gameSelected = output<FetchedGame>();

  readonly activePlatform = signal<PlatformType>('chess.com');
  readonly username = signal<string>(this.settings.chesscomUsername() || 'Hikaru');
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly gamesList = signal<FetchedGame[]>([]);

  ngOnInit(): void {
    const initialUser =
      this.activePlatform() === 'chess.com'
        ? this.settings.chesscomUsername() || 'Hikaru'
        : this.settings.lichessUsername() || 'EricRosen';
    this.username.set(initialUser);
    this.restoreCachedGames(this.activePlatform(), initialUser);
  }

  selectPlatform(platform: PlatformType): void {
    this.activePlatform.set(platform);
    this.errorMessage.set(null);
    const storedUsername =
      platform === 'chess.com'
        ? this.settings.chesscomUsername() || 'Hikaru'
        : this.settings.lichessUsername() || 'EricRosen';
    this.username.set(storedUsername);
    this.restoreCachedGames(platform, storedUsername);
  }

  onUsernameChange(newUsername: string): void {
    this.username.set(newUsername);
    this.errorMessage.set(null);
    if (newUsername.trim()) {
      this.restoreCachedGames(this.activePlatform(), newUsername.trim());
    }
  }

  clearUsername(): void {
    this.username.set('');
    this.errorMessage.set(null);
  }

  clearGames(): void {
    this.gamesList.set([]);
    this.errorMessage.set(null);

    const user = this.username().trim().toLowerCase();
    if (typeof localStorage !== 'undefined') {
      try {
        if (user) {
          localStorage.removeItem(`${CACHE_PREFIX}${this.activePlatform()}_${user}`);
        }
        localStorage.removeItem(RECENT_CACHE_KEY);
      } catch {
        // Ignore storage removal errors
      }
    }
    this.settings.flashToast('Recent games cleared');
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
      this.saveGamesToCache(this.activePlatform(), user, games);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not fetch games from platform';
      this.errorMessage.set(msg);
      this.gamesList.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  loadGame(game: FetchedGame): void {
    const user = this.username().trim();
    const success = this.gameService.loadOnlineGame(game, user);
    if (success) {
      this.gameSelected.emit(game);
    } else {
      this.errorMessage.set('Failed to load selected game PGN.');
    }
  }

  private saveGamesToCache(platform: PlatformType, username: string, games: FetchedGame[]): void {
    if (typeof localStorage === 'undefined' || !games || games.length === 0) return;
    try {
      const cachePayload: CachedPlatformGames = {
        platform,
        username,
        games,
        timestamp: Date.now(),
      };
      const key = `${CACHE_PREFIX}${platform}_${username.toLowerCase()}`;
      localStorage.setItem(key, JSON.stringify(cachePayload));
      localStorage.setItem(RECENT_CACHE_KEY, JSON.stringify(cachePayload));
    } catch {
      // Ignore quota exceeded or serialization errors
    }
  }

  private restoreCachedGames(platform?: PlatformType, targetUsername?: string): void {
    if (typeof localStorage === 'undefined') return;
    const plat = platform || this.activePlatform();
    const user = (targetUsername !== undefined ? targetUsername : this.username()).trim().toLowerCase();

    try {
      if (user) {
        const specificRaw = localStorage.getItem(`${CACHE_PREFIX}${plat}_${user}`);
        if (specificRaw) {
          const parsed = JSON.parse(specificRaw) as CachedPlatformGames;
          if (parsed && Array.isArray(parsed.games) && parsed.games.length > 0) {
            this.gamesList.set(parsed.games);
            return;
          }
        }
      }

      // Check fallback recent cache
      const recentRaw = localStorage.getItem(RECENT_CACHE_KEY);
      if (recentRaw) {
        const parsed = JSON.parse(recentRaw) as CachedPlatformGames;
        if (parsed && parsed.platform === plat && Array.isArray(parsed.games) && parsed.games.length > 0) {
          if (!user || parsed.username.toLowerCase() === user) {
            this.gamesList.set(parsed.games);
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
}
