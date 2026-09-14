import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewTabComponent } from './review-tab/review-tab.component';
import { AnalysisTabComponent } from './analysis-tab/analysis-tab.component';
import { SettingsTabComponent } from './settings-tab/settings-tab.component';
import { GameAnalysisService } from '../../services/game-analysis.service';
import { IconComponent } from '../icon/icon.component';

export type ActiveSidebarTab = 'review' | 'analysis' | 'settings';

@Component({
  selector: 'app-sidebar-tabs',
  standalone: true,
  imports: [
    CommonModule,
    ReviewTabComponent,
    AnalysisTabComponent,
    SettingsTabComponent,
    IconComponent,
  ],
  templateUrl: './sidebar-tabs.component.html',
  styleUrls: ['./sidebar-tabs.component.css'],
})
export class SidebarTabsComponent {
  readonly analysisService = inject(GameAnalysisService);
  readonly activeTab = signal<ActiveSidebarTab>('review');

  setTab(tab: ActiveSidebarTab): void {
    this.activeTab.set(tab);
  }
}
