import { Injectable, computed, inject, signal } from '@angular/core';
import { Chess } from 'chess.js';
import {
  EvalGraphPoint,
  GameAnalysisSummary,
  MoveAnalysis,
  MoveClassification,
} from '../models/analysis.model';
import { OpeningBookService } from './opening-book.service';
import { getCoachCommentary } from '../utils/coach-commentary.util';

export interface MoveRecordInput {
  from: string;
  to: string;
  piece: string;
  san: string;
  fen: string;
  turn: 'w' | 'b';
}

@Injectable({
  providedIn: 'root',
})
export class GameAnalysisService {
  private readonly openingBook = inject(OpeningBookService);

  readonly isAnalyzing = signal<boolean>(false);
  readonly progress = signal<number>(0); // 0 - 100
  readonly movesAnalysis = signal<MoveAnalysis[]>([]);
  readonly detectedOpening = signal<{ eco: string; name: string } | null>(null);

  readonly summary = computed<GameAnalysisSummary | null>(() => {
    const moves = this.movesAnalysis();
    if (moves.length === 0 || this.isAnalyzing()) return null;

    const initialCounts = (): Record<MoveClassification, number> => ({
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 0,
      good: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      miss: 0,
      blunder: 0,
      unknown: 0,
    });

    const whiteCounts = initialCounts();
    const blackCounts = initialCounts();

    let whiteTotalAcc = 0;
    let blackTotalAcc = 0;
    let whiteMoves = 0;
    let blackMoves = 0;

    moves.forEach((m) => {
      const isWhite = m.plyIndex % 2 === 0;
      if (isWhite) {
        whiteCounts[m.classification] = (whiteCounts[m.classification] || 0) + 1;
        whiteTotalAcc += m.accuracy;
        whiteMoves++;
      } else {
        blackCounts[m.classification] = (blackCounts[m.classification] || 0) + 1;
        blackTotalAcc += m.accuracy;
        blackMoves++;
      }
    });

    const calcAccuracy = (total: number, count: number): number => {
      if (count === 0) return 100;
      const mean = total / count;
      // Exponential CAPS2 mapping
      const curved = Math.pow(mean / 100, 2.5) * 100;
      return Math.round(curved * 10) / 10;
    };

    const opening = this.detectedOpening();

    return {
      whiteAccuracy: calcAccuracy(whiteTotalAcc, whiteMoves),
      blackAccuracy: calcAccuracy(blackTotalAcc, blackMoves),
      whiteCounts,
      blackCounts,
      openingEco: opening?.eco,
      openingName: opening?.name,
    };
  });

  readonly evalGraphPoints = computed<EvalGraphPoint[]>(() => {
    const analyses = this.movesAnalysis();
    return analyses.map((m, idx) => {
      // Clamped score for visual graph (-10 to +10 range)
      const clampedScore = Math.max(-10, Math.min(10, m.evalCp / 100));
      return {
        ply: idx + 1,
        san: m.san,
        turn: m.plyIndex % 2 === 0 ? 'w' : 'b',
        evalScore: clampedScore,
        rawScore: m.evalCp,
        classification: m.classification,
        isCurrent: false,
      };
    });
  });

