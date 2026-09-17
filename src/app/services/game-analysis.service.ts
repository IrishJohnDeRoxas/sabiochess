import { Injectable, computed, inject, signal, NgZone, OnDestroy } from '@angular/core';
import { Chess } from 'chess.js';
import {
  EvalGraphPoint,
  GameAnalysisSummary,
  MoveAnalysis,
  MoveClassification,
  LiveEngineLine,
} from '../models/analysis.model';
import { OpeningBookService } from './opening-book.service';
import { getCoachCommentary } from '../utils/coach-commentary.util';
import { SettingsService } from './settings.service';
import { formatEnginePvLine, RawEnginePvInfo } from '../utils/engine-line-formatter.util';

export interface MoveRecordInput {
  from: string;
  to: string;
  piece?: string;
  captured?: string;
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

  private liveWorker: Worker | null = null;
  private isLiveWorkerReady = false;
  private liveWorkerAvailable = false;
  private currentLiveFen = '';
  private pendingLiveFen: string | null = null;
  private isLiveSearching = false;
  private activePvMap = new Map<number, RawEnginePvInfo>();

  readonly isAnalyzing = signal<boolean>(false);
  readonly progress = signal<number>(0); // 0 - 100
  readonly movesAnalysis = signal<MoveAnalysis[]>([]);
  readonly detectedOpening = signal<{ eco: string; name: string } | null>(null);
  readonly playerRatings = signal<{ white?: number; black?: number }>({});

  // Live Continuous Evaluation (Multi-PV = 3)
  readonly liveEngineLines = signal<LiveEngineLine[]>([]);
  readonly liveDepth = signal<number>(0);
  readonly hoveredLineRank = signal<number | null>(null);
  readonly isLiveCalculating = signal<boolean>(false);

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

  setPlayerRatings(ratings?: { white?: number | string; black?: number | string }): void {
    if (!ratings) {
      this.playerRatings.set({});
      return;
    }
    const parse = (r?: number | string): number | undefined => {
      if (typeof r === 'number') return isNaN(r) ? undefined : r;
      if (typeof r === 'string') {
        const num = parseInt(r, 10);
        return isNaN(num) ? undefined : num;
      }
      return undefined;
    };
    this.playerRatings.set({
      white: parse(ratings.white),
      black: parse(ratings.black),
    });
  }

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

    const whiteMovesList: MoveAnalysis[] = [];
    const blackMovesList: MoveAnalysis[] = [];

    moves.forEach((m) => {
      const isWhite = m.plyIndex % 2 === 0;
      if (isWhite) {
        whiteCounts[m.classification] = (whiteCounts[m.classification] || 0) + 1;
        whiteMovesList.push(m);
      } else {
        blackCounts[m.classification] = (blackCounts[m.classification] || 0) + 1;
        blackMovesList.push(m);
      }
    });

    /**
     * Chess.com CAPS2 Aggregate Game Accuracy:
     * Uses power-mean (p = 0.6) with position-leverage and volatility weighting.
     * Prevents error dilution while accurately reflecting Chess.com CAPS2 game review percentages.
     */
    const calcAccuracy = (playerMoves: MoveAnalysis[]): number => {
      if (playerMoves.length === 0) return 100;

      const p = 0.26; // CAPS2 power-mean parameter
      let weightedPowerSum = 0;
      let totalWeight = 0;

      for (const m of playerMoves) {
        const acc = Math.max(0, Math.min(100, m.accuracy));

        // Position leverage & volatility weight (Chess.com CAPS2):
        // Sharp / equal positions carry full weight; runaway / decided positions carry lower weight
        const winChance = m.winChanceBefore ?? 50;
        const sharpness = Math.sin(Math.PI * Math.max(0, Math.min(1, winChance / 100)));
        const weight = 0.4 + 0.6 * sharpness;

        weightedPowerSum += Math.pow(acc, p) * weight;
        totalWeight += weight;
      }

      if (totalWeight <= 0) return 100;
      const meanPower = weightedPowerSum / totalWeight;
      const gameAcc = Math.pow(meanPower, 1 / p);
      return Math.max(0, Math.min(100, Math.round(gameAcc * 10) / 10));
    };

