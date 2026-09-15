import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FooterComponent } from './footer.component';
import { describe, it, expect, beforeEach } from 'vitest';

describe('FooterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the footer component', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should display the current year and brand', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('SABIOCHESS');
    expect(compiled.textContent).toContain(new Date().getFullYear().toString());
  });

  it('should render Terms of Service, Privacy Policy, and Changelog links in footer', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('a'));
    const termsLink = links.find((l) => l.textContent?.trim().includes('TERMS') || l.textContent?.trim().includes('Terms of Service'));
    const privacyLink = links.find((l) => l.textContent?.trim().includes('PRIVACY') || l.textContent?.trim().includes('Privacy Policy'));
    const changelogLink = links.find((l) => l.textContent?.trim().includes('CHANGELOG') || l.textContent?.trim().includes('Changelog'));
    expect(termsLink).toBeTruthy();
    expect(privacyLink).toBeTruthy();
    expect(changelogLink).toBeTruthy();
  });

  it('should invoke scrollToTop without error', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    const component = fixture.componentInstance;
    expect(() => component.scrollToTop()).not.toThrow();
  });
});
