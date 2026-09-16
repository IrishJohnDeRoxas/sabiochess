import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { TermsComponent } from './terms.component';

describe('TermsComponent', () => {
  let component: TermsComponent;
  let fixture: ComponentFixture<TermsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TermsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create terms component', () => {
    expect(component).toBeTruthy();
  });

  it('should render terms headings and version', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.legal-title')?.textContent).toContain('Terms of Service');
    expect(compiled.querySelector('.meta-row')?.textContent).toContain('Version 1.3.0');
    expect(compiled.querySelector('#acceptance')).toBeTruthy();
    expect(compiled.querySelector('#fair-play')).toBeTruthy();
    expect(compiled.querySelector('#permitted-use')).toBeTruthy();
    expect(compiled.querySelector('#ip-licenses')).toBeTruthy();
    expect(compiled.querySelector('#liability')).toBeTruthy();
  });

  it('should change active section when scrollToSection is called', () => {
    component.scrollToSection('fair-play');
    expect(component.activeSection()).toBe('fair-play');
  });
});
