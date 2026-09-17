import { EngineMoveArrow } from '../models/analysis.model';

export interface ArrowSquareCoord {
  x: number;
  y: number;
  col: number;
  row: number;
}

export function squareToCoords(square: string, isFlipped: boolean): ArrowSquareCoord | null {
  if (!square || square.length < 2) return null;
  const file = square[0].toLowerCase();
  const rank = parseInt(square[1], 10);
  if (isNaN(rank) || rank < 1 || rank > 8 || file < 'a' || file > 'h') return null;

  let col: number;
  let row: number;

  if (!isFlipped) {
    col = file.charCodeAt(0) - 97; // 'a' -> 0, 'h' -> 7
    row = 8 - rank; // 8 -> 0, 1 -> 7
  } else {
    col = 104 - file.charCodeAt(0); // 'h' -> 0, 'a' -> 7
    row = rank - 1; // 1 -> 0, 8 -> 7
  }

  const x = col * 100 + 50;
  const y = row * 100 + 50;

  return { x, y, col, row };
}

/**
 * Builds a unified Neubrutalist SVG polygon arrow descriptor for an engine candidate move.
 * Uses a single continuous closed path for seamless shaft-to-head geometry with crisp borders.
 */
export function buildEngineMoveArrow(
  fromSquare: string,
  toSquare: string,
  san: string,
  scoreFormatted: string,
  rank: number, // 1, 2, 3
  isFlipped: boolean,
  isHovered: boolean = false
): EngineMoveArrow | null {
  const fromCoord = squareToCoords(fromSquare, isFlipped);
  const toCoord = squareToCoords(toSquare, isFlipped);
  if (!fromCoord || !toCoord) return null;

  const x1 = fromCoord.x;
  const y1 = fromCoord.y;
  const x2 = toCoord.x;
  const y2 = toCoord.y;

  const dCol = Math.abs(toCoord.col - fromCoord.col);
  const dRow = Math.abs(toCoord.row - fromCoord.row);
  const isKnightMove = (dCol === 1 && dRow === 2) || (dCol === 2 && dRow === 1);

  // Uniform geometry dimensions across all candidate moves in 800x800 coordinate system
  const shaftHalfWidth = 11;
  const headHalfWidth = 24;
  const headLength = 32;
  const startOffset = 22;
  const endOffset = 16;

  let pathD = '';

  if (isKnightMove) {
    const w = shaftHalfWidth;
    const hw = headHalfWidth;
    const hl = headLength;

    if (dRow === 2 && dCol === 1) {
      // Longer movement along vertical axis
      const dirY = y2 > y1 ? 1 : -1;
      const dirX = x2 > x1 ? 1 : -1;
      const sy = y1 + dirY * startOffset;
      const tipX = x2 - dirX * endOffset;
      const tipY = y2;
      const neckX = tipX - dirX * hl;

      pathD = [
        `M ${(x1 - dirX * w).toFixed(1)} ${sy.toFixed(1)}`,
        `L ${(x1 - dirX * w).toFixed(1)} ${(y2 + dirY * w).toFixed(1)}`,
        `L ${neckX.toFixed(1)} ${(y2 + dirY * w).toFixed(1)}`,
        `L ${neckX.toFixed(1)} ${(y2 + dirY * hw).toFixed(1)}`,
        `L ${tipX.toFixed(1)} ${tipY.toFixed(1)}`,
        `L ${neckX.toFixed(1)} ${(y2 - dirY * hw).toFixed(1)}`,
        `L ${neckX.toFixed(1)} ${(y2 - dirY * w).toFixed(1)}`,
        `L ${(x1 + dirX * w).toFixed(1)} ${(y2 - dirY * w).toFixed(1)}`,
        `L ${(x1 + dirX * w).toFixed(1)} ${sy.toFixed(1)}`,
        'Z',
      ].join(' ');
    } else {
      // Longer movement along horizontal axis
      const dirX = x2 > x1 ? 1 : -1;
      const dirY = y2 > y1 ? 1 : -1;
      const sx = x1 + dirX * startOffset;
      const tipX = x2;
      const tipY = y2 - dirY * endOffset;
      const neckY = tipY - dirY * hl;

      pathD = [
        `M ${sx.toFixed(1)} ${(y1 - dirY * w).toFixed(1)}`,
        `L ${(x2 + dirX * w).toFixed(1)} ${(y1 - dirY * w).toFixed(1)}`,
        `L ${(x2 + dirX * w).toFixed(1)} ${neckY.toFixed(1)}`,
        `L ${(x2 + dirX * hw).toFixed(1)} ${neckY.toFixed(1)}`,
        `L ${tipX.toFixed(1)} ${tipY.toFixed(1)}`,
        `L ${(x2 - dirX * hw).toFixed(1)} ${neckY.toFixed(1)}`,
        `L ${(x2 - dirX * w).toFixed(1)} ${neckY.toFixed(1)}`,
        `L ${(x2 - dirX * w).toFixed(1)} ${(y1 + dirY * w).toFixed(1)}`,
        `L ${sx.toFixed(1)} ${(y1 + dirY * w).toFixed(1)}`,
        'Z',
      ].join(' ');
    }
  } else {
    // Straight arrow polygon
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return null;

    const ux = dx / dist;
    const uy = dy / dist;
    const nx = -uy;
    const ny = ux;

    const startX = x1 + ux * startOffset;
    const startY = y1 + uy * startOffset;
    const tipX = x2 - ux * endOffset;
    const tipY = y2 - uy * endOffset;
    const neckX = tipX - ux * headLength;
    const neckY = tipY - uy * headLength;

    const p1 = { x: startX + nx * shaftHalfWidth, y: startY + ny * shaftHalfWidth };
    const p2 = { x: neckX + nx * shaftHalfWidth, y: neckY + ny * shaftHalfWidth };
    const p3 = { x: neckX + nx * headHalfWidth, y: neckY + ny * headHalfWidth };
    const p4 = { x: tipX, y: tipY };
    const p5 = { x: neckX - nx * headHalfWidth, y: neckY - ny * headHalfWidth };
    const p6 = { x: neckX - nx * shaftHalfWidth, y: neckY - ny * shaftHalfWidth };
    const p7 = { x: startX - nx * shaftHalfWidth, y: startY - ny * shaftHalfWidth };

    pathD = [
      `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
      `L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
      `L ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`,
      `L ${p4.x.toFixed(1)} ${p4.y.toFixed(1)}`,
      `L ${p5.x.toFixed(1)} ${p5.y.toFixed(1)}`,
      `L ${p6.x.toFixed(1)} ${p6.y.toFixed(1)}`,
      `L ${p7.x.toFixed(1)} ${p7.y.toFixed(1)}`,
      'Z',
    ].join(' ');
  }

  // Neubrutalist styling: Uniform green with graduated opacity for ranks 2 and 3
  let color = '#10B981';
  let strokeWidth = 2.5;
  let opacity = rank === 1 ? 0.92 : rank === 2 ? 0.58 : 0.36;

  if (isHovered) {
    color = '#00C0F9';
    strokeWidth = 3;
    opacity = 1.0;
  }

  return {
    id: rank,
    from: fromSquare,
    to: toSquare,
    san,
    scoreFormatted,
    isKnightMove,
    pathD,
    color,
    strokeWidth,
    opacity,
    markerId: '',
  };
}
