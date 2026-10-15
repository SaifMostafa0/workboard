/**
 * Pure windowing math for long lists: given a uniform row height, the scroll
 * offset and the viewport height, work out which slice of rows to render and
 * how much space to reserve above and below it. Kept free of the DOM so it can
 * be unit tested directly.
 */
export interface VirtualRange {
  /** First rendered index, inclusive. */
  start: number;
  /** Last rendered index, exclusive. */
  end: number;
  /** Height of the spacer before the rendered slice. */
  topPadding: number;
  /** Height of the spacer after the rendered slice. */
  bottomPadding: number;
}

export interface VirtualRangeInput {
  count: number;
  rowHeight: number;
  viewportHeight: number;
  scrollTop: number;
  /** Extra rows rendered above and below the viewport. Defaults to 3. */
  overscan?: number;
}

export const computeVirtualRange = ({
  count,
  rowHeight,
  viewportHeight,
  scrollTop,
  overscan = 3,
}: VirtualRangeInput): VirtualRange => {
  if (count <= 0 || rowHeight <= 0 || viewportHeight <= 0) {
    return { start: 0, end: 0, topPadding: 0, bottomPadding: 0 };
  }

  const safeScrollTop = Math.min(Math.max(scrollTop, 0), count * rowHeight);
  const firstVisible = Math.floor(safeScrollTop / rowHeight);
  const visibleCount = Math.ceil(viewportHeight / rowHeight);

  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(count, firstVisible + visibleCount + overscan);

  return {
    start,
    end,
    topPadding: start * rowHeight,
    bottomPadding: (count - end) * rowHeight,
  };
};

/** The largest valid scroll offset for a list of `count` uniform rows. */
export const maxScrollTop = (count: number, rowHeight: number, viewportHeight: number): number =>
  Math.max(0, count * rowHeight - viewportHeight);
