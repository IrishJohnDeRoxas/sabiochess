import { describe, it, expect } from 'vitest';
import { squareToCoords, buildEngineMoveArrow } from './chess-arrow.util';

describe('chess-arrow.util', () => {
  it('correctly maps square coords when not flipped', () => {
    const a1 = squareToCoords('a1', false);
    expect(a1).toEqual({ col: 0, row: 7, x: 50, y: 750 });

    const e4 = squareToCoords('e4', false);
    expect(e4).toEqual({ col: 4, row: 4, x: 450, y: 450 });

    const h8 = squareToCoords('h8', false);
    expect(h8).toEqual({ col: 7, row: 0, x: 750, y: 50 });
  });

  it('correctly maps square coords when flipped', () => {
    const a1 = squareToCoords('a1', true);
    expect(a1).toEqual({ col: 7, row: 0, x: 750, y: 50 });

    const e4 = squareToCoords('e4', true);
    expect(e4).toEqual({ col: 3, row: 3, x: 350, y: 350 });
  });

  it('builds straight polygon arrow for e2-e4', () => {
    const arrow = buildEngineMoveArrow('e2', 'e4', 'e4', '+0.2', 1, false);
    expect(arrow).not.toBeNull();
    expect(arrow?.isKnightMove).toBe(false);
    expect(arrow?.id).toBe(1);
    expect(arrow?.pathD).toContain('M 461.0');
    expect(arrow?.pathD.endsWith('Z')).toBe(true);
  });

  it('builds L-shaped polygon arrow for knight move g1-f3', () => {
    const arrow = buildEngineMoveArrow('g1', 'f3', 'Nf3', '+0.0', 2, false);
    expect(arrow).not.toBeNull();
    expect(arrow?.isKnightMove).toBe(true);
    expect(arrow?.pathD.endsWith('Z')).toBe(true);
  });
});
