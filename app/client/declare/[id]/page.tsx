import { notFound } from "next/navigation";
import { requireClientSession } from "@/app/actions/client";
import { ClientDeclarationForm } from "@/components/client-declaration-form";
import { ConfirmationReceipt } from "@/components/confirmation-receipt";
import { DeclarationQuestionsEmpty } from "@/components/declaration-questions-empty";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { clientDeclarationBreadcrumbs } from "@/lib/client-breadcrumbs";
import { getClientAssignmentForUser } from "@/lib/clients";
import { listQuestionsForSurvey } from "@/lib/questions";
import { portalCopy } from "@/lib/portal-copy";

export default async function ClientDeclarePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { clientDashboard, product, declarationForm, declarationPage } =
    portalCopy;
  const session = await requireClientSession({ requireOnboarding: true });
  const assignment = await getClientAssignmentForUser(id, session.user.email);

  if (!assignment || !assignment.surveySlug) {
    notFound();
  }

  const declarationTitle =
    assignment.surveyTitle ?? product.declarationEyebrow;
  const questions = await listQuestionsForSurvey(assignment.surveyId);

  if (assignment.status === "submitted" && assignment.confirmationCode) {
    return (
      <PortalCustomerShell
        variant="app"
        eyebrow={clientDashboard.eyebrow}
        title={declarationTitle}
        description={clientDashboard.receiptDescription}
        breadcrumbs={clientDeclarationBreadcrumbs(declarationTitle)}
      >
        <ConfirmationReceipt
          code={assignment.confirmationCode}
          title={clientDashboard.receiptTitle}
          description={clientDashboard.receiptDescription}
          variant="inline"
        />
      </PortalCustomerShell>
    );
  }

  if (questions.length === 0) {
    return (
      <DeclarationQuestionsEmpty
        eyebrow={product.declarationEyebrow}
        title={declarationTitle}
        description={declarationPage.questionsNotConfigured}
        surveyTitle={declarationTitle}
      />
    );
  }

  return (
    <PortalCustomerShell
      variant="app"
      eyebrow={product.declarationEyebrow}
      title={declarationTitle}
      description={declarationPage.secureFormNote}
      breadcrumbs={clientDeclarationBreadcrumbs(declarationTitle)}
    >
      <ClientDeclarationForm
        assignmentId={assignment.id}
        surveyId={assignment.surveyId}
        slug={assignment.surveySlug}
        title={declarationTitle}
        description={assignment.surveyQuestion ?? undefined}
        questions={questions}
      />
    </PortalCustomerShell>
  );
}
