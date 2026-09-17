export type BoardTheme =
  | 'green'
  | 'wood'
  | 'slate'
  | 'dark'
  | 'ocean'
  | 'coral'
  | 'brutal';

export interface BoardThemeOption {
  id: BoardTheme;
  name: string;
  light: string;
  dark: string;
  accent: string;
  description: string;
}

export const BOARD_THEMES: BoardThemeOption[] = [
  {
    id: 'green',
    name: 'Tournament Green',
    light: '#ECECD8',
    dark: '#739552',
    accent: '#FF4F00',
    description: 'Classic FIDE tournament vinyl board colors.',
  },
  {
    id: 'wood',
    name: 'Classic Wood',
    light: '#F0D9B5',
    dark: '#B58863',
    accent: '#0E4C92',
    description: 'Natural maple and walnut wood aesthetic.',
  },
  {
    id: 'slate',
    name: 'Slate Blue',
    light: '#DEE3E6',
    dark: '#8CA2AD',
    accent: '#FF4F00',
    description: 'Clean modern slate blue palette.',
  },
  {
    id: 'dark',
    name: 'Dark Charcoal',
    light: '#767A85',
    dark: '#2E3036',
    accent: '#0E4C92',
    description: 'Stealth charcoal with high-contrast piece visibility.',
  },
  {
    id: 'ocean',
    name: 'Vibrant Ocean',
    light: '#DBE4EB',
    dark: '#41729F',
    accent: '#FF4F00',
    description: 'Refreshing deep sea marine blue.',
  },
  {
    id: 'coral',
    name: 'Warm Coral',
    light: '#F1ECE1',
    dark: '#B35656',
    accent: '#0E4C92',
    description: 'Warm terracotta and soft cream tone.',
  },
  {
    id: 'brutal',
    name: 'Monochrome Bold',
    light: '#FFFFFF',
    dark: '#C0C0C0',
    accent: '#FF4F00',
    description: 'High-contrast clean monochrome board style.',
  },
];

export type MemeSoundPack = 'meme' | 'arcade' | 'cartoon' | 'classical' | 'shuffle';

export interface MemePackOption {
  id: MemeSoundPack;
  name: string;
  badge: string;
  description: string;
}

export const MEME_SOUND_PACKS: MemePackOption[] = [
  {
    id: 'meme',
    name: 'Meme Vault',
    badge: 'Popular',
    description: 'Vine Boom, FAHHH, Brother Eww, Bruh, Anime Wow, MLG Airhorn',
  },
  {
    id: 'arcade',
    name: '8-Bit Arcade',
    badge: 'Retro',
    description: 'Chiptune coin chimes, laser zaps, power-ups, bit-crush explosions',
  },
  {
    id: 'cartoon',
    name: 'Cartoon Slapstick',
    badge: 'Funny',
    description: 'Slide whistles, spring boings, rubber duck squeaks, punch BAM!',
  },
  {
    id: 'classical',
    name: 'Classical Symphony',
    badge: 'Orchestral',
    description: 'Grand piano chords, orchestral bells, harp glissando, timpani',
  },
  {
    id: 'shuffle',
    name: 'Chaos Shuffle',
    badge: 'Dynamic',
    description: 'Dynamic mix rotating through all viral sounds across every move',
  },
];

export type AppTheme = 'light' | 'dark';

export interface UserSettings {
  appTheme: AppTheme;
  boardTheme: BoardTheme;
  moveSounds: boolean;
  memeSounds: boolean;
  memePack: MemeSoundPack;
  volume: number; // 0 - 100
  analysisDepth: number; // 10 - 22
  autoEvaluation: boolean;
  autoQueen: boolean;
  showEvalBar: boolean;
  chesscomUsername: string;
  lichessUsername: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  appTheme: 'light',
  boardTheme: 'green',
  moveSounds: true,
  memeSounds: true,
  memePack: 'meme',
  volume: 75,
  analysisDepth: 14,
  autoEvaluation: true,
  autoQueen: true,
  showEvalBar: true,
  chesscomUsername: '',
  lichessUsername: '',
};
