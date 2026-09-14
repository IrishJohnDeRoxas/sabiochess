import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

try {
  getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
    { teardown: { destroyAfterEach: true } }
  );
} catch {
  // Already initialized
}
