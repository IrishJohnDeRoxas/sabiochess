export interface TimeControlInfo {
  baseSeconds?: number;
  incrementSeconds: number;
}

export interface ClockCommentInfo {
  type: 'clk' | 'emt';
  seconds: number;
  raw: string;
}

/**
 * Parses standard chess TimeControl strings:
 * - "600" -> 600s base, 0s inc
 * - "900+10" -> 900s base, 10s inc
 * - "180+2" -> 180s base, 2s inc
 * - "1/86400" -> 86400s (daily), 0s inc
 * - "40/7200:3600" -> 7200s base, 0s inc
 */
export function parseTimeControl(timeControl?: string): TimeControlInfo {
  if (!timeControl || timeControl === '?' || timeControl === '-') {
    return { baseSeconds: undefined, incrementSeconds: 0 };
  }

  const clean = timeControl.trim();

  // Moves/Seconds format: e.g. 40/7200:3600 or 1/86400
  if (clean.includes('/')) {
    const slashParts = clean.split('/');
    const rest = slashParts[1] || '';
    const colonParts = rest.split(':');
    const base = parseFloat(colonParts[0]);
    return {
      baseSeconds: isNaN(base) ? undefined : base,
      incrementSeconds: 0,
    };
  }

  // Base+Increment format: e.g. 900+10 or 600
  const plusParts = clean.split('+');
  const base = parseFloat(plusParts[0]);
  const inc = plusParts[1] ? parseFloat(plusParts[1]) : 0;

  return {
    baseSeconds: isNaN(base) ? undefined : base,
    incrementSeconds: isNaN(inc) ? 0 : inc,
  };
}

/**
 * Parses duration in format "H:MM:SS.s", "MM:SS.s", or seconds string into total seconds.
 */
export function parseDuration(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(':');

  if (parts.length === 3) {
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parseFloat(parts[2]);
    if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
    return h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const m = parseFloat(parts[0]);
    const s = parseFloat(parts[1]);
    if (isNaN(m) || isNaN(s)) return null;
    return m * 60 + s;
  } else if (parts.length === 1) {
    const s = parseFloat(parts[0]);
    return isNaN(s) ? null : s;
  }

  return null;
}

/**
 * Extracts [%clk H:MM:SS.s] or [%emt H:MM:SS.s] from move comments.
 */
export function parseClockComment(comment?: string): ClockCommentInfo | null {
  if (!comment) return null;

  // Check elapsed move time [%emt ...]
  const emtMatch = comment.match(/\[%emt\s+([0-9:.]+)\]/i);
  if (emtMatch && emtMatch[1]) {
    const sec = parseDuration(emtMatch[1]);
    if (sec !== null) {
      return { type: 'emt', seconds: sec, raw: emtMatch[1] };
    }
  }

  // Check remaining clock [%clk ...]
  const clkMatch = comment.match(/\[%clk\s+([0-9:.]+)\]/i);
  if (clkMatch && clkMatch[1]) {
    const sec = parseDuration(clkMatch[1]);
    if (sec !== null) {
      return { type: 'clk', seconds: sec, raw: clkMatch[1] };
    }
  }

  return null;
}

/**
 * Formats remaining clock seconds for digital display (e.g. "09:58", "00:08.4", "1:15:20").
 */
export function formatClockTime(seconds: number): string {
  if (seconds < 0) seconds = 0;

  const totalSecs = Math.floor(seconds);
  const tenths = Math.floor((seconds - totalSecs) * 10);

  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const remainingSecs = totalSecs % 60;

  if (hours > 0) {
    const mm = minutes.toString().padStart(2, '0');
    const ss = remainingSecs.toString().padStart(2, '0');
    return `${hours}:${mm}:${ss}`;
  }

  // Low on time (< 10s): display tenths of a second like Chess.com clocks
  if (totalSecs < 10) {
    const ss = remainingSecs.toString().padStart(2, '0');
    return `00:${ss}.${tenths}`;
  }

  const mm = minutes.toString().padStart(2, '0');
  const ss = remainingSecs.toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Formats move duration / elapsed time (e.g. "0.4s", "1.6s", "14s", "1m 12s", "1h 05m").
 */
export function formatMoveDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;

  if (seconds < 10) {
    // Under 10s: 1 decimal place (e.g. 1.6s)
    const formatted = seconds.toFixed(1);
    return formatted.endsWith('.0') ? `${Math.round(seconds)}s` : `${formatted}s`;
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const totalSecs = Math.round(seconds);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const remainingSecs = totalSecs % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  return `${minutes}m ${remainingSecs.toString().padStart(2, '0')}s`;
}

/**
 * Computes move durations and remaining clock values for every item in MoveRecord history.
 */
export function computeGameHistoryTiming<T extends { san?: string; fen: string; turn?: 'w' | 'b'; color?: 'w' | 'b' }>(
  history: T[],
  timeControl?: string,
  comments?: Array<{ fen: string; comment: string }>
): (T & {
  clock?: string;
  clockSeconds?: number;
  moveTime?: number;
  formattedMoveTime?: string;
})[] {
  if (!history || history.length === 0) return [];

  const { baseSeconds, incrementSeconds } = parseTimeControl(timeControl);

  // Map FEN to comment
  const commentsMap = new Map<string, string>();
  if (comments) {
    for (const c of comments) {
      if (c.fen && c.comment) {
        commentsMap.set(c.fen, c.comment);
      }
    }
  }

  let prevWhiteClock: number | undefined = baseSeconds;
  let prevBlackClock: number | undefined = baseSeconds;

  return history.map((item) => {
    const color = item.turn || item.color || 'w';
    const comment = commentsMap.get(item.fen);
    const parsed = parseClockComment(comment);

    let clockSeconds: number | undefined = undefined;
    let clock: string | undefined = undefined;
    let moveTime: number | undefined = undefined;
    let formattedMoveTime: string | undefined = undefined;

    const prevClock = color === 'w' ? prevWhiteClock : prevBlackClock;

    if (parsed) {
      if (parsed.type === 'emt') {
        // Direct elapsed move time was provided (e.g. [%emt 0:00:04])
        moveTime = Math.max(0, parsed.seconds);
        formattedMoveTime = formatMoveDuration(moveTime);

        if (prevClock !== undefined) {
          clockSeconds = Math.max(0, prevClock - moveTime + incrementSeconds);
          clock = formatClockTime(clockSeconds);
        }
      } else if (parsed.type === 'clk') {
        // Remaining clock provided [%clk 0:09:58.4]
        clockSeconds = parsed.seconds;
        clock = formatClockTime(clockSeconds);

        if (prevClock !== undefined) {
          moveTime = Math.max(0, prevClock - clockSeconds + incrementSeconds);
          formattedMoveTime = formatMoveDuration(moveTime);
        }
      }
    }

    // Update tracking
    if (clockSeconds !== undefined) {
      if (color === 'w') {
        prevWhiteClock = clockSeconds;
      } else {
        prevBlackClock = clockSeconds;
      }
    }

    return {
      ...item,
      clock,
      clockSeconds,
      moveTime,
      formattedMoveTime,
    };
  });
}
