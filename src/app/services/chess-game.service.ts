import { Injectable, computed, inject, signal } from '@angular/core';
import { Chess, Square, Move } from 'chess.js';
import { MoveAnalysis, MoveClassification, LiveEngineLine, EngineMoveArrow } from '../models/analysis.model';
import { MoveVariation, ActiveVariationState, GameMetadata } from '../models/chess.model';
import { SettingsService } from './settings.service';
import { SoundService } from './sound.service';
import { GameAnalysisService } from './game-analysis.service';
import { computeGameHistoryTiming, formatClockTime, parseTimeControl } from '../utils/chess-clock.util';
import { computeGameOutcome, getPlayerOutcomeStatus, GameOutcome, PlayerOutcomeStatus } from '../utils/chess-outcome.util';
import { buildEngineMoveArrow } from '../utils/chess-arrow.util';

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
  isVariationMove?: boolean;
  isMoveFrom?: boolean;
  classification?: MoveClassification;
}

export interface MoveRecord {
  from: string;
  to: string;
  piece: string;
  captured?: string;
  san: string;
  fen: string;
  turn: 'w' | 'b';
  flags?: string;
  clock?: string;
  clockSeconds?: number;
  moveTime?: number;
  formattedMoveTime?: string;
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
  termination?: string;
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
  timeControl?: string;
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
    timeControl: '900',
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
    timeControl: '7200',
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
    timeControl: '5400',
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
    timeControl: '900',
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

  readonly rawPgn = signal<string>('');
  readonly fen = signal<string>(this.liveChess.fen());
  readonly turn = signal<'w' | 'b'>('w');
  readonly isBoardFlipped = signal<boolean>(false);
  readonly selectedSquare = signal<Square | null>(null);
  readonly legalMoveSquares = signal<Square[]>([]);
  readonly history = signal<MoveRecord[]>([]);
  readonly currentPlyIndex = signal<number | null>(null); // -1 = start board, null/index = active ply
  readonly lastMove = signal<{ from: string; to: string } | null>(null);
  readonly isGameOver = signal<boolean>(false);
  readonly gameOverReason = signal<string | null>(null);
  readonly isCheck = signal<boolean>(false);
  readonly heuristicEvalScore = signal<number>(0.0); // White advantage in pawns (fallback heuristic)
  readonly isAutoplaying = signal<boolean>(false);
  private autoplayInterval: ReturnType<typeof setInterval> | null = null;

  // Branching analysis variations
  readonly variations = signal<MoveVariation[]>([]);
  readonly activeVariation = signal<ActiveVariationState | null>(null);

  readonly isVariationActive = computed(() => this.activeVariation() !== null);

  readonly currentVariation = computed(() => {
    const active = this.activeVariation();
    if (!active) return null;
    return this.variations().find((v) => v.id === active.id) ?? null;
  });

  readonly canUndo = computed(() => {
    return this.isVariationActive() || (this.currentPlyIndex() !== null && this.currentPlyIndex()! >= 0);
  });

  readonly canRedo = computed(() => {
    const active = this.activeVariation();
    if (active) {
      const v = this.currentVariation();
      return v ? active.plyIndex < v.moves.length - 1 : false;
    }
    const hist = this.history();
    const ply = this.currentPlyIndex();
    return ply !== null && ply < hist.length - 1;
  });

  readonly isBrowsingHistory = computed(() => {
    const ply = this.currentPlyIndex();
    const hist = this.history();
    return ply !== null && ply < hist.length - 1;
  });

  readonly currentMoveAnalysis = computed<MoveAnalysis | null>(() => {
    const ply = this.currentPlyIndex();
    const analyses = this.analysisService.movesAnalysis();
    if (analyses.length === 0) return null;
    if (ply === null || ply < 0) return null;
    return analyses[ply] || null;
  });

