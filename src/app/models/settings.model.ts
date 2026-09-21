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
    badge: 'Viral',
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

export type VoiceEngine = 'instant' | 'neural';

export type CommentaryVoice =
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'M1'
  | 'M2'
  | 'M3'
  | 'M4'
  | 'M5';

export interface VoiceOption {
  id: CommentaryVoice;
  name: string;
  accent: string;
  gender: 'Female' | 'Male';
  badge: string;
  description: string;
}

export const COMMENTARY_VOICES: VoiceOption[] = [
  {
    id: 'F1',
    name: 'Aria (Recommended)',
    accent: 'American',
    gender: 'Female',
    badge: 'Popular',
    description: 'Warm, highly expressive, and clear natural delivery.',
  },
  {
    id: 'M1',
    name: 'Marcus',
    accent: 'American',
    gender: 'Male',
    badge: 'Master',
    description: 'Deep, resonant, and calm grandmaster commentary tone.',
  },
  {
    id: 'M3',
    name: 'Arthur',
    accent: 'British',
    gender: 'Male',
    badge: 'British',
    description: 'Classic, crisp tournament commentator style.',
  },
  {
    id: 'F3',
    name: 'Camille',
    accent: 'European',
    gender: 'Female',
    badge: 'Articulate',
    description: 'Sophisticated and articulate analysis tone.',
  },
  {
    id: 'M2',
    name: 'Leo',
    accent: 'European',
    gender: 'Male',
    badge: 'Energetic',
    description: 'Punchy and upbeat play-by-play tactical narration.',
  },
  {
    id: 'F2',
    name: 'Elena',
    accent: 'European',
    gender: 'Female',
    badge: 'Expressive',
    description: 'Bright, energetic, and engaging play-by-play style.',
  },
  {
    id: 'F4',
    name: 'Beatriz',
    accent: 'European',
    gender: 'Female',
    badge: 'Narrative',
    description: 'Deep, calm, and insightful positional delivery.',
  },
  {
    id: 'M4',
    name: 'Gabriel',
    accent: 'European',
    gender: 'Male',
    badge: 'Deep',
    description: 'Authoritative and precise tactical breakdown.',
  },
  {
    id: 'F5',
    name: 'Ji-woo',
    accent: 'Asian',
    gender: 'Female',
    badge: 'Soft',
    description: 'Gentle, focused, and relaxed tactical guidance.',
  },
  {
    id: 'M5',
    name: 'Min-ho',
    accent: 'Asian',
    gender: 'Male',
    badge: 'Smooth',
    description: 'Smooth, measured, and strategic master insights.',
  },
];

export type AppTheme = 'light' | 'dark';

export interface UserSettings {
  appTheme: AppTheme;
  boardTheme: BoardTheme;
  moveSounds: boolean;
  memeSounds: boolean;
  memePack: MemeSoundPack;
  voiceCommentary: boolean;
  voiceEngine: VoiceEngine;
  commentaryVoice: CommentaryVoice;
  commentarySpeed: number;
  volume: number; // 0 - 100
  analysisDepth: number; // 10 - 22
  autoEvaluation: boolean;
  showEvalBar: boolean;
  showCandidateArrows: boolean;
  showCoordinates: boolean;
  showMoveClassifications: boolean;
  showLegalMoves: boolean;
  highlightLastMove: boolean;
  chesscomUsername: string;
  lichessUsername: string;
  isSupporter: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  appTheme: 'light',
  boardTheme: 'green',
  moveSounds: true,
  memeSounds: false,
  memePack: 'meme',
  voiceCommentary: false,
  voiceEngine: 'neural',
  commentaryVoice: 'F1',
  commentarySpeed: 1.05,
  volume: 75,
  analysisDepth: 14,
  autoEvaluation: true,
  showEvalBar: true,
  showCandidateArrows: true,
  showCoordinates: true,
  showMoveClassifications: true,
  showLegalMoves: true,
  highlightLastMove: true,
  chesscomUsername: '',
  lichessUsername: '',
  isSupporter: false,
};
