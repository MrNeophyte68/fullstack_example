import { APPLICATION_PROVIDERS } from './app/composition.providers';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';
void bootstrapApplication(AppComponent, { providers: [provideZoneChangeDetection(), ...APPLICATION_PROVIDERS] });
