import { MoveClassification } from '../models/analysis.model';

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
  if (san === 'O-O') return 'Kingside Castle (O-O)';
  if (san === 'O-O-O') return 'Queenside Castle (O-O-O)';
  return san;
}

export function getCoachCommentary(
  classification: MoveClassification,
  moveSan: string,
  bestMoveSan: string | null = null,
  plyIndex = 0,
  openingName: string | null = null
): string {
  const isMate = moveSan.includes('#');
  const isCheck = moveSan.includes('+');
  const isCastle = moveSan.startsWith('O-O');
  const isCapture = moveSan.includes('x');
  const friendlyBest = bestMoveSan ? formatFriendlyMove(bestMoveSan) : null;

  if (isMate) {
    return pickVariant(
      [
        'Checkmate! A decisive final strike that finishes the contest cleanly.',
        'Checkmate! The king is completely cornered with nowhere left to run.',
        'Game over! A clinical and ruthless mating net.',
      ],
      plyIndex,
      moveSan
    );
  }

  if (classification === 'book') {
    if (openingName) {
      return pickVariant(
        [
          `Standard opening book theory in the ${openingName}.`,
          `Mainline preparation in the ${openingName}—solid and well-studied.`,
          `Grandmaster theory in the ${openingName}. Right on textbook track.`,
        ],
        plyIndex,
        moveSan
      );
    }
    return pickVariant(
      [
        'Standard opening theory, developing pieces according to classical principles.',
        'Solid textbook move, establishing territory and piece harmony.',
        'Well-known theoretical continuation.',
      ],
      plyIndex,
      moveSan
    );
  }

  switch (classification) {
    case 'brilliant':
      if (isCapture) {
        return pickVariant(
          [
            'A brilliant tactical sacrifice! You calculated through the complications and tore open the defense.',
            'Sensational capture! Sacrificing piece value for overwhelming positional dominance.',
            'A sparkling strike! You accepted material imbalance to seal victory.',
          ],
          plyIndex,
          moveSan
        );
      }
      return pickVariant(
        [
          'Brilliant move! You found a deep and hidden tactical resource that flips the game.',
          'Grandmaster-tier vision! An inspired move that completely disorients the opponent.',
          'Pure genius on the board! A brilliant tactical finesse.',
        ],
        plyIndex,
        moveSan
      );

    case 'great':
      return pickVariant(
        [
          'Great move! You found the sharpest tactical continuation on the board.',
          'An energetic and precise strike that keeps total pressure on the defense.',
          'A key move! You capitalized on the position with absolute clarity.',
        ],
        plyIndex,
        moveSan
      );

    case 'best':
      return pickVariant(
        [
          'The best move in the position. Clean, accurate, and optimal.',
          'Top engine choice! Maximizing your piece activity and controlling the tempo.',
          'Optimal move. You maintained peak advantage without conceding any counterplay.',
        ],
        plyIndex,
        moveSan
      );

    case 'excellent':
      return pickVariant(
        [
          'Excellent play! Very close to the best move, keeping strong pressure.',
          'A very strong, natural continuation that maintains your initiative.',
          'Solid execution. You keep the initiative without allowing any tactical holes.',
        ],
        plyIndex,
        moveSan
      );

    case 'good':
      return pickVariant(
        [
          'A good, sensible move that keeps the game on track.',
          'Solid and playable. While sharper moves existed, this is steady.',
          'Keeps your pieces coordinating well.',
        ],
        plyIndex,
        moveSan
      );

    case 'inaccuracy':
      if (friendlyBest) {
        return pickVariant(
          [
            `Slight inaccuracy. ${friendlyBest} was more active and preserved the initiative.`,
            `A small concession. ${friendlyBest} would have given firmer central control.`,
            `Minor slip. Better was ${friendlyBest} to maintain the tempo.`,
          ],
          plyIndex,
          moveSan
        );
      }
      return 'Slight inaccuracy. There was a more active and dynamic continuation available.';

    case 'mistake':
      if (friendlyBest) {
        return pickVariant(
          [
            `A mistake that surrenders the initiative. ${friendlyBest} was much stronger.`,
            `Tactical slip. Playing ${friendlyBest} was critical to keep equality.`,
            `This move invites counterplay. ${friendlyBest} would have solved your problems.`,
          ],
          plyIndex,
          moveSan
        );
      }
      return 'A mistake that shifts the advantage toward your opponent.';

    case 'miss':
      if (friendlyBest) {
        return pickVariant(
          [
            `Missed tactical opportunity! ${friendlyBest} would have won decisive material.`,
            `You overlooked a powerful tactic with ${friendlyBest}.`,
            `A missed chance! ${friendlyBest} immediately punished the opponent's position.`,
          ],
          plyIndex,
          moveSan
        );
      }
      return 'Missed win or tactic. You missed an immediate chance to seize a winning advantage.';

    case 'blunder':
      if (friendlyBest) {
        return pickVariant(
          [
            `Major blunder! This hangs material or tactical weakness. ${friendlyBest} was required.`,
            `Game-changing blunder. ${friendlyBest} was necessary to avoid severe damage.`,
            `Disaster on the board! Playing ${friendlyBest} would have kept you in the game.`,
          ],
          plyIndex,
          moveSan
        );
      }
      return 'Major blunder! This drastically swings the game in your opponent’s favor.';

    default:
      return 'Position played.';
  }
}
