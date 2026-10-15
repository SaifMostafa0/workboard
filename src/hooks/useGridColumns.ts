import { useEffect, useRef, useState } from 'react';

/**
 * Number of equal-width columns that fit inside the observed element.
 *
 * Used to window a responsive grid whose column count CSS `auto-fill` /
 * `minmax()` would otherwise decide. The maths mirrors that CSS: as many
 * `minTrackWidth` tracks as fit, plus the gaps between them.
 */
export function useGridColumns<T extends HTMLElement>(minTrackWidth: number, gap: number) {
  const ref = useRef<T>(null);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const width = element.clientWidth;
      if (width <= 0) return;
      const next = Math.max(1, Math.floor((width + gap) / (minTrackWidth + gap)));
      setColumns(next);
    };

    measure();

    // ResizeObserver is absent in jsdom (unit tests); the initial measurement
    // above is enough there.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [minTrackWidth, gap]);

  return { ref, columns };
}
