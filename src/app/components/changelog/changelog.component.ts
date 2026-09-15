import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent, IconName } from '../icon/icon.component';

export interface ChangelogItem {
  type: 'feature' | 'engine' | 'audio' | 'improvement' | 'fix';
  title: string;
  description: string;
  badgeText?: string;
}

export interface ReleaseVersion {
  version: string;
  date: string;
  title: string;
  summary: string;
  isLatest?: boolean;
  tag?: string;
  items: ChangelogItem[];
}

@Component({
  selector: 'app-changelog',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './changelog.component.html',
  styleUrls: ['./changelog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogComponent implements OnInit {
  readonly selectedFilter = signal<string>('all');

  readonly filterCategories = [
    { id: 'all', label: 'All Updates', icon: 'sparkles' as IconName },
    { id: 'feature', label: 'Features', icon: 'bolt' as IconName },
    { id: 'engine', label: 'Engine & Analysis', icon: 'cpu-chip' as IconName },
    { id: 'audio', label: 'Soundscapes', icon: 'speaker-wave' as IconName },
    { id: 'improvement', label: 'Improvements', icon: 'arrow-trending-up' as IconName },
    { id: 'fix', label: 'Bug Fixes', icon: 'shield-check' as IconName },
  ];

  readonly releases = signal<ReleaseVersion[]>([
    {
      version: 'v1.3.0',
      date: 'September 2026',
      title: 'Board Annotations, Custom Sound Packs & Enhanced Evaluation Bar',
      summary:
        'Empowering tactical depth with visual board annotation arrows, tournament audio soundscapes, dynamic evaluation bar momentum, and expanded legal compliance documentation.',
      isLatest: true,
      tag: 'Latest Release',
      items: [
        {
          type: 'feature',
          title: 'Interactive Board Annotations',
          description:
            'Draw tactical arrows and highlight key squares directly on the analysis board with right-click drag, enabling clear strategic planning and variation visualization.',
        },
        {
          type: 'audio',
          title: 'Customizable Audio Suites & Sound Packs',
          description:
            'Introduced customizable audio presets including Classic Wooden, Modern Synth, 8-Bit Arcade, and DMCA-safe tournament soundscapes.',
        },
        {
          type: 'engine',
          title: 'Dynamic Eval Bar Momentum & Winning Percentages',
          description:
            'Upgraded the real-time evaluation bar with smooth winning-chance momentum calculations, responsive clamp thresholds, and instant mate indicator badges.',
        },
        {
          type: 'improvement',
          title: 'Terms of Service & Privacy Compliance Hub',
          description:
            'Added comprehensive legal documentation, fair-play guidelines, and Stockfish GPLv3 open-source licensing references accessible across the platform.',
        },
        {
          type: 'fix',
          title: 'Evaluation Bar Render Stability',
          description:
            'Resolved edge-case calculation glitches during forced checkmate lines and sudden board orientation flips.',
        },
      ],
    },
    {
      version: 'v1.2.0',
      date: 'August 2026',
      title: 'Full Game Review, CAPS Accuracy Scores & Opening Explorer',
      summary:
        'A major update introducing comprehensive post-game analysis, Computer Accuracy Percentage (CAPS), move classification badges, and opening theory lookups.',
      items: [
        {
          type: 'feature',
          title: 'Post-Game Review & Move Classification',
          description:
            'Classify every move in your games with Brilliant, Great, Best, Excellent, Good, Inaccuracy, Mistake, Miss, and Blunder badges alongside centipawn loss calculations.',
        },
        {
          type: 'feature',
          title: 'Opening Theory & Book Lookup',
          description:
            'Explore master games, win/draw/loss distribution rates, and ECO opening codes dynamically as you play moves on the board.',
        },
        {
          type: 'engine',
          title: 'Multi-PV Depth Control & Thread Scaling',
          description:
            'Configurable analysis depth up to 35 plies with multi-line calculation (Multi-PV 1-5) and multi-threaded Stockfish WebAssembly execution.',
        },
        {
          type: 'improvement',
          title: 'Tactile Neubrutalist Dark Theme',
          description:
            'Redesigned high-contrast neubrutalist UI theme with bold borders, tactile buttons, and optimized midnight palette for long analysis sessions.',
        },
        {
          type: 'fix',
          title: 'PGN Parsing for Nested Variations',
          description:
            'Fixed an issue where deeply nested sub-variations in complex PGN files caused parser timeouts.',
        },
      ],
    },
    {
      version: 'v1.1.0',
      date: 'July 2026',
      title: 'Cross-Device Tab Synchronization & Multi-Platform PGN Importer',
      summary:
        'Seamlessly sync your analysis across multiple browser tabs and devices, with instant one-click import from Chess.com and Lichess archives.',
    items: [
        {
          type: 'feature',
          title: 'Multi-Tab State Synchronization',
          description:
            'Leverages native BroadcastChannel and real-time state sharing so changes in one tab instantly propagate to other open SabioChess tabs.',
        },
        {
          type: 'feature',
          title: 'Chess.com & Lichess One-Click Archive Importer',
          description:
            'Import your recent games directly by username without needing manual PGN file downloads.',
        },
        {
          type: 'engine',
          title: 'Stockfish 18 WebAssembly Local Engine',
          description:
            '100% client-side privacy-first engine analysis with zero server roundtrips, running at peak native speed in modern browsers.',
        },
        {
          type: 'fix',
          title: 'En Passant & Castling FEN State Transitions',
          description:
            'Fixed subtle FEN serialization bugs when importing manual position setups with custom castling rights.',
        },
      ],
    },
    {
      version: 'v1.0.0',
      date: 'June 2026',
      title: 'SabioChess Official Launch',
      summary:
        'The debut of SabioChess: the modern, privacy-first, neubrutalist chess analysis workbench for competitive and casual chess players.',
      items: [
        {
          type: 'feature',
          title: 'Interactive Chessboard & Move History Workbench',
          description:
            'Full interactive chessboard with piece drag-and-drop, keyboard navigation, FEN/PGN import/export, and live move history tree.',
        },
        {
          type: 'engine',
          title: 'Local Engine Evaluation',
          description:
            'Real-time position evaluation, best move recommendation arrows, and depth calculation indicator.',
        },
      ],
    },
  ]);

  readonly filteredReleases = computed(() => {
    const filter = this.selectedFilter();
    const allReleases = this.releases();

    if (filter === 'all') {
      return allReleases;
    }

    return allReleases
      .map((rel) => ({
        ...rel,
        items: rel.items.filter((item) => item.type === filter),
      }))
      .filter((rel) => rel.items.length > 0);
  });

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  setFilter(filterId: string): void {
    this.selectedFilter.set(filterId);
  }

  getItemBadgeClass(type: ChangelogItem['type']): string {
    switch (type) {
      case 'feature':
        return 'bg-[#0E4C92] text-white border-[#222222] dark:border-black';
      case 'engine':
        return 'bg-[#FF4F00] text-white border-[#222222] dark:border-black';
      case 'audio':
        return 'bg-[#8B5CF6] text-white border-[#222222] dark:border-black';
      case 'improvement':
        return 'bg-[#10B981] text-white border-[#222222] dark:border-black';
      case 'fix':
        return 'bg-[#EF4444] text-white border-[#222222] dark:border-black';
      default:
        return 'bg-[#C0C0C0] text-[#222222] border-[#222222] dark:border-black';
    }
  }

  getItemBadgeLabel(type: ChangelogItem['type']): string {
    switch (type) {
      case 'feature':
        return 'FEATURE';
      case 'engine':
        return 'ENGINE';
      case 'audio':
        return 'AUDIO';
      case 'improvement':
        return 'IMPROVEMENT';
      case 'fix':
        return 'BUG FIX';
      default:
        return 'UPDATE';
    }
  }
}
