import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it } from 'vitest';
import { VirtualList } from '../VirtualList';

/**
 * Render benchmark for the windowed list (see `docs/performance.md`).
 *
 * Compares rendering 50,000 rows with windowing on versus off. Windowed
 * rendering produces a constant-size DOM, so the work does not grow with the
 * collection; unwindowed rendering builds an element per row.
 */

const ITEM_COUNT = 50_000;
const items = Array.from({ length: ITEM_COUNT }, (_, index) => index);

const renderList = (threshold: number): string =>
  renderToStaticMarkup(
    <VirtualList
      items={items}
      itemHeight={132}
      gap={8}
      viewportHeight={640}
      threshold={threshold}
      overscan={3}
      getKey={(n) => String(n)}
      aria-label="Benchmark list"
      renderItem={(n) => <div role="listitem">Row {n}</div>}
    />
  );

describe(`VirtualList render of ${ITEM_COUNT.toLocaleString()} items`, () => {
  it('windowed render stays constant while unwindowed grows with the list', async ({ bench }) => {
    await bench('windowed (threshold 30)', () => renderList(30)).run({
      iterations: 50,
      warmupIterations: 5,
    });

    await bench('unwindowed (threshold 1e9)', () => renderList(1_000_000_000)).run({
      iterations: 3,
      warmupIterations: 1,
    });
  });
});