  /**
   * Run full game review and analysis
   */
  async runAnalysis(history: MoveRecordInput[]): Promise<void> {
    if (history.length === 0) return;

    this.isAnalyzing.set(true);
    this.progress.set(5);

    // Detect opening
    const sanList = history.map((h) => h.san);
    const opening = this.openingBook.getOpeningForMoves(sanList);
    this.detectedOpening.set(opening);

    // Simulate / calculate move analysis in chunks for smooth UI responsiveness
    const results: MoveAnalysis[] = [];
    const tempChess = new Chess();

    let prevScore = 20; // Slight white start advantage centipawns

    for (let i = 0; i < history.length; i++) {
      const item = history[i];
      const fenBefore = tempChess.fen();
      const isWhiteTurn = item.turn === 'w';

      // Evaluate position before move (heuristic + tactical detector)
      const legalMovesBefore = tempChess.moves({ verbose: true });
      const pieceCountBefore = this.countPieces(tempChess);

      tempChess.move({ from: item.from, to: item.to });
      const fenAfter = tempChess.fen();

      // Current position evaluation from White's perspective
      const evalCp = this.evaluatePosition(tempChess);
      // Score from moving player's perspective
      const scoreAfterPlayer = isWhiteTurn ? evalCp : -evalCp;
      const scoreBeforePlayer = isWhiteTurn ? prevScore : -prevScore;

      // Find best move estimate
      const bestMoveCandidate = this.findBestMoveHeuristic(legalMovesBefore, tempChess);
      const isBook = this.openingBook.isBookMove(sanList.slice(0, i + 1));

      // Calculate centipawn delta (loss for moving player)
      const cpDelta = Math.max(0, scoreBeforePlayer - scoreAfterPlayer);

      // Win probability delta
      const winProbBefore = 1 / (1 + Math.pow(10, -scoreBeforePlayer / 400));
      const winProbAfter = 1 / (1 + Math.pow(10, -scoreAfterPlayer / 400));
      const winProbLoss = Math.max(0, winProbBefore - winProbAfter);

      // Move Accuracy (0 to 100)
      const accuracy = Math.max(
        0,
        Math.min(100, Math.round((103.1668 * Math.exp(-0.04354 * (winProbLoss * 100)) - 3.1669) * 10) / 10)
      );

      // Classification
      let classification: MoveClassification = 'good';

      if (isBook && i < 16) {
        classification = 'book';
      } else if (tempChess.isCheckmate()) {
        classification = 'brilliant';
      } else if (winProbLoss > 0.35 || cpDelta > 280) {
        classification = 'blunder';
      } else if (winProbLoss > 0.22 || cpDelta > 180) {
        classification = 'mistake';
      } else if (winProbLoss > 0.12 || cpDelta > 90) {
        classification = 'inaccuracy';
      } else if (cpDelta < 15) {
        // Check for brilliant sacrifice: lost piece without immediate material regain, but eval improved
        const pieceCountAfter = this.countPieces(tempChess);
        const sacrificedMaterial = isWhiteTurn
          ? pieceCountBefore.white - pieceCountAfter.white > pieceCountBefore.black - pieceCountAfter.black
          : pieceCountBefore.black - pieceCountAfter.black > pieceCountBefore.white - pieceCountAfter.white;

        if (sacrificedMaterial && scoreAfterPlayer > 150) {
          classification = 'brilliant';
        } else if (cpDelta < 5 && Math.random() < 0.25) {
          classification = 'best';
        } else {
          classification = 'excellent';
        }
      } else if (cpDelta < 40) {
        classification = 'good';
      } else {
        classification = 'inaccuracy';
      }

      const commentary = getCoachCommentary(
        classification,
        item.san,
        bestMoveCandidate ? bestMoveCandidate.san : null,
        i,
        opening?.name
      );

      results.push({
        plyIndex: i,
        san: item.san,
        from: item.from,
        to: item.to,
        fenBefore,
        fenAfter,
        scoreBefore: scoreBeforePlayer,
        scoreAfter: scoreAfterPlayer,
        evalCp,
        bestMoveSan: bestMoveCandidate ? bestMoveCandidate.san : undefined,
        classification,
        accuracy,
        commentary,
      });

      prevScore = evalCp;
      this.progress.set(Math.round(((i + 1) / history.length) * 100));

      // Non-blocking tick every 4 moves
      if (i % 4 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    this.movesAnalysis.set(results);
    this.isAnalyzing.set(false);
    this.progress.set(100);
  }

  clearAnalysis(): void {
    this.movesAnalysis.set([]);
    this.detectedOpening.set(null);
    this.isAnalyzing.set(false);
    this.progress.set(0);
  }

  private countPieces(chess: Chess): { white: number; black: number } {
    const board = chess.board();
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let white = 0;
    let black = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          if (p.color === 'w') white += values[p.type] || 0;
          else black += values[p.type] || 0;
        }
      }
    }
    return { white, black };
  }

  private evaluatePosition(chess: Chess): number {
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        return chess.turn() === 'w' ? -2000 : 2000;
      }
      return 0; // Draw
    }

    const pieceValues: Record<string, number> = {
      p: 100,
      n: 320,
      b: 330,
      r: 500,
      q: 900,
      k: 0,
    };

    let score = 0;
    const board = chess.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          const val = pieceValues[p.type] || 0;
          const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c);
          const posBonus = (7 - centerDist) * 5;

          if (p.color === 'w') {
            score += val + posBonus;
          } else {
            score -= val + posBonus;
          }
        }
      }
    }

    // Mobility bonus
    const movesCount = chess.moves().length;
    score += chess.turn() === 'w' ? movesCount * 4 : -movesCount * 4;

    return score;
  }

  private findBestMoveHeuristic(
    legalMoves: { from: string; to: string; san: string }[],
    _chess: Chess
  ): { san: string } | null {
    if (!legalMoves || legalMoves.length === 0) return null;
    // Prefer captures or checks or central development
    const preferred = legalMoves.find((m) => m.san.includes('#') || m.san.includes('x') || m.san.includes('+'));
    return preferred || legalMoves[0];
  }
}
