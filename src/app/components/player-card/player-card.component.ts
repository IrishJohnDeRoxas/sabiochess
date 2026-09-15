import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerInfo } from '../../services/chess-game.service';
import { PlayerOutcomeStatus } from '../../utils/chess-outcome.util';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-player-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './player-card.component.html',
  styleUrls: ['./player-card.component.css'],
})
export class PlayerCardComponent {
  @Input() player: PlayerInfo = { name: 'Player', rating: 1500 };
  @Input() color: 'w' | 'b' = 'w';
  @Input() isTurn: boolean = false;
  @Input() clock: string | null = null;
  @Input() outcome: PlayerOutcomeStatus | null = null;

  get formattedRating(): string {
    if (this.player.rating === undefined || this.player.rating === null || this.player.rating === '') {
      return '?';
    }
    return `${this.player.rating}`;
  }

  get isLowTime(): boolean {
    if (!this.clock) return false;
    return this.clock.startsWith('00:0') || this.clock.startsWith('00:1') || this.clock.startsWith('00:2');
  }
}
