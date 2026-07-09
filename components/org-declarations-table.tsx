"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudioDataTable } from "@/components/shadcn-studio/blocks/datatable-transaction";
import { DeclarationRowDeleteAction } from "@/components/declaration-row-delete-action";
import { displaySurveyTitle } from "@/lib/survey-display";
import { isDraftSurveyTitle } from "@/lib/survey-draft";
import type { OrgDeclarationRow } from "@/lib/operator-dashboard-types";
import { portalCopy } from "@/lib/portal-copy";
import { EllipsisVerticalIcon } from "lucide-react";

/** datatable-component-01 — declaration rows on Shadcn Studio table shell. */
export type { OrgDeclarationRow };

type OrgDeclarationsTableProps = {
  rows: OrgDeclarationRow[];
  title?: string;
  description?: string;
};

export function OrgDeclarationsTable({
  rows,
  title,
  description,
}: OrgDeclarationsTableProps) {
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
                className="block truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
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
          <Badge variant="surface" className="tabular-nums">
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
                    size="icon"
                    variant="ghost"
                    aria-label={copy.tableActions}
                  />
                }
              >
                <EllipsisVerticalIcon
                  className="size-5"
                  aria-hidden="true"
                />
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
        size: 60,
        enableHiding: false,
      },
    ],
    [copy],
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
      <StudioDataTable
        data={rows}
        columns={columns}
        pageSize={pageSize}
        emptyMessage={copy.emptyTitle}
      />
    </Card>
  );
}
