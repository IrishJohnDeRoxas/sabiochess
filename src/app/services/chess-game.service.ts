import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Chess, Square, Move } from 'chess.js';
import { MoveAnalysis, MoveClassification } from '../models/analysis.model';
import { SettingsService } from './settings.service';
import { SoundService } from './sound.service';
import { GameAnalysisService } from './game-analysis.service';

export interface BoardSquareData {
  file: string;
  rank: number;
  square: Square;
  isLight: boolean;
  piece: { type: string; color: 'w' | 'b' } | null;
  isSelected: boolean;
  isLegalMove: boolean;
  isLegalCapture: boolean;
  isPreviousMove: boolean;
  classification?: MoveClassification;
}

export interface MoveRecord {
  from: string;
  to: string;
  piece: string;
  san: string;
  fen: string;
  turn: 'w' | 'b';
}

export interface PlayerInfo {
  name: string;
  rating?: number | string;
  title?: string;
  isEngine?: boolean;
}

export interface MatchMetadata {
  white: PlayerInfo;
  black: PlayerInfo;
  event?: string;
  site?: string;
  date?: string;
  result?: string;
  timeControl?: string;
  eco?: string;
  openingName?: string;
  platform?: 'chess.com' | 'lichess' | 'sample' | 'custom';
}

export interface CapturedPiece {
  type: string;
  count: number;
  svgUrl: string;
}

export interface SampleGame {
  id: string;
  title: string;
  white: string;
  black: string;
  whiteRating?: number | string;
  blackRating?: number | string;
  whiteTitle?: string;
  blackTitle?: string;
  event: string;
  result: string;
  pgn: string;
}

export const SAMPLE_GAMES: SampleGame[] = [
  {
    id: 'opera',
    title: 'The Opera Game',
    white: 'Paul Morphy',
    black: 'Duke Karl / Count Isouard',
    whiteRating: 2600,
    blackRating: 2100,
    whiteTitle: 'GM',
    event: 'Paris Opera, 1858',
    result: '1-0',
    pgn: '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0',
  },
  {
    id: 'deep_blue',
    title: 'Kasparov vs Deep Blue (Game 6)',
    white: 'Deep Blue',
    black: 'Garry Kasparov',
    whiteRating: 2820,
    blackRating: 2785,
    whiteTitle: 'BOT',
    blackTitle: 'GM',
    event: 'New York, 1997',
    result: '1-0',
    pgn: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Ng5 Ngf6 6. Bd3 e6 7. N1f3 h6 8. Nxe6 Qe7 9. O-O fxe6 10. Bg6+ Kd8 11. Bf4 b5 12. a4 Bb7 13. Re1 Nd5 14. Bg3 Kc8 15. axb5 cxb5 16. Qd3 Bc6 17. Bf5 exf5 18. Rxe7 Bxe7 19. c4 1-0',
  },
  {
    id: 'century',
    title: 'Game of the Century',
    white: 'Donald Byrne',
    black: 'Bobby Fischer',
    whiteRating: 2500,
    blackRating: 2300,
    whiteTitle: 'IM',
    blackTitle: 'GM',
    event: 'Rosenwald Memorial, 1956',
    result: '0-1',
    pgn: '1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 0-1',
  },
  {
    id: 'immortal',
    title: 'The Immortal Game',
    white: 'Adolf Anderssen',
    black: 'Lionel Kieseritzky',
    whiteRating: 2600,
    blackRating: 2550,
    whiteTitle: 'GM',
    blackTitle: 'GM',
    event: 'London, 1851',
    result: '1-0',
    pgn: '1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0',
  },
];

@Injectable({
  providedIn: 'root',
})
export class ChessGameService {
  private readonly settings = inject(SettingsService);
  private readonly soundService = inject(SoundService);
  private readonly analysisService = inject(GameAnalysisService);

  private liveChess = new Chess();
  private displayChess = new Chess();

  // Signals for reactive state
  readonly matchMetadata = signal<MatchMetadata>({
    white: { name: 'White', rating: 1500 },
    black: { name: 'Black', rating: 1500 },
    event: 'Casual Game',
  });

