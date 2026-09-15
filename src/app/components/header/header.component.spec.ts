import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [AuthService, SettingsService],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display energy status in guest mode', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('ENERGY:');
    expect(compiled.textContent).toContain('SIGN IN');
  });

  it('should display user name and PRO unlimited energy when user is Lifetime Pro', () => {
    authService.signInMock('pro', 'Grandmaster Tester');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('UNLIMITED');
    expect(compiled.textContent).toContain('Grandmaster Tester');
    expect(compiled.textContent).toContain('👑 PRO');
  });

  it('should toggle user account dropdown menu', () => {
    expect(authService.isUserMenuOpen()).toBe(false);

    component.toggleUserMenu();
    expect(authService.isUserMenuOpen()).toBe(true);

    component.closeUserMenu();
    expect(authService.isUserMenuOpen()).toBe(false);
  });

  it('should open auth modal on guest action', () => {
    component.openAuthModal();
    expect(authService.isAuthModalOpen()).toBe(true);
  });

  it('should open pro modal on pro action', () => {
    component.openProModal();
    expect(authService.isProModalOpen()).toBe(true);
  });

  it('should close user menu when clicked outside or on escape', () => {
    component.toggleUserMenu();
    expect(authService.isUserMenuOpen()).toBe(true);

    const outsideTarget = document.createElement('div');
    const mockEvent = { target: outsideTarget } as unknown as MouseEvent;
    component.onDocumentClick(mockEvent);
    expect(authService.isUserMenuOpen()).toBe(false);

    component.toggleUserMenu();
    expect(authService.isUserMenuOpen()).toBe(true);
    component.onEscape();
    expect(authService.isUserMenuOpen()).toBe(false);
  });
});
