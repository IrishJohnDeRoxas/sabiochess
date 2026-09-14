import { TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { describe, it, expect, beforeEach } from 'vitest';

describe('FooterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
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
});
