import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../services/settings.service';
import { SoundService } from '../../../services/sound.service';
import { VoiceCommentaryService } from '../../../services/voice-commentary.service';
import {
  AppTheme,
  BOARD_THEMES,
  BoardTheme,
  COMMENTARY_VOICES,
  CommentaryVoice,
  MEME_SOUND_PACKS,
  MemeSoundPack,
  VoiceEngine,
} from '../../../models/settings.model';
import { IconComponent } from '../../icon/icon.component';

@Component({
  selector: 'app-settings-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './settings-tab.component.html',
  styleUrls: ['./settings-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTabComponent {
  readonly settings = inject(SettingsService);
  readonly soundService = inject(SoundService);
  readonly voiceService = inject(VoiceCommentaryService);

  readonly boardThemes = BOARD_THEMES;
  readonly soundPacks = MEME_SOUND_PACKS;
  readonly commentaryVoices = COMMENTARY_VOICES;

  readonly depthPresets = [
    { depth: 10, label: '10', name: 'Fast' },
    { depth: 12, label: '12', name: 'Quick' },
    { depth: 14, label: '14', name: 'Standard' },
    { depth: 16, label: '16', name: 'Deep' },
    { depth: 18, label: '18', name: 'Master' },
    { depth: 20, label: '20', name: 'GM' },
    { depth: 22, label: '22', name: 'Ultra' },
  ];

  selectAppTheme(theme: AppTheme): void {
    this.settings.setAppTheme(theme);
    this.settings.flashToast(theme === 'dark' ? 'DARK MODE ACTIVATED' : 'LIGHT MODE ACTIVATED');
  }

  selectBoardTheme(theme: BoardTheme): void {
    this.settings.setBoardTheme(theme);
    this.settings.flashToast('BOARD THEME APPLIED');
  }

  selectSoundPack(pack: MemeSoundPack): void {
    this.settings.setMemePack(pack);
    this.settings.setMemeSounds(true);
    this.soundService.setMuted(false);
    this.settings.flashToast('AUDIO PACK SELECTED');
  }

  previewSoundPack(pack: MemeSoundPack, event: Event): void {
    event.stopPropagation();
    this.soundService.playRandomPackSound(pack, this.settings.volume());
  }

  toggleVoiceCommentary(): void {
    const nextState = !this.settings.voiceCommentary();
    this.settings.setVoiceCommentary(nextState);
    if (nextState) {
      this.settings.flashToast('AI VOICE COMMENTARY ACTIVATED');
      if (this.settings.voiceEngine() === 'neural') {
        this.voiceService.initModel();
      }
    } else {
      this.voiceService.stop();
      this.settings.flashToast('AI VOICE COMMENTARY DISABLED');
    }
  }

  selectVoiceEngine(engine: VoiceEngine): void {
    this.settings.setVoiceEngine(engine);
    if (engine === 'neural') {
      this.settings.flashToast('SUPERTONIC 2 NEURAL ENGINE ACTIVATED');
      this.voiceService.initModel();
    } else {
      this.settings.flashToast('INSTANT NATIVE SPEECH (0s LAG)');
    }
  }

  selectVoice(voice: CommentaryVoice): void {
    this.settings.setCommentaryVoice(voice);
    this.settings.setVoiceCommentary(true);
    this.settings.flashToast('VOICE PROFILE UPDATED');
  }

  testVoice(voice?: CommentaryVoice, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.voiceService.testVoice(voice);
  }

  onCommentarySpeedChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.settings.setCommentarySpeed(val);
  }

  onVolumeChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.settings.setVolume(val);
  }

  onDepthChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.settings.setAnalysisDepth(val);
  }

  setDepth(depth: number): void {
    this.settings.setAnalysisDepth(depth);
    this.settings.flashToast(`DEPTH SET TO ${depth} PLIES`);
  }

  getDepthDescription(depth: number): string {
    switch (depth) {
      case 10:
        return 'Fastest response — ideal for instant tactical checks on slower devices.';
      case 12:
        return 'Quick & snappy — balanced calculation speed with high accuracy.';
      case 14:
        return 'Standard depth — solid tournament-grade analysis with precise CAPS.';
      case 16:
        return 'Deep calculation — checks multi-move tactical combinations.';
      case 18:
        return 'Master level — comprehensive evaluation of positional subtleties.';
      case 20:
        return 'Grandmaster depth — finds deep endgame motifs and quiet sacrifices.';
      case 22:
      default:
        return 'Ultra maximum depth — full exhaustive search for critical positions.';
    }
  }

  openSupportModal(): void {
    this.settings.openSupportModal();
  }

  resetDefaults(): void {
    this.settings.resetToDefaults();
    this.settings.flashToast('SETTINGS RESET');
  }
}
