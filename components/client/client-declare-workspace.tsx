import Link from "next/link";
import { ClientAssignmentDeadlineNotice } from "@/components/client/client-assignment-deadline-notice";
import { ClientDeclarationForm } from "@/components/client/client-declaration-form";
import { ConfirmationReceipt } from "@/components/confirmation-receipt";
import { PortalEmptyState } from "@/components/portal/portal-empty-state";
import { PortalWorkspacePage } from "@/components/portal/portal-application-shell";
import { clientDeclarationBreadcrumbs } from "@/lib/client-breadcrumbs";
import { CLIENT_HOME_HREF } from "@/lib/routing/portal-routes";
import { portalCopy } from "@/lib/copy/portal-copy";
import type { SurveyAnswers, SurveyQuestion } from "@/lib/question-models";
import { Button } from "@/components/ui/button";

export type ClientDeclareWorkspaceProps =
  | {
      kind: "receipt";
      title: string;
      confirmationCode: string;
    }
  | {
      kind: "empty-questions";
      title: string;
    }
  | {
      kind: "expired";
      title: string;
      deadline: {
        status: "pending";
        dueDate: Date | null;
        submitBefore: Date | null;
      };
    }
  | {
      kind: "form";
      title: string;
      description?: string;
      deadline: {
        status: "pending";
        dueDate: Date | null;
        submitBefore: Date | null;
      };
      form: {
        assignmentId: string;
        surveyId: string;
        slug: string;
        questions: SurveyQuestion[];
        initialAnswers?: SurveyAnswers;
        initialStepIndex?: number;
        initialEvidenceNames?: Record<string, string>;
        initialDraftSavedAt?: Date;
      };
    };

export function ClientDeclareWorkspace(props: ClientDeclareWorkspaceProps) {
  const { clientDashboard, product, declarationPage } = portalCopy;
  const breadcrumbs = clientDeclarationBreadcrumbs(props.title);

  if (props.kind === "receipt") {
    return (
      <PortalWorkspacePage
        eyebrow={clientDashboard.eyebrow}
        title={props.title}
        description={clientDashboard.receiptDescription}
        breadcrumbs={breadcrumbs}
      >
        <ConfirmationReceipt
          code={props.confirmationCode}
          title={clientDashboard.receiptTitle}
          description={clientDashboard.receiptDescription}
          variant="inline"
        />
      </PortalWorkspacePage>
    );
  }

  if (props.kind === "empty-questions") {
    return (
      <PortalWorkspacePage
        eyebrow={product.declarationEyebrow}
        title={props.title}
        description={declarationPage.questionsNotConfigured}
        breadcrumbs={breadcrumbs}
      >
        <PortalEmptyState>
          {declarationPage.questionsNotConfigured}
        </PortalEmptyState>
      </PortalWorkspacePage>
    );
  }

  if (props.kind === "expired") {
    return (
      <PortalWorkspacePage
        eyebrow={product.declarationEyebrow}
        title={props.title}
        description={declarationPage.secureFormNote}
        breadcrumbs={breadcrumbs}
      >
        <div className="space-y-4">
          <ClientAssignmentDeadlineNotice
            assignment={props.deadline}
            showExpiredBanner
          />
          <Button
            render={<Link href={CLIENT_HOME_HREF} />}
            nativeButton={false}
            variant="secondary"
            className="min-h-11 touch-manipulation"
          >
            {clientDashboard.backToAssignments}
          </Button>
        </div>
      </PortalWorkspacePage>
    );
  }

  return (
    <PortalWorkspacePage
      eyebrow={product.declarationEyebrow}
      title={props.title}
      description={declarationPage.secureFormNote}
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-4">
        <ClientAssignmentDeadlineNotice assignment={props.deadline} />
        <ClientDeclarationForm
          assignmentId={props.form.assignmentId}
          surveyId={props.form.surveyId}
          slug={props.form.slug}
          title={props.title}
          description={props.description}
          questions={props.form.questions}
          initialAnswers={props.form.initialAnswers}
          initialStepIndex={props.form.initialStepIndex}
          initialEvidenceNames={props.form.initialEvidenceNames}
          initialDraftSavedAt={props.form.initialDraftSavedAt}
        />
      </div>
    </PortalWorkspacePage>
  );
}
