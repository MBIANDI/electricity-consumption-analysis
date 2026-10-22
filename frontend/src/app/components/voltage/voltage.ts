import { ChangeDetectionStrategy, Component, computed, inject, signal, untracked } from '@angular/core';
import { VoltageDirection } from '@models/dashboard';
import { DashboardService } from '@services/dashboard.service';
import { formatDateTime, formatDuration, formatPercent, formatVolts } from '@services/format';
import { sourceFootnote, voltageRangeText, voltageTitle } from '@services/insights';
import { UI } from '@services/ui-strings';
import { Chart } from '../shared/chart';
import { voltageDetailFor, voltageOptions } from '../shared/chart-options';
import { FULL_RANGE, ZoomRange } from '../shared/chart-zoom';
import { ViewHeader } from '../shared/view-header';

interface Kpi {
  label: string;
  value: string;
  detail: string;
  /** Out-of-range value: shown with the alert colour and a marker, never colour alone. */
  marker?: string;
}

interface ExcursionRow {
  start: string;
  end: string;
  duration: string;
  direction: VoltageDirection;
  directionLabel: string;
  worst: string;
}

const MARKERS: Record<VoltageDirection, string> = { below: '▽', above: '△' };

@Component({
  selector: 'app-voltage',
  imports: [Chart, ViewHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './voltage.html',
  styleUrl: './voltage.scss',
})
export class Voltage {
  protected readonly data = inject(DashboardService).data;

  protected readonly ui = UI.voltage;
  protected readonly markers = MARKERS;
  private readonly report = computed(() => this.data().voltage);

  protected readonly title = computed(() => voltageTitle(this.report()));
  protected readonly isCompliant = computed(() => this.report().summary.is_compliant);
  protected readonly verdict = computed(() => (this.isCompliant() ? this.ui.compliant : this.ui.nonCompliant));
  protected readonly note = computed(() => this.ui.note(voltageRangeText(this.report().settings)));
  protected readonly footnote = computed(() => sourceFootnote(this.data().source));

  protected readonly kpis = computed<Kpi[]>(() => {
    const { summary, settings, excursions } = this.report();
    const below = excursions.filter((excursion) => excursion.direction === 'below').length;
    const lowest = summary.min_v < settings.lower_v;
    const highest = summary.max_v > settings.upper_v;
    return [
      {
        label: this.ui.minimum,
        value: formatVolts(summary.min_v),
        detail: lowest ? this.ui.belowLimit(formatVolts(settings.lower_v, 0)) : this.ui.withinRange,
        marker: lowest ? MARKERS.below : undefined,
      },
      {
        label: this.ui.maximum,
        value: formatVolts(summary.max_v),
        detail: highest ? this.ui.aboveLimit(formatVolts(settings.upper_v, 0)) : this.ui.withinRange,
        marker: highest ? MARKERS.above : undefined,
      },
      { label: this.ui.mean, value: formatVolts(summary.mean_v), detail: voltageRangeText(settings) },
      {
        label: this.ui.inRange,
        value: formatPercent(summary.pct_time_in_range, 2),
        detail: this.ui.inRangeDetail(summary.missing_minutes),
      },
      {
        label: this.ui.excursions,
        value: String(summary.excursion_count),
        detail: this.ui.excursionsDetail(below, excursions.length - below),
      },
    ];
  });

  protected readonly rows = computed<ExcursionRow[]>(() =>
    this.report().excursions.map((excursion) => ({
      start: formatDateTime(excursion.start_local),
      end: formatDateTime(excursion.end_local),
      duration: formatDuration(excursion.duration_min),
      direction: excursion.direction,
      directionLabel: excursion.direction === 'below' ? this.ui.below : this.ui.above,
      worst: formatVolts(excursion.worst_value_v),
    })),
  );

  private readonly zoom = signal<ZoomRange>(FULL_RANGE);
  // The detail only changes when the window crosses a few days, so options are not rebuilt on every
  // drag; the current window is read untracked and restored when they are.
  private readonly detail = computed(() => voltageDetailFor(this.zoom(), this.report().daily.length));
  protected readonly options = computed(() =>
    voltageOptions(this.report(), this.detail(), untracked(() => this.zoom())),
  );

  protected onZoom(range: ZoomRange): void {
    this.zoom.set(range);
  }
}
