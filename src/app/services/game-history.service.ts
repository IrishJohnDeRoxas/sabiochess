import { Injectable, effect, inject, signal } from '@angular/core';
import { SavedGameReview } from '../models/history.model';
import { SettingsService } from './settings.service';
import { ChessGameService } from './chess-game.service';
import { GameAnalysisService } from './game-analysis.service';

const DB_NAME = 'sabiochess_db';
const DB_VERSION = 1;
const STORE_NAME = 'game_history';
const MAX_RECORDS = 50;

@Injectable({
  providedIn: 'root',
})
export class GameHistoryService {
  private readonly settings = inject(SettingsService);
  private readonly gameService = inject(ChessGameService);
  private readonly analysisService = inject(GameAnalysisService);

  readonly recentReviews = signal<SavedGameReview[]>([]);
  readonly isDrawerOpen = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);

  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase | null> | null = null;
  private lastSavedSignature = '';

  constructor() {
    this.initDb().then(() => this.loadAll());

    effect(() => {
      const isAnalyzing = this.analysisService.isAnalyzing();
      const moves = this.analysisService.movesAnalysis();
      const summary = this.analysisService.summary();
      const hist = this.gameService.history();
      const meta = this.gameService.matchMetadata();

      if (!isAnalyzing && moves.length > 0 && hist.length > 0 && summary) {
        const pgn = this.gameService.getPgn();
        const signature = `${meta.white.name}_${meta.black.name}_${hist.length}_${summary.whiteAccuracy}_${summary.blackAccuracy}`;
        if (pgn && pgn.length > 10 && signature !== this.lastSavedSignature) {
          this.lastSavedSignature = signature;
          this.saveReview({
            white: meta.white.name || 'White',
            black: meta.black.name || 'Black',
            whiteRating: meta.white.rating,
            blackRating: meta.black.rating,
            whiteAccuracy: summary.whiteAccuracy,
            blackAccuracy: summary.blackAccuracy,
            result: meta.result || '*',
            date: meta.date || new Date().toISOString().split('T')[0],
            event: meta.event || 'Analysis',
            opening: summary.openingName || this.analysisService.detectedOpening()?.name,
            eco: summary.openingEco || this.analysisService.detectedOpening()?.eco,
            movesCount: hist.length,
            pgn,
            summary,
            movesAnalysis: moves,
          });
        }
      }
    });
  }

  openDrawer(): void {
    this.isDrawerOpen.set(true);
    this.loadAll();
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  toggleDrawer(): void {
    if (this.isDrawerOpen()) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  private async initDb(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }
    if (this.db) {
      return this.db;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          resolve(this.db);
        };

        request.onerror = () => {
          console.warn('[GameHistoryService] IndexedDB open error');
          resolve(null);
        };
      } catch (e) {
        console.warn('[GameHistoryService] IndexedDB initialization failed:', e);
        resolve(null);
      }
    });

    return this.initPromise;
  }

  async loadAll(): Promise<SavedGameReview[]> {
    const db = await this.initDb();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev'); // Most recent first
        const list: SavedGameReview[] = [];

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor && list.length < MAX_RECORDS) {
            list.push(cursor.value);
            cursor.continue();
          } else {
            this.recentReviews.set(list);
            resolve(list);
          }
        };

        request.onerror = () => {
          resolve([]);
        };
      } catch {
        resolve([]);
      }
    });
  }

  async saveReview(review: Omit<SavedGameReview, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): Promise<string | null> {
    const db = await this.initDb();
    if (!db) return null;

    const id = review.id || this.generateKey(review.pgn || review.white + review.black);
    const item: SavedGameReview = {
      ...review,
      id,
      timestamp: review.timestamp || Date.now(),
    };

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(item);

        tx.oncomplete = async () => {
          await this.pruneExcess();
          await this.loadAll();
          resolve(id);
        };

        tx.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }

  async deleteReview(id: string): Promise<void> {
    const db = await this.initDb();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);

        tx.oncomplete = () => {
          this.loadAll();
          this.settings.flashToast('Review removed from history');
          resolve();
        };

        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.initDb();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();

        tx.oncomplete = () => {
          this.recentReviews.set([]);
          this.settings.flashToast('All saved game reviews cleared');
          resolve();
        };

        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  loadIntoReview(item: SavedGameReview): void {
    if (!item.pgn) return;

    const success = this.gameService.loadPgn(item.pgn);
    if (success) {
      if (item.movesAnalysis && item.movesAnalysis.length > 0) {
        this.analysisService.restoreAnalysis(
          item.movesAnalysis,
          item.opening ? { eco: item.eco || '', name: item.opening } : null,
          {
            white: typeof item.whiteRating === 'number' ? item.whiteRating : Number(item.whiteRating) || undefined,
            black: typeof item.blackRating === 'number' ? item.blackRating : Number(item.blackRating) || undefined,
          }
        );
      }
      this.closeDrawer();
      this.settings.flashToast(`Loaded: ${item.white} vs ${item.black}`);
    } else {
      this.settings.flashToast('Failed to load game');
    }
  }

  private async pruneExcess(): Promise<void> {
    const db = await this.initDb();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const countReq = store.count();

        countReq.onsuccess = () => {
          const count = countReq.result;
          if (count <= MAX_RECORDS) {
            resolve();
            return;
          }

          const excess = count - MAX_RECORDS;
          let deleted = 0;
          const req = index.openCursor(null, 'next'); // Oldest first
          req.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor && deleted < excess) {
              cursor.delete();
              deleted++;
              cursor.continue();
            } else {
              resolve();
            }
          };
        };
        countReq.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private generateKey(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `game_${Math.abs(hash)}_${Date.now()}`;
  }
}
