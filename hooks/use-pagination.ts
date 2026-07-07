"use client";

import { useMemo } from "react";
import {
  getPaginationRange,
  type PaginationRange,
  type PaginationRangeInput,
} from "@/lib/pagination-range";

export type UsePaginationProps = PaginationRangeInput;
export type UsePaginationReturn = PaginationRange;

export function usePagination(input: UsePaginationProps): UsePaginationReturn {
  const { currentPage, totalPages, paginationItemsToDisplay } = input;

  return useMemo(
    () =>
      getPaginationRange({
        currentPage,
        totalPages,
        paginationItemsToDisplay,
      }),
    [currentPage, totalPages, paginationItemsToDisplay],
  );
}
