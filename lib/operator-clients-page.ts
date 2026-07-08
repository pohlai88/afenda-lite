import "server-only";

import type { Metadata } from "next";
import { cache } from "react";
import type {
  OrgClientAssignmentRow,
  OrgClientInvitationRow,
} from "@/components/org-client-tables";
import {
  listClientAssignmentsForAdmin,
  listClientInvitationsForAdmin,
} from "@/lib/clients";
import { isClientEmailDeliveryEnabled } from "@/lib/email/client-email-delivery";
import { formatDate } from "@/lib/format";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import { listSurveysForAdmin } from "@/lib/surveys";

export type OperatorClientsPageData = {
  emailDeliveryEnabled: boolean;
  invitationRows: OrgClientInvitationRow[];
  assignmentRows: OrgClientAssignmentRow[];
  inviteSurveys: Array<{ id: string; title: string }>;
};

export const operatorClientsPageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.clientInvitations.title}`,
  description: portalCopy.metadata.clientInvitations.description,
};

function toInvitationRows(
  invitations: Awaited<ReturnType<typeof listClientInvitationsForAdmin>>,
): OrgClientInvitationRow[] {
  return invitations.map((invitation) => ({
    id: invitation.id,
    token: invitation.token,
    fullName: invitation.fullName,
    email: invitation.email,
    status: invitation.status,
  }));
}

function toAssignmentRows(
  assignments: Awaited<ReturnType<typeof listClientAssignmentsForAdmin>>,
): OrgClientAssignmentRow[] {
  return assignments.map((assignment) => ({
    id: assignment.id,
    surveyId: assignment.surveyId,
    surveyTitle: assignment.surveyTitle ?? "—",
    clientEmail: assignment.clientEmail,
    status: assignment.status,
    dueDate: assignment.dueDate ? formatDate(assignment.dueDate) : null,
  }));
}

export const loadOperatorClientsPage = cache(
  async (): Promise<OperatorClientsPageData> => {
    const [invitations, surveys, assignments] = await Promise.all([
      listClientInvitationsForAdmin(),
      listSurveysForAdmin(),
      listClientAssignmentsForAdmin(),
    ]);
    const emailDeliveryEnabled = isClientEmailDeliveryEnabled();

    return {
      emailDeliveryEnabled,
      invitationRows: toInvitationRows(invitations),
      assignmentRows: toAssignmentRows(assignments),
      inviteSurveys: surveys.map((survey) => ({
        id: survey.id,
        title: survey.title,
      })),
    };
  },
);
