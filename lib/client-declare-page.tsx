import "server-only";

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ClientDeclareWorkspace } from "@/components/client-declare-workspace";
import { requireClientSession } from "@/lib/auth/session";
import type { ClientAssignment } from "@/lib/clients";
import {
  getClientAssignmentForUser,
  getClientProfile,
} from "@/lib/clients";
import {
  resolveClientDeclarePageGate,
  resolveClientDeclareWorkspaceProps,
} from "@/lib/client-declare-page.logic";
import {
  buildEvidenceNamesFromDraft,
  collectFileEvidenceIds,
} from "@/lib/declaration-steps";
import { getEvidenceRecordsByIds, listQuestionsForSurvey } from "@/lib/questions";
import { CLIENT_HOME_HREF } from "@/lib/portal-routes";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";

export {
  resolveClientDeclarePageGate,
  resolveClientDeclareWorkspaceProps,
} from "@/lib/client-declare-page.logic";
export type { ClientDeclarePageGate } from "@/lib/client-declare-page.logic";

export const clientDeclarePageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.clientDeclare.title}`,
  description: portalCopy.metadata.clientDeclare.description,
};

/** Shared page handler for `/client/declare/[id]`. */
export async function runClientDeclarePage({
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

  const gate = resolveClientDeclarePageGate(assignment, profile);
  if (gate === "not-found") {
    notFound();
  }
  if (gate === "redirect-home") {
    redirect(CLIENT_HOME_HREF);
  }

  const scopedAssignment = assignment as ClientAssignment & {
    surveySlug: string;
  };
  const questions = await listQuestionsForSurvey(scopedAssignment.surveyId);
  const draftAnswers = scopedAssignment.draftAnswers ?? undefined;
  const fileEvidenceIds = collectFileEvidenceIds(questions, draftAnswers);
  const evidenceById =
    fileEvidenceIds.length > 0
      ? await getEvidenceRecordsByIds(
          fileEvidenceIds,
          scopedAssignment.surveyId,
        )
      : new Map();
  const initialEvidenceNames = draftAnswers
    ? buildEvidenceNamesFromDraft(questions, draftAnswers, evidenceById)
    : undefined;

  const workspaceProps = resolveClientDeclareWorkspaceProps({
    assignment: scopedAssignment,
    questions,
    declarationEyebrow: product.declarationEyebrow,
    initialEvidenceNames,
  });

  return <ClientDeclareWorkspace {...workspaceProps} />;
}