  // Engine Candidate Move Arrows for Chessboard Overlay
  readonly engineMoveArrows = computed<EngineMoveArrow[]>(() => {
    const lines = this.analysisService.liveEngineLines();
    const isFlipped = this.isBoardFlipped();
    const hoveredRank = this.analysisService.hoveredLineRank();

    const arrows: EngineMoveArrow[] = [];
    for (const line of lines) {
      if (line.firstMove) {
        const isHovered = hoveredRank !== null && hoveredRank === line.multipv;
        const arrow = buildEngineMoveArrow(
          line.firstMove.from,
          line.firstMove.to,
          line.firstMove.san,
          line.scoreFormatted,
          line.multipv,
          isFlipped,
          isHovered
        );
        if (arrow) {
          arrows.push(arrow);
        }
      }
    }

    return arrows.sort((a, b) => {
      if (hoveredRank && a.id === hoveredRank) return 1;
      if (hoveredRank && b.id === hoveredRank) return -1;
      return b.id - a.id;
    });
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

  // Game Outcome Calculation
  readonly gameOutcome = computed<GameOutcome>(() => {
    const meta = this.matchMetadata();
    const hist = this.history();
    const currentFen = this.fen();
    const isOver = this.isGameOver();
    return computeGameOutcome(meta, hist, currentFen, isOver);
  });

  readonly whiteOutcome = computed<PlayerOutcomeStatus>(() => {
    return getPlayerOutcomeStatus(this.gameOutcome(), 'white');
  });

  readonly blackOutcome = computed<PlayerOutcomeStatus>(() => {
    return getPlayerOutcomeStatus(this.gameOutcome(), 'black');
  });

  readonly isAtFinalMove = computed<boolean>(() => {
    if (this.isVariationActive()) return false;
    const hist = this.history();
    const ply = this.currentPlyIndex();
    if (hist.length === 0) return true;
    return ply === null || ply === hist.length - 1;
  });

  readonly topOutcome = computed<PlayerOutcomeStatus>(() => {
    if (!this.isAtFinalMove()) {
      return {
        isWinner: false,
        isLoser: false,
        isDraw: false,
        score: null,
        reason: null,
        shortReason: null,
      };
    }
    return this.isBoardFlipped() ? this.whiteOutcome() : this.blackOutcome();
  });

  readonly bottomOutcome = computed<PlayerOutcomeStatus>(() => {
    if (!this.isAtFinalMove()) {
      return {
        isWinner: false,
        isLoser: false,
        isDraw: false,
        score: null,
        reason: null,
        shortReason: null,
      };
    }
    return this.isBoardFlipped() ? this.blackOutcome() : this.whiteOutcome();
  });

  // Dynamic Clocks for Top and Bottom Players synced to current ply
  readonly topClock = computed<string | null>(() => {
    const isWhite = this.topColor() === 'w';
    return this.getClockForColor(isWhite ? 'w' : 'b');
  });

  readonly bottomClock = computed<string | null>(() => {
    const isWhite = this.bottomColor() === 'w';
    return this.getClockForColor(isWhite ? 'w' : 'b');
  });

  private getClockForColor(color: 'w' | 'b'): string | null {
    const hist = this.history();
    if (hist.length === 0) {
      const tc = this.matchMetadata().timeControl;
      const parsed = parseTimeControl(tc);
      return parsed.baseSeconds !== undefined ? formatClockTime(parsed.baseSeconds) : null;
    }

    const currentPly = this.currentPlyIndex();
    const targetPly = currentPly === null ? hist.length - 1 : currentPly;

    if (targetPly < 0) {
      // Start of game: check initial time control
      const tc = this.matchMetadata().timeControl;
      const parsed = parseTimeControl(tc);
      return parsed.baseSeconds !== undefined ? formatClockTime(parsed.baseSeconds) : null;
    }

    // Find the most recent move by this color up to targetPly
    for (let i = targetPly; i >= 0; i--) {
      if (hist[i].turn === color && hist[i].clock) {
        return hist[i].clock!;
      }
    }

    // If color hasn't moved yet at this ply, show initial time control
    const tc = this.matchMetadata().timeControl;
    const parsed = parseTimeControl(tc);
    return parsed.baseSeconds !== undefined ? formatClockTime(parsed.baseSeconds) : null;
  }

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
    const isVariation = this.isVariationActive();
    const ply = this.currentPlyIndex();

    // Get analysis classification for the last move
    let lastMoveClassification: MoveClassification | undefined = undefined;

    if (isVariation) {
      const active = this.activeVariation();
      const currentVar = this.currentVariation();
      if (active && currentVar && currentVar.moves[active.plyIndex]) {
        const parentPly = currentVar.parentPly;
        const analysisList = this.analysisService.movesAnalysis();
        const parentAnalysis = parentPly >= 0 ? analysisList[parentPly] : null;
        const varMove = currentVar.moves[active.plyIndex].move;
        const liveLines = this.analysisService.liveEngineLines();

        if (
          parentAnalysis &&
          (parentAnalysis.bestMoveSan === varMove.san ||
            parentAnalysis.bestMove === `${varMove.from}${varMove.to}`)
        ) {
          lastMoveClassification = 'best';
        } else if (
          liveLines.length > 0 &&
          liveLines[0].firstMove &&
          (liveLines[0].firstMove.san === varMove.san ||
            `${liveLines[0].firstMove.from}${liveLines[0].firstMove.to}` === `${varMove.from}${varMove.to}`)
        ) {
          lastMoveClassification = 'best';
        } else if (
          liveLines.length > 1 &&
          liveLines[1].firstMove &&
          (liveLines[1].firstMove.san === varMove.san ||
            `${liveLines[1].firstMove.from}${liveLines[1].firstMove.to}` === `${varMove.from}${varMove.to}`)
        ) {
          lastMoveClassification = 'excellent';
        } else if (
          liveLines.length > 2 &&
          liveLines[2].firstMove &&
          (liveLines[2].firstMove.san === varMove.san ||
            `${liveLines[2].firstMove.from}${liveLines[2].firstMove.to}` === `${varMove.from}${varMove.to}`)
        ) {
          lastMoveClassification = 'good';
        } else {
          lastMoveClassification = 'best';
        }
      }
    } else if (ply !== null && ply >= 0) {
      const moveData = this.currentMoveAnalysis();
      if (moveData && moveData.classification && moveData.classification !== 'unknown') {
        lastMoveClassification = moveData.classification;
      }
    }

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
        const isPrev = last ? last.from === squareName || last.to === squareName : false;
        const isPreviousMove = isPrev && !isVariation;
        const isVariationMove = isPrev && isVariation;
        const isMoveFrom = last ? last.from === squareName : false;
        const classification = last && squareName === last.to ? lastMoveClassification : undefined;

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
          isVariationMove,
          isMoveFrom,
          classification,
        });
      }
    }

    return squares;
  });

  readonly evalScore = computed<number>(() => {
    const ply = this.currentPlyIndex();
    // Start of game / initial position is strictly 0.0
    if (ply === -1 || (ply === null && this.history().length === 0)) {
      return 0.0;
    }

    if (ply !== null && ply >= 0) {
      const moveAnalysis = this.currentMoveAnalysis();
      if (moveAnalysis) {
        if (moveAnalysis.mateAfter !== null && moveAnalysis.mateAfter !== undefined) {
          if (moveAnalysis.mateAfter > 0) return 100;
          if (moveAnalysis.mateAfter < 0) return -100;
          return this.getActiveChess().turn() === 'w' ? -100 : 100;
        }
        if (moveAnalysis.scoreAfter !== null && moveAnalysis.scoreAfter !== undefined) {
          return Math.round((moveAnalysis.scoreAfter / 100) * 10) / 10;
        }
        if (moveAnalysis.evalCp !== null && moveAnalysis.evalCp !== undefined) {
          return Math.round((moveAnalysis.evalCp / 100) * 10) / 10;
        }
      }
    }

    const active = this.getActiveChess();
    if (active.isGameOver()) {
      if (active.isCheckmate()) {
        return active.turn() === 'w' ? -100 : 100;
      }
      return 0.0;
    }

    return this.heuristicEvalScore();
  });

  readonly evalFormatted = computed<string>(() => {
    const ply = this.currentPlyIndex();
    if (ply === -1 || (ply === null && this.history().length === 0)) {
      return '0.0';
    }

    const active = this.getActiveChess();
    if (active.isGameOver()) {
      if (active.isCheckmate()) {
        return active.turn() === 'w' ? '#B' : '#W';
      }
      return '½-½';
    }

    if (ply !== null && ply >= 0) {
      const moveAnalysis = this.currentMoveAnalysis();
      if (moveAnalysis) {
        if (moveAnalysis.mateAfter !== null && moveAnalysis.mateAfter !== undefined) {
          if (moveAnalysis.mateAfter !== 0) {
            return `M${Math.abs(moveAnalysis.mateAfter)}`;
          } else {
            return active.turn() === 'w' ? '#B' : '#W';
          }
        }
        if (moveAnalysis.scoreAfter !== null && moveAnalysis.scoreAfter !== undefined) {
          const score = moveAnalysis.scoreAfter / 100;
          const rounded = Math.round(Math.abs(score) * 10) / 10;
          return `${rounded.toFixed(1)}`;
        }
        if (moveAnalysis.evalCp !== null && moveAnalysis.evalCp !== undefined) {
          const score = moveAnalysis.evalCp / 100;
          const rounded = Math.round(Math.abs(score) * 10) / 10;
          return `${rounded.toFixed(1)}`;
        }
      }
    }

    const score = this.evalScore();
    if (Math.abs(score) >= 90) {
      return score > 0 ? '#W' : '#B';
    }
    const rounded = Math.round(Math.abs(score) * 10) / 10;
    return `${rounded.toFixed(1)}`;
  });

  readonly whiteAdvantagePercentage = computed<number>(() => {
    const ply = this.currentPlyIndex();
    if (ply === -1 || (ply === null && this.history().length === 0)) {
      return 50;
    }

    const active = this.getActiveChess();
    if (active.isGameOver()) {
      if (active.isCheckmate()) {
        return active.turn() === 'w' ? 0 : 100;
      }
      return 50;
    }

    if (ply !== null && ply >= 0) {
      const moveAnalysis = this.currentMoveAnalysis();
      if (moveAnalysis) {
        if (moveAnalysis.mateAfter !== null && moveAnalysis.mateAfter !== undefined) {
          if (moveAnalysis.mateAfter > 0) return 100;
          if (moveAnalysis.mateAfter < 0) return 0;
          return active.turn() === 'w' ? 0 : 100;
        }
      }
    }

    const score = this.evalScore();
    if (score >= 90) return 100;
    if (score <= -90) return 0;
    const winProb = 1 / (1 + Math.pow(10, -score / 4));
    return Math.max(5, Math.min(95, Math.round(winProb * 100)));
  });

  constructor() {
    this.updateState();
  }

  private getActiveChess(): Chess {
    return this.displayChess;
  }

  private playSoundForMove(
    move?: Partial<Move> | Partial<MoveRecord> | { san?: string; captured?: string; flags?: string } | null,
    plyIndex?: number
  ): void {
    if (this.soundService.isMuted()) return;

    if (this.settings.memeSounds()) {
      const activePly = plyIndex !== undefined ? plyIndex : this.currentPlyIndex();
      if (activePly !== null && activePly >= 0) {
        const moves = this.analysisService.movesAnalysis();
        const item = moves[activePly];
        if (item && item.classification && item.classification !== 'unknown') {
          this.soundService.playReactionSound(item.classification, this.settings.memePack(), this.settings.volume());
          return;
        }
      }
    }

    if (this.settings.moveSounds()) {
      const isCheck = this.getActiveChess().inCheck();
      const soundType = isCheck
        ? 'check'
        : (move?.san && (move.san.startsWith('O-O') || move.san.startsWith('0-0')))
        ? 'castle'
        : (move?.captured || (move?.flags && (move.flags.includes('c') || move.flags.includes('e'))))
        ? 'capture'
        : 'move';
      this.soundService.playChessMoveSound(soundType, this.settings.volume());
    }
  }

  handleSquareClick(square: Square): void {
    if (this.isAutoplaying()) {
      this.stopAutoplay();
    }

    const activeChess = this.getActiveChess();
    if (activeChess.isGameOver()) return;

    const currentSelected = this.selectedSquare();
    const pieceOnSquare = activeChess.get(square);

    if (currentSelected === square) {
      this.clearSelection();
      return;
    }

    if (currentSelected && this.legalMoveSquares().includes(square)) {
      this.move({ from: currentSelected, to: square, promotion: 'q' });
      return;
    }

    if (pieceOnSquare && pieceOnSquare.color === activeChess.turn()) {
      this.selectedSquare.set(square);
      const moves = activeChess.moves({ square, verbose: true }) as Move[];
      this.legalMoveSquares.set(moves.map((m) => m.to as Square));
    } else {
      this.clearSelection();
    }
  }

  move(moveInput: string | { from: string; to: string; promotion?: string }): boolean {
    const active = this.activeVariation();

    // Case 1: Already inside an active variation branch
    if (active) {
      const variation = this.currentVariation();
      if (!variation) return false;

      try {
        const result = this.displayChess.move(moveInput);
        if (result) {
          const truncatedMoves = variation.moves.slice(0, active.plyIndex + 1);
          const newMoves = [...truncatedMoves, { move: result, fen: this.displayChess.fen() }];

          this.variations.update((vars) =>
            vars.map((v) => (v.id === active.id ? { ...v, moves: newMoves } : v))
          );
          this.activeVariation.set({ id: active.id, plyIndex: newMoves.length - 1 });
          this.lastMove.set({ from: result.from, to: result.to });
          this.clearSelection();
          this.updateState();
          this.updateEvalHeuristic();
          this.playSoundForMove(result);
          return true;
        }
      } catch {
        return false;
      }
      return false;
    }

    const hist = this.history();
    const ply = this.currentPlyIndex();

    // Case 2: On the main line at the very end of recorded history (or free play from start)
    if (ply === null || (hist.length > 0 && ply === hist.length - 1) || (hist.length === 0 && ply === -1)) {
      try {
        const result = this.liveChess.move(moveInput);
        if (result) {
          this.lastMove.set({ from: result.from, to: result.to });
          const record: MoveRecord = {
            from: result.from,
            to: result.to,
            piece: result.piece,
            captured: result.captured,
            san: result.san,
            fen: this.liveChess.fen(),
            turn: result.color,
          };

          this.history.update((prev) => [...prev, record]);
          this.currentPlyIndex.set(this.history().length - 1);
          this.syncDisplayChess();
          this.clearSelection();
          this.updateState();
          this.updateEvalHeuristic();
          this.playSoundForMove(result);

          if (this.settings.autoEvaluation()) {
            const meta = this.matchMetadata();
            this.analysisService.runAnalysis(this.history(), undefined, {
              white: meta.white.rating,
              black: meta.black.rating,
            });
          }

          return true;
        }
      } catch {
        return false;
      }
      return false;
    }

    // Case 3: On the main line at an earlier ply (stepping into moves "out of order")
    const parentPly = ply;
    const nextMainMove = parentPly === -1 ? hist[0] : hist[parentPly + 1];
    const tempChess = new Chess(this.displayChess.fen());
    let candidateMove: Move | null = null;
    try {
      candidateMove = tempChess.move(moveInput);
    } catch {
      return false;
    }

    if (!candidateMove) return false;

    // Check if player played the same move that already exists in the main line
    if (
      nextMainMove &&
      (candidateMove.san === nextMainMove.san ||
        (candidateMove.from === nextMainMove.from && candidateMove.to === nextMainMove.to))
    ) {
      this.jumpToPly(parentPly + 1);
      return true;
    }

    // Move is different from the main line -> Create or resume an inline analysis branch (variation)
    const existingVariation = this.variations().find(
      (v) =>
        v.parentPly === parentPly &&
        v.moves.length > 0 &&
        (v.moves[0].move.san === candidateMove!.san ||
          (v.moves[0].move.from === candidateMove!.from && v.moves[0].move.to === candidateMove!.to))
    );

    if (existingVariation) {
      this.jumpToVariation(existingVariation.id, 0);
      return true;
    }

    // Create a new variation branch
    const newVarId = 'var_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newVariation: MoveVariation = {
      id: newVarId,
      parentPly,
      moves: [{ move: candidateMove, fen: tempChess.fen() }],
    };

    this.variations.update((vars) => [...vars, newVariation]);
    this.activeVariation.set({ id: newVarId, plyIndex: 0 });
    this.displayChess.load(tempChess.fen());
    this.lastMove.set({ from: candidateMove.from, to: candidateMove.to });
    this.clearSelection();
    this.updateState();
    this.updateEvalHeuristic();
    this.playSoundForMove(candidateMove);
    return true;
  }

  makeMove(from: Square, to: Square, promotion: string = 'q'): boolean {
    return this.move({ from, to, promotion });
  }

  jumpToMove(plyIndex: number): void {
    const hist = this.history();
    if (plyIndex < -1 || plyIndex >= hist.length) return;
    this.activeVariation.set(null);
    this.currentPlyIndex.set(plyIndex);
    this.syncDisplayChess();
    this.clearSelection();
    this.updateState();
    this.updateEvalHeuristic();

    if (plyIndex >= 0) {
      const currentMove = hist[plyIndex];
      this.playSoundForMove(currentMove, plyIndex);
    }
  }

  jumpToPly(plyIndex: number): void {
    this.jumpToMove(plyIndex);
  }

  goToStart(): void {
    if (this.isVariationActive()) {
      const variation = this.currentVariation();
      const parentPly = variation ? variation.parentPly : -1;
      this.exitVariation();
      this.jumpToPly(parentPly);
      return;
    }
    this.jumpToMove(-1);
  }

  firstPly(): void {
    this.goToStart();
  }

  goToEnd(): void {
    if (this.isVariationActive()) {
      const variation = this.currentVariation();
      if (variation && variation.moves.length > 0) {
        this.jumpToVariation(variation.id, variation.moves.length - 1);
      }
      return;
    }
    if (this.history().length === 0) return;
    this.jumpToMove(this.history().length - 1);
  }

  lastPly(): void {
    this.goToEnd();
  }

  prevMove(): void {
    if (this.isVariationActive()) {
      const active = this.activeVariation()!;
      if (active.plyIndex > 0) {
        this.jumpToVariation(active.id, active.plyIndex - 1);
      } else {
        const variation = this.currentVariation();
        const parentPly = variation ? variation.parentPly : -1;
        this.exitVariation();
        this.jumpToPly(parentPly);
      }
      return;
    }

    const current = this.currentPlyIndex();
    const target = current === null ? this.history().length - 2 : current - 1;
    if (target >= -1) {
      this.jumpToMove(target);
    }
  }

  nextMove(): void {
    if (this.isVariationActive()) {
      const active = this.activeVariation()!;
      const variation = this.currentVariation();
      if (variation && active.plyIndex < variation.moves.length - 1) {
        this.jumpToVariation(active.id, active.plyIndex + 1);
      }
      return;
    }

    const current = this.currentPlyIndex();
    const hist = this.history();
    const target = current === null ? 0 : current + 1;
    if (target < hist.length) {
      this.jumpToMove(target);
    }
  }

  undo(): void {
    this.prevMove();
  }

  redo(): void {
    this.nextMove();
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
    if (this.isVariationActive()) {
      this.prevMove();
      return;
    }

    if (this.currentPlyIndex() !== null && this.currentPlyIndex()! < this.history().length - 1) {
      this.prevMove();
      return;
    }

    const undone = this.liveChess.undo();
    if (undone) {
      this.history.update((prev) => prev.slice(0, -1));
      const hist = this.history();
      this.currentPlyIndex.set(hist.length > 0 ? hist.length - 1 : -1);
      this.syncDisplayChess();
      this.clearSelection();
      this.updateState();
      this.updateEvalHeuristic();

      if (this.settings.autoEvaluation() && hist.length > 0) {
        const meta = this.matchMetadata();
        this.analysisService.runAnalysis(hist, undefined, {
          white: meta.white.rating,
          black: meta.black.rating,
        });
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
    this.variations.set([]);
    this.activeVariation.set(null);
    this.currentPlyIndex.set(-1);
    this.lastMove.set(null);
    this.clearSelection();
    this.updateState();
    this.heuristicEvalScore.set(0.0);
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

  applyBoardOrientation(flip?: string | boolean, targetUser?: string): void {
    const userToMatch = targetUser || this.settings.chesscomUsername() || this.settings.lichessUsername();
    if (userToMatch && typeof userToMatch === 'string') {
      const cleanTarget = userToMatch.toLowerCase().replace(/[^a-z0-9]/g, '');
      const meta = this.matchMetadata();
      const white = (meta.white?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const black = (meta.black?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      if (
        cleanTarget &&
        (black === cleanTarget ||
          (black.length > 2 && cleanTarget.includes(black)) ||
          (cleanTarget.length > 2 && black.includes(cleanTarget)))
      ) {
        this.isBoardFlipped.set(true);
        return;
      }
      if (
        cleanTarget &&
        (white === cleanTarget ||
          (white.length > 2 && cleanTarget.includes(white)) ||
          (cleanTarget.length > 2 && white.includes(cleanTarget)))
      ) {
        this.isBoardFlipped.set(false);
        return;
      }
    }

    if (flip === true || flip === 'true' || flip === 'black' || flip === '1') {
      this.isBoardFlipped.set(true);
    } else if (flip === false || flip === 'false' || flip === 'white' || flip === '0') {
      this.isBoardFlipped.set(false);
    } else {
      this.isBoardFlipped.set(false);
    }
  }

  loadPgn(
    pgnString: string,
    customMeta?: Partial<MatchMetadata>,
    targetUser?: string,
    flip?: string | boolean
  ): boolean {
    this.stopAutoplay();
    try {
      const testChess = new Chess();
      testChess.loadPgn(pgnString.trim());

      const historyMoves = testChess.history({ verbose: true });
      if (historyMoves.length === 0) return false;

      // Extract PGN headers
      const headers = typeof (testChess as any).header === 'function' ? (testChess as any).header() : {};
      const comments = typeof (testChess as any).getComments === 'function' ? (testChess as any).getComments() : [];

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
      const pgnTimeControl = headers['TimeControl'] || this.extractPgnTag(pgnString, 'TimeControl');
      const timeControl = pgnTimeControl || customMeta?.timeControl || undefined;
      const termination = customMeta?.termination || headers['Termination'] || this.extractPgnTag(pgnString, 'Termination') || undefined;
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
        termination,
        eco,
        openingName,
        platform: customMeta?.platform || 'custom',
      });

      this.applyBoardOrientation(flip, targetUser);

      this.liveChess.reset();
      const rawRecords: MoveRecord[] = [];

      for (const m of historyMoves) {
        this.liveChess.move({ from: m.from, to: m.to, promotion: m.promotion });
        rawRecords.push({
          from: m.from,
          to: m.to,
          piece: m.piece,
          captured: m.captured,
          san: m.san,
          fen: this.liveChess.fen(),
          turn: m.color,
        });
      }

      // Compute timing for all history records
      const fullHistory = computeGameHistoryTiming(rawRecords, timeControl, comments);

      this.variations.set([]);
      this.activeVariation.set(null);
      this.history.set(fullHistory);
      this.rawPgn.set(pgnString.trim());

      // Reset initial position to START of game so game is not already finished when loaded
      this.currentPlyIndex.set(-1);
      this.syncDisplayChess();
      this.clearSelection();
      this.updateState();
      this.updateEvalHeuristic();

      // Trigger analysis automatically in background
      this.analysisService.runAnalysis(fullHistory, undefined, {
        white: whiteRating,
        black: blackRating,
      });
      return true;
    } catch {
      return false;
    }
  }

  getPgn(): string {
    const raw = this.rawPgn();
    if (raw && raw.length > 5) return raw;
    return this.generatePgn();
  }

  generatePgn(): string {
    const meta = this.matchMetadata();
    const hist = this.history();
    if (hist.length === 0) return '';

    let pgn = '';
    if (meta.event) pgn += `[Event "${meta.event}"]\n`;
    if (meta.site) pgn += `[Site "${meta.site}"]\n`;
    if (meta.date) pgn += `[Date "${meta.date}"]\n`;
    pgn += `[White "${meta.white.name || 'White'}"]\n`;
    pgn += `[Black "${meta.black.name || 'Black'}"]\n`;
    if (meta.white.rating) pgn += `[WhiteElo "${meta.white.rating}"]\n`;
    if (meta.black.rating) pgn += `[BlackElo "${meta.black.rating}"]\n`;
    if (meta.result) pgn += `[Result "${meta.result}"]\n`;
    if (meta.eco) pgn += `[ECO "${meta.eco}"]\n`;
    if (meta.openingName) pgn += `[Opening "${meta.openingName}"]\n`;
    pgn += '\n';

    const moveTexts: string[] = [];
    for (let i = 0; i < hist.length; i++) {
      if (i % 2 === 0) {
        moveTexts.push(`${Math.floor(i / 2) + 1}. ${hist[i].san}`);
      } else {
        moveTexts.push(hist[i].san);
      }
    }
    pgn += moveTexts.join(' ');
    if (meta.result) pgn += ` ${meta.result}`;
    return pgn.trim();
  }

  loadOnlineGame(
    game: {
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
    },
    targetUser?: string
  ): boolean {
    return this.loadPgn(
      game.pgn,
      {
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
      },
      targetUser
    );
  }

  loadFen(fenString: string, flip?: string | boolean, targetUser?: string): boolean {
    this.stopAutoplay();
    try {
      this.liveChess.load(fenString.trim());
      this.history.set([]);
      this.variations.set([]);
      this.activeVariation.set(null);
      this.currentPlyIndex.set(-1);
      this.syncDisplayChess();
      this.clearSelection();
      this.updateState();
      this.updateEvalHeuristic();
      this.analysisService.clearAnalysis();
      if (flip !== undefined || targetUser !== undefined) {
        this.applyBoardOrientation(flip, targetUser);
      }
      return true;
    } catch {
      return false;
    }
  }

  loadSampleGame(gameId: string): boolean {
    const sample = SAMPLE_GAMES.find((g) => g.id === gameId);
    if (!sample) return false;
    return this.loadPgn(
      sample.pgn,
      {
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
        timeControl: sample.timeControl,
        platform: 'sample',
      },
      undefined,
      false
    );
  }

  previewEngineLine(line: LiveEngineLine | string[]): boolean {
    const movesUci = Array.isArray(line) ? line : line.movesUci;
    if (!movesUci || movesUci.length === 0) return false;

    const firstUci = movesUci[0];
    if (!firstUci || firstUci.length < 4) return false;

    const from = firstUci.substring(0, 2) as Square;
    const to = firstUci.substring(2, 4) as Square;
    const promotion = firstUci.length > 4 ? firstUci.substring(4, 5) : 'q';

    return this.move({ from, to, promotion });
  }

  playBestMove(): boolean {
    const lines = this.analysisService.liveEngineLines();
    if (lines.length > 0) {
      return this.previewEngineLine(lines[0]);
    }
    return false;
  }

  // Variation Methods
  jumpToVariation(varId: string, plyIndex: number): void {
    const variation = this.variations().find((v) => v.id === varId);
    if (!variation || plyIndex < 0 || plyIndex >= variation.moves.length) return;

    this.activeVariation.set({ id: varId, plyIndex });
    const target = variation.moves[plyIndex];
    this.displayChess.load(target.fen);
    this.lastMove.set({ from: target.move.from, to: target.move.to });
    this.clearSelection();
    this.updateState();
    this.updateEvalHeuristic();
    this.playSoundForMove(target.move);
  }

  exitVariation(): void {
    const variation = this.currentVariation();
    const parentPly = variation ? variation.parentPly : (this.currentPlyIndex() ?? -1);
    this.activeVariation.set(null);
    this.jumpToPly(parentPly);
  }

  deleteVariation(varId: string): void {
    const active = this.activeVariation();
    if (active && active.id === varId) {
      this.exitVariation();
    }
    this.variations.update((vars) => vars.filter((v) => v.id !== varId));
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
    const activeFen = active.fen();
    this.fen.set(activeFen);
    this.turn.set(active.turn());
    this.isCheck.set(active.inCheck());

    // Trigger continuous live engine evaluation for the current position
    this.analysisService.evaluateLivePosition(activeFen);

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
    if (active.history().length === 0 && active.fen().startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')) {
      this.heuristicEvalScore.set(0.0);
      return;
    }

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

    if (active.isGameOver()) {
      if (active.isCheckmate()) {
        score = active.turn() === 'w' ? -20 : 20;
      } else {
        score = 0;
      }
    }

    this.heuristicEvalScore.set(Math.round(score * 10) / 10);
  }
}
