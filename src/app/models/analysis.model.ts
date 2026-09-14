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
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  scoreBefore: number; // Centipawns from current player perspective
  scoreAfter: number;
  evalCp: number; // Score from White perspective (positive = White leads)
  mate?: number | null;
  bestMoveSan?: string;
  bestMoveUci?: string;
  classification: MoveClassification;
  accuracy: number; // 0 to 100
  commentary?: string;
}

export interface GameAnalysisSummary {
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteCounts: Record<MoveClassification, number>;
  blackCounts: Record<MoveClassification, number>;
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
