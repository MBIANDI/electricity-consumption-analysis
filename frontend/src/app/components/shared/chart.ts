import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';

/** Thin wrapper over ECharts so views never touch the chart library directly. */
@Component({
  selector: 'app-chart',
  imports: [NgxEchartsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    class="chart"
    echarts
    role="img"
    [attr.aria-label]="description()"
    [options]="options()"
    [style.height]="height()"
    [autoResize]="true"
  ></div>`,
  styles: `
    :host {
      display: block;
    }
    .chart {
      width: 100%;
    }
  `,
})
export class Chart {
  readonly options = input.required<EChartsCoreOption>();
  /** Text alternative that states what the chart shows. */
  readonly description = input.required<string>();
  /** CSS height of the plot area. */
  readonly height = input('22rem');
}
