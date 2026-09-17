import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsTabComponent } from './settings-tab.component';
import { SettingsService } from '../../../services/settings.service';
import { SoundService } from '../../../services/sound.service';

describe('SettingsTabComponent', () => {
  let component: SettingsTabComponent;
  let fixture: ComponentFixture<SettingsTabComponent>;
  let settingsService: SettingsService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SettingsTabComponent],
      providers: [SettingsService, SoundService],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsTabComponent);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(SettingsService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle app theme and board themes', () => {
    component.selectAppTheme('dark');
    expect(settingsService.appTheme()).toBe('dark');

    component.selectBoardTheme('wood');
    expect(settingsService.boardTheme()).toBe('wood');
  });

  it('should change analysis depth presets', () => {
    component.setDepth(18);
    expect(settingsService.analysisDepth()).toBe(18);
  });

  it('should open support modal when support action is triggered', () => {
    expect(settingsService.isSupportModalOpen()).toBe(false);
    component.openSupportModal();
    expect(settingsService.isSupportModalOpen()).toBe(true);
  });

  it('should select sound pack and update settings', () => {
    component.selectSoundPack('arcade');
    expect(settingsService.memePack()).toBe('arcade');
    expect(settingsService.memeSounds()).toBe(true);
  });

  it('should preview random sound on preview button trigger', () => {
    const soundService = TestBed.inject(SoundService);
    const spy = vi.spyOn(soundService, 'playRandomPackSound');
    const dummyEvent = new MouseEvent('click');
    const stopSpy = vi.spyOn(dummyEvent, 'stopPropagation');

    component.previewSoundPack('cartoon', dummyEvent);
    expect(stopSpy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('cartoon', settingsService.volume());
  });

  it('should render sound packs section with active outline', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('SELECT SOUND PACK:');
    expect(compiled.textContent).toContain('Sound Packs');
  });
});
