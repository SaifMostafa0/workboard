import { computeVirtualRange, maxScrollTop } from '@/lib/virtualWindow';
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  /** Uniform height of one item (or one grid row when `columns > 1`), in px. */
  itemHeight: number;
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /**
   * Lists at or below this length render in full. Only longer lists are
   * windowed, which keeps short lists simple and off-screen rows reachable by
   * keyboard.
   */
  threshold?: number;
  /** Height of the scroll viewport (px) while windowed. Defaults to 640. */
  viewportHeight?: number;
  /**
   * Space reserved *inside* each row box, so the gap is part of `itemHeight`
   * and the windowing math stays exact. Defaults to 0.
   */
  gap?: number;
  /** Extra rows rendered above and below the viewport. Defaults to 3. */
  overscan?: number;
  /** Items per grid row. Defaults to 1 (a plain list). */
  columns?: number;
  className?: string;
  role?: string;
  'aria-label'?: string;
}

/**
 * Dependency-free list windowing. When the list is long it renders only the
 * rows near the viewport (plus overscan) and reserves the rest of the space
 * with spacers, so the DOM stays a constant size no matter how many items there
 * are. Short lists render in full, which keeps off-screen rows reachable by
 * keyboard for the common case.
 *
 * Wrappers use `role="presentation"` so `renderItem`'s `listitem` elements stay
 * children of the `role="list"` element in the accessibility tree.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  getKey,
  renderItem,
  threshold = 50,
  viewportHeight = 640,
  gap = 0,
  overscan = 3,
  columns = 1,
  className,
  role = 'list',
  'aria-label': ariaLabel,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const rowCount = Math.ceil(items.length / columns);
  const windowed = rowCount > threshold;

  // If the list shrinks (a new page, a filter change) the stored scroll offset
  // may point past the end; clamp it rather than jumping to the top.
  useEffect(() => {
    if (!windowed) return;
    const el = containerRef.current;
    if (!el) return;
    const max = maxScrollTop(rowCount, itemHeight, viewportHeight);
    if (el.scrollTop > max) el.scrollTop = max;
  }, [windowed, rowCount, itemHeight, viewportHeight]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  if (!windowed) {
    return (
      <div ref={containerRef} className={className} role={role} aria-label={ariaLabel}>
        {items.map((item, index) => (
          <Fragment key={getKey(item, index)}>{renderItem(item, index)}</Fragment>
        ))}
      </div>
    );
  }

  const { start, end, topPadding, bottomPadding } = computeVirtualRange({
    count: rowCount,
    rowHeight: itemHeight,
    viewportHeight,
    scrollTop,
    overscan,
  });

  const visibleRows: ReactNode[] = [];
  for (let row = start; row < end; row += 1) {
    const rowItems = items.slice(row * columns, row * columns + columns);
    visibleRows.push(
      <div
        key={row}
        role="presentation"
        style={{
          height: itemHeight,
          boxSizing: 'border-box',
          paddingBottom: gap,
          ...(columns > 1 && {
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }),
        }}
      >
        {rowItems.map((item, columnIndex) => {
          const index = row * columns + columnIndex;
          return (
            <div
              key={getKey(item, index)}
              role="presentation"
              style={{
                height: '100%',
                overflow: 'hidden',
                // A single-cell grid stretches the rendered item to fill the box
                // in both axes (so windowed cards keep a uniform height).
                display: 'grid',
                gridTemplateRows: 'minmax(0, 1fr)',
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      role={role}
      aria-label={ariaLabel}
      style={{ height: viewportHeight, overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: topPadding }} aria-hidden="true" key="top" />
      {visibleRows}
      <div style={{ height: bottomPadding }} aria-hidden="true" key="bottom" />
    </div>
  );
}
