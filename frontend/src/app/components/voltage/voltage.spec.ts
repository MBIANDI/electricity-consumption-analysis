import { TestBed } from '@angular/core/testing';
import { DashboardData } from '@models/dashboard';
import { makeCompliantVoltage, makeDashboard } from '../../testing/dashboard-fixture';
import { provideReadyDashboard } from '../../testing/dashboard-testing';
import { Chart } from '../shared/chart';
import { Voltage } from './voltage';

describe('Voltage', () => {
  const render = (data: DashboardData = makeDashboard()): HTMLElement => {
    TestBed.overrideComponent(Chart, { set: { template: '', imports: [] } });
    TestBed.configureTestingModule({ providers: [provideReadyDashboard(data)] });
    const fixture = TestBed.createComponent(Voltage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const text = (element: Element | null): string | undefined => element?.textContent?.replace(/[ \t\r\n]+/g, ' ').trim();

  it('shows the five KPIs read from the data', () => {
    const element = render();

    const kpis = Array.from(element.querySelectorAll('.kpi')).map((kpi) => ({
      label: text(kpi.querySelector('dt')),
      value: text(kpi.querySelector('.value')),
    }));
    expect(kpis).toEqual([
      { label: 'Tension minimale', value: '190,5\u00a0V' },
      { label: 'Tension maximale', value: '245,5\u00a0V' },
      { label: 'Tension moyenne', value: '229,3\u00a0V' },
      { label: 'Temps dans la plage', value: '99,50\u00a0%' },
      { label: 'Sorties de plage', value: '2' },
    ]);
  });

  it('says "Non conforme" in text, with a marker, and counts the excursions', () => {
    const element = render();

    expect(text(element.querySelector('.verdict'))).toBe('Verdict :✕ Non conforme');
    expect(text(element.querySelector('app-view-header'))).toBe(
      'La tension est sortie de la plage de 198 à 242\u00a0V à 2 reprises ; elle y est restée 99,50\u00a0% du temps mesuré.',
    );
    expect(text(element.querySelectorAll('.kpi .detail')[4])).toBe('1 en dessous, 1 au-dessus');
    expect(text(element.querySelectorAll('.kpi .detail')[0])).toBe('▽ Sous la limite basse (198\u00a0V)');
  });

  it('says "Conforme" when no minute is out of range', () => {
    const data = { ...makeDashboard(), voltage: makeCompliantVoltage() };
    const element = render(data);

    expect(text(element.querySelector('.verdict'))).toBe('Verdict :✓ Conforme');
    expect(text(element.querySelector('app-view-header'))).toBe(
      'La tension est restée dans la plage de 198 à 242\u00a0V pendant toute la période mesurée.',
    );
    expect(text(element.querySelectorAll('.kpi .detail')[0])).toBe('Dans la plage');
  });

  it('never presents the check as a formal or legal compliance', () => {
    const element = render();

    expect(text(element.querySelector('.note'))).toContain('EN 50160');
    expect(text(element.querySelector('.note'))).toContain("n'atteste pas une conformité réglementaire");
  });

  it('lists each excursion with its times in Paris, duration, direction and worst value', () => {
    const element = render();

    const rows = Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => text(cell)),
    );
    expect(rows).toEqual([
      [
        '1 juin 2026, 12:10',
        '1 juin 2026, 12:21',
        '12\u00a0min',
        '▽ En dessous',
        '190,5\u00a0V',
      ],
      ['2 juin 2026, 19:00', '2 juin 2026, 19:02', '3\u00a0min', '△ Au-dessus', '245,5\u00a0V'],
    ]);
  });

  it('shows an empty state when there is no excursion', () => {
    const element = render({ ...makeDashboard(), voltage: makeCompliantVoltage() });

    expect(element.querySelector('table')).toBeNull();
    expect(text(element.querySelector('.notice'))).toBe('Aucune non-conformité sur la période');
  });

  it('has a legend naming the markers, limits and band', () => {
    const element = render();

    expect(Array.from(element.querySelectorAll('.legend li')).map((item) => text(item))).toEqual([
      'Moyenne',
      'Min. – max.',
      'Limites',
      'Nominale',
      '▽Sous la limite basse',
      '△Au-dessus de la limite haute',
    ]);
  });
});
