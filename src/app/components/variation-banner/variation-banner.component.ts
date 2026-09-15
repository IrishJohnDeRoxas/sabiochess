import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessGameService } from '../../services/chess-game.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-variation-banner',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (game.isVariationActive()) {
      <div class="variation-banner" role="status" aria-live="polite">
        <div class="flex items-center gap-2 min-w-0">
          <span class="pulse-wrapper" aria-hidden="true">
            <span class="pulse-ring"></span>
            <span class="pulse-dot"></span>
          </span>
          <div class="flex flex-col min-w-0">
            <span class="font-accent text-xs sm:text-sm font-bold uppercase tracking-tight text-[#222222] dark:text-[#F3F4F6] truncate">
              VARIATION ACTIVE
            </span>
            <span class="font-label text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">
              Exploring alternative line
            </span>
          </div>
        </div>

        <button
          type="button"
          (click)="game.exitVariation()"
          class="btn-brutal btn-brutal-blue !py-1 !px-2.5 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-[2px_2px_0_0_#222222] dark:shadow-[2px_2px_0_0_#000000]"
          title="Return to main game line"
          aria-label="Return to main game line"
        >
          <app-icon name="arrow-uturn-left" size="w-3.5 h-3.5"></app-icon>
          <span>RETURN</span>
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .variation-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      background: #e0f7fa;
      border: 2px solid #222222;
      box-shadow: 3px 3px 0 0 #222222;
      box-sizing: border-box;
      animation: bannerSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context(.dark) .variation-banner {
      background: #162a36;
      border-color: #00c0f9;
      box-shadow: 3px 3px 0 0 #000000;
    }

    @keyframes bannerSlideIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .pulse-wrapper {
      position: relative;
      width: 12px;
      height: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #00c0f9;
      box-shadow: 0 0 8px #00c0f9;
    }

    .pulse-ring {
      position: absolute;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: #00c0f9;
      opacity: 0.4;
      animation: pulseRing 1.8s cubic-bezier(0.24, 0, 0.38, 1) infinite;
    }

    @keyframes pulseRing {
      0% {
        transform: scale(0.5);
        opacity: 0.8;
      }
      70%,
      100% {
        transform: scale(1.6);
        opacity: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariationBannerComponent {
  readonly game = inject(ChessGameService);
}
