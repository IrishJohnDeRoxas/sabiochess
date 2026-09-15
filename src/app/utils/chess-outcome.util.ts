import { Chess } from 'chess.js';
import { MatchMetadata, MoveRecord } from '../services/chess-game.service';

export type GameTerminationType =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'stalemate'
  | 'repetition'
  | 'agreement'
  | 'insufficient_material'
  | '50_moves'
  | 'abandoned'
  | 'rules_infraction'
  | 'draw'
  | 'unknown';

export interface GameOutcome {
  isFinished: boolean;
  result: string | null;
  winner: 'white' | 'black' | null;
  loser: 'white' | 'black' | null;
  isDraw: boolean;
  terminationType: GameTerminationType;
  terminationReason: string;
  shortReason: string;
  whiteScore: string | null;
  blackScore: string | null;
}

export interface PlayerOutcomeStatus {
  isWinner: boolean;
  isLoser: boolean;
  isDraw: boolean;
  score: string | null;
  reason: string | null;
  shortReason: string | null;
}

/**
 * Computes the outcome and termination reason for a chess game based on metadata,
 * move history, and board state.
 */
export function computeGameOutcome(
  metadata: Partial<MatchMetadata> = {},
  history: Array<{ san?: string; fen: string; turn?: 'w' | 'b'; clock?: string; clockSeconds?: number }> = [],
  currentFen?: string,
  isGameOverState: boolean = false
): GameOutcome {
  const resultRaw = (metadata.result || '').trim();

  let result: string | null = null;
  let winner: 'white' | 'black' | null = null;
  let loser: 'white' | 'black' | null = null;
  let isDraw = false;
  let isFinished = false;

  if (resultRaw === '1-0' || resultRaw === '1:0') {
    result = '1-0';
    winner = 'white';
    loser = 'black';
    isDraw = false;
    isFinished = true;
  } else if (resultRaw === '0-1' || resultRaw === '0:1') {
    result = '0-1';
    winner = 'black';
    loser = 'white';
    isDraw = false;
    isFinished = true;
  } else if (
    resultRaw === '1/2-1/2' ||
    resultRaw === '1/2' ||
    resultRaw === '0.5-0.5' ||
    resultRaw === '½-½'
  ) {
    result = '1/2-1/2';
    winner = null;
    loser = null;
    isDraw = true;
    isFinished = true;
  }

  // Check last move in history or current board state
  const lastHistoryItem = history.length > 0 ? history[history.length - 1] : null;
  const lastFen = lastHistoryItem ? lastHistoryItem.fen : currentFen;

  let isBoardCheckmate = false;
  let isBoardStalemate = false;
  let isBoardDraw = false;
  let isBoardInsufficientMaterial = false;
  let isBoardThreefold = false;

  if (lastFen) {
    try {
      const tempChess = new Chess(lastFen);
      if (tempChess.isCheckmate()) {
        isBoardCheckmate = true;
        isFinished = true;
        if (!winner) {
          const turn = tempChess.turn();
          winner = turn === 'w' ? 'black' : 'white';
          loser = turn === 'w' ? 'white' : 'black';
          result = winner === 'white' ? '1-0' : '0-1';
          isDraw = false;
        }
      } else if (tempChess.isStalemate()) {
        isBoardStalemate = true;
        isFinished = true;
        isDraw = true;
        result = '1/2-1/2';
      } else if (tempChess.isInsufficientMaterial()) {
        isBoardInsufficientMaterial = true;
        isFinished = true;
        isDraw = true;
        result = '1/2-1/2';
      } else if (tempChess.isThreefoldRepetition()) {
        isBoardThreefold = true;
        isFinished = true;
        isDraw = true;
        result = '1/2-1/2';
      } else if (tempChess.isDraw() || isGameOverState) {
        isBoardDraw = true;
        isFinished = true;
        if (!winner && !isDraw) {
          isDraw = true;
          result = '1/2-1/2';
        }
      }
    } catch {
      // Ignore invalid FEN
    }
  }

  // Check if last move notation ends with checkmate `#`
  if (lastHistoryItem?.san?.includes('#')) {
    isBoardCheckmate = true;
    isFinished = true;
    if (!winner && lastHistoryItem.turn) {
      winner = lastHistoryItem.turn === 'w' ? 'white' : 'black';
      loser = lastHistoryItem.turn === 'w' ? 'black' : 'white';
      result = winner === 'white' ? '1-0' : '0-1';
      isDraw = false;
    }
  }

  if (!isFinished) {
    return {
      isFinished: false,
      result: null,
      winner: null,
      loser: null,
      isDraw: false,
      terminationType: 'unknown',
      terminationReason: '',
      shortReason: '',
      whiteScore: null,
      blackScore: null,
    };
  }

  // Determine termination type
  let terminationType: GameTerminationType = 'unknown';
  let terminationReason = '';
  let shortReason = '';

  if (isBoardCheckmate) {
    terminationType = 'checkmate';
    terminationReason = 'Won by checkmate';
    shortReason = 'Checkmate';
  } else if (isBoardStalemate) {
    terminationType = 'stalemate';
    terminationReason = 'Draw by stalemate';
    shortReason = 'Stalemate';
  } else if (isBoardThreefold) {
    terminationType = 'repetition';
    terminationReason = 'Draw by repetition';
    shortReason = 'Repetition';
  } else if (isBoardInsufficientMaterial) {
    terminationType = 'insufficient_material';
    terminationReason = 'Draw by insufficient material';
    shortReason = 'Insufficient material';
  } else if (isDraw || isBoardDraw) {
    terminationType = 'draw';
    terminationReason = 'Game drawn';
    shortReason = 'Draw';
  } else if (winner) {
    const loserColor = loser === 'white' ? 'w' : 'b';
    const loserLastItem = history.slice().reverse().find((h) => h.turn === loserColor);
    if (loserLastItem?.clock === '00:00' || loserLastItem?.clockSeconds === 0) {
      terminationType = 'timeout';
      terminationReason = 'Won on time';
      shortReason = 'Win by time';
    } else {
      terminationType = 'resignation';
      terminationReason = 'Won by resignation';
      shortReason = 'Resigned';
    }
  }

  const whiteScore = result === '1-0' ? '1' : result === '0-1' ? '0' : result === '1/2-1/2' ? '½' : null;
  const blackScore = result === '0-1' ? '1' : result === '1-0' ? '0' : result === '1/2-1/2' ? '½' : null;

  return {
    isFinished: true,
    result,
    winner,
    loser,
    isDraw,
    terminationType,
    terminationReason,
    shortReason,
    whiteScore,
    blackScore,
  };
}

