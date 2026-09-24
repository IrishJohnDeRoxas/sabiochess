import { GameAnalysisSummary, MoveAnalysis } from './analysis.model';

export interface SavedGameReview {
  id: string;
  timestamp: number;
  date: string;
  white: string;
  black: string;
  whiteRating?: number | string;
  blackRating?: number | string;
  whiteAccuracy?: number;
  blackAccuracy?: number;
  result: string;
  event?: string;
  opening?: string;
  eco?: string;
  movesCount: number;
  pgn: string;
  fen?: string;
  summary?: GameAnalysisSummary | null;
  movesAnalysis?: MoveAnalysis[];
}
