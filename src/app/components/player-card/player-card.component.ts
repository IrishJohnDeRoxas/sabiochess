import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerCardComponent {
  readonly player = input<PlayerInfo>({ name: 'Player', rating: 1500 });
  readonly color = input<'w' | 'b'>('w');
  readonly isTurn = input<boolean>(false);
  readonly clock = input<string | null>(null);
  readonly outcome = input<PlayerOutcomeStatus | null>(null);

  readonly formattedRating = computed<string>(() => {
    const rating = this.player().rating;
    if (rating === undefined || rating === null || rating === '') {
      return '?';
    }
    return `${rating}`;
  });

  readonly isLowTime = computed<boolean>(() => {
    const clockVal = this.clock();
    if (!clockVal) return false;
    return clockVal.startsWith('00:0') || clockVal.startsWith('00:1') || clockVal.startsWith('00:2');
  });
}

