import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../services/settings.service';
import { SoundService } from '../../../services/sound.service';
import { AuthService } from '../../../services/auth.service';
import { AppTheme, BOARD_THEMES, BoardTheme, MEME_SOUND_PACKS, MemeSoundPack } from '../../../models/settings.model';
import { IconComponent } from '../../icon/icon.component';
import { VALID_PROMO_CODES } from '../../../models/auth.model';

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
  readonly auth = inject(AuthService);

  readonly boardThemes = BOARD_THEMES;
  readonly soundPacks = MEME_SOUND_PACKS;
  readonly samplePromoCodes = VALID_PROMO_CODES.slice(0, 3);

  readonly promoCodeInput = signal<string>('');
  readonly promoStatusMessage = signal<string | null>(null);
  readonly promoStatusIsError = signal<boolean>(false);
  readonly isRedeemingPromo = signal<boolean>(false);

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

  applyPromoPreset(code: string): void {
    this.promoCodeInput.set(code);
    this.promoStatusMessage.set(null);
  }

  async redeemPromoCode(): Promise<void> {
    const code = this.promoCodeInput().trim();
    if (!code) {
      this.promoStatusIsError.set(true);
      this.promoStatusMessage.set('Please enter a promo code before redeeming.');
      return;
    }

    this.isRedeemingPromo.set(true);
    this.promoStatusMessage.set(null);

    try {
      const result = await this.auth.redeemPromoCode(code);
      this.promoStatusIsError.set(!result.success);
      this.promoStatusMessage.set(result.message);
      if (result.success) {
        this.promoCodeInput.set('');
      }
    } finally {
      this.isRedeemingPromo.set(false);
    }
  }

  openAuthModal(): void {
    this.auth.openAuthModal();
  }

  resetDefaults(): void {
    this.settings.resetToDefaults();
    this.settings.flashToast('SETTINGS RESET');
  }
}
