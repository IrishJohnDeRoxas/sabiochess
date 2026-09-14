import { Injectable, computed, signal } from '@angular/core';
import { Chess, Square, Move } from 'chess.js';

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
}

export interface MoveRecord {
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
export class ChessGameService {
  private chess = new Chess();

  // Signals for reactive state
  readonly fen = signal<string>(this.chess.fen());
  readonly turn = signal<'w' | 'b'>('w');
  readonly isBoardFlipped = signal<boolean>(false);
  readonly selectedSquare = signal<Square | null>(null);
  readonly legalMoveSquares = signal<Square[]>([]);
  readonly history = signal<MoveRecord[]>([]);
  readonly lastMove = signal<{ from: string; to: string } | null>(null);
  readonly isGameOver = signal<boolean>(false);
  readonly gameOverReason = signal<string | null>(null);
  readonly isCheck = signal<boolean>(false);
  readonly evalScore = signal<number>(0.2); // White advantage in pawns

  // Computed 64-square board array (ordered 8->1 rank, a->h file or flipped)
  readonly boardSquares = computed<BoardSquareData[]>(() => {
    // Read dependencies
    this.fen();
    const selected = this.selectedSquare();
    const legalMoves = this.legalMoveSquares();
    const last = this.lastMove();
    const flipped = this.isBoardFlipped();

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
        const pieceData = this.chess.get(squareName);

        const isSelected = selected === squareName;
        const isLegal = legalMoves.includes(squareName);
        const isLegalCapture = isLegal && !!pieceData && pieceData.color !== this.turn();
        const isPreviousMove = last ? last.from === squareName || last.to === squareName : false;

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
        });
      }
    }

    return squares;
  });

  // Calculate formatted score string for Eval Bar (e.g. "+1.2", "-0.8", "0.0")
  readonly evalFormatted = computed<string>(() => {
    const score = this.evalScore();
    if (this.isGameOver()) {
      if (this.chess.isCheckmate()) {
        return this.turn() === 'w' ? '#B' : '#W';
      }
      return '½-½';
    }
    const sign = score > 0 ? '+' : '';
    return `${sign}${score.toFixed(1)}`;
  });

  // Calculate white advantage percentage for bar (0% to 100%, 50% = equal)
  readonly whiteAdvantagePercentage = computed<number>(() => {
    const score = this.evalScore();
    // Sigmoid mapping from score to 0..100%
    const winProb = 1 / (1 + Math.pow(10, -score / 4));
    return Math.max(5, Math.min(95, Math.round(winProb * 100)));
  });

  constructor() {
    this.updateState();
  }

  handleSquareClick(square: Square): void {
    if (this.isGameOver()) return;

    const currentSelected = this.selectedSquare();
    const pieceOnSquare = this.chess.get(square);

    // If clicking on same square, deselect
    if (currentSelected === square) {
      this.clearSelection();
      return;
    }

    // If a square is already selected and target is a legal destination
    if (currentSelected && this.legalMoveSquares().includes(square)) {
      this.makeMove(currentSelected, square);
      return;
    }

    // If clicking on player's piece, select it and compute legal moves
    if (pieceOnSquare && pieceOnSquare.color === this.turn()) {
      this.selectedSquare.set(square);
      const moves = this.chess.moves({ square, verbose: true }) as Move[];
      this.legalMoveSquares.set(moves.map((m) => m.to as Square));
    } else {
      this.clearSelection();
    }
  }

  makeMove(from: Square, to: Square, promotion: string = 'q'): boolean {
    try {
      const move = this.chess.move({
        from,
        to,
        promotion,
      });

      if (!move) {
        this.clearSelection();
        return false;
      }

      // Record move
      this.lastMove.set({ from, to });
      const record: MoveRecord = {
        from,
        to,
        piece: move.piece,
        san: move.san,
        fen: this.chess.fen(),
        turn: move.color,
      };

      this.history.update((prev) => [...prev, record]);
      this.clearSelection();
      this.updateState();
      this.updateEvalHeuristic();
      return true;
    } catch {
      this.clearSelection();
      return false;
    }
  }

  undoMove(): void {
    const undone = this.chess.undo();
    if (undone) {
      this.history.update((prev) => prev.slice(0, -1));
      const hist = this.history();
      if (hist.length > 0) {
        const prev = hist[hist.length - 1];
        this.lastMove.set({ from: prev.from, to: prev.to });
      } else {
        this.lastMove.set(null);
      }
      this.clearSelection();
      this.updateState();
      this.updateEvalHeuristic();
    }
  }

  resetGame(): void {
    this.chess.reset();
    this.history.set([]);
    this.lastMove.set(null);
    this.clearSelection();
    this.updateState();
    this.evalScore.set(0.2);
  }

  flipBoard(): void {
    this.isBoardFlipped.update((f) => !f);
  }

  private clearSelection(): void {
    this.selectedSquare.set(null);
    this.legalMoveSquares.set([]);
  }

  private updateState(): void {
    this.fen.set(this.chess.fen());
    this.turn.set(this.chess.turn());
    this.isCheck.set(this.chess.inCheck());

    if (this.chess.isGameOver()) {
      this.isGameOver.set(true);
      if (this.chess.isCheckmate()) {
        const winner = this.turn() === 'w' ? 'Black' : 'White';
        this.gameOverReason.set(`Checkmate! ${winner} wins.`);
      } else if (this.chess.isDraw()) {
        if (this.chess.isStalemate()) {
          this.gameOverReason.set('Draw by Stalemate.');
        } else if (this.chess.isThreefoldRepetition()) {
          this.gameOverReason.set('Draw by Threefold Repetition.');
        } else if (this.chess.isInsufficientMaterial()) {
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
    // Fast positional + material heuristic to give responsive, dynamic eval bar feedback
    const pieceValues: Record<string, number> = {
      p: 1,
      n: 3.2,
      b: 3.3,
      r: 5,
      q: 9,
      k: 0,
    };

    let score = 0;
    const board = this.chess.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          const val = pieceValues[p.type] || 0;
          // Center bonus
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

    if (this.chess.isCheckmate()) {
      score = this.turn() === 'w' ? -20 : 20;
    }

    // Add slight initiative factor
    if (this.turn() === 'w') score += 0.15;
    else score -= 0.15;

    this.evalScore.set(Math.round(score * 10) / 10);
  }
}
