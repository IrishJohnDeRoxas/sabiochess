import { Component, ElementRef, HostListener, inject, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogoComponent } from '../logo/logo.component';
import { IconComponent } from '../icon/icon.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LogoComponent, IconComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  readonly auth = inject(AuthService);
  private readonly elementRef = inject(ElementRef);
  readonly isDev = isDevMode();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.auth.isUserMenuOpen()) return;
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.auth.closeUserMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.auth.isUserMenuOpen()) {
      this.auth.closeUserMenu();
    }
  }

  openAuthModal(): void {
    this.auth.openAuthModal();
  }

  openProModal(): void {
    this.auth.openProModal();
  }

  toggleUserMenu(): void {
    this.auth.toggleUserMenu();
  }

  closeUserMenu(): void {
    this.auth.closeUserMenu();
  }

  logout(): void {
    this.auth.logout();
  }

  signInFree(): void {
    this.auth.signInMock('free', 'Kasparov Trainee', 'trainee@chessclub.com');
    this.auth.closeUserMenu();
  }

  signInPro(): void {
    this.auth.signInMock('pro', 'Grandmaster VIP', 'founder@sabiochess.com');
    this.auth.closeUserMenu();
  }

  switchToGuest(): void {
    this.auth.switchToGuest();
    this.auth.closeUserMenu();
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      if (img.nextElementSibling) {
        (img.nextElementSibling as HTMLElement).style.display = 'flex';
      }
    }
  }
}