  readonly fen = signal<string>(this.liveChess.fen());
  readonly turn = signal<'w' | 'b'>('w');
  readonly isBoardFlipped = signal<boolean>(false);
  readonly selectedSquare = signal<Square | null>(null);
  readonly legalMoveSquares = signal<Square[]>([]);
  readonly history = signal<MoveRecord[]>([]);
  readonly currentPlyIndex = signal<number | null>(null); // null = live end of game
  readonly lastMove = signal<{ from: string; to: string } | null>(null);
  readonly isGameOver = signal<boolean>(false);
  readonly gameOverReason = signal<string | null>(null);
  readonly isCheck = signal<boolean>(false);
  readonly evalScore = signal<number>(0.2); // White advantage in pawns
  readonly isAutoplaying = signal<boolean>(false);
  private autoplayInterval: ReturnType<typeof setInterval> | null = null;

  readonly isBrowsingHistory = computed(() => {
    const ply = this.currentPlyIndex();
    const hist = this.history();
    return ply !== null && ply < hist.length - 1;
  });

  readonly currentMoveAnalysis = computed<MoveAnalysis | null>(() => {
    const ply = this.currentPlyIndex();
    const analyses = this.analysisService.movesAnalysis();
    if (analyses.length === 0) return null;
    const targetIdx = ply !== null ? ply : this.history().length - 1;
    return analyses[targetIdx] || null;
  });

  readonly topPlayer = computed<PlayerInfo>(() => {
    return this.isBoardFlipped() ? this.matchMetadata().white : this.matchMetadata().black;
  });

  readonly bottomPlayer = computed<PlayerInfo>(() => {
    return this.isBoardFlipped() ? this.matchMetadata().black : this.matchMetadata().white;
  });

  readonly topColor = computed<'w' | 'b'>(() => {
    return this.isBoardFlipped() ? 'w' : 'b';
  });

  readonly bottomColor = computed<'w' | 'b'>(() => {
    return this.isBoardFlipped() ? 'b' : 'w';
  });

  readonly isTopTurn = computed<boolean>(() => {
    return this.turn() === this.topColor();
  });

  readonly isBottomTurn = computed<boolean>(() => {
    return this.turn() === this.bottomColor();
  });

  readonly capturedMaterial = computed(() => {
    this.fen();
    const active = this.getActiveChess();
    const board = active.board();

    const whiteCounts: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const blackCounts: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

    for (const row of board) {
      for (const sq of row) {
        if (sq) {
          if (sq.color === 'w' && whiteCounts[sq.type] !== undefined) {
            whiteCounts[sq.type]++;
          } else if (sq.color === 'b' && blackCounts[sq.type] !== undefined) {
            blackCounts[sq.type]++;
          }
        }
      }
    }

    const starting: Record<string, number> = { q: 1, r: 2, b: 2, n: 2, p: 8 };
    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

    const capturedByWhite: CapturedPiece[] = [];
    const capturedByBlack: CapturedPiece[] = [];

    for (const type of ['q', 'r', 'b', 'n', 'p']) {
      const missingBlack = Math.max(0, starting[type] - (blackCounts[type] || 0));
      if (missingBlack > 0) {
        capturedByWhite.push({
          type,
          count: missingBlack,
          svgUrl: `pieces/b${type.toUpperCase()}.svg`,
        });
      }

      const missingWhite = Math.max(0, starting[type] - (whiteCounts[type] || 0));
      if (missingWhite > 0) {
        capturedByBlack.push({
          type,
          count: missingWhite,
          svgUrl: `pieces/w${type.toUpperCase()}.svg`,
        });
      }
    }

    let whiteMaterial = 0;
    let blackMaterial = 0;
    for (const type of ['p', 'n', 'b', 'r', 'q']) {
      whiteMaterial += whiteCounts[type] * pieceValues[type];
      blackMaterial += blackCounts[type] * pieceValues[type];
    }

    const whiteAdvantage = Math.max(0, whiteMaterial - blackMaterial);
    const blackAdvantage = Math.max(0, blackMaterial - whiteMaterial);

    return {
      capturedByWhite,
      capturedByBlack,
      whiteAdvantage,
      blackAdvantage,
    };
  });

