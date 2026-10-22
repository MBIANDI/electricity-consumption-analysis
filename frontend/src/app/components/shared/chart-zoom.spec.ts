import { toZoomRange } from './chart-zoom';

describe('toZoomRange', () => {
  it('reads the window from a plain event or from a batch', () => {
    expect(toZoomRange({ type: 'datazoom', start: 10, end: 40 })).toEqual({ start: 10, end: 40 });
    expect(toZoomRange({ batch: [{ start: 0, end: 25 }] })).toEqual({ start: 0, end: 25 });
  });

  it('ignores events without a window', () => {
    expect(toZoomRange({ batch: [{}] })).toBeUndefined();
    expect(toZoomRange(null)).toBeUndefined();
    expect(toZoomRange('zoom')).toBeUndefined();
  });
});
