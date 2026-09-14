import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../services/settings.service';
import { SoundService } from '../../../services/sound.service';
import { AppTheme, BOARD_THEMES, BoardTheme, MEME_SOUND_PACKS, MemeSoundPack } from '../../../models/settings.model';
import { IconComponent } from '../../icon/icon.component';

@Component({
  selector: 'app-settings-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './settings-tab.component.html',
  styleUrls: ['./settings-tab.component.css'],
})
export class SettingsTabComponent {
  readonly settings = inject(SettingsService);
  readonly soundService = inject(SoundService);

  readonly boardThemes = BOARD_THEMES;
  readonly soundPacks = MEME_SOUND_PACKS;
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
    this.soundService.playReactionSound('best', pack, this.settings.volume());
  }

  onVolumeChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.settings.setVolume(val);
  }

  onDepthChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.settings.setAnalysisDepth(val);
  }

  resetDefaults(): void {
    this.settings.resetToDefaults();
    this.settings.flashToast('SETTINGS RESET');
  }
}
