"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { StudioFilterDataTable } from "@/components/shadcn-studio/blocks/datatable-user";
import { ClientRegistrationDeleteButton } from "@/components/client/client-registration-delete-button";
import { ClientAssignmentDeleteButton } from "@/components/client/client-assignment-delete-button";
import type {
  OrgClientAssignmentRow,
  OrgClientInvitationRow,
} from "@/lib/pages/operator-clients-types";

export type { OrgClientAssignmentRow, OrgClientInvitationRow };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** datatable-component-04 — client rows with avatar, status badge, actions. */
type OrgClientInvitationsTableProps = {
  rows: OrgClientInvitationRow[];
  title?: string;
  description?: string;
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
  title,
  description,
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
        filterFn: "equalsString",
        enableSorting: true,
        meta: {
          filterVariant: "select",
          filterLabel: labels.filterStatusLabel,
          filterAllLabel: labels.filterAll,
          filterOptions: (
            Object.keys(labels.status) as OrgClientInvitationRow["status"][]
          ).map((status) => ({
            value: status,
            label: labels.status[status],
          })),
        },
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              variant={
                status === "accepted"
                  ? "success"
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
        enableSorting: false,
      },
    ],
    [labels],
  );

  const pageSize = 8;
  const hasHeader = Boolean(title || description);

  return (
    <Card className="min-w-0 overflow-hidden py-0">
      {hasHeader ? (
        <CardHeader className="border-b py-4">
          {title ? <h2 className="portal-card-title">{title}</h2> : null}
          {description ? (
            <CardDescription className="text-pretty">
              {description}
            </CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <StudioFilterDataTable
        data={rows}
        columns={columns}
        pageSize={pageSize}
        filterColumnIds={["status"]}
        searchPlaceholder={labels.searchPlaceholder}
      />
    </Card>
  );
}

type OrgClientAssignmentsTableProps = {
  rows: OrgClientAssignmentRow[];
  title?: string;
  description?: string;
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
  title,
  description,
  labels,
}: OrgClientAssignmentsTableProps) {
  const columns = useMemo<ColumnDef<OrgClientAssignmentRow>[]>(
    () => [
      {
        accessorKey: "surveyTitle",
        header: labels.tableDeclaration,
        enableSorting: true,
        cell: ({ row }) => (
          <Link
            href={`/dashboard/${row.original.surveyId}`}
            className="block max-w-[220px] truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {row.original.surveyTitle}
          </Link>
        ),
      },
      {
        accessorKey: "clientEmail",
        header: labels.tableClient,
        enableSorting: true,
        cell: ({ row }) => (
          <span className="max-w-[220px] truncate text-muted-foreground">
            {row.original.clientEmail}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: labels.tableStatus,
        filterFn: "equalsString",
        enableSorting: true,
        meta: {
          filterVariant: "select",
          filterLabel: labels.filterStatusLabel,
          filterAllLabel: labels.filterAll,
          filterOptions: [
            { value: "pending", label: labels.pending },
            { value: "submitted", label: labels.submitted },
          ],
        },
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "submitted" ? "success" : "outline"
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
        enableSorting: true,
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
        enableSorting: false,
      },
    ],
    [labels],
  );

  const pageSize = 8;
  const hasHeader = Boolean(title || description);

  return (
    <Card className="min-w-0 overflow-hidden py-0">
      {hasHeader ? (
        <CardHeader className="border-b py-4">
          {title ? <h2 className="portal-card-title">{title}</h2> : null}
          {description ? (
            <CardDescription className="text-pretty">
              {description}
            </CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <StudioFilterDataTable
        data={rows}
        columns={columns}
        pageSize={pageSize}
        filterColumnIds={["status"]}
        searchPlaceholder={labels.searchPlaceholder}
      />
    </Card>
  );
}
