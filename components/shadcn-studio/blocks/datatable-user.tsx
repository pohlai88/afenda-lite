"use client";

import type { ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowData,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/components/hooks/use-pagination";
import { cn } from "@/lib/utils";
import { DataTableToolbar } from "@/components/datatable-toolbar";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: "text" | "range" | "select";
    filterLabel?: string;
    filterAllLabel?: string;
    filterOptions?: { value: string; label: string }[];
  }
}

/** datatable-component-04 — Shadcn Studio user admin table shell (filters, sort, pagination). */
export type StudioFilterDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  pageSize?: number;
  emptyMessage?: string;
  filterColumnIds?: string[];
  filterTitle?: string;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
};

export function StudioFilterDataTable<TData>({
  data,
  columns,
  pageSize = 8,
  emptyMessage = "No results.",
  filterColumnIds = [],
  filterTitle = "Filter",
  searchPlaceholder,
  toolbar,
}: StudioFilterDataTableProps<TData>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      globalFilter,
      pagination,
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
    enableSortingRemoval: false,
  });

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: 2,
  });

  const filterColumns = filterColumnIds
    .map((id) => table.getColumn(id))
    .filter((column): column is Column<TData, unknown> => Boolean(column));

  const rows = table.getRowModel().rows;
  const showPager = table.getPageCount() > 1;
  const showFilters = filterColumns.length > 0;
  const showToolbar = Boolean(toolbar ?? searchPlaceholder);

  return (
    <div className="w-full min-w-0">
      <div className="border-b">
        {showToolbar ? (
          <div className="border-b px-4 py-3">
            {toolbar ?? (
              <DataTableToolbar
                searchValue={globalFilter}
                onSearchChange={setGlobalFilter}
                searchPlaceholder={searchPlaceholder ?? "Search"}
              />
            )}
          </div>
        ) : null}

        {showFilters ? (
          <div className="flex flex-col gap-4 p-6">
            <span className="text-xl font-semibold">{filterTitle}</span>
            <div className="grid grid-cols-1 gap-6 max-md:*:last:col-span-full sm:grid-cols-2 md:grid-cols-3">
              {filterColumns.map((column) => (
                <ColumnFilter<TData> key={column.id} column={column} />
              ))}
            </div>
          </div>
        ) : null}

        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className={cn(showFilters && "border-t")}
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={
                      header.column.getSize()
                        ? { width: `${header.getSize()}px` }
                        : undefined
                    }
                    className="text-muted-foreground h-14 first:pl-4 last:pr-4"
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <div
                        className="flex h-full cursor-pointer items-center justify-between gap-2 select-none"
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={(event) => {
                          if (
                            header.column.getCanSort() &&
                            (event.key === "Enter" || event.key === " ")
                          ) {
                            event.preventDefault();
                            header.column.getToggleSortingHandler()?.(event);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === "asc" ? (
                          <ChevronUpIcon
                            className="size-4 shrink-0 opacity-60"
                            aria-hidden="true"
                          />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ChevronDownIcon
                            className="size-4 shrink-0 opacity-60"
                            aria-hidden="true"
                          />
                        ) : null}
                      </div>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="h-14 first:pl-4 last:pr-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPager ? (
        <div className="flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col md:max-lg:flex-col">
          <p
            className="text-muted-foreground text-sm whitespace-nowrap"
            aria-live="polite"
          >
            Showing{" "}
            <span>
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}{" "}
              to{" "}
              {Math.min(
                Math.max(
                  table.getState().pagination.pageIndex *
                    table.getState().pagination.pageSize +
                    table.getState().pagination.pageSize,
                  0,
                ),
                table.getRowCount(),
              )}
            </span>{" "}
            of <span>{table.getRowCount().toString()} entries</span>
          </p>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  className="disabled:pointer-events-none disabled:opacity-50"
                  variant="ghost"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Go to previous page"
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
                      size="icon"
                      className={
                        isActive
                          ? undefined
                          : "bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40"
                      }
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
                  className="disabled:pointer-events-none disabled:opacity-50"
                  variant="ghost"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Go to next page"
                >
                  Next
                  <ChevronRightIcon aria-hidden="true" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  );
}

function ColumnFilter<TData>({
  column,
}: {
  column: Column<TData, unknown>;
}) {
  const id = useId();
  const columnFilterValue = column.getFilterValue();
  const meta = column.columnDef.meta ?? {};
  const columnHeader =
    meta.filterLabel ??
    (typeof column.columnDef.header === "string"
      ? column.columnDef.header
      : column.id);

  const sortedUniqueValues = useMemo(() => {
    if (meta.filterOptions?.length) {
      return meta.filterOptions;
    }

    const values = Array.from(column.getFacetedUniqueValues().keys());
    const flattenedValues = values.reduce<string[]>((acc, curr) => {
      if (Array.isArray(curr)) {
        return [...acc, ...curr.map(String)];
      }
      return [...acc, String(curr)];
    }, []);

    return Array.from(new Set(flattenedValues))
      .sort()
      .map((value) => ({ value, label: value }));
  }, [column, meta.filterOptions]);

  const allLabel = meta.filterAllLabel ?? "All";
  const currentValue =
    columnFilterValue === undefined || columnFilterValue === ""
      ? "all"
      : String(columnFilterValue);

  return (
    <div className="flex w-full flex-col gap-2">
      <Label htmlFor={`${id}-select`}>{columnHeader}</Label>
      <Select
        value={currentValue}
        onValueChange={(value) => {
          column.setFilterValue(
            value === "all" || value == null ? undefined : value,
          );
        }}
      >
        <SelectTrigger id={`${id}-select`} className="w-full capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">{allLabel}</SelectItem>
            {sortedUniqueValues.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="capitalize"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
