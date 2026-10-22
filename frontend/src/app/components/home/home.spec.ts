import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideReadyDashboard } from '../../testing/dashboard-testing';
import { Home } from './home';

describe('Home', () => {
  it('renders the h1, four view links and the overview', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideReadyDashboard()] });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toBe("Analyse de la consommation d'électricité");
    const links = Array.from(element.querySelectorAll('nav a'));
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Consommation', '/consommation'],
      ['Profil journalier', '/profil-journalier'],
      ['Qualité des données', '/qualite-des-donnees'],
      ['Qualité de service', '/qualite-de-service'],
    ]);
    expect(element.querySelectorAll('app-overview dt')).toHaveLength(6);
  });
});
