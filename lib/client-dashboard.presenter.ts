import type { ClientAssignment, ClientProfile } from "@/lib/domain/clients";
import {
  assignmentDueUrgency,
  computeClientDashboardMetrics,
  type ClientDashboardMetrics,
} from "@/lib/client-dashboard-metrics";
import { formatDate } from "@/lib/format";
import { CLIENT_PORTAL_ACK_VERSION } from "@/lib/copy/portal-copy";
import { clientDeclareHref } from "@/lib/routing/portal-routes";

export type DeclarantSummaryView = {
  fullLegalName: string | null;
  entityName: string | null;
  jurisdiction: string | null;
};

export type AssignmentCardStatus = "pending" | "inProgress" | "submitted";
export type AssignmentCardUrgency = "overdue" | "due_soon" | null;

export type AssignmentCardView = {
  id: string;
  title: string;
  question: string | null;
  href: string;
  status: AssignmentCardStatus;
  urgency: AssignmentCardUrgency;
  confirmationCode: string | null;
  dueDate: Date | null;
  submitBefore: Date | null;
};

export type AcknowledgementView =
  | { kind: "pending" }
  | { kind: "acknowledged"; acknowledgedOn: string | null };

export type ClientDashboardView = {
  metrics: ClientDashboardMetrics;
  declarant: DeclarantSummaryView | null;
  acknowledgement: AcknowledgementView;
  actionsEnabled: boolean;
  assignments: AssignmentCardView[];
};

function profileIsAcknowledged(profile: ClientProfile | null) {
  return Boolean(
    profile?.portalAckAt &&
      profile.portalAckVersion === CLIENT_PORTAL_ACK_VERSION,
  );
}

function assignmentHasDraft(assignment: ClientAssignment) {
  if (assignment.status !== "pending" || !assignment.draftAnswers) {
    return false;
  }
  return Object.keys(assignment.draftAnswers).length > 0;
}

export function buildDeclarantSummaryView(
  profile: ClientProfile | null,
): DeclarantSummaryView | null {
  if (!profile) {
    return null;
  }

  return {
    fullLegalName: profile.fullLegalName,
    entityName: profile.entityName,
    jurisdiction: profile.jurisdiction,
  };
}

export function assignmentCardStatus(
  assignment: ClientAssignment,
): AssignmentCardStatus {
  if (assignment.status === "submitted") {
    return "submitted";
  }

  return assignmentHasDraft(assignment) ? "inProgress" : "pending";
}

export function buildAssignmentCardView(
  assignment: ClientAssignment,
): AssignmentCardView {
  return {
    id: assignment.id,
    title: assignment.surveyTitle ?? "Declaration",
    question: assignment.surveyQuestion ?? null,
    href: clientDeclareHref(assignment.id),
    status: assignmentCardStatus(assignment),
    urgency: assignmentDueUrgency(assignment),
    confirmationCode: assignment.confirmationCode ?? null,
    dueDate: assignment.dueDate,
    submitBefore: assignment.submitBefore,
  };
}

export function buildAcknowledgementView(
  profile: ClientProfile | null,
): AcknowledgementView {
  if (!profileIsAcknowledged(profile)) {
    return { kind: "pending" };
  }

  return {
    kind: "acknowledged",
    acknowledgedOn: profile?.portalAckAt
      ? formatDate(profile.portalAckAt)
      : null,
  };
}

export function buildClientDashboardView(input: {
  assignments: ClientAssignment[];
  profile: ClientProfile | null;
}): ClientDashboardView {
  const acknowledgement = buildAcknowledgementView(input.profile);

  return {
    metrics: computeClientDashboardMetrics(input.assignments),
    declarant: buildDeclarantSummaryView(input.profile),
    acknowledgement,
    actionsEnabled: acknowledgement.kind === "acknowledged",
    assignments: input.assignments.map(buildAssignmentCardView),
  };
}
