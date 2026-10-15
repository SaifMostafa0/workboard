import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VirtualList } from '../VirtualList';

interface Item {
  id: string;
  label: string;
}

const makeItems = (count: number): Item[] =>
  Array.from({ length: count }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }));

const renderList = (items: Item[], props: Partial<Parameters<typeof VirtualList<Item>>[0]> = {}) =>
  render(
    <VirtualList
      items={items}
      itemHeight={50}
      getKey={(item) => item.id}
      renderItem={(item) => <div role="listitem">{item.label}</div>}
      {...props}
    />
  );

describe('VirtualList', () => {
  it('renders every item when the list is short', () => {
    renderList(makeItems(10), { threshold: 50 });
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText('Item 9')).toBeInTheDocument();
  });

  it('windows long lists so the DOM stays bounded', () => {
    renderList(makeItems(1000), { threshold: 50, viewportHeight: 200, overscan: 2 });

    const rendered = screen.getAllByRole('listitem');
    // 200 / 50 = 4 visible + 2 overscan, nowhere near 1000.
    expect(rendered.length).toBeLessThanOrEqual(6);
    expect(screen.getByText('Item 0')).toBeInTheDocument();
    expect(screen.queryByText('Item 500')).not.toBeInTheDocument();
  });

  it('renders a different window after scrolling', () => {
    renderList(makeItems(1000), { threshold: 50, viewportHeight: 200, overscan: 0 });

    const scroller = screen.getByRole('list');
    fireEvent.scroll(scroller, { target: { scrollTop: 5000 } });

    expect(screen.getByText('Item 100')).toBeInTheDocument();
    expect(screen.queryByText('Item 0')).not.toBeInTheDocument();
  });

  it('lays items out in grid rows when columns are given', () => {
    renderList(makeItems(4), { threshold: 1, columns: 2, viewportHeight: 400 });
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });
});
