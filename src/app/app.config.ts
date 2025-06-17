import { ApplicationConfig, provideZoneChangeDetection, isDevMode, LOCALE_ID } from '@angular/core';

import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'; // Importe este
import { provideHttpClient, withFetch } from '@angular/common/http'; // Adicione withFetch se for usar o fetch API internamente pelo HttpClient

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';

import { registerLocaleData } from '@angular/common'; // Adicione esta linha
import localePt from '@angular/common/locales/pt'; // Adicione esta linha

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(), // Adicione esta linha para animações do Angular Material
    provideHttpClient(withFetch()), // Adicione para requisições HTTP se necessário
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    { provide: LOCALE_ID, useValue: 'pt-BR' }
  ]
};