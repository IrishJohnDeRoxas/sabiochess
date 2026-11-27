import { ChangeDetectionStrategy, Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-extension-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './extension-modal.component.html',
  styleUrls: ['./extension-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtensionModalComponent {
  readonly settings = inject(SettingsService);

  readonly chromeWebStoreUrl =
    'https://chromewebstore.google.com/detail/sabiochess-chesscom-liche/kpecdkmnbheapnajbpaflejaaiehmdhn';

  readonly videoSrc = '/extension-install.mp4';

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.settings.isExtensionModalOpen()) {
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.settings.closeExtensionModal();
  }

  openWebStore(): void {
    window.open(this.chromeWebStoreUrl, '_blank', 'noopener,noreferrer');
  }
}