  readonly topCapturedPieces = computed<CapturedPiece[]>(() => {
    const mat = this.capturedMaterial();
    return this.topColor() === 'w' ? mat.capturedByWhite : mat.capturedByBlack;
  });

  readonly bottomCapturedPieces = computed<CapturedPiece[]>(() => {
    const mat = this.capturedMaterial();
    return this.bottomColor() === 'w' ? mat.capturedByWhite : mat.capturedByBlack;
  });

  readonly topMaterialAdvantage = computed<number>(() => {
    const mat = this.capturedMaterial();
    return this.topColor() === 'w' ? mat.whiteAdvantage : mat.blackAdvantage;
  });

  readonly bottomMaterialAdvantage = computed<number>(() => {
    const mat = this.capturedMaterial();
    return this.bottomColor() === 'w' ? mat.whiteAdvantage : mat.blackAdvantage;
  });

  // Computed 64-square board array (ordered 8->1 rank, a->h file or flipped)
  readonly boardSquares = computed<BoardSquareData[]>(() => {
    this.fen();
    const selected = this.selectedSquare();
    const legalMoves = this.legalMoveSquares();
    const last = this.lastMove();
    const flipped = this.isBoardFlipped();
    const activeChess = this.getActiveChess();

    const squares: BoardSquareData[] = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

    const displayRanks = flipped ? [...ranks].reverse() : ranks;
    const displayFiles = flipped ? [...files].reverse() : files;

    for (const rank of displayRanks) {
      for (const file of displayFiles) {
        const squareName = `${file}${rank}` as Square;
        const fileIdx = files.indexOf(file);
        const isLight = (fileIdx + rank) % 2 !== 0;
        const pieceData = activeChess.get(squareName);

        const isSelected = selected === squareName;
        const isLegal = legalMoves.includes(squareName);
        const isLegalCapture = isLegal && !!pieceData && pieceData.color !== this.turn();
        const isPreviousMove = last ? last.from === squareName || last.to === squareName : false;

        squares.push({
          file,
          rank,
          square: squareName,
          isLight,
          piece: pieceData ? { type: pieceData.type, color: pieceData.color } : null,
          isSelected,
          isLegalMove: isLegal,
          isLegalCapture,
          isPreviousMove,
        });
      }
    }

    return squares;
  });

  readonly evalFormatted = computed<string>(() => {
    const active = this.getActiveChess();
    const score = this.evalScore();
    if (active.isGameOver()) {
      if (active.isCheckmate()) {
        return active.turn() === 'w' ? '#B' : '#W';
      }
      return '½-½';
    }
    const sign = score > 0 ? '+' : '';
    return `${sign}${score.toFixed(1)}`;
  });

  readonly whiteAdvantagePercentage = computed<number>(() => {
    const score = this.evalScore();
    const winProb = 1 / (1 + Math.pow(10, -score / 4));
    return Math.max(5, Math.min(95, Math.round(winProb * 100)));
  });

  constructor() {
    this.updateState();
  }

  private getActiveChess(): Chess {
    return this.displayChess;
  }

  handleSquareClick(square: Square): void {
    if (this.isAutoplaying()) {
      this.stopAutoplay();
    }

    // If viewing past history, resume to live board on interaction
    if (this.isBrowsingHistory()) {
      this.goToEnd();
    }

    if (this.liveChess.isGameOver()) return;

    const currentSelected = this.selectedSquare();
    const pieceOnSquare = this.liveChess.get(square);

    if (currentSelected === square) {
      this.clearSelection();
      return;
    }

    if (currentSelected && this.legalMoveSquares().includes(square)) {
      this.makeMove(currentSelected, square);
      return;
    }

    if (pieceOnSquare && pieceOnSquare.color === this.turn()) {
      this.selectedSquare.set(square);
      const moves = this.liveChess.moves({ square, verbose: true }) as Move[];
      this.legalMoveSquares.set(moves.map((m) => m.to as Square));
    } else {
      this.clearSelection();
    }
  }

