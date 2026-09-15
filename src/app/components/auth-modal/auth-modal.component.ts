import { Component, ElementRef, HostListener, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.css'],
})
export class AuthModalComponent {
  readonly auth = inject(AuthService);

  readonly googleBtnContainer = viewChild<ElementRef<HTMLDivElement>>('googleBtnContainer');
  readonly isGoogleRendered = signal<boolean>(false);
  readonly activeTab = signal<'signin' | 'compare'>('signin');

  constructor() {
    effect(() => {
      const open = this.auth.isAuthModalOpen();
      if (open) {
        setTimeout(() => {
          this.initAndRenderGoogleButton();
        }, 0);
      } else {
        this.isGoogleRendered.set(false);
      }
    });

    effect(() => {
      const user = this.auth.currentUser();
      if (user && this.auth.isAuthModalOpen()) {
        this.close();
      }
    });
  }

  async initAndRenderGoogleButton(): Promise<void> {
    const el =
      this.googleBtnContainer()?.nativeElement ??
      (typeof document !== 'undefined'
        ? (document.getElementById('google-signin-btn-container') as HTMLDivElement | null)
        : null);
    if (el) {
      const rendered = await this.auth.renderGoogleButton(el);
      const hasChildren = el.children.length > 0 || !!el.querySelector('iframe');
      this.isGoogleRendered.set(rendered || hasChildren);
    }
  }

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
  }

  setTab(tab: 'signin' | 'compare'): void {
    this.activeTab.set(tab);
  }

  async handleGoogleAuth(): Promise<void> {
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;

    if (isIframe) {
      const authUrl = `${window.location.origin}`;
      const popup = window.open(authUrl, 'SabioChessAuth', 'width=520,height=680,menubar=no,toolbar=no');
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.open(authUrl, '_blank');
      }
      return;
    }

    await this.auth.signInWithGoogle();
    await this.initAndRenderGoogleButton();
  }

  async onGoogleSignIn(): Promise<void> {
    await this.handleGoogleAuth();
  }

  continueGuest(): void {
    this.auth.switchToGuest();
    this.close();
  }

  openProModal(): void {
    this.close();
    this.auth.openProModal();
  }
}
