export function getPaginationRange(params: {
  currentPage: number;
  pageSize: number;
  totalRows: number;
}): { start: number; end: number } {
  const safeTotalRows = Math.max(0, Math.trunc(params.totalRows));
  if (safeTotalRows === 0) {
    return { start: 0, end: 0 };
  }

  const safeCurrentPage = Math.max(1, Math.trunc(params.currentPage));
  const safePageSize = Math.max(1, Math.trunc(params.pageSize));
  const start = (safeCurrentPage - 1) * safePageSize + 1;
  const end = Math.min(safeTotalRows, safeCurrentPage * safePageSize);

  if (start > safeTotalRows) {
    return { start: safeTotalRows, end: safeTotalRows };
  }

  return { start, end };
}

