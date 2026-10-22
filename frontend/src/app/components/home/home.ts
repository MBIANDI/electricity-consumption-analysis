import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '@services/dashboard.service';
import { VIEWS } from '@services/navigation';
import { UI } from '@services/ui-strings';
import { Overview } from '../overview/overview';
import { DataStatus } from '../shared/data-status';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Overview, DataStatus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly dashboard = inject(DashboardService);

  protected readonly ui = UI;
  protected readonly views = VIEWS;
  protected readonly ready = computed(() => {
    const state = this.dashboard.state();
    return state.kind === 'ready' ? state.data : undefined;
  });
}
