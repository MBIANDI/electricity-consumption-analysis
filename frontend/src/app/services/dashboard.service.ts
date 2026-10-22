import { httpResource } from '@angular/common/http';
import { computed, Injectable, InjectionToken, inject, linkedSignal } from '@angular/core';
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

  private readonly lastData = linkedSignal<DashboardState, DashboardData | undefined>({
    source: this.state,
    computation: (state, previous) => (state.kind === 'ready' ? state.data : previous?.value),
  });

  /**
   * Data for routed views, which are only rendered once the state is ready. It keeps the last
   * loaded value so a reload never makes it throw while a view is being torn down.
   */
  readonly data = computed<DashboardData>(() => {
    const data = this.lastData();
    if (data === undefined) {
      throw new Error('Dashboard data read before it was loaded');
    }
    return data;
  });

  reload(): void {
    this.resource.reload();
  }
}
