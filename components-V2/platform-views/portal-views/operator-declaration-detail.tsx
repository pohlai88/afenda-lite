import Link from "next/link";
import { DeclarationDangerZone } from "@/features/operator/declaration-danger-zone";
import { DeclarationSharePanel } from "@/features/operator/declaration-share-panel";
import { DeclarationManageForm } from "@/features/operator/declaration-manage-form";
import { PortalDeclarationWorkspace } from "@/features/operator/portal/portal-declaration-workspace";
import { Badge } from "@/components-V2/platform-components/ui/badge";
import { Button } from "@/components-V2/platform-components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components-V2/platform-components/ui/card";
import { PortalDeclarationSubmissionsTable } from "@/components-V2/platform-views/portal-views/portal-declaration-submissions-table";
import type { OperatorDeclarationDetail } from "@/lib/pages/operator-declaration-detail";
import { portalCopy } from "@/lib/copy/portal-copy";
import { OPERATOR_DASHBOARD_HREF } from "@/lib/routing/portal-routes";
import { displaySurveyTitle } from "@/lib/domain/survey-display";

export default function OperatorDeclarationDetailView({
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

  const titleText = displaySurveyTitle(survey.title, survey.id);

  const managePanel = (
    <div className="space-y-10">
      <DeclarationManageForm
        surveyId={survey.id}
        fieldsKey={fieldsKey}
        title={survey.title}
        description={survey.question}
        metadata={survey}
        questions={questionDrafts}
      />
      <DeclarationDangerZone surveyId={survey.id} />
    </div>
  );

  const sharePanel = (
    <Card className="min-w-0 shadow-none">
      <CardHeader>
        <CardTitle>{declarationDetail.share.title}</CardTitle>
        <CardDescription className="text-pretty">
          {declarationDetail.share.description}
        </CardDescription>
        <CardAction>
          <Badge variant="secondary" className="tabular-nums">
            {org.list.submissions(responses.length)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <DeclarationSharePanel surveyId={survey.id} slug={survey.slug} />
      </CardContent>
    </Card>
  );

  const submissionsPanel = (
    <PortalDeclarationSubmissionsTable
      responses={responses}
      questions={questions}
      evidenceById={evidenceById}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {declarationDetail.eyebrow}
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">
            {titleText}
          </h1>
          {survey.question ? (
            <p className="text-muted-foreground max-w-2xl text-pretty text-sm">
              {survey.question}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="tabular-nums">
            {org.list.submissions(responses.length)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={OPERATOR_DASHBOARD_HREF} />}
            nativeButton={false}
          >
            {declarationDetail.backLabel}
          </Button>
        </div>
      </header>

      <PortalDeclarationWorkspace
        survey={survey}
        responseCount={responses.length}
        questionCount={questions.length}
        labels={declarationDetail.tabs}
        manage={managePanel}
        share={sharePanel}
        submissions={submissionsPanel}
      />
    </div>
  );
}
