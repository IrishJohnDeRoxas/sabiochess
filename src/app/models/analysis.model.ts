export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'miss'
  | 'blunder'
  | 'unknown';

export interface MoveAnalysis {
  plyIndex: number; // 0-indexed (0 = White's first move, 1 = Black's first move)
  san: string;
  moveSan?: string; // Alias for san
  from?: string;
  to?: string;
  fenBefore?: string;
  fenAfter?: string;
  scoreBefore: number | null; // Centipawns from current player perspective / White perspective
  scoreAfter: number | null;
  evalCp?: number; // Score from White perspective (positive = White leads)
  cpl?: number | null; // Centipawn loss
  winChanceBefore?: number | null; // 0 - 100%
  winChanceAfter?: number | null; // 0 - 100%
  mate?: number | null;
  mateBefore?: number | null;
  mateAfter?: number | null;
  bestMove?: string | null;
  bestMoveSan?: string | null;
  bestMoveUci?: string;
  bestMovePv?: string[];
  followUpMoves?: string[];
  classification: MoveClassification;
  accuracy: number; // 0 to 100 CAPS2 accuracy
  commentary?: string;
}

export interface PhaseReview {
  white: string;
  black: string;
}

export interface GamePhasesSummary {
  opening: PhaseReview;
  middlegame: PhaseReview;
  endgame: PhaseReview;
}

export interface GameAnalysisSummary {
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteCounts: Record<MoveClassification, number>;
  blackCounts: Record<MoveClassification, number>;
  whitePerformanceRating: number;
  blackPerformanceRating: number;
  whiteCoachVerdict: string;
  blackCoachVerdict: string;
  phases: GamePhasesSummary;
  openingEco?: string;
  openingName?: string;
}

export interface EvalGraphPoint {
  ply: number;
  san: string;
  turn: 'w' | 'b';
  evalScore: number; // White perspective score (-10 to +10 range clamped for visualization)
  rawScore: number;
  classification: MoveClassification;
  isCurrent: boolean;
}

export function getHeroIconForClass(c: MoveClassification): string {
  switch (c) {
    case 'brilliant':
      return 'sparkles';
    case 'great':
      return 'arrow-trending-up';
    case 'best':
      return 'star';
    case 'excellent':
      return 'check';
    case 'good':
      return 'check';
    case 'book':
      return 'book-open';
    case 'inaccuracy':
      return 'exclamation-circle';
    case 'mistake':
      return 'question-mark-circle';
    case 'miss':
      return 'x-mark';
    case 'blunder':
      return 'exclamation-triangle';
    default:
      return 'star';
  }
}

export interface LiveEngineLine {
  id: number; // 1, 2, 3
  multipv: number;
  scoreFormatted: string;
  scoreCp: number | null;
  mate: number | null;
  isWhiteAdvantage: boolean;
  isBlackAdvantage: boolean;
  isEqual: boolean;
  movesUci: string[];
  movesSan: string[];
  firstMove: { from: string; to: string; san: string };
  moveNumberPrefix: string;
  firstSan: string;
  restLineSan: string;
  fullLineText: string;
}

export interface EngineMoveArrow {
  id: number; // 1, 2, 3
  from: string;
  to: string;
  san: string;
  scoreFormatted: string;
  isKnightMove: boolean;
  pathD: string;
  color: string;
  strokeWidth: number;
  opacity: number;
  markerId: string;
}
