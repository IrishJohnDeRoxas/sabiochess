import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportModalComponent } from './support-modal.component';
import { SettingsService } from '../../services/settings.service';

describe('SupportModalComponent', () => {
  let component: SupportModalComponent;
  let fixture: ComponentFixture<SupportModalComponent>;
  let settingsService: SettingsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupportModalComponent],
      providers: [SettingsService],
    }).compileComponents();

    fixture = TestBed.createComponent(SupportModalComponent);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(SettingsService);
    fixture.detectChanges();
  });

  it('should create SupportModalComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should close support modal when close is called', () => {
    settingsService.openSupportModal();
    expect(settingsService.isSupportModalOpen()).toBe(true);

    component.close();
    expect(settingsService.isSupportModalOpen()).toBe(false);
  });
});
