import { Injectable, computed, inject, signal, NgZone, OnDestroy } from '@angular/core';
import { Chess } from 'chess.js';
import {
  EvalGraphPoint,
  GameAnalysisSummary,
  MoveAnalysis,
  MoveClassification,
} from '../models/analysis.model';
import { OpeningBookService } from './opening-book.service';
import { getCoachCommentary } from '../utils/coach-commentary.util';
import { SettingsService } from './settings.service';

export interface MoveRecordInput {
  from: string;
  to: string;
  piece?: string;
  san: string;
  fen: string;
  turn: 'w' | 'b';
  promotion?: string;
}

interface PositionEval {
  score: number | null; // absolute centipawns (from white's perspective)
  mate: number | null; // absolute mate in X (positive if white is mating, negative if black is mating)
  bestMove: string | null;
  pv?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class GameAnalysisService implements OnDestroy {
  private readonly openingBook = inject(OpeningBookService);
  private readonly settings = inject(SettingsService);
  private readonly zone = inject(NgZone);

  private worker: Worker | null = null;
  private isWorkerReady = false;
  private workerAvailable = false;

  readonly isAnalyzing = signal<boolean>(false);
  readonly progress = signal<number>(0); // 0 - 100
  readonly movesAnalysis = signal<MoveAnalysis[]>([]);
  readonly detectedOpening = signal<{ eco: string; name: string } | null>(null);

  private currentHistory: MoveRecordInput[] = [];
  private currentEvals: PositionEval[] = [];
  private currentAnalyzeIndex = 0;
  private initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  private resolveAnalysisPromise: ((value: void) => void) | null = null;

  private currentDepth = 0;
  private currentScore: number | null = null;
  private currentMate: number | null = null;
  private currentBestMovePv: string | null = null;
  private currentPvMoves: string[] = [];

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
      // Exponential CAPS2 mapping (A power of 2.5 maps an 81% average move accuracy to ~60% game accuracy)
      const curved = Math.pow(mean / 100, 2.5) * 100;
      return Math.round(curved * 10) / 10;
    };

    const whiteAcc = calcAccuracy(whiteTotalAcc, whiteMoves);
    const blackAcc = calcAccuracy(blackTotalAcc, blackMoves);

    const calcRating = (acc: number): number => {
      if (acc <= 0) return 400;
      if (acc >= 99) return 3500;
      const norm = acc / 100;
      const rating = 400 + Math.pow(norm, 2.3) * 3100;
      return Math.min(3500, Math.max(400, Math.round(rating / 50) * 50));
    };

    const getCoachVerdict = (acc: number, blunders: number): string => {
      if (acc >= 90) return 'EXCEPTIONAL';
      if (acc >= 80 && blunders === 0) return 'GREAT';
      if (acc >= 70 && blunders <= 1) return 'SOLID';
      if (acc >= 55 && blunders <= 2) return 'MEDIOCRE';
      return 'BAD';
    };

    const calcPhaseQuality = (phaseMoves: MoveAnalysis[], isWhiteTurn: boolean): string => {
      const filtered = phaseMoves.filter((m) => (m.plyIndex % 2 === 0) === isWhiteTurn);
      if (filtered.length === 0) return '-';

      const blunders = filtered.filter((m) => m.classification === 'blunder').length;
      const misses = filtered.filter((m) => m.classification === 'miss').length;
      const mistakes = filtered.filter((m) => m.classification === 'mistake').length;
      const inaccuracies = filtered.filter((m) => m.classification === 'inaccuracy').length;
      const brilliancies = filtered.filter((m) => m.classification === 'brilliant').length;
      const bestOrGreat = filtered.filter((m) => m.classification === 'best' || m.classification === 'great').length;

      if (blunders > 0 || misses > 0) return 'Mistake';
      if (mistakes > 0) return 'Mistake';
      if (inaccuracies > 0) return 'Inaccuracy';
      if (brilliancies > 0) return 'Brilliant Move';
      if (bestOrGreat >= filtered.length * 0.4) return 'Best Move';
      return 'Good Move';
    };

