import { Component, inject } from '@angular/core';
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
}
