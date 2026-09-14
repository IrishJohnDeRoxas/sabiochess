import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { ChessBoardComponent } from './components/chess-board/chess-board.component';
import { PlayerCardComponent } from './components/player-card/player-card.component';
import { EvalBarComponent } from './components/eval-bar/eval-bar.component';
import { SidebarTabsComponent } from './components/sidebar-tabs/sidebar-tabs.component';
import { IconComponent } from './components/icon/icon.component';
import { SettingsService } from './services/settings.service';
import { ChessGameService } from './services/chess-game.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FooterComponent,
    ChessBoardComponent,
    PlayerCardComponent,
    EvalBarComponent,
    SidebarTabsComponent,
    IconComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  readonly settings = inject(SettingsService);
  readonly game = inject(ChessGameService);
}
export { App as AppComponent };

