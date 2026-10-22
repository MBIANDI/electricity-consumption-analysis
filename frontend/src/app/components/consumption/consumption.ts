import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { DashboardService } from '@services/dashboard.service';
import { localDayKey } from '@services/format';
import {
  dailyConsumptionTitle,
  hourlyConsumptionTitle,
  sourceFootnote,
} from '@services/insights';
import { UI } from '@services/ui-strings';
import { Chart } from '../shared/chart';
import { dailyEnergyOptions, hourlyEnergyOptions } from '../shared/chart-options';
import { ViewHeader } from '../shared/view-header';

type Granularity = 'daily' | 'hourly';

@Component({
  selector: 'app-consumption',
  imports: [Chart, ViewHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './consumption.html',
  styleUrl: './consumption.scss',
})
export class Consumption {
  protected readonly data = inject(DashboardService).data;

  protected readonly ui = UI.consumption;
  protected readonly granularity = signal<Granularity>('daily');

  protected readonly firstDay = computed(() => this.data().daily[0]?.day ?? '');
  protected readonly lastDay = computed(() => this.data().daily.at(-1)?.day ?? '');

  // Reset to the full period whenever new data arrives.
  protected readonly rangeStart = linkedSignal(() => this.firstDay());
  protected readonly rangeEnd = linkedSignal(() => this.lastDay());

  private readonly days = computed(() => {
    const start = this.rangeStart();
    const end = this.rangeEnd();
    return this.data().daily.filter((point) => point.day >= start && point.day <= end);
  });
  private readonly hours = computed(() => {
    const start = this.rangeStart();
    const end = this.rangeEnd();
    return this.data().hourly.filter((point) => {
      const day = localDayKey(point.start_utc);
      return day >= start && day <= end;
    });
  });

  protected readonly title = computed(() =>
    this.granularity() === 'daily'
      ? dailyConsumptionTitle(this.days())
      : hourlyConsumptionTitle(this.hours()),
  );
  protected readonly options = computed(() =>
    this.granularity() === 'daily'
      ? dailyEnergyOptions(this.days())
      : hourlyEnergyOptions(this.hours()),
  );
  protected readonly chartDescription = computed(() =>
    this.granularity() === 'daily' ? UI.consumption.dailyDescription : UI.consumption.hourlyDescription,
  );
  protected readonly isEmptyRange = computed(() => this.days().length === 0);
  protected readonly footnote = computed(() => sourceFootnote(this.data().source));

  protected setGranularity(value: Granularity): void {
    this.granularity.set(value);
  }

  protected setStart(event: Event): void {
    this.rangeStart.set((event.target as HTMLInputElement).value || this.firstDay());
  }

  protected setEnd(event: Event): void {
    this.rangeEnd.set((event.target as HTMLInputElement).value || this.lastDay());
  }

  protected resetRange(): void {
    this.rangeStart.set(this.firstDay());
    this.rangeEnd.set(this.lastDay());
  }
}
