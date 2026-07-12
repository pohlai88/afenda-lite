"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseClientOnboardingFormData } from "@/modules/declarations/client-onboarding.server";
import { persistClientDeclarationDraft } from "@/modules/declarations/domain/client-declaration-draft";
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
import type { SurveyAnswers } from "@/modules/declarations/domain/questions";
import { submitClientDeclaration } from "@/modules/declarations/domain/survey-submission";
import {
  getSurveyBySlug,
  getSurveyForAdmin,
} from "@/modules/declarations/domain/surveys";
import {
  deleteClientAssignmentSchema,
  issueClientInviteSchema,
  removeClientRegistrationSchema,
  saveClientDeclarationDraftSchema,
  submitClientDeclarationSchema,
} from "@/modules/declarations/schemas/client";
import { formString } from "@/modules/declarations/server-actions/form-data";
import { isAdminSession } from "@/modules/identity/admin";
import { requirePlatformOperatorSession } from "@/modules/identity/auth/platform-operator-session";
import { auth } from "@/modules/identity/auth/server";
import { requireClientSession } from "@/modules/identity/auth/session";
import { deleteClientAuthUserByEmail } from "@/modules/identity/delete-client-auth-user";
import {
  requireAnyPlatformPermission,
  requirePlatformPermission,
} from "@/modules/identity/domain/platform-rbac-access";
import { isClientEmailDeliveryEnabled } from "@/modules/identity/email/client-email-delivery";
import { sendClientOnboardingEmail } from "@/modules/identity/email/send-client-onboarding-email";
import { ensurePortalOrganization } from "@/modules/identity/portal-organization";
import { recordAuditEvent } from "@/modules/platform/audit";
import {
  CLIENT_PORTAL_ACK_VERSION,
  portalCopy,
} from "@/modules/platform/copy/portal-copy";
import { runLoggedAction } from "@/modules/platform/observability";
import {
  CLIENT_HOME_HREF,
  CLIENT_ONBOARDING_HREF,
  ORGANIZATION_ADMIN_CLIENTS_HREF,
  ORGANIZATION_ADMIN_DASHBOARD_HREF,
} from "@/modules/platform/routing/portal-routes";
import { parseSchema } from "@/modules/platform/schemas/common";

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

      const portalOrg = await ensurePortalOrganization();

      await upsertClientProfile({
        additionalResidenceCountries,
        countryOfResidence,
        entityName,
        fullLegalName,
        identityConsentAt: new Date(),
        jurisdiction,
        nationality,
        notes,
        onboardingComplete: true,
        organizationId: portalOrg.id,
        passportIssuingCountry,
        passportNumber,
        phone,
        userId: session.user.id,
      });

      await auth.updateUser({
        name: fullLegalName,
      });

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "profile.completed",
        metadata: { surface: "client" },
        resourceId: session.user.id,
        resourceType: "client_profile",
      });

      redirect(CLIENT_HOME_HREF);
    }
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
        metadata: { version: CLIENT_PORTAL_ACK_VERSION },
        resourceId: session.user.id,
        resourceType: "client_profile",
      });

      revalidatePath(CLIENT_HOME_HREF);
      return { success: true };
    }
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
        session.user.email
      );

      if (!assignment) {
        return { error: portalCopy.clientDashboard.assignmentNotFound };
      }

      if (assignment.status === "submitted") {
        return {
          confirmationCode: assignment.confirmationCode ?? undefined,
          error: portalCopy.clientDashboard.alreadySubmitted,
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
        answers,
        assignmentId,
        clientEmail: session.user.email,
        confirmationCode,
        dueDate: assignment.dueDate,
        submitBefore: survey.submitBefore,
        surveyId: survey.id,
      });

      if ("error" in result && result.error) {
        return {
          confirmationCode:
            "confirmationCode" in result ? result.confirmationCode : undefined,
          error: result.error,
        };
      }

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "declaration.submitted",
        metadata: { assignmentId, surface: "client" },
        resourceId: survey.id,
        resourceType: "declaration",
      });

      revalidatePath(CLIENT_HOME_HREF);
      revalidatePath(ORGANIZATION_ADMIN_DASHBOARD_HREF);

      return { confirmationCode, success: true };
    }
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
        answers,
        assignmentId,
        stepIndex,
        userEmail: session.user.email,
        userId: session.user.id,
      });

      if (!result.success) {
        return { error: result.error };
      }

      return { savedAt: result.savedAt, success: true as const };
    }
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
        dueDate: formString(formData, "dueDate"),
        email: formString(formData, "email"),
        fullName: formString(formData, "fullName"),
        surveyId: formString(formData, "surveyId"),
      });

      if (!parsed.success) {
        return { error: portalCopy.clientInvite.issueError };
      }

      const { email, fullName, surveyId, dueDate: dueDateRaw } = parsed.data;
      const dueDate = dueDateRaw ? new Date(dueDateRaw) : undefined;

      const { organizationId, check } = await requirePlatformPermission({
        code: "clients.invite",
        isNeonAdmin: isAdminSession(session),
        userId: session.user.id,
      });
      if (!check.allowed) {
        return { error: portalCopy.accessDenied.description };
      }
      const survey = await getSurveyForAdmin(surveyId, organizationId);
      if (!survey) {
        return { error: portalCopy.errors.declarationNotFound };
      }

      const invitation = await createClientInvitation({
        dueDate:
          dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : undefined,
        email,
        fullName,
        invitedBy: session.user.id,
        organizationId,
        surveyId: survey.id,
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
        metadata: {
          channel: "neon_auth_organization",
          emailSent,
          ...(emailError ? { emailError } : {}),
          ...(neonAuthStatus === undefined ? {} : { neonAuthStatus }),
        },
        resourceId: invitation.id,
        resourceType: "client_invitation",
      });

      revalidatePath(ORGANIZATION_ADMIN_CLIENTS_HREF);

      return {
        email: normalizeEmail(email),
        emailError,
        emailSent,
        success: true,
      };
    }
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
      const { organizationId, check } = await requirePlatformPermission({
        code: "clients.invite",
        isNeonAdmin: isAdminSession(session),
        userId: session.user.id,
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

      const invitation = await getClientInvitationById(
        parsed.data.invitationId,
        organizationId
      );
      if (!invitation) {
        return { error: portalCopy.clientInvitationsPage.removeMissing };
      }

      const email = normalizeEmail(invitation.email);
      const authResult = await deleteClientAuthUserByEmail(email);

      if (authResult.error) {
        return { error: authResult.error };
      }

      if (authResult.userId) {
        await deleteClientProfileByUserId(authResult.userId, organizationId);
      }

      await deleteClientAssignmentsForEmail(email, organizationId);
      await deleteClientInvitationById(invitation.id, organizationId);

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "invite.removed",
        metadata: { authUserRemoved: authResult.deleted === true, email },
        resourceId: invitation.id,
        resourceType: "client_invitation",
      });

      revalidatePath(ORGANIZATION_ADMIN_CLIENTS_HREF);
      return { success: true };
    }
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
        codes: ["clients.invite", "declarations.manage"],
        isNeonAdmin: isAdminSession(session),
        userId: session.user.id,
      });
      if (!gate.check.allowed) {
        return { error: portalCopy.accessDenied.description };
      }

      const parsed = parseSchema(deleteClientAssignmentSchema, {
        assignmentId: formString(formData, "assignmentId"),
      });

      if (!parsed.success) {
        return {
          error: portalCopy.clientInvitationsPage.assignmentRemoveError,
        };
      }

      const assignment = await getClientAssignmentById(
        parsed.data.assignmentId,
        gate.organizationId
      );
      if (!assignment) {
        return {
          error: portalCopy.clientInvitationsPage.assignmentRemoveMissing,
        };
      }

      await deleteClientAssignmentById(assignment.id, gate.organizationId);

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "assignment.removed",
        resourceId: assignment.id,
        resourceType: "client_assignment",
      });

      revalidatePath(ORGANIZATION_ADMIN_CLIENTS_HREF);
      return { success: true };
    }
  );
}