  makeMove(from: Square, to: Square, promotion: string = 'q'): boolean {
    try {
      const move = this.liveChess.move({ from, to, promotion });
      if (!move) {
        this.clearSelection();
        return false;
      }

      this.lastMove.set({ from, to });
      const record: MoveRecord = {
        from,
        to,
        piece: move.piece,
        san: move.san,
        fen: this.liveChess.fen(),
        turn: move.color,
      };

      this.history.update((prev) => [...prev, record]);
      this.currentPlyIndex.set(this.history().length - 1);
      this.syncDisplayChess();
      this.clearSelection();
      this.updateState();
      this.updateEvalHeuristic();

      // Trigger Audio Effects
      if (this.settings.moveSounds()) {
        const soundType = move.san.includes('#') || move.san.includes('+')
          ? 'check'
          : move.san.startsWith('O-O')
          ? 'castle'
          : move.captured
          ? 'capture'
          : 'move';
        this.soundService.playChessMoveSound(soundType, this.settings.volume());
      }

      // Auto-run lightweight review/analysis if enabled
      if (this.settings.autoEvaluation()) {
        this.analysisService.runAnalysis(this.history());
      }

      return true;
    } catch {
      this.clearSelection();
      return false;
    }
  }

  jumpToMove(plyIndex: number): void {
    const hist = this.history();
    if (plyIndex < 0 || plyIndex >= hist.length) return;
    this.currentPlyIndex.set(plyIndex);
    this.syncDisplayChess();
    this.clearSelection();
    this.updateState();

    if (this.settings.moveSounds()) {
      this.soundService.playChessMoveSound('move', this.settings.volume() * 0.7);
    }
  }

  goToStart(): void {
    if (this.history().length === 0) return;
    this.currentPlyIndex.set(-1);
    this.displayChess.reset();
    this.lastMove.set(null);
    this.clearSelection();
    this.updateState();
  }

  goToEnd(): void {
    if (this.history().length === 0) return;
    this.currentPlyIndex.set(this.history().length - 1);
    this.syncDisplayChess();
    this.clearSelection();
    this.updateState();
  }

  prevMove(): void {
    const current = this.currentPlyIndex();
    const target = current === null ? this.history().length - 2 : current - 1;
    if (target >= -1) {
      if (target === -1) {
        this.goToStart();
      } else {
        this.jumpToMove(target);
      }
    }
  }

  nextMove(): void {
    const current = this.currentPlyIndex();
    const hist = this.history();
    const target = current === null ? hist.length - 1 : current + 1;
    if (target < hist.length) {
      this.jumpToMove(target);
    }
  }

  toggleAutoplay(): void {
    if (this.isAutoplaying()) {
      this.stopAutoplay();
    } else {
      this.startAutoplay();
    }
  }

  startAutoplay(): void {
    const hist = this.history();
    if (hist.length === 0) return;

    if (this.currentPlyIndex() === hist.length - 1) {
      this.goToStart();
    }

    this.isAutoplaying.set(true);
    if (this.autoplayInterval) clearInterval(this.autoplayInterval);

    this.autoplayInterval = setInterval(() => {
      const current = this.currentPlyIndex() ?? -1;
      if (current < this.history().length - 1) {
        this.nextMove();
      } else {
        this.stopAutoplay();
      }
    }, 900);
  }

