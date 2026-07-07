export type PaginationRangeInput = {
  currentPage: number;
  totalPages: number;
  paginationItemsToDisplay: number;
};

export type PaginationRange = {
  pages: number[];
  showLeftEllipsis: boolean;
  showRightEllipsis: boolean;
};

/** Windowed page numbers and ellipsis flags for compact table pagers. */
export function getPaginationRange({
  currentPage,
  totalPages,
  paginationItemsToDisplay,
}: PaginationRangeInput): PaginationRange {
  const pages = calculatePageWindow(
    currentPage,
    totalPages,
    paginationItemsToDisplay,
  );

  const showLeftEllipsis =
    pages.length > 0 && pages[0] > 1 && pages[0] > 2;

  const showRightEllipsis =
    pages.length > 0 &&
    pages[pages.length - 1] < totalPages &&
    pages[pages.length - 1] < totalPages - 1;

  return { pages, showLeftEllipsis, showRightEllipsis };
}

function calculatePageWindow(
  currentPage: number,
  totalPages: number,
  paginationItemsToDisplay: number,
): number[] {
  if (totalPages <= 0) {
    return [];
  }

  if (totalPages <= paginationItemsToDisplay) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const halfDisplay = Math.floor(paginationItemsToDisplay / 2);

  const initialRange = {
    start: currentPage - halfDisplay,
    end: currentPage + halfDisplay,
  };

  const adjustedRange = {
    start: Math.max(1, initialRange.start),
    end: Math.min(totalPages, initialRange.end),
  };

  if (adjustedRange.start === 1) {
    adjustedRange.end = Math.min(paginationItemsToDisplay, totalPages);
  }

  if (adjustedRange.end === totalPages) {
    adjustedRange.start = Math.max(
      1,
      totalPages - paginationItemsToDisplay + 1,
    );
  }

  return Array.from(
    { length: adjustedRange.end - adjustedRange.start + 1 },
    (_, index) => adjustedRange.start + index,
  );
}
