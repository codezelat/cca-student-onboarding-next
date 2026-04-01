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

export type PaginationDisplayItem =
  | { type: "page"; page: number }
  | { type: "ellipsis"; key: string };

export function getPaginationDisplay(params: {
  currentPage: number;
  totalPages: number;
  siblingCount?: number;
}): PaginationDisplayItem[] {
  const totalPages = Math.max(1, Math.trunc(params.totalPages));
  const currentPage = Math.min(
    Math.max(1, Math.trunc(params.currentPage)),
    totalPages,
  );
  const siblingCount = Math.max(0, Math.trunc(params.siblingCount ?? 1));

  if (totalPages <= 7 + siblingCount * 2) {
    return Array.from({ length: totalPages }, (_, index) => ({
      type: "page" as const,
      page: index + 1,
    }));
  }

  const pages = new Set<number>([1, totalPages]);

  for (
    let page = currentPage - siblingCount;
    page <= currentPage + siblingCount;
    page += 1
  ) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  if (currentPage <= 3 + siblingCount) {
    for (let page = 2; page <= Math.min(totalPages - 1, 4 + siblingCount); page += 1) {
      pages.add(page);
    }
  }

  if (currentPage >= totalPages - (2 + siblingCount)) {
    for (
      let page = Math.max(2, totalPages - (3 + siblingCount));
      page < totalPages;
      page += 1
    ) {
      pages.add(page);
    }
  }

  const orderedPages = [...pages].sort((left, right) => left - right);
  const displayItems: PaginationDisplayItem[] = [];

  orderedPages.forEach((page, index) => {
    if (index > 0) {
      const previousPage = orderedPages[index - 1];
      if (page - previousPage > 1) {
        displayItems.push({
          type: "ellipsis",
          key: `ellipsis-${previousPage}-${page}`,
        });
      }
    }

    displayItems.push({ type: "page", page });
  });

  return displayItems;
}
