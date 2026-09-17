import { Chess } from 'chess.js';
import { LiveEngineLine } from '../models/analysis.model';

export interface RawEnginePvInfo {
  multipv: number;
  depth: number;
  scoreCp: number | null; // From side-to-move perspective (UCI standard)
  mate: number | null; // From side-to-move perspective (UCI standard)
  pv: string[]; // List of UCI moves e.g. ["e2e4", "c7c5", "g1f3"]
}

/**
 * Converts UCI moves into SAN notation and builds a structured LiveEngineLine
 */
export function formatEnginePvLine(
  fen: string,
  rawInfo: RawEnginePvInfo
): LiveEngineLine | null {
  if (!rawInfo.pv || rawInfo.pv.length === 0) return null;

  try {
    const chess = new Chess(fen);
    const isWhiteTurn = chess.turn() === 'w';
    const fenParts = fen.split(' ');
    const fullMoveNum = parseInt(fenParts[5] || '1', 10) || 1;

    const movesSan: string[] = [];
    const movesUci: string[] = [];
    let firstMove: { from: string; to: string; san: string } | null = null;
    const formattedParts: string[] = [];

    let currentMoveNum = fullMoveNum;
    let currentIsWhite = isWhiteTurn;

    for (let i = 0; i < rawInfo.pv.length; i++) {
      const uci = rawInfo.pv[i];
      if (!uci || uci.length < 4) break;

      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promotion = uci.length > 4 ? uci.substring(4, 5) : undefined;

      const res = chess.move({ from, to, promotion });
      if (!res) break;

      movesSan.push(res.san);
      movesUci.push(uci);

      if (i === 0) {
        firstMove = { from, to, san: res.san };
      }

      // Format move text with move numbers
      if (currentIsWhite) {
        formattedParts.push(`${currentMoveNum}. ${res.san}`);
      } else {
        if (i === 0) {
          formattedParts.push(`${currentMoveNum}... ${res.san}`);
        } else {
          formattedParts.push(res.san);
        }
        currentMoveNum++;
      }
      currentIsWhite = !currentIsWhite;
    }

    if (!firstMove) return null;

    // Auto-extend single-move PV lines (e.g. depth 1 or instant heuristic lines) to show rich continuations
    if (rawInfo.pv.length <= 1) {
      while (movesSan.length < 4 && !chess.isGameOver()) {
        const nextMoves = chess.moves({ verbose: true });
        if (nextMoves.length === 0) break;

        nextMoves.sort((a, b) => {
          let scoreA = 0;
          let scoreB = 0;
          if (a.san.includes('#')) scoreA += 1000;
          if (b.san.includes('#')) scoreB += 1000;
          if (a.captured) scoreA += 200;
          if (b.captured) scoreB += 200;
          if (a.san.includes('+')) scoreA += 80;
          if (b.san.includes('+')) scoreB += 80;
          return scoreB - scoreA;
        });

        const chosen = nextMoves[0];
        const uci = `${chosen.from}${chosen.to}${chosen.promotion || ''}`;
        chess.move(chosen);
        movesSan.push(chosen.san);
        movesUci.push(uci);

        if (currentIsWhite) {
          formattedParts.push(`${currentMoveNum}. ${chosen.san}`);
        } else {
          formattedParts.push(chosen.san);
          currentMoveNum++;
        }
        currentIsWhite = !currentIsWhite;
      }
    }

    // Score conversion from White's perspective
    const mult = isWhiteTurn ? 1 : -1;
    const whiteCp = rawInfo.scoreCp !== null ? rawInfo.scoreCp * mult : null;
    const whiteMate = rawInfo.mate !== null ? rawInfo.mate * mult : null;

    let scoreFormatted = '+0.0';
    if (whiteMate !== null) {
      scoreFormatted = whiteMate > 0 ? `+M${whiteMate}` : `-M${Math.abs(whiteMate)}`;
    } else if (whiteCp !== null) {
      const cpVal = whiteCp / 100;
      if (Math.abs(cpVal) < 0.05) {
        scoreFormatted = '+0.0';
      } else if (cpVal > 0) {
        scoreFormatted = `+${cpVal.toFixed(1)}`;
      } else {
        scoreFormatted = `${cpVal.toFixed(1)}`;
      }
    }

    const isWhiteAdvantage = (whiteMate !== null && whiteMate > 0) || (whiteCp !== null && whiteCp > 15);
    const isBlackAdvantage = (whiteMate !== null && whiteMate < 0) || (whiteCp !== null && whiteCp < -15);
    const isEqual = !isWhiteAdvantage && !isBlackAdvantage;

    const moveNumberPrefix = isWhiteTurn ? `${fullMoveNum}.` : `${fullMoveNum}...`;
    const firstSan = firstMove.san;
    const restParts = formattedParts.slice(1);
    const restLineSan = restParts.join(' ');
    const fullLineText = formattedParts.join(' ');

    return {
      id: rawInfo.multipv,
      multipv: rawInfo.multipv,
      scoreFormatted,
      scoreCp: whiteCp,
      mate: whiteMate,
      isWhiteAdvantage,
      isBlackAdvantage,
      isEqual,
      movesUci,
      movesSan,
      firstMove,
      moveNumberPrefix,
      firstSan,
      restLineSan,
      fullLineText,
    };
  } catch {
    return null;
  }
}
