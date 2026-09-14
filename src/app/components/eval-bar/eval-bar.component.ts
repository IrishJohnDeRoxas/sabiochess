import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessGameService } from '../../services/chess-game.service';

@Component({
  selector: 'app-eval-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './eval-bar.component.html',
  styleUrls: ['./eval-bar.component.css'],
})
export class EvalBarComponent {
  readonly game = inject(ChessGameService);
}
