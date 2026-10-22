import { TestBed } from '@angular/core/testing';
import { Chart } from '../shared/chart';
import { provideReadyDashboard } from '../../testing/dashboard-testing';
import { Profile } from './profile';

describe('Profile', () => {
  const render = (): HTMLElement => {
    TestBed.overrideComponent(Chart, { set: { template: '', imports: [] } });
    TestBed.configureTestingModule({ providers: [provideReadyDashboard()] });
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows the weekday and weekend peaks read from the data, each with its line sample', () => {
    const element = render();

    const cards = Array.from(element.querySelectorAll('.peak')).map((card) => ({
      label: card.querySelector('dt')?.textContent?.trim(),
      value: card.querySelector('.value')?.textContent,
      detail: card.querySelector('.detail')?.textContent?.trim(),
      dashed: card.querySelector('.sample')?.classList.contains('dashed'),
    }));
    expect(cards).toEqual([
      { label: 'Semaine', value: '1,7\u00a0kW', detail: 'Pic à 19\u00a0h', dashed: false },
      { label: 'Week\u2011end', value: '1,3\u00a0kW', detail: 'Pic à 12\u00a0h', dashed: true },
    ]);
  });

  it('has a legend with a solid and a dashed sample', () => {
    const element = render();

    const items = Array.from(element.querySelectorAll('.legend li'));
    expect(items.map((item) => item.textContent?.trim())).toEqual(['Semaine', 'Week\u2011end']);
    expect(items.map((item) => item.querySelector('.sample')?.classList.contains('dashed'))).toEqual([
      false,
      true,
    ]);
  });

  it('states the factual insight under the title and the day counts under the chart', () => {
    const element = render();

    expect(element.querySelector('app-view-header')).not.toBeNull();
    expect(element.querySelector('.caption')?.textContent).toContain(
      'Moyenne sur 32 jours de semaine et 13 jours de week‑end',
    );
  });
});
