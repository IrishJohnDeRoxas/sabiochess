import type { Move } from 'chess.js';

export interface GameMetadata {
  Event?: string;
  Site?: string;
  Date?: string;
  Round?: string;
  White?: string;
  Black?: string;
  Result?: string;
  WhiteElo?: string;
  BlackElo?: string;
  TimeControl?: string;
  Termination?: string;
  ECO?: string;
  Opening?: string;
  [key: string]: string | undefined;
}

export interface GameHistoryItem {
  move: Move;
  fen: string;
  clock?: string; // Formatted remaining clock at this ply, e.g. "09:58"
  clockSeconds?: number; // Remaining seconds on clock
  moveTime?: number; // Time spent making this move in seconds
  formattedMoveTime?: string; // Formatted move duration, e.g. "1.6s", "14s", "1m 12s"
}

export interface VariationMoveItem {
  move: Move;
  fen: string;
}

export interface MoveVariation {
  id: string;
  parentPly: number; // The ply index in main game where this branch split off (-1 for starting board)
  moves: VariationMoveItem[];
}

export interface ActiveVariationState {
  id: string;
  plyIndex: number;
}
