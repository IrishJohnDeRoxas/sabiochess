import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from './index';
import { users, User, NewUser } from './schema';
import { eq, or } from 'drizzle-orm';

/**
 * In-memory D1Database implementation for testing D1 + Drizzle ORM operations.
 */
function createInMemoryD1(): D1Database {
  const tableData: Map<string, Record<string, any>> = new Map();

  return {
    prepare(query: string) {
      let boundParams: any[] = [];
      const stmt = {
        bind(...values: any[]) {
          boundParams = values;
          return stmt;
        },
        async all<T = any>() {
          if (query.toUpperCase().includes('SELECT')) {
            const allUsers = Array.from(tableData.values());
            let filtered = allUsers;

            if (query.includes('google_id = ?') || query.includes('email = ?')) {
              const [param1, param2] = boundParams;
              filtered = allUsers.filter(
                (u) =>
                  (param1 && (u.googleId === param1 || u.google_id === param1)) ||
                  (param2 && (u.email === param2)) ||
                  (param1 && (u.email === param1))
              );
            } else if (query.includes('id = ?')) {
              const [idParam] = boundParams;
              filtered = allUsers.filter((u) => u.id === idParam);
            }

            const results = filtered.map((u) => ({
              id: u.id,
              email: u.email,
              name: u.name ?? null,
              avatar_url: u.avatarUrl ?? u.avatar_url ?? null,
              google_id: u.googleId ?? u.google_id ?? null,
              tier: u.tier ?? 'free',
              energy: u.energy ?? 5,
              last_energy_refill_at: u.lastEnergyRefillAt ?? u.last_energy_refill_at ?? null,
              app_theme: u.appTheme ?? u.app_theme ?? 'dark',
              board_theme: u.boardTheme ?? u.board_theme ?? 'green',
              move_sounds: u.moveSounds ?? u.move_sounds ? 1 : 0,
              analysis_depth: u.analysisDepth ?? u.analysis_depth ?? 12,
              chesscom_username: u.chesscomUsername ?? u.chesscom_username ?? null,
              created_at: u.createdAt ?? u.created_at ?? Date.now(),
              updated_at: u.updatedAt ?? u.updated_at ?? Date.now(),
            }));

            return {
              results: results as T[],
              success: true,
              meta: {} as any,
            };
          }

          return { results: [] as T[], success: true, meta: {} as any };
        },
        async run() {
          if (query.toUpperCase().includes('INSERT INTO `users`') || query.toUpperCase().includes('INSERT INTO "USERS"')) {
            const valuesKeywordIdx = query.search(/\s+values\s*\(/i);
            const colsPart = query.substring(0, valuesKeywordIdx).replace(/^.+?\(/, '').replace(/\)$/, '');
            const valsPart = query.substring(valuesKeywordIdx).replace(/^\s*values\s*\(/i, '').replace(/\)\s*$/, '');

            const cols = colsPart.split(',').map((c) => c.trim().replace(/[`"]/g, ''));
            const valTokens: string[] = [];
            let current = '';
            let depth = 0;
            for (let i = 0; i < valsPart.length; i++) {
              const char = valsPart[i];
              if (char === '(') depth++;
              else if (char === ')') depth--;
              else if (char === ',' && depth === 0) {
                valTokens.push(current.trim());
                current = '';
                continue;
              }
              current += char;
            }
            if (current.trim()) valTokens.push(current.trim());

            const record: Record<string, any> = {};
            let paramIdx = 0;
            cols.forEach((col, idx) => {
              const token = valTokens[idx];
              if (token === '?') {
                record[col] = boundParams[paramIdx++];
              } else if (token === 'null') {
                record[col] = null;
              } else if (token && token.includes('unixepoch')) {
                record[col] = Date.now();
              } else {
                record[col] = token;
              }
            });

            const id = record['id'];
            const stored = {
              id,
              email: record['email'],
              name: record['name'] ?? null,
              avatarUrl: record['avatar_url'] ?? null,
              googleId: record['google_id'] ?? null,
              tier: record['tier'] ?? 'free',
              energy: record['energy'] ?? 5,
              lastEnergyRefillAt: record['last_energy_refill_at'] ?? null,
              appTheme: record['app_theme'] ?? 'dark',
              boardTheme: record['board_theme'] ?? 'green',
              moveSounds: record['move_sounds'] !== undefined && record['move_sounds'] !== null ? Boolean(record['move_sounds']) : true,
              analysisDepth: record['analysis_depth'] !== undefined && record['analysis_depth'] !== null ? Number(record['analysis_depth']) : 12,
              chesscomUsername: record['chesscom_username'] ?? null,
              createdAt: record['created_at'] ?? Date.now(),
              updatedAt: record['updated_at'] ?? Date.now(),
            };
            tableData.set(id, stored);
          } else if (query.toUpperCase().includes('UPDATE')) {
            const idParam = boundParams[boundParams.length - 1];
            const existing = tableData.get(idParam);
            if (existing) {
              boundParams.forEach((param) => {
                if (typeof param === 'number' && param <= 5 && param >= 0) {
                  existing.energy = param;
                }
                if (param instanceof Date || (typeof param === 'number' && param > 1000000000)) {
                  existing.lastEnergyRefillAt = param;
                }
                if (param === 'dark' || param === 'light') {
                  existing.appTheme = param;
                }
                if (['green', 'wood', 'slate', 'dark', 'ocean', 'coral'].includes(param)) {
                  existing.boardTheme = param;
                }
                if (typeof param === 'boolean') {
                  existing.moveSounds = param;
                }
                if (typeof param === 'number' && param >= 10 && param <= 30) {
                  existing.analysisDepth = param;
                }
                if (typeof param === 'string' && !['dark', 'light', 'green', 'wood', 'slate', 'ocean', 'coral'].includes(param)) {
                  existing.chesscomUsername = param;
                }
              });
              tableData.set(idParam, { ...existing, updatedAt: Date.now() });
            }
          }
          return { success: true, meta: {} as any };
        },
        async first<T = any>() {
          const res = await stmt.all<T>();
          return res.results[0] || null;
        },
        async raw<T = any>() {
          const res = await stmt.all<any>();
          const selectMatch = query.match(/select\s+(.+?)\s+from/i);
          if (selectMatch) {
            const cols = selectMatch[1].split(',').map((c) => {
              const part = c.trim().split(/\s+as\s+/i)[0].trim();
              const colName = part.includes('.') ? part.split('.')[1] : part;
              return colName.replace(/[`"]/g, '');
            });
            return res.results.map((r: any) => cols.map((col) => r[col] !== undefined ? r[col] : null)) as T[];
          }
          return res.results.map((r: any) => Object.values(r)) as T[];
        },
      };
      return stmt as any;
    },
    async dump() {
      return new ArrayBuffer(0);
    },
    async batch(statements: any[]) {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.run());
      }
      return results;
    },
    async exec(query: string) {
      return { count: 0, duration: 0 };
    },
  } as unknown as D1Database;
}

