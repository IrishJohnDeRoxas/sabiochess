import { Injectable } from '@angular/core';

export interface OpeningInfo {
  eco: string;
  name: string;
}

const COMMON_OPENINGS_FALLBACK: Record<string, OpeningInfo> = {
  'e4': { eco: 'B00', name: "King's Pawn Opening" },
  'd4': { eco: 'A40', name: "Queen's Pawn Opening" },
  'c4': { eco: 'A10', name: 'English Opening' },
  'Nf3': { eco: 'A04', name: 'Réti Opening' },
  'e4 e5': { eco: 'C20', name: 'Open Game' },
  'e4 c5': { eco: 'B20', name: 'Sicilian Defense' },
  'e4 e6': { eco: 'C00', name: 'French Defense' },
  'e4 c6': { eco: 'B10', name: 'Caro-Kann Defense' },
  'e4 d5': { eco: 'B01', name: 'Scandinavian Defense' },
  'e4 d6': { eco: 'B07', name: 'Pirc Defense' },
  'e4 g6': { eco: 'B06', name: 'Modern Defense' },
  'd4 d5': { eco: 'D00', name: 'Closed Game' },
  'd4 Nf6': { eco: 'A45', name: 'Indian Defense' },
  'd4 f5': { eco: 'A80', name: 'Dutch Defense' },
  'e4 e5 Nf3 Nc6 Bc4': { eco: 'C50', name: 'Italian Game' },
  'e4 e5 Nf3 Nc6 Bb5': { eco: 'C60', name: 'Ruy Lopez' },
  'e4 e5 Nf3 Nc6 d4': { eco: 'C44', name: 'Scotch Game' },
  'e4 e5 Nf3 Nf6': { eco: 'C42', name: 'Petrov Defense' },
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6': { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation' },
  'd4 d5 c4': { eco: 'D06', name: "Queen's Gambit" },
  'd4 d5 c4 e6': { eco: 'D30', name: "Queen's Gambit Declined" },
  'd4 d5 c4 c6': { eco: 'D10', name: 'Slav Defense' },
  'd4 d5 c4 dxc4': { eco: 'D20', name: "Queen's Gambit Accepted" },
  'd4 Nf6 c4 g6 Nc3 Bg7': { eco: 'E60', name: "King's Indian Defense" },
  'd4 Nf6 c4 e6 Nc3 Bb4': { eco: 'E20', name: 'Nimzo-Indian Defense' },
  'd4 Nf6 c4 e6 Nf3 b6': { eco: 'E12', name: "Queen's Indian Defense" },
  'd4 Nf6 c4 c5 d5': { eco: 'A56', name: 'Benoni Defense' },
  'd4 Nf6 c4 g6 Nc3 d5': { eco: 'D80', name: 'Grünfeld Defense' },
  'd4 Nf6 Bf4': { eco: 'D02', name: 'London System' },
};

@Injectable({
  providedIn: 'root',
})
export class OpeningBookService {
  private bookPrefixes = new Set<string>();
  private openingsDb: Record<string, [string, string]> = {};
  private isLoaded = false;

  constructor() {
    this.loadOpeningsDatabase();
  }

  private async loadOpeningsDatabase(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const response = await fetch('data/openings.json');
      if (response.ok) {
        const data = await response.json();
        this.openingsDb = data.db || {};
        this.bookPrefixes = new Set<string>(data.prefixes || []);
        this.isLoaded = true;
      }
    } catch {
      // Fallback works seamlessly
    }
  }

  isBookMove(sanSequence: string[]): boolean {
    if (!sanSequence || sanSequence.length === 0) return false;
    const key = sanSequence.join(' ');
    if (this.isLoaded && this.bookPrefixes.has(key)) {
      return true;
    }
    return !!COMMON_OPENINGS_FALLBACK[key] || sanSequence.length <= 4;
  }

  getOpeningForMoves(sanSequence: string[]): OpeningInfo | null {
    if (!sanSequence || sanSequence.length === 0) return null;

    // Search from longest prefix to shortest for most specific match
    for (let i = sanSequence.length; i >= 1; i--) {
      const subKey = sanSequence.slice(0, i).join(' ');
      if (this.isLoaded && this.openingsDb[subKey]) {
        const [eco, name] = this.openingsDb[subKey];
        return { eco, name };
      }
      if (COMMON_OPENINGS_FALLBACK[subKey]) {
        return COMMON_OPENINGS_FALLBACK[subKey];
      }
    }

    return null;
  }
}
