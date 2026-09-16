import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessBoardComponent } from '../chess-board/chess-board.component';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { EvalBarComponent } from '../eval-bar/eval-bar.component';
import { SidebarTabsComponent } from '../sidebar-tabs/sidebar-tabs.component';
import { SettingsService } from '../../services/settings.service';
import { ChessGameService } from '../../services/chess-game.service';

import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-analyzer',
  standalone: true,
  imports: [
    CommonModule,
    ChessBoardComponent,
    PlayerCardComponent,
    EvalBarComponent,
    SidebarTabsComponent,
    IconComponent,
  ],
  templateUrl: './analyzer.component.html',
  styleUrls: ['./analyzer.component.css'],
})
export class AnalyzerComponent {
  readonly settings = inject(SettingsService);
  readonly game = inject(ChessGameService);
}
