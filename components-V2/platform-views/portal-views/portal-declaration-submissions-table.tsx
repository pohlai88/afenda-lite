"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, InboxIcon } from "lucide-react";
import { SubmissionAnswers } from "@/features/operator/submission-answers";
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
import { formatDateTime } from "@/lib/format";
import type { EvidenceRecord, SurveyQuestion } from "@/lib/question-models";
import type { SurveyResponse } from "@/lib/domain/surveys";
import { portalCopy } from "@/lib/copy/portal-copy";

type PortalDeclarationSubmissionsTableProps = {
  responses: SurveyResponse[];
  questions: SurveyQuestion[];
  /** Serializable map for RSC → client boundary. */
  evidenceById: Record<string, EvidenceRecord>;
};

export function PortalDeclarationSubmissionsTable({
  responses,
  questions,
  evidenceById,
}: PortalDeclarationSubmissionsTableProps) {
  const { submissions } = portalCopy.declarationDetail;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const evidenceMap = useMemo(
    () => new Map(Object.entries(evidenceById)),
    [evidenceById],
  );

  const expandedResponse = responses.find((row) => row.id === expandedId);

  if (responses.length === 0) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <div className="bg-muted text-muted-foreground mb-2 flex size-10 items-center justify-center rounded-lg">
            <InboxIcon className="size-5" aria-hidden="true" />
          </div>
          <CardTitle>{submissions.emptyTitle}</CardTitle>
          <CardDescription className="text-pretty">
            {submissions.empty}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <Card className="min-w-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="border-b py-4">
          <CardTitle>{submissions.title}</CardTitle>
          <CardDescription className="text-pretty">
            {submissions.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{submissions.tableCode}</TableHead>
                <TableHead>{submissions.tableSubmitted}</TableHead>
                <TableHead className="text-right">
                  {submissions.answersTitle}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => {
                const isExpanded = expandedId === response.id;
                const hasAnswers = Boolean(response.answers);

                return (
                  <TableRow key={response.id}>
                    <TableCell>
                      <p className="font-medium tabular-nums" translate="no">
                        {response.confirmationCode ?? submissions.answersTitle}
                      </p>
                    </TableCell>
                    <TableCell>
                      <time
                        dateTime={response.createdAt.toISOString()}
                        className="text-muted-foreground text-xs tabular-nums"
                      >
                        {formatDateTime(response.createdAt)}
                      </time>
                    </TableCell>
                    <TableCell className="text-right">
                      {!hasAnswers ? (
                        <span className="text-muted-foreground text-xs">
                          {submissions.noAnswers}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 px-2"
                          aria-expanded={isExpanded}
                          onClick={() =>
                            setExpandedId((current) =>
                              current === response.id ? null : response.id,
                            )
                          }
                        >
                          {isExpanded ? (
                            <ChevronUpIcon
                              aria-hidden="true"
                              className="size-4"
                            />
                          ) : (
                            <ChevronDownIcon
                              aria-hidden="true"
                              className="size-4"
                            />
                          )}
                          {isExpanded
                            ? submissions.hideAnswers
                            : submissions.viewAnswers}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {expandedResponse ? (
        <Card className="min-w-0 shadow-none">
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
              evidenceById={evidenceMap}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
