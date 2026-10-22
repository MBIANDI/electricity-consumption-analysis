import { Routes } from '@angular/router';
import { UI } from '@services/ui-strings';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: UI.appTitle,
    loadComponent: () => import('@components/home/home').then((m) => m.Home),
  },
  {
    path: '',
    loadComponent: () => import('@components/page-layout/page-layout').then((m) => m.PageLayout),
    children: [
      {
        path: 'consommation',
        title: `${UI.views.consumption} — ${UI.appTitle}`,
        loadComponent: () => import('@components/consumption/consumption').then((m) => m.Consumption),
      },
      {
        path: 'profil-journalier',
        title: `${UI.views.profile} — ${UI.appTitle}`,
        loadComponent: () => import('@components/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'qualite-des-donnees',
        title: `${UI.views.quality} — ${UI.appTitle}`,
        loadComponent: () => import('@components/quality/quality').then((m) => m.Quality),
      },
      {
        path: 'qualite-de-service',
        title: `${UI.views.voltage} — ${UI.appTitle}`,
        loadComponent: () => import('@components/voltage/voltage').then((m) => m.Voltage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
