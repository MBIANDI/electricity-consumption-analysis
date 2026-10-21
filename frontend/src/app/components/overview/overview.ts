import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DashboardData } from '@models/dashboard';
import { formatDateTime, formatKw, formatKwh, formatPercent, formatWatts } from '@services/format';
import { overviewTitle, sourceFootnote } from '@services/insights';
import { ViewHeader } from '../shared/view-header';

interface Kpi {
  label: string;
  value: string;
  detail: string;
}

@Component({
  selector: 'app-overview',
  imports: [ViewHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class Overview {
  readonly data = input.required<DashboardData>();

  protected readonly title = computed(() => overviewTitle(this.data().summary));
  protected readonly footnote = computed(() => sourceFootnote(this.data().source));

  protected readonly kpis = computed<Kpi[]>(() => {
    const { summary, quality } = this.data();
    return [
      {
        label: 'Énergie totale',
        value: formatKwh(summary.total_energy_kwh, 0),
        detail: 'Somme des trois phases, minutes mesurées uniquement',
      },
      {
        label: 'Moyenne journalière',
        value: formatKwh(summary.average_daily_energy_kwh),
        detail: `Sur ${summary.complete_days} jours complets`,
      },
      {
        label: 'Puissance de pointe',
        value: formatKw(summary.peak.power_kw, 2),
        detail: formatDateTime(summary.peak.timestamp_local),
      },
      {
        label: 'Puissance de base',
        value: formatWatts(summary.base_load_w),
        detail: '5e centile de la puissance par minute',
      },
      {
        label: 'Couverture des données',
        value: formatPercent(quality.coverage_pct),
        detail: `${quality.gaps.length} interruptions de plus de ${quality.gap_threshold_minutes} min`,
      },
    ];
  });
}
