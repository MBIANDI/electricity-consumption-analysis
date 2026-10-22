import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Chart } from '@components/shared/chart';
import { routes } from './app.routes';
import { provideReadyDashboard } from './testing/dashboard-testing';

describe('routes', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    // Canvas rendering is not available in jsdom: routed views get an empty chart.
    TestBed.overrideComponent(Chart, { set: { template: '', imports: [] } });
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideReadyDashboard()] });
    harness = await RouterTestingHarness.create();
  });

  const element = (): HTMLElement => harness.fixture.nativeElement as HTMLElement;

  it('shows Home at the root', async () => {
    await harness.navigateByUrl('/');

    expect(element().querySelector('h1')?.textContent).toBe("Analyse de la consommation d'électricité");
  });

  it.each([
    ['/consommation', 'app-consumption'],
    ['/profil-journalier', 'app-profile'],
    ['/qualite-des-donnees', 'app-quality'],
    ['/qualite-de-service', 'app-voltage'],
  ])('shows the view for %s inside the page layout', async (url, selector) => {
    await harness.navigateByUrl(url);

    expect(TestBed.inject(Router).url).toBe(url);
    expect(element().querySelector('app-page-layout')).not.toBeNull();
    expect(element().querySelector(selector)).not.toBeNull();
  });

  it.each(['/vue-d-ensemble', '/nimporte/quoi'])('redirects %s to the root', async (url) => {
    await harness.navigateByUrl(url);

    expect(TestBed.inject(Router).url).toBe('/');
    expect(element().querySelector('h1')).not.toBeNull();
  });
});
