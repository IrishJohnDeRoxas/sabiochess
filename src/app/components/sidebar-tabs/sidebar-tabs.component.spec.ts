import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarTabsComponent } from './sidebar-tabs.component';
import { GameAnalysisService } from '../../services/game-analysis.service';
import { SettingsService } from '../../services/settings.service';
import { SoundService } from '../../services/sound.service';
import { ChessGameService } from '../../services/chess-game.service';

describe('SidebarTabsComponent', () => {
  let component: SidebarTabsComponent;
  let fixture: ComponentFixture<SidebarTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarTabsComponent],
      providers: [ChessGameService, GameAnalysisService, SettingsService, SoundService],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and default to review tab', () => {
    expect(component).toBeTruthy();
    expect(component.activeTab()).toBe('review');
  });

  it('should switch tabs', () => {
    component.setTab('analysis');
    expect(component.activeTab()).toBe('analysis');

    component.setTab('settings');
    expect(component.activeTab()).toBe('settings');
  });
});
