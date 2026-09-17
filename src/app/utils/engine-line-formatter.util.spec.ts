import { describe, it, expect } from 'vitest';
import { formatEnginePvLine } from './engine-line-formatter.util';

describe('formatEnginePvLine', () => {
  it('correctly parses and formats white Multi-PV lines with move numbers', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const raw = {
      multipv: 1,
      depth: 18,
      scoreCp: 20,
      mate: null,
      pv: ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4'],
    };

    const res = formatEnginePvLine(fen, raw);
    expect(res).not.toBeNull();
    expect(res?.multipv).toBe(1);
    expect(res?.scoreFormatted).toBe('+0.2');
    expect(res?.firstSan).toBe('e4');
    expect(res?.moveNumberPrefix).toBe('1.');
    expect(res?.movesSan).toEqual(['e4', 'c5', 'Nf3', 'd6', 'd4']);
    expect(res?.restLineSan).toBe('c5 2. Nf3 d6 3. d4');
    expect(res?.fullLineText).toBe('1. e4 c5 2. Nf3 d6 3. d4');
  });

  it('correctly formats black to move lines', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const raw = {
      multipv: 2,
      depth: 15,
      scoreCp: 10, // from black's perspective, black is up by 10cp -> white perspective is -0.1
      mate: null,
      pv: ['c7c5', 'g1f3', 'd7d6'],
    };

    const res = formatEnginePvLine(fen, raw);
    expect(res).not.toBeNull();
    expect(res?.multipv).toBe(2);
    expect(res?.scoreCp).toBe(-10);
    expect(res?.scoreFormatted).toBe('-0.1');
    expect(res?.firstSan).toBe('c5');
    expect(res?.moveNumberPrefix).toBe('1...');
    expect(res?.fullLineText).toBe('1... c5 2. Nf3 d6');
  });

  it('handles mate scores correctly', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const raw = {
      multipv: 1,
      depth: 20,
      scoreCp: null,
      mate: 3,
      pv: ['e2e4'],
    };

    const res = formatEnginePvLine(fen, raw);
    expect(res?.mate).toBe(3);
    expect(res?.scoreFormatted).toBe('+M3');
  });

  it('auto-extends single-move PV lines into multi-move continuation sequences', () => {
    const fen = 'r1bq1rk1/ppp2p1p/2p2p1Q/3N4/8/8/PPP1PPPP/R3KBNR w KQ - 0 9';
    const raw = {
      multipv: 1,
      depth: 1,
      scoreCp: 20,
      mate: null,
      pv: ['h6f6'],
    };

    const res = formatEnginePvLine(fen, raw);
    expect(res).not.toBeNull();
    expect(res?.firstSan).toBe('Qxf6');
    expect(res?.movesSan.length).toBeGreaterThan(1);
    expect(res?.restLineSan).toContain('Qxf6');
  });
});
