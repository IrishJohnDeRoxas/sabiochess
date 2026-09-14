import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessGameService, BoardSquareData } from '../../services/chess-game.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chess-board.component.html',
  styleUrls: ['./chess-board.component.css'],
})
export class ChessBoardComponent {
  readonly game = inject(ChessGameService);
  readonly settings = inject(SettingsService);

  onSquareClick(squareData: BoardSquareData): void {
    this.game.handleSquareClick(squareData.square);
  }

  getPieceSvgUrl(piece: { type: string; color: 'w' | 'b' } | null): string {
    if (!piece) return '';
    return `pieces/${piece.color}${piece.type.toUpperCase()}.svg`;
  }
}
