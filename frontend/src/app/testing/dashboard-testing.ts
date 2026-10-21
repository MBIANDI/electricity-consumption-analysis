import { Provider, signal } from '@angular/core';
import { DashboardData } from '@models/dashboard';
import { DashboardService } from '@services/dashboard.service';
import { makeDashboard } from './dashboard-fixture';

/** Replaces `DashboardService` with an always-ready fake, so routed views render without HTTP. */
export function provideReadyDashboard(data: DashboardData = makeDashboard()): Provider {
  return {
    provide: DashboardService,
    useValue: {
      state: signal({ kind: 'ready', data }),
      data: signal(data),
      reload: (): void => undefined,
    },
  };
}
