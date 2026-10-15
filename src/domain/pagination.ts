/** A single page of a larger, ordered result set. */
export interface Paged<T> {
  items: T[];
  /** Total rows matching the query, before paging. */
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 20;

/** Slices an ordered list into a page, clamping the requested page into range. */
export const paginate = <T>(items: T[], page = 1, pageSize = DEFAULT_PAGE_SIZE): Paged<T> => {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const requested = Number.isFinite(page) ? Math.trunc(page) : 1;
  const currentPage = Math.min(Math.max(requested || 1, 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: currentPage,
    pageSize,
    totalPages,
  };
};
