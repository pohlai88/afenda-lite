import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireClientSession } from "@/app/actions/client";
import { ClientDeclarationForm } from "@/components/client-declaration-form";
import { ConfirmationReceipt } from "@/components/confirmation-receipt";
import { DeclarationQuestionsEmpty } from "@/components/declaration-questions-empty";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { clientDeclarationBreadcrumbs } from "@/lib/client-breadcrumbs";
import {
  getClientAssignmentForUser,
  getClientProfile,
  isClientPortalAcknowledged,
} from "@/lib/clients";
import { buildEvidenceNamesFromDraft } from "@/lib/declaration-steps";
import { getEvidenceRecordsByIds, listQuestionsForSurvey } from "@/lib/questions";
import { CLIENT_HOME_HREF } from "@/lib/portal-routes";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";

export const metadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.clientDeclare.title}`,
  description: portalCopy.metadata.clientDeclare.description,
};

export default async function ClientDeclarePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { clientDashboard, product, declarationForm, declarationPage } =
    portalCopy;
  const session = await requireClientSession({ requireOnboarding: true });
  const [assignment, profile] = await Promise.all([
    getClientAssignmentForUser(id, session.user.email),
    getClientProfile(session.user.id),
  ]);

  if (!assignment || !assignment.surveySlug) {
    notFound();
  }

  if (
    assignment.status !== "submitted" &&
    !isClientPortalAcknowledged(profile)
  ) {
    redirect(CLIENT_HOME_HREF);
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

  const draftAnswers = assignment.draftAnswers ?? undefined;
  const fileEvidenceIds = draftAnswers
    ? questions
        .filter((question) => question.type === "file")
        .map((question) => draftAnswers[question.id])
        .filter(
          (value): value is string => typeof value === "string" && Boolean(value),
        )
    : [];
  const evidenceById =
    fileEvidenceIds.length > 0
      ? await getEvidenceRecordsByIds(fileEvidenceIds, assignment.surveyId)
      : new Map();
  const initialEvidenceNames = draftAnswers
    ? buildEvidenceNamesFromDraft(questions, draftAnswers, evidenceById)
    : undefined;

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
        initialAnswers={draftAnswers}
        initialStepIndex={assignment.draftStepIndex ?? undefined}
        initialEvidenceNames={initialEvidenceNames}
      />
    </PortalCustomerShell>
  );
}
