import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../logo/logo.component';
import { IconComponent } from '../icon/icon.component';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, LogoComponent, IconComponent],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  readonly settings = inject(SettingsService);
  readonly currentYear = new Date().getFullYear();

  scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  openSupport(): void {
    this.settings.openSupportModal();
  }
}