  stopAutoplay(): void {
    this.isAutoplaying.set(false);
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  undoMove(): void {
    this.stopAutoplay();
    const undone = this.liveChess.undo();
    if (undone) {
      this.history.update((prev) => prev.slice(0, -1));
      const hist = this.history();
      this.currentPlyIndex.set(hist.length > 0 ? hist.length - 1 : null);
      this.syncDisplayChess();
      this.clearSelection();
      this.updateState();
      this.updateEvalHeuristic();

      if (this.settings.autoEvaluation() && hist.length > 0) {
        this.analysisService.runAnalysis(hist);
      } else if (hist.length === 0) {
        this.analysisService.clearAnalysis();
      }
    }
  }

  resetGame(): void {
    this.stopAutoplay();
    this.liveChess.reset();
    this.displayChess.reset();
    this.history.set([]);
    this.currentPlyIndex.set(null);
    this.lastMove.set(null);
    this.clearSelection();
    this.updateState();
    this.evalScore.set(0.2);
    this.analysisService.clearAnalysis();
    this.matchMetadata.set(this.getDefaultMetadata());
  }

  private getDefaultMetadata(): MatchMetadata {
    const defaultUser = this.settings.chesscomUsername() || 'White';
    return {
      white: { name: defaultUser, rating: 1500 },
      black: { name: 'Black', rating: 1500 },
      event: 'Casual Game',
    };
  }

  flipBoard(): void {
    this.isBoardFlipped.update((f) => !f);
  }

  loadPgn(pgnString: string, customMeta?: Partial<MatchMetadata>): boolean {
    this.stopAutoplay();
    try {
      const testChess = new Chess();
      testChess.loadPgn(pgnString.trim());

      const historyMoves = testChess.history({ verbose: true });
      if (historyMoves.length === 0) return false;

      // Extract PGN headers
      const headers = typeof (testChess as any).header === 'function' ? (testChess as any).header() : {};

      const whiteName = customMeta?.white?.name || headers['White'] || this.extractPgnTag(pgnString, 'White') || 'White';
      const blackName = customMeta?.black?.name || headers['Black'] || this.extractPgnTag(pgnString, 'Black') || 'Black';
      const whiteRating = customMeta?.white?.rating ?? (headers['WhiteElo'] || this.extractPgnTag(pgnString, 'WhiteElo') || undefined);
      const blackRating = customMeta?.black?.rating ?? (headers['BlackElo'] || this.extractPgnTag(pgnString, 'BlackElo') || undefined);
      const whiteTitle = customMeta?.white?.title || headers['WhiteTitle'] || this.extractPgnTag(pgnString, 'WhiteTitle') || undefined;
      const blackTitle = customMeta?.black?.title || headers['BlackTitle'] || this.extractPgnTag(pgnString, 'BlackTitle') || undefined;

      const event = customMeta?.event || headers['Event'] || this.extractPgnTag(pgnString, 'Event') || undefined;
      const site = customMeta?.site || headers['Site'] || this.extractPgnTag(pgnString, 'Site') || undefined;
      const date = customMeta?.date || headers['Date'] || headers['UTCDate'] || this.extractPgnTag(pgnString, 'Date') || undefined;
      const result = customMeta?.result || headers['Result'] || this.extractPgnTag(pgnString, 'Result') || undefined;
      const timeControl = customMeta?.timeControl || headers['TimeControl'] || this.extractPgnTag(pgnString, 'TimeControl') || undefined;
      const eco = customMeta?.eco || headers['ECO'] || this.extractPgnTag(pgnString, 'ECO') || undefined;
      const openingName = customMeta?.openingName || headers['Opening'] || this.extractPgnTag(pgnString, 'Opening') || undefined;

      this.matchMetadata.set({
        white: {
          name: whiteName,
          rating: whiteRating,
          title: whiteTitle,
        },
        black: {
          name: blackName,
          rating: blackRating,
          title: blackTitle,
        },
        event,
        site,
        date,
        result,
        timeControl,
        eco,
        openingName,
        platform: customMeta?.platform || 'custom',
      });

      this.liveChess.reset();
      const records: MoveRecord[] = [];

      for (const m of historyMoves) {
        this.liveChess.move({ from: m.from, to: m.to, promotion: m.promotion });
        records.push({
          from: m.from,
          to: m.to,
          piece: m.piece,
          san: m.san,
          fen: this.liveChess.fen(),
          turn: m.color,
        });
      }

      this.history.set(records);
      this.currentPlyIndex.set(records.length - 1);
      this.syncDisplayChess();
      this.clearSelection();
      this.updateState();
      this.updateEvalHeuristic();

      // Trigger analysis automatically
      this.analysisService.runAnalysis(records);
      return true;
    } catch {
      return false;
    }
  }

  loadOnlineGame(game: {
    pgn: string;
    white: string;
    black: string;
    whiteRating?: number | string;
    blackRating?: number | string;
    date?: string;
    timeControl?: string;
    result?: string;
    platform?: 'chess.com' | 'lichess';
    eco?: string;
    openingName?: string;
  }): boolean {
    return this.loadPgn(game.pgn, {
      white: {
        name: game.white,
        rating: game.whiteRating,
      },
      black: {
        name: game.black,
        rating: game.blackRating,
      },
      date: game.date,
      timeControl: game.timeControl,
      result: game.result,
      platform: game.platform || 'chess.com',
      eco: game.eco,
      openingName: game.openingName,
    });
  }

  loadFen(fenString: string): boolean {
    this.stopAutoplay();
    try {
      this.liveChess.load(fenString.trim());
      this.history.set([]);
      this.currentPlyIndex.set(null);
      this.syncDisplayChess();
      this.clearSelection();
      this.updateState();
      this.updateEvalHeuristic();
      this.analysisService.clearAnalysis();
      return true;
    } catch {
      return false;
    }
  }

  loadSampleGame(gameId: string): boolean {
    const sample = SAMPLE_GAMES.find((g) => g.id === gameId);
    if (!sample) return false;
    return this.loadPgn(sample.pgn, {
      white: {
        name: sample.white,
        rating: sample.whiteRating,
        title: sample.whiteTitle,
      },
      black: {
        name: sample.black,
        rating: sample.blackRating,
        title: sample.blackTitle,
      },
      event: sample.event,
      result: sample.result,
      platform: 'sample',
    });
  }

  private extractPgnTag(pgn: string, tag: string): string | undefined {
    const match = pgn.match(new RegExp(`\\[${tag}\\s+"([^"]+)"\\]`));
    return match ? match[1] : undefined;
  }

  private syncDisplayChess(): void {
    const hist = this.history();
    const ply = this.currentPlyIndex();

    if (ply === null || ply === hist.length - 1) {
      this.displayChess = new Chess(this.liveChess.fen());
      if (hist.length > 0) {
        const last = hist[hist.length - 1];
        this.lastMove.set({ from: last.from, to: last.to });
      } else {
        this.lastMove.set(null);
      }
    } else if (ply === -1) {
      this.displayChess.reset();
      this.lastMove.set(null);
    } else {
      const targetFen = hist[ply].fen;
      this.displayChess.load(targetFen);
      this.lastMove.set({ from: hist[ply].from, to: hist[ply].to });
    }
  }

  private clearSelection(): void {
    this.selectedSquare.set(null);
    this.legalMoveSquares.set([]);
  }

  private updateState(): void {
    const active = this.getActiveChess();
    this.fen.set(active.fen());
    this.turn.set(active.turn());
    this.isCheck.set(active.inCheck());

    if (active.isGameOver()) {
      this.isGameOver.set(true);
      if (active.isCheckmate()) {
        const winner = active.turn() === 'w' ? 'Black' : 'White';
        this.gameOverReason.set(`Checkmate! ${winner} wins.`);
      } else if (active.isDraw()) {
        if (active.isStalemate()) {
          this.gameOverReason.set('Draw by Stalemate.');
        } else if (active.isThreefoldRepetition()) {
          this.gameOverReason.set('Draw by Threefold Repetition.');
        } else if (active.isInsufficientMaterial()) {
          this.gameOverReason.set('Draw by Insufficient Material.');
        } else {
          this.gameOverReason.set('Draw.');
        }
      }
    } else {
      this.isGameOver.set(false);
      this.gameOverReason.set(null);
    }
  }

  private updateEvalHeuristic(): void {
    const active = this.getActiveChess();
    const pieceValues: Record<string, number> = {
      p: 1,
      n: 3.2,
      b: 3.3,
      r: 5,
      q: 9,
      k: 0,
    };

    let score = 0;
    const board = active.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          const val = pieceValues[p.type] || 0;
          const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c);
          const posBonus = (7 - centerDist) * 0.05;

          if (p.color === 'w') {
            score += val + posBonus;
          } else {
            score -= val + posBonus;
          }
        }
      }
    }

    if (active.isCheckmate()) {
      score = active.turn() === 'w' ? -20 : 20;
    }

    if (active.turn() === 'w') score += 0.15;
    else score -= 0.15;

    this.evalScore.set(Math.round(score * 10) / 10);
  }
}
