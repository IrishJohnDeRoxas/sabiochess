import { Component, computed, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessGameService } from '../../../services/chess-game.service';
import { GameAnalysisService } from '../../../services/game-analysis.service';
import { SettingsService } from '../../../services/settings.service';
import { MoveClassification } from '../../../models/analysis.model';
import { IconComponent, IconName } from '../../icon/icon.component';

export interface ReportClassificationRow {
  key: MoveClassification;
  label: string;
  symbol: string;
  icon: IconName;
  badgeClass: string;
  whiteCount: number;
  blackCount: number;
}

export interface MomentumMarkerPin {
  x: number;
  y: number;
  ply: number;
  san: string;
  color: string;
  label: string;
}

export interface MomentumChartData {
  linePath: string;
  whiteAreaPath: string;
  blackAreaPath: string;
  markerPins: MomentumMarkerPin[];
  currentPin: { x: number; y: number } | null;
  mappedPoints: Array<{ ply: number; san: string; evalScore: number; classification: MoveClassification; x: number; y: number; idx: number }>;
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

  readonly startReview = output<void>();

  readonly reportClassificationRows = computed<ReportClassificationRow[]>(() => {
    const sum = this.analysisService.summary();
    const wc = sum?.whiteCounts;
    const bc = sum?.blackCounts;

    return [
      {
        key: 'brilliant',
        label: 'Brilliant Move',
        symbol: '!!',
        icon: 'sparkles',
        badgeClass: 'bg-[#00C0F9] text-black border-[#222222]',
        whiteCount: wc?.brilliant || 0,
        blackCount: bc?.brilliant || 0,
      },
      {
        key: 'great',
        label: 'Great Move',
        symbol: '!',
        icon: 'arrow-trending-up',
        badgeClass: 'bg-[#0E4C92] text-white border-[#222222]',
        whiteCount: (wc?.great || 0) + (wc?.excellent || 0),
        blackCount: (bc?.great || 0) + (bc?.excellent || 0),
      },
      {
        key: 'best',
        label: 'Best Move',
        symbol: '★',
        icon: 'star',
        badgeClass: 'bg-[#10B981] text-white border-[#222222]',
        whiteCount: (wc?.best || 0) + (wc?.book || 0),
        blackCount: (bc?.best || 0) + (bc?.book || 0),
      },
      {
        key: 'inaccuracy',
        label: 'Inaccuracy',
        symbol: '?!',
        icon: 'exclamation-circle',
        badgeClass: 'bg-[#F59E0B] text-black border-[#222222]',
        whiteCount: wc?.inaccuracy || 0,
        blackCount: bc?.inaccuracy || 0,
      },
      {
        key: 'mistake',
        label: 'Mistake',
        symbol: '?',
        icon: 'question-mark-circle',
        badgeClass: 'bg-[#F97316] text-white border-[#222222]',
        whiteCount: wc?.mistake || 0,
        blackCount: bc?.mistake || 0,
      },
      {
        key: 'miss',
        label: 'Miss',
        symbol: '✕',
        icon: 'x-mark',
        badgeClass: 'bg-[#EA580C] text-white border-[#222222]',
        whiteCount: wc?.miss || 0,
        blackCount: bc?.miss || 0,
      },
      {
        key: 'blunder',
        label: 'Blunder',
        symbol: '??',
        icon: 'exclamation-triangle',
        badgeClass: 'bg-[#DC2626] text-white border-[#222222]',
        whiteCount: wc?.blunder || 0,
        blackCount: bc?.blunder || 0,
      },
    ];
  });

