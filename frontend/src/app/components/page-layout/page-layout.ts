import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DashboardService } from '@services/dashboard.service';
import { VIEWS } from '@services/navigation';
import { UI } from '@services/ui-strings';
import { DataStatus } from '../shared/data-status';

/** Compact header (link home + the three views) around every page except Home. */
@Component({
  selector: 'app-page-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, DataStatus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-layout.html',
  styleUrl: './page-layout.scss',
})
export class PageLayout {
  private readonly dashboard = inject(DashboardService);

  protected readonly ui = UI;
  protected readonly views = VIEWS;
  protected readonly isReady = computed(() => this.dashboard.state().kind === 'ready');
}
