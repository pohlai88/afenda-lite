"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSurveyAction } from "@/app/actions/surveys";
import { ConfirmDialog } from "@/features/operator/confirm-dialog";
import { Badge } from "@/components-V2/platform-components/ui/badge";
import { Button } from "@/components-V2/platform-components/ui/button";
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
import { portalCopy } from "@/lib/copy/portal-copy";
import { displaySurveyTitle } from "@/lib/domain/survey-display";
import { isDraftSurveyTitle } from "@/lib/domain/survey-draft";
import type { OrgDeclarationRow } from "@/lib/pages/operator-dashboard-types";
import { operatorDeclarationHref } from "@/lib/routing/portal-routes";

function DeclarationDeleteButton({ surveyId }: { surveyId: string }) {
  const { manage } = portalCopy.declarationDetail;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={isPending}
        aria-busy={isPending}
        onClick={() => setOpen(true)}
      >
        {manage.deleteSubmit}
      </Button>
      <ConfirmDialog
        open={open}
        title={manage.deleteTitle}
        description={manage.deleteConfirm}
        confirmLabel={manage.deleteSubmit}
        cancelLabel={manage.deleteCancel}
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          const formData = new FormData();
          formData.set("id", surveyId);
          startTransition(async () => {
            const result = await deleteSurveyAction(formData);
            if (result && "success" in result && result.success) {
              router.refresh();
            }
          });
        }}
      />
    </>
  );
}

type PortalDeclarationsTableProps = {
  rows: OrgDeclarationRow[];
  title?: string;
  description?: string;
};

export function PortalDeclarationsTable({
  rows,
  title,
  description,
}: PortalDeclarationsTableProps) {
  const { list: copy } = portalCopy.org;

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
          <p className="text-muted-foreground px-6 py-8 text-sm">{copy.emptyTitle}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.tableTitle}</TableHead>
                <TableHead>{copy.tableCase}</TableHead>
                <TableHead>{copy.tableSubmissions}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{copy.tableActions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const titleText = displaySurveyTitle(row.title, row.id);
                const isDraft = isDraftSurveyTitle(row.title);

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="min-w-0 max-w-[280px]">
                        <Link
                          href={operatorDeclarationHref(row.id)}
                          className="hover:underline focus-visible:ring-ring block truncate rounded-sm font-medium outline-none focus-visible:ring-2"
                        >
                          {titleText}
                        </Link>
                        {row.description ? (
                          <p className="text-muted-foreground mt-0.5 truncate text-xs">
                            {row.description}
                          </p>
                        ) : isDraft ? (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {copy.tableDraftHint}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground block max-w-[120px] truncate text-sm tabular-nums">
                        {row.caseNumber ?? copy.tableCaseEmpty}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="tabular-nums">
                        {copy.submissions(row.responseCount)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href={operatorDeclarationHref(row.id)} />}
                          nativeButton={false}
                        >
                          {copy.viewSubmissions}
                        </Button>
                        <DeclarationDeleteButton surveyId={row.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
