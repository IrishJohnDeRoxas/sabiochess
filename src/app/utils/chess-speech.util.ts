/**
 * Utility functions to convert chess SAN notation, evaluations,
 * and text commentary into natural, spoken English sentences for TTS.
 */

const PIECE_NAMES: Record<string, string> = {
  K: 'King',
  Q: 'Queen',
  R: 'Rook',
  B: 'Bishop',
  N: 'Knight',
};

/**
 * Converts standard algebraic chess notation (SAN) into speakable English.
 * Examples:
 * - "e4" -> "e4"
 * - "Nf3" -> "Knight to f3"
 * - "Bxf7+" -> "Bishop takes f7, check"
 * - "Qh7#" -> "Queen to h7, checkmate"
 * - "O-O" -> "Kingside castling"
 * - "O-O-O" -> "Queenside castling"
 * - "exd5" -> "e takes d5"
 * - "e8=Q#" -> "e8 promotes to Queen, checkmate"
 */
export function formatSanForSpeech(san: string): string {
  if (!san) return '';

  const trimmed = san.trim();
  if (trimmed === 'O-O-O' || trimmed === '0-0-0') return 'Queenside castling';
  if (trimmed === 'O-O' || trimmed === '0-0') return 'Kingside castling';

  let text = trimmed;
  let suffix = '';

  if (text.endsWith('#')) {
    suffix = ', checkmate';
    text = text.slice(0, -1);
  } else if (text.endsWith('+')) {
    suffix = ', check';
    text = text.slice(0, -1);
  }

  // Promotion handling (e.g., e8=Q, cxd8=N)
  let promoSuffix = '';
  const promoMatch = text.match(/=([QRBN])/);
  if (promoMatch) {
    const promoPiece = PIECE_NAMES[promoMatch[1]] || 'piece';
    promoSuffix = ` promotes to ${promoPiece}`;
    text = text.replace(/=[QRBN]/, '');
  }

  const isCapture = text.includes('x');
  const parts = text.split('x');

  if (isCapture && parts.length === 2) {
    const fromPart = parts[0];
    const targetSquare = parts[1];

    if (/^[KQRBN]/.test(fromPart)) {
      const piece = PIECE_NAMES[fromPart[0]];
      const disambiguation = fromPart.slice(1);
      const disText = disambiguation ? ` ${disambiguation}` : '';
      return `${piece}${disText} takes ${targetSquare}${promoSuffix}${suffix}`;
    } else {
      // Pawn capture (e.g., "exd5")
      return `${fromPart} takes ${targetSquare}${promoSuffix}${suffix}`;
    }
  }

  // Non-capture piece moves (e.g. "Nf3", "Rad1", "N1f3")
  if (/^[KQRBN]/.test(text)) {
    const piece = PIECE_NAMES[text[0]];
    const rest = text.slice(1);
    if (rest.length === 2) {
      // Simple: "Nf3"
      return `${piece} to ${rest}${promoSuffix}${suffix}`;
    } else if (rest.length > 2) {
      // Disambiguated: "Rad1" -> "Rook a to d1", "N1f3" -> "Knight 1 to f3"
      const dis = rest.slice(0, rest.length - 2);
      const dest = rest.slice(-2);
      return `${piece} ${dis} to ${dest}${promoSuffix}${suffix}`;
    }
  }

  // Pawn move (e.g., "e4", "d5")
  return `${text}${promoSuffix}${suffix}`;
}

/**
 * Cleans markdown, formatting artifacts, and math symbols from coach commentary
 * so it reads naturally when voiced.
 */
export function cleanCommentaryForSpeech(commentary: string): string {
  if (!commentary) return '';

  let speech = commentary;

  // Remove bold/italics markers
  speech = speech.replace(/[*_~`]/g, '');

  // Convert mate evaluations first before regular plus/minus
  speech = speech.replace(/#\+([0-9]+)/g, 'mate in $1 for white');
  speech = speech.replace(/#-([0-9]+)/g, 'mate in $1 for black');

  // Convert SAN notations inside parentheses or text
  speech = speech.replace(/\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g, (match) => {
    // Only convert if it looks like a valid chess move (e.g. Nf3, e4, Qxf7+, O-O)
    if (/^(?:O-O(?:-O)?|[KQRBN][a-h1-8]?[a-h][1-8]|[a-h][1-8]|[a-h]x[a-h][1-8])(?:=[QRBN])?[+#]?$/.test(match)) {
      return formatSanForSpeech(match);
    }
    return match;
  });

  // Convert numeric evaluations
  speech = speech.replace(/\+([0-9]+\.?[0-9]*)/g, 'plus $1');
  speech = speech.replace(/-([0-9]+\.?[0-9]*)/g, 'minus $1');

  // Replace em-dashes and multiple spaces
  speech = speech.replace(/—/g, ', ');
  speech = speech.replace(/–/g, ', ');
  speech = speech.replace(/\s+/g, ' ').trim();

  return speech;
}
