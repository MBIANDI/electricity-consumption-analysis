import { TestBed } from '@angular/core/testing';
import { makeDashboard } from '../../testing/dashboard-fixture';
import { Overview } from './overview';

describe('Overview', () => {
  it('shows the five KPIs and the action title', () => {
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
      'Couverture des données',
    ]);
    expect(element.querySelector('h2')?.textContent).toContain('74');
  });
});
