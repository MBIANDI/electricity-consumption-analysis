/**
 * ECharts theme. Canvas rendering cannot read CSS custom properties, so the palette is mirrored
 * here from `styles/_tokens.scss`. This is the only TypeScript file allowed to hold hex values.
 */

export const CHART_COLORS = {
  navy: '#051C2C',
  blue: '#2251FF',
  blueMid: '#6485FF',
  textSecondary: '#5F6B76',
  grid: '#D5DAE0',
  white: '#FFFFFF',
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
  axisLabel: AXIS_LABEL,
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
  extraCssText: 'box-shadow: none; border-radius: 0;',
};
