import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientSession } from "@/app/actions/client";
import { ClientDeclarationForm } from "@/components/client-declaration-form";
import { ConfirmationReceipt } from "@/components/confirmation-receipt";
import { DeclarationQuestionsEmpty } from "@/components/declaration-questions-empty";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { getClientAssignmentForUser } from "@/lib/clients";
import { listQuestionsForSurvey } from "@/lib/questions";
import { portalCopy } from "@/lib/portal-copy";

export default async function ClientDeclarePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { clientDashboard } = portalCopy;
  const session = await requireClientSession({ requireOnboarding: true });
  const assignment = await getClientAssignmentForUser(id, session.user.email);

  if (!assignment || !assignment.surveySlug) {
    notFound();
  }

  const questions = await listQuestionsForSurvey(assignment.surveyId);

  if (assignment.status === "submitted" && assignment.confirmationCode) {
    return (
      <PortalCustomerShell
        eyebrow={clientDashboard.eyebrow}
        title={assignment.surveyTitle ?? portalCopy.declarationForm.thankYouTitle}
        description={clientDashboard.receiptDescription}
        backHref="/client"
        backLabel={clientDashboard.backToAssignments}
        showSignOut
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
        eyebrow={portalCopy.product.declarationEyebrow}
        title={assignment.surveyTitle ?? portalCopy.product.declarationEyebrow}
        description={portalCopy.declarationPage.questionsNotConfigured}
      />
    );
  }

  return (
    <PortalCustomerShell
      eyebrow={portalCopy.product.declarationEyebrow}
      title={assignment.surveyTitle ?? portalCopy.product.declarationEyebrow}
      description={portalCopy.declarationPage.secureFormNote}
      backHref="/client"
      backLabel={clientDashboard.backToAssignments}
      showSignOut
    >
      <ClientDeclarationForm
        assignmentId={assignment.id}
        surveyId={assignment.surveyId}
        slug={assignment.surveySlug}
        title={assignment.surveyTitle ?? portalCopy.product.declarationEyebrow}
        description={assignment.surveyQuestion ?? undefined}
        questions={questions}
      />
    </PortalCustomerShell>
  );
}
