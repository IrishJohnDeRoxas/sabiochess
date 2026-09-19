import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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

  async fetchChessComGames(rawUsername: string): Promise<FetchedGame[]> {
    const username = rawUsername.trim().toLowerCase();
    if (!username) throw new Error('Please enter a Chess.com username');

    const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`;
    const archivesRes = await firstValueFrom(
      this.http.get<{ archives?: string[] }>(archivesUrl)
    );

    if (!archivesRes.archives || archivesRes.archives.length === 0) {
      throw new Error(`No games found for player "${rawUsername}" on Chess.com`);
    }

    // Grab the latest 2 archive months (most recent games)
    const recentArchiveUrls = archivesRes.archives.slice(-2).reverse();
    const fetchedGames: FetchedGame[] = [];

    for (const url of recentArchiveUrls) {
      try {
        const monthRes = await firstValueFrom(
          this.http.get<ChessComMonthResponse>(url)
        );
        if (monthRes.games && Array.isArray(monthRes.games)) {
          // Sort latest games first
          const sorted = [...monthRes.games].reverse();
          for (const g of sorted) {
            if (g.pgn) {
              fetchedGames.push(this.mapChessComGame(g, username));
            }
          }
        }
      } catch {
        // Continue with next archive if one fails
      }
      if (fetchedGames.length >= 40) break;
    }

    if (fetchedGames.length === 0) {
      throw new Error(`No recent games found for "${rawUsername}".`);
    }

    return fetchedGames;
  }

  async fetchLichessGames(rawUsername: string): Promise<FetchedGame[]> {
    const username = rawUsername.trim();
    if (!username) throw new Error('Please enter a Lichess username');

    const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=30&clocks=true&evals=true&opening=true`;
    const headers = new HttpHeaders({ Accept: 'application/x-chess-pgn' });

    const pgnText = await firstValueFrom(
      this.http.get(url, { headers, responseType: 'text' })
    );

    if (!pgnText || !pgnText.trim()) {
      throw new Error(`No games found for "${rawUsername}" on Lichess`);
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
