import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SettingsService } from './settings.service';
import { ChessGameService } from './chess-game.service';

export interface ParsedPlatformInput {
  isGameUrlOrId: boolean;
  gameId?: string;
  extractedUsername?: string;
  platform?: 'chess.com' | 'lichess';
}

export function parsePlatformInput(raw: string): ParsedPlatformInput {
  const trimmed = raw.trim();
  if (!trimmed) return { isGameUrlOrId: false };

  // Chess.com URL: chess.com/game/live/12345 or chess.com/game/daily/12345 or chess.com/game/12345
  const chessComMatch = trimmed.match(
    /(?:chess\.com\/(?:[a-z]{2}\/)?(?:analysis\/)?game\/(?:live|daily)?\/?(\d+)|chess\.com\/game\/(\d+))/i
  );
  if (chessComMatch) {
    const gameId = chessComMatch[1] || chessComMatch[2];
    let extractedUsername: string | undefined;
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const userParam = url.searchParams.get('username') || url.searchParams.get('user');
      if (userParam) extractedUsername = userParam.trim().toLowerCase();
    } catch {}
    return { isGameUrlOrId: true, gameId, extractedUsername, platform: 'chess.com' };
  }

  // Lichess URL: lichess.org/xxxx or lichess.org/xxxx/black
  const lichessMatch = trimmed.match(/lichess\.org\/([a-zA-Z0-9]{8})/i);
  if (lichessMatch) {
    return { isGameUrlOrId: true, gameId: lichessMatch[1], platform: 'lichess' };
  }

  // Purely numeric game ID (min 7 digits) -> Chess.com
  if (/^\d{7,}$/.test(trimmed)) {
    return { isGameUrlOrId: true, gameId: trimmed, platform: 'chess.com' };
  }

  // Purely 8-char alphanumeric string with both digits/letters -> Lichess game ID
  if (/^[a-zA-Z0-9]{8}$/.test(trimmed) && /[a-z]/i.test(trimmed) && /\d/.test(trimmed)) {
    return { isGameUrlOrId: true, gameId: trimmed, platform: 'lichess' };
  }

  return { isGameUrlOrId: false };
}

export interface FetchedGame {
  id: string;
  white: string;
  black: string;
  whiteRating?: number;
  blackRating?: number;
  date: string;
  timeControl: string;
  result: string; // "1-0", "0-1", "1/2-1/2"
  userResult: 'win' | 'loss' | 'draw' | 'unknown';
  pgn: string;
  platform: 'chess.com' | 'lichess';
  eco?: string;
  openingName?: string;
}

export interface ChessComPlayer {
  username?: string;
  rating?: number;
  result?: string;
}

export interface ChessComGame {
  url?: string;
  pgn: string;
  time_control?: string;
  time_class?: string;
  end_time?: number;
  white?: ChessComPlayer;
  black?: ChessComPlayer;
}

export interface ChessComMonthResponse {
  games?: ChessComGame[];
}

