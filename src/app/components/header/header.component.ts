import { ChangeDetectionStrategy, Component, inject, signal, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LogoComponent } from '../logo/logo.component';
import { IconComponent } from '../icon/icon.component';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoComponent, IconComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly settings = inject(SettingsService);
  readonly isMobileMenuOpen = signal<boolean>(false);

  @ViewChild('mobileMenuContainer') mobileMenuContainer?: ElementRef<HTMLElement>;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isMobileMenuOpen()) return;
    const clickedInside = this.mobileMenuContainer?.nativeElement?.contains(event.target as Node);
    if (!clickedInside) {
      this.isMobileMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isMobileMenuOpen()) {
      this.isMobileMenuOpen.set(false);
    }
  }

  toggleMobileMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  openSupportModal(): void {
    this.closeMobileMenu();
    this.settings.openSupportModal();
  }

  toggleTheme(): void {
    this.settings.toggleAppTheme();
  }
}

