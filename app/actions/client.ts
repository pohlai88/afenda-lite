"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession, requireClientSession } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
import { parseClientOnboardingFormData } from "@/lib/client-onboarding.server";
import {
  CLIENT_HOME_HREF,
  CLIENT_ONBOARDING_HREF,
  OPERATOR_DASHBOARD_HREF,
} from "@/lib/client-session";
import {
  acknowledgeClientPortal,
  createClientInvitation,
  createConfirmationCode,
  deleteClientAssignmentById,
  deleteClientAssignmentsForEmail,
  deleteClientInvitationById,
  deleteClientProfileByUserId,
  getClientAssignmentById,
  getClientAssignmentForUser,
  getClientInvitationById,
  getClientProfile,
  isClientPortalAcknowledged,
  normalizeEmail,
  upsertClientProfile,
} from "@/lib/clients";
import { deleteClientAuthUserByEmail } from "@/lib/delete-client-auth-user";
import { isClientEmailDeliveryEnabled } from "@/lib/email/client-email-delivery";
import { sendClientOnboardingEmail } from "@/lib/email/send-client-onboarding-email";
import { runLoggedAction } from "@/lib/observability";
import { OPERATOR_CLIENTS_HREF } from "@/lib/portal-routes";
import { portalCopy, CLIENT_PORTAL_ACK_VERSION } from "@/lib/portal-copy";
import type { SurveyAnswers } from "@/lib/questions";
import { parseSchema } from "@/lib/schemas/common";
import {
  deleteClientAssignmentSchema,
  issueClientInviteSchema,
  removeClientRegistrationSchema,
  submitClientDeclarationSchema,
} from "@/lib/schemas/client";
import { getSurveyBySlug, getSurveyForAdmin } from "@/lib/surveys";
import { submitClientDeclaration } from "@/lib/survey-submission";
import { formString } from "@/lib/server-actions/form-data";

export { requireClientSession };

export async function saveClientOnboardingAction(formData: FormData) {
  const session = await requireClientSession();

  return runLoggedAction(
    "saveClientOnboardingAction",
    session.user.id,
    async () => {
      const parsed = parseClientOnboardingFormData(formData);

      if (!parsed.success) {
        return { error: portalCopy.clientOnboarding.requiredError };
      }

      const {
        fullLegalName,
        nationality,
        countryOfResidence,
        additionalResidenceCountries,
        passportIssuingCountry,
        passportNumber,
        phone,
        entityName,
        jurisdiction,
        notes,
      } = parsed.data;

      await upsertClientProfile({
        userId: session.user.id,
        fullLegalName,
        nationality,
        countryOfResidence,
        additionalResidenceCountries,
        passportIssuingCountry,
        passportNumber,
        phone,
        entityName,
        jurisdiction,
        notes,
        identityConsentAt: new Date(),
        onboardingComplete: true,
      });

      await auth.updateUser({
        name: fullLegalName,
      });

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "profile.completed",
        resourceType: "client_profile",
        resourceId: session.user.id,
        metadata: { surface: "client" },
      });

      redirect(CLIENT_HOME_HREF);
    },
  );
}

export async function acknowledgeClientPortalAction() {
  const session = await requireClientSession({ requireOnboarding: true });

  return runLoggedAction(
    "acknowledgeClientPortalAction",
    session.user.id,
    async () => {
      await acknowledgeClientPortal({
        userId: session.user.id,
        version: CLIENT_PORTAL_ACK_VERSION,
      });

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "portal.acknowledged",
        resourceType: "client_profile",
        resourceId: session.user.id,
        metadata: { version: CLIENT_PORTAL_ACK_VERSION },
      });

      revalidatePath(CLIENT_HOME_HREF);
      return { success: true };
    },
  );
}

export async function submitClientDeclarationAction(input: {
  assignmentId: string;
  slug: string;
  answers: SurveyAnswers;
}) {
  const session = await requireClientSession({ requireOnboarding: true });

  return runLoggedAction(
    "submitClientDeclarationAction",
    session.user.id,
    async () => {
      const parsed = parseSchema(submitClientDeclarationSchema, input);

      if (!parsed.success) {
        return { error: portalCopy.clientDashboard.assignmentNotFound };
      }

      const { assignmentId, slug, answers } = parsed.data;

      const assignment = await getClientAssignmentForUser(
        assignmentId,
        session.user.email,
      );

      if (!assignment) {
        return { error: portalCopy.clientDashboard.assignmentNotFound };
      }

      if (assignment.status === "submitted") {
        return {
          error: portalCopy.clientDashboard.alreadySubmitted,
          confirmationCode: assignment.confirmationCode ?? undefined,
        };
      }

      const profile = await getClientProfile(session.user.id);
      if (!isClientPortalAcknowledged(profile)) {
        return { error: portalCopy.clientDashboard.acknowledgement.gateNotice };
      }

      const survey = await getSurveyBySlug(slug);
      if (!survey || survey.id !== assignment.surveyId) {
        return { error: portalCopy.clientDashboard.assignmentNotFound };
      }

      const confirmationCode = createConfirmationCode(assignmentId);
      const result = await submitClientDeclaration({
        assignmentId,
        surveyId: survey.id,
        clientEmail: session.user.email,
        answers,
        confirmationCode,
        dueDate: assignment.dueDate,
        submitBefore: survey.submitBefore,
      });

      if ("error" in result && result.error) {
        return {
          error: result.error,
          confirmationCode:
            "confirmationCode" in result
              ? result.confirmationCode
              : undefined,
        };
      }

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "declaration.submitted",
        resourceType: "declaration",
        resourceId: survey.id,
        metadata: { surface: "client", assignmentId },
      });

      revalidatePath(CLIENT_HOME_HREF);
      revalidatePath(OPERATOR_DASHBOARD_HREF);

      return { success: true, confirmationCode };
    },
  );
}