  readonly momentumData = computed<MomentumChartData>(() => {
    const points = this.analysisService.evalGraphPoints();
    if (points.length === 0) {
      return {
        linePath: 'M 15 60 L 485 60',
        whiteAreaPath: 'M 15 60 L 485 60 L 485 60 L 15 60 Z',
        blackAreaPath: 'M 15 60 L 485 60 L 485 60 L 15 60 Z',
        markerPins: [],
        currentPin: null,
        mappedPoints: [],
      };
    }

    const svgWidth = 500;
    const svgHeight = 120;
    const paddingX = 15;
    const availableWidth = svgWidth - paddingX * 2;
    const centerY = svgHeight / 2;

    const mappedPoints = points.map((pt, i) => {
      const x = paddingX + (i / Math.max(1, points.length - 1)) * availableWidth;
      const y = centerY - (pt.evalScore / 10) * 46;
      return { ...pt, x, y, idx: i };
    });

    let linePath = `M ${mappedPoints[0].x.toFixed(1)} ${mappedPoints[0].y.toFixed(1)}`;
    for (let i = 0; i < mappedPoints.length - 1; i++) {
      const p0 = mappedPoints[i === 0 ? 0 : i - 1];
      const p1 = mappedPoints[i];
      const p2 = mappedPoints[i + 1];
      const p3 = mappedPoints[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const first = mappedPoints[0];
    const last = mappedPoints[mappedPoints.length - 1];
    const whiteAreaPath = `${linePath} L ${last.x.toFixed(1)} ${centerY} L ${first.x.toFixed(1)} ${centerY} Z`;
    const blackAreaPath = `${linePath} L ${last.x.toFixed(1)} ${centerY} L ${first.x.toFixed(1)} ${centerY} Z`;

    const markerPins: MomentumMarkerPin[] = mappedPoints
      .filter((pt) => ['blunder', 'mistake', 'miss', 'brilliant'].includes(pt.classification))
      .map((pt) => {
        let color = '#EF4444';
        let label = '??';
        if (pt.classification === 'blunder') {
          color = '#DC2626';
          label = '??';
        } else if (pt.classification === 'mistake') {
          color = '#F97316';
          label = '?';
        } else if (pt.classification === 'miss') {
          color = '#EA580C';
          label = '✕';
        } else if (pt.classification === 'brilliant') {
          color = '#00C0F9';
          label = '!!';
        }
        return {
          x: pt.x,
          y: pt.y,
          ply: pt.ply,
          san: pt.san,
          color,
          label,
        };
      });

    const currentPly = this.game.currentPlyIndex();
    let currentPin = null;
    if (currentPly !== null && currentPly >= 0 && currentPly < mappedPoints.length) {
      currentPin = { x: mappedPoints[currentPly].x, y: mappedPoints[currentPly].y };
    }

    return {
      linePath,
      whiteAreaPath,
      blackAreaPath,
      markerPins,
      currentPin,
      mappedPoints,
    };
  });

  triggerFullAnalysis(): void {
    const history = this.game.history();
    if (history.length === 0) return;
    const moveInputs = history.map((h) => ({
      from: h.from,
      to: h.to,
      piece: h.piece,
      captured: h.captured,
      san: h.san,
      fen: h.fen,
      turn: h.turn,
    }));
    const meta = this.game.matchMetadata();
    this.analysisService.runAnalysis(moveInputs, undefined, {
      white: meta.white.rating,
      black: meta.black.rating,
    });
  }

  readonly Math = Math;

  jumpFromMomentum(ply: number): void {
    this.game.jumpToPly(ply - 1);
  }

  seekMomentum(event: MouseEvent): void {
    const data = this.momentumData();
    if (!data.mappedPoints || data.mappedPoints.length === 0) return;

    const target = event.currentTarget as SVGElement;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0) return;

    const clickSvgX = ((event.clientX - rect.left) / rect.width) * 500;

    let closestPoint = data.mappedPoints[0];
    let minDiff = Math.abs(data.mappedPoints[0].x - clickSvgX);

    for (let i = 1; i < data.mappedPoints.length; i++) {
      const diff = Math.abs(data.mappedPoints[i].x - clickSvgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = data.mappedPoints[i];
      }
    }

    if (closestPoint) {
      this.jumpFromMomentum(closestPoint.ply);
    }
  }

  startReviewWalkthrough(): void {
    this.game.goToStart();
    this.startReview.emit();
  }

  getPlayerInitial(name?: string): string {
    if (!name) return '?';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase();
  }

  getCoachVerdictBadgeClass(verdict?: string): string {
    switch (verdict?.toUpperCase()) {
      case 'EXCEPTIONAL':
        return 'bg-[#10B981] text-white border-[#222222] dark:border-black';
      case 'GREAT':
        return 'bg-[#0E4C92] text-white border-[#222222] dark:border-black';
      case 'SOLID':
        return 'bg-[#F59E0B] text-black border-[#222222] dark:border-black';
      case 'MEDIOCRE':
        return 'bg-[#F97316] text-white border-[#222222] dark:border-black';
      case 'BAD':
      default:
        return 'bg-[#DC2626] text-white border-[#222222] dark:border-black';
    }
  }

  getPhaseBadgeInfo(quality?: string): { icon: IconName; symbol: string; badgeClass: string; label: string; isEmpty: boolean } {
    if (!quality || quality === '-' || quality === '—') {
      return {
        icon: 'check',
        symbol: '—',
        badgeClass: 'bg-transparent text-gray-400 border-none',
        label: '—',
        isEmpty: true,
      };
    }
    const q = quality.toLowerCase();
    if (q.includes('brilliant')) {
      return { icon: 'sparkles', symbol: '!!', badgeClass: 'bg-[#00C0F9] text-black border-[#222222]', label: 'Brilliant', isEmpty: false };
    }
    if (q.includes('great')) {
      return { icon: 'arrow-trending-up', symbol: '!', badgeClass: 'bg-[#0E4C92] text-white border-[#222222]', label: 'Great', isEmpty: false };
    }
    if (q.includes('best')) {
      return { icon: 'star', symbol: '★', badgeClass: 'bg-[#10B981] text-white border-[#222222]', label: 'Best', isEmpty: false };
    }
    if (q.includes('inaccuracy')) {
      return { icon: 'exclamation-circle', symbol: '?!', badgeClass: 'bg-[#F59E0B] text-black border-[#222222]', label: 'Inaccuracy', isEmpty: false };
    }
    if (q.includes('mistake')) {
      return { icon: 'question-mark-circle', symbol: '?', badgeClass: 'bg-[#F97316] text-white border-[#222222]', label: 'Mistake', isEmpty: false };
    }
    if (q.includes('miss')) {
      return { icon: 'x-mark', symbol: '✕', badgeClass: 'bg-[#EA580C] text-white border-[#222222]', label: 'Miss', isEmpty: false };
    }
    if (q.includes('blunder')) {
      return { icon: 'exclamation-triangle', symbol: '??', badgeClass: 'bg-[#DC2626] text-white border-[#222222]', label: 'Blunder', isEmpty: false };
    }
    if (q.includes('good') || q.includes('excellent')) {
      return { icon: 'check', symbol: '✓', badgeClass: 'bg-[#10B981] text-white border-[#222222]', label: 'Good', isEmpty: false };
    }
    return { icon: 'star', symbol: '•', badgeClass: 'bg-[#D9D9D9] text-[#222222] border-[#222222]', label: quality, isEmpty: false };
  }
}
