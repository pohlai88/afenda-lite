import { notFound } from "next/navigation";
import { requireAdminSession } from "@/app/actions/admin";
import { loadAnonymousInviteLinkForSurvey } from "@/app/actions/invitations";
import { AnonymousSharePanel } from "@/components/anonymous-share-panel";
import { DeclarationDeleteButton } from "@/components/declaration-delete-button";
import { DeclarationManageForm } from "@/components/declaration-manage-form";
import { PortalEmptyState } from "@/components/portal-empty-state";
import { SubmissionAnswers } from "@/components/submission-answers";
import { SurveyDetailTabs } from "@/components/survey-detail-tabs";
import { SurveyMetadataSummary } from "@/components/survey-metadata-summary";
import { DashboardPage } from "@/components/dashboard-page";
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
import { listQuestionsForSurvey, getEvidenceRecordsByIds } from "@/lib/questions";
import { portalCopy } from "@/lib/portal-copy";
import { buildSurveyFieldsKey } from "@/lib/survey-form-key";
import {
  getSurveyForAdmin,
  listResponsesForSurvey,
  listSurveyInvitationsForSurvey,
} from "@/lib/surveys";

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { declarationDetail, nav, org } = portalCopy;
  const { id } = await params;
  const session = await requireAdminSession();

  const survey = await getSurveyForAdmin(id);
  if (!survey) {
    notFound();
  }

  const [responses, questions, initialInvite, emailInvitations] =
    await Promise.all([
      listResponsesForSurvey(survey.id),
      listQuestionsForSurvey(survey.id),
      loadAnonymousInviteLinkForSurvey(survey.id, session.user.id),
      listSurveyInvitationsForSurvey(survey.id),
    ]);

  const evidenceIds = new Set<string>();
  for (const response of responses) {
    if (!response.answers) continue;
    for (const question of questions) {
      if (question.type !== "file") continue;
      const value = response.answers[question.id];
      if (typeof value === "string" && value) {
        evidenceIds.add(value);
      }
    }
  }
  const evidenceById = await getEvidenceRecordsByIds(
    [...evidenceIds],
    survey.id,
  );

  const questionDrafts = questions.map((q) => ({
    prompt: q.prompt,
    type: q.type,
    required: q.required,
    config: q.config,
  }));

  const fieldsKey = buildSurveyFieldsKey({
    title: survey.title,
    description: survey.question,
    metadata: survey,
    questions: questionDrafts,
  });

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
        <AnonymousSharePanel
          surveyId={survey.id}
          publicPath={`/survey/${survey.slug}`}
          embedded
          initialInvite={
            initialInvite
              ? { token: initialInvite.token, url: initialInvite.url }
              : undefined
          }
        />
        {emailInvitations.length > 0 ? (
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-medium">
              {declarationDetail.emailLog.title}
            </h3>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{declarationDetail.emailLog.tableEmail}</TableHead>
                    <TableHead className="text-right">
                      {declarationDetail.emailLog.tableSent}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailInvitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="max-w-[240px] truncate">
                        {invitation.clientEmail}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        <time dateTime={invitation.createdAt.toISOString()}>
                          {formatDateTime(invitation.createdAt)}
                        </time>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const submissionsPanel =
    responses.length === 0 ? (
      <PortalEmptyState>{declarationDetail.submissions.empty}</PortalEmptyState>
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
                  <p
                    className="font-medium tabular-nums"
                    translate="no"
                  >
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
        <CardDescription>{declarationDetail.manage.deleteDescription}</CardDescription>
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
      breadcrumbs={[
        { label: nav.declarations, href: "/dashboard" },
        { label: survey.title },
      ]}
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
