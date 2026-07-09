"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDownIcon, ChevronUpIcon, InboxIcon } from "lucide-react";
import { StudioDataTable } from "@/components/shadcn-studio/blocks/datatable-transaction";
import { PortalEmptyStateCard } from "@/components/portal/portal-empty-state";
import { SubmissionAnswers } from "@/components/submission-answers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { EvidenceRecord, SurveyQuestion } from "@/lib/question-models";
import type { SurveyResponse } from "@/lib/domain/surveys";
import { portalCopy } from "@/lib/copy/portal-copy";

type SubmissionRow = {
  id: string;
  confirmationCode: string | null;
  createdAt: Date;
  response: SurveyResponse;
};

/** datatable-component-01 — declaration submissions with expandable answer panel. */
export function OrgDeclarationSubmissionsTable({
  responses,
  questions,
  evidenceById,
}: {
  responses: SurveyResponse[];
  questions: SurveyQuestion[];
  evidenceById: Map<string, EvidenceRecord>;
}) {
  const { submissions } = portalCopy.declarationDetail;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo<SubmissionRow[]>(
    () =>
      responses.map((response) => ({
        id: response.id,
        confirmationCode: response.confirmationCode,
        createdAt: response.createdAt,
        response,
      })),
    [responses],
  );

  const columns = useMemo<ColumnDef<SubmissionRow>[]>(
    () => [
      {
        accessorKey: "confirmationCode",
        header: submissions.tableCode,
        cell: ({ row }) => (
          <p className="font-medium tabular-nums" translate="no">
            {row.original.confirmationCode ?? submissions.answersTitle}
          </p>
        ),
      },
      {
        accessorKey: "createdAt",
        header: submissions.tableSubmitted,
        cell: ({ row }) => (
          <time
            dateTime={row.original.createdAt.toISOString()}
            className="text-muted-foreground text-xs tabular-nums"
          >
            {formatDateTime(row.original.createdAt)}
          </time>
        ),
      },
      {
        id: "answers",
        header: submissions.answersTitle,
        cell: ({ row }) => {
          const isExpanded = expandedId === row.original.id;
          const hasAnswers = Boolean(row.original.response.answers);

          if (!hasAnswers) {
            return (
              <span className="text-muted-foreground text-xs">
                {submissions.noAnswers}
              </span>
            );
          }

          return (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2"
              aria-expanded={isExpanded}
              onClick={() =>
                setExpandedId((current) =>
                  current === row.original.id ? null : row.original.id,
                )
              }
            >
              {isExpanded ? (
                <ChevronUpIcon aria-hidden="true" className="size-4" />
              ) : (
                <ChevronDownIcon aria-hidden="true" className="size-4" />
              )}
              {isExpanded ? submissions.hideAnswers : submissions.viewAnswers}
            </Button>
          );
        },
      },
    ],
    [expandedId, submissions],
  );

  if (responses.length === 0) {
    return (
      <PortalEmptyStateCard
        icon={InboxIcon}
        title={submissions.emptyTitle}
        description={submissions.empty}
      />
    );
  }

  const expandedResponse = rows.find((row) => row.id === expandedId)?.response;

  return (
    <div className="min-w-0 space-y-4">
      <Card className="min-w-0 gap-0 py-0">
        <CardHeader className="border-b px-4 py-4 sm:px-6">
          <CardTitle className="portal-card-title">{submissions.title}</CardTitle>
          <CardDescription>{submissions.description}</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 p-0">
          <StudioDataTable
            data={rows}
            columns={columns}
            pageSize={10}
            emptyMessage={submissions.empty}
          />
        </CardContent>
      </Card>

      {expandedResponse ? (
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {submissions.answersTitle}
            </CardTitle>
            {expandedResponse.confirmationCode ? (
              <CardDescription translate="no" className="tabular-nums">
                {expandedResponse.confirmationCode}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <SubmissionAnswers
              response={expandedResponse}
              questions={questions}
              evidenceById={evidenceById}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
