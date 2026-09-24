import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameHistoryService } from '../../services/game-history.service';
import { SavedGameReview } from '../../models/history.model';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-recent-reviews-drawer',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './recent-reviews-drawer.component.html',
  styleUrls: ['./recent-reviews-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentReviewsDrawerComponent {
  readonly historyService = inject(GameHistoryService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.historyService.isDrawerOpen()) {
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.historyService.closeDrawer();
  }

  loadGame(item: SavedGameReview): void {
    this.historyService.loadIntoReview(item);
  }

  deleteGame(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.historyService.deleteReview(id);
  }

  clearAll(event: MouseEvent): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to clear all recent saved reviews?')) {
      this.historyService.clearAll();
    }
  }
}
