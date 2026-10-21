import { UI } from './ui-strings';

export interface ViewLink {
  /** Route path, without leading slash. */
  path: string;
  label: string;
}

/** The three data views, in navigation order. Home is the `''` route. */
export const VIEWS: readonly ViewLink[] = [
  { path: 'consommation', label: UI.views.consumption },
  { path: 'profil-journalier', label: UI.views.profile },
  { path: 'qualite-des-donnees', label: UI.views.quality },
];
