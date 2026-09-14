import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessGameService, BoardSquareData } from '../../services/chess-game.service';
import { Square } from 'chess.js';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chess-board.component.html',
  styleUrls: ['./chess-board.component.css'],
})
export class ChessBoardComponent {
  readonly game = inject(ChessGameService);

  onSquareClick(squareData: BoardSquareData): void {
    this.game.handleSquareClick(squareData.square);
  }

  getPieceSvgUrl(piece: { type: string; color: 'w' | 'b' } | null): string {
    if (!piece) return '';
    return `pieces/${piece.color}${piece.type.toUpperCase()}.svg`;
  }
}