/**
 * Returns player-specific outcome status, scores, and labels.
 */
export function getPlayerOutcomeStatus(
  outcome: GameOutcome | null | undefined,
  playerColor: 'white' | 'black'
): PlayerOutcomeStatus {
  if (!outcome || !outcome.isFinished) {
    return {
      isWinner: false,
      isLoser: false,
      isDraw: false,
      score: null,
      reason: null,
      shortReason: null,
    };
  }

  const isWinner = outcome.winner === playerColor;
  const isLoser = outcome.loser === playerColor;
  const isDraw = outcome.isDraw;
  const score = playerColor === 'white' ? outcome.whiteScore : outcome.blackScore;

  let reason: string | null = null;
  let shortReason: string | null = null;

  if (isWinner) {
    switch (outcome.terminationType) {
      case 'checkmate':
        reason = 'Won by checkmate';
        shortReason = 'Checkmate';
        break;
      case 'resignation':
        reason = 'Won by resignation';
        shortReason = 'Resignation';
        break;
      case 'timeout':
        reason = 'Won on time';
        shortReason = 'Win by time';
        break;
      case 'abandoned':
        reason = 'Won (Opponent abandoned)';
        shortReason = 'Abandoned';
        break;
      default:
        reason = 'Winner';
        shortReason = 'Winner';
        break;
    }
  } else if (isLoser) {
    switch (outcome.terminationType) {
      case 'checkmate':
        reason = 'Checkmated';
        shortReason = 'Checkmated';
        break;
      case 'resignation':
        reason = 'Resigned';
        shortReason = 'Resigned';
        break;
      case 'timeout':
        reason = 'Lost on time';
        shortReason = 'Time out';
        break;
      case 'abandoned':
        reason = 'Abandoned';
        shortReason = 'Abandoned';
        break;
      default:
        reason = 'Defeated';
        shortReason = 'Defeated';
        break;
    }
  } else if (isDraw) {
    switch (outcome.terminationType) {
      case 'stalemate':
        reason = 'Draw by stalemate';
        shortReason = 'Stalemate';
        break;
      case 'repetition':
        reason = 'Draw by repetition';
        shortReason = 'Repetition';
        break;
      case 'agreement':
        reason = 'Draw by agreement';
        shortReason = 'Agreement';
        break;
      case 'insufficient_material':
        reason = 'Draw (Insufficient material)';
        shortReason = 'Insufficient material';
        break;
      case '50_moves':
        reason = 'Draw (50-move rule)';
        shortReason = '50-Move rule';
        break;
      default:
        reason = 'Draw';
        shortReason = 'Draw';
        break;
    }
  }

  return {
    isWinner,
    isLoser,
    isDraw,
    score,
    reason,
    shortReason,
  };
}
