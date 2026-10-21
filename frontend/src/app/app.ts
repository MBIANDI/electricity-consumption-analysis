import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DashboardService } from '@services/dashboard.service';
import { Consumption } from '@components/consumption/consumption';
import { Overview } from '@components/overview/overview';
import { Profile } from '@components/profile/profile';
import { Quality } from '@components/quality/quality';

type ViewId = 'overview' | 'consumption' | 'profile' | 'quality';

interface ViewTab {
  id: ViewId;
  label: string;
}

@Component({
  selector: 'app-root',
  imports: [Consumption, Overview, Profile, Quality],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly dashboard = inject(DashboardService);

  protected readonly state = this.dashboard.state;
  protected readonly view = signal<ViewId>('overview');
  protected readonly tabs: readonly ViewTab[] = [
    { id: 'overview', label: "Vue d'ensemble" },
    { id: 'consumption', label: 'Consommation' },
    { id: 'profile', label: 'Profil journalier' },
    { id: 'quality', label: 'Qualité des données' },
  ];

  protected select(id: ViewId): void {
    this.view.set(id);
  }

  protected retry(): void {
    this.dashboard.reload();
  }
}
