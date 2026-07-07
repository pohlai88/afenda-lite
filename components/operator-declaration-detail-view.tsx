import { DeclarationSharePanel } from "@/components/declaration-share-panel";
import { DashboardPage } from "@/components/dashboard-page";
import { DeclarationDeleteButton } from "@/components/declaration-delete-button";
import { DeclarationManageForm } from "@/components/declaration-manage-form";
import { PortalEmptyStateCard } from "@/components/portal-empty-state";
import { SubmissionAnswers } from "@/components/submission-answers";
import { SurveyDetailTabs } from "@/components/survey-detail-tabs";
import { SurveyMetadataSummary } from "@/components/survey-metadata-summary";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { InboxIcon } from "lucide-react";
import type { OperatorDeclarationDetail } from "@/lib/operator-declaration-detail";
import { operatorDeclarationBreadcrumbs } from "@/lib/operator-breadcrumbs";
import { portalCopy } from "@/lib/portal-copy";

export function OperatorDeclarationDetailView({
  detail,
}: {
  detail: OperatorDeclarationDetail;
}) {
  const { declarationDetail, org } = portalCopy;
  const {
    survey,
    responses,
    questions,
    evidenceById,
    questionDrafts,
    fieldsKey,
  } = detail;

  const managePanel = (
    <DeclarationManageForm
      surveyId={survey.id}
      fieldsKey={fieldsKey}
      title={survey.title}
      description={survey.question}
      metadata={survey}
      questions={questionDrafts}
    />
  );

  const sharePanel = (
    <Card>
      <CardHeader>
        <CardTitle>{declarationDetail.share.title}</CardTitle>
        <CardDescription>{declarationDetail.share.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge variant="secondary" className="tabular-nums">
          {org.list.submissions(responses.length)}
        </Badge>
        <DeclarationSharePanel surveyId={survey.id} slug={survey.slug} />
      </CardContent>
    </Card>
  );

  const submissionsPanel =
    responses.length === 0 ? (
      <PortalEmptyStateCard
        icon={InboxIcon}
        title={declarationDetail.submissions.emptyTitle}
        description={declarationDetail.submissions.empty}
      />
    ) : (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{declarationDetail.submissions.tableCode}</TableHead>
              <TableHead className="text-right">
                {declarationDetail.submissions.tableSubmitted}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.map((response) => (
              <TableRow key={response.id}>
                <TableCell className="align-top">
                  <p className="font-medium tabular-nums" translate="no">
                    {response.confirmationCode ??
                      declarationDetail.submissions.answersTitle}
                  </p>
                  {response.answers ? (
                    <div className="mt-3 max-w-prose">
                      <SubmissionAnswers
                        response={response}
                        questions={questions}
                        evidenceById={evidenceById}
                      />
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-right align-top text-muted-foreground">
                  <time
                    dateTime={response.createdAt.toISOString()}
                    className="text-xs tabular-nums"
                  >
                    {formatDateTime(response.createdAt)}
                  </time>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );

  const dangerPanel = (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>{declarationDetail.manage.deleteTitle}</CardTitle>
        <CardDescription>
          {declarationDetail.manage.deleteDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DeclarationDeleteButton surveyId={survey.id} />
      </CardContent>
    </Card>
  );

  return (
    <DashboardPage
      eyebrow={declarationDetail.eyebrow}
      title={survey.title}
      description={survey.question}
      breadcrumbs={operatorDeclarationBreadcrumbs(survey.title)}
    >
      <SurveyMetadataSummary survey={survey} />
      <SurveyDetailTabs
        labels={declarationDetail.tabs}
        manage={managePanel}
        share={sharePanel}
        submissions={submissionsPanel}
        danger={dangerPanel}
      />
    </DashboardPage>
  );
}
