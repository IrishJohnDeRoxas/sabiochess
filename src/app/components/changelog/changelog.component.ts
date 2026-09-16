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
      version: 'v1.4.0',
      date: 'September 2026',
      title: 'Skeleton Loaders, Always-Visible Review Panel & Legal Docs',
      summary:
        'A focused quality-of-life release delivering faster perceived load times, a permanently visible CAPS review panel, accurate legal documentation, and a suite of UI polish fixes.',
      isLatest: true,
      tag: 'Latest Release',
      items: [
        {
          type: 'feature',
          title: 'Skeleton Loading Screens',
          description:
            'Neubrutalist shimmer skeleton placeholders now appear for the board, eval bar, player cards, and sidebar tabs on initial load — eliminating layout shifts and giving instant visual feedback.',
        },
        {
          type: 'feature',
          title: 'Always-Visible Game Review Panel',
          description:
            'The CAPS analysis and move classification panel is now permanently surfaced during analysis mode, keeping blunder counts, accuracy scores, and phase summaries always in view.',
        },
        {
          type: 'improvement',
          title: 'Configurable Engine Depth Presets',
          description:
            'Settings tab now shows named depth presets — Fast (10), Quick (12), Standard (14), Deep (16), Master (18), GM (20), Ultra (22) — with descriptions to help balance speed vs. thoroughness on any device.',
        },
        {
          type: 'fix',
          title: 'Hover Flicker on Sidebar Tabs',
          description:
            'Resolved a CSS transition conflict causing a visible flicker on sidebar tab hover states when switching between shadow animations.',
        },
        {
          type: 'improvement',
          title: 'Accurate Legal Documentation',
          description:
            'Terms of Service and Privacy Policy completely rewritten to reflect the actual app: no accounts, no subscriptions, no server-side storage. All fictional features removed.',
        },
        {
          type: 'improvement',
          title: 'Footer Cleanup',
          description:
            'Removed the placeholder Browser Extension link from the Platform section of the footer until the extension is ready to ship.',
        },
      ],
    },
    {
      version: 'v1.3.0',
      date: 'August 2026',
      title: 'Eval Bar Momentum, Sound Packs & CAPS Review',
      summary:
        'Overhauled evaluation bar with smooth momentum curves, introduced multiple audio sound packs, and delivered the full post-game CAPS accuracy review workflow.',
      isLatest: false,
      items: [
        {
          type: 'engine',
          title: 'Dynamic Eval Bar with Momentum Curve',
          description:
            'Upgraded the evaluation bar with a smooth SVG momentum chart showing winning-chance shifts across all plies, clickable to jump to any move, with blunder/brilliant pin markers.',
        },
        {
          type: 'audio',
          title: 'Multiple Sound Packs',
          description:
            'Added selectable audio packs (Classic Wood, Futuristic, Meme Pack, and more) with per-pack preview, volume slider, and mute toggle. All sounds play locally with no external requests.',
        },
        {
          type: 'feature',
          title: 'CAPS Accuracy Score & Move Report',
          description:
            'Post-analysis report now shows Computer Accuracy Percentage (CAPS) for both players, with per-phase (opening/middlegame/endgame) quality breakdown and coach verdict badges.',
        },
        {
          type: 'improvement',
          title: 'Neubrutalist UI Redesign',
          description:
            'Comprehensive visual refresh across all panels — bold borders, tactile button shadows, high-contrast dark/light palettes, and consistent font hierarchy using display/body/label font roles.',
        },
        {
          type: 'fix',
          title: 'Eval Bar Render Stability',
          description:
            'Fixed edge-case rendering glitches on forced checkmate lines and board orientation flips that caused the eval bar to flash or reset incorrectly.',
        },
      ],
    },
    {
      version: 'v1.2.0',
      date: 'July 2026',
      title: 'Full Game Review, Move Classification & Opening Explorer',
      summary:
        'Introduced full post-game analysis with per-move classification badges, opening book lookup, and the Chess.com / Lichess username-based game importer.',
      items: [
        {
          type: 'feature',
          title: 'Post-Game Move Classification',
          description:
            'Every move in your game is classified as Brilliant (!!) , Great (!), Best (★), Inaccuracy (?!), Mistake (?), Miss (✕), or Blunder (??) with centipawn loss values calculated by Stockfish.',
        },
        {
          type: 'feature',
          title: 'Opening Theory & Book Lookup',
          description:
            'Opening name, ECO code, and master-game statistics are displayed as you play through moves, sourced from a locally bundled opening book.',
        },
        {
          type: 'feature',
          title: 'Chess.com & Lichess Game Importer',
          description:
            'Enter your Chess.com or Lichess username to fetch and browse your most recent games directly — no manual PGN downloads required.',
        },
        {
          type: 'improvement',
          title: 'Analysis Depth Control',
          description:
            'Added a configurable engine depth slider (10–22 plies) so players can tune analysis speed vs. depth based on their device capability.',
        },
        {
          type: 'fix',
          title: 'PGN Header Parsing Robustness',
          description:
            'Improved PGN parser to reliably extract ECO codes, opening names, ratings, and time controls from Chess.com and Lichess PGN formats.',
        },
      ],
    },
    {
      version: 'v1.1.0',
      date: 'June 2026',
      title: 'Board Themes, Dark Mode & Settings Persistence',
      summary:
        'Added a full settings system with board theme selection, dark/light mode toggle, auto-evaluation, sound controls, and LocalStorage persistence across sessions.',
      items: [
        {
          type: 'feature',
          title: 'Board Theme Selector',
          description:
            'Choose from multiple board themes (Classic, Walnut, Ice, Night, etc.) with live preview. Selection persists across browser sessions via localStorage.',
        },
        {
          type: 'feature',
          title: 'Dark & Light Mode',
          description:
            'Full dark/light theme toggle applied globally via a CSS class on the HTML root element, with smooth 150ms transitions across all components.',
        },
        {
          type: 'feature',
          title: 'Settings Persistence',
          description:
            'All preferences — theme, board, sound, depth, usernames, auto-evaluation — are saved to localStorage under a versioned key and restored on next visit.',
        },
        {
          type: 'improvement',
          title: 'Auto-Evaluation Toggle',
          description:
            'Added an option to enable or disable automatic engine evaluation after each move, useful when analysing on lower-powered devices.',
        },
        {
          type: 'fix',
          title: 'Auto-Queen Promotion',
          description:
            'Added auto-queen pawn promotion option to avoid the promotion picker dialog interrupting fast move navigation.',
        },
      ],
    },
    {
      version: 'v1.0.0',
      date: 'May 2026',
      title: 'SabioChess Official Launch',
      summary:
        'The debut of SabioChess: a free, account-free, privacy-first neubrutalist chess analysis workbench powered entirely by Stockfish 18 in your browser.',
      items: [
        {
          type: 'feature',
          title: 'Interactive Chessboard',
          description:
            'Full drag-and-drop interactive chessboard with keyboard navigation, FEN/PGN import, move history tree, and legal move highlighting.',
        },
        {
          type: 'engine',
          title: 'Stockfish 18 WebAssembly Engine',
          description:
            '100% client-side chess analysis powered by Stockfish 18 compiled to WASM, running in a dedicated Web Worker with zero server roundtrips. Your games never leave your browser.',
        },
        {
          type: 'feature',
          title: 'Player Cards & Match Metadata',
          description:
            'Display player names, ratings, platform, result, and time control in styled player cards above and below the board.',
        },
        {
          type: 'feature',
          title: 'Evaluation Bar',
          description:
            'Live evaluation bar showing centipawn advantage and forced mate detection, with smooth animation between positions.',
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
