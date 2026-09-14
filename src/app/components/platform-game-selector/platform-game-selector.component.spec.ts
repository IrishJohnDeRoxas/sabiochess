import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformGameSelectorComponent } from './platform-game-selector.component';
import { PlatformImporterService } from '../../services/platform-importer.service';
import { ChessGameService } from '../../services/chess-game.service';
import { SettingsService } from '../../services/settings.service';

describe('PlatformGameSelectorComponent', () => {
  let component: PlatformGameSelectorComponent;
  let fixture: ComponentFixture<PlatformGameSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformGameSelectorComponent],
      providers: [
        PlatformImporterService,
        ChessGameService,
        SettingsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformGameSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and default to chess.com', () => {
    expect(component).toBeTruthy();
    expect(component.activePlatform()).toBe('chess.com');
  });

  it('should switch platform', () => {
    component.selectPlatform('lichess');
    expect(component.activePlatform()).toBe('lichess');
  });
});
