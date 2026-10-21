import { httpResource } from '@angular/common/http';
import { computed, Injectable, InjectionToken, inject } from '@angular/core';
import { DashboardData, DashboardState } from '@models/dashboard';

/** Location of the file written by `make export`. Override it in tests or other deployments. */
export const DASHBOARD_URL = new InjectionToken<string>('DASHBOARD_URL', {
  factory: () => 'data/dashboard.json',
});

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly url = inject(DASHBOARD_URL);
  private readonly resource = httpResource<DashboardData>(() => this.url);

  /** Loading, error, empty and ready states of the dashboard data. */
  readonly state = computed<DashboardState>(() => {
    if (this.resource.error() !== undefined) {
      return { kind: 'error' };
    }
    if (this.resource.isLoading()) {
      return { kind: 'loading' };
    }
    const data = this.resource.value();
    if (data === undefined || data.daily.length === 0) {
      return { kind: 'empty' };
    }
    return { kind: 'ready', data };
  });

  reload(): void {
    this.resource.reload();
  }
}
