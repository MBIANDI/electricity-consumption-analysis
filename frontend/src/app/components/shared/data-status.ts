import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardService } from '@services/dashboard.service';
import { UI } from '@services/ui-strings';

/** Loading, error and empty messages shown while the dashboard data is not ready. */
@Component({
  selector: 'app-data-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state().kind) {
      @case ('loading') {
        <p class="status" role="status">{{ ui.status.loading }}</p>
      }
      @case ('error') {
        <div class="status" role="alert">
          <p>{{ ui.status.errorTitle }}</p>
          <p class="hint">
            {{ ui.status.errorHint }} <code>make export</code>{{ ui.status.errorHintEnd }}
          </p>
          <button type="button" (click)="retry()">{{ ui.status.retry }}</button>
        </div>
      }
      @case ('empty') {
        <p class="status" role="status">{{ ui.status.empty }}</p>
      }
    }
  `,
  styles: `
    .status {
      padding: var(--space-5) 0;
      color: var(--color-text-secondary);
    }
    .hint {
      font-size: 0.875rem;
    }
    button {
      border: var(--rule-strong);
      background: var(--color-white);
      padding: var(--space-2) var(--space-3);
      cursor: pointer;
    }
  `,
})
export class DataStatus {
  private readonly dashboard = inject(DashboardService);

  protected readonly ui = UI;
  protected readonly state = this.dashboard.state;

  protected retry(): void {
    this.dashboard.reload();
  }
}
