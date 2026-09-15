import { Routes } from '@angular/router';
import { AnalyzerComponent } from './components/analyzer/analyzer.component';

export const routes: Routes = [
  {
    path: '',
    component: AnalyzerComponent,
    title: 'SabioChess - Master Chess Analysis & Opening Explorer',
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./components/legal/terms.component').then((m) => m.TermsComponent),
    title: 'Terms of Service - SabioChess',
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./components/legal/privacy.component').then((m) => m.PrivacyComponent),
    title: 'Privacy Policy - SabioChess',
  },
  {
    path: 'changelog',
    loadComponent: () =>
      import('./components/changelog/changelog.component').then((m) => m.ChangelogComponent),
    title: 'Changelog & Release Notes - SabioChess',
  },
  {
    path: 'channellog',
    redirectTo: 'changelog',
    pathMatch: 'full',
  },
  {
    path: 'channel-logs',
    redirectTo: 'changelog',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
