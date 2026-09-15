import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthModalComponent } from './auth-modal.component';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';

describe('AuthModalComponent', () => {
  let component: AuthModalComponent;
  let fixture: ComponentFixture<AuthModalComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AuthModalComponent],
      providers: [AuthService, SettingsService],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthModalComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should switch tabs between signin and compare', () => {
    expect(component.activeTab()).toBe('signin');

    component.setTab('compare');
    expect(component.activeTab()).toBe('compare');

    component.setTab('signin');
    expect(component.activeTab()).toBe('signin');
  });

  it('should allow continuing as guest', () => {
    authService.signInMock('free');
    component.continueGuest();
    expect(authService.isGuest()).toBe(true);
  });

  it('should initiate Google sign in on button click', async () => {
    const spy = vi.spyOn(authService, 'signInWithGoogle').mockResolvedValue({ success: true });
    await component.onGoogleSignIn();
    expect(spy).toHaveBeenCalled();
  });

  it('should close on backdrop click and escape key', () => {
    authService.openAuthModal();
    expect(authService.isAuthModalOpen()).toBe(true);

    const mockEvent = { target: 'backdrop', currentTarget: 'backdrop' } as unknown as MouseEvent;
    component.onBackdropClick(mockEvent);
    expect(authService.isAuthModalOpen()).toBe(false);

    authService.openAuthModal();
    expect(authService.isAuthModalOpen()).toBe(true);
    component.handleEscape();
    expect(authService.isAuthModalOpen()).toBe(false);
  });
});