export async function issueClientInviteAction(formData: FormData) {
  const session = await requireAdminSession();

  return runLoggedAction(
    "issueClientInviteAction",
    session.user.id,
    async () => {
      const parsed = parseSchema(issueClientInviteSchema, {
        email: formString(formData, "email"),
        fullName: formString(formData, "fullName"),
        surveyId: formString(formData, "surveyId"),
        dueDate: formString(formData, "dueDate"),
      });

      if (!parsed.success) {
        return { error: portalCopy.clientInvite.issueError };
      }

      const { email, fullName, surveyId, dueDate: dueDateRaw } = parsed.data;
      const dueDate = dueDateRaw ? new Date(dueDateRaw) : undefined;

      const survey = await getSurveyForAdmin(surveyId);
      if (!survey) {
        return { error: portalCopy.errors.declarationNotFound };
      }

      const invitation = await createClientInvitation({
        email,
        fullName,
        invitedBy: session.user.id,
        surveyId: survey.id,
        dueDate:
          dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : undefined,
      });

      let emailSent = false;
      let emailError: string | undefined;
      let neonAuthStatus: number | undefined;

      if (isClientEmailDeliveryEnabled()) {
        const emailDelivery = await sendClientOnboardingEmail({
          toEmail: normalizeEmail(email),
          toName: fullName,
          text: "",
        });
        emailSent = emailDelivery.ok;
        if (!emailDelivery.ok) {
          emailError = emailDelivery.error;
          neonAuthStatus = emailDelivery.status;
        }
      } else {
        emailError = portalCopy.clientInvite.emailNotConfigured;
      }

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "invite.issued",
        resourceType: "client_invitation",
        resourceId: invitation.id,
        metadata: {
          channel: "neon_auth_organization",
          emailSent,
          ...(emailError ? { emailError } : {}),
          ...(neonAuthStatus !== undefined ? { neonAuthStatus } : {}),
        },
      });

      revalidatePath(OPERATOR_CLIENTS_HREF);

      return {
        success: true,
        email: normalizeEmail(email),
        emailSent,
        emailError,
      };
    },
  );
}

export async function removeClientRegistrationAction(formData: FormData) {
  const session = await requireAdminSession();

  return runLoggedAction(
    "removeClientRegistrationAction",
    session.user.id,
    async () => {
      const parsed = parseSchema(removeClientRegistrationSchema, {
        invitationId: formString(formData, "invitationId"),
      });

      if (!parsed.success) {
        return { error: portalCopy.clientInvitationsPage.removeError };
      }

      const invitation = await getClientInvitationById(parsed.data.invitationId);
      if (!invitation) {
        return { error: portalCopy.clientInvitationsPage.removeMissing };
      }

      const email = normalizeEmail(invitation.email);
      const authResult = await deleteClientAuthUserByEmail(email);

      if (authResult.error) {
        return { error: authResult.error };
      }

      if (authResult.userId) {
        await deleteClientProfileByUserId(authResult.userId);
      }

      await deleteClientAssignmentsForEmail(email);
      await deleteClientInvitationById(invitation.id);

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "invite.removed",
        resourceType: "client_invitation",
        resourceId: invitation.id,
        metadata: { email, authUserRemoved: authResult.deleted === true },
      });

      revalidatePath(OPERATOR_CLIENTS_HREF);
      return { success: true };
    },
  );
}

export async function deleteClientAssignmentAction(formData: FormData) {
  const session = await requireAdminSession();

  return runLoggedAction(
    "deleteClientAssignmentAction",
    session.user.id,
    async () => {
      const parsed = parseSchema(deleteClientAssignmentSchema, {
        assignmentId: formString(formData, "assignmentId"),
      });

      if (!parsed.success) {
        return { error: portalCopy.clientInvitationsPage.assignmentRemoveError };
      }

      const assignment = await getClientAssignmentById(parsed.data.assignmentId);
      if (!assignment) {
        return { error: portalCopy.clientInvitationsPage.assignmentRemoveMissing };
      }

      await deleteClientAssignmentById(assignment.id);

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "assignment.removed",
        resourceType: "client_assignment",
        resourceId: assignment.id,
      });

      revalidatePath(OPERATOR_CLIENTS_HREF);
      return { success: true };
    },
  );
}
