import { MoveClassification } from '../models/analysis.model';

/**
 * Deterministically pick an option from a pool so commentary stays consistent
 * when stepping back/forth through moves.
 */
function pickVariant(options: string[], plyIndex: number, moveSan: string): string {
  if (options.length === 0) return '';
  let hash = plyIndex * 31;
  for (let i = 0; i < moveSan.length; i++) {
    hash = (hash * 17 + moveSan.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % options.length;
  return options[index];
}

export function formatFriendlyMove(san: string): string {
  if (san === 'O-O') return 'Castling kingside (O-O)';
  if (san === 'O-O-O') return 'Castling queenside (O-O-O)';
  return san;
}

export function getCoachCommentary(
  c: MoveClassification,
  moveSan: string,
  bestMoveSan: string | null = null,
  plyIndex = 0,
  openingName: string | null = null
): string {
  const isMate = moveSan.includes('#');
  const isCheck = moveSan.includes('+');
  const isCastle = moveSan.startsWith('O-O');
  const isCapture = moveSan.includes('x');
  const isPromotion = moveSan.includes('=');
  const isEarlyPhase = plyIndex < 14;
  const isEndgame = plyIndex > 40;
  const friendlyBest = bestMoveSan ? formatFriendlyMove(bestMoveSan) : null;

  if (isMate) {
    return pickVariant(
      [
        'Checkmate! A decisive final blow that wraps up the game on the spot.',
        'Checkmate! That puts the game away with zero escape.',
        'Game over! A clinical and unstoppable mating finish.',
      ],
      plyIndex,
      moveSan
    );
  }

  if (c === 'book') {
    if (openingName) {
      return pickVariant(
        [
          `Standard opening book theory in the ${openingName}.`,
          `Mainline preparation in the ${openingName}—solid and well-studied.`,
          `Theory in the ${openingName}. Right out of grandmaster repertoire.`,
        ],
        plyIndex,
        moveSan
      );
    }
    return pickVariant(
      [
        'Follows established grandmaster book theory right out of the opening textbook.',
        'Well-known opening line. You are sticking to solid theoretical principles.',
        'Standard opening theory, preparing your pieces without losing a beat.',
      ],
      plyIndex,
      moveSan
    );
  }

  switch (c) {
    case 'brilliant':
      if (isCapture) {
        return pickVariant(
          [
            'A brilliant sacrifice! You saw through the complications and shattered the defense.',
            'Incredible capture! Sacrificing material to break open the opponent’s king.',
            'A sparkling strike! You traded piece value for overwhelming attacking momentum.',
          ],
          plyIndex,
          moveSan
        );
      }
      if (isCheck) {
        return pickVariant(
          [
            'A sensational check! Sacrificing material to drag the enemy king into a mating net.',
            'Stunning check! This forces the king into the open with nowhere to hide.',
            'Electrifying move! The check completely breaks their defensive setup.',
          ],
          plyIndex,
          moveSan
        );
      }
      return pickVariant(
        [
          'An inspired tactical masterpiece! You found a stunning idea that turns the entire position.',
          'Brilliant intuition! An unexpected resource that catches the opponent completely off guard.',
          'Pure genius! A bold, game-defining idea that takes over the board.',
        ],
        plyIndex,
        moveSan
      );

    case 'great':
      if (isCapture) {
        return pickVariant(
          [
            'Sharp and incisive! A critical capture that keeps the tactical pressure burning.',
            'A clutch capture! Eliminates a key defender and keeps the initiative alive.',
            'Excellent trade! You calculated the liquidation perfectly.',
          ],
          plyIndex,
          moveSan
        );
      }
      if (isCheck) {
        return pickVariant(
          [
            'A vital check that forces the defense onto their back foot.',
            'A sharp and timely check that disrupts the opponent’s coordination.',
            'Strong checking move! It creates serious headaches for the defending king.',
          ],
          plyIndex,
          moveSan
        );
      }
      if (isCastle) {
        return pickVariant(
          [
            'A great defensive decision to get the king off the open file and prepare counterplay.',
            'Smart castling! King safely tucked away just before the board catches fire.',
            'Timely castle! Solidifies king safety while mobilizing the back-rank rook.',
          ],
          plyIndex,
          moveSan
        );
      }
      return pickVariant(
        [
          'A fantastic find! You spotted the critical resource to keep your initiative alive.',
          'High-level play! You found the only move that keeps the pressure on.',
          'Great vision! This clever maneuver creates real positional problems for the other side.',
        ],
        plyIndex,
        moveSan
      );

    case 'best':
      if (isCastle) {
        return pickVariant(
          [
            'Tucks the king away safely and connects the rooks for the middlegame.',
            'Castles at the ideal moment, tucking the king safe and readying the rooks.',
            'King tucked away into safety while bringing a rook straight into the fight.',
          ],
          plyIndex,
          moveSan
        );
      }
      if (isPromotion) {
        return pickVariant(
          [
            'Promotes the pawn, putting overwhelming winning pressure on the board.',
            'Pawn push converted to a fresh piece! The winning conversion is underway.',
            'Promotion! Bringing new heavy artillery to seal the game.',
          ],
          plyIndex,
          moveSan
        );
      }
      if (isCapture) {
        return pickVariant(
          [
            'The cleanest capture on the board, winning material with zero counterplay.',
            'Precise capture! You take the piece and leave the opponent with zero answers.',
            'Crisp liquidation. Taking here preserves your winning edge.',
          ],
          plyIndex,
          moveSan
        );
      }
      if (isCheck) {
        return pickVariant(
          [
            'A crisp check that keeps the initiative firmly in your hands.',
            'Accurate check that keeps the pressure mounting on every turn.',
            'Direct and forcing check—leaves no room for defensive counter-punches.',
          ],
          plyIndex,
          moveSan
        );
      }
      if (isEarlyPhase) {
        if (moveSan.startsWith('N')) {
          return pickVariant(
            [
              'Develops the knight actively toward the center to control vital outposts.',
              'Jumps the knight into the action, staking an immediate claim in the center.',
              'Ideal knight development, keeping flexible tabs on key central squares.',
            ],
            plyIndex,
            moveSan
          );
        }
        if (moveSan.startsWith('B')) {
          return pickVariant(
            [
              'Brings the bishop onto an active diagonal with long-range scope.',
              'Smooth bishop development, placing eye-pressure down an open highway.',
              'Active bishop placement that coordinates quickly with your minor pieces.',
            ],
            plyIndex,
            moveSan
          );
        }
        if (/^[a-h]/.test(moveSan)) {
          return pickVariant(
            [
              'Claims central space and opens up diagonals for harmonious piece development.',
              'A textbook pawn thrust fighting directly for control of the center.',
              'Gains vital breathing room and stakes an early territorial claim.',
            ],
            plyIndex,
            moveSan
          );
        }
      }
      if (isEndgame && moveSan.startsWith('K')) {
        return pickVariant(
          [
            'Activates the king—a critical principle to control key squares in the endgame.',
            'Marches the king up the board to support your passed pawns.',
            'King activation at its finest. The monarch becomes an aggressive attacker in the endgame.',
          ],
          plyIndex,
          moveSan
        );
      }
      return pickVariant(
        [
          'Pinpoint accuracy. This is the top engine recommendation and handles the position cleanly.',
          'The strongest move on the board. Direct, accurate, and completely in control.',
          'Engine-perfect choice. You navigated the position with total clarity.',
        ],
        plyIndex,
        moveSan
      );

    case 'excellent':
      if (isCastle) {
        return pickVariant(
          [
            'Safely tucks the king away and activates the rooks for the coming fight.',
            'Solid castling choice that secures your king before central lines open up.',
            'Good timing to castle and link the back row together.',
          ],
          plyIndex,
          moveSan
        );
      }
      if (isCapture) {
        return pickVariant(
          [
            'A strong capture that keeps your structure healthy and pieces active.',
            'Solid take! Keeps piece coordination intact while reducing enemy pressure.',
            'Good trade that cleans up the tension without creating weaknesses.',
          ],
          plyIndex,
          moveSan
        );
      }
      if (isCheck) {
        return pickVariant(
          [
            'An active check that keeps the tempo moving forward.',
            'Forcing check that maintains a pleasant attacking rhythm.',
            'A lively check keeping the opposing king on uncomfortable alert.',
          ],
          plyIndex,
          moveSan
        );
      }
      return pickVariant(
        [
          'Strong, natural play. It keeps full control without inviting any unnecessary complications.',
          'An excellent move that improves your position and keeps the initiative rolling.',
          'Very well played! Clear, purposeful, and keeps your plan moving forward.',
        ],
        plyIndex,
        moveSan
      );

    case 'good':
      if (isCapture) {
        return pickVariant(
          [
            'A sensible trade that maintains the balance of the position.',
            'A fair liquidation that keeps your pieces in working order.',
            'A sound capture that keeps your position safe and steady.',
          ],
          plyIndex,
          moveSan
        );
      }
      return pickVariant(
        [
          'A solid, sensible move that keeps the position steady and avoids weaknesses.',
          'A dependable move that preserves your structure and keeps things balanced.',
          'Practical and safe. It gets the job done without overcomplicating the board.',
        ],
        plyIndex,
        moveSan
      );

    case 'inaccuracy':
      if (isCapture && friendlyBest) {
        return pickVariant(
          [
            `Taking here releases the tension too early. ${friendlyBest} would have kept the pressure on.`,
            `Grabbing this piece eases the squeeze on your opponent. ${friendlyBest} was sharper.`,
            `Capturing here lets the opponent off the hook. ${friendlyBest} was much more restrictive.`,
          ],
          plyIndex,
          moveSan
        );
      }
      if (friendlyBest) {
        return pickVariant(
          [
            `A bit inaccurate—this gives the opponent breathing room. ${friendlyBest} was the strongest way to press your advantage.`,
            `A slight slip. You let a bit of the initiative slide away. ${friendlyBest} was cleaner.`,
            `Not the most precise. ${friendlyBest} would have kept tighter control over the position.`,
          ],
          plyIndex,
          moveSan
        );
      }
      return pickVariant(
        [
          'A slight inaccuracy that lets the opponent off the hook.',
          'A small inaccuracy that gives away some of your hard-earned momentum.',
          'Not quite on target, giving the other side a moment to regroup.',
        ],
        plyIndex,
        moveSan
      );

    case 'mistake':
      if (isCapture && friendlyBest) {
        return pickVariant(
          [
            `Taking here opens up lines for the opponent. ${friendlyBest} was much more commanding.`,
            `This capture misjudges the tactical aftermath. ${friendlyBest} kept you in total control.`,
            `Grabbing material here allows strong counterplay. ${friendlyBest} was much safer.`,
          ],
          plyIndex,
          moveSan
        );
      }
      if (friendlyBest) {
        return pickVariant(
          [
            `A tactical slip that surrenders the advantage. ${friendlyBest} would have kept you in command.`,
            `A clear mistake that swings momentum the other way. ${friendlyBest} was the way to go.`,
            `This lets the opponent seize the upper hand. ${friendlyBest} was needed to hold the position.`,
          ],
          plyIndex,
          moveSan
        );
      }
      return pickVariant(
        [
          'A mistake that gives the opponent an opening to fight back and equalize.',
          'A costly misstep that hands over the initiative.',
          'A difficult mistake that undoes some of your good work.',
        ],
        plyIndex,
        moveSan
      );

    case 'miss':
      if (friendlyBest) {
        return pickVariant(
          [
            `Missed an opportunity! ${friendlyBest} was a decisive tactical strike left on the table.`,
            `A golden chance went by! ${friendlyBest} would have punished the opponent immediately.`,
            `You overlooked a powerful winning idea: ${friendlyBest} was right there for the taking.`,
          ],
          plyIndex,
          moveSan
        );
      }
      return pickVariant(
        [
          'A missed chance to punish the opponent’s previous slip.',
          'An opportunity slipped away here, letting the position stay level.',
          'Missed a great chance to crack open the position.',
        ],
        plyIndex,
        moveSan
      );

    case 'blunder':
      if (friendlyBest) {
        return pickVariant(
          [
            `A critical blunder that drops material or compromises king safety. ${friendlyBest} was essential here.`,
            `Major tactical oversight! ${friendlyBest} was required to keep the position intact.`,
            `A heavy blunder that turns the tables completely. ${friendlyBest} was the only way to hold.`,
          ],
          plyIndex,
          moveSan
        );
      }
      return pickVariant(
        [
          'A costly blunder that dramatically shifts the game evaluation.',
          'A severe oversight that gives away the game.',
          'A disastrous blunder that puts the opponent in complete command.',
        ],
        plyIndex,
        moveSan
      );

    default:
      return pickVariant(
        [
          'Move played in the game.',
          'Play continues from this position.',
          'Standard move played on the board.',
        ],
        plyIndex,
        moveSan
      );
  }
}
