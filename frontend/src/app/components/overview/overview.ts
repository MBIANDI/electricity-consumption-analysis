import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardData } from '@models/dashboard';
import { formatDateTime, formatKw, formatKwh, formatPercent, formatWatts } from '@services/format';
import { overviewTitle, sourceFootnote, voltageRangeText } from '@services/insights';
import { UI } from '@services/ui-strings';
import { ViewHeader } from '../shared/view-header';

interface Kpi {
  label: string;
  value: string;
  detail: string;
  /** Route of the view this figure comes from, shown as a link. */
  link?: { path: string; label: string };
}

@Component({
  selector: 'app-overview',
  imports: [RouterLink, ViewHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class Overview {
  readonly data = input.required<DashboardData>();

  protected readonly title = computed(() => overviewTitle(this.data().summary));
  protected readonly footnote = computed(() => sourceFootnote(this.data().source));

  protected readonly kpis = computed<Kpi[]>(() => {
    const { summary, quality, voltage } = this.data();
    const { overview } = UI;
    return [
      {
        label: overview.totalEnergy,
        value: formatKwh(summary.total_energy_kwh, 0),
        detail: overview.totalEnergyDetail,
      },
      {
        label: overview.dailyAverage,
        value: formatKwh(summary.average_daily_energy_kwh),
        detail: overview.dailyAverageDetail(summary.complete_days),
      },
      {
        label: overview.peakPower,
        value: formatKw(summary.peak.power_kw, 2),
        detail: formatDateTime(summary.peak.timestamp_local),
      },
      {
        label: overview.baseLoad,
        value: formatWatts(summary.base_load_w),
        detail: overview.baseLoadDetail,
      },
      {
        label: overview.voltageConformity,
        value: formatPercent(voltage.summary.pct_time_in_range, 2),
        detail: overview.voltageConformityDetail(
          voltageRangeText(voltage.settings),
          voltage.summary.excursion_count,
        ),
        link: { path: '/qualite-de-service', label: overview.voltageLink },
      },
      {
        label: overview.coverage,
        value: formatPercent(quality.coverage_pct),
        detail: overview.coverageDetail(quality.gaps.length, quality.gap_threshold_minutes),
      },
    ];
  });
}
