import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { ChessBoardComponent } from './components/chess-board/chess-board.component';
import { EvalBarComponent } from './components/eval-bar/eval-bar.component';
import { BoardControlsComponent } from './components/board-controls/board-controls.component';
import { IconComponent } from './components/icon/icon.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    ChessBoardComponent,
    EvalBarComponent,
    BoardControlsComponent,
    IconComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {}
export { App as AppComponent };
