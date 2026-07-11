"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClientSession } from "@/modules/identity/auth/session";
import { requirePlatformOperatorSession } from "@/modules/identity/auth/platform-operator-session";
import { isAdminSession } from "@/modules/identity/admin";
import {
  requireAnyPlatformPermission,
  requirePlatformPermission,
} from "@/modules/identity/domain/platform-rbac-access";
import { recordAuditEvent } from "@/modules/platform/audit";
import { auth } from "@/modules/identity/auth/server";
import { parseClientOnboardingFormData } from "@/modules/declarations/client-onboarding.server";
import {
  CLIENT_HOME_HREF,
  CLIENT_ONBOARDING_HREF,
  ORGANIZATION_ADMIN_CLIENTS_HREF,
  ORGANIZATION_ADMIN_DASHBOARD_HREF,
} from "@/modules/platform/routing/portal-routes";
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
} from "@/modules/declarations/domain/clients";
import { persistClientDeclarationDraft } from "@/modules/declarations/domain/client-declaration-draft";
import { deleteClientAuthUserByEmail } from "@/modules/identity/delete-client-auth-user";
import { isClientEmailDeliveryEnabled } from "@/modules/identity/email/client-email-delivery";
import { sendClientOnboardingEmail } from "@/modules/identity/email/send-client-onboarding-email";
import { runLoggedAction } from "@/modules/platform/observability";
import { portalCopy, CLIENT_PORTAL_ACK_VERSION } from "@/modules/platform/copy/portal-copy";
import type { SurveyAnswers } from "@/modules/declarations/domain/questions";
import { parseSchema } from "@/modules/platform/schemas/common";
import {
  deleteClientAssignmentSchema,
  issueClientInviteSchema,
  removeClientRegistrationSchema,
  saveClientDeclarationDraftSchema,
  submitClientDeclarationSchema,
} from "@/modules/declarations/schemas/client";
import { getSurveyBySlug, getSurveyForAdmin } from "@/modules/declarations/domain/surveys";
import { submitClientDeclaration } from "@/modules/declarations/domain/survey-submission";
import { formString } from "@/modules/declarations/server-actions/form-data";

export async function saveClientOnboardingAction(formData: FormData) {
  // Incomplete clients must reach this action — do not require onboarding.
  const session = await requireClientSession({ requireOnboarding: false });

  return runLoggedAction(
    "saveClientOnboardingAction",
    session.user.id,
    async () => {
      const parsed = parseClientOnboardingFormData(formData);

      if (!parsed.success) {
        return { error: parsed.error };
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
      revalidatePath(ORGANIZATION_ADMIN_DASHBOARD_HREF);

      return { success: true, confirmationCode };
    },
  );
}

export async function saveClientDeclarationDraftAction(input: {
  assignmentId: string;
  answers: SurveyAnswers;
  stepIndex: number;
}) {
  const session = await requireClientSession({ requireOnboarding: true });

  return runLoggedAction(
    "saveClientDeclarationDraftAction",
    session.user.id,
    async () => {
      const parsed = parseSchema(saveClientDeclarationDraftSchema, input);

      if (!parsed.success) {
        return { error: portalCopy.clientDashboard.assignmentNotFound };
      }

      const { assignmentId, answers, stepIndex } = parsed.data;

      const result = await persistClientDeclarationDraft({
        assignmentId,
        answers,
        stepIndex,
        userId: session.user.id,
        userEmail: session.user.email,
      });

      if (!result.success) {
        return { error: result.error };
      }

      return { success: true as const, savedAt: result.savedAt };
    },
  );
}

export async function issueClientInviteAction(formData: FormData) {
  const session = await requirePlatformOperatorSession({
    anyOf: ["clients.invite"],
  });

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

      const { organizationId, check } = await requirePlatformPermission({
        userId: session.user.id,
        code: "clients.invite",
        isNeonAdmin: isAdminSession(session),
      });
      if (!check.allowed) {
        return { error: portalCopy.accessDenied.description };
      }
      const survey = await getSurveyForAdmin(surveyId, organizationId);
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
        organizationId,
      });

      let emailSent = false;
      let emailError: string | undefined;
      let neonAuthStatus: number | undefined;

      if (isClientEmailDeliveryEnabled()) {
        const emailDelivery = await sendClientOnboardingEmail({
          toEmail: normalizeEmail(email),
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

      revalidatePath(ORGANIZATION_ADMIN_CLIENTS_HREF);

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
  const session = await requirePlatformOperatorSession({
    anyOf: ["clients.invite"],
  });

  return runLoggedAction(
    "removeClientRegistrationAction",
    session.user.id,
    async () => {
      const { check } = await requirePlatformPermission({
        userId: session.user.id,
        code: "clients.invite",
        isNeonAdmin: isAdminSession(session),
      });
      if (!check.allowed) {
        return { error: portalCopy.accessDenied.description };
      }

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

      revalidatePath(ORGANIZATION_ADMIN_CLIENTS_HREF);
      return { success: true };
    },
  );
}

export async function deleteClientAssignmentAction(formData: FormData) {
  const session = await requirePlatformOperatorSession({
    anyOf: ["clients.invite", "declarations.manage"],
  });

  return runLoggedAction(
    "deleteClientAssignmentAction",
    session.user.id,
    async () => {
      const gate = await requireAnyPlatformPermission({
        userId: session.user.id,
        codes: ["clients.invite", "declarations.manage"],
        isNeonAdmin: isAdminSession(session),
      });
      if (!gate.check.allowed) {
        return { error: portalCopy.accessDenied.description };
      }

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

      revalidatePath(ORGANIZATION_ADMIN_CLIENTS_HREF);
      return { success: true };
    },
  );
}
