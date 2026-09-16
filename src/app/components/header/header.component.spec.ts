import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HeaderComponent } from './header.component';
import { SettingsService } from '../../services/settings.service';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let settingsService: SettingsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [SettingsService, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(SettingsService);
    fixture.detectChanges();
  });

  it('should create HeaderComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should open support modal when buy me a coffee is clicked', () => {
    expect(settingsService.isSupportModalOpen()).toBe(false);
    component.openSupportModal();
    expect(settingsService.isSupportModalOpen()).toBe(true);
  });

  it('should toggle theme when toggleTheme is called', () => {
    const initial = settingsService.appTheme();
    component.toggleTheme();
    expect(settingsService.appTheme()).not.toBe(initial);
  });
});
