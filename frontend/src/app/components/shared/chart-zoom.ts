/** Visible window of a chart, in percent of the full axis. */
export interface ZoomRange {
  start: number;
  end: number;
}

const isNumber = (value: unknown): value is number => typeof value === 'number';

/** Reads the window from an ECharts `datazoom` event, which may carry it in a `batch` list. */
export function toZoomRange(event: unknown): ZoomRange | undefined {
  if (typeof event !== 'object' || event === null) {
    return undefined;
  }
  const batch = (event as { batch?: unknown }).batch;
  const source = Array.isArray(batch) ? batch[0] : event;
  if (typeof source !== 'object' || source === null) {
    return undefined;
  }
  const { start, end } = source as { start?: unknown; end?: unknown };
  return isNumber(start) && isNumber(end) ? { start, end } : undefined;
}

export const FULL_RANGE: ZoomRange = { start: 0, end: 100 };