    const openingMoves = moves.filter((m) => m.plyIndex < 20); // Plies 0-19 (moves 1-10)
    const middlegameMoves = moves.filter((m) => m.plyIndex >= 20 && m.plyIndex < 50); // Plies 20-49 (moves 11-25)
    const endgameMoves = moves.filter((m) => m.plyIndex >= 50); // Plies 50+ (moves 26+)

    const phases = {
      opening: {
        white: calcPhaseQuality(openingMoves, true),
        black: calcPhaseQuality(openingMoves, false),
      },
      middlegame: {
        white: calcPhaseQuality(middlegameMoves, true),
        black: calcPhaseQuality(middlegameMoves, false),
      },
      endgame: {
        white: calcPhaseQuality(endgameMoves, true),
        black: calcPhaseQuality(endgameMoves, false),
      },
    };

    const opening = this.detectedOpening();

    return {
      whiteAccuracy: whiteAcc,
      blackAccuracy: blackAcc,
      whiteCounts,
      blackCounts,
      whitePerformanceRating: calcRating(whiteAcc),
      blackPerformanceRating: calcRating(blackAcc),
      whiteCoachVerdict: getCoachVerdict(whiteAcc, whiteCounts.blunder),
      blackCoachVerdict: getCoachVerdict(blackAcc, blackCounts.blunder),
      phases,
      openingEco: opening?.eco,
      openingName: opening?.name,
    };
  });

  readonly evalGraphPoints = computed<EvalGraphPoint[]>(() => {
    const analyses = this.movesAnalysis();
    return analyses.map((m, idx) => {
      const score = m.scoreAfter ?? (m.evalCp ?? 0);
      const clampedScore = Math.max(-10, Math.min(10, score / 100));
      return {
        ply: idx + 1,
        san: m.san || m.moveSan || '',
        turn: m.plyIndex % 2 === 0 ? 'w' : 'b',
        evalScore: clampedScore,
        rawScore: score,
        classification: m.classification,
        isCurrent: false,
      };
    });
  });

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (typeof Worker === 'undefined') {
      this.workerAvailable = false;
      return;
    }
    try {
      this.worker = new Worker('engine/v18/lite/stockfish.js#stockfish.wasm');
      this.worker.onmessage = (event) => {
        this.zone.run(() => this.handleWorkerMessage(event.data));
      };
      this.worker.onerror = () => {
        this.zone.run(() => {
          this.workerAvailable = false;
        });
      };
      this.worker.postMessage('uci');
      this.workerAvailable = true;
    } catch {
      this.workerAvailable = false;
    }
  }

  private handleWorkerMessage(message: string): void {
    if (message === 'uciok') {
      this.worker?.postMessage('isready');
    } else if (message === 'readyok') {
      this.isWorkerReady = true;
      if (this.isAnalyzing() && this.currentHistory.length > 0) {
        this.evaluateNextWorkerPosition();
      }
    } else if (message.startsWith('info ')) {
      this.parseWorkerInfo(message);
    } else if (message.startsWith('bestmove ')) {
      this.parseWorkerBestMove(message);
    }
  }

  private parseWorkerInfo(message: string): void {
    if (!this.isAnalyzing()) return;

    const parts = message.split(' ');
    const depthIndex = parts.indexOf('depth');
    if (depthIndex !== -1) {
      this.currentDepth = parseInt(parts[depthIndex + 1], 10);
    }

    const scoreIndex = parts.indexOf('score');
    if (scoreIndex !== -1) {
      const fen = this.getFenForIndex(this.currentAnalyzeIndex);
      const isWhiteTurn = fen.split(' ')[1] === 'w';
      const mult = isWhiteTurn ? 1 : -1;

      if (parts[scoreIndex + 1] === 'cp') {
        this.currentScore = parseInt(parts[scoreIndex + 2], 10) * mult;
        this.currentMate = null;
      } else if (parts[scoreIndex + 1] === 'mate') {
        this.currentMate = parseInt(parts[scoreIndex + 2], 10) * mult;
        this.currentScore = null;
      }
    }

    const pvIndex = parts.indexOf('pv');
    if (pvIndex !== -1) {
      this.currentBestMovePv = parts[pvIndex + 1];
      this.currentPvMoves = parts.slice(pvIndex + 1);
    }
  }

  private parseWorkerBestMove(message: string): void {
    if (!this.isAnalyzing()) return;

    const parts = message.split(' ');
    const bm = parts[1] || this.currentBestMovePv;

    this.currentEvals[this.currentAnalyzeIndex] = {
      score: this.currentScore,
      mate: this.currentMate,
      bestMove: bm,
      pv: this.currentPvMoves.length > 0 ? [...this.currentPvMoves] : bm ? [bm] : [],
    };

    this.currentAnalyzeIndex++;
    this.progress.set(Math.round((this.currentAnalyzeIndex / (this.currentHistory.length + 1)) * 100));

    if (this.currentAnalyzeIndex <= this.currentHistory.length) {
      this.evaluateNextWorkerPosition();
    } else {
      this.finishWorkerAnalysis();
    }
  }

  private getFenForIndex(index: number): string {
    if (index === 0) return this.initialFen;
    return this.currentHistory[index - 1].fen;
  }

  private evaluateNextWorkerPosition(): void {
    if (!this.worker) return;
    const fen = this.getFenForIndex(this.currentAnalyzeIndex);
    this.currentDepth = 0;
    this.currentScore = null;
    this.currentMate = null;
    this.currentBestMovePv = null;
    this.currentPvMoves = [];

    const depth = this.settings?.analysisDepth ? this.settings.analysisDepth() : 14;
    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go depth ${depth}`);
  }

  /**
   * Chess.com CAPS2 Win Probability Model:
   * WinChance = 100 / (1 + exp(-0.00368208 * cp))
   */
  evalToWinChance(scoreCp: number | null, mate: number | null): number {
    if (mate !== null && mate !== undefined) {
      return mate > 0 ? 100 : 0;
    }
    if (scoreCp === null || scoreCp === undefined) {
      return 50;
    }
    return 100 / (1 + Math.exp(-0.00368208 * scoreCp));
  }

  /**
   * Chess.com CAPS2 Move Accuracy Formula:
   * Accuracy = 103.1668 * exp(-0.04354 * deltaWin) - 3.1669
   */
  calculateCaps2Accuracy(deltaWin: number, isBestMove: boolean): number {
    if (isBestMove || deltaWin <= 0.001) {
      return 100;
    }
    const acc = 103.1668 * Math.exp(-0.04354 * deltaWin) - 3.1669;
    return Math.max(0, Math.min(100, Math.round(acc * 10) / 10));
  }

  /**
   * Run full game review and analysis
   */
  async runAnalysis(history: MoveRecordInput[], initialFen?: string): Promise<void> {
    if (!history || history.length === 0) return;

    this.isAnalyzing.set(true);
    this.progress.set(5);

    // Detect opening
    const sanList = history.map((h) => h.san);
    const opening = this.openingBook.getOpeningForMoves(sanList);
    this.detectedOpening.set(opening);

    this.currentHistory = history;
    this.initialFen = initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    this.currentEvals = new Array(history.length + 1);
    this.currentAnalyzeIndex = 0;

    if (this.workerAvailable && this.worker) {
      if (this.isWorkerReady) {
        this.worker.postMessage('stop');
        this.worker.postMessage('ucinewgame');
        this.evaluateNextWorkerPosition();
        return new Promise((resolve) => {
          this.resolveAnalysisPromise = resolve;
        });
      }
    }

    // Fallback heuristic evaluation when worker is not ready or not available
    await this.runHeuristicAnalysis(history, opening);
  }

  private finishWorkerAnalysis(): void {
    this.isAnalyzing.set(false);
    this.progress.set(100);

    const analysis: MoveAnalysis[] = [];
    const sanList: string[] = [];
    let bookStillActive = true;
    const opening = this.detectedOpening();

    for (let i = 0; i < this.currentHistory.length; i++) {
      const item = this.currentHistory[i];
      const isWhiteTurn = item.turn === 'w' || i % 2 === 0;
      sanList.push(item.san);

      const evalBefore = this.currentEvals[i];
      const evalAfter = this.currentEvals[i + 1];

      let cpl: number | null = null;
      let classification: MoveClassification = 'unknown';

      // Win chances from White's perspective (0 - 100)
      const whiteWinBefore = this.evalToWinChance(evalBefore?.score ?? null, evalBefore?.mate ?? null);
      const whiteWinAfter = item.san.includes('#')
        ? isWhiteTurn
          ? 100
          : 0
        : this.evalToWinChance(evalAfter?.score ?? null, evalAfter?.mate ?? null);

      // Win chances from moving player's perspective
      const playerWinBefore = isWhiteTurn ? whiteWinBefore : 100 - whiteWinBefore;
      const playerWinAfter = isWhiteTurn ? whiteWinAfter : 100 - whiteWinAfter;

      const deltaWin = Math.max(0, playerWinBefore - playerWinAfter);

      let evalGain: number | null = null;
      if (evalBefore && evalAfter && evalBefore.score !== null && evalAfter.score !== null) {
        const diff = isWhiteTurn ? evalAfter.score - evalBefore.score : evalBefore.score - evalAfter.score;
        cpl = Math.max(0, -diff);
        evalGain = diff;
      } else if (evalBefore && evalAfter) {
        if (evalAfter.mate !== null) {
          const isPlayerMate = (isWhiteTurn && evalAfter.mate > 0) || (!isWhiteTurn && evalAfter.mate < 0);
          if (isPlayerMate) {
            if (evalBefore.mate === null) evalGain = 300;
            cpl = 0;
          }
        }
      }

      const isEngineBest = evalBefore?.bestMove
        ? item.san === evalBefore.bestMove || Boolean(item.from && item.to && `${item.from}${item.to}` === evalBefore.bestMove)
        : false;

      // Check Opening Book
      if (bookStillActive && this.openingBook.isBookMove(sanList)) {
        classification = 'book';
      } else {
        bookStillActive = false;
        classification = this.classifyMove(deltaWin, evalGain, isEngineBest, playerWinBefore);
      }

      const accuracy = classification === 'book' ? 100 : this.calculateCaps2Accuracy(deltaWin, isEngineBest);

      // Follow up moves
      const followUpMoves: string[] = [];
      const boardAfter = new Chess(item.fen);
      if (evalAfter?.pv && evalAfter.pv.length > 0) {
        for (const uci of evalAfter.pv.slice(0, 6)) {
          try {
            const from = uci.slice(0, 2);
            const to = uci.slice(2, 4);
            const promotion = uci.length > 4 ? uci[4] : undefined;
            const res = boardAfter.move({ from, to, promotion });
            if (res) followUpMoves.push(res.san);
            else break;
          } catch {
            break;
          }
        }
      }
      if (followUpMoves.length === 0 && i < this.currentHistory.length - 1) {
        for (let j = i + 1; j < Math.min(i + 6, this.currentHistory.length); j++) {
          followUpMoves.push(this.currentHistory[j].san);
        }
      }

      // Best move in SAN & best move PV
      const previousFen = i === 0 ? this.initialFen : this.currentHistory[i - 1].fen;
      const boardBefore = new Chess(previousFen);
      let bestMoveSan: string | null = null;
      const bestMovePv: string[] = [];
      if (evalBefore?.bestMove) {
        try {
          const from = evalBefore.bestMove.slice(0, 2);
          const to = evalBefore.bestMove.slice(2, 4);
          const promotion = evalBefore.bestMove.length > 4 ? evalBefore.bestMove[4] : undefined;
          const res = boardBefore.move({ from, to, promotion });
          if (res) {
            bestMoveSan = res.san;
            bestMovePv.push(res.san);
            if (evalBefore.pv && evalBefore.pv.length > 1) {
              for (const uci of evalBefore.pv.slice(1, 6)) {
                try {
                  const pFrom = uci.slice(0, 2);
                  const pTo = uci.slice(2, 4);
                  const pProm = uci.length > 4 ? uci[4] : undefined;
                  const pRes = boardBefore.move({ from: pFrom, to: pTo, promotion: pProm });
                  if (pRes) bestMovePv.push(pRes.san);
                  else break;
                } catch {
                  break;
                }
              }
            }
          }
        } catch {
          bestMoveSan = evalBefore.bestMove;
        }
      }

      const commentary = getCoachCommentary(
        classification,
        item.san,
        bestMoveSan,
        i,
        opening?.name
      );

      analysis.push({
        plyIndex: i,
        san: item.san,
        moveSan: item.san,
        from: item.from,
        to: item.to,
        fenBefore: previousFen,
        fenAfter: item.fen,
        scoreBefore: evalBefore?.score ?? null,
        scoreAfter: evalAfter?.score ?? null,
        evalCp: evalAfter?.score ?? 0,
        cpl,
        accuracy,
        winChanceBefore: Math.round(playerWinBefore * 10) / 10,
        winChanceAfter: Math.round(playerWinAfter * 10) / 10,
        mateBefore: evalBefore?.mate ?? null,
        mateAfter: evalAfter?.mate ?? null,
        bestMove: evalBefore?.bestMove ?? null,
        bestMoveSan,
        bestMovePv,
        followUpMoves,
        classification,
        commentary,
      });
    }

    this.movesAnalysis.set(analysis);
    if (this.resolveAnalysisPromise) {
      this.resolveAnalysisPromise();
      this.resolveAnalysisPromise = null;
    }
  }

  private classifyMove(
    deltaWin: number,
    evalGain: number | null,
    isEngineBest: boolean,
    playerWinBefore: number
  ): MoveClassification {
    if (isEngineBest || deltaWin <= 0.5) {
      if (evalGain !== null) {
        if (evalGain >= 200) return 'brilliant';
        if (evalGain >= 100) return 'great';
      }
      return 'best';
    }

    if (deltaWin <= 2.0) return 'excellent';
    if (deltaWin <= 5.0) return 'good';
    if (deltaWin <= 10.0) return 'inaccuracy';

    // Miss: when player had a clear winning/punishing advantage (>50% win chance) and lost >15% win chance
    if (playerWinBefore >= 50 && deltaWin > 15.0 && deltaWin <= 25.0) {
      return 'miss';
    }

    if (deltaWin <= 20.0) return 'mistake';
    return 'blunder';
  }

  private async runHeuristicAnalysis(
    history: MoveRecordInput[],
    opening: { eco: string; name: string } | null
  ): Promise<void> {
    const results: MoveAnalysis[] = [];
    const tempChess = new Chess();
    const sanList = history.map((h) => h.san);
    let prevScore = 0;

    for (let i = 0; i < history.length; i++) {
      const item = history[i];
      const fenBefore = tempChess.fen();
      const isWhiteTurn = item.turn === 'w';

      const legalMovesBefore = tempChess.moves({ verbose: true });
      const pieceCountBefore = this.countPieces(tempChess);

      tempChess.move({ from: item.from, to: item.to, promotion: item.promotion || 'q' });
      const fenAfter = tempChess.fen();

      const evalCp = this.evaluatePosition(tempChess);
      const scoreAfterPlayer = isWhiteTurn ? evalCp : -evalCp;
      const scoreBeforePlayer = isWhiteTurn ? prevScore : -prevScore;

      const bestMoveCandidate = this.findBestMoveHeuristic(legalMovesBefore);
      const isBook = this.openingBook.isBookMove(sanList.slice(0, i + 1));

      const cpDelta = Math.max(0, scoreBeforePlayer - scoreAfterPlayer);

      const winProbBefore = 1 / (1 + Math.pow(10, -scoreBeforePlayer / 400));
      const winProbAfter = 1 / (1 + Math.pow(10, -scoreAfterPlayer / 400));
      const deltaWin = Math.max(0, (winProbBefore - winProbAfter) * 100);

      let classification: MoveClassification = 'good';

      if (isBook && i < 16) {
        classification = 'book';
      } else if (tempChess.isCheckmate()) {
        classification = 'brilliant';
      } else if (deltaWin > 35 || cpDelta > 280) {
        classification = 'blunder';
      } else if (scoreBeforePlayer > 150 && deltaWin > 15) {
        classification = 'miss';
      } else if (deltaWin > 20 || cpDelta > 180) {
        classification = 'mistake';
      } else if (deltaWin > 8 || cpDelta > 90) {
        classification = 'inaccuracy';
      } else if (cpDelta < 15) {
        const pieceCountAfter = this.countPieces(tempChess);
        const sacrificedMaterial = isWhiteTurn
          ? pieceCountBefore.white - pieceCountAfter.white > pieceCountBefore.black - pieceCountAfter.black
          : pieceCountBefore.black - pieceCountAfter.black > pieceCountBefore.white - pieceCountAfter.white;

        if (sacrificedMaterial && scoreAfterPlayer > 150) {
          classification = 'brilliant';
        } else if (cpDelta < 5) {
          classification = 'best';
        } else {
          classification = 'excellent';
        }
      } else if (cpDelta < 40) {
        classification = 'good';
      } else {
        classification = 'inaccuracy';
      }

      const accuracy = classification === 'book' ? 100 : this.calculateCaps2Accuracy(deltaWin, classification === 'best');

      const commentary = getCoachCommentary(
        classification,
        item.san,
        bestMoveCandidate ? bestMoveCandidate.san : null,
        i,
        opening?.name
      );

      // Extract follow up moves from next moves
      const followUpMoves: string[] = [];
      for (let j = i + 1; j < Math.min(i + 6, history.length); j++) {
        followUpMoves.push(history[j].san);
      }

      results.push({
        plyIndex: i,
        san: item.san,
        moveSan: item.san,
        from: item.from,
        to: item.to,
        fenBefore,
        fenAfter,
        scoreBefore: scoreBeforePlayer,
        scoreAfter: scoreAfterPlayer,
        evalCp,
        cpl: cpDelta,
        winChanceBefore: Math.round(winProbBefore * 1000) / 10,
        winChanceAfter: Math.round(winProbAfter * 1000) / 10,
        bestMove: bestMoveCandidate ? bestMoveCandidate.san : null,
        bestMoveSan: bestMoveCandidate ? bestMoveCandidate.san : null,
        followUpMoves,
        classification,
        accuracy,
        commentary,
      });

      prevScore = evalCp;
      this.progress.set(Math.round(((i + 1) / history.length) * 100));

      if (i % 6 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }

    this.movesAnalysis.set(results);
    this.isAnalyzing.set(false);
    this.progress.set(100);
  }

  clearAnalysis(): void {
    if (this.worker) {
      this.worker.postMessage('stop');
    }
    this.movesAnalysis.set([]);
    this.detectedOpening.set(null);
    this.isAnalyzing.set(false);
    this.progress.set(0);
    this.resolveAnalysisPromise = null;
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
    if (chess.history().length === 0 && chess.fen().startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')) {
      return 0;
    }

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

    const movesCount = chess.moves().length;
    score += chess.turn() === 'w' ? movesCount * 4 : -movesCount * 4;

    return score;
  }

  private findBestMoveHeuristic(
    legalMoves: { from: string; to: string; san: string }[]
  ): { san: string } | null {
    if (!legalMoves || legalMoves.length === 0) return null;
    const preferred = legalMoves.find((m) => m.san.includes('#') || m.san.includes('x') || m.san.includes('+'));
    return preferred || legalMoves[0];
  }

  ngOnDestroy(): void {
    if (this.worker) {
      this.worker.postMessage('quit');
      this.worker.terminate();
      this.worker = null;
    }
  }
}
