import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerInfo, CapturedPiece } from '../../services/chess-game.service';

@Component({
  selector: 'app-player-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-card.component.html',
  styleUrls: ['./player-card.component.css'],
})
export class PlayerCardComponent {
  @Input() player: PlayerInfo = { name: 'Player', rating: 1500 };
  @Input() color: 'w' | 'b' = 'w';
  @Input() isTurn: boolean = false;
  @Input() capturedPieces: CapturedPiece[] = [];
  @Input() materialAdvantage: number = 0;
  @Input() timeControl?: string;

  get formattedRating(): string {
    if (this.player.rating === undefined || this.player.rating === null || this.player.rating === '') {
      return '?';
    }
    return `${this.player.rating}`;
  }

  get playerInitials(): string {
    if (!this.player.name) return 'P';
    return this.player.name.substring(0, 2).toUpperCase();
  }
}
