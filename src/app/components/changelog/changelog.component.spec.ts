import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { ChangelogComponent } from './changelog.component';

describe('ChangelogComponent', () => {
  let component: ChangelogComponent;
  let fixture: ComponentFixture<ChangelogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangelogComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangelogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create changelog component', () => {
    expect(component).toBeTruthy();
  });

  it('should render hero title and releases', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.changelog-title')?.textContent).toContain('SabioChess Changelog');

    const releaseCards = compiled.querySelectorAll('.release-card');
    expect(releaseCards.length).toBeGreaterThanOrEqual(1);
    expect(compiled.querySelector('.version-tag')?.textContent).toContain('v1.4.0');
  });

  it('should filter release items by category', () => {
    component.setFilter('feature');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const badges = Array.from(compiled.querySelectorAll('.item-type-badge')) as HTMLElement[];
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((b) => expect(b.textContent?.trim()).toBe('FEATURE'));
  });

  it('should filter release items by engine and audio', () => {
    component.setFilter('engine');
    fixture.detectChanges();
    let badges = Array.from(fixture.nativeElement.querySelectorAll('.item-type-badge')) as HTMLElement[];
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((b) => expect(b.textContent?.trim()).toBe('ENGINE'));

    component.setFilter('audio');
    fixture.detectChanges();
    badges = Array.from(fixture.nativeElement.querySelectorAll('.item-type-badge')) as HTMLElement[];
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((b) => expect(b.textContent?.trim()).toBe('AUDIO'));
  });

  it('should reset filter to all correctly', () => {
    component.setFilter('fix');
    fixture.detectChanges();
    expect(component.selectedFilter()).toBe('fix');

    component.setFilter('all');
    fixture.detectChanges();
    expect(component.selectedFilter()).toBe('all');
    expect(component.filteredReleases().length).toBe(component.releases().length);
  });
});
