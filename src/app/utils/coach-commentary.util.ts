import { MoveClassification } from '../models/analysis.model';

export interface CommentaryContext {
  prevMoveSan?: string | null;
  prevClassification?: MoveClassification | null;
  scoreBefore?: number | null;
  scoreAfter?: number | null;
  cpl?: number | null;
}

/**
 * Deterministically pick an option from a pool so commentary stays consistent
 * when stepping back/forth through moves.
 */
function pickVariant(options: string[], plyIndex: number, moveSan: string, salt = ''): string {
  if (options.length === 0) return '';
  let hash = (plyIndex * 37) | 0;
  for (let i = 0; i < moveSan.length; i++) {
    hash = (hash * 19 + moveSan.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < salt.length; i++) {
    hash = (hash * 13 + salt.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % options.length;
  return options[index];
}

export function formatFriendlyMove(san: string): string {
  if (!san) return '';
  if (san.startsWith('O-O-O')) return 'Castling queenside (O-O-O)';
  if (san.startsWith('O-O')) return 'Castling kingside (O-O)';
  return san;
}

/**
 * Extracts destination square from standard SAN (e.g. "Nf3" -> "f3", "exd5" -> "d5", "Qh5+" -> "h5")
 */
function extractTargetSquare(san: string): string {
  const cleaned = san.replace(/[+#=?!]/g, '').replace(/=[QRBN]/, '');
  const match = cleaned.match(/([a-h][1-8])$/);
  return match ? match[1] : '';
}

/**
 * Provides move-specific opening book commentary to avoid repetitive generic book responses.
 */
function getBookMoveCommentary(
  moveSan: string,
  plyIndex: number,
  openingName: string | null,
  salt = ''
): string {
  const targetSq = extractTargetSquare(moveSan);

  // First 2 plies: introduce opening if name exists
  if (plyIndex <= 1 && openingName) {
    return pickVariant(
      [
        `Standard opening theory in the ${openingName}.`,
        `Opening book: entering the ${openingName}.`,
        `Mainline opening preparation in the ${openingName}.`,
      ],
      plyIndex,
      moveSan,
      salt
    );
  }

  // Castling in book
  if (moveSan.startsWith('O-O-O')) {
    return pickVariant(
      [
        'Queenside castling completes opening mobilization and activates the d-file rook.',
        'Castles queenside, setting the stage for opposite-side castling warfare.',
      ],
      plyIndex,
      moveSan,
      salt
    );
  }
  if (moveSan.startsWith('O-O')) {
    return pickVariant(
      [
        'Kingside castling completes opening development and secures the king.',
        'Castles kingside into safety, connecting the rooks for the middlegame.',
        'Tucks the king away into safety right on theoretical schedule.',
      ],
      plyIndex,
      moveSan,
      salt
    );
  }

  // Specific common book pawn moves
  if (moveSan === 'e4') {
    return 'Claims central space and opens diagonals for the queen and light-squared bishop.';
  }
  if (moveSan === 'e5') {
    return 'Symmetrically stakes a claim in the center and prevents d4.';
  }
  if (moveSan === 'd4') {
    return 'Establishes a classical pawn duo in the center and frees the dark-squared bishop.';
  }
  if (moveSan === 'd5') {
    return 'Strikes back at the center to dispute spatial control.';
  }
  if (moveSan === 'c4') {
    return 'The thematic flank thrust fighting for control of the central d5 square.';
  }
  if (moveSan === 'c5') {
    return 'The Sicilian flank strike, fighting for central imbalance.';
  }
  if (moveSan === 'c6' || moveSan === 'c3') {
    return `Pawn to ${moveSan} solidifies the pawn chain and supports a central foothold.`;
  }
  if (moveSan === 'e6' || moveSan === 'e3') {
    return `Pawn to ${moveSan} reinforces the center and prepares diagonal piece development.`;
  }
  if (moveSan === 'd6' || moveSan === 'd3') {
    return `Pawn to ${moveSan} provides flexible central support for minor pieces.`;
  }
  if (moveSan === 'g3' || moveSan === 'g6' || moveSan === 'b3' || moveSan === 'b6') {
    return `Pawn to ${moveSan} prepares to fianchetto the bishop on the long diagonal.`;
  }
  if (moveSan === 'a6' || moveSan === 'a3' || moveSan === 'h6' || moveSan === 'h3') {
    return `A useful prophylactic pawn push on ${moveSan}, controlling key boundary squares.`;
  }

  // Specific common book piece moves
  if (moveSan.startsWith('N')) {
    if (moveSan === 'Nf3' || moveSan === 'Nf6') {
      return pickVariant(
        [
          `Develops the knight to ${moveSan.slice(1)}, fighting for central influence and preparing kingside castling.`,
          `Natural knight development to ${moveSan.slice(1)}, exerting pressure on key central squares.`,
        ],
        plyIndex,
        moveSan,
        salt
      );
    }
    if (moveSan === 'Nc3' || moveSan === 'Nc6') {
      return pickVariant(
        [
          `Brings the knight to ${moveSan.slice(1)}, reinforcing central stability.`,
          `Natural knight development to ${moveSan.slice(1)}, supporting central pawn breaks.`,
        ],
        plyIndex,
        moveSan,
        salt
      );
    }
    if (moveSan === 'Nd2' || moveSan === 'Nd7' || moveSan === 'Ne2' || moveSan === 'Ne7') {
      return `Flexible knight placement on ${targetSq}, keeping options open and avoiding pawn blockades.`;
    }
    return `Develops the knight to ${targetSq} in accordance with established opening theory.`;
  }

  if (moveSan.startsWith('B')) {
    if (['g2', 'b2', 'g7', 'b7'].includes(targetSq)) {
      return `Fianchettos the bishop on ${targetSq}, radiating long-range diagonal power across the center.`;
    }
    if (['g5', 'b5', 'g4', 'b4'].includes(targetSq)) {
      return `Develops the bishop to ${targetSq} with an active pinning motif on the knight.`;
    }
    if (['c4', 'c5'].includes(targetSq)) {
      return `Brings the bishop to ${targetSq}, eyeing the vulnerable f-pawn and taking an active diagonal.`;
    }
    if (['e2', 'e7', 'd3', 'd6', 'e3', 'e6'].includes(targetSq)) {
      return `Solid, harmonious bishop development to ${targetSq}, preparing rapid castling.`;
    }
    return `Places the bishop on an active diagonal at ${targetSq}.`;
  }

  if (moveSan.startsWith('Q')) {
    return `Coordinates the queen on ${targetSq} while staying true to opening principles.`;
  }

  if (moveSan.startsWith('R')) {
    return `Mobilizes the rook to ${targetSq} to support central pawn structures.`;
  }

  // Fallback for other book moves
  if (openingName && plyIndex < 6) {
    return pickVariant(
      [
        `A principled theoretical move in the ${openingName}.`,
        `Solid opening line in the ${openingName}, mobilizing forces efficiently.`,
        `Book move in the ${openingName}, maintaining sound piece coordination.`,
      ],
      plyIndex,
      moveSan,
      salt
    );
  }

  return pickVariant(
    [
      'A disciplined theoretical choice, developing harmoniously without losing tempo.',
      'Follows established opening theory right out of master repertoire.',
      'Sound opening move, developing pieces and reinforcing central control.',
    ],
    plyIndex,
    moveSan,
    salt
  );
}

/**
 * Generates rich, realistic grandmaster-style coach commentary based on
 * current move dynamics, intent, game phase, and previous move interactions.
 * Uses clean, objective broadcast language (no second-person "your/you").
 */
export function getCoachCommentary(
  c: MoveClassification,
  moveSan: string,
  bestMoveSan: string | null = null,
  plyIndex = 0,
  openingName: string | null = null,
  contextOrPrev?: string | null | CommentaryContext
): string {
  if (!moveSan) return 'Play continues from this position.';

  const context: CommentaryContext =
    typeof contextOrPrev === 'string'
      ? { prevMoveSan: contextOrPrev }
      : contextOrPrev || {};

  const prevMoveSan = context.prevMoveSan || null;
  const prevClassification = context.prevClassification || null;

  // Move attributes
  const isMate = moveSan.includes('#');
  const isCheck = moveSan.includes('+');
  const isCastleKingside = moveSan === 'O-O' || moveSan.startsWith('O-O+');
  const isCastleQueenside = moveSan.startsWith('O-O-O');
  const isCastle = isCastleKingside || isCastleQueenside;
  const isCapture = moveSan.includes('x');
  const isPromotion = moveSan.includes('=');
  const isPawnMove = /^[a-h]/.test(moveSan);
  const targetSq = extractTargetSquare(moveSan);

  // Previous move context
  const prevWasCheck = prevMoveSan ? prevMoveSan.includes('+') : false;
  const prevWasCapture = prevMoveSan ? prevMoveSan.includes('x') : false;
  const isRecapture = isCapture && prevWasCapture;
  const isPunishingPrevSlip =
    (prevClassification === 'blunder' || prevClassification === 'mistake' || prevClassification === 'miss') &&
    (c === 'best' || c === 'great' || c === 'brilliant');

  // Game phase
  const isEarlyOpening = plyIndex < 12;
  const isEndgame = plyIndex > 38;

  // Friendly best move
  const friendlyBest = bestMoveSan ? formatFriendlyMove(bestMoveSan) : null;
  const salt = prevMoveSan || '';

  // 1. Checkmate resolution
  if (isMate) {
    return pickVariant(
      [
        'Checkmate! A clinical, decisive finish that brings down the curtain on the game.',
        'Checkmate! The defending king is thoroughly trapped with zero escape squares.',
        'Game over! An unstoppable checkmate sequence to seal the victory.',
        'Delivers checkmate on the spot! A flawless conclusion to the attack.',
      ],
      plyIndex,
      moveSan,
      salt
    );
  }

  // 2. Opening Book Theory (rich, non-repeating)
  if (c === 'book') {
    return getBookMoveCommentary(moveSan, plyIndex, openingName, salt);
  }

  // 3. Responding to previous check
  if (prevWasCheck && (c === 'best' || c === 'excellent' || c === 'great')) {
    if (isCapture) {
      return pickVariant(
        [
          'Eliminates the checking piece directly, neutralizing the threat and holding the initiative.',
          'Takes the checking piece cleanly, putting an immediate stop to the attacking momentum.',
          'Chops off the checking piece with authority, restoring stability to the position.',
        ],
        plyIndex,
        moveSan,
        salt
      );
    }
    if (moveSan.startsWith('K')) {
      return pickVariant(
        [
          'Steps the king calmly out of check onto a secure, shielded square.',
          'Sidesteps the check with the king, safely unpinning from the attacker.',
          'King sidesteps the check smoothly, leaving no dangerous follow-up threats.',
        ],
        plyIndex,
        moveSan,
        salt
      );
    }
    return pickVariant(
      [
        'Interposes cleanly to parry the check while maintaining harmonious piece coordination.',
        'Blocks the check with precision, turning the defensive resource into active counter-pressure.',
        'Parries the check accurately, keeping the king thoroughly protected.',
      ],
      plyIndex,
      moveSan,
      salt
    );
  }

  // 4. Immediate Recapture Dynamics
  if (isRecapture && (c === 'best' || c === 'excellent' || c === 'good')) {
    if (isPawnMove) {
      return pickVariant(
        [
          'Recaptures with the pawn, securing the center and reinforcing the pawn chain.',
          'Takes back with the pawn, maintaining healthy central presence and opening active lines.',
          'Smooth pawn recapture, keeping material balance and fortifying key central squares.',
        ],
        plyIndex,
        moveSan,
        salt
      );
    }
    return pickVariant(
      [
        'Immediate recapture, liquidating material cleanly while improving piece activity.',
        'Takes back with the piece, maintaining harmonious coordination and tempo.',
        'Crisp recapture—restores material equality and keeps the position dynamically balanced.',
        'Recaptures accurately, keeping the pieces active and ready for the next phase.',
      ],
      plyIndex,
      moveSan,
      salt
    );
  }

  // 5. Punishing an opponent's previous slip
  if (isPunishingPrevSlip) {
    return pickVariant(
      [
        'Ruthlessly pounces on the misstep! A sharp tactical refutation.',
        'Punishes the mistake immediately with clinical, engine-like precision.',
        'Seizes on the opponent’s slip to tilt the evaluation decisively.',
        'Direct and unforgiving! Capitalizes instantly on the positional oversight.',
      ],
      plyIndex,
      moveSan,
      salt
    );
  }

  // 6. Classification Specific Logic (Clean broadcast style)
  switch (c) {
    case 'brilliant': {
      if (isCapture) {
        return pickVariant(
          [
            'A brilliant sacrifice! Shatters the defensive setup through deep tactical vision.',
            'Incredible piece sacrifice! Gives up material to blow open decisive attacking pathways against the king.',
            'A sparkling tactical strike, trading material value for unstoppable attacking momentum.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      if (isCheck) {
        return pickVariant(
          [
            'A sensational checking sacrifice! Drags the defending king into an inescapable tactical net.',
            'Stunning forcing check! Tears through the defense with devastating effect.',
            'Electrifying move! The check shatters coordination and forces the king into the open.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      return pickVariant(
        [
          'An inspired tactical masterpiece! An unexpected, high-level resource that turns the entire board.',
          'Brilliant intuition! A deep, hidden idea that catches the other side completely off guard.',
          'Pure grandmaster vision! A bold, game-defining concept that seizes absolute control.',
        ],
        plyIndex,
        moveSan,
        salt
      );
    }

    case 'great': {
      if (isCapture) {
        return pickVariant(
          [
            'Sharp and incisive! A critical capture that removes a key defender and stokes the attack.',
            'A clutch capture! Liquidates into a favorable structure while keeping the tactical pressure burning.',
            'Calculated to perfection! Liquidates cleanly to cement a decisive positional edge.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      if (isCheck) {
        return pickVariant(
          [
            'A vital, forcing check that puts the defense on their back foot.',
            'A sharp, timely check that disrupts piece coordination.',
            'Accurate forcing check! Limits the defending king and sets up heavy tactical threats.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      if (isCastle) {
        return pickVariant(
          [
            'Timely castling! Safely tucks the king away just before the central lines explode open.',
            'A clutch defensive decision, taking the king off the open file while activating the rook.',
            'Great castling timing! Solidifies king safety and links the back-rank rooks together.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      return pickVariant(
        [
          'A fantastic find! The only move that keeps the pressure mounting.',
          'High-level positional vision! This subtle maneuver creates lasting problems for the other side.',
          'A great find! Navigates tricky tactical waters and keeps the initiative firmly alive.',
        ],
        plyIndex,
        moveSan,
        salt
      );
    }

    case 'best': {
      // Castling
      if (isCastleKingside) {
        return pickVariant(
          [
            'Kingside castling secures the king and mobilizes the rook for central action.',
            'Tucks the king away safely into the corner and connects the rooks for the middlegame.',
            'Castles at the ideal moment—king safety is secured before opening up the center.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      if (isCastleQueenside) {
        return pickVariant(
          [
            'Castles queenside! Signals aggressive opposite-side castling intentions and activates the d-file rook.',
            'Queenside castle: tucks the monarch away while instantly anchoring a heavy rook on the central file.',
            'Dynamic queenside castling, setting the stage for a sharp battle on opposite flanks.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }

      // Promotions
      if (isPromotion) {
        return pickVariant(
          [
            'Pushes the pawn through to promotion! Bringing in a new queen to close out the victory.',
            'Promotion! Converting the advanced passer into fresh heavy artillery.',
            'Promotes the passed pawn cleanly, placing insurmountable winning pressure on the board.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }

      // Captures
      if (isCapture) {
        return pickVariant(
          [
            'The cleanest capture on the board, winning material with zero defensive counterplay.',
            'Precise liquidation. Taking here eliminates counterplay and preserves the winning margin.',
            'Accurate take! Removes an active enemy piece and cements structural superiority.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }

      // Checks
      if (isCheck) {
        return pickVariant(
          [
            'A crisp, accurate check that keeps the initiative firmly in hand.',
            'Direct and forcing check—leaves no breathing room for defensive regrouping.',
            'Accurate check that keeps the pressure mounting and drives the defense backward.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }

      // Piece-specific motives (Knight)
      if (moveSan.startsWith('N')) {
        const isOutpost = ['d4', 'e4', 'd5', 'e5', 'c4', 'c5', 'f4', 'f5'].includes(targetSq);
        if (isOutpost) {
          return pickVariant(
            [
              `Anchors the knight on a dominant ${targetSq} outpost where it radiates central power.`,
              `Jumps the knight to ${targetSq}, clamping down on vital central territory.`,
              `Ideal knight outpost on ${targetSq}—exerts tremendous tactical and positional influence.`,
            ],
            plyIndex,
            moveSan,
            salt
          );
        }
        if (isEarlyOpening) {
          return pickVariant(
            [
              'Develops the knight actively toward the center to control vital outposts.',
              'Jumps the knight into the fight, staking an immediate claim in the central squares.',
              'Textbook knight development, keeping flexible tabs on key central avenues.',
            ],
            plyIndex,
            moveSan,
            salt
          );
        }
        return pickVariant(
          [
            'Reroutes the knight to a more active, coordinated square with strong board vision.',
            'Optimizes knight placement, improving its tactical scope and piece coordination.',
            'Strong knight maneuver that increases control over key central squares.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }

      // Piece-specific motives (Bishop)
      if (moveSan.startsWith('B')) {
        const isFianchetto = ['g2', 'b2', 'g7', 'b7'].includes(targetSq);
        const isPin = ['g5', 'b5', 'g4', 'b4'].includes(targetSq);
        if (isFianchetto) {
          return pickVariant(
            [
              `Fianchettos the bishop on ${targetSq}, projecting laser-like pressure down the long diagonal.`,
              `Takes the long diagonal on ${targetSq}, exerting long-range control across the central highway.`,
              `Harmonious fianchetto setup on ${targetSq}, fortifying king defense while eyeing the opposite flank.`,
            ],
            plyIndex,
            moveSan,
            salt
          );
        }
        if (isPin) {
          return pickVariant(
            [
              `Pins the defending piece on ${targetSq}, restricting enemy mobility and applying awkward pressure.`,
              `Develops with a pinning motif to ${targetSq}, tying down enemy pieces to valuable targets.`,
              `Active bishop pin on ${targetSq}, creating positional friction for the opponent.`,
            ],
            plyIndex,
            moveSan,
            salt
          );
        }
        return pickVariant(
          [
            'Brings the bishop onto an active diagonal with wide-ranging scope.',
            'Smooth bishop development, placing eye-pressure along open diagonals.',
            'Active bishop placement that coordinates harmoniously with the rest of the pieces.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }

      // Piece-specific motives (Rook)
      if (moveSan.startsWith('R')) {
        const is7thRank = targetSq.endsWith('7') || targetSq.endsWith('2');
        if (is7thRank) {
          return pickVariant(
            [
              `Infiltrates the critical 7th rank on ${targetSq}—a nightmare for enemy defense and pawn health.`,
              `Rook invasion on ${targetSq}! Dominates the second rank to tie down the opposing king and pawns.`,
              `Pigs on the 7th rank! Placing the rook on ${targetSq} exerts crushing horizontal pressure.`,
            ],
            plyIndex,
            moveSan,
            salt
          );
        }
        return pickVariant(
          [
            `Seizes the open file on ${targetSq}, maximizing the rook’s vertical power.`,
            'Brings the rook to a prime central file, coordinating seamlessly with the queen.',
            'Activates the rook toward the center, ready to back up pawn breaks and open files.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }

      // Piece-specific motives (Queen)
      if (moveSan.startsWith('Q')) {
        return pickVariant(
          [
            'Centralizes the queen with commanding authority, applying pressure across both flanks.',
            'Brings the queen dynamically into the position, tightening the tactical stranglehold.',
            'Accurate queen placement—coordinates the heavy artillery without creating targets.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }

      // Pawn moves
      if (isPawnMove) {
        const isPassedPawnPush = isEndgame || targetSq.endsWith('6') || targetSq.endsWith('7') || targetSq.endsWith('3') || targetSq.endsWith('2');
        if (isPassedPawnPush) {
          return pickVariant(
            [
              `Marches the passed pawn forward to ${targetSq}, stretching the defender’s resources to the limit.`,
              `Pushes the passed pawn to ${targetSq}! A menacing advance that demands immediate attention.`,
              `Advances the dangerous passed pawn on ${targetSq}, inching closer to an unstoppable promotion.`,
            ],
            plyIndex,
            moveSan,
            salt
          );
        }
        if (['d4', 'e4', 'd5', 'e5', 'c4', 'c5'].includes(targetSq)) {
          return pickVariant(
            [
              `A classical central pawn thrust to ${targetSq}, fighting aggressively for territorial space.`,
              `Claims central space on ${targetSq} and opens vital diagonals for harmonious development.`,
              `Strikes at the center on ${targetSq}, disputing control of vital central squares.`,
            ],
            plyIndex,
            moveSan,
            salt
          );
        }
        return pickVariant(
          [
            'A sound, principled pawn move that improves the pawn skeleton and gains space.',
            'Solid pawn push, reinforcing the structure while denying key squares to enemy pieces.',
            'Useful pawn advance, carving out breathing room and solidifying the position.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }

      // Endgame King Activation
      if (isEndgame && moveSan.startsWith('K')) {
        return pickVariant(
          [
            'Activates the king! In the endgame, the king transforms from a liability into a dominant attacker.',
            'Marches the king toward the center to escort passed pawns and restrict the enemy monarch.',
            'King activation at its finest. Takes command of key opposition squares in the endgame.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }

      return pickVariant(
        [
          'Pinpoint accuracy. This is the top engine recommendation and handles the position cleanly.',
          'The strongest move on the board. Direct, accurate, and in complete control of the position.',
          'Engine-perfect choice. Navigates the position with total clarity and purpose.',
        ],
        plyIndex,
        moveSan,
        salt
      );
    }

    case 'excellent': {
      if (isCastle) {
        return pickVariant(
          [
            'Solid castling choice that secures the king before central lines open up.',
            'Safely tucks the king away and links the back row rooks together.',
            'Good timing to castle and mobilize the heavy pieces for the middlegame.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      if (isCapture) {
        return pickVariant(
          [
            'A strong capture that keeps the structure healthy and pieces active.',
            'Solid take! Keeps piece coordination intact while reducing enemy attacking pressure.',
            'Good trade that cleans up the central tension without creating weaknesses.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      if (isCheck) {
        return pickVariant(
          [
            'An active check that maintains a pleasant attacking tempo.',
            'Forcing check that keeps the opposing king alert and uncomfortable.',
            'A lively check that maintains the initiative and limits opponent options.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      return pickVariant(
        [
          'Strong, natural play. It keeps full control without inviting unnecessary complications.',
          'An excellent move that improves the position and keeps the initiative rolling.',
          'Very well played! Clear, purposeful, and keeps the game plan moving smoothly forward.',
        ],
        plyIndex,
        moveSan,
        salt
      );
    }

    case 'good': {
      if (isCapture) {
        return pickVariant(
          [
            'A sensible trade that maintains the balance of the position.',
            'A fair liquidation that keeps the pieces in working order.',
            'A sound capture that keeps the position safe and steady.',
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      return pickVariant(
        [
          'A solid, sensible move that keeps the position steady and avoids structural weaknesses.',
          'A dependable move that preserves the structure and keeps things balanced.',
          'Practical and safe. It gets the job done without overcomplicating the board.',
        ],
        plyIndex,
        moveSan,
        salt
      );
    }

    case 'inaccuracy': {
      if (isCapture && friendlyBest) {
        return pickVariant(
          [
            `Taking here releases the tension too early. ${friendlyBest} would have kept the squeeze on.`,
            `Grabbing this piece eases the pressure on the opponent. ${friendlyBest} was sharper.`,
            `Capturing here lets the opponent off the hook. ${friendlyBest} was much more restrictive.`,
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      if (friendlyBest) {
        return pickVariant(
          [
            `A bit inaccurate—this gives the opponent breathing room. ${friendlyBest} was the strongest way to press.`,
            `A slight slip that lets a bit of the initiative slide away. ${friendlyBest} was cleaner.`,
            `Not the most precise. ${friendlyBest} would have kept tighter control over the position.`,
            `Slightly passive. ${friendlyBest} was more purposeful and active.`,
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      return pickVariant(
        [
          'A slight inaccuracy that lets the opponent off the hook.',
          'A small inaccuracy that gives away some hard-earned momentum.',
          'Not quite on target, giving the other side a moment to regroup.',
        ],
        plyIndex,
        moveSan,
        salt
      );
    }

    case 'mistake': {
      if (isCapture && friendlyBest) {
        return pickVariant(
          [
            `Taking here opens up counterplay lines for the opponent. ${friendlyBest} was much more commanding.`,
            `This capture misjudges the tactical aftermath. ${friendlyBest} maintained total control.`,
            `Grabbing material here allows strong counter-punches. ${friendlyBest} was much safer.`,
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      if (friendlyBest) {
        return pickVariant(
          [
            `A tactical slip that surrenders the advantage. ${friendlyBest} was needed to stay in command.`,
            `A clear mistake that swings momentum the other way. ${friendlyBest} was the way to go.`,
            `This lets the opponent seize the upper hand. ${friendlyBest} was needed to hold the position.`,
            `A costly misjudgment. ${friendlyBest} preserved piece coordination and control.`,
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      return pickVariant(
        [
          'A mistake that gives the opponent an opening to fight back and equalize.',
          'A costly misstep that hands over the initiative.',
          'A difficult mistake that undoes good prior work.',
        ],
        plyIndex,
        moveSan,
        salt
      );
    }

    case 'miss': {
      if (friendlyBest) {
        return pickVariant(
          [
            `Missed an opportunity! ${friendlyBest} was a decisive tactical strike left on the table.`,
            `A golden chance went by! ${friendlyBest} would have punished the opponent immediately.`,
            `Overlooked a powerful winning idea: ${friendlyBest} was right there for the taking.`,
            `Overlooked a tactical breakthrough. ${friendlyBest} was a direct winning blow.`,
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      return pickVariant(
        [
          'A missed chance to punish the opponent’s previous slip.',
          'An opportunity slipped away here, letting the position stay level.',
          'Missed a great chance to crack open the position.',
        ],
        plyIndex,
        moveSan,
        salt
      );
    }

    case 'blunder': {
      if (friendlyBest) {
        return pickVariant(
          [
            `A critical blunder that drops material or compromises king safety. ${friendlyBest} was essential here.`,
            `Major tactical oversight! ${friendlyBest} was required to keep the position intact.`,
            `A heavy blunder that turns the tables completely. ${friendlyBest} was the only way to hold.`,
            `A devastating blunder. ${friendlyBest} was necessary to avoid immediate disaster.`,
          ],
          plyIndex,
          moveSan,
          salt
        );
      }
      return pickVariant(
        [
          'A costly blunder that dramatically shifts the game evaluation.',
          'A severe oversight that gives away the game.',
          'A disastrous blunder that puts the opponent in complete command.',
        ],
        plyIndex,
        moveSan,
        salt
      );
    }

    default:
      return pickVariant(
        [
          'Move played in the game.',
          'Play continues from this position.',
          'Standard move played on the board.',
        ],
        plyIndex,
        moveSan,
        salt
      );
  }
}
