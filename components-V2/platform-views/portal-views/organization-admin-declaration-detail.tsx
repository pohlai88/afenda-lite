import Link from "next/link";
import { DeclarationDangerZone } from "@/features/organization-admin/declaration-danger-zone";
import { DeclarationSharePanel } from "@/features/organization-admin/declaration-share-panel";
import { DeclarationManageForm } from "@/features/organization-admin/declaration-manage-form";
import { PortalDeclarationWorkspace } from "@/features/organization-admin/portal/portal-declaration-workspace";
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
import type { OrganizationAdminDeclarationDetail } from "@/features/organization-admin/organization-admin-declaration-detail";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { ORGANIZATION_ADMIN_DASHBOARD_HREF } from "@/modules/platform/routing/portal-routes";
import { displaySurveyTitle } from "@/modules/declarations/domain/survey-display";

export default function OrganizationAdminDeclarationDetailView({
  detail,
}: {
  detail: OrganizationAdminDeclarationDetail;
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
            render={<Link href={ORGANIZATION_ADMIN_DASHBOARD_HREF} />}
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
