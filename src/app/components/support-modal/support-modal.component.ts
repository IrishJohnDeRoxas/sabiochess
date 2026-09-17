import { Component, inject, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-support-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './support-modal.component.html',
  styleUrls: ['./support-modal.component.css'],
})
export class SupportModalComponent {
  readonly settings = inject(SettingsService);
  readonly copiedUrl = signal<boolean>(false);

  readonly buyMeCoffeeUrl = 'https://buymeacoffee.com/sabiochess';
  readonly coffeeAmounts = [
    { amount: 5, label: 'Starter Tip', icon: '⭐', desc: 'Keeps domain & hosting alive' },
    { amount: 10, label: 'Booster Tip', icon: '⚡', desc: 'Powers Stockfish WASM updates' },
    { amount: 25, label: 'Grandmaster Tip', icon: '👑', desc: 'Huge supporter of open chess tools' },
  ];

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.settings.isSupportModalOpen()) {
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.settings.closeSupportModal();
  }

  openCoffee(): void {
    window.open(this.buyMeCoffeeUrl, '_blank', 'noopener,noreferrer');
  }

  copyDonationLink(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.buyMeCoffeeUrl).then(() => {
        this.copiedUrl.set(true);
        this.settings.flashToast('Buy Me a Coffee link copied!');
        setTimeout(() => this.copiedUrl.set(false), 2500);
      });
    }
  }
}
