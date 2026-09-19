import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  readonly size = input<LogoSize>('md');
  readonly showText = input<boolean>(true);
  readonly showSubtitle = input<boolean>(false);
  readonly interactive = input<boolean>(true);

  readonly boxSizeClass = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'w-8 h-8 border-[2.5px] border-[#222222] dark:border-black shadow-[2.5px_2.5px_0_0_#222222] dark:shadow-[2.5px_2.5px_0_0_#000000] text-sm';
      case 'lg':
        return 'w-14 h-14 border-[4px] border-[#222222] dark:border-black shadow-[4px_4px_0_0_#222222] dark:shadow-[4px_4px_0_0_#000000] text-2xl';
      case 'xl':
        return 'w-18 h-18 border-[5px] border-[#222222] dark:border-black shadow-[6px_6px_0_0_#222222] dark:shadow-[6px_6px_0_0_#000000] text-3xl';
      case 'md':
      default:
        return 'w-10 h-10 border-[3px] border-[#222222] dark:border-black shadow-[3px_3px_0_0_#222222] dark:shadow-[3px_3px_0_0_#000000] text-xl';
    }
  });

  readonly textClass = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'text-xl tracking-tight';
      case 'lg':
        return 'text-3xl sm:text-4xl tracking-tight';
      case 'xl':
        return 'text-4xl sm:text-5xl tracking-tight';
      case 'md':
      default:
        return 'text-2xl sm:text-3xl tracking-tight';
    }
  });

  readonly pawnSvgSize = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 20;
      case 'lg':
        return 34;
      case 'xl':
        return 44;
      case 'md':
      default:
        return 24;
    }
  });
}
