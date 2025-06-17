import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SettingsComponent } from './settings/settings.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' }, // Redireciona a raiz para /home
  { path: 'home', component: HomeComponent, title: 'Calculadora' },
  { path: 'settings', component: SettingsComponent, title: 'Configurações da Calculadora' },
  { path: '**', redirectTo: '/home' } // Rota curinga para qualquer caminho não encontrado
];