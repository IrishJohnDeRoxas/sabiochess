import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent implements OnInit {
  readonly lastUpdated = signal<string>('September 16, 2026');
  readonly activeSection = signal<string>('collection');

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  scrollToSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    if (typeof document !== 'undefined') {
      const el = document.getElementById(sectionId);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}
