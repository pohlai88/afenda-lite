"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
} from "@tanstack/react-table";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilteredDataTable } from "@/components/filtered-datatable";
import { DataTableToolbar } from "@/components/datatable-toolbar";
import { ClientRegistrationDeleteButton } from "@/components/client-registration-delete-button";
import { ClientAssignmentDeleteButton } from "@/components/client-assignment-delete-button";

const selectClassName =
  "border-input bg-background ring-offset-background focus-visible:ring-ring h-9 min-w-[8rem] rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

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

function StatusFilter({
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  allLabel: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClassName}
      >
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type OrgClientInvitationsTableProps = {
  rows: OrgClientInvitationRow[];
  labels: {
    tableName: string;
    tableEmail: string;
    tableStatus: string;
    tableActions: string;
    openInvite: string;
    removeRegistration: string;
    searchPlaceholder: string;
    filterAll: string;
    filterStatusLabel: string;
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
        filterFn: "equals",
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
          <span className="block text-right">{labels.tableActions}</span>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <ClientRegistrationDeleteButton invitationId={row.original.id} />
          </div>
        ),
        size: 96,
        enableHiding: false,
      },
    ],
    [labels],
  );

  const pageSize = 8;
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: "includesString",
    state: { pagination, globalFilter, columnFilters },
  });

  const statusFilter =
    (columnFilters.find((filter) => filter.id === "status")?.value as
      | string
      | undefined) ?? "all";

  return (
    <FilteredDataTable
      table={table}
      pageSize={pageSize}
      toolbar={
        <DataTableToolbar
          searchValue={globalFilter}
          onSearchChange={setGlobalFilter}
          searchPlaceholder={labels.searchPlaceholder}
          filters={
            <StatusFilter
              label={labels.filterStatusLabel}
              value={statusFilter}
              allLabel={labels.filterAll}
              options={(
                Object.keys(labels.status) as OrgClientInvitationRow["status"][]
              ).map((status) => ({
                value: status,
                label: labels.status[status],
              }))}
              onChange={(value) => {
                setColumnFilters(
                  value === "all" ? [] : [{ id: "status", value }],
                );
              }}
            />
          }
        />
      }
    />
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
    tableActions: string;
    removeAssignment: string;
    pending: string;
    submitted: string;
    searchPlaceholder: string;
    filterAll: string;
    filterStatusLabel: string;
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
        filterFn: "equals",
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
      {
        id: "actions",
        header: () => (
          <span className="block text-right">{labels.tableActions}</span>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <ClientAssignmentDeleteButton assignmentId={row.original.id} />
          </div>
        ),
        size: 96,
        enableHiding: false,
      },
    ],
    [labels],
  );

  const pageSize = 8;
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: "includesString",
    state: { pagination, globalFilter, columnFilters },
  });

  const statusFilter =
    (columnFilters.find((filter) => filter.id === "status")?.value as
      | string
      | undefined) ?? "all";

  return (
    <FilteredDataTable
      table={table}
      pageSize={pageSize}
      toolbar={
        <DataTableToolbar
          searchValue={globalFilter}
          onSearchChange={setGlobalFilter}
          searchPlaceholder={labels.searchPlaceholder}
          filters={
            <StatusFilter
              label={labels.filterStatusLabel}
              value={statusFilter}
              allLabel={labels.filterAll}
              options={[
                { value: "pending", label: labels.pending },
                { value: "submitted", label: labels.submitted },
              ]}
              onChange={(value) => {
                setColumnFilters(
                  value === "all" ? [] : [{ id: "status", value }],
                );
              }}
            />
          }
        />
      }
    />
  );
}
