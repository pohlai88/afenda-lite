"use client";

import { Button } from "@/components-V2/platform-components/ui/button";

/** Client pagination controls — buttons only (no <a> navigation / full reload). */
export function TradeListPagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3"
      data-testid="fft-list-pagination"
    >
      <p className="text-muted-foreground text-xs" data-testid="fft-list-pagination-summary">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          data-testid="fft-list-pagination-prev"
        >
          Previous
        </Button>
        <span className="text-muted-foreground text-xs tabular-nums" data-testid="fft-list-pagination-page">
          Page {page} / {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          data-testid="fft-list-pagination-next"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
