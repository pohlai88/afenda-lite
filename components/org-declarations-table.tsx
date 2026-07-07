"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilteredDataTable } from "@/components/filtered-datatable";
import { displaySurveyTitle } from "@/lib/survey-display";
import { isDraftSurveyTitle } from "@/lib/survey-draft";
import { portalCopy } from "@/lib/portal-copy";
import { EllipsisVerticalIcon } from "lucide-react";
import { DeclarationRowDeleteAction } from "@/components/declaration-row-delete-action";

/** datatable-component-01 pattern — compact declaration rows with action menu. */
export type OrgDeclarationRow = {
  id: string;
  title: string;
  description: string;
  caseNumber: string | null;
  responseCount: number;
};

type OrgDeclarationsTableProps = {
  rows: OrgDeclarationRow[];
};

export function OrgDeclarationsTable({ rows }: OrgDeclarationsTableProps) {
  const { list: copy } = portalCopy.org;

  const columns = useMemo<ColumnDef<OrgDeclarationRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: copy.tableTitle,
        cell: ({ row }) => {
          const title = displaySurveyTitle(row.original.title, row.original.id);
          const isDraft = isDraftSurveyTitle(row.original.title);

          return (
            <div className="min-w-0 max-w-[280px]">
              <Link
                href={`/dashboard/${row.original.id}`}
                className="block truncate font-medium rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {title}
              </Link>
              {row.original.description ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {row.original.description}
                </p>
              ) : isDraft ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {copy.tableDraftHint}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "caseNumber",
        header: copy.tableCase,
        cell: ({ row }) => (
          <span className="block max-w-[120px] truncate text-sm text-muted-foreground tabular-nums">
            {row.original.caseNumber ?? copy.tableCaseEmpty}
          </span>
        ),
      },
      {
        accessorKey: "responseCount",
        header: copy.tableSubmissions,
        cell: ({ row }) => (
          <Badge variant="secondary" className="tabular-nums">
            {copy.submissions(row.original.responseCount)}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{copy.tableActions}</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={copy.tableActions}
                  />
                }
              >
                <EllipsisVerticalIcon className="size-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    render={
                      <Link href={`/dashboard/${row.original.id}`} />
                    }
                    nativeButton={false}
                  >
                    {copy.viewSubmissions}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={
                      <Link
                        href={`/dashboard/${row.original.id}?tab=share`}
                      />
                    }
                    nativeButton={false}
                  >
                    {copy.shareAccess}
                  </DropdownMenuItem>
                  <DeclarationRowDeleteAction surveyId={row.original.id} />
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        size: 48,
        enableHiding: false,
      },
    ],
    [copy],
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

  return <FilteredDataTable table={table} pageSize={pageSize} />;
}
