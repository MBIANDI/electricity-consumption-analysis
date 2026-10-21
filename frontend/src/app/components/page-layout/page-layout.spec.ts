import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Chart } from '../shared/chart';
import { routes } from '../../app.routes';
import { provideReadyDashboard } from '../../testing/dashboard-testing';

describe('PageLayout', () => {
  it('links home and marks only the current view as the current page', async () => {
    TestBed.overrideComponent(Chart, { set: { template: '', imports: [] } });
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideReadyDashboard()] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/profil-journalier');

    const element = harness.routeNativeElement as HTMLElement;
    const home = element.querySelector('a.brand');
    expect(home?.getAttribute('href')).toBe('/');
    expect(home?.getAttribute('aria-label')).toBe('Accueil');

    const current = Array.from(element.querySelectorAll('nav a[aria-current="page"]'));
    expect(current.map((link) => link.textContent)).toEqual(['Profil journalier']);
    expect(element.querySelectorAll('nav a')).toHaveLength(3);
  });
});
