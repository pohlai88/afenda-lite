"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components-V2/platform-components/ui/avatar";
import { Badge } from "@/components-V2/platform-components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components-V2/platform-components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components-V2/platform-components/ui/table";
import {
  PortalAssignmentDeleteButton,
  PortalRegistrationDeleteButton,
} from "@/components-V2/platform-views/portal-views/portal-client-delete-buttons";
import type {
  OrgClientAssignmentRow,
  OrgClientInvitationRow,
} from "@/features/organization-admin/organization-admin-clients-types";
import { portalCopy } from "@/modules/platform/copy/portal-copy";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type InvitationsTableProps = {
  rows: OrgClientInvitationRow[];
  title?: string;
  description?: string;
};

export function PortalClientInvitationsTable({
  rows,
  title,
  description,
}: InvitationsTableProps) {
  const labels = portalCopy.clientInvitationsPage;

  return (
    <Card className="min-w-0 overflow-hidden py-0 shadow-none">
      {title || description ? (
        <CardHeader className="border-b py-4">
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? (
            <CardDescription className="text-pretty">{description}</CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className="px-0 py-0">
        {rows.length === 0 ? (
          <p className="text-muted-foreground px-6 py-8 text-sm">{labels.emptyTitle}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.tableName}</TableHead>
                <TableHead className="hidden sm:table-cell">{labels.tableEmail}</TableHead>
                <TableHead>{labels.tableStatus}</TableHead>
                <TableHead className="text-right">{labels.tableActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback className="text-xs">
                          {initials(row.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.fullName}</p>
                        <p className="text-muted-foreground truncate text-sm sm:hidden">
                          {row.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-muted-foreground max-w-[220px] truncate">
                      {row.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "accepted"
                          ? "default"
                          : row.status === "expired"
                            ? "outline"
                            : "secondary"
                      }
                      className="capitalize"
                    >
                      {labels.status[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <PortalRegistrationDeleteButton invitationId={row.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

type AssignmentsTableProps = {
  rows: OrgClientAssignmentRow[];
  title?: string;
  description?: string;
};

export function PortalClientAssignmentsTable({
  rows,
  title,
  description,
}: AssignmentsTableProps) {
  const labels = portalCopy.clientInvitationsPage;
  const statusLabels = portalCopy.clientDashboard;

  return (
    <Card className="min-w-0 overflow-hidden py-0 shadow-none">
      {title || description ? (
        <CardHeader className="border-b py-4">
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? (
            <CardDescription className="text-pretty">{description}</CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className="px-0 py-0">
        {rows.length === 0 ? (
          <p className="text-muted-foreground px-6 py-8 text-sm">
            {labels.assignmentsEmptyTitle}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.tableDeclaration}</TableHead>
                <TableHead>{labels.tableClient}</TableHead>
                <TableHead>{labels.tableStatus}</TableHead>
                <TableHead className="text-right">{labels.tableDue}</TableHead>
                <TableHead className="text-right">{labels.tableActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/${row.surveyId}`}
                      className="hover:underline focus-visible:ring-ring block max-w-[220px] truncate rounded-sm font-medium outline-none focus-visible:ring-2"
                    >
                      {row.surveyTitle}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground max-w-[220px] truncate">
                      {row.clientEmail}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={row.status === "submitted" ? "default" : "outline"}
                    >
                      {row.status === "submitted"
                        ? statusLabels.submitted
                        : statusLabels.pending}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {row.dueDate ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <PortalAssignmentDeleteButton assignmentId={row.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
