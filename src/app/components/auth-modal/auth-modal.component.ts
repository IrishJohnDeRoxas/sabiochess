import { Component, HostListener, inject, isDevMode, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../icon/icon.component';
import { VALID_PROMO_CODES } from '../../models/auth.model';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.css'],
})
export class AuthModalComponent {
  readonly auth = inject(AuthService);
  readonly isDev = isDevMode();

  readonly promoCodeInput = signal<string>('');
  readonly promoMessage = signal<string | null>(null);
  readonly promoError = signal<boolean>(false);
  readonly isRedeeming = signal<boolean>(false);
  readonly activeTab = signal<'signin' | 'compare' | 'promo'>('signin');

  readonly presetCodes = VALID_PROMO_CODES.slice(0, 3);

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.auth.isAuthModalOpen()) {
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.auth.closeAuthModal();
    this.promoMessage.set(null);
  }

  setTab(tab: 'signin' | 'compare' | 'promo'): void {
    this.activeTab.set(tab);
    this.promoMessage.set(null);
  }

  async onGoogleSignIn(): Promise<void> {
    await this.auth.signInWithGoogle();
  }

  signInFree(): void {
    this.auth.signInMock('free', 'Kasparov Trainee', 'trainee@chessclub.com');
  }

  signInPro(): void {
    this.auth.signInMock('pro', 'Grandmaster VIP', 'founder@sabiochess.com');
  }

  continueGuest(): void {
    this.auth.switchToGuest();
    this.close();
  }

  applyPresetCode(code: string): void {
    this.promoCodeInput.set(code);
    this.promoMessage.set(null);
  }

  async redeemCode(): Promise<void> {
    const code = this.promoCodeInput().trim();
    if (!code) {
      this.promoError.set(true);
      this.promoMessage.set('Please enter a valid promo code.');
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
}
