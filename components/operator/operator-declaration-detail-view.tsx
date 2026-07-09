import { DeclarationDangerZone } from "@/components/declaration-danger-zone";
import { DeclarationSharePanel } from "@/components/declaration-share-panel";
import { DashboardPage } from "@/components/dashboard-page";
import { DeclarationManageForm } from "@/components/declaration-manage-form";
import { OrgDeclarationSubmissionsTable } from "@/components/operator/org-declaration-submissions-table";
import { PortalDeclarationWorkspace } from "@/components/portal/portal-declaration-workspace";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { OperatorDeclarationDetail } from "@/lib/pages/operator-declaration-detail";
import { operatorDeclarationBreadcrumbs } from "@/lib/operator-breadcrumbs";
import { portalCopy } from "@/lib/copy/portal-copy";

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
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="portal-card-title">{declarationDetail.share.title}</CardTitle>
        <CardDescription>{declarationDetail.share.description}</CardDescription>
        <CardAction>
          <Badge variant="surface" className="tabular-nums">
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
    <OrgDeclarationSubmissionsTable
      responses={responses}
      questions={questions}
      evidenceById={evidenceById}
    />
  );

  return (
    <DashboardPage
      eyebrow={declarationDetail.eyebrow}
      title={survey.title}
      description={survey.question}
      breadcrumbs={operatorDeclarationBreadcrumbs(survey.title)}
      actions={
        <Badge variant="surface" className="tabular-nums">
          {org.list.submissions(responses.length)}
        </Badge>
      }
    >
      <PortalDeclarationWorkspace
        survey={survey}
        responseCount={responses.length}
        questionCount={questions.length}
        labels={declarationDetail.tabs}
        manage={managePanel}
        share={sharePanel}
        submissions={submissionsPanel}
      />
    </DashboardPage>
  );
}
