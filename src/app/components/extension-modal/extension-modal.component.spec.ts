import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExtensionModalComponent } from './extension-modal.component';
import { SettingsService } from '../../services/settings.service';

describe('ExtensionModalComponent', () => {
  let component: ExtensionModalComponent;
  let fixture: ComponentFixture<ExtensionModalComponent>;
  let settings: SettingsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExtensionModalComponent],
      providers: [SettingsService],
    }).compileComponents();

    fixture = TestBed.createComponent(ExtensionModalComponent);
    component = fixture.componentInstance;
    settings = TestBed.inject(SettingsService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open and close via settings', () => {
    expect(settings.isExtensionModalOpen()).toBe(false);
    settings.openExtensionModal();
    fixture.detectChanges();
    expect(settings.isExtensionModalOpen()).toBe(true);

    component.close();
    fixture.detectChanges();
    expect(settings.isExtensionModalOpen()).toBe(false);
  });
});
