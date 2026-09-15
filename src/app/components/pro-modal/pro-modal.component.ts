import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../icon/icon.component';
import { VALID_PROMO_CODES } from '../../models/auth.model';

@Component({
  selector: 'app-pro-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './pro-modal.component.html',
  styleUrls: ['./pro-modal.component.css'],
})
export class ProModalComponent {
  readonly auth = inject(AuthService);

  readonly promoCodeInput = signal<string>('');
  readonly promoMessage = signal<string | null>(null);
  readonly promoError = signal<boolean>(false);
  readonly isRedeeming = signal<boolean>(false);

  readonly sampleCodes = VALID_PROMO_CODES.slice(0, 3);

  close(): void {
    this.auth.closeProModal();
    this.promoMessage.set(null);
  }

  applySampleCode(code: string): void {
    this.promoCodeInput.set(code);
    this.promoMessage.set(null);
  }

  async redeemCode(): Promise<void> {
    const code = this.promoCodeInput().trim();
    if (!code) {
      this.promoError.set(true);
      this.promoMessage.set('Please enter a promo code.');
      return;
    }

    this.isRedeeming.set(true);
    this.promoMessage.set(null);

    try {
      const result = await this.auth.redeemPromoCode(code);
      this.promoError.set(!result.success);
      this.promoMessage.set(result.message);
      if (result.success) {
        this.promoCodeInput.set('');
        setTimeout(() => {
          this.close();
        }, 1200);
      }
    } finally {
      this.isRedeeming.set(false);
    }
  }

  quickUnlockPro(): void {
    this.auth.signInMock('pro', 'Grandmaster VIP', 'founder@sabiochess.com');
    this.close();
  }
}
