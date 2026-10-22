import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { makeDashboard } from '../../testing/dashboard-fixture';
import { Overview } from './overview';

describe('Overview', () => {
  it('shows the six KPIs and the action title', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Overview);
    fixture.componentRef.setInput('data', makeDashboard());
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const labels = Array.from(element.querySelectorAll('dt')).map((node) => node.textContent);
    expect(labels).toEqual([
      'Énergie totale',
      'Moyenne journalière',
      'Puissance de pointe',
      'Puissance de base',
      'Conformité de la tension',
      'Couverture des données',
    ]);
    expect(element.querySelector('h2')?.textContent).toContain('74');
  });

  it('shows the voltage conformity and links to the service quality view', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Overview);
    fixture.componentRef.setInput('data', makeDashboard());
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const kpi = Array.from(element.querySelectorAll('.kpi')).find(
      (node) => node.querySelector('dt')?.textContent === 'Conformité de la tension',
    );
    expect(kpi?.querySelector('.value')?.textContent).toBe('99,50 %');
    expect(kpi?.querySelector('a')?.getAttribute('href')).toBe('/qualite-de-service');
  });
});