describe('D1 User Repository & Database Operations (server/db)', () => {
  let mockD1: D1Database;
  let db: ReturnType<typeof createDb>;

  beforeEach(() => {
    mockD1 = createInMemoryD1();
    db = createDb(mockD1);
  });

  it('creates and inserts a new user record into D1', async () => {
    const newUser: NewUser = {
      id: 'usr_d1_test_001',
      email: 'gm_fischer@chess.com',
      name: 'Bobby Fischer',
      avatarUrl: 'https://chess.com/fischer.jpg',
      googleId: 'g_fischer_1972',
      tier: 'free',
      energy: 5,
      lastEnergyRefillAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };

    await db.insert(users).values(newUser);

    const [found] = await db
      .select()
      .from(users)
      .where(eq(users.id, newUser.id))
      .limit(1);

    expect(found).toBeDefined();
    expect(found.id).toBe('usr_d1_test_001');
    expect(found.email).toBe('gm_fischer@chess.com');
    expect(found.name).toBe('Bobby Fischer');
    expect(found.tier).toBe('free');
    expect(found.energy).toBe(5);
  });

  it('retrieves user by googleId or email using or() condition', async () => {
    const user1: NewUser = {
      id: 'usr_d1_test_002',
      email: 'tal@chess.com',
      name: 'Mikhail Tal',
      googleId: 'g_tal_1960',
      tier: 'lifetime',
      energy: null,
    };

    await db.insert(users).values(user1);

    // Query by googleId
    const [byGoogleId] = await db
      .select()
      .from(users)
      .where(or(eq(users.googleId, 'g_tal_1960'), eq(users.email, 'nomatch@chess.com')))
      .limit(1);

    expect(byGoogleId).toBeDefined();
    expect(byGoogleId.name).toBe('Mikhail Tal');

    // Query by email
    const [byEmail] = await db
      .select()
      .from(users)
      .where(or(eq(users.googleId, 'nomatch_google'), eq(users.email, 'tal@chess.com')))
      .limit(1);

    expect(byEmail).toBeDefined();
    expect(byEmail.id).toBe('usr_d1_test_002');
  });

  it('updates existing user energy and refill timestamp', async () => {
    const user: NewUser = {
      id: 'usr_d1_test_003',
      email: 'capablanca@chess.com',
      name: 'Jose Raul Capablanca',
      tier: 'free',
      energy: 2,
    };

    await db.insert(users).values(user);

    const refillTime = new Date('2026-02-01T12:00:00Z');
    await db
      .update(users)
      .set({
        energy: 1,
        lastEnergyRefillAt: refillTime,
      })
      .where(eq(users.id, user.id));

    const [updated] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    expect(updated).toBeDefined();
    expect(updated.energy).toBe(1);
    expect(updated.lastEnergyRefillAt).toBeDefined();
  });

  it('supports user settings columns (appTheme, boardTheme, moveSounds, analysisDepth)', async () => {
    const user: NewUser = {
      id: 'usr_d1_settings_001',
      email: 'settings_user@chess.com',
      name: 'Custom Settings User',
      tier: 'lifetime',
      appTheme: 'light',
      boardTheme: 'wood',
      moveSounds: false,
      analysisDepth: 25,
      chesscomUsername: 'grandmaster_bobby',
    };

    await db.insert(users).values(user);

    const [found] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    expect(found).toBeDefined();
    expect(found.appTheme).toBe('light');
    expect(found.boardTheme).toBe('wood');
    expect(found.moveSounds).toBe(false);
    expect(found.analysisDepth).toBe(25);
    expect(found.chesscomUsername).toBe('grandmaster_bobby');
  });
});
