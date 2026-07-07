"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

/** datatable-component-04 pattern — client rows with avatar, status badge, actions. */
export type OrgClientInvitationRow = {
  id: string;
  token: string;
  fullName: string;
  email: string;
  status: "pending" | "accepted" | "expired";
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type OrgClientInvitationsTableProps = {
  rows: OrgClientInvitationRow[];
  labels: {
    tableName: string;
    tableEmail: string;
    tableStatus: string;
    tableActions: string;
    openInvite: string;
    status: Record<OrgClientInvitationRow["status"], string>;
  };
};

export function OrgClientInvitationsTable({
  rows,
  labels,
}: OrgClientInvitationsTableProps) {
  const columns = useMemo<ColumnDef<OrgClientInvitationRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: labels.tableName,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="text-xs">
                {initials(row.original.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{row.original.fullName}</p>
              <p className="truncate text-sm text-muted-foreground sm:hidden">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: labels.tableEmail,
        cell: ({ row }) => (
          <span className="max-w-[220px] truncate text-muted-foreground">
            {row.original.email}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: labels.tableStatus,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              variant={
                status === "accepted"
                  ? "secondary"
                  : status === "expired"
                    ? "outline"
                    : "default"
              }
              className="capitalize"
            >
              {labels.status[status]}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => (
          <span className="sr-only">{labels.tableActions}</span>
        ),
        cell: ({ row }) =>
          row.original.status === "pending" ? (
            <div className="text-right">
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link
                    href={`/invite/${row.original.token}`}
                    target="_blank"
                  />
                }
                nativeButton={false}
              >
                {labels.openInvite}
              </Button>
            </div>
          ) : null,
      },
    ],
    [labels],
  );

  const pageSize = 8;
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    state: { pagination },
  });

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: 2,
  });

  return (
    <Card className="overflow-hidden py-0">
      <div className="border-b">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-muted-foreground h-12 first:pl-4 last:pr-4"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="first:pl-4 last:pr-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {rows.length > pageSize ? (
        <TablePager
          table={table}
          pageSize={pageSize}
          total={rows.length}
          pages={pages}
          showLeftEllipsis={showLeftEllipsis}
          showRightEllipsis={showRightEllipsis}
        />
      ) : null}
    </Card>
  );
}

export type OrgClientAssignmentRow = {
  id: string;
  surveyId: string;
  surveyTitle: string;
  clientEmail: string;
  status: "pending" | "submitted";
  dueDate: string | null;
};

type OrgClientAssignmentsTableProps = {
  rows: OrgClientAssignmentRow[];
  labels: {
    tableDeclaration: string;
    tableClient: string;
    tableStatus: string;
    tableDue: string;
    pending: string;
    submitted: string;
  };
};

export function OrgClientAssignmentsTable({
  rows,
  labels,
}: OrgClientAssignmentsTableProps) {
  const columns = useMemo<ColumnDef<OrgClientAssignmentRow>[]>(
    () => [
      {
        accessorKey: "surveyTitle",
        header: labels.tableDeclaration,
        cell: ({ row }) => (
          <Link
            href={`/dashboard/${row.original.surveyId}`}
            className="block max-w-[220px] truncate font-medium rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {row.original.surveyTitle}
          </Link>
        ),
      },
      {
        accessorKey: "clientEmail",
        header: labels.tableClient,
        cell: ({ row }) => (
          <span className="max-w-[220px] truncate text-muted-foreground">
            {row.original.clientEmail}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: labels.tableStatus,
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "submitted" ? "secondary" : "outline"
            }
          >
            {row.original.status === "submitted"
              ? labels.submitted
              : labels.pending}
          </Badge>
        ),
      },
      {
        accessorKey: "dueDate",
        header: () => (
          <span className="block text-right">{labels.tableDue}</span>
        ),
        cell: ({ row }) => (
          <span className="block text-right text-xs text-muted-foreground tabular-nums">
            {row.original.dueDate ?? "—"}
          </span>
        ),
      },
    ],
    [labels],
  );

  const pageSize = 8;
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    state: { pagination },
  });

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: 2,
  });

  return (
    <Card className="overflow-hidden py-0">
      <div className="border-b">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-muted-foreground h-12 first:pl-4 last:pr-4"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="first:pl-4 last:pr-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {rows.length > pageSize ? (
        <TablePager
          table={table}
          pageSize={pageSize}
          total={rows.length}
          pages={pages}
          showLeftEllipsis={showLeftEllipsis}
          showRightEllipsis={showRightEllipsis}
        />
      ) : null}
    </Card>
  );
}

function TablePager({
  table,
  pageSize,
  total,
  pages,
  showLeftEllipsis,
  showRightEllipsis,
}: {
  table: {
    getState: () => { pagination: PaginationState };
    previousPage: () => void;
    nextPage: () => void;
    setPageIndex: (index: number) => void;
    getCanPreviousPage: () => boolean;
    getCanNextPage: () => boolean;
  };
  pageSize: number;
  total: number;
  pages: number[];
  showLeftEllipsis: boolean;
  showRightEllipsis: boolean;
}) {
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
            const isActive = page === table.getState().pagination.pageIndex + 1;
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