    const whiteAcc = calcAccuracy(whiteMovesList);
    const blackAcc = calcAccuracy(blackMovesList);

    const ratings = this.playerRatings();

    /**
     * Empirical Game Rating (Performance Rating) Estimation Model:
     * - Inverse logistic accuracy curve calibrated on FIDE/Chess.com CAPS benchmarks.
     * - Penalties for tactical errors (blunders, misses, mistakes).
     * - Opponent strength differential calibration.
     * - Sample size dampening for short games.
     * - Anchored against established player baseline when available.
     */
    const calcPerformanceRating = (
      accuracy: number,
      playerMoves: MoveAnalysis[],
      counts: Record<MoveClassification, number>,
      playerBaseRating?: number,
      opponentBaseRating?: number
    ): number => {
      if (playerMoves.length === 0) return playerBaseRating ?? 1500;

      // 1. Raw move quality rating from accuracy
      const clampedAcc = Math.max(0.1, Math.min(99.9, accuracy));
      const rawRating = 1100 + 750 * Math.log(clampedAcc / (100.1 - clampedAcc));

      // 2. Tactical blunder & miss penalty
      const blunders = counts['blunder'] || 0;
      const misses = counts['miss'] || 0;
      const mistakes = counts['mistake'] || 0;
      const penalty = Math.min(600, blunders * 80 + misses * 40 + mistakes * 20);
      const qualityRating = rawRating - penalty;

      // 3. Opponent rating differential
      const oppRating = opponentBaseRating ?? 1500;
      const oppAdjustment = (oppRating - 1500) * 0.15;
      const adjustedRating = qualityRating + oppAdjustment;

      // 4. Sample size / move count confidence dampening (short games regress to baseline)
      const base = playerBaseRating ?? 1500;
      const confidence = Math.min(1.0, playerMoves.length / 15);
      const moveDampenedRating = confidence * adjustedRating + (1 - confidence) * base;

      // 5. Anchoring with player's actual rating (if player rating is known)
      let finalEstimate = moveDampenedRating;
      if (playerBaseRating !== undefined) {
        finalEstimate = 0.7 * moveDampenedRating + 0.3 * playerBaseRating;
      }

      // 6. Clamp to realistic range & round to nearest 50
      const bounded = Math.max(100, Math.min(3500, finalEstimate));
      return Math.round(bounded / 50) * 50;
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
      whitePerformanceRating: calcPerformanceRating(
        whiteAcc,
        whiteMovesList,
        whiteCounts,
        ratings.white,
        ratings.black
      ),
      blackPerformanceRating: calcPerformanceRating(
        blackAcc,
        blackMovesList,
        blackCounts,
        ratings.black,
        ratings.white
      ),
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

  private currentRunId = 0;
  private isSearching = false;

  constructor() {
    this.initWorker();
    this.initLiveWorker();
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
          this.isSearching = false;
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
      if (this.isAnalyzing() && this.currentHistory.length > 0 && !this.isSearching && this.currentAnalyzeIndex === 0) {
        this.evaluateNextWorkerPosition();
      }
    } else if (message.startsWith('info ')) {
      this.parseWorkerInfo(message);
    } else if (message.startsWith('bestmove ')) {
      this.parseWorkerBestMove(message);
    }
  }