@Injectable({
  providedIn: 'root',
})
export class PlatformImporterService {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(SettingsService, { optional: true });
  private readonly gameService = inject(ChessGameService, { optional: true });

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).testFetchGame = async (
        urlOrInput: string = 'https://www.chess.com/game/live/169503198404?username=irishjohnderoxas',
        options?: { load?: boolean }
      ) => {
        console.group('[SabioChess Test] Fetching Game');
        console.log('Testing Input:', urlOrInput);
        try {
          const parsed = parsePlatformInput(urlOrInput);
          console.log('Parsed Platform Info:', parsed);

          let games: FetchedGame[] = [];
          if (parsed.platform === 'lichess') {
            games = await this.fetchLichessGames(urlOrInput);
          } else {
            games = await this.fetchChessComGames(urlOrInput);
          }

          console.log(`Success! Fetched ${games.length} game(s):`, games);
          if (games.length > 0) {
            const g = games[0];
            console.log('Game Summary:');
            console.log(`  White: ${g.white} (${g.whiteRating || '?'})`);
            console.log(`  Black: ${g.black} (${g.blackRating || '?'})`);
            console.log(`  Date: ${g.date}`);
            console.log(`  Result: ${g.result} (${g.userResult})`);
            console.log(`  PGN Length: ${g.pgn.length} chars`);
            console.log('Full PGN:\n' + g.pgn);

            if (options?.load && this.gameService) {
              this.gameService.loadPgn(g.pgn);
              console.log('Loaded game into board because options.load === true.');
            } else {
              console.log('Note: App state was not modified. Pass { load: true } as 2nd arg if you want to load it.');
            }
          }
          console.groupEnd();
          return games;
        } catch (err) {
          console.error('[SabioChess Test] Fetch failed:', err);
          console.groupEnd();
          throw err;
        }
      };
    }
  }

  async fetchChessComGames(rawInput: string, specificGameId?: string): Promise<FetchedGame[]> {
    const input = rawInput.trim();
    if (!input) throw new Error('Please enter a Chess.com username or game URL');

    const parsed = parsePlatformInput(input);
    const gameId = specificGameId || (parsed.isGameUrlOrId && parsed.platform === 'chess.com' ? parsed.gameId : undefined);
    let username = (parsed.extractedUsername || (parsed.isGameUrlOrId ? '' : input)).toLowerCase();

    if (!username && gameId) {
      username = (this.settings?.chesscomUsername() || '').toLowerCase();
    }

    if (!username) {
      if (gameId) {
        throw new Error(
          `Please provide your Chess.com username along with game ${gameId}`
        );
      }
      throw new Error('Please enter a Chess.com username');
    }

    const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`;
    const archivesRes = await firstValueFrom(
      this.http.get<{ archives?: string[] }>(archivesUrl)
    );

    if (!archivesRes.archives || archivesRes.archives.length === 0) {
      throw new Error(`No games found for player "${username}" on Chess.com`);
    }

    // If searching for a specific game, search all archives backwards!
    // Otherwise scan up to the last 12 active archive months (stop when reaching 40 games).
    const archivesToScan = gameId
      ? [...archivesRes.archives].reverse()
      : archivesRes.archives.slice(-12).reverse();

    const fetchedGames: FetchedGame[] = [];

    for (const url of archivesToScan) {
      try {
        const monthRes = await firstValueFrom(
          this.http.get<ChessComMonthResponse>(url)
        );
        if (monthRes.games && Array.isArray(monthRes.games)) {
          if (gameId) {
            const matched = monthRes.games.find(
              (g) => (g.url && g.url.includes(gameId)) || (g.pgn && g.pgn.includes(gameId))
            );
            if (matched && matched.pgn) {
              return [this.mapChessComGame(matched, username)];
            }
          } else {
            // Sort latest games first
            const sorted = [...monthRes.games].reverse();
            for (const g of sorted) {
              if (g.pgn) {
                fetchedGames.push(this.mapChessComGame(g, username));
              }
            }
          }
        }
      } catch {
        // Continue with next archive if one fails
      }
      if (!gameId && fetchedGames.length >= 40) break;
    }

    if (gameId) {
      throw new Error(`Game ID "${gameId}" not found in player "${username}" archives.`);
    }

    if (fetchedGames.length === 0) {
      throw new Error(`No recent games found for "${username}".`);
    }

    return fetchedGames;
  }

  async fetchLichessGames(rawInput: string, specificGameId?: string): Promise<FetchedGame[]> {
    const input = rawInput.trim();
    if (!input) throw new Error('Please enter a Lichess username or game URL');

    const parsed = parsePlatformInput(input);
    const gameId = specificGameId || (parsed.isGameUrlOrId && parsed.platform === 'lichess' ? parsed.gameId : undefined);

    if (gameId) {
      const url = `https://lichess.org/game/export/${encodeURIComponent(gameId)}?clocks=true&evals=true&opening=true`;
      const headers = new HttpHeaders({ Accept: 'application/x-chess-pgn' });
      const pgnText = await firstValueFrom(
        this.http.get(url, { headers, responseType: 'text' })
      );
      if (!pgnText || !pgnText.trim()) {
        throw new Error(`Game "${gameId}" not found on Lichess`);
      }
      return this.parseMultiplePgns(pgnText, parsed.extractedUsername || '');
    }

    const username = input;
    const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=50&clocks=true&evals=true&opening=true`;
    const headers = new HttpHeaders({ Accept: 'application/x-chess-pgn' });

    const pgnText = await firstValueFrom(
      this.http.get(url, { headers, responseType: 'text' })
    );

    if (!pgnText || !pgnText.trim()) {
      throw new Error(`No games found for "${username}" on Lichess`);
    }

    return this.parseMultiplePgns(pgnText, username);
  }

  private mapChessComGame(game: ChessComGame, targetUsername: string): FetchedGame {
    const whiteUser = game.white?.username || 'White';
    const blackUser = game.black?.username || 'Black';
    const isUserWhite = whiteUser.toLowerCase() === targetUsername.toLowerCase();
    const isUserBlack = blackUser.toLowerCase() === targetUsername.toLowerCase();

    let userResult: 'win' | 'loss' | 'draw' | 'unknown' = 'unknown';
    const whiteResult = game.white?.result;
    const blackResult = game.black?.result;

    if (isUserWhite) {
      if (whiteResult === 'win') userResult = 'win';
      else if (whiteResult && ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(whiteResult)) userResult = 'draw';
      else userResult = 'loss';
    } else if (isUserBlack) {
      if (blackResult === 'win') userResult = 'win';
      else if (blackResult && ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(blackResult)) userResult = 'draw';
      else userResult = 'loss';
    }

    return {
      id: game.url || Math.random().toString(),
      white: whiteUser,
      black: blackUser,
      whiteRating: game.white?.rating,
      blackRating: game.black?.rating,
      date: this.extractPgnHeader(game.pgn, 'Date') || this.formatEpoch(game.end_time),
      timeControl: this.formatTimeControl(game.time_control || game.time_class),
      result: this.extractPgnHeader(game.pgn, 'Result') || (whiteResult === 'win' ? '1-0' : blackResult === 'win' ? '0-1' : '1/2-1/2'),
      userResult,
      pgn: game.pgn,
      platform: 'chess.com',
      eco: this.extractPgnHeader(game.pgn, 'ECO'),
      openingName: this.extractPgnHeader(game.pgn, 'ECOUrl')?.split('/').pop()?.replace(/-/g, ' '),
    };
  }

  private parseMultiplePgns(pgnText: string, targetUsername: string): FetchedGame[] {
    const games: FetchedGame[] = [];
    const rawGames = pgnText.split(/\n\n(?=\[Event )/g);

    for (const raw of rawGames) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const white = this.extractPgnHeader(trimmed, 'White') || 'White';
      const black = this.extractPgnHeader(trimmed, 'Black') || 'Black';
      const result = this.extractPgnHeader(trimmed, 'Result') || '*';
      const whiteRating = parseInt(this.extractPgnHeader(trimmed, 'WhiteElo') || '0', 10) || undefined;
      const blackRating = parseInt(this.extractPgnHeader(trimmed, 'BlackElo') || '0', 10) || undefined;
      const date = this.extractPgnHeader(trimmed, 'UTCDate') || this.extractPgnHeader(trimmed, 'Date') || 'Recent';
      const timeControl = this.formatTimeControl(this.extractPgnHeader(trimmed, 'TimeControl') || 'Standard');

      const isUserWhite = white.toLowerCase() === targetUsername.toLowerCase();
      const isUserBlack = black.toLowerCase() === targetUsername.toLowerCase();

      let userResult: 'win' | 'loss' | 'draw' | 'unknown' = 'unknown';
      if (result === '1-0') {
        userResult = isUserWhite ? 'win' : isUserBlack ? 'loss' : 'unknown';
      } else if (result === '0-1') {
        userResult = isUserBlack ? 'win' : isUserWhite ? 'loss' : 'unknown';
      } else if (result === '1/2-1/2') {
        userResult = 'draw';
      }

      games.push({
        id: this.extractPgnHeader(trimmed, 'Site') || Math.random().toString(),
        white,
        black,
        whiteRating,
        blackRating,
        date,
        timeControl,
        result,
        userResult,
        pgn: trimmed,
        platform: 'lichess',
        eco: this.extractPgnHeader(trimmed, 'ECO'),
        openingName: this.extractPgnHeader(trimmed, 'Opening'),
      });
    }

    return games;
  }

  private extractPgnHeader(pgn: string, headerName: string): string | undefined {
    if (!pgn) return undefined;
    const match = pgn.match(new RegExp(`\\[${headerName}\\s+"([^"]+)"\\]`));
    return match ? match[1] : undefined;
  }

  private formatTimeControl(raw: string | undefined): string {
    if (!raw) return 'Chess';
    if (raw === '60' || raw === '60+0' || raw === 'bullet') return '1m Bullet';
    if (raw === '180' || raw === '180+0' || raw === '180+2' || raw === 'blitz') return '3m Blitz';
    if (raw === '300' || raw === '300+0' || raw === '300+5') return '5m Blitz';
    if (raw === '600' || raw === '600+0' || raw === 'rapid') return '10m Rapid';
    if (raw === '900+10') return '15|10 Rapid';
    return raw;
  }

  private formatEpoch(epoch: number | undefined): string {
    if (!epoch) return 'Recent';
    const d = new Date(epoch * 1000);
    return d.toISOString().split('T')[0];
  }
}
