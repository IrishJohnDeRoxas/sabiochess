import { User, UserSettings } from '../db/schema';

export const DEFAULT_APP_THEME: UserSettings['appTheme'] = 'dark';
export const DEFAULT_BOARD_THEME: UserSettings['boardTheme'] = 'green';
export const DEFAULT_MOVE_SOUNDS = true;
export const DEFAULT_ANALYSIS_DEPTH = 12;

export const MIN_ANALYSIS_DEPTH = 10;
export const FREE_MAX_ANALYSIS_DEPTH = 22;
export const PRO_MAX_ANALYSIS_DEPTH = 22;

export const ALLOWED_APP_THEMES = ['dark', 'light'] as const;
export const ALLOWED_BOARD_THEMES = ['green', 'wood', 'slate', 'dark', 'ocean', 'coral'] as const;
export const FREE_BOARD_THEMES = ['green'] as const;

export type AppThemeType = (typeof ALLOWED_APP_THEMES)[number];
export type BoardThemeType = (typeof ALLOWED_BOARD_THEMES)[number];

export interface ValidationSuccess {
  valid: true;
  settings: Partial<UserSettings>;
}

export interface ValidationFailure {
  valid: false;
  error: string;
  statusCode: 400 | 403;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Checks if user is eligible for Pro/Lifetime features.
 */
export function isProUser(tier?: string | null): boolean {
  return tier === 'lifetime' || tier === 'pro';
}

/**
 * Validates and clamps analysis depth based on user tier.
 */
export function validateAnalysisDepth(
  tier: string | undefined | null,
  requestedDepth: unknown
): { valid: boolean; depth: number; maxAllowed: number; error?: string } {
  const isPro = isProUser(tier);
  const maxAllowed = isPro ? PRO_MAX_ANALYSIS_DEPTH : FREE_MAX_ANALYSIS_DEPTH;

  if (typeof requestedDepth !== 'number' || Number.isNaN(requestedDepth)) {
    return {
      valid: false,
      depth: DEFAULT_ANALYSIS_DEPTH,
      maxAllowed,
      error: 'Depth must be a valid number',
    };
  }

  const rounded = Math.round(requestedDepth);
  const clamped = Math.max(MIN_ANALYSIS_DEPTH, Math.min(rounded, maxAllowed));

  return {
    valid: true,
    depth: clamped,
    maxAllowed,
  };
}

/**
 * Extracts normalized user settings from user record with fallback defaults.
 */
export function extractUserSettings(user?: Partial<User> | null): UserSettings {
  const appTheme =
    user?.appTheme && ALLOWED_APP_THEMES.includes(user.appTheme as AppThemeType)
      ? (user.appTheme as AppThemeType)
      : DEFAULT_APP_THEME;

  const boardTheme =
    user?.boardTheme && ALLOWED_BOARD_THEMES.includes(user.boardTheme as BoardThemeType)
      ? (user.boardTheme as BoardThemeType)
      : DEFAULT_BOARD_THEME;

  const moveSounds =
    typeof user?.moveSounds === 'boolean'
      ? user.moveSounds
      : Boolean(user?.moveSounds ?? DEFAULT_MOVE_SOUNDS);

  const analysisDepth =
    typeof user?.analysisDepth === 'number' && !Number.isNaN(user.analysisDepth)
      ? user.analysisDepth
      : DEFAULT_ANALYSIS_DEPTH;

  const chesscomUsername =
    typeof user?.chesscomUsername === 'string' && user.chesscomUsername.trim().length > 0
      ? user.chesscomUsername.trim()
      : null;

  return {
    appTheme,
    boardTheme,
    moveSounds,
    analysisDepth,
    chesscomUsername,
  };
}

/**
 * Validates and sanitizes settings update input payload against user permissions.
 */
export function validateAndSanitizeSettings(
  user: { tier?: string | null },
  rawInput: unknown
): ValidationResult {
  if (!rawInput || typeof rawInput !== 'object') {
    return {
      valid: false,
      error: 'Invalid request body: expected JSON object',
      statusCode: 400,
    };
  }

  const body = rawInput as Record<string, unknown>;
  // Support nested { settings: { ... } } or flat { ... }
  const input =
    body.settings && typeof body.settings === 'object'
      ? (body.settings as Record<string, unknown>)
      : body;

  const sanitized: Partial<UserSettings> = {};

  // Validate appTheme
  if (input['appTheme'] !== undefined) {
    const val = input['appTheme'];
    if (typeof val !== 'string' || !ALLOWED_APP_THEMES.includes(val as AppThemeType)) {
      return {
        valid: false,
        error: `Invalid appTheme: must be one of [${ALLOWED_APP_THEMES.join(', ')}]`,
        statusCode: 400,
      };
    }
    sanitized.appTheme = val as AppThemeType;
  }

  // Validate boardTheme
  if (input['boardTheme'] !== undefined) {
    const val = input['boardTheme'];
    if (typeof val !== 'string' || !ALLOWED_BOARD_THEMES.includes(val as BoardThemeType)) {
      return {
        valid: false,
        error: `Invalid boardTheme: must be one of [${ALLOWED_BOARD_THEMES.join(', ')}]`,
        statusCode: 400,
      };
    }

    sanitized.boardTheme = val as BoardThemeType;
  }

  // Validate moveSounds
  if (input['moveSounds'] !== undefined) {
    const val = input['moveSounds'];
    if (typeof val !== 'boolean') {
      return {
        valid: false,
        error: 'Invalid moveSounds: must be a boolean',
        statusCode: 400,
      };
    }
    sanitized.moveSounds = val;
  }

  // Validate analysisDepth
  if (input['analysisDepth'] !== undefined) {
    const val = input['analysisDepth'];
    if (typeof val !== 'number' || Number.isNaN(val)) {
      return {
        valid: false,
        error: 'Invalid analysisDepth: must be a number',
        statusCode: 400,
      };
    }

    const depthValidation = validateAnalysisDepth(user.tier, val);
    sanitized.analysisDepth = depthValidation.depth;
  }

  // Validate chesscomUsername
  if (input['chesscomUsername'] !== undefined) {
    const val = input['chesscomUsername'];
    if (val === null || val === '') {
      sanitized.chesscomUsername = null;
    } else if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.length > 50) {
        return {
          valid: false,
          error: 'chesscomUsername must not exceed 50 characters',
          statusCode: 400,
        };
      }
      sanitized.chesscomUsername = trimmed.length > 0 ? trimmed : null;
    } else {
      return {
        valid: false,
        error: 'chesscomUsername must be a string or null',
        statusCode: 400,
      };
    }
  }

  return {
    valid: true,
    settings: sanitized,
  };
}
