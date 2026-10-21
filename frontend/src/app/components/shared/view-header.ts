import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Action title of a view: a full sentence stating the insight. */
@Component({
  selector: 'app-view-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="title">{{ title() }}</h2>
    @if (subtitle(); as text) {
      <p class="subtitle">{{ text }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: var(--space-4);
    }
    .title {
      font-size: 1.75rem;
      max-width: 52rem;
    }
    .subtitle {
      margin: var(--space-2) 0 0;
      color: var(--color-text-secondary);
    }
  `,
})
export class ViewHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
