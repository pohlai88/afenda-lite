"use client";

/**
 * FFT-UI-EVT-LIST — AdminCN datatable DNA adapted from
 * ACN-BLK-DATATABLES-DATATABLE-USER (+ Studio datatable inspiration).
 * @fft-dna ACN-BLK-DATATABLES-DATATABLE-USER
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "lucide-react";
import { FftCloneEventButton } from "@/features/fft/fft-clone-button";
import { TradeEmptyState } from "@/features/fft/fft-form-feedback";
import type { FftEventListItem } from "@/features/fft/fft-events-list-model";
import { Badge } from "@/components-V2/platform-components/ui/badge";
import { Button } from "@/components-V2/platform-components/ui/button";
import { Checkbox } from "@/components-V2/platform-components/ui/checkbox";
import { Input } from "@/components-V2/platform-components/ui/input";
import { Label } from "@/components-V2/platform-components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components-V2/platform-components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components-V2/platform-components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components-V2/platform-components/ui/table";
import { usePagination } from "@/components-V2/platform-hooks/use-pagination";
import { cn } from "@/components-V2/lib/utils";
import { FFT_EVENT_STATUSES } from "@/modules/fft/domain/types";
import { fftHref, type FftLocale } from "@/modules/fft/i18n/fft-i18n";

const STATUS_ALL = "__all__";
const PAGE_SIZE = 8;

export function FftEventsList({
  events,
  locale,
  variant = "sales",
}: {
  events: FftEventListItem[];
  locale: FftLocale;
  /** Admin shows clone + allocation; sales shows order link. */
  variant?: "admin" | "sales";
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "opensAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [templatesOnly, setTemplatesOnly] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const data = useMemo(
    () => (templatesOnly ? events.filter((e) => e.isTemplate) : events),
    [events, templatesOnly],
  );

  const columns = useMemo<ColumnDef<FftEventListItem>[]>(
    () => [
      {
        accessorKey: "eventName",
        header: "Name",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="font-medium">{row.original.eventName}</p>
            <p className="text-muted-foreground text-xs">
              {row.original.eventCode}
              {row.original.isTemplate ? " · template" : ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: (row, _id, filterValue) => {
          if (!filterValue || filterValue === STATUS_ALL) return true;
          return row.original.status === filterValue;
        },
        cell: ({ row }) => (
          <Badge variant="secondary" className="capitalize">
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "opensAt",
        header: "Opens",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs tabular-nums">
            {new Date(row.original.opensAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="block pr-4 text-right">Actions</span>,
        cell: ({ row }) => {
          const event = row.original;
          return (
            <div className="flex flex-wrap items-center justify-end gap-2 pr-4">
              {variant === "sales" ? (
                <Link
                  className="text-sm underline"
                  href={fftHref(`/events/${event.id}/order`)}
                >
                  Order
                </Link>
              ) : null}
              <Link
                className="text-sm underline"
                href={fftHref(`/admin/events/${event.id}/setup`)}
              >
                Setup
              </Link>
              {variant === "admin" ? (
                <>
                  <Link
                    className="text-sm underline"
                    href={fftHref(`/admin/events/${event.id}/allocation`)}
                  >
                    Allocation
                  </Link>
                  <FftCloneEventButton locale={locale} eventId={event.id} />
                </>
              ) : null}
            </div>
          );
        },
      },
    ],
    [locale, variant],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack table DNA (ACN-BLK-DATATABLES-DATATABLE-USER)
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filter) => {
      const q = String(filter ?? "")
        .trim()
        .toLowerCase();
      if (!q) return true;
      const event = row.original;
      return (
        event.eventName.toLowerCase().includes(q) ||
        event.eventCode.toLowerCase().includes(q)
      );
    },
  });

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: Math.max(table.getPageCount(), 1),
    paginationItemsToDisplay: 3,
  });

  const statusFilter =
    (table.getColumn("status")?.getFilterValue() as string | undefined) ??
    STATUS_ALL;
  const filteredRows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;

  if (events.length === 0) {
    return (
      <div data-testid="fft-events-list">
        <TradeEmptyState
          title="No events yet"
          description="Create an event or ensure the piglet template to get started."
          testId="trade-events-empty"
        />
      </div>
    );
  }

  return (
    <div className="w-full" data-testid="fft-events-list">
      <div className="border-b">
        <div className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 max-md:*:last:col-span-full">
            <div className="space-y-2">
              <Label
                className="text-muted-foreground text-xs"
                htmlFor="trade-events-search"
              >
                Search
              </Label>
              <Input
                id="trade-events-search"
                value={globalFilter}
                onChange={(e) => {
                  setGlobalFilter(e.target.value);
                  table.setPageIndex(0);
                }}
                placeholder="Name or code"
                data-testid="fft-events-search"
              />
            </div>
            <div className="space-y-2">
              <Label
                className="text-muted-foreground text-xs"
                htmlFor="trade-events-status"
              >
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  const next = value ?? STATUS_ALL;
                  table
                    .getColumn("status")
                    ?.setFilterValue(next === STATUS_ALL ? undefined : next);
                  table.setPageIndex(0);
                }}
              >
                <SelectTrigger
                  id="trade-events-status"
                  className="w-full min-w-40"
                  data-testid="fft-events-status-filter"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
                    {FFT_EVENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {variant === "admin" ? (
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={templatesOnly}
                    onCheckedChange={(checked) => {
                      setTemplatesOnly(checked === true);
                      table.setPageIndex(0);
                    }}
                    data-testid="fft-events-templates-only"
                  />
                  Templates only
                </label>
              </div>
            ) : null}
          </div>
        </div>

        {filteredCount === 0 ? (
          <div className="px-6 pb-6">
            <TradeEmptyState
              title="No matching events"
              description="Try clearing search or status filters."
              testId="trade-events-filter-empty"
            />
          </div>
        ) : (
          <Table data-testid="fft-events-table">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="h-14 border-t">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        className="text-muted-foreground"
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            className={cn(
                              "flex h-full cursor-pointer items-center gap-2 select-none",
                              sorted && "text-foreground",
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                            data-testid={
                              header.column.id === "eventName"
                                ? "trade-events-sort-name"
                                : header.column.id === "status"
                                  ? "trade-events-sort-status"
                                  : header.column.id === "opensAt"
                                    ? "trade-events-sort-opens"
                                    : undefined
                            }
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {sorted === "asc" ? (
                              <ChevronUpIcon
                                className="size-4 shrink-0 opacity-60"
                                aria-hidden
                              />
                            ) : null}
                            {sorted === "desc" ? (
                              <ChevronDownIcon
                                className="size-4 shrink-0 opacity-60"
                                aria-hidden
                              />
                            ) : null}
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id} data-testid="fft-events-row">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="h-14">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col">
        <p
          className="text-muted-foreground text-sm whitespace-nowrap"
          aria-live="polite"
          data-testid="fft-events-count"
        >
          Showing{" "}
          <span>
            {filteredCount === 0
              ? 0
              : table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                1}{" "}
            to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              filteredCount,
            )}
          </span>{" "}
          of <span>{filteredCount}</span> entries
          {filteredCount !== events.length ? (
            <span className="text-muted-foreground">
              {" "}
              (filtered from {events.length})
            </span>
          ) : null}
        </p>

        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button
                type="button"
                variant="ghost"
                className="disabled:pointer-events-none disabled:opacity-50"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Go to previous page"
                data-testid="fft-events-page-prev"
              >
                <ChevronLeftIcon aria-hidden />
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
                    type="button"
                    size="icon"
                    variant={isActive ? "outline" : "ghost"}
                    className={cn(
                      !isActive &&
                        "bg-primary/10 text-primary hover:bg-primary/20",
                    )}
                    onClick={() => table.setPageIndex(page - 1)}
                    aria-current={isActive ? "page" : undefined}
                    data-testid={`trade-events-page-${page}`}
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
                type="button"
                variant="ghost"
                className="disabled:pointer-events-none disabled:opacity-50"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Go to next page"
                data-testid="fft-events-page-next"
              >
                Next
                <ChevronRightIcon aria-hidden />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
