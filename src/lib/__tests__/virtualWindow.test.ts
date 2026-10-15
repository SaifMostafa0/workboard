import { describe, expect, it } from 'vitest';
import { computeVirtualRange, maxScrollTop } from '../virtualWindow';

describe('computeVirtualRange', () => {
  it('returns an empty range when there is nothing to render', () => {
    expect(
      computeVirtualRange({ count: 0, rowHeight: 40, viewportHeight: 400, scrollTop: 0 })
    ).toEqual({
      start: 0,
      end: 0,
      topPadding: 0,
      bottomPadding: 0,
    });
  });

  it('guards against non-positive measurements', () => {
    const empty = { start: 0, end: 0, topPadding: 0, bottomPadding: 0 };
    expect(
      computeVirtualRange({ count: 10, rowHeight: 0, viewportHeight: 400, scrollTop: 0 })
    ).toEqual(empty);
    expect(
      computeVirtualRange({ count: 10, rowHeight: 40, viewportHeight: 0, scrollTop: 0 })
    ).toEqual(empty);
  });

  it('renders the first viewport plus overscan at the top', () => {
    const range = computeVirtualRange({
      count: 1000,
      rowHeight: 50,
      viewportHeight: 200,
      scrollTop: 0,
      overscan: 2,
    });
    expect(range.start).toBe(0);
    expect(range.end).toBe(6); // 4 visible + 2 overscan
    expect(range.topPadding).toBe(0);
    expect(range.bottomPadding).toBe((1000 - 6) * 50);
  });

  it('windows the middle of a long list', () => {
    const range = computeVirtualRange({
      count: 1000,
      rowHeight: 50,
      viewportHeight: 200,
      scrollTop: 5000, // firstVisible = 100
      overscan: 3,
    });
    expect(range.start).toBe(97);
    expect(range.end).toBe(107);
    expect(range.topPadding).toBe(97 * 50);
  });

  it('never renders past the end and clamps scroll overshoot', () => {
    const range = computeVirtualRange({
      count: 50,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 999_999,
      overscan: 5,
    });
    expect(range.end).toBe(50);
    expect(range.bottomPadding).toBe(0);
    expect(range.start).toBeGreaterThanOrEqual(0);
  });

  it('always accounts for every row across top/bottom padding', () => {
    const range = computeVirtualRange({
      count: 137,
      rowHeight: 36,
      viewportHeight: 300,
      scrollTop: 1234,
    });
    const rendered = range.end - range.start;
    expect(range.topPadding + range.bottomPadding + rendered * 36).toBe(137 * 36);
  });
});

describe('maxScrollTop', () => {
  it('is the content height minus the viewport, floored at zero', () => {
    expect(maxScrollTop(100, 50, 200)).toBe(4800);
    expect(maxScrollTop(2, 50, 200)).toBe(0);
  });
});
