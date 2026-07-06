import { notFound } from "next/navigation";
import { requireAdminSession } from "@/app/actions/admin";
import { loadAnonymousInviteLinkForSurvey } from "@/app/actions/invitations";
import { AnonymousSharePanel } from "@/components/anonymous-share-panel";
import { DeclarationDeleteButton } from "@/components/declaration-delete-button";
import { DeclarationManageForm } from "@/components/declaration-manage-form";
import { PortalEmptyState } from "@/components/portal-empty-state";
import { SubmissionAnswers } from "@/components/submission-answers";
import { PortalSection, PortalShell } from "@/components/portal-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listQuestionsForSurvey, getEvidenceRecordsByIds } from "@/lib/questions";
import { portalCopy } from "@/lib/portal-copy";
import { listSurveyInvitationsForSurvey } from "@/lib/surveys";
import {
  getSurveyForAdmin,
  listResponsesForSurvey,
} from "@/lib/surveys";

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { declarationDetail, org } = portalCopy;
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

  return (
    <PortalShell
      eyebrow={declarationDetail.eyebrow}
      title={survey.title}
      description={survey.question}
      backHref="/dashboard"
      backLabel={declarationDetail.backLabel}
    >
      <Card>
        <CardHeader>
          <CardTitle>{declarationDetail.manage.title}</CardTitle>
          <CardDescription>{declarationDetail.manage.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeclarationManageForm
            surveyId={survey.id}
            title={survey.title}
            description={survey.question}
            questions={questions.map((q) => ({
              prompt: q.prompt,
              type: q.type,
              required: q.required,
            }))}
          />
        </CardContent>
      </Card>

      <Card id="share" className="mt-6 scroll-mt-24">
        <CardHeader>
          <CardTitle>{declarationDetail.share.title}</CardTitle>
          <CardDescription>{declarationDetail.share.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 pb-4">
          <Badge variant="secondary">
            {org.list.submissions(responses.length)}
          </Badge>
        </CardContent>
        <CardContent className="border-t pt-4">
          <AnonymousSharePanel
            surveyId={survey.id}
            publicPath={`/survey/${survey.slug}`}
            initialInvite={
              initialInvite
                ? { token: initialInvite.token, url: initialInvite.url }
                : undefined
            }
          />
        </CardContent>
        {emailInvitations.length > 0 ? (
          <CardContent className="border-t pt-4">
            <h3 className="mb-2 text-sm font-medium">
              {declarationDetail.emailLog.title}
            </h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {emailInvitations.map((invitation) => (
                <li key={invitation.id}>
                  {invitation.clientEmail}
                  <span className="ml-2 text-xs tabular-nums">
                    {invitation.createdAt.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        ) : null}
      </Card>

      <Card className="mt-6 border-destructive/30">
        <CardHeader>
          <CardTitle>{declarationDetail.manage.deleteTitle}</CardTitle>
          <CardDescription>{declarationDetail.manage.deleteDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeclarationDeleteButton surveyId={survey.id} />
        </CardContent>
      </Card>

      <div className="mt-8">
        <PortalSection
          title={declarationDetail.submissions.title}
          description={declarationDetail.submissions.description}
        >
          {responses.length === 0 ? (
            <PortalEmptyState>{declarationDetail.submissions.empty}</PortalEmptyState>
          ) : (
            <div className="space-y-3">
              {responses.map((response) => (
                <Card key={response.id} size="sm">
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-sm">
                      {response.confirmationCode ??
                        declarationDetail.submissions.answersTitle}
                    </CardTitle>
                    <time
                      dateTime={response.createdAt.toISOString()}
                      className="text-xs text-muted-foreground tabular-nums"
                    >
                      {response.createdAt.toLocaleString()}
                    </time>
                  </CardHeader>
                  {response.answers ? (
                    <CardContent>
                      <SubmissionAnswers
                        response={response}
                        questions={questions}
                        evidenceById={evidenceById}
                      />
                    </CardContent>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </PortalSection>
      </div>
    </PortalShell>
  );
}
