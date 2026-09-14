import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessGameService } from '../../../services/chess-game.service';
import { GameAnalysisService } from '../../../services/game-analysis.service';
import { SettingsService } from '../../../services/settings.service';
import { MoveClassification } from '../../../models/analysis.model';
import { IconComponent } from '../../icon/icon.component';

interface ClassificationRow {
  key: MoveClassification;
  label: string;
  symbol: string;
  badgeClass: string;
  whiteCount: number;
  blackCount: number;
}

@Component({
  selector: 'app-analysis-tab',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './analysis-tab.component.html',
  styleUrls: ['./analysis-tab.component.css'],
})
export class AnalysisTabComponent {
  readonly game = inject(ChessGameService);
  readonly analysisService = inject(GameAnalysisService);
  readonly settings = inject(SettingsService);

  readonly classificationsList: { key: MoveClassification; label: string; symbol: string; badgeClass: string }[] = [
    { key: 'brilliant', label: 'Brilliant', symbol: '!!', badgeClass: 'bg-[#8B5CF6] text-white' },
    { key: 'great', label: 'Great Move', symbol: '!', badgeClass: 'bg-[#06B6D4] text-white' },
    { key: 'best', label: 'Best Move', symbol: '★', badgeClass: 'bg-[#10B981] text-white' },
    { key: 'excellent', label: 'Excellent', symbol: '✓', badgeClass: 'bg-[#84CC16] text-[#222222]' },
    { key: 'good', label: 'Good', symbol: '✓', badgeClass: 'bg-[#3B82F6] text-white' },
    { key: 'book', label: 'Book Move', symbol: '📖', badgeClass: 'bg-[#A16207] text-white' },
    { key: 'inaccuracy', label: 'Inaccuracy', symbol: '?!', badgeClass: 'bg-[#F59E0B] text-[#222222]' },
    { key: 'mistake', label: 'Mistake', symbol: '?', badgeClass: 'bg-[#F97316] text-white' },
    { key: 'miss', label: 'Missed Win', symbol: '✕', badgeClass: 'bg-[#EA580C] text-white' },
    { key: 'blunder', label: 'Blunder', symbol: '??', badgeClass: 'bg-[#EF4444] text-white' },
  ];

  readonly classificationRows = computed<ClassificationRow[]>(() => {
    const summary = this.analysisService.summary();
    return this.classificationsList.map((c) => ({
      ...c,
      whiteCount: summary?.whiteCounts[c.key] || 0,
      blackCount: summary?.blackCounts[c.key] || 0,
    }));
  });

  triggerFullAnalysis(): void {
    this.analysisService.runAnalysis(this.game.history());
  }

  jumpToPly(plyIndex: number): void {
    this.game.jumpToMove(plyIndex);
  }

  getBarHeightPercentage(evalScore: number): number {
    // evalScore is clamped -10 to +10. Map to 5% - 95% height
    const normalized = (evalScore + 10) / 20;
    return Math.max(8, Math.min(92, Math.round(normalized * 100)));
  }
}
