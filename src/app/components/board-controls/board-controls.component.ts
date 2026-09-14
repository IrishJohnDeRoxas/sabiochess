import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessGameService } from '../../services/chess-game.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-board-controls',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './board-controls.component.html',
  styleUrls: ['./board-controls.component.css'],
})
export class BoardControlsComponent {
  readonly game = inject(ChessGameService);
  readonly copiedFen = signal<boolean>(false);

  copyFen(): void {
    navigator.clipboard.writeText(this.game.fen()).then(() => {
      this.copiedFen.set(true);
      setTimeout(() => this.copiedFen.set(false), 2000);
    });
  }

  // Group moves into pairs (1. e4 e5, 2. Nf3 Nc6)
  getMovePairs() {
    const hist = this.game.history();
    const pairs: Array<{ num: number; white: string; black?: string }> = [];

    for (let i = 0; i < hist.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: hist[i].san,
        black: hist[i + 1] ? hist[i + 1].san : undefined,
      });
    }

    return pairs;
  }
}
