import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { PrivacyComponent } from './privacy.component';

describe('PrivacyComponent', () => {
  let component: PrivacyComponent;
  let fixture: ComponentFixture<PrivacyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create privacy component', () => {
    expect(component).toBeTruthy();
  });

  it('should render privacy headings and sections', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.legal-title')?.textContent).toContain('Privacy Policy');
    expect(compiled.querySelector('#collection')).toBeTruthy();
    expect(compiled.querySelector('#usage')).toBeTruthy();
    expect(compiled.querySelector('#storage')).toBeTruthy();
    expect(compiled.querySelector('#third-parties')).toBeTruthy();
    expect(compiled.querySelector('#rights')).toBeTruthy();
  });

  it('should change active section on scrollToSection', () => {
    component.scrollToSection('rights');
    expect(component.activeSection()).toBe('rights');
  });
});
