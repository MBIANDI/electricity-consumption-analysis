import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DashboardService } from '@services/dashboard.service';
import { formatHour, formatKw, wattsToKilowatts } from '@services/format';
import { profileInsight, profilePeak, profileTitle, sourceFootnote } from '@services/insights';
import { UI } from '@services/ui-strings';
import { Chart } from '../shared/chart';
import { profileOptions } from '../shared/chart-options';
import { ViewHeader } from '../shared/view-header';

interface PeakCard {
  label: string;
  /** Same line style as in the chart, so the meaning never relies on colour alone. */
  dashed: boolean;
  power: string;
  hour: string;
}

@Component({
  selector: 'app-profile',
  imports: [Chart, ViewHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  protected readonly data = inject(DashboardService).data;

  protected readonly ui = UI;
  protected readonly title = computed(() => profileTitle(this.data().daily_profile));
  protected readonly insight = computed(() => profileInsight(this.data().daily_profile));
  protected readonly dayCounts = computed(() => {
    const { weekday_days, weekend_days } = this.data().daily_profile;
    return UI.profile.dayCounts(weekday_days, weekend_days);
  });
  protected readonly options = computed(() =>
    profileOptions(this.data().daily_profile, this.data().summary.base_load_w),
  );
  protected readonly footnote = computed(() => sourceFootnote(this.data().source));
  protected readonly cards = computed<PeakCard[]>(() => {
    const { weekday, weekend } = this.data().daily_profile;
    return [
      { label: UI.weekday, dashed: false, peak: profilePeak(weekday) },
      { label: UI.weekend, dashed: true, peak: profilePeak(weekend) },
    ].flatMap(({ label, dashed, peak }) =>
      peak === undefined
        ? []
        : [
            {
              label,
              dashed,
              power: formatKw(wattsToKilowatts(peak.mean_power_w)),
              hour: formatHour(peak.hour),
            },
          ],
    );
  });
}
