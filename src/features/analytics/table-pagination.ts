// A page size of zero means "all rows". Never modify the source collection.
export function paginateRows<T>(rows: T[], requestedPage: number, pageSize: number) {
  const size = pageSize === 0 ? Math.max(1, rows.length) : Math.max(1, Math.floor(pageSize) || 10)
  const totalPages = Math.max(1, Math.ceil(rows.length / size))
  const page = Math.min(totalPages, Math.max(1, Math.floor(requestedPage) || 1))
  const start = (page - 1) * size
  return {
    rows: rows.slice(start, start + size), page, totalPages,
    from: rows.length ? start + 1 : 0, to: Math.min(start + size, rows.length), total: rows.length,
  }
}
