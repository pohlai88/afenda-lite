import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireClientSession } from "@/lib/auth/session";
import { ClientDeclareWorkspace } from "@/components/client-declare-workspace";
import { assignmentDeadlineExpired } from "@/lib/client-dashboard-metrics";
import {
  getClientAssignmentForUser,
  getClientProfile,
  isClientPortalAcknowledged,
} from "@/lib/clients";
import {
  buildEvidenceNamesFromDraft,
  collectFileEvidenceIds,
} from "@/lib/declaration-steps";
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
  const { product } = portalCopy;
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
  const expiredReason = assignmentDeadlineExpired(assignment);
  const deadline = {
    status: "pending" as const,
    dueDate: assignment.dueDate,
    submitBefore: assignment.submitBefore,
  };

  if (assignment.status === "submitted" && assignment.confirmationCode) {
    return (
      <ClientDeclareWorkspace
        kind="receipt"
        title={declarationTitle}
        confirmationCode={assignment.confirmationCode}
      />
    );
  }

  if (questions.length === 0) {
    return (
      <ClientDeclareWorkspace kind="empty-questions" title={declarationTitle} />
    );
  }

  if (expiredReason) {
    return (
      <ClientDeclareWorkspace
        kind="expired"
        title={declarationTitle}
        deadline={deadline}
      />
    );
  }

  const draftAnswers = assignment.draftAnswers ?? undefined;
  const fileEvidenceIds = collectFileEvidenceIds(questions, draftAnswers);
  const evidenceById =
    fileEvidenceIds.length > 0
      ? await getEvidenceRecordsByIds(fileEvidenceIds, assignment.surveyId)
      : new Map();
  const initialEvidenceNames = draftAnswers
    ? buildEvidenceNamesFromDraft(questions, draftAnswers, evidenceById)
    : undefined;

  return (
    <ClientDeclareWorkspace
      kind="form"
      title={declarationTitle}
      description={assignment.surveyQuestion ?? undefined}
      deadline={deadline}
      form={{
        assignmentId: assignment.id,
        surveyId: assignment.surveyId,
        slug: assignment.surveySlug,
        questions,
        initialAnswers: draftAnswers,
        initialStepIndex: assignment.draftStepIndex ?? undefined,
        initialEvidenceNames,
        initialDraftSavedAt: assignment.draftSavedAt ?? undefined,
      }}
    />
  );
}
