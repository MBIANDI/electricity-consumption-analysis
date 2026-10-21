import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DashboardData } from '@models/dashboard';
import { formatDateTime, formatDuration, formatPercent } from '@services/format';
import { qualityTitle, sourceFootnote } from '@services/insights';
import { Chart } from '../shared/chart';
import { dailyCoverageOptions } from '../shared/chart-options';
import { ViewHeader } from '../shared/view-header';

interface GapRow {
  start: string;
  end: string;
  duration: string;
}

@Component({
  selector: 'app-quality',
  imports: [Chart, ViewHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quality.html',
  styleUrl: './quality.scss',
})
export class Quality {
  readonly data = input.required<DashboardData>();

  protected readonly title = computed(() => qualityTitle(this.data().quality));
  protected readonly coverage = computed(() => formatPercent(this.data().quality.coverage_pct));
  protected readonly coverageWidth = computed(() => `${this.data().quality.coverage_pct}%`);
  protected readonly options = computed(() => dailyCoverageOptions(this.data().daily));
  protected readonly footnote = computed(() => sourceFootnote(this.data().source));
  protected readonly rows = computed<GapRow[]>(() =>
    this.data().quality.gaps.map((gap) => ({
      start: formatDateTime(gap.start_utc),
      end: formatDateTime(gap.end_utc),
      duration: formatDuration(gap.missing_minutes),
    })),
  );
}
