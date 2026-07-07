"use client";

import type { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

type DataTablePagerProps<TData> = {
  table: Pick<
    Table<TData>,
    | "getState"
    | "getPageCount"
    | "previousPage"
    | "nextPage"
    | "setPageIndex"
    | "getCanPreviousPage"
    | "getCanNextPage"
  >;
  pageSize: number;
  total: number;
  paginationItemsToDisplay?: number;
};

export function DataTablePager<TData>({
  table,
  pageSize,
  total,
  paginationItemsToDisplay = 2,
}: DataTablePagerProps<TData>) {
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay,
  });

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 max-sm:flex-col">
      <p className="text-muted-foreground text-sm whitespace-nowrap">
        Showing {table.getState().pagination.pageIndex * pageSize + 1}–
        {Math.min(
          (table.getState().pagination.pageIndex + 1) * pageSize,
          total,
        )}{" "}
        of {total}
      </p>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeftIcon aria-hidden="true" />
              Previous
            </Button>
          </PaginationItem>
          {showLeftEllipsis ? (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          ) : null}
          {pages.map((page) => {
            const isActive =
              page === table.getState().pagination.pageIndex + 1;
            return (
              <PaginationItem key={page}>
                <Button
                  size="icon-sm"
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => table.setPageIndex(page - 1)}
                  aria-current={isActive ? "page" : undefined}
                >
                  {page}
                </Button>
              </PaginationItem>
            );
          })}
          {showRightEllipsis ? (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          ) : null}
          <PaginationItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
