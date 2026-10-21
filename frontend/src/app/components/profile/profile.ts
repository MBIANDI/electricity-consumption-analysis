import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DashboardService } from '@services/dashboard.service';
import { profileTitle, sourceFootnote } from '@services/insights';
import { Chart } from '../shared/chart';
import { profileOptions } from '../shared/chart-options';
import { ViewHeader } from '../shared/view-header';

@Component({
  selector: 'app-profile',
  imports: [Chart, ViewHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.html',
})
export class Profile {
  protected readonly data = inject(DashboardService).data;

  protected readonly title = computed(() => profileTitle(this.data().daily_profile));
  protected readonly options = computed(() => profileOptions(this.data().daily_profile));
  protected readonly footnote = computed(() => sourceFootnote(this.data().source));
}