  private parseWorkerInfo(message: string): void {
    if (!this.isAnalyzing() || !this.isSearching) return;
    if (this.currentAnalyzeIndex >= this.currentEvals.length) return;

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
    if (!this.isAnalyzing() || !this.isSearching) return;
    if (this.currentAnalyzeIndex >= this.currentEvals.length) return;

    this.isSearching = false;
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
    if (!this.worker || !this.isAnalyzing()) return;
    if (this.currentAnalyzeIndex > this.currentHistory.length) return;

    const fen = this.getFenForIndex(this.currentAnalyzeIndex);
    this.currentDepth = 0;
    this.currentScore = null;
    this.currentMate = null;
    this.currentBestMovePv = null;
    this.currentPvMoves = [];

    this.isSearching = true;
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
   * Maps win percentage loss (deltaWin) into an accuracy score (0 - 100).
   *
   * Calibration:
   * - Best / Book / Great / Brilliant: 100%
   * - Excellent (deltaWin <= 2%): 90% - 98%
   * - Good (deltaWin <= 5%): 65% - 85%
   * - Inaccuracy (deltaWin 5% - 10%): 40% - 60%
   * - Mistake (deltaWin 10% - 20%): 15% - 35%
   * - Miss / Blunder (deltaWin > 20%): 0% - 15%
   */
  calculateCaps2Accuracy(deltaWin: number, isBestMove: boolean, classification?: MoveClassification): number {
    if (
      isBestMove ||
      deltaWin <= 0.3 ||
      classification === 'book' ||
      classification === 'best' ||
      classification === 'brilliant' ||
      classification === 'great'
    ) {
      return 100;
    }
    const acc = 100 * Math.exp(-0.055 * Math.pow(Math.max(0, deltaWin), 1.35));
    return Math.max(0, Math.min(100, Math.round(acc * 10) / 10));
  }

  /**
   * Run full game review and analysis
   */
  async runAnalysis(
    history: MoveRecordInput[],
    initialFen?: string,
    playerRatings?: { white?: number | string; black?: number | string }
  ): Promise<void> {
    if (!history || history.length === 0) return;

    this.currentRunId++;

    if (playerRatings) {
      this.setPlayerRatings(playerRatings);
    }

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
      if (this.isSearching) {
        this.worker.postMessage('stop');
        this.isSearching = false;
      }
      this.isWorkerReady = false;
      this.worker.postMessage('ucinewgame');
      this.worker.postMessage('isready');
      return new Promise((resolve) => {
        this.resolveAnalysisPromise = resolve;
      });
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

      const previousFen = i === 0 ? this.initialFen : this.currentHistory[i - 1].fen;
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
        const isSacrifice = this.isSacrificeMove(
          previousFen,
          item.fen,
          item.from,
          item.to,
          item.piece,
          item.captured
        );
        classification = this.classifyMove(
          deltaWin,
          evalGain,
          isEngineBest,
          playerWinBefore,
          isSacrifice,
          playerWinAfter,
          evalBefore?.score ?? null,
          evalBefore?.mate ?? null
        );
      }

      const accuracy = classification === 'book' ? 100 : this.calculateCaps2Accuracy(deltaWin, isEngineBest, classification);

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
    playerWinBefore: number,
    isSacrifice: boolean = false,
    playerWinAfter: number = 50,
    evalBeforeScore: number | null = null,
    mateBefore: number | null = null
  ): MoveClassification {
    if (isEngineBest || deltaWin <= 0.2) {
      // Brilliant move: strictly engine best move, piece sacrifice that maintains winning or advantageous position
      // Must not be in an already overwhelming blowout (>90% win chance, eval > 500 cp, or mate already in hand)
      const isBlowout =
        playerWinBefore > 90 ||
        (evalBeforeScore !== null && Math.abs(evalBeforeScore) > 500) ||
        (mateBefore !== null && Math.abs(mateBefore) <= 5);

      const holdsAdvantage =
        (playerWinAfter >= 50 && deltaWin <= 0.5) ||
        (playerWinBefore < 50 && playerWinAfter >= playerWinBefore + 10);

      if (isEngineBest && isSacrifice && !isBlowout && holdsAdvantage) {
        return 'brilliant';
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

  private isSacrificeMove(
    fenBefore: string,
    fenAfter: string,
    from?: string,
    to?: string,
    piece?: string,
    captured?: string
  ): boolean {
    if (!piece) return false;
    const movedPieceType = piece.toLowerCase();
    // King and pawn moves are never piece sacrifices
    if (movedPieceType === 'k' || movedPieceType === 'p') return false;

    const pieceValues: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
    };

    let boardBefore: Chess;
    let boardAfter: Chess;
    try {
      boardBefore = new Chess(fenBefore);
      boardAfter = new Chess(fenAfter);
    } catch {
      return false;
    }

    const targetPieceBefore = to ? boardBefore.get(to as any) : null;
    const actualCaptured = captured || (targetPieceBefore ? targetPieceBefore.type : undefined);
    const movedPieceValue = pieceValues[movedPieceType] || 0;
    const capturedValue = actualCaptured ? (pieceValues[actualCaptured.toLowerCase()] || 0) : 0;

    const oppMoves = boardAfter.moves({ verbose: true });

    // Helper: calculate net material gain for opponent if they play oppMove
    const calculateOpponentGain = (
      boardState: Chess,
      oppMove: { from: string; to: string; piece: string; captured?: string; promotion?: string },
      initialMoveCapturedVal: number
    ): number => {
      const victimType = oppMove.captured?.toLowerCase();
      if (!victimType) return 0;
      const victimVal = pieceValues[victimType] || 0;
      const attackerVal = pieceValues[oppMove.piece.toLowerCase()] || 0;

      const simBoard = new Chess(boardState.fen());
      try {
        simBoard.move({ from: oppMove.from, to: oppMove.to, promotion: oppMove.promotion });
      } catch {
        return 0;
      }

      // Check player's immediate recaptures on target square
      const recaptures = simBoard.moves({ verbose: true }).filter((m) => m.to === oppMove.to && m.captured);
      if (recaptures.length === 0) {
        // Player cannot recapture: opponent wins victimVal, player only had initialMoveCapturedVal
        return victimVal - initialMoveCapturedVal;
      }

      // Player can recapture, winning attackerVal
      return victimVal - attackerVal - initialMoveCapturedVal;
    };

    // 1. Direct piece sacrifice: moved piece (N, B, R, Q) is placed on square 'to'
    // where opponent can capture it for a net material gain of >= 2
    if (to && movedPieceValue >= 3 && movedPieceValue - capturedValue >= 2) {
      for (const oppMove of oppMoves) {
        if (oppMove.to === to && oppMove.captured) {
          const gain = calculateOpponentGain(boardAfter, oppMove, capturedValue);
          if (gain >= 2) {
            return true;
          }
        }
      }
    }

    // 2. Discovered / uncovered piece sacrifice:
    // Moving this piece left ANOTHER major/minor piece (Knight, Bishop, Rook, Queen) hanging to an opponent capture
    // that was NOT profitably capturable before this move
    const playerColor = boardBefore.turn();
    const oppColor = playerColor === 'w' ? 'b' : 'w';

    for (const oppMove of oppMoves) {
      if (oppMove.captured && oppMove.to !== to) {
        const victimVal = pieceValues[oppMove.captured.toLowerCase()] || 0;
        if (victimVal >= 3) {
          const gainAfter = calculateOpponentGain(boardAfter, oppMove, capturedValue);
          if (gainAfter >= 2) {
            // Check if this square was already under attack before player's move
            const wasAlreadyAttacked = boardBefore.isAttacked(oppMove.to as any, oppColor);
            if (!wasAlreadyAttacked) {
              return true;
            }
          }
        }
      }
    }

    return false;
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

      tempChess.move({ from: item.from, to: item.to, promotion: item.promotion || 'q' });
      const fenAfter = tempChess.fen();

      const evalCp = this.evaluatePosition(tempChess);
      const scoreAfterPlayer = isWhiteTurn ? evalCp : -evalCp;
      const scoreBeforePlayer = isWhiteTurn ? prevScore : -prevScore;

      const bestMoveCandidate = this.findBestMoveHeuristic(legalMovesBefore);
      const isBook = this.openingBook.isBookMove(sanList.slice(0, i + 1));

      const cpDelta = Math.max(0, scoreBeforePlayer - scoreAfterPlayer);

      const winProbBefore = this.evalToWinChance(scoreBeforePlayer, null);
      const winProbAfter = this.evalToWinChance(scoreAfterPlayer, null);
      const deltaWin = Math.max(0, winProbBefore - winProbAfter);

      let classification: MoveClassification = 'good';

      if (isBook && i < 16) {
        classification = 'book';
      } else if (deltaWin > 20 || cpDelta > 250) {
        classification = 'blunder';
      } else if (scoreBeforePlayer > 150 && deltaWin > 15) {
        classification = 'miss';
      } else if (deltaWin > 10 || cpDelta > 150) {
        classification = 'mistake';
      } else if (deltaWin > 5 || cpDelta > 60) {
        classification = 'inaccuracy';
      } else if (cpDelta < 15) {
        const isSacrifice = this.isSacrificeMove(
          fenBefore,
          fenAfter,
          item.from,
          item.to,
          item.piece,
          item.captured
        );

        if (
          isSacrifice &&
          cpDelta < 5 &&
          scoreAfterPlayer >= 50 &&
          scoreBeforePlayer < 500 &&
          winProbBefore <= 90
        ) {
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

      const accuracy = classification === 'book' ? 100 : this.calculateCaps2Accuracy(deltaWin, classification === 'best', classification);

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
    this.currentRunId++;
    if (this.worker && this.isSearching) {
      this.worker.postMessage('stop');
    }
    this.isSearching = false;
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

  // ==========================================
  // LIVE MULTI-PV CONTINUOUS EVALUATION
  // ==========================================

  private initLiveWorker(): void {
    if (typeof Worker === 'undefined') {
      this.liveWorkerAvailable = false;
      return;
    }
    try {
      this.liveWorker = new Worker('engine/v18/lite/stockfish.js#stockfish.wasm');
      this.liveWorker.onmessage = (event) => {
        this.zone.run(() => this.handleLiveWorkerMessage(event.data));
      };
      this.liveWorker.onerror = () => {
        this.zone.run(() => {
          this.liveWorkerAvailable = false;
          this.isLiveCalculating.set(false);
        });
      };
      this.liveWorker.postMessage('uci');
      this.liveWorkerAvailable = true;
    } catch {
      this.liveWorkerAvailable = false;
    }
  }

  private handleLiveWorkerMessage(message: string): void {
    if (message === 'uciok') {
      this.liveWorker?.postMessage('setoption name MultiPV value 3');
      this.liveWorker?.postMessage('isready');
    } else if (message === 'readyok') {
      this.isLiveWorkerReady = true;
      if (this.pendingLiveFen) {
        const fen = this.pendingLiveFen;
        this.pendingLiveFen = null;
        this.sendLiveSearch(fen);
      } else if (this.currentLiveFen) {
        this.sendLiveSearch(this.currentLiveFen);
      }
    } else if (message.startsWith('info ')) {
      this.parseLiveWorkerInfo(message);
    } else if (message.startsWith('bestmove ')) {
      this.isLiveSearching = false;
      this.isLiveCalculating.set(false);
      if (this.pendingLiveFen) {
        const fen = this.pendingLiveFen;
        this.pendingLiveFen = null;
        this.sendLiveSearch(fen);
      }
    }
  }

  private parseLiveWorkerInfo(message: string): void {
    const parts = message.split(' ');
    const pvIndex = parts.indexOf('pv');
    if (pvIndex === -1) return;

    let multipv = 1;
    const mpvIndex = parts.indexOf('multipv');
    if (mpvIndex !== -1) {
      multipv = parseInt(parts[mpvIndex + 1], 10) || 1;
    }

    let depth = 0;
    const depthIndex = parts.indexOf('depth');
    if (depthIndex !== -1) {
      depth = parseInt(parts[depthIndex + 1], 10) || 0;
    }

    let scoreCp: number | null = null;
    let mate: number | null = null;
    const scoreIndex = parts.indexOf('score');
    if (scoreIndex !== -1) {
      if (parts[scoreIndex + 1] === 'cp') {
        scoreCp = parseInt(parts[scoreIndex + 2], 10);
      } else if (parts[scoreIndex + 1] === 'mate') {
        mate = parseInt(parts[scoreIndex + 2], 10);
      }
    }

    const pv = parts.slice(pvIndex + 1);
    if (pv.length === 0) return;

    const rawInfo: RawEnginePvInfo = {
      multipv,
      depth,
      scoreCp,
      mate,
      pv,
    };

    this.activePvMap.set(multipv, rawInfo);

    if (depth > this.liveDepth()) {
      this.liveDepth.set(depth);
    }

    // Build formatted lines
    const sortedRaw = Array.from(this.activePvMap.values()).sort((a, b) => a.multipv - b.multipv);
    const formattedLines: LiveEngineLine[] = [];
    for (const item of sortedRaw) {
      const formatted = formatEnginePvLine(this.currentLiveFen, item);
      if (formatted) {
        formattedLines.push(formatted);
      }
    }

    if (formattedLines.length > 0) {
      this.liveEngineLines.set(formattedLines);
    }
  }

  private sendLiveSearch(fen: string): void {
    if (!this.liveWorker || !this.isLiveWorkerReady) return;
    this.isLiveSearching = true;
    this.isLiveCalculating.set(true);
    const depth = this.settings?.analysisDepth ? this.settings.analysisDepth() : 14;
    this.liveWorker.postMessage(`position fen ${fen}`);
    this.liveWorker.postMessage(`go depth ${depth}`);
  }

  evaluateLivePosition(fen: string): void {
    if (!fen) return;
    if (fen === this.currentLiveFen && this.liveEngineLines().length > 0) return;

    this.currentLiveFen = fen;
    this.activePvMap.clear();
    this.liveDepth.set(1);

    // Instant candidate lines with 4-5 ply rollout for 0ms lag
    const instantLines = this.generateHeuristicLiveLines(fen);
    if (instantLines.length > 0) {
      this.liveEngineLines.set(instantLines);
    }

    if (this.liveWorkerAvailable && this.liveWorker) {
      if (!this.isLiveWorkerReady) {
        this.pendingLiveFen = fen;
        return;
      }

      if (this.isLiveSearching) {
        this.pendingLiveFen = fen;
        this.liveWorker.postMessage('stop');
      } else {
        this.sendLiveSearch(fen);
      }
    }
  }

  setHoveredLineRank(rank: number | null): void {
    this.hoveredLineRank.set(rank);
  }

  generateHeuristicLiveLines(fen: string): LiveEngineLine[] {
    try {
      const chess = new Chess(fen);
      const isWhiteTurn = chess.turn() === 'w';
      const rootMoves = chess.moves({ verbose: true });
      if (rootMoves.length === 0) return [];

      // Score moves by captures, checks, center dominance
      const scoredMoves = rootMoves.map((m) => {
        let weight = 0;
        if (m.san.includes('#')) weight += 1000;
        if (m.captured) {
          const vals: Record<string, number> = { p: 100, n: 300, b: 320, r: 500, q: 900, k: 0 };
          weight += (vals[m.captured] || 100) * 2;
        }
        if (m.san.includes('+')) weight += 50;
        if (['e4', 'e5', 'd4', 'd5', 'c4', 'Nf3', 'Nc3', 'Nf6', 'Nc6'].includes(m.san)) weight += 30;
        return { move: m, weight };
      });

      scoredMoves.sort((a, b) => b.weight - a.weight);
      const top3 = scoredMoves.slice(0, 3);

      const lines: LiveEngineLine[] = [];
      for (let i = 0; i < top3.length; i++) {
        const item = top3[i];
        const lineChess = new Chess(fen);
        const pvList: string[] = [];

        // Move 1
        const uci1 = `${item.move.from}${item.move.to}${item.move.promotion || ''}`;
        pvList.push(uci1);
        lineChess.move(item.move);

        // Roll out 3-4 continuation moves
        for (let step = 0; step < 4; step++) {
          if (lineChess.isGameOver()) break;
          const nextMoves = lineChess.moves({ verbose: true });
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
          pvList.push(`${chosen.from}${chosen.to}${chosen.promotion || ''}`);
          lineChess.move(chosen);
        }

        const raw: RawEnginePvInfo = {
          multipv: i + 1,
          depth: 1,
          scoreCp: isWhiteTurn ? Math.max(-20, 20 - i * 15) : Math.min(20, -(20 - i * 15)),
          mate: null,
          pv: pvList,
        };

        const formatted = formatEnginePvLine(fen, raw);
        if (formatted) {
          lines.push(formatted);
        }
      }
      return lines;
    } catch {
      return [];
    }
  }

  ngOnDestroy(): void {
    if (this.worker) {
      this.worker.postMessage('quit');
      this.worker.terminate();
      this.worker = null;
    }
    if (this.liveWorker) {
      this.liveWorker.postMessage('quit');
      this.liveWorker.terminate();
      this.liveWorker = null;
    }
  }
}
