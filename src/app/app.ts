import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { SupportModalComponent } from './components/support-modal/support-modal.component';
import { ExtensionModalComponent } from './components/extension-modal/extension-modal.component';
import { IconComponent } from './components/icon/icon.component';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    SupportModalComponent,
    ExtensionModalComponent,
    IconComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  readonly settings = inject(SettingsService);
}
export { App as AppComponent };
