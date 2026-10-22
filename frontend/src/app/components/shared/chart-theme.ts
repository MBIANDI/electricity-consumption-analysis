import { formatNumber } from '@services/format';

/**
 * ECharts theme. Canvas rendering cannot read CSS custom properties, so the palette is mirrored
 * here from `styles/_tokens.scss`. This is the only TypeScript file allowed to hold hex values.
 */

export const CHART_COLORS = {
  navy: '#051C2C',
  blue: '#2251FF',
  blueMid: '#6485FF',
  textSecondary: '#4F5B66',
  grid: '#D5DAE0',
  white: '#FFFFFF',
  blueTint: '#D3DCFF',
  alert: '#B3261E',
} as const;

export const CHART_FONT = 'Arial, Helvetica, sans-serif';

export const AXIS_LABEL = {
  color: CHART_COLORS.textSecondary,
  fontFamily: CHART_FONT,
  fontSize: 12,
};

export const AXIS_NAME = {
  nameTextStyle: { color: CHART_COLORS.textSecondary, fontFamily: CHART_FONT, fontSize: 12 },
};

export const VALUE_AXIS_STYLE = {
  type: 'value' as const,
  splitNumber: 4,
  axisLine: { show: false },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: CHART_COLORS.grid, width: 1 } },
  axisLabel: { ...AXIS_LABEL, formatter: (value: number): string => formatNumber(value) },
  ...AXIS_NAME,
};

export const CATEGORY_AXIS_STYLE = {
  type: 'category' as const,
  axisLine: { lineStyle: { color: CHART_COLORS.navy } },
  axisTick: { show: false },
  axisLabel: AXIS_LABEL,
};

export const TOOLTIP_STYLE = {
  trigger: 'axis' as const,
  backgroundColor: CHART_COLORS.white,
  borderColor: CHART_COLORS.grid,
  borderWidth: 1,
  textStyle: { color: CHART_COLORS.navy, fontFamily: CHART_FONT, fontSize: 13 },
  extraCssText: 'box-shadow: none; border-radius: 4px;',
};

export const ZOOM_SLIDER_STYLE = {
  borderColor: CHART_COLORS.grid,
  backgroundColor: 'rgba(0, 0, 0, 0)',
  fillerColor: 'rgba(211, 220, 255, 0.6)',
  dataBackground: {
    lineStyle: { color: CHART_COLORS.grid },
    areaStyle: { color: CHART_COLORS.grid, opacity: 0.4 },
  },
  handleStyle: { color: CHART_COLORS.navy, borderColor: CHART_COLORS.navy },
  moveHandleStyle: { color: CHART_COLORS.grid },
  textStyle: { color: CHART_COLORS.textSecondary, fontFamily: CHART_FONT, fontSize: 12 },
};
