import { notFound, redirect } from "next/navigation";
import { AnonymousSharePanel } from "@/components/anonymous-share-panel";
import { DeclarationDeleteButton } from "@/components/declaration-delete-button";
import { DeclarationManageForm } from "@/components/declaration-manage-form";
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
import { isAdminSession } from "@/lib/admin";
import { auth } from "@/lib/auth/server";
import { listQuestionsForSurvey } from "@/lib/questions";
import { portalCopy } from "@/lib/portal-copy";
import {
  getSurveyForAdmin,
  listResponsesForSurvey,
} from "@/lib/surveys";

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { declarationDetail, account } = portalCopy;
  const { id } = await params;
  const { data: session } = await auth.getSession();

  if (!isAdminSession(session)) {
    redirect("/?reason=access-denied");
  }

  const survey = await getSurveyForAdmin(id);
  if (!survey) {
    notFound();
  }

  const [responses, questions] = await Promise.all([
    listResponsesForSurvey(survey.id),
    listQuestionsForSurvey(survey.id),
  ]);
  const rated = responses.filter((item) => item.rating != null);
  const average =
    rated.length > 0
      ? (
          rated.reduce((sum, item) => sum + Number(item.rating), 0) /
          rated.length
        ).toFixed(1)
      : null;

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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{declarationDetail.share.title}</CardTitle>
          <CardDescription>{declarationDetail.share.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 pb-4">
          <Badge variant="secondary">
            {account.list.submissions(responses.length)}
          </Badge>
          <Badge variant="outline">
            Avg {average ? `${average}/5` : "—"}
          </Badge>
        </CardContent>
        <CardContent className="border-t pt-4">
          <AnonymousSharePanel
            surveyId={survey.id}
            publicPath={`/survey/${survey.slug}`}
          />
        </CardContent>
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
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {declarationDetail.submissions.empty}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {responses.map((response) => (
                <Card key={response.id} size="sm">
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-sm">
                      {response.confirmationCode ??
                        (response.rating != null
                          ? declarationDetail.submissions.rating(response.rating)
                          : declarationDetail.submissions.answersTitle)}
                    </CardTitle>
                    <time
                      dateTime={response.createdAt.toISOString()}
                      className="text-xs text-muted-foreground tabular-nums"
                    >
                      {response.createdAt.toLocaleString()}
                    </time>
                  </CardHeader>
                  {response.comment || response.answers ? (
                    <CardContent>
                      {response.answers ? (
                        <SubmissionAnswers
                          response={response}
                          questions={questions}
                          surveyId={survey.id}
                        />
                      ) : (
                        <p className="text-pretty text-sm text-muted-foreground">
                          {response.comment}
                        </p>
                      )}
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
